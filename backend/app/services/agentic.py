from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx
from sqlalchemy.orm import Session

from backend.app.schemas import (
    AgentExecutionStepOut,
    AgentPlanOut,
    AgentResponseOut,
    MatchRequestIn,
)
from backend.app.services.analytics import coverage_summary
from backend.app.services.matching import run_match
from backend.app.services.normalization import normalize_text
from backend.app.services.requirements import infer_requirement


def select_tools(query: str, include_coverage: bool) -> list[str]:
    lowered = query.lower()
    tools: list[str] = []

    if include_coverage or any(term in lowered for term in ("coverage", "capacity", "gap", "matrix")):
        tools.append("get_coverage_summary")

    if any(term in lowered for term in ("match", "trainer", "shortlist", "recommend", "find")) or not tools:
        tools.append("match_trainers")

    return tools


def llm_config() -> tuple[str | None, str, str]:
    api_key = os.getenv("ATEM_LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
    base_url = (os.getenv("ATEM_LLM_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("ATEM_LLM_MODEL") or "gpt-4o-mini"
    return api_key, base_url, model


def is_local_ollama(base_url: str) -> bool:
    lowered = base_url.lower()
    return "127.0.0.1:11434" in lowered or "localhost:11434" in lowered


def parse_json_object(raw_text: str) -> dict[str, Any] | None:
    raw_text = raw_text.strip()
    if not raw_text:
        return None

    try:
        parsed = json.loads(raw_text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", raw_text, flags=re.DOTALL)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


def normalize_match_request(payload: dict[str, Any], fallback_topic: str) -> MatchRequestIn:
    topic = normalize_text(payload.get("topic")) or fallback_topic
    meeting_type = normalize_text(payload.get("meeting_type")) or None
    industry = normalize_text(payload.get("industry")) or None
    region = normalize_text(payload.get("region")) or None
    language = normalize_text(payload.get("language")) or "English"
    seniority = normalize_text(payload.get("seniority")) or None
    stretch_mode = bool(payload.get("stretch_mode", False))

    return MatchRequestIn(
        request=normalize_text(payload.get("request")) or None,
        topic=topic,
        meeting_type=meeting_type,
        industry=industry,
        region=region,
        language=language,
        seniority=seniority,
        stretch_mode=stretch_mode,
    )


async def llm_infer_request(query: str, fallback: MatchRequestIn) -> tuple[MatchRequestIn | None, str | None]:
    api_key, base_url, model = llm_config()
    using_ollama = is_local_ollama(base_url)
    if not api_key and not using_ollama:
        return None, "LLM skipped: set ATEM_LLM_API_KEY (or OPENAI_API_KEY), or use local Ollama base URL."

    instruction = (
        "Extract structured matching fields from the user request. Return JSON only with keys: "
        "request, topic, meeting_type, industry, region, language, seniority, stretch_mode. "
        "If a value is unknown, return null. Do not include extra keys."
    )

    messages = [
        {"role": "system", "content": instruction},
        {"role": "user", "content": query},
    ]

    try:
        endpoint = f"{base_url}/chat/completions"
        headers: dict[str, str] = {"Content-Type": "application/json"}
        body: dict[str, Any]

        if using_ollama:
            endpoint = f"{base_url}/api/chat"
            body = {
                "model": model,
                "messages": messages,
                "stream": False,
                "options": {"temperature": 0},
            }
        else:
            headers["Authorization"] = f"Bearer {api_key}"
            body = {
                "model": model,
                "messages": messages,
                "temperature": 0,
            }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(endpoint, headers=headers, json=body)

            if using_ollama and response.status_code == 404:
                prompt = f"{instruction}\n\nUser request:\n{query}\n"
                response = await client.post(
                    f"{base_url}/api/generate",
                    headers=headers,
                    json={"model": model, "prompt": prompt, "stream": False, "options": {"temperature": 0}},
                )

        response.raise_for_status()
        payload = response.json()
        if using_ollama:
            content = payload.get("message", {}).get("content") or payload.get("response", "")
        else:
            content = payload["choices"][0]["message"]["content"]
        parsed = parse_json_object(content)
        if not parsed:
            return None, "LLM returned a non-JSON response; deterministic inference was used."
        merged = normalize_match_request(parsed, fallback.topic)
        if not merged.topic:
            merged.topic = fallback.topic
        return merged, None
    except Exception as exc:
        return None, f"LLM unavailable: {exc}"


def merge_requests(base: MatchRequestIn, override: MatchRequestIn | None) -> MatchRequestIn:
    if override is None:
        return base

    return MatchRequestIn(
        request=override.request or base.request,
        topic=override.topic or base.topic,
        meeting_type=override.meeting_type or base.meeting_type,
        industry=override.industry or base.industry,
        region=override.region or base.region,
        language=override.language or base.language,
        seniority=override.seniority or base.seniority,
        stretch_mode=override.stretch_mode or base.stretch_mode,
        weights=base.weights,
    )


async def run_agent_query(
    session: Session,
    *,
    query: str,
    use_llm: bool,
    include_coverage: bool,
) -> AgentResponseOut:
    normalized_query = normalize_text(query)
    selected_tools = select_tools(normalized_query, include_coverage)

    steps: list[AgentExecutionStepOut] = [
        AgentExecutionStepOut(step="Plan", detail="Build execution plan from user query."),
        AgentExecutionStepOut(
            step="Tool selection",
            detail=f"Selected tools: {', '.join(selected_tools)}",
        ),
    ]

    deterministic_request = infer_requirement(session, normalized_query)
    inferred_request = deterministic_request
    used_llm = False
    llm_error: str | None = None

    if use_llm:
        llm_request, llm_error = await llm_infer_request(normalized_query, deterministic_request)
        if llm_request is not None:
            inferred_request = merge_requests(deterministic_request, llm_request)
            used_llm = True
            steps.append(
                AgentExecutionStepOut(
                    step="Optional LLM extraction",
                    detail="Applied optional LLM field extraction and merged with deterministic inference.",
                    tool="llm_extract_fields",
                )
            )

    match = None
    coverage = None

    if "match_trainers" in selected_tools:
        match = run_match(session, inferred_request)
        steps.append(
            AgentExecutionStepOut(
                step="Execute matching",
                detail="Ran deterministic weighted matching.",
                tool="match_trainers",
            )
        )

    if "get_coverage_summary" in selected_tools:
        coverage = coverage_summary(session)
        steps.append(
            AgentExecutionStepOut(
                step="Fetch coverage",
                detail="Returned topic-by-region coverage summary.",
                tool="get_coverage_summary",
            )
        )

    plan = AgentPlanOut(goal="Respond with explainable trainer intelligence using deterministic services.", steps=steps)
    return AgentResponseOut(
        plan=plan,
        selected_tools=selected_tools,
        inferred_request=inferred_request,
        match=match,
        coverage=coverage,
        used_llm=used_llm,
        llm_error=llm_error,
    )
