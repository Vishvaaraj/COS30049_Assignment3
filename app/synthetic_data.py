"""Bootstrap + jitter synthetic NSL-KDD rows from the in-memory training dataframe."""

from __future__ import annotations

import io
from typing import Dict

import numpy as np
import pandas as pd

FEATURE_COLS = [
    "duration",
    "protocol_type",
    "service",
    "flag",
    "src_bytes",
    "dst_bytes",
    "count",
    "srv_count",
    "serror_rate",
]

NUMERIC_JITTER_COLS = ["duration", "src_bytes", "dst_bytes", "count", "srv_count", "serror_rate"]
CLASSES = ["Normal", "DoS", "Probe", "R2L", "U2R"]


def _allocate_class_counts(total: int, mix: str, class_distribution: Dict[str, int]) -> Dict[str, int]:
    if mix.startswith("single:"):
        cls = mix.split(":", 1)[1]
        return {cls: total}

    if mix == "balanced":
        per = total // len(CLASSES)
        counts = {c: per for c in CLASSES}
        counts[CLASSES[0]] += total - per * len(CLASSES)
        return counts

    if mix == "rare_focus":
        rare = int(total * 0.35)
        r2l = rare // 2
        u2r = rare - r2l
        rest = total - rare
        main_total = class_distribution["Normal"] + class_distribution["DoS"] + class_distribution["Probe"]
        normal = round(class_distribution["Normal"] / main_total * rest)
        dos = round(class_distribution["DoS"] / main_total * rest)
        probe = rest - normal - dos
        return {"Normal": normal, "DoS": dos, "Probe": probe, "R2L": r2l, "U2R": u2r}

    # realistic — proportional to training distribution
    grand = sum(class_distribution.values())
    counts: Dict[str, int] = {}
    assigned = 0
    for i, cls in enumerate(CLASSES):
        if i == len(CLASSES) - 1:
            counts[cls] = total - assigned
        else:
            n = max(0, round(class_distribution[cls] / grand * total))
            counts[cls] = n
            assigned += n
    return counts


def generate_synthetic_csv(
    df: pd.DataFrame,
    *,
    count: int = 25,
    mix: str = "realistic",
    jitter: float = 0.08,
) -> str:
    count = max(1, min(500, count))
    jitter = max(0.0, min(0.5, jitter))

    if "category" not in df.columns:
        raise ValueError("Training dataframe must include a 'category' column.")

    class_distribution = df["category"].value_counts().to_dict()
    class_counts = _allocate_class_counts(count, mix, class_distribution)

    rng = np.random.default_rng()
    rows = []

    for cls, n in class_counts.items():
        pool = df[df["category"] == cls]
        if pool.empty:
            continue
        samples = pool.sample(n=n, replace=True, random_state=int(rng.integers(0, 1_000_000)))
        for _, sample in samples.iterrows():
            row = {col: sample[col] for col in FEATURE_COLS}
            for col in NUMERIC_JITTER_COLS:
                base = float(row[col])
                factor = 1.0 + rng.normal(0, jitter)
                value = base * factor
                if col == "serror_rate":
                    row[col] = float(np.clip(value, 0.0, 1.0))
                else:
                    row[col] = max(0, int(round(value)))
            rows.append(row)

    out = pd.DataFrame(rows, columns=FEATURE_COLS)
    if not out.empty:
        out = out.sample(frac=1.0, random_state=int(rng.integers(0, 1_000_000))).reset_index(drop=True)

    buf = io.StringIO()
    out.to_csv(buf, index=False)
    return buf.getvalue()
