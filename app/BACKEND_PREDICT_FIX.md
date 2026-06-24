# Backend fix — `/predict` 500 on Hugging Face

## What’s going wrong

Your logs show inference runs, then **alert insert to Supabase fails**:

```
Failed to insert alert: ConnectionTerminated ...
POST /predict → 500 Internal Server Error
```

The old `supabase_client.py` **re-raises** that error, so the entire classification response is lost even though the model already ran.

`GET /` → 404 is normal (API has no homepage). It is unrelated.

## Fix (Hugging Face Space)

### 1. Replace `app/supabase_client.py`

Copy `app/supabase_client.py` from this repo into your HF Space (`/code/app/supabase_client.py`).

Changes:
- `insert_alert()` **never raises** — logs and returns `False` instead
- Retries up to 3 times on transient errors
- Uses `httpx.Client(http2=False)` to avoid HTTP/2 `ConnectionTerminated` drops

### 2. Patch `app/main.py` — `process_and_predict`

Find where alerts are inserted (around line 130). Ensure you **do not** rely on insert success:

```python
from app.supabase_client import insert_alert

# Inside process_and_predict, for each non-Normal row:
inserted = insert_alert({
    "severity": severity,
    "class": predicted_class,
    "source_ip": source_ip,
    "confidence": confidence,
    "timestamp": timestamp,
})
if not inserted:
    warnings.append("Alert could not be saved to database (prediction still valid).")
```

Remove any `raise` after a failed insert. Do **not** wrap the whole function in try/except that aborts the response.

### 3. Optional — root health route

Stops `GET /` 404 noise in logs:

```python
@app.get("/")
def root():
    return {"status": "ok", "service": "NetGuard API"}
```

### 4. Redeploy the Space

Restart/rebuild the HF Space after uploading the files.

## Verify

1. Generate synthetic data → should return 200 (already working in your logs).
2. Run classification on a small CSV (5–10 rows).
3. Expect `POST /predict` → **200** with JSON results.
4. If Supabase is still flaky, predictions succeed but some alerts may not appear until DB connectivity recovers.

## Supabase checklist

If alerts still don’t appear after predict works:

- HF Space secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service role key)
- Table `alerts` exists with columns your insert expects
- Supabase project is not paused (free tier)

## Frontend

Point `.env` at the live API:

```
VITE_API_BASE_URL=https://<your-hf-space>.hf.space
VITE_USE_MOCK=false
```

Redeploy the frontend (Vercel) after changing env vars.
