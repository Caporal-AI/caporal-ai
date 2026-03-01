from fastapi import APIRouter

from app.core.rag_store import evaluate_retrieval, repair_rag_index, retrieve_enriched_chunks
from app.models.contracts import (
    RagChunkResult,
    RagEvaluateRequest,
    RagEvaluateResponse,
    RagEvalRow,
    RagRetrieveRequest,
    RagRetrieveResponse,
)

router = APIRouter()


@router.post("/rag/retrieve", response_model=RagRetrieveResponse)
def rag_retrieve(payload: RagRetrieveRequest) -> RagRetrieveResponse:
    chunks = retrieve_enriched_chunks(
        question=payload.question,
        top_k=payload.topK,
        filters=payload.filters,
    )
    return RagRetrieveResponse(
        question=payload.question,
        chunks=[
            RagChunkResult(
                sourceId=item.source_id,
                chunkId=item.chunk_id,
                sourceTitle=item.source_title,
                snippet=item.snippet,
                scoreVector=round(item.score_vector, 6),
                scoreLexical=round(item.score_lexical, 6),
                scoreHybrid=round(item.score_hybrid, 6),
                metadata=item.metadata,
            )
            for item in chunks
        ],
    )


@router.post("/rag/evaluate", response_model=RagEvaluateResponse)
def rag_evaluate(payload: RagEvaluateRequest) -> RagEvaluateResponse:
    result = evaluate_retrieval(
        run_name=payload.runName,
        scenarios=[scenario.model_dump() for scenario in payload.scenarios],
    )

    rows = [
        RagEvalRow(
            id=str(item["id"]),
            retrieved=int(item["retrieved"]),
            hasCitation=bool(item["hasCitation"]),
            grounded=bool(item["grounded"]),
            leakedNumeric=bool(item["leakedNumeric"]),
            topSourceTitle=(
                str(item["topSourceTitle"]) if item.get("topSourceTitle") is not None else None
            ),
        )
        for item in result.get("rows", [])
    ]

    return RagEvaluateResponse(
        runName=str(result["runName"]),
        summary=dict(result.get("summary", {})),
        rows=rows,
    )


@router.post("/rag/reindex")
def rag_reindex() -> dict[str, int | bool]:
    return repair_rag_index(force=True)
