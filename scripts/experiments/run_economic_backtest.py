#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import random
import statistics
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


def load_json(path: str) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def post_json(url: str, payload: dict[str, Any], timeout_seconds: int) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:  # pragma: no cover - exercised only with bad upstream
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} calling {url}: {body}") from exc
    except urllib.error.URLError as exc:  # pragma: no cover - exercised only when service is down
        raise RuntimeError(f"Failed calling {url}: {exc}") from exc


def ensure_compute_health(compute_url: str, timeout_seconds: int) -> None:
    with urllib.request.urlopen(f"{compute_url.rstrip('/')}/health", timeout=timeout_seconds) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if payload.get("status") != "ok":
        raise RuntimeError(f"Compute health check failed: {payload}")


def with_prices(config: dict[str, Any], day_prices: dict[str, float]) -> list[dict[str, Any]]:
    ingredients = []
    for item in config["ingredients"]:
        ingredient = {
            "id": item["id"],
            "name": item["name"],
            "priceMxnPerKgAsFed": float(day_prices[item["id"]]),
            "dryMatterPct": float(item["dryMatterPct"]),
            "nutrients": dict(item["nutrients"]),
            "boundsPct": dict(item["boundsPct"]),
        }
        ingredients.append(ingredient)
    return ingredients


def build_optimize_request(config: dict[str, Any], day_prices: dict[str, float]) -> dict[str, Any]:
    return {
        "animalProfile": config["animalProfile"],
        "ingredients": with_prices(config, day_prices),
        "options": {"maxSolveMs": 4000, "objective": "MIN_COST"},
        "batchContext": config["batchContext"],
    }


def build_ingredient_lookup(config: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {item["id"]: item for item in config["ingredients"]}


def evaluate_baseline(config: dict[str, Any], day_prices: dict[str, float]) -> dict[str, Any]:
    intake_dm = float(config["animalProfile"]["intakeDmKgPerDay"])
    baseline = config["baselineDietPctDm"]
    lookup = build_ingredient_lookup(config)

    cost = 0.0
    mix = []
    nutrient_totals: dict[str, float] = {}
    for ingredient_id, pct_dm in baseline.items():
        ingredient = lookup[ingredient_id]
        kg_dm = intake_dm * (float(pct_dm) / 100.0)
        kg_as_fed = kg_dm / (float(ingredient["dryMatterPct"]) / 100.0)
        price = float(day_prices[ingredient_id])
        cost += kg_as_fed * price
        mix.append(
            {
                "ingredientId": ingredient_id,
                "pctDm": round(float(pct_dm), 4),
                "kgDmPerHeadDay": round(kg_dm, 6),
                "kgAsFedPerHeadDay": round(kg_as_fed, 6),
            }
        )
        for nutrient_code, nutrient_value in ingredient["nutrients"].items():
            nutrient_totals[nutrient_code] = nutrient_totals.get(nutrient_code, 0.0) + kg_dm * float(nutrient_value)

    constraints_report = []
    hard_violations = 0
    for constraint in config["animalProfile"]["constraints"]:
        code = constraint["code"]
        unit = constraint["unit"]
        total_value = nutrient_totals.get(code, 0.0)
        if unit in ("fraction_dm", "per_kg_dm"):
            actual = total_value / intake_dm
        elif unit == "kg_per_day":
            actual = total_value
        elif unit == "pct_dm":
            actual = (total_value / intake_dm) * 100.0
        else:
            actual = total_value
        min_value = constraint.get("min")
        max_value = constraint.get("max")
        met = True
        if min_value is not None and actual < float(min_value):
            met = False
        if max_value is not None and actual > float(max_value):
            met = False
        if not met:
            hard_violations += 1
        constraints_report.append(
            {
                "code": code,
                "actual": round(actual, 6),
                "min": min_value,
                "max": max_value,
                "met": met,
            }
        )

    return {
        "mix": mix,
        "costMxnPerHeadDay": round(cost, 6),
        "constraintsReport": constraints_report,
        "hardViolations": hard_violations,
    }


def bootstrap_ci(values: list[float], *, seed: int, samples: int = 4000) -> tuple[float, float]:
    if not values:
        return (0.0, 0.0)
    rng = random.Random(seed)
    means = []
    for _ in range(samples):
        draw = [values[rng.randrange(len(values))] for _ in range(len(values))]
        means.append(sum(draw) / len(draw))
    means.sort()
    low_index = max(0, int(samples * 0.025) - 1)
    high_index = min(samples - 1, int(samples * 0.975) - 1)
    return (round(means[low_index], 6), round(means[high_index], 6))


def build_summary(rows: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, Any]:
    feasible_rows = [row for row in rows if row["optimizedFeasible"]]
    daily_diffs = [row["dailySavingsMxnPerHead"] for row in feasible_rows]
    daily_savings_pct = [row["dailySavingsPct"] for row in feasible_rows]
    baseline_costs = [row["baselineCostMxnPerHeadDay"] for row in rows]
    optimized_costs = [row["optimizedCostMxnPerHeadDay"] for row in feasible_rows]

    mean_savings = statistics.mean(daily_diffs) if daily_diffs else 0.0
    mean_savings_pct = statistics.mean(daily_savings_pct) if daily_savings_pct else 0.0
    stdev_savings = statistics.stdev(daily_diffs) if len(daily_diffs) > 1 else 0.0
    ci_low, ci_high = bootstrap_ci(daily_diffs, seed=int(config["seed"]))

    total_baseline_per_head = sum(row["baselineCostMxnPerHeadDay"] for row in rows)
    total_optimized_per_head = sum(row["optimizedCostMxnPerHeadDay"] for row in feasible_rows)
    head_count = int(config["batchContext"]["headCount"])
    total_baseline_lot = total_baseline_per_head * head_count
    total_optimized_lot = total_optimized_per_head * head_count
    total_savings_lot = total_baseline_lot - total_optimized_lot

    dynamic_hard_violations = sum(row["optimizedHardViolations"] for row in feasible_rows)
    baseline_hard_violations = sum(row["baselineHardViolations"] for row in rows)
    economic_criteria = config.get("acceptanceCriteria", {}).get("economic", {})
    min_mean_savings_pct = float(economic_criteria.get("meanSavingsPctMin", 0.0))
    min_ci_low = float(economic_criteria.get("ciLowerBoundSavingsMxnMin", 0.0))
    require_all_days_feasible = bool(economic_criteria.get("requireAllDaysFeasible", True))
    max_optimized_hard_violations = int(economic_criteria.get("maxOptimizedHardViolations", 0))

    positive_mean_savings_pct = mean_savings_pct > min_mean_savings_pct
    ci_lower_bound_positive = ci_low > min_ci_low
    all_days_feasible = len(feasible_rows) == len(rows)
    hard_rules_met = dynamic_hard_violations <= max_optimized_hard_violations
    overall = (
        positive_mean_savings_pct
        and ci_lower_bound_positive
        and hard_rules_met
        and (all_days_feasible if require_all_days_feasible else True)
    )

    return {
        "runId": config["runId"],
        "daysConfigured": len(rows),
        "daysFeasible": len(feasible_rows),
        "daysInfeasible": len(rows) - len(feasible_rows),
        "averageBaselineCostMxnPerHeadDay": round(statistics.mean(baseline_costs), 6) if baseline_costs else 0.0,
        "averageOptimizedCostMxnPerHeadDay": round(statistics.mean(optimized_costs), 6) if optimized_costs else 0.0,
        "averageSavingsMxnPerHeadDay": round(mean_savings, 6),
        "medianSavingsMxnPerHeadDay": round(statistics.median(daily_diffs), 6) if daily_diffs else 0.0,
        "stdevSavingsMxnPerHeadDay": round(stdev_savings, 6),
        "averageSavingsPct": round(mean_savings_pct, 6),
        "savingsMean95Ci": {"low": ci_low, "high": ci_high},
        "totalBaselineCostMxnPerLot": round(total_baseline_lot, 2),
        "totalOptimizedCostMxnPerLot": round(total_optimized_lot, 2),
        "totalSavingsMxnPerLot": round(total_savings_lot, 2),
        "baselineHardConstraintViolations": baseline_hard_violations,
        "optimizedHardConstraintViolations": dynamic_hard_violations,
        "baselineDescription": str(config.get("baselineDescription", "")),
        "acceptance": {
            "meanSavingsPctPositive": positive_mean_savings_pct,
            "savingsMean95CiAboveZero": ci_lower_bound_positive,
            "allDaysFeasible": all_days_feasible,
            "zeroOptimizedHardViolations": hard_rules_met,
            "overall": overall,
        },
    }


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "dayIndex",
                "date",
                "baselineCostMxnPerHeadDay",
                "optimizedCostMxnPerHeadDay",
                "dailySavingsMxnPerHead",
                "dailySavingsPct",
                "baselineHardViolations",
                "optimizedHardViolations",
                "optimizedFeasible",
                "solverRuntimeMs",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def write_markdown(path: Path, summary: dict[str, Any]) -> None:
    lines = [
        "# Experimento A - Backtesting economico",
        "",
        f"- Corrida: `{summary['runId']}`",
        f"- Dias evaluados: {summary['daysConfigured']}",
        f"- Dias factibles: {summary['daysFeasible']}",
        f"- Dias infeasible: {summary['daysInfeasible']}",
        f"- Costo baseline promedio: {summary['averageBaselineCostMxnPerHeadDay']:.2f} MXN/cabeza/dia",
        f"- Costo optimizado promedio: {summary['averageOptimizedCostMxnPerHeadDay']:.2f} MXN/cabeza/dia",
        f"- Ahorro promedio: {summary['averageSavingsMxnPerHeadDay']:.2f} MXN/cabeza/dia ({summary['averageSavingsPct']:.2f}%)",
        f"- IC 95% del ahorro medio: [{summary['savingsMean95Ci']['low']:.2f}, {summary['savingsMean95Ci']['high']:.2f}] MXN/cabeza/dia",
        f"- Costo total baseline por lote: {summary['totalBaselineCostMxnPerLot']:.2f} MXN",
        f"- Costo total optimizado por lote: {summary['totalOptimizedCostMxnPerLot']:.2f} MXN",
        f"- Ahorro total del lote: {summary['totalSavingsMxnPerLot']:.2f} MXN",
        f"- Violaciones duras baseline: {summary['baselineHardConstraintViolations']}",
        f"- Violaciones duras optimizado: {summary['optimizedHardConstraintViolations']}",
        "",
        "## Baseline usado",
        "",
        f"- {summary['baselineDescription']}",
        "",
        "## Criterios de aceptacion",
        "",
        f"- Ahorro medio porcentual positivo: {'SI' if summary['acceptance']['meanSavingsPctPositive'] else 'NO'}",
        f"- Limite inferior del IC95% del ahorro por arriba de cero: {'SI' if summary['acceptance']['savingsMean95CiAboveZero'] else 'NO'}",
        f"- Todas las corridas factibles en el horizonte: {'SI' if summary['acceptance']['allDaysFeasible'] else 'NO'}",
        f"- Corridas optimizadas sin violaciones duras: {'SI' if summary['acceptance']['zeroOptimizedHardViolations'] else 'NO'}",
        f"- Veredicto global: {'PASS' if summary['acceptance']['overall'] else 'REVISAR'}",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the economic backtest for chapter 6.")
    parser.add_argument("--config", default="data/experiments/economic_backtest_config.json")
    parser.add_argument("--price-series", default="data/experiments/economic_price_series_90d.json")
    parser.add_argument("--compute-url", default="http://localhost:8000")
    parser.add_argument("--output-dir", default="data/experiments/reports/latest")
    parser.add_argument("--timeout-seconds", type=int, default=20)
    parser.add_argument("--limit-days", type=int, default=0, help="Optional limit for smoke runs.")
    args = parser.parse_args()

    config = load_json(args.config)
    price_series = load_json(args.price_series)
    ensure_compute_health(args.compute_url, args.timeout_seconds)

    days = list(price_series["days"])
    if args.limit_days > 0:
        days = days[: args.limit_days]

    rows = []
    for day in days:
        optimize_request = build_optimize_request(config, day["prices"])
        optimized = post_json(f"{args.compute_url.rstrip('/')}/v1/optimize", optimize_request, args.timeout_seconds)
        baseline = evaluate_baseline(config, day["prices"])
        optimized_cost = float(optimized.get("totalCostMxnPerHeadDay", 0.0)) if optimized.get("feasible") else 0.0
        savings = baseline["costMxnPerHeadDay"] - optimized_cost if optimized.get("feasible") else 0.0
        savings_pct = (savings / baseline["costMxnPerHeadDay"] * 100.0) if baseline["costMxnPerHeadDay"] else 0.0
        rows.append(
            {
                "dayIndex": day["dayIndex"],
                "date": day["date"],
                "baselineCostMxnPerHeadDay": round(float(baseline["costMxnPerHeadDay"]), 6),
                "optimizedCostMxnPerHeadDay": round(optimized_cost, 6),
                "dailySavingsMxnPerHead": round(float(savings), 6),
                "dailySavingsPct": round(float(savings_pct), 6),
                "baselineHardViolations": int(baseline["hardViolations"]),
                "optimizedHardViolations": sum(1 for item in optimized.get("constraintsReport", []) if not item.get("met", False)),
                "optimizedFeasible": bool(optimized.get("feasible", False)),
                "solverRuntimeMs": int(optimized.get("solverMeta", {}).get("runtimeMs", 0)),
            }
        )

    summary = build_summary(rows, config)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    report = {
        "metadata": {
            "config": args.config,
            "priceSeries": args.price_series,
            "computeUrl": args.compute_url,
            "limitDays": args.limit_days or len(days),
        },
        "summary": summary,
        "rows": rows,
    }
    (output_dir / "economic_backtest.json").write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    write_csv(output_dir / "economic_backtest.csv", rows)
    write_markdown(output_dir / "economic_backtest.md", summary)

    print(json.dumps(summary, indent=2, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
