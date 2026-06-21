# AI4Cyber — Front-End (React + Vite)

Network Traffic Classification for Anomaly Detection — Assignment 3 front-end.
Group 14.

## Stack

- React 18 + Vite
- React Router (4 pages: Dashboard, Analyse Traffic, Prediction Result, Data Visualisation)
- Plotly.js (`react-plotly.js`) for all charts
- Axios for API calls
- react-dropzone for the file upload zone

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at `http://localhost:5173`.

## Connecting to the backend

This project ships with **mock data** so it runs and demos fully before the
FastAPI backend exists. Controlled by `.env`:

```
VITE_API_BASE_URL=http://localhost:8000   # FastAPI server URL
VITE_USE_MOCK=true                        # true = mock data, false = real API
```

Once the backend implements the 4 endpoints below, set `VITE_USE_MOCK=false`
and point `VITE_API_BASE_URL` at the running server (local or the deployed
Render/Railway URL).

## API contract (agreed with backend)

| Purpose | Method + path | Request | Response |
|---|---|---|---|
| Classify a CSV — one result per row | `POST /predict` | multipart form: `file` (.csv), `model` | `{ rows: [{ row_id, predicted_class, confidence, probabilities, model_used, inference_time_ms }], summary: { total_rows, class_counts, model_used } }` |
| Model accuracy / F1 / feature importance | `GET /model-stats?model=random_forest` | query param `model` | `{ accuracy, macro_f1, per_class: { ClassName: { precision, recall, f1, support } }, feature_importance: { feature: score } }` |
| Dataset class distribution | `GET /dataset-stats` | none | `{ total_records, class_distribution: { ClassName: count } }` |
| Recent alerts | `GET /alerts?limit=10` | query param `limit` | `[{ id, class, severity, confidence, source_ip, timestamp }]` |

Error responses are expected as `{ "detail": "message" }` (FastAPI's default
shape) — the front-end's `src/api/client.js` reads `error.response.data.detail`
for display.

## Project structure

```
src/
  api/client.js         — all backend calls + mock fallback
  data/                  — mock data, feature validation specs, static
                           A2 correlation/response-playbook data
  state/                 — PredictionContext (passes results from
                           Analyse Traffic -> Prediction Result)
  charts/plotlyTheme.js  — shared dark theme for every Plotly chart
  components/            — Layout (sidebar/topbar), SeverityBadge,
                           StatCard, Feedback (loading/error/empty)
  pages/                 — Dashboard, AnalyseTraffic, PredictionResult,
                           DataVisualisation
```

## Build for deployment (Vercel)

```bash
npm run build
```

Outputs to `dist/`. Set the same `VITE_API_BASE_URL` and `VITE_USE_MOCK=false`
as environment variables in the Vercel project settings before deploying.
