---
title: AI4Cyber Anomaly Detection API
emoji: 🛡️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# AI4Cyber Anomaly Detection API

This Hugging Face Space hosts the FastAPI backend for the COS30049 Assignment 3 project by Group 14.

## Overview

This backend serves three pre-trained machine learning models (Random Forest, XGBoost, K-Means) to detect network intrusions. It provides a "live" experience by running real inference, persisting prediction history to a Supabase database, and serving statistics based on the actual trained artifacts.

### What "Live" Means

- **Real Inference**: The `/predict` endpoint runs inference on the actual `scikit-learn` and `xgboost` models.
- **Persisted Alerts**: Every prediction that is not "Normal" is logged as an alert to a Supabase Postgres database. The `GET /alerts` endpoint reads directly from this table.
- **Real Stats**: The `/dataset-stats` and `/model-stats` endpoints return data derived from the real training dataset and model evaluation metrics from Assignment 2.

This backend does **not** perform live network packet capture.

## Environment Variables (Secrets)

To connect to the Supabase database, you must set the following secrets in your Hugging Face Space settings:

- `SUPABASE_URL`: The URL of your Supabase project.
- `SUPABASE_SERVICE_KEY`: The `service_role` key for your Supabase project.

The application will fail to start if these secrets are not set.
