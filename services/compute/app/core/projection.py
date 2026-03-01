from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
import math

import numpy as np

from app.models.contracts import EconomicProjection, ProjectionRequest, ProjectionResponse, SellSignal

try:
    from xgboost import XGBRegressor
except Exception:  # pragma: no cover
    XGBRegressor = None


@dataclass
class _ModelResult:
    predicted_adg: float
    model_type: str
    warnings: list[str]


def project_batch_growth(payload: ProjectionRequest) -> ProjectionResponse:
    horizon_days = payload.horizonDays
    current_weight = payload.batchContext.currentAverageWeightKg

    model_result = _predict_daily_gain(payload)
    predicted_adg = max(0.2, min(2.2, model_result.predicted_adg))

    projected_weight_series = [
        {
            "day": float(day),
            "averageWeightKg": round(current_weight + predicted_adg * day, 3),
        }
        for day in range(horizon_days + 1)
    ]

    final_weight = projected_weight_series[-1]["averageWeightKg"]
    estimated_revenue = final_weight * payload.salePriceMxnPerKg
    feed_cost = payload.dietCostMxnPerHeadDay * horizon_days
    purchase_cost = current_weight * payload.purchasePriceMxnPerKg
    total_cost = purchase_cost + feed_cost + payload.otherCostMxnPerHead
    margin = estimated_revenue - total_cost

    kg_gain = max(final_weight - current_weight, 0.0001)
    economic_projection = EconomicProjection(
        estimatedRevenueMxnPerHead=round(estimated_revenue, 2),
        estimatedCostMxnPerHead=round(total_cost, 2),
        estimatedMarginMxnPerHead=round(margin, 2),
        costPerKgGainMxn=round(feed_cost / kg_gain, 4),
    )

    margin_series = _estimate_margin_series(
        current_weight=current_weight,
        adg=predicted_adg,
        horizon_days=horizon_days,
        sale_price=payload.salePriceMxnPerKg,
        purchase_price=payload.purchasePriceMxnPerKg,
        feed_cost_day=payload.dietCostMxnPerHeadDay,
        other_cost=payload.otherCostMxnPerHead,
    )
    sell_signal = _build_sell_signal(margin_series)

    confidence = _estimate_confidence(payload, model_result.model_type)

    return ProjectionResponse(
        modelType="xgboost" if model_result.model_type == "xgboost" else "linear_fallback",
        confidence=confidence,
        horizonDays=horizon_days,
        projectedDailyGainKg=round(predicted_adg, 4),
        projectedWeightSeries=projected_weight_series,
        economicProjection=economic_projection,
        sellSignal=sell_signal,
        warnings=model_result.warnings,
    )


def _predict_daily_gain(payload: ProjectionRequest) -> _ModelResult:
    warnings: list[str] = []

    features = np.array(
        [
            payload.batchContext.currentAverageWeightKg,
            payload.batchContext.headCount,
            payload.dietCostMxnPerHeadDay,
            payload.batchContext.daysOnFeed,
            (payload.batchContext.climate.avgTemperatureC if payload.batchContext.climate else 30.0),
            (payload.batchContext.climate.humidityPct if payload.batchContext.climate else 50.0),
            payload.batchContext.targetSaleWeightKg,
        ],
        dtype=float,
    )

    if XGBRegressor is not None:
        try:
            x_train, y_train = _synthetic_training_set()
            model = XGBRegressor(
                n_estimators=120,
                max_depth=4,
                learning_rate=0.08,
                subsample=0.9,
                colsample_bytree=0.9,
                objective="reg:squarederror",
                random_state=42,
            )
            model.fit(x_train, y_train)
            prediction = float(model.predict(features.reshape(1, -1))[0])
            return _ModelResult(predicted_adg=prediction, model_type="xgboost", warnings=warnings)
        except Exception as exc:  # pragma: no cover
            warnings.append(f"XGBoost unavailable at runtime: {exc}")

    # Linear fallback when xgboost is unavailable or fails.
    x_train, y_train = _synthetic_training_set()
    x_aug = np.hstack([x_train, np.ones((x_train.shape[0], 1))])
    coef, _, _, _ = np.linalg.lstsq(x_aug, y_train, rcond=None)
    predicted = float(np.dot(np.append(features, 1.0), coef))

    if XGBRegressor is None:
        warnings.append("xgboost no esta instalado; se usara el modelo lineal de respaldo.")

    return _ModelResult(predicted_adg=predicted, model_type="linear_fallback", warnings=warnings)


def _synthetic_training_set() -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed=42)
    samples = 240

    weight = rng.uniform(250, 550, size=samples)
    head_count = rng.uniform(40, 1000, size=samples)
    cost_day = rng.uniform(35, 95, size=samples)
    days_on_feed = rng.uniform(0, 240, size=samples)
    temp = rng.uniform(14, 42, size=samples)
    humidity = rng.uniform(15, 85, size=samples)
    target_weight = rng.uniform(450, 700, size=samples)

    x_train = np.column_stack(
        [weight, head_count, cost_day, days_on_feed, temp, humidity, target_weight]
    )

    target_delta = np.maximum(target_weight - weight, 5)
    base = 1.42 - 0.0016 * np.maximum(weight - 360, 0)
    heat_penalty = 0.017 * np.maximum(temp - 30, 0)
    cost_penalty = 0.003 * np.maximum(cost_day - 58, 0)
    stage_penalty = 0.0012 * np.maximum(days_on_feed - 140, 0)
    target_factor = np.minimum(target_delta / 220, 0.35)

    noise = rng.normal(0, 0.05, size=samples)
    y_train = np.clip(base - heat_penalty - cost_penalty - stage_penalty + target_factor + noise, 0.45, 1.95)

    return x_train.astype(float), y_train.astype(float)


def _estimate_margin_series(
    *,
    current_weight: float,
    adg: float,
    horizon_days: int,
    sale_price: float,
    purchase_price: float,
    feed_cost_day: float,
    other_cost: float,
) -> list[tuple[int, float]]:
    baseline_purchase = current_weight * purchase_price
    series: list[tuple[int, float]] = []

    for day in range(horizon_days + 1):
        weight = current_weight + adg * day
        revenue = weight * sale_price
        cost = baseline_purchase + feed_cost_day * day + other_cost
        margin = revenue - cost
        series.append((day, margin))

    return series


def _build_sell_signal(margin_series: list[tuple[int, float]]) -> SellSignal:
    if not margin_series:
        return SellSignal(
            shouldSell=False,
            recommendedDay=0,
            expectedMarginTrend="STABLE",
            reason="No hay datos suficientes para generar una proyeccion confiable.",
        )

    day_of_max, margin_max = max(margin_series, key=lambda item: item[1])
    _, margin_last = margin_series[-1]

    trend_slope = _trend(margin_series)
    if trend_slope > 5:
        trend = "UP"
    elif trend_slope < -5:
        trend = "DOWN"
    else:
        trend = "STABLE"

    should_sell = day_of_max < margin_series[-1][0] and margin_last < margin_max
    if should_sell and day_of_max == 0:
        reason = (
            "La proyeccion indica que el margen empieza a caer desde hoy; "
            "conviene vender hoy o lo antes posible."
        )
    elif should_sell:
        reason = (
            "El margen proyectado alcanza su punto maximo antes del horizonte; "
            "considera vender cerca del dia recomendado."
        )
    else:
        reason = "El margen proyectado se mantiene estable durante el horizonte seleccionado."

    return SellSignal(
        shouldSell=should_sell,
        recommendedDay=day_of_max,
        expectedMarginTrend=trend,
        reason=reason,
    )


def _trend(margin_series: list[tuple[int, float]]) -> float:
    if len(margin_series) < 3:
        return 0.0

    xs = np.array([point[0] for point in margin_series], dtype=float)
    ys = np.array([point[1] for point in margin_series], dtype=float)

    x_mean = float(np.mean(xs))
    y_mean = float(np.mean(ys))

    numerator = float(np.sum((xs - x_mean) * (ys - y_mean)))
    denominator = float(np.sum((xs - x_mean) ** 2))

    if math.isclose(denominator, 0.0):
        return 0.0

    return numerator / denominator


def _estimate_confidence(payload: ProjectionRequest, model_type: str) -> str:
    weigh_in_count = len(payload.historicalWeighIns)

    if model_type == "xgboost" and weigh_in_count >= 3:
        return "HIGH"

    if weigh_in_count >= 2:
        return "MEDIUM"

    return "LOW"


def parse_measured_date(raw_value: str) -> date:
    return datetime.fromisoformat(raw_value).date()
