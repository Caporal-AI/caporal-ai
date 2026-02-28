from __future__ import annotations

import hashlib
import re

import numpy as np

EMBEDDING_DIM = 64
_TOKEN_RE = re.compile(r"[a-zA-Z0-9áéíóúñü]+")


def embed_text(text: str) -> list[float]:
    vector = np.zeros(EMBEDDING_DIM, dtype=float)
    tokens = _TOKEN_RE.findall(text.lower())

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:2], byteorder="big") % EMBEDDING_DIM
        sign = 1 if digest[2] % 2 == 0 else -1
        weight = 1.0 + (digest[3] / 255.0)
        vector[idx] += sign * weight

    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm

    return [float(value) for value in vector]


def embedding_to_vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(f"{item:.8f}" for item in embedding) + "]"
