from fastapi.testclient import TestClient

from app.main import app


def test_projection_endpoint_returns_projection_payload() -> None:
    client = TestClient(app)

    payload = {
        "batchContext": {
            "batchId": "batch-1",
            "breed": "Cruzado",
            "headCount": 120,
            "currentAverageWeightKg": 340,
            "targetSaleWeightKg": 520,
            "daysOnFeed": 38,
            "climate": {
                "avgTemperatureC": 31,
                "humidityPct": 48,
            },
        },
        "horizonDays": 56,
        "dietCostMxnPerHeadDay": 52.5,
        "salePriceMxnPerKg": 55,
        "purchasePriceMxnPerKg": 43,
        "otherCostMxnPerHead": 350,
        "historicalWeighIns": [
            {"measuredAt": "2026-01-20", "averageWeightKg": 300},
            {"measuredAt": "2026-02-03", "averageWeightKg": 319},
            {"measuredAt": "2026-02-17", "averageWeightKg": 338},
        ],
        "dietMix": [
            {
                "ingredientId": "corn",
                "kgAsFedPerHeadDay": 5.0,
                "kgDmPerHeadDay": 4.4,
                "pctDm": 43.1,
            }
        ],
    }

    response = client.post("/v1/project", json=payload)

    assert response.status_code == 200
    body = response.json()

    assert body["modelType"] in ["xgboost", "linear_fallback"]
    assert body["horizonDays"] == 56
    assert body["projectedDailyGainKg"] > 0
    assert len(body["projectedWeightSeries"]) == 57
    assert "economicProjection" in body
    assert "sellSignal" in body
