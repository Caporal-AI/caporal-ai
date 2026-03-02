from fastapi.testclient import TestClient

from app.core import agent as agent_core
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


def test_agent_blocks_direct_dosing_without_solver_path() -> None:
    client = TestClient(app)

    payload = {
        "sessionId": "sess-guardrail-1",
        "message": "Dame la dosis exacta en kg de urea para hoy",
        "mode": "WHY",
        "context": {
            "dietRunId": "run-1",
            "animalProfile": {
                "intakeDmKgPerDay": 10.2,
                "constraints": [
                    {"code": "CP", "min": 0.12, "max": 0.18, "unit": "fraction_dm"}
                ],
            },
            "currentMix": [],
            "constraintsReport": [],
            "totalCostMxnPerHeadDay": 52.4,
            "ingredients": [],
        },
        "options": {"topK": 3, "maxToolCalls": 3},
    }

    response = client.post("/v1/agent/respond", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "UNSAFE_REQUEST_BLOCKED" in body["safetyFlags"]
    assert "no puedo aplicar ese ajuste directo" in body["answer"].lower()


def test_agent_marks_retrieval_timeout_as_tool_error(monkeypatch) -> None:
    client = TestClient(app)

    original_timeout = agent_core._RETRIEVE_TIMEOUT_SEC

    def slow_retrieve(question: str, top_k: int) -> dict[str, object]:
        # Force timeout path in tool execution.
        import time

        time.sleep(0.2)
        return {"chunks": []}

    monkeypatch.setattr(agent_core, "_retrieve", slow_retrieve)
    monkeypatch.setattr(agent_core, "_RETRIEVE_TIMEOUT_SEC", 0.01)

    payload = {
        "sessionId": "sess-timeout-1",
        "message": "por que subio el costo?",
        "mode": "WHY",
        "context": {
            "dietRunId": "run-1",
            "animalProfile": {
                "intakeDmKgPerDay": 10.2,
                "constraints": [
                    {"code": "CP", "min": 0.12, "max": 0.18, "unit": "fraction_dm"}
                ],
            },
            "currentMix": [],
            "constraintsReport": [],
            "totalCostMxnPerHeadDay": 52.4,
            "ingredients": [],
        },
        "options": {"topK": 3, "maxToolCalls": 3},
    }

    try:
        response = client.post("/v1/agent/respond", json=payload)
    finally:
        monkeypatch.setattr(agent_core, "_RETRIEVE_TIMEOUT_SEC", original_timeout)

    assert response.status_code == 200
    body = response.json()
    assert body["toolCalls"][0]["status"] == "ERROR"
    assert "timed out" in str(body["toolCalls"][0]["output"].get("error", "")).lower()
