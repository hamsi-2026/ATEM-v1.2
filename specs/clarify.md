# Clarify

## Current Assumptions

- The existing Excel sheet contains one trainer per row.
- The first row contains headers.
- The first worksheet is the active trainer dataset unless the user selects another sheet in a future version.
- Trainer names are unique enough for MVP import matching when no explicit trainer ID exists.
- The app is internal and desktop-first.
- SQLite is acceptable for MVP and local/internal usage.

## Required Excel Columns

Minimum useful columns:

- `name` or `full_name`
- `region`
- `country`
- `role` or `role_title`
- `seniority` or `seniority_level`
- `languages`
- `skills`

Recommended columns:

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
- `skill set` -> `skills`
- `business region` -> `region`
- `availability` -> `bandwidth`
- `client appetite` -> `client_facing_desire`

## Open Decisions

1. Should imported Excel data replace all existing records or upsert into the current database?
2. Should profiles be visible globally or permission-scoped by region/business unit?
3. Should manager notes be visible to all users or only manager/community roles?
4. Is regional fit a hard constraint or a weighted scoring factor by default?
5. Should stretch mode be available to all users or only managers?
6. What is the profile freshness cadence: 30, 60, or 90 days?
7. Which Excel columns exist in the current production form export?
8. Should the MCP server run inside the FastAPI process or as a separate process?

## Clarification Needed From Stakeholders

- Provide a sample export of the current trainer skill-set Excel file.
- Confirm expected regions and country naming.
- Confirm official meeting types.
- Confirm skill rating scale.
- Confirm validation workflow owner.
- Confirm whether import history must be auditable by user.
