from __future__ import annotations

import time
from dataclasses import dataclass

import numpy as np
from scipy.optimize import linprog

from app.models.contracts import (
    Constraint,
    ConstraintReportItem,
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

    invalid_bounds = [
        item.name for item, lower, upper in zip(ingredients, lb, ub, strict=True) if lower > upper + _TOL
    ]
    if invalid_bounds:
        warnings.append(
            "Invalid bounds detected (min > max) for: " + ", ".join(sorted(invalid_bounds))
        )
        return _build_infeasible_response(payload, warnings, _runtime_ms(started_at))

    lower_sum = float(np.sum(lb))
    upper_sum = float(np.sum(ub))
    if lower_sum > intake + _TOL:
        warnings.append(
            f"Lower bounds sum ({lower_sum:.4f}) exceeds intake target ({intake:.4f})."
        )
        warnings.append("Suggestion: relax one or more ingredient minimum inclusion constraints.")
        return _build_infeasible_response(payload, warnings, _runtime_ms(started_at))

    if upper_sum + _TOL < intake:
        warnings.append(
            f"Upper bounds sum ({upper_sum:.4f}) is below intake target ({intake:.4f})."
        )
        warnings.append("Suggestion: increase one or more ingredient maximum inclusion constraints.")
        return _build_infeasible_response(payload, warnings, _runtime_ms(started_at))

    A_ub: list[np.ndarray] = []
    b_ub: list[float] = []

    diagnostics: list[_ConstraintDiagnostics] = []

    for constraint in payload.animalProfile.constraints:
        coefficients = np.array(
            [item.nutrients.get(constraint.code, 0.0) for item in ingredients], dtype=float
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
        return _build_infeasible_response(payload, warnings, _runtime_ms(started_at), diagnostics)

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
        return _build_infeasible_response(payload, warnings, runtime_ms, diagnostics)

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
            [item.nutrients.get(constraint.code, 0.0) for item in ingredients], dtype=float
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
