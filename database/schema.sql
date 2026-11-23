-- ==============================================================================
-- AI-Powered Diagnostic Centre Operations Intelligence and Workflow Optimization System
-- Dr Lal PathLabs Franchise Analytics - Database Schema
-- Target Database: PostgreSQL (diagnostic_ops)
-- ==============================================================================

-- Drop tables with CASCADE in reverse dependency order
DROP TABLE IF EXISTS ml_model_metrics CASCADE;
DROP TABLE IF EXISTS ml_demand_forecasts CASCADE;
DROP TABLE IF EXISTS sample_status_events CASCADE;
DROP TABLE IF EXISTS sample_orders CASCADE;
DROP TABLE IF EXISTS test_catalog CASCADE;
DROP TABLE IF EXISTS collection_centres CASCADE;

-- 1. Collection Centres Table
CREATE TABLE collection_centres (
    centre_id SERIAL PRIMARY KEY,
    centre_code VARCHAR(50) UNIQUE NOT NULL,
    centre_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    hub_courier_cutoff_hour INT NOT NULL DEFAULT 13,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Test Catalog Table
CREATE TABLE test_catalog (
    test_code VARCHAR(50) PRIMARY KEY,
    test_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    processing_type VARCHAR(50) NOT NULL CHECK (processing_type IN ('IN_HOUSE', 'EXTERNAL_HUB')),
    standard_sla_minutes INT NOT NULL,
    price_inr NUMERIC(10, 2) NOT NULL
);

-- 3. Diagnostic Sample Orders Table
CREATE TABLE sample_orders (
    sample_id BIGSERIAL PRIMARY KEY,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    centre_id INT NOT NULL REFERENCES collection_centres(centre_id) ON DELETE CASCADE,
    test_code VARCHAR(50) NOT NULL REFERENCES test_catalog(test_code) ON DELETE CASCADE,
    is_stat_urgent BOOLEAN NOT NULL DEFAULT FALSE,
    current_status VARCHAR(50) NOT NULL CHECK (
        current_status IN (
            'COLLECTED',
            'ACCESSIONED',
            'IN_HOUSE_PROCESSING',
            'DISPATCHED_TO_HUB',
            'REPORT_GENERATED',
            'DELIVERED'
        )
    ),
    collected_at TIMESTAMP NOT NULL,
    expected_ready_at TIMESTAMP NOT NULL,
    actual_ready_at TIMESTAMP NULL,
    tat_minutes INT NULL,
    is_sla_breached BOOLEAN NOT NULL DEFAULT FALSE
);

-- 4. Sample Status Audit Events Table
CREATE TABLE sample_status_events (
    event_id BIGSERIAL PRIMARY KEY,
    sample_id BIGINT NOT NULL REFERENCES sample_orders(sample_id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP NOT NULL,
    remarks TEXT
);

-- 5. ML Demand Forecasts Table
CREATE TABLE ml_demand_forecasts (
    forecast_id BIGSERIAL PRIMARY KEY,
    forecast_date DATE NOT NULL,
    centre_id INT NOT NULL REFERENCES collection_centres(centre_id) ON DELETE CASCADE,
    processing_type VARCHAR(50) NOT NULL,
    predicted_volume INT NOT NULL,
    lower_bound INT NOT NULL,
    upper_bound INT NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ML Model Evaluation Metrics Table
CREATE TABLE ml_model_metrics (
    metric_id BIGSERIAL PRIMARY KEY,
    task_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    mae DOUBLE PRECISION NOT NULL,
    rmse DOUBLE PRECISION NOT NULL,
    mape DOUBLE PRECISION NOT NULL,
    r2_or_f1 DOUBLE PRECISION NOT NULL,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- High-Performance Query & Analytics Indexes
-- ==============================================================================

CREATE INDEX idx_sample_orders_centre_id ON sample_orders(centre_id);
CREATE INDEX idx_sample_orders_test_code ON sample_orders(test_code);
CREATE INDEX idx_sample_orders_current_status ON sample_orders(current_status);
CREATE INDEX idx_sample_orders_collected_at ON sample_orders(collected_at);
CREATE INDEX idx_sample_orders_expected_ready_at ON sample_orders(expected_ready_at);
CREATE INDEX idx_sample_orders_is_sla_breached ON sample_orders(is_sla_breached);
CREATE INDEX idx_sample_orders_triage ON sample_orders(current_status, is_stat_urgent, expected_ready_at);

CREATE INDEX idx_sample_status_events_sample_id ON sample_status_events(sample_id);
CREATE INDEX idx_sample_status_events_changed_at ON sample_status_events(changed_at);

CREATE INDEX idx_ml_demand_forecasts_date_centre ON ml_demand_forecasts(forecast_date, centre_id);
CREATE INDEX idx_ml_model_metrics_task_name ON ml_model_metrics(task_name);
