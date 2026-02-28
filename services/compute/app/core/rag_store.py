from __future__ import annotations

from dataclasses import dataclass
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
                inserted += 1
        connection.commit()

    return inserted
