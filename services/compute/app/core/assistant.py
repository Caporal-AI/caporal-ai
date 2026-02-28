from __future__ import annotations

import re

from app.models.contracts import AskDietContext

_BLOCK_PATTERN = re.compile(
    r"\b(cuanto|cuánta|cuantas|cantidad|dosific|dosis|ajusta|sube|baja|kg|porcentaje|inclusion)\b",
    re.IGNORECASE,
)


def classify_safety_flags(question: str, context: AskDietContext) -> list[str]:
    flags: list[str] = []

    if _BLOCK_PATTERN.search(question):
        flags.append("UNSAFE_REQUEST_BLOCKED")

    if not context.dietMix:
        flags.append("NEEDS_MORE_INPUT")

    return flags


def generate_answer(
    question: str,
    context: AskDietContext,
    citations_summary: list[str],
    safety_flags: list[str],
) -> str:
    if "UNSAFE_REQUEST_BLOCKED" in safety_flags:
        return (
            "Puedo explicar la logica nutricional y operativa, pero cualquier cambio numerico "
            "de inclusion debe recalcularse con el solver para mantener restricciones duras."
        )

    unmet = [item for item in context.constraintsReport if not item.met]
    if unmet:
        first = unmet[0]
        status_line = (
            f"La corrida reporta una restriccion no satisfecha ({first.code}), por lo que conviene "
            "reformular en el solver antes de aplicar cambios en campo."
        )
    else:
        status_line = (
            "La corrida cumple restricciones duras reportadas; puedo ayudarte a interpretar por que "
            "ciertos ingredientes quedaron limitados."
        )

    if citations_summary:
        source_line = "Fuentes recuperadas: " + "; ".join(citations_summary[:3]) + "."
    else:
        source_line = (
            "No encontre fuentes en el indice; para responder con trazabilidad necesito cargar documentos RAG."
        )

    return f"{status_line} {source_line}"
