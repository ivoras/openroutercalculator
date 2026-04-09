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

## Commit Convention
- Commit messages should describe the intent behind the changes rather than just what was changed.
- `webapp/`: Django project root.
  - `calculator/`: Main application logic (models, views, templates, static assets).
  - `orc/`: Django project configuration (settings, urls, wsgi).
- `README.md`: User documentation.
