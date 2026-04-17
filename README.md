# AI-Powered Interview Simulation and Resume Intelligence

A full-stack career preparation platform that helps users practice technical interviews, analyze resumes for ATS readiness, and track improvement with actionable analytics.

This project includes a modern React frontend and a FastAPI backend with MongoDB persistence, JWT-based authentication, resume processing, interview simulation, and readiness scoring.

## Highlights

- Secure auth flow: register, login, refresh token, logout, profile management, password reset
- Resume analysis: upload PDF/DOCX/TXT, ATS-style scoring, strengths, missing skills, and detailed metrics
- Interview simulation: role-based sessions, AI-assisted question generation, deterministic answer scoring, and feedback
- Analytics dashboard: trends, role performance, session history, resume progress, and readiness overview
- Production-ready deployment setup with Render Blueprint (`render.yaml`)
- Migrated backend from .NET to Python FastAPI while preserving app behavior

## Tech Stack

### Frontend

- React 18
- Vite
- Tailwind CSS
- Chart.js + react-chartjs-2
- React Router
- Axios

### Backend

- FastAPI
- Uvicorn
- PyMongo (MongoDB)
- python-jose (JWT)
- passlib
- pypdf + python-docx
- httpx (OpenAI integration)

## Project Structure

```text
net/
  frontend/              # React + Vite UI
  MyWebApiPython/        # FastAPI backend
  render.yaml            # Render Blueprint for backend + frontend
```

## Key Features

### 1) Authentication and User Management

- Access/refresh token workflow
- Password change and reset endpoints
- Protected profile APIs

### 2) Resume Intelligence

- Upload and parse resumes
- ATS-style scoring and keyword insights
- Detailed analysis endpoint per resume

### 3) Interview Engine

- Role-based interview sessions
- Session lifecycle: start, submit, active session recovery, report, end
- Deterministic scoring rubric with optional AI enhancement

### 4) Analytics and Readiness

- Session trends and role-wise performance
- Resume trend insights integrated with interview analytics
- Readiness scoring summary for interview preparation

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB Atlas (or local MongoDB)

### 1) Backend Setup

```bash
cd MyWebApiPython
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` in `MyWebApiPython/` using this template:

```env
MONGODB_CONNECTION_STRING=
MONGODB_DATABASE_NAME=AiInterviewDb

JWT_SECRET=
JWT_ISSUER=AIInterviewSimulator
JWT_AUDIENCE=AIInterviewSimulatorUsers
JWT_EXPIRY_MINUTES=120

OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1/
OPENAI_MODEL=gpt-4o-mini
```

Start backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 5107 --reload
```

### 2) Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` and proxies `/api` to `http://localhost:5107`.

## API Snapshot

Base path: `/api`

- Auth: `/auth/register`, `/auth/login`, `/auth/refresh-token`, `/auth/logout`, `/auth/profile`
- Resume: `/resume/upload`, `/resume/my`, `/resume/{resume_id}/detailed-analysis`
- Interview: `/interview/simulator/start`, `/interview/simulator/submit`, `/interview/simulator/trends`, `/interview/readiness`

Interactive docs (backend):

- `/docs`

## Deploy on Render

This repo includes `render.yaml` for one-click Blueprint deployment.

### Steps

1. Push code to GitHub.
2. In Render, choose `New +` -> `Blueprint` and select this repository.
3. Render will provision:
   - `ai-interview-backend` (web service)
   - `ai-interview-frontend` (static site)
4. Set required backend environment variables in Render:
   - `MONGODB_URI`/`MONGODB_CONNECTION_STRING` (use the variable expected by your service config)
   - `JWT_SECRET`
   - `OPENAI_API_KEY` (optional)
5. Set frontend env var:
   - `VITE_API_URL=https://<your-backend>.onrender.com/api`

Note: current backend CORS allows localhost origins by default. For production domains, update CORS allowlist in the backend before final release.

## Scripts

### Frontend (`frontend/package.json`)

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run lint` - lint checks
- `npm run preview` - preview production build

## Roadmap Ideas

- Add role-based authorization and admin insights
- Add richer prompt tuning controls for interview generation
- Add CI/CD checks for lint, build, and API smoke tests
- Add domain-based configurable CORS via environment variable

## License

This project is for educational and portfolio use. Add a formal license if you plan to distribute commercially.
