# ATEM Deployment Options

ATEM has two deployable parts:

- React frontend: static files generated into `dist/`.
- FastAPI backend: Python API for imports, matching, coverage, requirements, and persistence.

SharePoint can host or embed the frontend, but it cannot run the FastAPI backend. Any SharePoint deployment still needs a backend hosted elsewhere.

## Shared Deployment Notes

Before deploying the frontend, point it at the deployed API:

```powershell
$env:VITE_API_BASE_URL="https://your-atem-api.example.com"
npm.cmd run build
```

The backend must allow the frontend origin in CORS. For production, update `backend/app/main.py` so `allow_origins` includes the final SharePoint or Azure Static Web Apps URL.

SQLite is fine for local MVP use. For production, prefer a managed database such as Azure SQL or PostgreSQL. If SQLite is used temporarily, ensure the host provides durable storage and backup.

## Option 1: SharePoint Frontend + Azure App Service Backend

Best when users should access ATEM from an existing Microsoft 365/SharePoint site.

Architecture:

- Frontend: built React files embedded or hosted from SharePoint.
- Backend: FastAPI on Azure App Service.
- Data: Azure SQL or another managed database.
- Authentication: Microsoft Entra ID can be added at the App Service or API layer.

Deployment outline:

1. Deploy the FastAPI backend to Azure App Service.
2. Set backend app settings for database connection and environment.
3. Configure CORS to allow the SharePoint site URL.
4. Build the frontend with `VITE_API_BASE_URL` pointing to the Azure API.
5. Upload or embed the built frontend in SharePoint.
6. Test import, match, coverage, and requirement upload from SharePoint.

Pros:

- Fits Microsoft 365 intranet usage.
- Good entry point for internal users.
- SharePoint can control page-level access.

Cons:

- SharePoint is not ideal as a modern static app host.
- Backend still needs separate Azure hosting.
- Extra care is needed for routing, script hosting, and tenant security rules.

## Option 2: Azure Static Web Apps + Azure App Service Backend

Best general-purpose deployment for the current architecture.

Architecture:

- Frontend: Azure Static Web Apps.
- Backend: FastAPI on Azure App Service or Azure Container Apps.
- Data: Azure SQL/PostgreSQL.
- Authentication: Azure Static Web Apps auth or Microsoft Entra ID.

Deployment outline:

1. Deploy the FastAPI backend to Azure App Service or Azure Container Apps.
2. Configure backend CORS for the Azure Static Web Apps URL.
3. Build the frontend with `VITE_API_BASE_URL` pointing to the backend.
4. Deploy `dist/` to Azure Static Web Apps.
5. Configure custom domain and authentication if needed.
6. Run smoke checks against `/health`, `/trainers`, `/match`, and `/analytics/coverage`.

Pros:

- Cleanest fit for a React frontend.
- Simple CI/CD path from a Git repository.
- Better static hosting behavior than SharePoint.

Cons:

- Users access a separate app URL unless embedded in SharePoint.
- Requires Azure resource setup.

## Option 3: Copilot Studio / Custom Connector Access

Best when users should interact with ATEM through a conversational agent.

Architecture:

- Backend: FastAPI deployed on Azure.
- Copilot Studio: agent with actions that call ATEM APIs.
- Connector: Power Platform custom connector or OpenAPI-described actions.
- Optional frontend: SharePoint or Azure Static Web Apps remains available for admin/import workflows.

Useful API actions:

- `POST /match` for trainer recommendations.
- `GET /trainers/{trainer_id}` for profile detail.
- `GET /analytics/coverage` for capability gaps.
- `POST /requirements/compare` for uploaded requirement documents.
- `GET /config/skill-catalog` for canonical topic lists.

Deployment outline:

1. Deploy the FastAPI backend to Azure.
2. Publish an OpenAPI description for the required ATEM endpoints.
3. Create a Power Platform custom connector or Copilot Studio action set.
4. Add authentication, usually Microsoft Entra ID or API Management policies.
5. Create Copilot topics/actions such as "Find a coach" or "Check coverage gaps".
6. Validate that Copilot responses include ATEM scores, reasons, and caveats.

Pros:

- Natural conversational access.
- Good fit for Microsoft 365 users.
- Can reuse the same backend service logic as the web app.

Cons:

- Requires connector/action design and tenant governance.
- File upload flows may need extra handling.
- Current ATEM is deterministic, not RAG-based, so Copilot should call APIs and report structured results rather than invent recommendations.

## Recommendation

For the next internal deployment, use Option 2 for the application itself and optionally embed/link it from SharePoint. Add Option 3 after the API is stable and stakeholders confirm the Copilot user journeys.

If SharePoint must be the primary entry point, use Option 1: SharePoint as the front door, Azure as the backend runtime.
