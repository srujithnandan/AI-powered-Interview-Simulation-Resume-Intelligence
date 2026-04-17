# MyWebApi Python Migration

This is a Python FastAPI replacement for the original backend.

## Features migrated
- Auth with JWT + refresh token flow
- Resume upload and ATS analysis (`pdf`, `docx`, `txt`)
- Interview question generation and answer evaluation
- Interview simulator endpoints
- Analytics, trends, and readiness score
- MongoDB persistence

## Run locally
1. Create a Python environment.
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Create `.env` from `.env.example` and fill values.
4. Start API on the same port your frontend already expects:
   - `uvicorn main:app --host 0.0.0.0 --port 5107 --reload`

## Frontend compatibility
Frontend calls `/api/*`. Keep Vite proxy target as `http://localhost:5107`.

## Health endpoint
- `GET /health`
