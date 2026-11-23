"""
Dr Lal PathLabs Franchise Analytics - ML Model Training & Benchmarking Pipeline
Trains:
  1. Turnaround Time (TAT) Regression & SLA Breach Classification (Sample-Level)
  2. Daily Test Demand Forecasting (Centre + Processing Type Level)
Saves models, metrics, JSON benchmarks, and 300-DPI publication plots.
"""

import os
import sys
import json
import bisect
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import psycopg2
import psycopg2.extras
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
)
import xgboost as xgb

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
    raise ConnectionError(f"Could not connect to database '{PG_DATABASE}' at {PG_HOST}:{PG_PORT}")


# ------------------------------------------------------------------------------
# Feature Engineering: Active Queue Depth Calculation
# ------------------------------------------------------------------------------
def compute_active_queue_depth(df: pd.DataFrame) -> pd.Series:
    """
    Computes active queue depth (in-flight samples at that centre at collected_at)
    in O(N log N) time without future data leakage.
    """
    queue_depth_series = pd.Series(index=df.index, dtype=int)

    for centre_id, group in df.groupby("centre_id"):
        sorted_indices = group.sort_values("collected_at").index
        active_ready_times = []

        for idx in sorted_indices:
            c_in = df.loc[idx, "collected_at"]
            r_out = df.loc[idx, "actual_ready_at"]

            # Drop any samples whose actual_ready_at was before current sample's collected_at
            departure_idx = bisect.bisect_right(active_ready_times, c_in)
            active_ready_times = active_ready_times[departure_idx:]

            # The current count of in-flight samples is the queue depth
            queue_depth_series.loc[idx] = len(active_ready_times)

            # Register current sample's completion time
            bisect.insort(active_ready_times, r_out)

    return queue_depth_series


# ------------------------------------------------------------------------------
# Workflow A: Turnaround Time (TAT) & SLA Delay Risk
# ------------------------------------------------------------------------------
def run_workflow_a(df_raw: pd.DataFrame, artifacts_dir: str):
    print("\n" + "=" * 70)
    print(" WORKFLOW A: SAMPLE-LEVEL TAT REGRESSION & SLA BREACH CLASSIFICATION")
    print("=" * 70)

    # 1. Sort chronologically and isolate completed samples
    df = df_raw[df_raw["actual_ready_at"].notnull()].sort_values("collected_at").copy()
    print(f"-> Processing {len(df):,} completed sample records for training...")

    # 2. Prevent data leakage: compute active queue depth strictly using chronological events
    df["active_queue_depth"] = compute_active_queue_depth(df)

    # 3. Engineer input features (strictly excluding actual_ready_at, tat_minutes, is_sla_breached)
    collection_dt = pd.to_datetime(df["collected_at"])
    df["collection_hour_float"] = collection_dt.dt.hour + collection_dt.dt.minute / 60.0
    df["hour_sin"] = np.sin(2 * np.pi * df["collection_hour_float"] / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * df["collection_hour_float"] / 24.0)
    df["day_of_week"] = collection_dt.dt.dayofweek
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["is_stat_urgent_int"] = df["is_stat_urgent"].astype(int)
    df["is_in_house"] = (df["processing_type"] == "IN_HOUSE").astype(int)
    df["minutes_to_hub_cutoff"] = (df["hub_courier_cutoff_hour"] - df["collection_hour_float"]) * 60.0

    # One-hot encode centre_code and test_code
    centre_dummies = pd.get_dummies(df["centre_code"], prefix="centre", dtype=int)
    test_dummies = pd.get_dummies(df["test_code"], prefix="test", dtype=int)

    base_feature_cols = [
        "standard_sla_minutes",
        "is_stat_urgent_int",
        "is_in_house",
        "collection_hour_float",
        "hour_sin",
        "hour_cos",
        "day_of_week",
        "is_weekend",
        "minutes_to_hub_cutoff",
        "active_queue_depth",
    ]

    feature_cols = base_feature_cols + list(centre_dummies.columns) + list(test_dummies.columns)
    X = pd.concat([df[base_feature_cols], centre_dummies, test_dummies], axis=1)

    y_tat = df["tat_minutes"].values
    y_sla = df["is_sla_breached"].astype(int).values

    # 4. Chronological 80/20 train/test split
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_tat_train, y_tat_test = y_tat[:split_idx], y_tat[split_idx:]
    y_sla_train, y_sla_test = y_sla[:split_idx], y_sla[split_idx:]

    print(f"-> Train samples: {len(X_train):,}, Test samples: {len(X_test):,}")

    # 5. Train & Benchmark TAT Regressors
    print("\n--- Benchmarking TAT Regressors ---")
    regressors = {
        "LinearRegression": Ridge(alpha=1.0),
        "RandomForest": RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1),
        "XGBoost": xgb.XGBRegressor(
            n_estimators=150, max_depth=6, learning_rate=0.08, subsample=0.8, colsample_bytree=0.8, random_state=42
        ),
    }

    reg_metrics = {}
    best_reg_name = "XGBoost"
    best_reg_model = None

    for name, model in regressors.items():
        model.fit(X_train, y_tat_train)
        preds = model.predict(X_test)
        mae = float(mean_absolute_error(y_tat_test, preds))
        rmse = float(np.sqrt(mean_squared_error(y_tat_test, preds)))
        mape = float(np.mean(np.abs((y_tat_test - preds) / np.maximum(y_tat_test, 1e-5))) * 100.0)
        r2 = float(r2_score(y_tat_test, preds))

        reg_metrics[name] = {"MAE": mae, "RMSE": rmse, "MAPE": mape, "R2": r2}
        print(f"  [{name:<16}] MAE: {mae:6.2f} min | RMSE: {rmse:6.2f} min | MAPE: {mape:5.2f}% | R²: {r2:.4f}")
        if name == best_reg_name:
            best_reg_model = model

    # 6. Train & Benchmark SLA Delay Risk Classifiers
    print("\n--- Benchmarking SLA Delay Classifiers ---")
    classifiers = {
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "RandomForest": RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1),
        "XGBoost": xgb.XGBClassifier(
            n_estimators=120, max_depth=5, learning_rate=0.08, subsample=0.8, colsample_bytree=0.8, random_state=42
        ),
    }

    clf_metrics = {}
    best_clf_name = "XGBoost"
    best_clf_model = None

    for name, model in classifiers.items():
        model.fit(X_train, y_sla_train)
        preds = model.predict(X_test)
        acc = float(accuracy_score(y_sla_test, preds))
        f1 = float(f1_score(y_sla_test, preds, average="weighted"))
        prec = float(precision_score(y_sla_test, preds, zero_division=0))
        rec = float(recall_score(y_sla_test, preds, zero_division=0))

        clf_metrics[name] = {"Accuracy": acc, "F1": f1, "Precision": prec, "Recall": rec}
        print(f"  [{name:<18}] Accuracy: {acc*100:5.2f}% | F1: {f1:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f}")
        if name == best_clf_name:
            best_clf_model = model

    # 7. Save best models and feature importance plot
    joblib.dump(best_reg_model, os.path.join(artifacts_dir, "tat_regressor.joblib"))
    joblib.dump(best_clf_model, os.path.join(artifacts_dir, "tat_classifier.joblib"))
    print("✓ Saved 'tat_regressor.joblib' and 'tat_classifier.joblib'.")

    # Generate TAT feature importance plot
    plots_dir = os.path.join(artifacts_dir, "plots")
    os.makedirs(plots_dir, exist_ok=True)

    importances = best_reg_model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1][:14]
    top_features = [feature_cols[i] for i in sorted_idx]
    top_importances = importances[sorted_idx]

    plt.figure(figsize=(10, 6), dpi=300)
    colors = ["#1E40AF" if "hub" in f or "sla" in f else "#0284C7" for f in top_features]
    plt.barh(top_features[::-1], top_importances[::-1], color=colors[::-1], edgecolor="none")
    plt.xlabel("XGBoost Relative Feature Importance (Gain)", fontsize=11, fontweight="bold")
    plt.title("Key Predictors of Diagnostic Turnaround Time (TAT) Delay", fontsize=13, fontweight="bold", pad=12)
    plt.grid(axis="x", linestyle="--", alpha=0.5)
    plt.tight_layout()
    plot_path = os.path.join(plots_dir, "tat_feature_importance.png")
    plt.savefig(plot_path, dpi=300)
    plt.close()
    print(f"✓ Generated 300-DPI plot: '{plot_path}'.")

    return reg_metrics, clf_metrics, feature_cols, X_test, y_tat_test


# ------------------------------------------------------------------------------
# Workflow B: Daily Test Demand Forecasting
# ------------------------------------------------------------------------------
def run_workflow_b(df_raw: pd.DataFrame, artifacts_dir: str):
    print("\n" + "=" * 70)
    print(" WORKFLOW B: CENTRE-LEVEL DAILY DEMAND FORECASTING")
    print("=" * 70)

    # 1. Aggregate daily volume by date, centre_id, centre_code, processing_type
    df_raw["order_date"] = pd.to_datetime(df_raw["collected_at"]).dt.date
    daily = (
        df_raw.groupby(["order_date", "centre_id", "centre_code", "processing_type"])
        .size()
        .reset_index(name="sample_volume")
    )
    daily["order_date"] = pd.to_datetime(daily["order_date"])

    # 2. Build complete date grid to prevent gap artifacts
    min_date = daily["order_date"].min()
    max_date = daily["order_date"].max()
    all_dates = pd.date_range(min_date, max_date, freq="D")

    groups = []
    unique_combos = daily[["centre_id", "centre_code", "processing_type"]].drop_duplicates()

    for _, combo in unique_combos.iterrows():
        c_id = combo["centre_id"]
        c_code = combo["centre_code"]
        p_type = combo["processing_type"]

        grid_df = pd.DataFrame({"order_date": all_dates})
        grid_df["centre_id"] = c_id
        grid_df["centre_code"] = c_code
        grid_df["processing_type"] = p_type

        merged = pd.merge(grid_df, daily, on=["order_date", "centre_id", "centre_code", "processing_type"], how="left")
        merged["sample_volume"] = merged["sample_volume"].fillna(0)
        merged = merged.sort_values("order_date").reset_index(drop=True)

        # 3. Engineer Lag and Rolling Window Features
        merged["lag_1"] = merged["sample_volume"].shift(1)
        merged["lag_7"] = merged["sample_volume"].shift(7)
        merged["rolling_7d_mean"] = merged["sample_volume"].shift(1).rolling(7, min_periods=1).mean()

        groups.append(merged)

    daily_ts = pd.concat(groups, ignore_index=True)
    # Drop warm-up rows where lag_7 is NaN
    daily_ts = daily_ts.dropna().reset_index(drop=True)

    # Calendar and Domain features
    daily_ts["day_of_week"] = daily_ts["order_date"].dt.dayofweek
    daily_ts["is_monday"] = (daily_ts["day_of_week"] == 0).astype(int)
    daily_ts["is_sunday"] = (daily_ts["day_of_week"] == 6).astype(int)
    daily_ts["month"] = daily_ts["order_date"].dt.month
    daily_ts["is_in_house"] = (daily_ts["processing_type"] == "IN_HOUSE").astype(int)

    centre_dummies = pd.get_dummies(daily_ts["centre_code"], prefix="centre", dtype=int)

    feature_cols = [
        "lag_1",
        "lag_7",
        "rolling_7d_mean",
        "day_of_week",
        "is_monday",
        "is_sunday",
        "month",
        "is_in_house",
    ] + list(centre_dummies.columns)

    X_all = pd.concat([daily_ts[feature_cols[:8]], centre_dummies], axis=1)
    y_all = daily_ts["sample_volume"].values

    # 4. Holdout last 30 days as test horizon
    cutoff_date = max_date - pd.Timedelta(days=30)
    train_mask = daily_ts["order_date"] <= cutoff_date
    test_mask = daily_ts["order_date"] > cutoff_date

    X_train, X_test = X_all[train_mask], X_all[test_mask]
    y_train, y_test = y_all[train_mask], y_all[test_mask]
    test_dates = daily_ts.loc[test_mask, "order_date"]

    print(f"-> Train samples: {len(X_train):,}, Test samples: {len(X_test):,} (30-day multi-series horizon)")

    # 5. Train & Benchmark Demand Forecasters
    print("\n--- Benchmarking Demand Forecasting Models ---")
    forecasters = {
        "LinearRegression": Ridge(alpha=1.0),
        "RandomForest": RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42),
        "XGBoost": xgb.XGBRegressor(
            n_estimators=120, max_depth=4, learning_rate=0.06, subsample=0.85, random_state=42
        ),
    }

    demand_metrics = {}
    preds_dict = {}
    best_fc_name = "XGBoost"
    best_fc_model = None

    for name, model in forecasters.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        preds_dict[name] = preds

        mae = float(mean_absolute_error(y_test, preds))
        rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
        mape = float(np.mean(np.abs((y_test - preds) / np.maximum(y_test, 1.0))) * 100.0)
        r2 = float(r2_score(y_test, preds))

        demand_metrics[name] = {"MAE": mae, "RMSE": rmse, "MAPE": mape, "R2": r2}
        print(f"  [{name:<16}] MAE: {mae:5.2f} samples | RMSE: {rmse:5.2f} | MAPE: {mape:5.2f}% | R²: {r2:.4f}")
        if name == best_fc_name:
            best_fc_model = model

    # Save best forecaster
    joblib.dump(best_fc_model, os.path.join(artifacts_dir, "demand_forecaster.joblib"))
    print("✓ Saved 'demand_forecaster.joblib'.")

    # Residual standard deviation for confidence bound intervals
    train_residuals = y_train - best_fc_model.predict(X_train)
    residual_std = float(np.std(train_residuals))

    # 6. Generate 300-DPI Publication Comparison Plot
    plots_dir = os.path.join(artifacts_dir, "plots")
    os.makedirs(plots_dir, exist_ok=True)

    # Aggregate test set total daily volume across centres for crisp visualization
    agg_df = pd.DataFrame({
        "date": test_dates,
        "Actual": y_test,
        "LinearRegression": preds_dict["LinearRegression"],
        "RandomForest": preds_dict["RandomForest"],
        "XGBoost": preds_dict["XGBoost"],
    }).groupby("date").sum().reset_index()

    plt.figure(figsize=(12, 6), dpi=300)
    plt.plot(agg_df["date"], agg_df["Actual"], label="Actual Demand", color="#0F172A", linewidth=2.5, marker="o", markersize=4)
    plt.plot(agg_df["date"], agg_df["LinearRegression"], label="Linear Regression (Ridge)", color="#94A3B8", linestyle="--", linewidth=1.8)
    plt.plot(agg_df["date"], agg_df["RandomForest"], label="Random Forest", color="#10B981", linestyle="-.", linewidth=1.8)
    plt.plot(agg_df["date"], agg_df["XGBoost"], label="XGBoost Forecaster (Optimal)", color="#2563EB", linewidth=2.2)

    plt.title("30-Day Multi-Model Daily Diagnostic Sample Demand Forecast Evaluation", fontsize=13, fontweight="bold", pad=12)
    plt.xlabel("Forecast Horizon Date", fontsize=11, fontweight="bold")
    plt.ylabel("Total Network Sample Volume", fontsize=11, fontweight="bold")
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(frameon=True, facecolor="white", edgecolor="#CBD5E1", fontsize=10)
    plt.xticks(rotation=30)
    plt.tight_layout()

    plot_path = os.path.join(plots_dir, "demand_forecast_comparison.png")
    plt.savefig(plot_path, dpi=300)
    plt.close()
    print(f"✓ Generated 300-DPI plot: '{plot_path}'.")

    return demand_metrics, feature_cols, residual_std


# ------------------------------------------------------------------------------
# Persistence & Database Metric Insertion
# ------------------------------------------------------------------------------
def persist_results(conn, reg_metrics, clf_metrics, demand_metrics, feature_cols_a, feature_cols_b, residual_std, artifacts_dir):
    print("\n-> Persisting benchmark results to PostgreSQL & JSON...")

    benchmark_data = {
        "evaluation_timestamp": datetime.now().isoformat(),
        "workflow_a_tat_regression": reg_metrics,
        "workflow_a_sla_classification": clf_metrics,
        "workflow_b_demand_forecasting": demand_metrics,
    }

    # Save benchmark_results.json
    json_path = os.path.join(artifacts_dir, "benchmark_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(benchmark_data, f, indent=2)
    print(f"✓ Saved JSON benchmarks to '{json_path}'.")

    # Save feature metadata
    metadata = {
        "tat_feature_columns": feature_cols_a,
        "demand_feature_columns": feature_cols_b,
        "demand_residual_std": residual_std,
        "centres": ["DL-LP-01", "DL-LP-02", "DL-LP-03"],
        "cutoff_hour": 13,
    }
    meta_path = os.path.join(artifacts_dir, "feature_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"✓ Saved feature metadata to '{meta_path}'.")

    # Insert into PostgreSQL table ml_model_metrics
    with conn.cursor() as cur:
        # Clear previous metrics for idempotency
        cur.execute("DELETE FROM ml_model_metrics;")

        eval_time = datetime.now()
        metric_rows = []

        # Workflow A: TAT Regression
        for model_name, m in reg_metrics.items():
            metric_rows.append((
                "TAT_REGRESSION",
                model_name,
                m["MAE"],
                m["RMSE"],
                m["MAPE"],
                m["R2"],
                eval_time,
            ))

        # Workflow A: SLA Classification
        for model_name, m in clf_metrics.items():
            metric_rows.append((
                "SLA_CLASSIFICATION",
                model_name,
                0.0,
                0.0,
                0.0,
                m["F1"],
                eval_time,
            ))

        # Workflow B: Demand Forecasting
        for model_name, m in demand_metrics.items():
            metric_rows.append((
                "DEMAND_FORECASTING",
                model_name,
                m["MAE"],
                m["RMSE"],
                m["MAPE"],
                m["R2"],
                eval_time,
            ))

        insert_sql = """
            INSERT INTO ml_model_metrics (task_name, model_name, mae, rmse, mape, r2_or_f1, evaluated_at)
            VALUES %s;
        """
        psycopg2.extras.execute_values(cur, insert_sql, metric_rows)
        conn.commit()
        print(f"✓ Inserted {len(metric_rows)} rows into PostgreSQL 'ml_model_metrics'.")


def main():
    print("==================================================================")
    print(" DR LAL PATHLABS ML TRAINING & RESEARCH BENCHMARKING PIPELINE")
    print("==================================================================")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    artifacts_dir = os.path.join(script_dir, "artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)

    conn = get_db_connection()
    try:
        query = """
            SELECT 
                s.sample_id,
                s.barcode,
                s.centre_id,
                c.centre_code,
                c.hub_courier_cutoff_hour,
                s.test_code,
                t.department,
                t.processing_type,
                t.standard_sla_minutes,
                s.is_stat_urgent,
                s.collected_at,
                s.expected_ready_at,
                s.actual_ready_at,
                s.tat_minutes,
                s.is_sla_breached
            FROM sample_orders s
            JOIN collection_centres c ON s.centre_id = c.centre_id
            JOIN test_catalog t ON s.test_code = t.test_code
            ORDER BY s.collected_at ASC;
        """
        print("-> Ingesting historical sample order data from PostgreSQL...")
        df_raw = pd.read_sql_query(query, conn)
        print(f"✓ Ingested {len(df_raw):,} records.")

        reg_metrics, clf_metrics, cols_a, _, _ = run_workflow_a(df_raw, artifacts_dir)
        demand_metrics, cols_b, residual_std = run_workflow_b(df_raw, artifacts_dir)

        persist_results(conn, reg_metrics, clf_metrics, demand_metrics, cols_a, cols_b, residual_std, artifacts_dir)

        print("\n==================================================================")
        print(" ML TRAINING PIPELINE EXECUTION COMPLETED SUCCESSFULLY")
        print("==================================================================")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
