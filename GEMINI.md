# Architectural Specification: AI-Powered Diagnostic Centre Operations Intelligence and Workflow Optimization System (Dr Lal PathLabs Franchise Analytics)

## 1. Overview
The **AI-Powered Diagnostic Centre Operations Intelligence and Workflow Optimization System** is an enterprise-grade operational intelligence platform designed for diagnostic centre franchises (modeled on Dr Lal PathLabs franchise operations). The system monitors test processing lifecycles, forecasts sample demand, dynamically triages SLA breaches using customized data structures, and simulates laboratory workflow optimizations.

---

## 2. System Architecture & Component Contracts

### 2.1 Database (PostgreSQL)
- **Directory**: `database/`
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `diagnostic_ops`
- **User**: `postgres`
- **Password**: `postgres`
- **Role**: Source of truth for patient records, test orders, diagnostic sample tracking, equipment registries, franchise operational parameters, and historical metrics.

---

### 2.2 Core Backend (`backend-spring/`)
- **Technology Stack**: Java 17+, Spring Boot 3.x, Maven
- **Port**: `8080`
- **Base Path**: `/api/v1`
- **Role**: Central orchestrator managing persistence, business logic, analytics APIs, ML microservice proxying, and high-performance in-memory stateful data structure implementations.
- **Stateful In-Memory DSA Requirements**:
  - `PriorityQueue`: Real-time SLA breach triage and dynamic priority dispatching based on specimen urgency, expiry, and patient critical thresholds.
  - `ArrayDeque`: Sliding-window calculation engine for real-time rolling turnaround time (TAT) and streaming hourly sample throughput volume.
  - `HashMap`: Frequency mapping and hot-lookup cache for diagnostic test codes, equipment utilization frequencies, and operational bottlenecks.
  - `Queue` + `Comparator`: Priority-based simulation queue for laboratory resource scheduling and multi-stage workflow optimization analysis.

---

### 2.3 ML Microservice (`ml-service-python/`)
- **Technology Stack**: Python 3.10+, FastAPI, Uvicorn, scikit-learn, XGBoost, pandas, numpy
- **Port**: `8000`
- **Role**: Dedicated predictive intelligence microservice performing turnaround time inference and diagnostic demand forecasting.
- **Exposed Endpoints**:
  - `POST /ml/predict-tat`: Turnaround time prediction based on test category, sample priority, queue depth, equipment load, and phlebotomy logistics (Random Forest / XGBoost models).
  - `POST /ml/forecast-demand`: Diagnostic test order demand forecasting over customizable temporal horizons (Linear Regression / Random Forest / XGBoost models).

---

### 2.4 Frontend (`frontend-react/`)
- **Technology Stack**: React, Vite, Tailwind CSS, Recharts, Lucide Icons, Axios
- **Port**: `5173`
- **Connection Contract**: Strictly connects to the Core Backend API only (`http://localhost:8080/api/v1`). Direct communication with the ML microservice is prohibited (all ML inferences are brokered via the Spring Boot gateway).
- **Role**: Executive dashboard providing real-time operational visibility, interactive SLA triage queues, rolling TAT charts, demand forecasting visualizers, and laboratory workflow simulation controls.

---

## 3. Monorepo Directory Structure

```
diagnostic-ops-intelligence/
├── GEMINI.md
├── database/
│   └── .gitkeep
├── backend-spring/
│   └── .gitkeep
├── ml-service-python/
│   └── .gitkeep
└── frontend-react/
    └── .gitkeep
```
