# Developer Information

## Project Overview
OpenRouter Calculator is a Django-based web application that provides a UI for estimating AI model usage costs based on OpenRouter pricing snapshots.

## Core Tech Stack
- **Backend**: Django (Python)
- **Frontend**: Vanilla JS, Bootstrap 5, HTML/CSS
- **Database**: Django ORM

## Key Commands
- **Fetch Pricing Data**: `python3 webapp/manage.py fetch` (Required to populate model data)
- **Run Server**: `python3 webapp/manage.py runserver`
- **Fetch Pricing Data**: `python3 webapp/manage.py fetch` (Required to populate model data)
- **Run Server**: `python3 webapp/manage.py runserver`
- **Migrations**: `python3 webapp/manage.py migrate`

## Calculated column (front-end)
Values in the **Calculated** column are computed in `webapp/calculator/static/calculator/app.js` (`calculateForModel`). For each model, snapshot fields `pricing_prompt` and `pricing_completion` are treated as **USD per input/output token** (as returned by OpenRouter and stored by the fetch command).

1. **Token cost** for the row is
   `(pricing_prompt × input tokens) + (pricing_completion × output tokens)`
   using the user’s **Input tokens** and **Output tokens** fields.

2. **Per-request pricing** (toggle off): the column shows that token cost only.

3. **Per-request pricing** (toggle on): the column shows **token cost × Requests**, where **Requests** is the number in that input (clamped to a non-negative integer; if the parsed value would be zero, it is treated as one for the multiplier). Image and other non-token pricing from the snapshot are not included.

## Commit Convention
- Commit messages should describe the intent behind the changes rather than just what was changed.
- `webapp/`: Django project root.
  - `calculator/`: Main application logic (models, views, templates, static assets).
  - `orc/`: Django project configuration (settings, urls, wsgi).
- `README.md`: User documentation.
