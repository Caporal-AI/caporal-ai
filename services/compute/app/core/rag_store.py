from __future__ import annotations

from dataclasses import dataclass
import json
import re
import time

import psycopg

from app.core.embeddings import embed_text, embedding_to_vector_literal
from app.core.rag_seed_data import SEED_RAG_DOCUMENTS
from app.core.settings import settings


@dataclass
class RetrievedDocument:
    doc_id: str
    title: str
    snippet: str
    score: float


@dataclass
class RetrievedChunk:
    chunk_id: str
    source_id: str
    source_title: str
    snippet: str
    score_vector: float
    score_lexical: float
    score_hybrid: float
    metadata: dict[str, str | float | int | bool | None]


_TOKEN_RE = re.compile(r"[a-z0-9áéíóúñü]+")


def initialize_rag_store() -> None:
    for attempt in range(1, 16):
        try:
            _initialize_schema()
            seed_default_documents()
            return
        except psycopg.Error:
            if attempt == 15:
                raise
            time.sleep(2)


def _initialize_schema() -> None:
    with psycopg.connect(settings.dsn) as connection:
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS rag_documents (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    title varchar(180) NOT NULL UNIQUE,
                    content text NOT NULL,
                    snippet varchar(2000),
                    embedding vector(64) NOT NULL,
                    created_at timestamptz NOT NULL DEFAULT now()
                );
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding
                ON rag_documents USING ivfflat (embedding vector_l2_ops) WITH (lists = 16);
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS rag_sources (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    title varchar(240) NOT NULL UNIQUE,
                    content text NOT NULL,
                    source_type varchar(80) NOT NULL DEFAULT 'technical_note',
                    region varchar(80),
                    published_on date,
                    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
                    created_at timestamptz NOT NULL DEFAULT now()
                );
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS rag_chunks (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    source_id uuid NOT NULL REFERENCES rag_sources(id) ON DELETE CASCADE,
                    chunk_index integer NOT NULL,
                    chunk_text text NOT NULL,
                    token_count integer NOT NULL DEFAULT 0,
                    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
                    embedding vector(64) NOT NULL,
                    created_at timestamptz NOT NULL DEFAULT now(),
                    UNIQUE(source_id, chunk_index)
                );
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding
                ON rag_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 24);
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS rag_eval_runs (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    run_name varchar(160) NOT NULL,
                    result_json jsonb NOT NULL,
                    created_at timestamptz NOT NULL DEFAULT now()
                );
                """
            )
        connection.commit()


def seed_default_documents() -> None:
    with psycopg.connect(settings.dsn) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT count(*) FROM rag_documents;")
            row = cursor.fetchone()
            count = int(row[0]) if row else 0

            if count >= 20:
                return

            for document in SEED_RAG_DOCUMENTS:
                embedding = embedding_to_vector_literal(embed_text(document["content"]))
                snippet = document["content"][:320]
                cursor.execute(
                    """
                    INSERT INTO rag_documents (title, content, snippet, embedding)
                    VALUES (%s, %s, %s, %s::vector)
                    ON CONFLICT (title)
                    DO UPDATE SET content = EXCLUDED.content,
                                  snippet = EXCLUDED.snippet,
                                  embedding = EXCLUDED.embedding;
                    """,
                    (document["title"], document["content"], snippet, embedding),
                )
                source_id = _upsert_source(
                    cursor=cursor,
                    title=document["title"],
                    content=document["content"],
                    source_type="technical_note",
                    region="MX",
                    metadata={"topic": _guess_topic(document["title"], document["content"])},
                )
                _replace_chunks_for_source(
                    cursor=cursor,
                    source_id=source_id,
                    content=document["content"],
                    metadata={"topic": _guess_topic(document["title"], document["content"])},
                )
        connection.commit()


def retrieve_similar_documents(question: str, top_k: int) -> list[RetrievedDocument]:
    top_k = max(1, min(top_k, 10))
    query_vector = embedding_to_vector_literal(embed_text(question))

    with psycopg.connect(settings.dsn) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                  id::text,
                  title,
                  COALESCE(snippet, substring(content from 1 for 280)) AS snippet,
                  (1 - (embedding <=> %s::vector))::float8 AS score
                FROM rag_documents
                ORDER BY embedding <=> %s::vector
                LIMIT %s;
                """,
                (query_vector, query_vector, top_k),
            )
            rows = cursor.fetchall()

    return [
        RetrievedDocument(
            doc_id=str(row[0]),
            title=str(row[1]),
            snippet=str(row[2]),
            score=float(row[3]),
        )
        for row in rows
    ]


def upsert_documents(documents: list[dict[str, str]]) -> int:
    inserted = 0

    with psycopg.connect(settings.dsn) as connection:
        with connection.cursor() as cursor:
            for document in documents:
                content = document["content"]
                title = document["title"]
                snippet = document.get("snippet") or content[:320]
                embedding = embedding_to_vector_literal(embed_text(content))
                cursor.execute(
                    """
                    INSERT INTO rag_documents (title, content, snippet, embedding)
                    VALUES (%s, %s, %s, %s::vector)
                    ON CONFLICT (title)
                    DO UPDATE SET content = EXCLUDED.content,
                                  snippet = EXCLUDED.snippet,
                                  embedding = EXCLUDED.embedding;
                    """,
                    (title, content, snippet, embedding),
                )
                source_id = _upsert_source(
                    cursor=cursor,
                    title=title,
                    content=content,
                    source_type=document.get("sourceType") or "technical_note",
                    region=document.get("region") or "MX",
                    metadata={"topic": document.get("topic") or _guess_topic(title, content)},
                )
                _replace_chunks_for_source(
                    cursor=cursor,
                    source_id=source_id,
                    content=content,
                    metadata={"topic": document.get("topic") or _guess_topic(title, content)},
                )
                inserted += 1
        connection.commit()

    return inserted


def retrieve_enriched_chunks(
    question: str,
    top_k: int,
    filters: dict[str, str] | None = None,
) -> list[RetrievedChunk]:
    top_k = max(1, min(top_k, 20))
    candidate_limit = max(top_k * 6, 12)
    query_vector = embedding_to_vector_literal(embed_text(question))
    filters = filters or {}

    clauses = []
    params: list[object] = [query_vector]

    if filters.get("region"):
        clauses.append("s.region = %s")
        params.append(filters["region"])
    if filters.get("sourceType"):
        clauses.append("s.source_type = %s")
        params.append(filters["sourceType"])
    if filters.get("topic"):
        clauses.append("COALESCE(c.metadata_json->>'topic', '') = %s")
        params.append(filters["topic"])

    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    with psycopg.connect(settings.dsn) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT
                  c.id::text AS chunk_id,
                  s.id::text AS source_id,
                  s.title AS source_title,
                  substring(c.chunk_text from 1 for 420) AS snippet,
                  c.chunk_text,
                  c.metadata_json::text,
                  (1 - (c.embedding <=> %s::vector))::float8 AS score_vector
                FROM rag_chunks c
                JOIN rag_sources s ON s.id = c.source_id
                {where_sql}
                ORDER BY c.embedding <=> %s::vector
                LIMIT %s;
                """,
                [*params, query_vector, candidate_limit],
            )
            rows = cursor.fetchall()

    question_tokens = _tokens(question)
    ranked: list[RetrievedChunk] = []
    for row in rows:
        chunk_id = str(row[0])
        source_id = str(row[1])
        source_title = str(row[2])
        snippet = str(row[3])
        full_chunk = str(row[4])
        metadata_raw = str(row[5] or "{}")
        score_vector = float(row[6])
        score_lexical = _lexical_overlap(question_tokens, _tokens(full_chunk))
        score_hybrid = (0.75 * score_vector) + (0.25 * score_lexical)
        ranked.append(
            RetrievedChunk(
                chunk_id=chunk_id,
                source_id=source_id,
                source_title=source_title,
                snippet=snippet,
                score_vector=score_vector,
                score_lexical=score_lexical,
                score_hybrid=score_hybrid,
                metadata=json.loads(metadata_raw) if metadata_raw else {},
            )
        )

    ranked.sort(key=lambda item: item.score_hybrid, reverse=True)
    return ranked[:top_k]


def evaluate_retrieval(
    run_name: str,
    scenarios: list[dict[str, object]],
) -> dict[str, object]:
    rows: list[dict[str, object]] = []

    for scenario in scenarios:
        question = str(scenario.get("question", ""))
        expected_keywords = [str(item).lower() for item in scenario.get("expectedKeywords", [])]
        requires_citation = bool(scenario.get("requiresCitation", True))
        retrieved = retrieve_enriched_chunks(question, top_k=5, filters={})
        has_citation = len(retrieved) > 0
        grounded = bool(retrieved and retrieved[0].score_hybrid >= 0.28)
        leaked_numeric = bool(
            requires_citation
            and re.search(r"\b\d+(\.\d+)?\s*(kg|%|porcentaje)\b", question.lower())
            and not has_citation
        )

        keyword_hits = 0
        if expected_keywords and retrieved:
            corpus = " ".join(item.snippet.lower() for item in retrieved)
            keyword_hits = sum(1 for token in expected_keywords if token in corpus)

        rows.append(
            {
                "id": str(scenario.get("id", f"row-{len(rows) + 1}")),
                "retrieved": len(retrieved),
                "hasCitation": has_citation,
                "grounded": grounded if not expected_keywords else grounded and keyword_hits > 0,
                "leakedNumeric": leaked_numeric,
                "topSourceTitle": retrieved[0].source_title if retrieved else None,
            }
        )

    total = len(rows)
    citation_coverage = (
        sum(1 for row in rows if bool(row["hasCitation"])) / total if total else 0.0
    )
    grounded_rate = (
        sum(1 for row in rows if bool(row["grounded"])) / total if total else 0.0
    )
    leakage_rate = (
        sum(1 for row in rows if bool(row["leakedNumeric"])) / total if total else 0.0
    )

    result = {
        "runName": run_name,
        "summary": {
            "totalScenarios": total,
            "citationCoverageTechnical": round(citation_coverage, 4),
            "groundedResponseRate": round(grounded_rate, 4),
            "unsafeNumericLeakageRate": round(leakage_rate, 4),
        },
        "rows": rows,
    }

    with psycopg.connect(settings.dsn) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO rag_eval_runs (run_name, result_json)
                VALUES (%s, %s::jsonb);
                """,
                (run_name, json.dumps(result)),
            )
        connection.commit()

    return result


def _upsert_source(
    *,
    cursor,
    title: str,
    content: str,
    source_type: str,
    region: str,
    metadata: dict[str, object],
) -> str:
    cursor.execute(
        """
        INSERT INTO rag_sources (title, content, source_type, region, metadata_json)
        VALUES (%s, %s, %s, %s, %s::jsonb)
        ON CONFLICT (title)
        DO UPDATE SET content = EXCLUDED.content,
                      source_type = EXCLUDED.source_type,
                      region = EXCLUDED.region,
                      metadata_json = EXCLUDED.metadata_json
        RETURNING id::text;
        """,
        (title, content, source_type, region, json.dumps(metadata)),
    )
    row = cursor.fetchone()
    return str(row[0])


def _replace_chunks_for_source(
    *,
    cursor,
    source_id: str,
    content: str,
    metadata: dict[str, object],
) -> None:
    chunks = _chunk_text(content)
    cursor.execute("DELETE FROM rag_chunks WHERE source_id = %s::uuid", (source_id,))

    for chunk_index, chunk in enumerate(chunks):
        embedding = embedding_to_vector_literal(embed_text(chunk))
        token_count = len(_tokens(chunk))
        cursor.execute(
            """
            INSERT INTO rag_chunks (
                source_id, chunk_index, chunk_text, token_count, metadata_json, embedding
            )
            VALUES (%s::uuid, %s, %s, %s, %s::jsonb, %s::vector);
            """,
            (
                source_id,
                chunk_index,
                chunk,
                token_count,
                json.dumps(metadata),
                embedding,
            ),
        )


def _chunk_text(content: str, chunk_size: int = 520, overlap: int = 80) -> list[str]:
    normalized = " ".join(content.split())
    if len(normalized) <= chunk_size:
        return [normalized]

    chunks: list[str] = []
    start = 0
    length = len(normalized)
    while start < length:
        end = min(length, start + chunk_size)
        if end < length:
            split = normalized.rfind(" ", start + 180, end)
            if split > start:
                end = split
        piece = normalized[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= length:
            break
        start = max(0, end - overlap)
    return chunks


def _tokens(text: str) -> set[str]:
    return {token for token in _TOKEN_RE.findall(text.lower()) if len(token) > 2}


def _lexical_overlap(question_tokens: set[str], chunk_tokens: set[str]) -> float:
    if not question_tokens:
        return 0.0
    intersection = len(question_tokens.intersection(chunk_tokens))
    return float(intersection / max(len(question_tokens), 1))


def _guess_topic(title: str, content: str) -> str:
    raw = f"{title} {content}".lower()
    if "acidosis" in raw or "rumen" in raw:
        return "salud_ruminal"
    if "precio" in raw or "costo" in raw or "margen" in raw:
        return "economia"
    if "fibra" in raw:
        return "fibra"
    if "proteina" in raw or "urea" in raw:
        return "proteina"
    return "general"
