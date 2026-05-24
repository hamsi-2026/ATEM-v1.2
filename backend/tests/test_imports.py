from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import Workbook

from backend.app.main import app


def test_health() -> None:
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}


def test_xlsx_import_creates_trainer() -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["name", "region", "country", "languages", "skills", "industries", "bandwidth"])
    sheet.append(["Test Trainer", "APAC", "Singapore", "English", "AI governance:5", "Retail", "Low"])
    payload = BytesIO()
    workbook.save(payload)
    payload.seek(0)

    with TestClient(app) as client:
        response = client.post(
            "/imports/trainers",
            files={"file": ("trainers.xlsx", payload.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["error_count"] == 0
    assert body["created_count"] + body["updated_count"] >= 1
