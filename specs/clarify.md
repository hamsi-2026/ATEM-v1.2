# Clarify

## Current Assumptions

- The Skills Lab Coach Profiling Form PDF is the source of truth for capability categories and skill names.
- The Excel sheet contains trainer responses to that form, with one trainer per row.
- Excel headers are used only to identify trainer fields and response columns.
- Excel headers must not create the official skills catalog.
- The importer should select the worksheet that best matches the trainer response export.
- Trainer names are unique enough for MVP import matching when no explicit trainer ID exists.
- The app is internal and desktop-first.
- SQLite is acceptable for MVP and local/internal usage.
- Current matching is deterministic and rule/weight-based, not RAG.
- Requirement uploads are used to infer structured match fields, not to generate LLM answers.

## Canonical Skill Catalog

The Topic/capability list must come from the Skills Lab Coach Profiling Form, grouped by the form categories:

- Software Engineering
- AI/ML
- Business Management
- Cloud
- IT Operations
- DevOps
- Project Management
- Data Analytics/Engineering
- Database Management
- Web Application
- Testing
- Other Programming Languages
- Soft Skills
- Additional Skills

Skill display names should be normalized for UI consistency while preserving acronyms and product names, for example:

- `AI Governance`
- `Cloud Modernisation`
- `Data Visualization With Power BI`
- `REST API`
- `PL-SQL`
- `C/C++`

If an uploaded Excel sheet contains a recognized form skill column, that column records the trainer's proficiency for that canonical skill. If the sheet contains an unrecognized numeric column, it should not become a skill unless it is explicitly added to the form catalog or captured through the `Additional Skills` free-text field.

## Required Excel Fields

Minimum useful columns:

- trainer name, e.g. `Name`, `Full Name`, or `Which Skills Lab Coach are you?`
- `region` or a location field that can be mapped to one of the supported regions
- at least one recognized skills-form capability response, or a non-empty `Additional Skills` response

Recommended columns:

- `country`
- `role` or `role_title`
- `seniority` or `seniority_level`
- `languages`
- `industries`
- `current_project`
- `project_status`
- `bandwidth`
- `meeting_comfort`
- `client_facing_desire`
- `stretch_interest`
- `validation_status`
- `manager_note`
- `last_updated_at`

## Header Normalization

The importer should normalize headers by:

- Trimming whitespace.
- Lowercasing.
- Replacing spaces, hyphens, and slashes with underscores.
- Mapping known aliases to canonical names.

Example aliases:

- `trainer name` -> `full_name`
- `business region` -> `region`
- `availability` -> `bandwidth`
- `client appetite` -> `client_facing_desire`
- `Which Skills Lab Coach are you?` -> `full_name`
- `Your work location` -> `country`
- recognized form skill headers -> canonical skill names and categories

Fields such as `Appetite for Client Work`, client-facing notes, and industry notes are profile/context fields, not skills.

## Open Decisions

1. Should imported Excel data replace all existing records or upsert into the current database?
2. Should profiles be visible globally or permission-scoped by region/business unit?
3. Should manager notes be visible to all users or only manager/community roles?
4. Is regional fit a hard constraint or a weighted scoring factor by default?
5. Should stretch mode be available to all users or only managers?
6. What is the profile freshness cadence: 30, 60, or 90 days?
7. Who owns changes to the canonical Skills Lab Coach Profiling Form catalog?
8. Should the MCP server run inside the FastAPI process or as a separate process?
9. Should a later phase add semantic/RAG search over unstructured coach evidence documents?

## Clarification Needed From Stakeholders

- Confirm that the PDF skills form remains the authoritative capability catalog.
- Confirm whether `Additional Skills` free-text entries should be searchable topics or only supporting evidence.
- Confirm expected regions and country naming.
- Current MVP region frame is `EMEA`, `NA`, `UK`, `HK`, `MY`, `SG`, and `AUS`.
- Confirm official meeting types.
- Confirm skill rating scale mapping: no experience, limited experience, competent, expert, and soft-skill 1-5 scale.
- Confirm validation workflow owner.
- Confirm whether import history must be auditable by user.
- Confirm whether future Copilot answers require citations from retrieved evidence documents.
