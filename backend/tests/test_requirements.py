from io import BytesIO

from docx import Document
from fastapi.testclient import TestClient

from backend.app.main import app


def test_txt_requirement_compare_returns_inferred_request() -> None:
    text = "Need an AI Governance workshop for a manufacturing client in Singapore. English required."

    with TestClient(app) as client:
        response = client.post(
            "/requirements/compare",
            files={"file": ("requirement.txt", text.encode("utf-8"), "text/plain")},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["inferred_request"]["region"] == "SG"
    assert body["inferred_request"]["meeting_type"] == "Workshop"
    assert "results" in body["match"]


def test_docx_requirement_compare_returns_matches() -> None:
    document = Document()
    document.add_paragraph("Executive pitch needed for Cybersecurity in North America for a banking client.")
    payload = BytesIO()
    document.save(payload)
    payload.seek(0)

    with TestClient(app) as client:
        response = client.post(
            "/requirements/compare",
            files={
                "file": (
                    "requirement.docx",
                    payload.getvalue(),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["inferred_request"]["region"] == "NA"
    assert body["inferred_request"]["meeting_type"] == "Executive pitch"
