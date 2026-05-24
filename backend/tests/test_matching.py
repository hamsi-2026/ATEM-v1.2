from fastapi.testclient import TestClient

from backend.app.main import app


def test_match_endpoint_returns_results() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/match",
            json={
                "topic": "AI governance",
                "meeting_type": "Intro call",
                "industry": "Retail",
                "region": "SG",
                "language": "English",
            },
        )

    assert response.status_code == 200
    assert "results" in response.json()
