from fastapi.testclient import TestClient

from app.main import app


def test_rag_retrieve_returns_ranked_chunks() -> None:
    client = TestClient(app)
    response = client.post(
        "/v1/rag/retrieve",
        json={"question": "fibra y acidosis en engorda", "topK": 4},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["question"]
    assert isinstance(body["chunks"], list)


def test_rag_evaluate_returns_summary() -> None:
    client = TestClient(app)
    response = client.post(
        "/v1/rag/evaluate",
        json={
            "runName": "smoke-eval",
            "scenarios": [
                {
                    "id": "s1",
                    "question": "por que es importante la fibra en finalizacion?",
                    "requiresCitation": True,
                    "expectedKeywords": ["fibra"],
                }
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["runName"] == "smoke-eval"
    assert "summary" in body
    assert body["summary"]["totalScenarios"] == 1
