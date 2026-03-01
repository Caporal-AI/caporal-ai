from __future__ import annotations

import time
from dataclasses import dataclass

import numpy as np
from scipy.optimize import linprog

from app.models.contracts import (
    Constraint,
    ConstraintReportItem,
    InfeasibilityAlternative,
    InfeasibilityAnalysis,
    InfeasibilityPriorityAction,
    MixItem,
    OptimizeRequest,
    OptimizeResponse,
    SolverMeta,
)

_TOL = 1e-7


@dataclass
class _ConstraintDiagnostics:
    code: str
    min_possible_abs: float
    max_possible_abs: float
    min_required_abs: float | None
    max_required_abs: float | None


def solve_optimize(payload: OptimizeRequest) -> OptimizeResponse:
    started_at = time.perf_counter()

    if len(payload.ingredients) == 0:
        return _build_infeasible_response(
            payload,
            warnings=["No ingredients were provided to the solver."],
            runtime_ms=_runtime_ms(started_at),
            infeasibility_analysis=InfeasibilityAnalysis(
                reasonCode="UNKNOWN",
                summary="No hay ingredientes disponibles para construir una mezcla.",
                priorityActions=[
                    InfeasibilityPriorityAction(
                        priority=1,
                        title="Cargar ingredientes activos con precio",
                        reason="Sin ingredientes y precios vigentes no se puede formular la dieta.",
                    )
                ],
                alternatives=[],
            ),
        )

    intake = payload.animalProfile.intakeDmKgPerDay
    ingredients = payload.ingredients
    n = len(ingredients)

    dry_matter_fractions = np.array([item.dryMatterPct / 100 for item in ingredients], dtype=float)
    prices_as_fed = np.array([item.priceMxnPerKgAsFed for item in ingredients], dtype=float)
    costs_per_kg_dm = prices_as_fed / dry_matter_fractions

    lb = np.array([(item.boundsPct.min / 100.0) * intake for item in ingredients], dtype=float)
    ub = np.array([(item.boundsPct.max / 100.0) * intake for item in ingredients], dtype=float)

    warnings: list[str] = []
    invalid_nutrient_entries = _collect_invalid_nutrient_entries(ingredients)
    if invalid_nutrient_entries:
        warnings.append(
            "Se detectaron valores nutricionales no validos; se tomaron como 0 para evitar fallos."
        )
        sample = ", ".join(invalid_nutrient_entries[:4])
        warnings.append(f"Ingredientes/campos afectados: {sample}.")

    invalid_bounds = [
        item.name for item, lower, upper in zip(ingredients, lb, ub, strict=True) if lower > upper + _TOL
    ]
    if invalid_bounds:
        warnings.append(
            "Invalid bounds detected (min > max) for: " + ", ".join(sorted(invalid_bounds))
        )
        return _build_infeasible_response(
            payload,
            warnings,
            _runtime_ms(started_at),
            infeasibility_analysis=_build_invalid_bounds_analysis(payload, invalid_bounds),
        )

    lower_sum = float(np.sum(lb))
    upper_sum = float(np.sum(ub))
    if lower_sum > intake + _TOL:
        warnings.append(
            f"Lower bounds sum ({lower_sum:.4f}) exceeds intake target ({intake:.4f})."
        )
        warnings.append("Suggestion: relax one or more ingredient minimum inclusion constraints.")
        return _build_infeasible_response(
            payload,
            warnings,
            _runtime_ms(started_at),
            infeasibility_analysis=_build_lower_bounds_analysis(payload, lower_sum),
        )

    if upper_sum + _TOL < intake:
        warnings.append(
            f"Upper bounds sum ({upper_sum:.4f}) is below intake target ({intake:.4f})."
        )
        warnings.append("Suggestion: increase one or more ingredient maximum inclusion constraints.")
        return _build_infeasible_response(
            payload,
            warnings,
            _runtime_ms(started_at),
            infeasibility_analysis=_build_upper_bounds_analysis(payload, upper_sum),
        )

    A_ub: list[np.ndarray] = []
    b_ub: list[float] = []

    diagnostics: list[_ConstraintDiagnostics] = []

    for constraint in payload.animalProfile.constraints:
        coefficients = np.array(
            [_safe_nutrient_value(item, constraint.code) for item in ingredients], dtype=float
        )
        min_required_abs = _to_absolute_requirement(constraint.min, constraint.unit, intake)
        max_required_abs = _to_absolute_requirement(constraint.max, constraint.unit, intake)

        min_possible_abs, max_possible_abs = _reachable_abs_range(coefficients, lb, ub, intake)

        diagnostics.append(
            _ConstraintDiagnostics(
                code=constraint.code,
                min_possible_abs=min_possible_abs,
                max_possible_abs=max_possible_abs,
                min_required_abs=min_required_abs,
                max_required_abs=max_required_abs,
            )
        )

        if min_required_abs is not None:
            A_ub.append(-coefficients)
            b_ub.append(-min_required_abs)

        if max_required_abs is not None:
            A_ub.append(coefficients)
            b_ub.append(max_required_abs)

    infeasibility_hints = _build_infeasibility_hints(diagnostics, payload.animalProfile.constraints, intake)

    if infeasibility_hints:
        warnings.extend(infeasibility_hints)
        return _build_infeasible_response(
            payload,
            warnings,
            _runtime_ms(started_at),
            diagnostics,
            infeasibility_analysis=_build_constraint_conflict_analysis(payload, diagnostics),
        )

    A_ub_array = np.vstack(A_ub) if A_ub else None
    b_ub_array = np.array(b_ub, dtype=float) if b_ub else None

    result = linprog(
        c=costs_per_kg_dm,
        A_ub=A_ub_array,
        b_ub=b_ub_array,
        A_eq=np.ones((1, n), dtype=float),
        b_eq=np.array([intake], dtype=float),
        bounds=[(float(low), float(high)) for low, high in zip(lb, ub, strict=True)],
        method="highs",
        options={"time_limit": max(payload.options.maxSolveMs, 1) / 1000.0},
    )

    runtime_ms = _runtime_ms(started_at)

    if not result.success or result.x is None:
        warnings.append(f"Solver status={result.status} message={result.message}")
        warnings.append("Suggestion: relax one or more nutrient constraints or ingredient bounds.")
        return _build_infeasible_response(
            payload,
            warnings,
            runtime_ms,
            diagnostics,
            infeasibility_analysis=_build_solver_failure_analysis(payload),
        )

    x = result.x.astype(float)
    if np.any(x < -_TOL):
        warnings.append("Solver returned negative decision values; values were clipped to zero.")
    x = np.where(x < 0, 0, x)

    total_cost = float(np.dot(x, costs_per_kg_dm))

    mix: list[MixItem] = []
    for item, value_dm, dm_fraction in zip(ingredients, x, dry_matter_fractions, strict=True):
        if value_dm <= _TOL:
            continue
        kg_as_fed = value_dm / dm_fraction
        mix.append(
            MixItem(
                ingredientId=item.id,
                kgAsFedPerHeadDay=round(float(kg_as_fed), 6),
                kgDmPerHeadDay=round(float(value_dm), 6),
                pctDm=round(float((value_dm / intake) * 100), 4),
            )
        )

    constraints_report = _build_constraints_report(
        constraints=payload.animalProfile.constraints,
        intake=intake,
        x=x,
        ingredients=payload.ingredients,
    )

    return OptimizeResponse(
        feasible=True,
        mix=mix,
        totalCostMxnPerHeadDay=round(total_cost, 6),
        constraintsReport=constraints_report,
        solverMeta=SolverMeta(method="highs", runtimeMs=runtime_ms),
        warnings=warnings,
    )


def _build_constraints_report(
    constraints: list[Constraint],
    intake: float,
    x: np.ndarray,
    ingredients,
) -> list[ConstraintReportItem]:
    report = [
        ConstraintReportItem(
            code="TOTAL_DM",
            target=f"={intake:.4f} kg_per_day",
            actual=round(float(np.sum(x)), 6),
            met=abs(float(np.sum(x)) - intake) <= 1e-5,
            slack=round(float(intake - np.sum(x)), 6),
        )
    ]

    for constraint in constraints:
        coefficients = np.array(
            [_safe_nutrient_value(item, constraint.code) for item in ingredients], dtype=float
        )
        total_abs = float(np.dot(x, coefficients))
        actual_unit = _from_absolute_value(total_abs, constraint.unit, intake)

        meets_min = constraint.min is None or actual_unit + _TOL >= constraint.min
        meets_max = constraint.max is None or actual_unit - _TOL <= constraint.max

        if constraint.min is not None and constraint.max is not None:
            slack = min(actual_unit - constraint.min, constraint.max - actual_unit)
            target = f"[{constraint.min:.6f}, {constraint.max:.6f}] {constraint.unit}"
        elif constraint.min is not None:
            slack = actual_unit - constraint.min
            target = f">= {constraint.min:.6f} {constraint.unit}"
        elif constraint.max is not None:
            slack = constraint.max - actual_unit
            target = f"<= {constraint.max:.6f} {constraint.unit}"
        else:
            slack = 0.0
            target = f"(no bound) {constraint.unit}"

        report.append(
            ConstraintReportItem(
                code=constraint.code,
                target=target,
                actual=round(float(actual_unit), 6),
                met=bool(meets_min and meets_max),
                slack=round(float(slack), 6),
            )
        )

    return report


def _build_infeasibility_hints(
    diagnostics: list[_ConstraintDiagnostics],
    constraints: list[Constraint],
    intake: float,
) -> list[str]:
    hints: list[str] = []
    constraint_map = {item.code: item for item in constraints}

    for item in diagnostics:
        constraint = constraint_map[item.code]

        if item.min_required_abs is not None and item.min_required_abs > item.max_possible_abs + _TOL:
            current = _from_absolute_value(item.max_possible_abs, constraint.unit, intake)
            required = _from_absolute_value(item.min_required_abs, constraint.unit, intake)
            hints.append(
                f"Constraint conflict: {item.code} minimum {required:.6f} exceeds achievable maximum {current:.6f}."
            )
            hints.append(f"Suggestion: relax minimum bound for {item.code}.")

        if item.max_required_abs is not None and item.max_required_abs + _TOL < item.min_possible_abs:
            current = _from_absolute_value(item.min_possible_abs, constraint.unit, intake)
            required = _from_absolute_value(item.max_required_abs, constraint.unit, intake)
            hints.append(
                f"Constraint conflict: {item.code} maximum {required:.6f} is below achievable minimum {current:.6f}."
            )
            hints.append(f"Suggestion: relax maximum bound for {item.code}.")

    return hints


def _build_infeasible_response(
    payload: OptimizeRequest,
    warnings: list[str],
    runtime_ms: int,
    diagnostics: list[_ConstraintDiagnostics] | None = None,
    infeasibility_analysis: InfeasibilityAnalysis | None = None,
) -> OptimizeResponse:
    if diagnostics:
        report: list[ConstraintReportItem] = []
        for item in diagnostics:
            constraint = next(c for c in payload.animalProfile.constraints if c.code == item.code)
            current = _from_absolute_value(item.min_possible_abs, constraint.unit, payload.animalProfile.intakeDmKgPerDay)
            report.append(
                ConstraintReportItem(
                    code=item.code,
                    target=(
                        f"min={constraint.min if constraint.min is not None else '-inf'} "
                        f"max={constraint.max if constraint.max is not None else 'inf'} {constraint.unit}"
                    ),
                    actual=round(float(current), 6),
                    met=False,
                    slack=-1.0,
                )
            )
    else:
        report = [
            ConstraintReportItem(
                code="TOTAL_DM",
                target=f"={payload.animalProfile.intakeDmKgPerDay:.4f} kg_per_day",
                actual=0,
                met=False,
                slack=-payload.animalProfile.intakeDmKgPerDay,
            )
        ]

    return OptimizeResponse(
        feasible=False,
        mix=[],
        totalCostMxnPerHeadDay=0,
        constraintsReport=report,
        solverMeta=SolverMeta(method="highs", runtimeMs=runtime_ms),
        warnings=warnings,
        infeasibilityAnalysis=infeasibility_analysis,
    )


def _build_invalid_bounds_analysis(
    payload: OptimizeRequest,
    invalid_bounds: list[str],
) -> InfeasibilityAnalysis:
    invalid_ingredients = [item for item in payload.ingredients if item.name in invalid_bounds]
    actions = []
    for index, item in enumerate(invalid_ingredients[:3], start=1):
        actions.append(
            InfeasibilityPriorityAction(
                priority=index,
                title=f"Corregir limites de {item.name}",
                reason="El minimo de inclusion es mayor que el maximo permitido.",
                ingredientId=item.id,
                ingredientName=item.name,
                currentMinPct=round(float(item.boundsPct.min), 2),
                currentMaxPct=round(float(item.boundsPct.max), 2),
                suggestedMinPct=round(float(min(item.boundsPct.min, item.boundsPct.max)), 2),
                suggestedMaxPct=round(float(max(item.boundsPct.min, item.boundsPct.max)), 2),
            )
        )

    return InfeasibilityAnalysis(
        reasonCode="UNKNOWN",
        summary="Se detectaron ingredientes con limites invalidos (minimo mayor que maximo).",
        priorityActions=actions
        or [
            InfeasibilityPriorityAction(
                priority=1,
                title="Revisar limites de inclusion",
                reason="Hay limites inconsistente en uno o mas ingredientes.",
            )
        ],
        alternatives=[
            InfeasibilityAlternative(
                title="Estandarizar validacion de limites",
                summary="Asegura que cada ingrediente cumpla minimo <= maximo antes de correr el solver.",
                tradeoff="Requiere revisar configuracion de ingredientes en catalogo.",
            )
        ],
    )


def _build_lower_bounds_analysis(payload: OptimizeRequest, lower_sum: float) -> InfeasibilityAnalysis:
    intake = payload.animalProfile.intakeDmKgPerDay
    excess_kg = max(0.0, lower_sum - intake)
    excess_pct = (excess_kg / intake) * 100 if intake > 0 else 0
    remaining_pct = excess_pct

    sorted_by_min = sorted(payload.ingredients, key=lambda item: float(item.boundsPct.min), reverse=True)
    actions: list[InfeasibilityPriorityAction] = []

    for item in sorted_by_min:
        current_min = float(item.boundsPct.min)
        if current_min <= 0 or remaining_pct <= _TOL:
            continue

        reduce_pct = min(current_min, remaining_pct)
        suggested_min = max(0.0, current_min - reduce_pct)
        actions.append(
            InfeasibilityPriorityAction(
                priority=len(actions) + 1,
                title=f"Reducir minimo de {item.name}",
                reason=(
                    f"Su minimo actual ({current_min:.2f}%) empuja la suma de minimos por arriba de 100% MS."
                ),
                ingredientId=item.id,
                ingredientName=item.name,
                currentMinPct=round(current_min, 2),
                currentMaxPct=round(float(item.boundsPct.max), 2),
                suggestedMinPct=round(suggested_min, 2),
                deltaPct=round(-reduce_pct, 2),
            )
        )
        remaining_pct -= reduce_pct
        if len(actions) >= 4:
            break

    return InfeasibilityAnalysis(
        reasonCode="LOWER_BOUNDS_SUM",
        summary=(
            f"La suma de minimos exigidos supera la meta de consumo en {excess_kg:.2f} kg MS/dia "
            f"({excess_pct:.2f}% de la dieta)."
        ),
        priorityActions=actions
        or [
            InfeasibilityPriorityAction(
                priority=1,
                title="Bajar minimos de inclusion",
                reason="La suma total de minimos excede el 100% de materia seca disponible.",
            )
        ],
        alternatives=[
            InfeasibilityAlternative(
                title="Plan A: Ajuste conservador de minimos",
                summary="Baja primero minimos de ingredientes con mayor porcentaje obligatorio.",
                tradeoff="Puede cambiar la composicion base esperada por manejo.",
            ),
            InfeasibilityAlternative(
                title="Plan B: Ventana temporal por etapa",
                summary="Usa minimos mas flexibles en transicion y regresa limites en finalizacion.",
                tradeoff="Requiere control operativo por fase.",
            ),
        ],
    )


def _build_upper_bounds_analysis(payload: OptimizeRequest, upper_sum: float) -> InfeasibilityAnalysis:
    intake = payload.animalProfile.intakeDmKgPerDay
    missing_kg = max(0.0, intake - upper_sum)
    missing_pct = (missing_kg / intake) * 100 if intake > 0 else 0
    remaining_pct = missing_pct

    candidates = sorted(
        payload.ingredients,
        key=lambda item: (float(item.priceMxnPerKgAsFed), -float(item.boundsPct.max)),
    )
    actions: list[InfeasibilityPriorityAction] = []

    for item in candidates:
        current_max = float(item.boundsPct.max)
        room = max(0.0, 100.0 - current_max)
        if room <= _TOL or remaining_pct <= _TOL:
            continue

        increase_pct = min(room, remaining_pct)
        suggested_max = min(100.0, current_max + increase_pct)
        actions.append(
            InfeasibilityPriorityAction(
                priority=len(actions) + 1,
                title=f"Subir maximo de {item.name}",
                reason=(
                    f"El maximo actual ({current_max:.2f}%) limita la capacidad total de la mezcla."
                ),
                ingredientId=item.id,
                ingredientName=item.name,
                currentMaxPct=round(current_max, 2),
                currentMinPct=round(float(item.boundsPct.min), 2),
                suggestedMaxPct=round(suggested_max, 2),
                deltaPct=round(increase_pct, 2),
            )
        )
        remaining_pct -= increase_pct
        if len(actions) >= 4:
            break

    return InfeasibilityAnalysis(
        reasonCode="UPPER_BOUNDS_SUM",
        summary=(
            f"La suma de maximos permitidos queda corta por {missing_kg:.2f} kg MS/dia "
            f"({missing_pct:.2f}% de la dieta)."
        ),
        priorityActions=actions
        or [
            InfeasibilityPriorityAction(
                priority=1,
                title="Aumentar maximos de inclusion",
                reason="La capacidad total por maximos no llega al 100% de materia seca objetivo.",
            )
        ],
        alternatives=[
            InfeasibilityAlternative(
                title="Plan A: Abrir maximos en ingredientes base",
                summary="Incrementa maximos en ingredientes de mayor disponibilidad y costo razonable.",
                tradeoff="Puede aumentar riesgo de desbalance si no se revisan nutrientes.",
            ),
            InfeasibilityAlternative(
                title="Plan B: Activar ingrediente complementario",
                summary="Habilita un ingrediente adicional con maximo operativo para cerrar el faltante.",
                tradeoff="Requiere precio vigente y validacion de inventario.",
            ),
        ],
    )


def _build_constraint_conflict_analysis(
    payload: OptimizeRequest,
    diagnostics: list[_ConstraintDiagnostics],
) -> InfeasibilityAnalysis:
    intake = payload.animalProfile.intakeDmKgPerDay
    constraints = {item.code: item for item in payload.animalProfile.constraints}
    actions: list[InfeasibilityPriorityAction] = []
    summary = "Existe al menos un conflicto entre restricciones nutricionales y limites de ingredientes."

    for diagnostic in diagnostics:
        constraint = constraints.get(diagnostic.code)
        if constraint is None:
            continue

        if (
            diagnostic.min_required_abs is not None
            and diagnostic.min_required_abs > diagnostic.max_possible_abs + _TOL
        ):
            required = _from_absolute_value(diagnostic.min_required_abs, constraint.unit, intake)
            achievable = _from_absolute_value(diagnostic.max_possible_abs, constraint.unit, intake)
            summary = (
                f"La restriccion {diagnostic.code} pide un minimo mayor al maximo alcanzable "
                f"({required:.4f} > {achievable:.4f})."
            )
            actions.append(
                InfeasibilityPriorityAction(
                    priority=1,
                    title=f"Relajar minimo de {diagnostic.code}",
                    reason=f"El minimo solicitado ({required:.4f}) no se puede alcanzar con los limites actuales.",
                    constraintCode=diagnostic.code,
                )
            )
            actions.extend(
                _ingredient_actions_for_constraint(
                    payload=payload,
                    constraint_code=diagnostic.code,
                    direction="RAISE_NUTRIENT",
                    start_priority=2,
                )
            )
            if len(actions) <= 1:
                actions.extend(
                    _fallback_bound_actions(
                        payload=payload,
                        start_priority=2,
                    )
                )
            break

        if (
            diagnostic.max_required_abs is not None
            and diagnostic.max_required_abs + _TOL < diagnostic.min_possible_abs
        ):
            required = _from_absolute_value(diagnostic.max_required_abs, constraint.unit, intake)
            achievable = _from_absolute_value(diagnostic.min_possible_abs, constraint.unit, intake)
            summary = (
                f"La restriccion {diagnostic.code} impone un maximo por debajo del minimo alcanzable "
                f"({required:.4f} < {achievable:.4f})."
            )
            actions.append(
                InfeasibilityPriorityAction(
                    priority=1,
                    title=f"Relajar maximo de {diagnostic.code}",
                    reason=f"El maximo solicitado ({required:.4f}) no es alcanzable con los limites actuales.",
                    constraintCode=diagnostic.code,
                )
            )
            actions.extend(
                _ingredient_actions_for_constraint(
                    payload=payload,
                    constraint_code=diagnostic.code,
                    direction="LOWER_NUTRIENT",
                    start_priority=2,
                )
            )
            if len(actions) <= 1:
                actions.extend(
                    _fallback_bound_actions(
                        payload=payload,
                        start_priority=2,
                    )
                )
            break

    if not actions:
        actions.append(
            InfeasibilityPriorityAction(
                priority=1,
                title="Revisar restricciones nutricionales",
                reason="Hay conflicto entre metas nutricionales y la ventana operativa de ingredientes.",
            )
        )

    return InfeasibilityAnalysis(
        reasonCode="CONSTRAINT_CONFLICT",
        summary=summary,
        priorityActions=actions,
        alternatives=[
            InfeasibilityAlternative(
                title="Plan A: Ajustar temporalmente la restriccion en conflicto",
                summary="Relaja el limite conflictivo en un rango controlado y vuelve a correr el solver.",
                tradeoff="Puede sacrificar precision nutricional en el corto plazo.",
            ),
            InfeasibilityAlternative(
                title="Plan B: Abrir limites de ingredientes clave",
                summary="Aumenta margen en ingredientes que aportan el nutriente en conflicto.",
                tradeoff="Requiere control de riesgo digestivo y costo.",
            ),
        ],
    )


def _ingredient_actions_for_constraint(
    *,
    payload: OptimizeRequest,
    constraint_code: str,
    direction: str,
    start_priority: int,
) -> list[InfeasibilityPriorityAction]:
    nutrient_rank = sorted(
        payload.ingredients,
        key=lambda item: _safe_nutrient_value(item, constraint_code),
        reverse=True,
    )
    actions: list[InfeasibilityPriorityAction] = []

    if direction == "RAISE_NUTRIENT":
        for item in nutrient_rank:
            nutrient_value = _safe_nutrient_value(item, constraint_code)
            if nutrient_value <= _TOL:
                continue
            if float(item.boundsPct.max) >= 99.9:
                continue
            suggested_max = min(100.0, float(item.boundsPct.max) + 3.0)
            nutrient_label = _nutrient_label(constraint_code)
            nutrient_value_text = _format_nutrient_value(constraint_code, nutrient_value)
            current_max = float(item.boundsPct.max)
            actions.append(
                InfeasibilityPriorityAction(
                    priority=start_priority + len(actions),
                    title=f"Subir maximo de {item.name}",
                    reason=(
                        f"{item.name} aporta {nutrient_value_text} de {nutrient_label}; "
                        f"subir su maximo de {current_max:.2f}% a {suggested_max:.2f}% "
                        f"ayuda a cumplir el minimo de {nutrient_label}."
                    ),
                    ingredientId=item.id,
                    ingredientName=item.name,
                    constraintCode=constraint_code,
                    currentMinPct=round(float(item.boundsPct.min), 2),
                    currentMaxPct=round(current_max, 2),
                    suggestedMaxPct=round(suggested_max, 2),
                    deltaPct=round(suggested_max - current_max, 2),
                )
            )
            if len(actions) >= 3:
                break
        return actions

    for item in nutrient_rank:
        nutrient_value = _safe_nutrient_value(item, constraint_code)
        if nutrient_value <= _TOL:
            continue
        if float(item.boundsPct.min) <= _TOL:
            continue
        current_min = float(item.boundsPct.min)
        suggested_min = max(0.0, current_min - 3.0)
        nutrient_label = _nutrient_label(constraint_code)
        nutrient_value_text = _format_nutrient_value(constraint_code, nutrient_value)
        actions.append(
            InfeasibilityPriorityAction(
                priority=start_priority + len(actions),
                title=f"Bajar minimo de {item.name}",
                reason=(
                    f"{item.name} aporta {nutrient_value_text} de {nutrient_label}; "
                    f"bajar su minimo de {current_min:.2f}% a {suggested_min:.2f}% "
                    f"reduce el riesgo de exceso de {nutrient_label}."
                ),
                ingredientId=item.id,
                ingredientName=item.name,
                constraintCode=constraint_code,
                currentMinPct=round(current_min, 2),
                currentMaxPct=round(float(item.boundsPct.max), 2),
                suggestedMinPct=round(suggested_min, 2),
                deltaPct=round(suggested_min - current_min, 2),
            )
        )
        if len(actions) >= 3:
            break

    return actions


def _fallback_bound_actions(*, payload: OptimizeRequest, start_priority: int) -> list[InfeasibilityPriorityAction]:
    ranked = sorted(payload.ingredients, key=lambda item: float(item.boundsPct.min), reverse=True)
    actions: list[InfeasibilityPriorityAction] = []
    for item in ranked:
        current_min = float(item.boundsPct.min)
        if current_min <= _TOL:
            continue
        suggested_min = max(0.0, current_min - 2.0)
        actions.append(
            InfeasibilityPriorityAction(
                priority=start_priority + len(actions),
                title=f"Bajar minimo de {item.name}",
                reason=(
                    f"Como accion de recuperacion, reduce su minimo de {current_min:.2f}% a {suggested_min:.2f}% "
                    "para abrir espacio de formulacion."
                ),
                ingredientId=item.id,
                ingredientName=item.name,
                currentMinPct=round(current_min, 2),
                currentMaxPct=round(float(item.boundsPct.max), 2),
                suggestedMinPct=round(suggested_min, 2),
                deltaPct=round(suggested_min - current_min, 2),
            )
        )
        if len(actions) >= 3:
            break

    return actions


def _build_solver_failure_analysis(payload: OptimizeRequest) -> InfeasibilityAnalysis:
    return InfeasibilityAnalysis(
        reasonCode="SOLVER_FAILURE",
        summary="El solver no pudo cerrar una solucion factible con la configuracion actual.",
        priorityActions=[
            InfeasibilityPriorityAction(
                priority=1,
                title="Reducir rigidez de limites",
                reason="Los limites de ingredientes o nutrientes pueden estar demasiado cerrados.",
            ),
            InfeasibilityPriorityAction(
                priority=2,
                title="Verificar precios y materia seca",
                reason="Datos extremos de costo o humedad pueden distorsionar la formulacion.",
            ),
        ],
        alternatives=[
            InfeasibilityAlternative(
                title="Plan alterno: correr escenario conservador",
                summary="Baja minimos estrictos y amplia maximos en ingredientes base para recuperar factibilidad.",
                tradeoff="Resultado menos restrictivo pero util para retomar operacion.",
            )
        ],
    )


def _reachable_abs_range(
    coefficients: np.ndarray,
    lower_bounds: np.ndarray,
    upper_bounds: np.ndarray,
    intake: float,
) -> tuple[float, float]:
    min_abs = _optimize_linear_with_bounds(coefficients, lower_bounds, upper_bounds, intake, maximize=False)
    max_abs = _optimize_linear_with_bounds(coefficients, lower_bounds, upper_bounds, intake, maximize=True)
    return min_abs, max_abs


def _optimize_linear_with_bounds(
    coefficients: np.ndarray,
    lower_bounds: np.ndarray,
    upper_bounds: np.ndarray,
    intake: float,
    *,
    maximize: bool,
) -> float:
    x = np.array(lower_bounds, dtype=float)
    remaining = intake - float(np.sum(x))

    order = np.argsort(coefficients)
    if maximize:
        order = order[::-1]

    for idx in order:
        if remaining <= _TOL:
            break

        capacity = float(upper_bounds[idx] - x[idx])
        if capacity <= _TOL:
            continue

        add = min(capacity, remaining)
        x[idx] += add
        remaining -= add

    if remaining > _TOL:
        return float("inf") if maximize else float("-inf")

    return float(np.dot(x, coefficients))


def _to_absolute_requirement(value: float | None, unit: str, intake: float) -> float | None:
    if value is None:
        return None

    if unit in ("fraction_dm", "per_kg_dm"):
        return value * intake

    if unit == "pct_dm":
        return (value / 100.0) * intake

    if unit == "kg_per_day":
        return value

    raise ValueError(f"Unsupported constraint unit: {unit}")


def _from_absolute_value(total_abs: float, unit: str, intake: float) -> float:
    if unit in ("fraction_dm", "per_kg_dm"):
        return total_abs / intake

    if unit == "pct_dm":
        return (total_abs / intake) * 100.0

    if unit == "kg_per_day":
        return total_abs

    raise ValueError(f"Unsupported constraint unit: {unit}")


def _runtime_ms(started_at: float) -> int:
    return max(0, int((time.perf_counter() - started_at) * 1000))


def _safe_nutrient_value(item, code: str) -> float:
    raw = item.nutrients.get(code, 0.0)
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return 0.0
    if not np.isfinite(value):
        return 0.0
    return value


def _collect_invalid_nutrient_entries(ingredients) -> list[str]:
    invalid: list[str] = []
    for item in ingredients:
        for code, raw in item.nutrients.items():
            try:
                value = float(raw)
            except (TypeError, ValueError):
                invalid.append(f"{item.name}:{code}")
                continue
            if not np.isfinite(value):
                invalid.append(f"{item.name}:{code}")
    return invalid


def _nutrient_label(code: str) -> str:
    labels = {
        "NDF": "fibra",
        "CP": "proteina",
        "ME_MCAL_KGDM": "energia util",
        "Ca": "calcio",
        "P": "fosforo",
    }
    return labels.get(code, code)


def _format_nutrient_value(code: str, value: float) -> str:
    if code == "ME_MCAL_KGDM":
        return f"{value:.2f} Mcal/kg MS"
    if code in ("NDF", "CP", "Ca", "P"):
        return f"{value * 100:.2f}%"
    return f"{value:.4f}"
