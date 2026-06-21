"""
Synthetic data endpoint — wire into the existing FastAPI app in app/main.py:

    from app.synthetic_data import generate_synthetic_csv
    from app.ml import df  # training dataframe already loaded

    @app.get("/synthetic-data")
    def synthetic_data(
        count: int = Query(25, ge=1, le=500),
        mix: str = Query("realistic"),
        jitter: float = Query(0.08, ge=0.0, le=0.5),
    ):
        csv_text = generate_synthetic_csv(df, count=count, mix=mix, jitter=jitter)
        return StreamingResponse(
            iter([csv_text]),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="synthetic-traffic.csv"'},
        )
"""

from app.synthetic_data import generate_synthetic_csv

__all__ = ["generate_synthetic_csv"]
