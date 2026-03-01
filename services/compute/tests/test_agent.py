from fastapi.testclient import TestClient

from app.main import app


def test_agent_respond_why_mode_returns_trace_and_citations() -> None:
    client = TestClient(app)

    payload = {
        "sessionId": "sess-1",
        "message": "por que se limito la pollinaza?",
        "mode": "WHY",
        "context": {
            "dietRunId": "run-1",
            "animalProfile": {
                "intakeDmKgPerDay": 10.2,
                "constraints": [
                    {"code": "CP", "min": 0.12, "max": 0.18, "unit": "fraction_dm"}
                ],
            },
            "currentMix": [
                {
                    "ingredientId": "pollinaza",
                    "kgAsFedPerHeadDay": 0.8,
                    "kgDmPerHeadDay": 0.68,
                    "pctDm": 6.5,
                }
            ],
            "constraintsReport": [
                {
                    "code": "CP",
                    "target": ">= 0.12 fraction_dm",
                    "actual": 0.13,
                    "met": True,
                    "slack": 0.01,
                }
            ],
            "totalCostMxnPerHeadDay": 52.4,
            "ingredients": [],
        },
        "options": {"topK": 3, "maxToolCalls": 3},
    }

    response = client.post("/v1/agent/respond", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "WHY"
    assert len(body["toolCalls"]) >= 1
    assert "confidence" in body
    assert "answer" in body
