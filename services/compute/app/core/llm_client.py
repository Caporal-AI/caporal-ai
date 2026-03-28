from __future__ import annotations

import os
from typing import Any


def render_with_openai(
    *,
    mode: str,
    user_message: str,
    base_answer: str,
    citations: list[dict[str, Any]],
    llm_mode: str = "AUTO",
) -> str:
    config = _resolve_llm_config(llm_mode)
    if not config:
        return base_answer

    model = config["model"]
    try:
        from openai import OpenAI
    except Exception:
        return base_answer

    client_kwargs: dict[str, str] = {"api_key": config["api_key"]}
    if config["base_url"]:
        client_kwargs["base_url"] = config["base_url"]
    client = OpenAI(**client_kwargs)

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
        text = _render_with_responses(client=client, model=model, prompt=prompt)
        return text if text else base_answer
    except Exception:
        try:
            text = _render_with_chat_completions(client=client, model=model, prompt=prompt)
            return text if text else base_answer
        except Exception:
            return base_answer


def _resolve_llm_config(llm_mode: str) -> dict[str, str] | None:
    mode = (llm_mode or "AUTO").strip().upper()
    if mode == "OFF":
        return None

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
    openai_base = os.getenv("OPENAI_BASE_URL", "").strip()

    local_base = os.getenv("LOCAL_LLM_BASE_URL", "").strip() or openai_base
    local_model = os.getenv("LOCAL_LLM_MODEL", "").strip() or openai_model
    local_key = os.getenv("LOCAL_LLM_API_KEY", "").strip() or openai_key or "local-dev"

    if mode == "OPENAI":
        if not openai_key:
            return None
        return {"api_key": openai_key, "model": openai_model, "base_url": ""}

    if mode == "LOCAL":
        if not local_base:
            return None
        return {"api_key": local_key, "model": local_model, "base_url": local_base}

    # AUTO:
    # 1) Use local compatible endpoint when configured.
    # 2) Fall back to official OpenAI when key exists.
    if local_base:
        return {"api_key": local_key, "model": local_model, "base_url": local_base}
    if openai_key:
        return {"api_key": openai_key, "model": openai_model, "base_url": ""}
    return None


def _render_with_responses(*, client: Any, model: str, prompt: str) -> str:
    completion = client.responses.create(
        model=model,
        input=prompt,
        temperature=0.2,
        max_output_tokens=280,
    )
    text = getattr(completion, "output_text", "") or ""
    return text.strip()


def _render_with_chat_completions(*, client: Any, model: str, prompt: str) -> str:
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        temperature=0.2,
        max_tokens=280,
    )
    choices = getattr(completion, "choices", None) or []
    if not choices:
        return ""

    content = getattr(choices[0].message, "content", "")
    if isinstance(content, list):
        parts = [item.get("text", "") for item in content if isinstance(item, dict)]
        return " ".join(part for part in parts if part).strip()
    if isinstance(content, str):
        return content.strip()
    return ""
