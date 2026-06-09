from fastapi.testclient import TestClient

from backend.app.main import app


def test_agent_query_returns_plan_and_matches_without_llm() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/agent/query",
            json={
                "query": "Find a trainer for AI governance workshop in Singapore for retail",
                "use_llm": False,
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert "match_trainers" in payload["selected_tools"]
    assert payload["used_llm"] is False
    assert payload["inferred_request"]["topic"]
    assert payload["match"] is not None
    assert "steps" in payload["plan"]


def test_agent_query_can_include_coverage_tool() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/agent/query",
            json={
                "query": "Show coverage gaps for AI governance in SG",
                "use_llm": False,
                "include_coverage": True,
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert "get_coverage_summary" in payload["selected_tools"]
    assert payload["coverage"] is not None
