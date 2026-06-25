# NetGuard — Network Traffic Analysis

**COS30049 Assignment 3 · Group 14**

| Member |
|--------|
| Trishanth Thanendran |
| Vishvaaraj Jegaraj |
| Nigel Wong |

NetGuard is a web application for classifying network traffic flows and surfacing potential intrusions. It connects a React frontend to a FastAPI backend that serves three models trained on the NSL-KDD dataset from Assignment 2: **Random Forest**, **XGBoost**, and **K-Means**.

---

## Links

| | URL |
|---|-----|
| **Website** (NetGuard UI) | [https://cos30049-gp14.vercel.app/](https://cos30049-gp14.vercel.app/) |
| **Hugging Face Space** (where the AI models run) | [https://huggingface.co/spaces/Vishvaaraj/COS30049-GP14-Assign3](https://huggingface.co/spaces/Vishvaaraj/COS30049-GP14-Assign3) |
| **API base URL** | [https://vishvaaraj-cos30049-gp14-assign3.hf.space/](https://vishvaaraj-cos30049-gp14-assign3.hf.space/) |
| **Detection API** (interactive docs for testing) | [https://vishvaaraj-cos30049-gp14-assign3.hf.space/docs](https://vishvaaraj-cos30049-gp14-assign3.hf.space/docs) |

The frontend calls the API base URL. Use the Detection API docs to try `/predict`, `/dataset-stats`, `/model-stats`, and other endpoints directly.

---

## What the website does

NetGuard lets analysts upload traffic data, run ML classification, and review results in one place.

### Dashboard
- Live overview of training-corpus statistics and model performance
- Recent classifications or alerts with severity and attack-type filters
- Severity mix chart, activity log, and model comparison metrics

### Analyse Traffic
- Upload a CSV (9 feature columns) or enter flow features manually
- Generate synthetic test data with configurable class mix and row count
- Choose a model and run batch classification against the live API
- View recent test runs stored in Supabase

### Prediction Result
- Collapsible history of every classification run
- Per-row predictions with confidence, severity, and probability breakdown
- Export input and output CSVs; confidence charts per predicted class

### Data Visualisation
- Dataset class distribution and per-class model metrics (RF vs XGBoost)
- Feature importance comparison and K-Means Normal vs Anomaly performance
- Feature correlation heatmap

### Backend (Hugging Face Space)
- Real inference via `/predict` — not mock responses
- Alerts and prediction runs persisted to **Supabase**
- Synthetic data generation, dataset stats, and model evaluation metrics

---

## Repository structure

```
assign3/                    # React frontend (Vite)
├── src/                    # Pages, components, API client
├── vercel.json             # SPA routing for Vercel
└── COS30049-GP14-Assign3/  # FastAPI backend (Hugging Face Space)
    ├── app/                # main.py, ml.py, supabase_client.py
    ├── ml_artifacts/       # Trained models and dataset
    └── supabase/           # SQL schemas for prediction_runs, activity_logs
```

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| Frontend | React, Vite, React Router, Plotly, Axios |
| Backend | FastAPI, scikit-learn, XGBoost, pandas |
| Database | Supabase (Postgres) |
| Deploy | Vercel (frontend), Hugging Face Spaces (backend) |

---

## Local development

### Frontend

```bash
npm install
cp .env.example .env
npm run dev
```

Set in `.env`:

```env
VITE_API_BASE_URL=https://vishvaaraj-cos30049-gp14-assign3.hf.space
VITE_USE_MOCK=false
VITE_HF_SPACE_URL=https://huggingface.co/spaces/Vishvaaraj/COS30049-GP14-Assign3
```

Use `VITE_USE_MOCK=true` to run the UI without a backend.

### Backend

See `COS30049-GP14-Assign3/` — run with uvicorn on port 7860. Requires `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` for persistence.

---

## Course

**COS30049** — Cyber Security Analytics  
Swinburne University of Technology
