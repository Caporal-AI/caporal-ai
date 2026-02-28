from __future__ import annotations

from fastapi import APIRouter

from app.core.assistant import classify_safety_flags, generate_answer
from app.core.rag_store import retrieve_similar_documents, upsert_documents
from app.models.contracts import AskRequest, AskResponse, Citation, RagDocumentInput

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
def ask(payload: AskRequest) -> AskResponse:
    top_k_raw = payload.retrievalOptions.get("topK", 3)
    top_k = int(top_k_raw) if isinstance(top_k_raw, (int, float, str)) else 3

    try:
        docs = retrieve_similar_documents(payload.question, top_k)
    except Exception:
        docs = []

    citations = [
        Citation(
            docId=item.doc_id,
            title=item.title,
            snippet=item.snippet,
            score=round(item.score, 6),
        )
        for item in docs
    ]

    if not citations:
        citations = [
            Citation(
                docId="guardrail-fallback",
                title="Guardrail de formulacion",
                snippet="Los ajustes numericos solo se autorizan via solver LP con restricciones duras.",
                score=0.01,
            )
        ]

    safety_flags = classify_safety_flags(payload.question, payload.dietContext)

    answer = generate_answer(
        question=payload.question,
        context=payload.dietContext,
        citations_summary=[citation.title for citation in citations],
        safety_flags=safety_flags,
    )

    return AskResponse(
        answer=answer,
        citations=citations,
        safetyFlags=safety_flags,
    )


@router.post("/rag/documents/upsert")
def upsert_rag_documents(documents: list[RagDocumentInput]) -> dict[str, int]:
    inserted = upsert_documents([doc.model_dump() for doc in documents])
    return {"inserted": inserted}
