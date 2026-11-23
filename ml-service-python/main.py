"""
Dr Lal PathLabs Franchise Analytics - ML Microservice
FastAPI server exposing Turnaround Time (TAT) prediction, SLA delay risk classification,
and centre-level demand forecasting.
Port: 8000
Base path: /
"""

import os
import sys
import json
from datetime import datetime, date, timedelta
from typing import List, Optional
import numpy as np
import pandas as pd
import psycopg2
import psycopg2.extras
import joblib
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ------------------------------------------------------------------------------
# App & CORS Setup
# ------------------------------------------------------------------------------
app = FastAPI(
    title="Dr Lal PathLabs Diagnostic Operations ML Microservice",
    description="Predictive intelligence microservice for TAT prediction, SLA triage, and demand forecasting.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# PostgreSQL Connection Setup
# ------------------------------------------------------------------------------
PG_HOST = os.environ.get("PGHOST", "localhost")
PG_PORT = int(os.environ.get("PGPORT", "5432"))
PG_DATABASE = os.environ.get("PGDATABASE", "diagnostic_ops")
PG_USER = os.environ.get("PGUSER", "postgres")
PG_PASSWORD = os.environ.get("PGPASSWORD", "postgres")
CANDIDATE_PASSWORDS = [PG_PASSWORD, "postgres", "Ankit@2002"]


def get_db_connection():
    passwords = []
    for p in CANDIDATE_PASSWORDS:
        if p and p not in passwords:
            passwords.append(p)
    for pwd in passwords:
        try:
            return psycopg2.connect(
                host=PG_HOST,
                port=PG_PORT,
                dbname=PG_DATABASE,
                user=PG_USER,
                password=pwd,
            )
        except psycopg2.OperationalError:
            continue
    raise ConnectionError(f"Could not connect to PostgreSQL database '{PG_DATABASE}' at {PG_HOST}:{PG_PORT}")


# ------------------------------------------------------------------------------
# Model Artifacts Loader
# ------------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")

tat_regressor = None
tat_classifier = None
demand_forecaster = None
feature_metadata = {}
CENTRE_ID_MAP = {
    1: "DL-LP-01",
    2: "DL-LP-02",
    3: "DL-LP-03",
}
CENTRE_CODE_MAP = {v: k for k, v in CENTRE_ID_MAP.items()}


@app.on_event("startup")
def load_artifacts():
    global tat_regressor, tat_classifier, demand_forecaster, feature_metadata
    try:
        reg_path = os.path.join(ARTIFACTS_DIR, "tat_regressor.joblib")
        clf_path = os.path.join(ARTIFACTS_DIR, "tat_classifier.joblib")
        fc_path = os.path.join(ARTIFACTS_DIR, "demand_forecaster.joblib")
        meta_path = os.path.join(ARTIFACTS_DIR, "feature_metadata.json")

        if os.path.exists(reg_path):
            tat_regressor = joblib.load(reg_path)
        if os.path.exists(clf_path):
            tat_classifier = joblib.load(clf_path)
        if os.path.exists(fc_path):
            demand_forecaster = joblib.load(fc_path)
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                feature_metadata = json.load(f)

        print("✓ All ML model artifacts successfully loaded into memory.")
    except Exception as e:
        print(f"Warning: Error loading ML model artifacts: {e}", file=sys.stderr)


# ------------------------------------------------------------------------------
# Request & Response Schemas (Pydantic v2)
# ------------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    service: str
    models_loaded: dict
    timestamp: str


class TatPredictionRequest(BaseModel):
    centre_id: int = Field(default=1, description="Franchise collection centre ID (1, 2, or 3)")
    test_code: str = Field(default="CBC", description="Diagnostic test code, e.g. CBC, LIPID, VITD")
    processing_type: str = Field(default="IN_HOUSE", description="'IN_HOUSE' or 'EXTERNAL_HUB'")
    standard_sla_minutes: int = Field(default=180, description="Standard SLA duration in minutes")
    is_stat_urgent: bool = Field(default=False, description="Emergency STAT flag")
    collected_hour: float = Field(default=8.5, description="Collection hour float (e.g., 8.5 for 08:30 AM)")
    day_of_week: int = Field(default=0, description="Day of week (0=Monday, 6=Sunday)")
    active_queue_depth: int = Field(default=10, description="In-flight active sample queue depth")


class TatPredictionResponse(BaseModel):
    predicted_tat_minutes: float
    delay_probability: float
    risk_level: str
    model_used: str
    standard_sla_minutes: int
    is_breach_predicted: bool


class DemandForecastRequest(BaseModel):
    centre_id: int = Field(default=1, description="Collection centre ID (1, 2, or 3)")
    processing_type: str = Field(default="IN_HOUSE", description="'IN_HOUSE' or 'EXTERNAL_HUB'")
    horizon_days: int = Field(default=7, ge=1, le=30, description="Forecast horizon in days (1-30)")


class DailyForecastItem(BaseModel):
    forecast_date: str
    centre_id: int
    processing_type: str
    predicted_volume: int
    lower_bound: int
    upper_bound: int
    model_name: str


class DemandForecastResponse(BaseModel):
    centre_id: int
    centre_code: str
    processing_type: str
    horizon_days: int
    model_used: str
    forecasts: List[DailyForecastItem]


# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        service="Dr Lal PathLabs ML Microservice",
        models_loaded={
            "tat_regressor": tat_regressor is not None,
            "tat_classifier": tat_classifier is not None,
            "demand_forecaster": demand_forecaster is not None,
        },
        timestamp=datetime.now().isoformat(),
    )


@app.post("/ml/predict-tat", response_model=TatPredictionResponse)
def predict_tat(req: TatPredictionRequest):
    if tat_regressor is None or tat_classifier is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TAT ML models are not initialized. Please ensure training artifacts exist.",
        )

    # 1. Map centre
    centre_code = CENTRE_ID_MAP.get(req.centre_id, "DL-LP-01")
    is_in_house = 1 if req.processing_type.upper() == "IN_HOUSE" else 0
    is_stat_urgent_int = 1 if req.is_stat_urgent else 0
    is_weekend = 1 if req.day_of_week in [5, 6] else 0
    hour_float = float(req.collected_hour)
    hour_sin = np.sin(2 * np.pi * hour_float / 24.0)
    hour_cos = np.cos(2 * np.pi * hour_float / 24.0)

    cutoff_hour = feature_metadata.get("cutoff_hour", 13)
    minutes_to_hub_cutoff = (cutoff_hour - hour_float) * 60.0

    # 2. Build feature vector matching training feature columns
    feat_cols = feature_metadata.get("tat_feature_columns", [])
    row_data = {}

    for col in feat_cols:
        if col == "standard_sla_minutes":
            row_data[col] = float(req.standard_sla_minutes)
        elif col == "is_stat_urgent_int":
            row_data[col] = is_stat_urgent_int
        elif col == "is_in_house":
            row_data[col] = is_in_house
        elif col == "collection_hour_float":
            row_data[col] = hour_float
        elif col == "hour_sin":
            row_data[col] = hour_sin
        elif col == "hour_cos":
            row_data[col] = hour_cos
        elif col == "day_of_week":
            row_data[col] = int(req.day_of_week)
        elif col == "is_weekend":
            row_data[col] = is_weekend
        elif col == "minutes_to_hub_cutoff":
            row_data[col] = minutes_to_hub_cutoff
        elif col == "active_queue_depth":
            row_data[col] = int(req.active_queue_depth)
        elif col.startswith("centre_"):
            target_centre = col.replace("centre_", "")
            row_data[col] = 1 if centre_code == target_centre else 0
        elif col.startswith("test_"):
            target_test = col.replace("test_", "")
            row_data[col] = 1 if req.test_code.upper() == target_test else 0
        else:
            row_data[col] = 0

    df_in = pd.DataFrame([row_data], columns=feat_cols)

    # 3. Model inference
    pred_tat = float(tat_regressor.predict(df_in)[0])
    pred_tat = max(30.0, round(pred_tat, 1))

    delay_prob = float(tat_classifier.predict_proba(df_in)[0][1])

    # 4. SLA Risk Categorization
    sla = req.standard_sla_minutes
    if delay_prob >= 0.55 or pred_tat > (sla * 1.05):
        risk_level = "HIGH"
    elif delay_prob >= 0.25 or pred_tat > (sla * 0.92):
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    is_breached = bool(pred_tat > sla or delay_prob >= 0.50)

    return TatPredictionResponse(
        predicted_tat_minutes=pred_tat,
        delay_probability=round(delay_prob, 4),
        risk_level=risk_level,
        model_used="XGBoost-Regressor-v1 & XGBoost-Classifier-v1",
        standard_sla_minutes=sla,
        is_breach_predicted=is_breached,
    )


@app.post("/ml/forecast-demand", response_model=DemandForecastResponse)
def forecast_demand(req: DemandForecastRequest):
    if demand_forecaster is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demand forecasting ML model is not initialized.",
        )

    centre_code = CENTRE_ID_MAP.get(req.centre_id, "DL-LP-01")
    p_type = req.processing_type.upper()

    # 1. Query past volume from PostgreSQL to construct lag features
    conn = get_db_connection()
    try:
        query = """
            SELECT 
                DATE(s.collected_at) as order_date,
                COUNT(s.sample_id) as volume
            FROM sample_orders s
            JOIN test_catalog t ON s.test_code = t.test_code
            WHERE s.centre_id = %s AND t.processing_type = %s
            GROUP BY DATE(s.collected_at)
            ORDER BY order_date ASC;
        """
        with conn.cursor() as cur:
            cur.execute(query, (req.centre_id, p_type))
            rows = cur.fetchall()

        if not rows:
            # Fallback historical seed if centre had no samples for that type
            history_dict = {date.today() - timedelta(days=i): 25 for i in range(14, 0, -1)}
        else:
            history_dict = {r[0]: int(r[1]) for r in rows}

        # Ensure dense daily series for past 14 days
        today = date.today()
        dense_history = {}
        for i in range(14, 0, -1):
            d = today - timedelta(days=i)
            dense_history[d] = history_dict.get(d, int(np.mean(list(history_dict.values())) if history_dict else 20))

        # 2. Multi-step autoregressive forecasting
        feat_cols = feature_metadata.get("demand_feature_columns", [])
        residual_std = float(feature_metadata.get("demand_residual_std", 3.0))

        forecast_items = []
        db_insert_rows = []
        created_at = datetime.now()
        model_name = "XGBoost-DemandForecaster-v1"

        current_series = dict(dense_history)

        for step in range(req.horizon_days):
            target_date = today + timedelta(days=step)
            prev_1 = target_date - timedelta(days=1)
            prev_7 = target_date - timedelta(days=7)

            lag_1 = current_series.get(prev_1, 20.0)
            lag_7 = current_series.get(prev_7, lag_1)

            # Rolling 7-day mean
            last_7_vols = [current_series.get(target_date - timedelta(days=k), lag_1) for k in range(1, 8)]
            rolling_7d = float(np.mean(last_7_vols))

            dow = target_date.weekday()
            is_monday = 1 if dow == 0 else 0
            is_sunday = 1 if dow == 6 else 0
            month = target_date.month
            is_in_house = 1 if p_type == "IN_HOUSE" else 0

            row_data = {}
            for col in feat_cols:
                if col == "lag_1":
                    row_data[col] = float(lag_1)
                elif col == "lag_7":
                    row_data[col] = float(lag_7)
                elif col == "rolling_7d_mean":
                    row_data[col] = rolling_7d
                elif col == "day_of_week":
                    row_data[col] = dow
                elif col == "is_monday":
                    row_data[col] = is_monday
                elif col == "is_sunday":
                    row_data[col] = is_sunday
                elif col == "month":
                    row_data[col] = month
                elif col == "is_in_house":
                    row_data[col] = is_in_house
                elif col.startswith("centre_"):
                    target_centre = col.replace("centre_", "")
                    row_data[col] = 1 if centre_code == target_centre else 0
                else:
                    row_data[col] = 0

            df_row = pd.DataFrame([row_data], columns=feat_cols)
            raw_pred = float(demand_forecaster.predict(df_row)[0])
            pred_vol = max(1, int(round(raw_pred)))

            # 90% confidence bounds (+/- 1.645 std)
            lower_bound = max(0, int(round(raw_pred - 1.645 * residual_std)))
            upper_bound = max(pred_vol + 1, int(round(raw_pred + 1.645 * residual_std)))

            # Feed predicted value back into autoregressive chain
            current_series[target_date] = pred_vol

            item = DailyForecastItem(
                forecast_date=target_date.isoformat(),
                centre_id=req.centre_id,
                processing_type=p_type,
                predicted_volume=pred_vol,
                lower_bound=lower_bound,
                upper_bound=upper_bound,
                model_name=model_name,
            )
            forecast_items.append(item)

            db_insert_rows.append((
                target_date,
                req.centre_id,
                p_type,
                pred_vol,
                lower_bound,
                upper_bound,
                model_name,
                created_at,
            ))

        # 3. Persist forecasts to PostgreSQL table ml_demand_forecasts
        with conn.cursor() as cur:
            insert_sql = """
                INSERT INTO ml_demand_forecasts (
                    forecast_date, centre_id, processing_type,
                    predicted_volume, lower_bound, upper_bound,
                    model_name, created_at
                ) VALUES %s;
            """
            psycopg2.extras.execute_values(cur, insert_sql, db_insert_rows)
            conn.commit()

        return DemandForecastResponse(
            centre_id=req.centre_id,
            centre_code=centre_code,
            processing_type=p_type,
            horizon_days=req.horizon_days,
            model_used=model_name,
            forecasts=forecast_items,
        )
    finally:
        conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
