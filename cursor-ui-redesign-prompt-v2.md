# NetGuard UI Redesign — Round 2: Depth, Density, and a Test Data Generator

## Context for you (Cursor)

This is "NetGuard," a network intrusion detection dashboard for a NSL-KDD 5-class
classifier (Normal / DoS / Probe / R2L / U2R), backed by a FastAPI service running
Random Forest, XGBoost, and K-Means models. The current UI works but has three
problems: large empty regions on low-traffic pages, a color scheme that reads as a
generic "dark hacker dashboard" template, and several rich fields the backend
already returns that the frontend never displays. Fix all three. Don't add a single
fabricated metric — every number on screen must trace back to a real API field
listed below.

## Ground truth: what the backend actually returns (do not invent fields)

```
POST /predict  → { rows: [{
    row_id, predicted_class, confidence, severity, inference_time_ms,
    model_used, features: {...9 input cols}, probabilities: { Normal, DoS, Probe, R2L, U2R },
    warnings?: ["Unseen value 'x' in column 'service' was replaced with fallback 'y'."]
  }], summary: { total_rows, class_counts, model_used } }

GET /model-stats?model=random_forest|xgboost|kmeans →
  { accuracy, macro_precision, macro_recall, macro_f1,
    per_class: { ClassName: { precision, recall, f1, support } },
    feature_importance: { feature_name: weight, ... } }   // kmeans uses Normal/Anomaly only

GET /dataset-stats → { total_records, class_distribution: { Normal, DoS, Probe, R2L, U2R } }

GET /alerts?limit=N → recent alert rows (class, severity, confidence, source_ip, model_used, timestamp)
```

Dataset reality (use these for the generator and for any "is this class rare"
framing — don't soften it): **Normal 13,449 · DoS 9,234 · Probe 2,289 · R2L 209 ·
U2R 11** rows out of 25,192 total. U2R is almost unrepresented — that's *why* a
synthetic generator with class-mix control is genuinely useful here, not a gimmick.

The 9 input features, in order, are: `duration, protocol_type, service, flag,
src_bytes, dst_bytes, count, srv_count, serror_rate`. `protocol_type` ∈ {tcp, udp,
icmp}. `flag` ∈ {SF, S0, REJ, RSTR, SH, RSTO, S1, RSTOS0, S3, S2, OTH}. `service`
has 66 distinct values (e.g. ftp_data, private, http, other...) — pull the real
list from the dataset/backend, don't guess a short list.

**Hard rule:** if a visualization would need a confusion matrix, you'd need
ground-truth labels at inference time, which the API does not provide for
user-submitted data. Don't build a fake one. Use `per_class.support` (real label
counts from training) paired with live `class_counts` from a run instead — that's
an honest "expected distribution vs. what this batch triggered" comparison.

---

## Part 1 — Color & type system (replace the current palette)

The current near-black background + single bright cyan accent is the single most
common "AI-generated dashboard" look right now — it's not wrong, but it's not a
choice, it's a default. Replace it with something that actually reads as
security-monitoring hardware rather than generic dark-mode-for-its-own-sake.

**Direction: NOC/SOC monitoring wall, not cyberpunk terminal.** Keep dark (real
24/7 monitoring walls are dark for eye strain reasons — that's a legitimate
constraint, not laziness), but shift the accent identity from cool cyan to a
warm signal-amber, with teal demoted to a secondary/supporting role instead of
the whole identity.

Tokens (use CSS variables, don't hardcode hex in components):

| Token | Hex | Use |
|---|---|---|
| `--bg-ink` | `#0A0D10` | page background |
| `--bg-surface` | `#121821` | cards/panels |
| `--bg-surface-raised` | `#1A222C` | hovered/active panels, modals |
| `--border` | `#232C36` | hairlines, table dividers |
| `--text-primary` | `#E7EDF2` | headings, primary values |
| `--text-muted` | `#8694A1` | labels, captions |
| `--accent-beacon` | `#E8A33D` | **primary** brand accent: active nav, primary buttons, primary chart series, logo mark |
| `--accent-sonar` | `#2BA39A` | secondary accent: secondary chart series, "Normal" traffic class color, info badges |

Severity ramp (functional/semantic — keep it legible and conventional, this is
not where you take a design risk): critical `#F2495E`, high `#F2914A`, medium
`#ECC54A`, low `#5C8AA6`. Keep the "Live" status dot green/`--accent-sonar` —
that convention (green = healthy) is load-bearing for usability, don't reassign it.

**Typography:** pair IBM Plex Sans (UI text, labels, headings) with IBM Plex Mono
(every numeric/data value — IPs, timestamps, percentages, counts, confidence
scores). The mono face for data only is the signature move: it makes tables of
IPs and confidence scores actually align like a real packet-capture tool instead
of looking like generic UI copy. Use `font-variant-numeric: tabular-nums` on mono
number columns so they don't jitter on update.

**Signature motif:** replace the static "Live" dot with a slow, subtle pulse
animation (respect `prefers-reduced-motion` — fall back to static). Add small
inline sparklines (last ~20 data points) inside the four Dashboard stat cards
using the same Plotly instance already in the bundle — don't add Recharts/Chart.js
as a second charting dependency, you already have Plotly (visible in the modebar
icons on existing charts).

---

## Part 2 — New feature: synthetic test-data generator

**Where:** new panel on the **Analyse Traffic** page, in the large empty area
below/beside the upload card. This both fills dead space and solves a real
problem: there's no easy way to generate realistic-looking NSL-KDD rows
(especially rare-class ones like U2R/R2L) for demoing or testing the pipeline
without a real packet capture.

**Backend:** add one new endpoint, e.g. `GET /synthetic-data`, in `app/main.py`
reusing the `df` dataframe already loaded in `app/ml.py` (don't bundle the CSV
into the frontend — it's already in memory server-side).

Query params:
- `count` (int, default 25, max ~500)
- `mix`: `realistic` (sample classes in the same proportion as `class_distribution`)
  | `balanced` (equal rows per class) | `rare_focus` (heavily oversample R2L/U2R)
  | `single:<ClassName>` (all rows from one class)
- `jitter` (float, default 0.08): numeric jitter strength

**Algorithm** (bootstrap + jitter, not pure random — this preserves realistic
categorical combinations):
1. Pick how many rows come from each class based on `mix`.
2. For each synthetic row: sample one real row from that class in `df`.
3. Keep `protocol_type`, `service`, `flag` exactly as sampled (preserves
   realistic real-world combinations — don't randomize these independently,
   that destroys the correlations visible in the existing feature-correlation
   heatmap).
4. Apply multiplicative Gaussian jitter (`± jitter`) to `duration, src_bytes,
   dst_bytes, count, srv_count`. Clip `serror_rate` to `[0, 1]` after jitter
   since it's a rate.
5. Drop the `category` column before returning — these are meant to be fed back
   into `/predict` as unlabeled input, not used to cheat-validate the model
   against its own training labels.
6. Return as a downloadable CSV (`StreamingResponse`, `media_type="text/csv"`).

**Frontend panel UI:**
- Row count input/slider, class-mix selector (the four modes above), jitter
  strength slider with a live explainer ("higher = less like real captured
  traffic, more stress-test").
- Two actions: **Download CSV** and **Generate & load into uploader** (skip the
  download round-trip, drop straight into the existing upload flow so "generate
  → run classification" is one continuous action).
- Small caption under the panel, in plain language: "Rows are built from real
  recorded traffic with small variations — not invented from scratch — so
  predictions stay meaningful." (Don't oversell this as "AI-generated synthetic
  data" — it's bootstrapped real data, say what it actually does.)

---

## Part 3 — Fill the dead space, page by page

### Analyse Traffic
Besides the generator panel above:
- Build out the **Manual entry** tab properly — it currently appears to be an
  empty stub. Real form with the 9 fields: numeric inputs for
  duration/src_bytes/dst_bytes/count/srv_count/serror_rate, dropdowns for
  protocol_type/flag/service populated from the real category lists. Add a
  "fill with a random real sample" button wired to the same generator logic.
- Add a compact feature glossary strip (collapsible) explaining the 9 features
  in plain language for someone unfamiliar with NSL-KDD — what `serror_rate` or
  `srv_count` actually means in a sentence, not the formal definition.
- Add a "recent test runs" list (timestamp, model used, row count, top
  predicted class) below the model-select cards so the page has continuity
  between visits instead of resetting to fully blank every time.

### Prediction Result — this is your biggest gap, it's almost entirely empty right now
This page should become the densest one, since `/predict` already returns
per-row `probabilities`, `inference_time_ms`, `severity`, and `warnings` that
currently go completely unused:
- **Summary header**: total rows, class breakdown (small bar or donut from
  `summary.class_counts`), average confidence, average `inference_time_ms`.
- **Results table**: row_id, severity-colored predicted_class badge,
  confidence %, inference time. Expandable row reveals (a) a small horizontal
  bar per class from `probabilities` — show the model's *full* belief
  distribution, not just the winning class, and (b) the raw submitted feature
  values for that row.
- **Confidence distribution histogram**, grouped by predicted class — surfaces
  which predictions the model was actually unsure about.
- **Warnings panel**: any row with a `warnings` entry (unseen category
  fallback) gets surfaced explicitly and separately — this is a real
  data-quality signal your backend computes and currently discards entirely.
- Actions row: export results CSV, run another batch.

### Dashboard
Already reasonably laid out, but go deeper using data you're not using yet:
- Add sparklines to the 4 top stat cards (see Part 1).
- Add a compact 3-model comparison strip (accuracy + macro F1 for RF/XGBoost/
  K-Means side by side) so model comparison isn't buried only on Analyse Traffic.
- Add an "avg inference latency" stat sourced from recent `/predict` calls.
- Add a severity breakdown donut (Critical/High/Medium/Low) next to the alerts
  table — right now severity mix is only implied by row count text ("3 critical").
- Make the Activity Log scrollable with a filter instead of an ever-growing
  static list.

### Data Visualisation
Currently only ever renders F1. The backend gives you precision, recall, F1,
support, *and* feature importance for both RF and XGBoost, plus K-Means stats —
almost none of that is shown:
- Add a metric toggle (Precision / Recall / F1) on the existing per-class bar
  chart instead of hardcoding F1.
- Add a feature-importance comparison chart (RF vs XGBoost) — both already
  return identically-shaped `feature_importance` dicts, this is a direct plot,
  no new backend work.
- Add a macro-metrics scoreboard (macro_precision/macro_recall/macro_f1) per
  model for an at-a-glance comparison beyond the single accuracy number.
- Add a K-Means panel: its Normal/Anomaly precision-recall-F1, currently
  reduced to a single 87.39% accuracy number on the Analyse Traffic page and
  nowhere else.
- Add the "expected distribution vs. live class_counts" comparison described
  in the ground-truth section above — this is your closest-to-honest substitute
  for a confusion matrix.

---

## Implementation order
1. Color/type tokens first (low risk, immediately visible, don't touch logic).
2. `/synthetic-data` backend endpoint + Analyse Traffic generator panel.
3. Prediction Result page (biggest visual gap, all data already available).
4. Dashboard additions.
5. Data Visualisation additions.

## Explicitly out of scope — don't do these
- Don't add a geographic/IP map. Source IPs are synthetic placeholders
  generated server-side (`192.168.x.x`), not real geolocated traffic — a map
  would imply data you don't have.
- Don't fabricate a confusion matrix without ground-truth labels.
- Don't introduce a second charting library; extend the existing Plotly setup.
- Don't bundle the training CSV into the frontend for the generator — it must
  be a backend endpoint reusing the dataframe already loaded in `app/ml.py`.
