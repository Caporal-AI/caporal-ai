from __future__ import annotations

import os
from typing import Any


def render_with_openai(
    *,
    mode: str,
    user_message: str,
    base_answer: str,
    citations: list[dict[str, Any]],
) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return base_answer

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    try:
        from openai import OpenAI
    except Exception:
        return base_answer

    client = OpenAI(api_key=api_key)

    citations_text = "; ".join(item.get("sourceTitle", "fuente") for item in citations[:4])
    prompt = (
        "Eres un copiloto nutricional para engorda bovina. "
        "Reescribe la respuesta en español claro para usuario no experto. "
        "Nunca inventes cifras; si hay ajuste numérico debe venir del solver. "
        f"Modo: {mode}. Pregunta usuario: {user_message}. "
        f"Respuesta base: {base_answer}. "
        f"Fuentes disponibles: {citations_text}."
    )

    try:
        completion = client.responses.create(
            model=model,
            input=prompt,
            temperature=0.2,
            max_output_tokens=280,
        )
        text = completion.output_text.strip()
        return text if text else base_answer
    except Exception:
        return base_answer
