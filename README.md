# Copilot Architecture Advisor

A decision engine that recommends the optimal Microsoft AI platform architecture (Copilot Studio, Agent Builder, Fabric Agent, or Azure AI Foundry) based on a 13-question assessment wizard.

## Features

- **13-Question Wizard**: Guided assessment covering complexity, data sources, PHI/compliance, UX channel, team capability, agent behavior, custom models, and human-in-loop requirements
- **Deterministic Scoring Engine**: Rule-based scoring with PHI hard-cap enforcement and custom model constraints
- **50 Healthcare Use Cases Dashboard**: Pre-built healthcare provider scenarios across 5 categories with full architecture recommendations and drill-down views
- **Functional Spec Generation**: Auto-generated implementation specifications for each recommendation
- **Architecture Diagrams**: Visual representation of recommended architecture components
- **SQLite Persistence**: All assessments saved for historical review

## Architecture

```
frontend/          React 18 + Vite + TypeScript + Tailwind CSS
backend/           FastAPI + Python 3.12
  app/
    scoring/       Scoring engine, weight matrix, validation contracts
    spec/          Functional spec generator
    knowledge/     SQLite store, 50 healthcare use cases
data/              SQLite database (auto-created)
```

## Four Competing Architectures

| ID | Label | Best For |
|---|---|---|
| COPILOT_STUDIO | Microsoft Copilot Studio | Low-code Teams bots, simple Q&A |
| AGENT_BUILDER | Microsoft 365 Copilot Agent Builder | M365-native declarative agents |
| FABRIC_AGENT | Microsoft Fabric Agent | Data-heavy analytics with Fabric/Snowflake |
| FOUNDRY_AGENT | Microsoft Copilot + Azure AI Foundry | PHI/HIPAA, custom models, complex orchestration |

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- Poetry (`pip install poetry`)

### Backend

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` by default and proxies API calls to `http://localhost:8000`.

Set `VITE_API_URL` environment variable to override the backend URL.

### Docker Compose

```bash
docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

The frontend container waits for the backend healthcheck before starting.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/healthz` | Health check |
| GET | `/api/health` | API health |
| POST | `/api/recommend` | Submit wizard answers, get architecture recommendation |
| GET | `/api/cases` | List saved use cases (paginated) |
| GET | `/api/healthcare-cases` | Get 50 pre-scored healthcare use cases (optional `?category=` filter) |

## Healthcare Dashboard Categories

1. **Clinical Operations** (hc-001 to hc-010) — Triage, medication, clinical documentation
2. **Revenue Cycle** (hc-011 to hc-020) — Billing, claims, prior authorization
3. **Patient Engagement** (hc-021 to hc-030) — Portals, scheduling, health literacy
4. **Compliance & Quality** (hc-031 to hc-040) — HIPAA, quality measures, audit
5. **Operations & Workforce** (hc-041 to hc-050) — Staffing, supply chain, credentialing

## Test Cases

15 acceptance test cases (TC1-TC15) validate deterministic scoring:
- TC1-TC10: Core signal scenarios (PHI, Snowflake, multi-agent, Teams low-code, etc.)
- TC11-TC15: Addendum Q11-Q13 scenarios (autonomous agents, fine-tuned models, human-in-loop)

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `/data/advisor.db` | SQLite database file path |
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL (frontend build-time) |
