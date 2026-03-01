from __future__ import annotations

from dataclasses import dataclass
import re
import time

from app.core.llm_client import render_with_openai
from app.core.projection import project_batch_growth
from app.core.rag_store import RetrievedChunk, retrieve_enriched_chunks
from app.core.solver import solve_optimize
from app.models.contracts import (
    AgentMode,
    AgentRespondRequest,
    AgentRespondResponse,
    CitationEvidence,
    ConstraintReportItem,
    OptimizeOptions,
    OptimizeRequest,
    ProjectionRequest,
    SimulationDiff,
    ToolCallRecord,
)

_MODE_PATTERN = {
    "WHY": re.compile(r"\b(por que|porque|why|explica|razon|motivo)\b", re.IGNORECASE),
    "WHAT_IF": re.compile(
        r"\b(si\b|what if|que pasa si|sube|baja|aumenta|reduce|cambia|ajusta)\b",
        re.IGNORECASE,
    ),
    "NEXT_BEST_ACTION": re.compile(
        r"\b(que sigue|siguiente paso|next|vender|venta|recomienda)\b",
        re.IGNORECASE,
    ),
}

_NUMERIC_CHANGE_PATTERN = re.compile(
    r"\b(sube|aumenta|incrementa|baja|reduce|disminuye)\s+([a-z0-9áéíóúñü\s]+?)\s+(\d+(?:\.\d+)?)\s*%",
    re.IGNORECASE,
)


@dataclass
class _ToolOutcome:
    record: ToolCallRecord
    payload: dict[str, object]


def respond_agent(payload: AgentRespondRequest) -> AgentRespondResponse:
    mode = _resolve_mode(payload.mode, payload.message)
    options = payload.options or {}
    top_k = int(options.get("topK", 4))
    max_tool_calls = max(1, min(int(options.get("maxToolCalls", 3)), 5))

    safety_flags: list[str] = []
    tool_calls: list[ToolCallRecord] = []

    retrieval_result = _run_tool(
        tool_name="rag.retrieve",
        fn=lambda: _retrieve(payload.message, top_k),
        tool_input={"question": payload.message, "topK": top_k},
    )
    tool_calls.append(retrieval_result.record)
    chunks = _extract_chunks(retrieval_result.payload)
    citations = _to_citation_evidence(chunks)

    simulation_diff: SimulationDiff | None = None
    projection_payload: dict[str, object] | None = None

    if mode == "WHAT_IF" and len(tool_calls) < max_tool_calls:
        if not payload.context.animalProfile or not payload.context.ingredients:
            safety_flags.append("NEEDS_MORE_INPUT")
        else:
            simulation = _run_tool(
                tool_name="solver.simulate",
                fn=lambda: _simulate_what_if(payload),
                tool_input={"message": payload.message},
            )
            tool_calls.append(simulation.record)
            if simulation.payload.get("simulationDiff") is not None:
                simulation_diff = SimulationDiff.model_validate(simulation.payload["simulationDiff"])
            if simulation.payload.get("safetyFlags"):
                safety_flags.extend(str(item) for item in simulation.payload["safetyFlags"])

    if mode == "NEXT_BEST_ACTION" and len(tool_calls) < max_tool_calls:
        projection = _run_tool(
            tool_name="projection.next_action",
            fn=lambda: _project_for_next_action(payload),
            tool_input={"batchId": payload.context.batchId},
        )
        tool_calls.append(projection.record)
        projection_payload = projection.payload
        if projection.payload.get("safetyFlags"):
            safety_flags.extend(str(item) for item in projection.payload["safetyFlags"])

    if not citations:
        safety_flags.append("NEEDS_RAG_INDEX")

    answer = _build_answer(
        mode=mode,
        message=payload.message,
        simulation_diff=simulation_diff,
        projection_payload=projection_payload,
        citations=citations,
        context_constraints=payload.context.constraintsReport,
        safety_flags=safety_flags,
    )
    answer = render_with_openai(
        mode=mode,
        user_message=payload.message,
        base_answer=answer,
        citations=[item.model_dump() for item in citations],
    )

    confidence = _estimate_confidence(citations, safety_flags)

    return AgentRespondResponse(
        mode=mode,
        answer=answer,
        citations=citations,
        safetyFlags=sorted(set(safety_flags)),
        toolCalls=tool_calls,
        simulationDiff=simulation_diff,
        confidence=confidence,
    )


def _resolve_mode(mode: AgentMode, message: str) -> str:
    if mode != "AUTO":
        return mode

    lowered = message.lower()
    if _MODE_PATTERN["WHAT_IF"].search(lowered):
        return "WHAT_IF"
    if _MODE_PATTERN["NEXT_BEST_ACTION"].search(lowered):
        return "NEXT_BEST_ACTION"
    return "WHY"


def _run_tool(
    *,
    tool_name: str,
    fn,
    tool_input: dict[str, object],
) -> _ToolOutcome:
    started_at = time.perf_counter()
    try:
        output = fn()
        latency_ms = max(0, int((time.perf_counter() - started_at) * 1000))
        return _ToolOutcome(
            record=ToolCallRecord(
                toolName=tool_name,
                status="SUCCESS",
                latencyMs=latency_ms,
                input=tool_input,
                output=output if isinstance(output, dict) else {"value": str(output)},
            ),
            payload=output if isinstance(output, dict) else {"value": str(output)},
        )
    except Exception as exc:
        latency_ms = max(0, int((time.perf_counter() - started_at) * 1000))
        payload = {"error": str(exc)}
        return _ToolOutcome(
            record=ToolCallRecord(
                toolName=tool_name,
                status="ERROR",
                latencyMs=latency_ms,
                input=tool_input,
                output=payload,
            ),
            payload=payload,
        )


def _retrieve(question: str, top_k: int) -> dict[str, object]:
    chunks = retrieve_enriched_chunks(question, top_k=top_k, filters={})
    return {
        "chunks": [
            {
                "chunkId": item.chunk_id,
                "sourceId": item.source_id,
                "sourceTitle": item.source_title,
                "snippet": item.snippet,
                "scoreVector": round(item.score_vector, 6),
                "scoreLexical": round(item.score_lexical, 6),
                "scoreHybrid": round(item.score_hybrid, 6),
                "metadata": item.metadata,
            }
            for item in chunks
        ]
    }


def _extract_chunks(payload: dict[str, object]) -> list[RetrievedChunk]:
    chunks: list[RetrievedChunk] = []
    for item in payload.get("chunks", []):
        if not isinstance(item, dict):
            continue
        chunks.append(
            RetrievedChunk(
                chunk_id=str(item.get("chunkId", "")),
                source_id=str(item.get("sourceId", "")),
                source_title=str(item.get("sourceTitle", "")),
                snippet=str(item.get("snippet", "")),
                score_vector=float(item.get("scoreVector", 0.0)),
                score_lexical=float(item.get("scoreLexical", 0.0)),
                score_hybrid=float(item.get("scoreHybrid", 0.0)),
                metadata=dict(item.get("metadata", {})),
            )
        )
    return chunks


def _to_citation_evidence(chunks: list[RetrievedChunk]) -> list[CitationEvidence]:
    return [
        CitationEvidence(
            sourceId=item.source_id,
            chunkId=item.chunk_id,
            sourceTitle=item.source_title,
            snippet=item.snippet,
            offsetStart=0,
            offsetEnd=len(item.snippet),
            score=round(item.score_hybrid, 6),
            metadata=item.metadata,
        )
        for item in chunks
    ]


def _simulate_what_if(payload: AgentRespondRequest) -> dict[str, object]:
    animal_profile = payload.context.animalProfile
    ingredients = payload.context.ingredients
    current_mix = payload.context.currentMix
    current_cost = payload.context.totalCostMxnPerHeadDay or 0.0

    if not animal_profile or not ingredients:
        return {"simulationDiff": None, "safetyFlags": ["NEEDS_MORE_INPUT"]}

    parsed = _NUMERIC_CHANGE_PATTERN.search(payload.message)
    if not parsed:
        return {"simulationDiff": None, "safetyFlags": ["NEEDS_MORE_INPUT"]}

    action = parsed.group(1).lower()
    ingredient_hint = parsed.group(2).strip().lower()
    pct_change = float(parsed.group(3))

    mix_pct_by_id = {item.ingredientId: item.pctDm for item in current_mix}
    candidate = _pick_ingredient(ingredients, ingredient_hint)
    if candidate is None:
        return {"simulationDiff": None, "safetyFlags": ["NEEDS_MORE_INPUT"]}

    adjusted_ingredients = []
    for ingredient in ingredients:
        if ingredient.id != candidate.id:
            adjusted_ingredients.append(ingredient)
            continue

        baseline = mix_pct_by_id.get(ingredient.id, ingredient.boundsPct.min)
        min_bound = ingredient.boundsPct.min
        max_bound = ingredient.boundsPct.max

        if action in ("sube", "aumenta", "incrementa"):
            min_bound = max(min_bound, min(100.0, baseline + pct_change))
        else:
            max_bound = min(max_bound, max(0.0, baseline - pct_change))

        if min_bound > max_bound:
            return {"simulationDiff": None, "safetyFlags": ["UNSAFE_REQUEST_BLOCKED"]}

        adjusted_ingredient = ingredient.model_copy(deep=True)
        adjusted_ingredient.boundsPct.min = min_bound
        adjusted_ingredient.boundsPct.max = max_bound
        adjusted_ingredients.append(adjusted_ingredient)

    optimize_request = OptimizeRequest(
        animalProfile=animal_profile,
        ingredients=adjusted_ingredients,
        options=OptimizeOptions(maxSolveMs=3500, objective="MIN_COST"),
        batchContext=payload.context.batchContext,
    )
    response = solve_optimize(optimize_request)

    before_violations = len([item for item in payload.context.constraintsReport if not item.met])
    after_violations = len([item for item in response.constraintsReport if not item.met])
    hard_constraint_delta = after_violations - before_violations

    risk_flags: list[str] = []
    if not response.feasible:
        risk_flags.append("INFEASIBLE_AFTER_CHANGE")
    if hard_constraint_delta > 0:
        risk_flags.append("MORE_CONSTRAINT_VIOLATIONS")
    if current_cost > 0 and response.totalCostMxnPerHeadDay > current_cost * 1.08:
        risk_flags.append("COST_INCREASE_HIGH")

    diff = SimulationDiff(
        costDeltaMxnPerHeadDay=round(response.totalCostMxnPerHeadDay - current_cost, 6),
        feasibleBefore=True,
        feasibleAfter=response.feasible,
        hardConstraintDelta=hard_constraint_delta,
        riskFlags=risk_flags,
    )

    return {
        "simulationDiff": diff.model_dump(),
        "solverFeasible": response.feasible,
        "solverWarnings": response.warnings,
        "safetyFlags": [],
    }


def _pick_ingredient(ingredients, hint: str):
    hint_tokens = [token for token in re.split(r"\s+", hint) if token]
    best = None
    best_score = -1
    for ingredient in ingredients:
        name = ingredient.name.lower()
        score = sum(1 for token in hint_tokens if token in name)
        if score > best_score:
            best_score = score
            best = ingredient
    return best if best_score > 0 else None


def _project_for_next_action(payload: AgentRespondRequest) -> dict[str, object]:
    context = payload.context
    if (
        not context.batchContext
        or not context.currentMix
        or context.totalCostMxnPerHeadDay is None
    ):
        return {"projection": None, "safetyFlags": ["NEEDS_MORE_INPUT"]}

    projection_request = ProjectionRequest(
        batchContext=context.batchContext,
        horizonDays=56,
        dietCostMxnPerHeadDay=context.totalCostMxnPerHeadDay,
        salePriceMxnPerKg=context.salePriceMxnPerKg or 55,
        purchasePriceMxnPerKg=context.purchasePriceMxnPerKg or 43,
        otherCostMxnPerHead=350,
        historicalWeighIns=[],
        dietMix=context.currentMix,
    )
    projection = project_batch_growth(projection_request)
    return {
        "projection": projection.model_dump(),
        "sellSignal": projection.sellSignal.model_dump(),
        "safetyFlags": [],
    }


def _build_answer(
    *,
    mode: str,
    message: str,
    simulation_diff: SimulationDiff | None,
    projection_payload: dict[str, object] | None,
    citations: list[CitationEvidence],
    context_constraints: list[ConstraintReportItem],
    safety_flags: list[str],
) -> str:
    sources_line = (
        "Fuentes: "
        + "; ".join(item.sourceTitle for item in citations[:3])
        if citations
        else "No hay evidencia suficiente en el indice RAG para sostener una recomendacion detallada."
    )

    unmet = [item for item in context_constraints if not item.met]
    compliance_line = (
        f"La corrida actual tiene {len(unmet)} restricciones sin cumplir."
        if unmet
        else "La corrida actual cumple restricciones duras reportadas."
    )

    if "UNSAFE_REQUEST_BLOCKED" in safety_flags:
        return (
            "Para proteger seguridad nutricional no puedo aplicar ese ajuste directo. "
            "Reformula la hipotesis con un cambio porcentual claro para recalcular en el solver."
        )

    if mode == "WHY":
        return f"{compliance_line} {sources_line}"

    if mode == "WHAT_IF":
        if simulation_diff is None:
            return (
                "Puedo correr el escenario, pero necesito una hipotesis cuantificada. "
                "Ejemplo: 'sube sorgo 5%'."
            )
        feasible_text = "factible" if simulation_diff.feasibleAfter else "infeasible"
        return (
            f"Simule tu escenario ({message}) y el resultado fue {feasible_text}. "
            f"Delta costo: {simulation_diff.costDeltaMxnPerHeadDay:+.2f} MXN/cabeza/dia. "
            f"Cambio en violaciones duras: {simulation_diff.hardConstraintDelta:+d}. "
            f"{sources_line}"
        )

    if mode == "NEXT_BEST_ACTION":
        if not projection_payload or projection_payload.get("sellSignal") is None:
            return (
                "Aun no tengo contexto completo para recomendar el siguiente paso del lote. "
                "Registra lote, dieta y costos para activar la recomendacion."
            )
        sell_signal = projection_payload["sellSignal"]
        should_sell = bool(sell_signal.get("shouldSell", False))
        action = "Considera vender en la ventana recomendada." if should_sell else "Mantener engorda por ahora."
        return f"{action} Motivo: {sell_signal.get('reason', 'Sin motivo disponible')}. {sources_line}"

    return f"{compliance_line} {sources_line}"


def _estimate_confidence(
    citations: list[CitationEvidence],
    safety_flags: list[str],
) -> str:
    if "NEEDS_RAG_INDEX" in safety_flags or not citations:
        return "LOW"
    top_score = max(item.score for item in citations)
    if top_score >= 0.55 and len(citations) >= 3:
        return "HIGH"
    return "MEDIUM"
