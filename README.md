# 🌍 Global Defense Intelligence Visualization Platform (GDIVP)

A real-time, full-stack defense intelligence visualization platform featuring a 3D interactive globe, live tracking of aircraft and ships, AI-powered anomaly detection, and a tactical dark UI.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║         GLOBAL DEFENSE INTELLIGENCE VISUALIZATION PLATFORM (GDIVP)          ║
║                  REAL-TIME TRACKING & AI ANOMALY DETECTION                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📸 Screenshots & Demo

### Main Dashboard — Globe + Event Stream
![Main Dashboard](docs/screenshots/01_main_dashboard.png)

### Analytics Tab
![Analytics Tab](docs/screenshots/02_analytics_tab.png)

### Event Stream Tab
![Event Stream](docs/screenshots/03_event_stream_tab.png)

### Layer Controls — Satellites Enabled
![Satellites Layer On](docs/screenshots/04_layers_satellites_on.png)

### Layer Controls — Weather Enabled
![Weather Layer On](docs/screenshots/05_layers_weather_on.png)

### Globe Zoomed In
![Globe Zoomed](docs/screenshots/06_globe_zoomed.png)

### Full Layout Overview
![Full Layout](docs/screenshots/07_full_layout.png)

### 🎥 Demo Video
A full walkthrough video (`docs/demo_walkthrough.webm`) is included in the repository and demonstrates:
- Globe rotation and zoom
- Switching between Event Stream and Analytics tabs
- Toggling layer controls (Satellites, Weather)
- Real-time stats display

---

## 📋 Table of Contents

1. [Screenshots & Demo](#-screenshots--demo)
2. [Features](#-features)
3. [Architecture](#️-architecture)
4. [Technology Stack](#️-technology-stack)
5. [Prerequisites — What to Download & Install](#-prerequisites--what-to-download--install)
6. [Running Locally in VS Code Terminal](#-running-locally-in-vs-code-terminal)
   - [Method 1: Docker Compose (Recommended)](#method-1-docker-compose-recommended)
   - [Method 2: Manual Setup (Service by Service)](#method-2-manual-setup-service-by-service)
7. [Project Structure](#-project-structure)
8. [Environment Variables](#️-environment-variables)
9. [API Reference](#-api-reference)
10. [Globe Controls](#-globe-controls)
11. [Kubernetes Deployment](#️-kubernetes-deployment)
12. [Mock Data Simulation](#-mock-data-simulation)
13. [Data Flow](#-data-flow)
14. [Security Features](#-security-features)

---

## ✨ Features

- **3D Interactive Globe** — Canvas-based Earth visualization with drag-to-rotate, scroll-to-zoom, and click-to-inspect
- **Live Aircraft Tracking** — 120+ simulated aircraft with realistic position updates every 2 seconds
- **Live Ship Tracking** — 60+ simulated vessels with AIS-style data
- **AI Anomaly Detection** — Scikit-learn IsolationForest + rule-based engine detecting unusual movements
- **Real-time Alerts** — WebSocket-pushed alerts with severity classification (CRITICAL / HIGH / MEDIUM / LOW)
- **Event Stream** — Scrolling live log of all detected events with timestamps
- **Layer Controls** — Toggle Aircraft, Ships, Satellites, Weather, Earthquakes, News Events, Heatmap
- **Analytics Dashboard** — Live stats: count, event rate, anomalies, threat level with Recharts mini-charts
- **Tactical Dark UI** — Glassmorphism panels, neon glow, cyan/orange color scheme
- **Data Ingestion** — OpenSky Network (real aircraft) + USGS earthquakes with mock fallbacks
- **Redis Caching** — Graceful degradation if Redis is unavailable
- **Kubernetes Ready** — Full K8s manifests with health checks and resource limits
- **Monitoring** — Prometheus + Grafana dashboard

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Browser / Client                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              Next.js 14 Frontend (Port 3000)                     │   │
│  │  ┌──────────┐ ┌──────────────┐ ┌───────────┐ ┌──────────────┐  │   │
│  │  │ AlertBar │ │  LayerPanel  │ │   Globe   │ │ EventStream  │  │   │
│  │  │          │ │   (Toggles)  │ │  (Canvas) │ │  Analytics   │  │   │
│  │  └──────────┘ └──────────────┘ └───────────┘ └──────────────┘  │   │
│  └───────────────────────────┬──────────────────────────────────────┘   │
└──────────────────────────────│──────────────────────────────────────────┘
                               │ WebSocket (Socket.io) + REST
┌──────────────────────────────▼──────────────────────────────────────────┐
│                    API Gateway / Node.js (Port 4000)                     │
│   REST: /api/aircraft  /api/ships  /api/events  /api/alerts  /health    │
│   WebSocket: aircraft_update | ship_update | alert | new_event           │
│   ┌──────────┐  ┌─────────────┐  ┌──────────────────────────────────┐  │
│   │  Express │  │  Socket.io  │  │  Mock Data Generator (120 AC,    │  │
│   │  +Helmet │  │  Broadcast  │  │  60 Ships, Live Movement Sim)    │  │
│   └──────────┘  └─────────────┘  └──────────────────────────────────┘  │
└────────────────┬────────────────────────────┬───────────────────────────┘
                 │                            │
    ┌────────────▼────────────┐  ┌────────────▼────────────────────────┐
    │  Data Ingestion Service │  │      AI Engine / Python (5001)      │
    │   Python FastAPI (5000) │  │  IsolationForest Anomaly Detection  │
    │  OpenSky / USGS / AIS   │  │  Aircraft + Ship movement analysis  │
    │  with mock fallbacks    │  │  Rule-based + ML anomaly scoring    │
    └────────────┬────────────┘  └─────────────────────────────────────┘
                 │
    ┌────────────▼────────────┐  ┌─────────────────────────────────────┐
    │   Stream Processor      │  │  Infrastructure                     │
    │   Node.js (4001)        │  │  ┌──────────┐  ┌────────────────┐  │
    │   Event detection &     │  │  │  Redis   │  │   PostgreSQL   │  │
    │   Redis pub/sub         │  │  │  Cache   │  │   + PostGIS    │  │
    └─────────────────────────┘  │  └──────────┘  └────────────────┘  │
                                 │  ┌──────────┐  ┌────────────────┐  │
                                 │  │Prometheus│  │    Grafana     │  │
                                 │  │  (9090)  │  │    (3001)      │  │
                                 │  └──────────┘  └────────────────┘  │
                                 └─────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Visualization | HTML5 Canvas (custom 3D globe) |
| Real-time | Socket.io WebSockets |
| Charts | Recharts |
| Animations | Framer Motion |
| API Gateway | Node.js, Express, Socket.io |
| Data Ingestion | Python, FastAPI, aiohttp |
| AI Engine | Python, FastAPI, scikit-learn |
| Stream Processor | Node.js, Express |
| Cache | Redis 7 |
| Database | PostgreSQL 15 + PostGIS |
| Monitoring | Prometheus, Grafana |
| Container | Docker, Docker Compose |
| Orchestration | Kubernetes |

---

## 📦 Prerequisites — What to Download & Install

Before running the project locally, install the following tools. Click each link for the official download page.

### Required for Both Methods

| Tool | Version | Download | Notes |
|------|---------|----------|-------|
| **Git** | Latest | https://git-scm.com/downloads | Version control |
| **VS Code** | Latest | https://code.visualstudio.com/ | Code editor |

### Method 1 — Docker Compose (Easiest)

| Tool | Version | Download | Notes |
|------|---------|----------|-------|
| **Docker Desktop** | Latest | https://www.docker.com/products/docker-desktop/ | Includes Docker Engine + Compose |

> ✅ Docker Desktop is all you need for Method 1. Node.js and Python are **not** required.

### Method 2 — Manual Setup

| Tool | Version | Download | Notes |
|------|---------|----------|-------|
| **Node.js** | ≥ 18.x LTS | https://nodejs.org/en/download | Includes `npm`. Used for frontend, API Gateway, and Stream Processor |
| **Python** | ≥ 3.11 | https://www.python.org/downloads/ | Used for Data Ingestion and AI Engine. Check "Add to PATH" during install |
| **Redis** | 7.x | https://redis.io/docs/install/install-redis/ | In-memory cache. On Windows use [Redis for Windows](https://github.com/tporadowski/redis/releases) or WSL |

#### Recommended VS Code Extensions

Install these from the VS Code Extensions panel (`Ctrl+Shift+X`):

| Extension | ID | Purpose |
|-----------|----|---------|
| ESLint | `dbaeumer.vscode-eslint` | JavaScript/TypeScript linting |
| Prettier | `esbenp.prettier-vscode` | Code formatting |
| Python | `ms-python.python` | Python language support |
| Pylance | `ms-python.vscode-pylance` | Python IntelliSense |
| Docker | `ms-azuretools.vscode-docker` | Docker Compose integration |
| GitLens | `eamodio.gitlens` | Enhanced Git support |
| Tailwind CSS IntelliSense | `bradlc.vscode-tailwindcss` | Tailwind class autocomplete |

---

## 🚀 Running Locally in VS Code Terminal

Open VS Code, clone the repository, and open a **Terminal** (`Ctrl+` `` ` `` or **Terminal → New Terminal**).

### Step 0 — Clone the Repository

```bash
git clone https://github.com/Harshitkashyap2027/Global-Defense-Intelligence-Visualization-Platform.git
cd Global-Defense-Intelligence-Visualization-Platform
```

Then open the folder in VS Code:

```bash
code .
```

---

### Method 1: Docker Compose (Recommended)

This method starts **all services with a single command**. No Node.js or Python installation needed.

**Prerequisite:** Docker Desktop must be running.

#### 1. Start All Services

```bash
docker compose up -d
```

This builds and starts:
- `frontend` → http://localhost:3000
- `api-gateway` → http://localhost:4000
- `data-ingestion` → http://localhost:5000
- `ai-engine` → http://localhost:5001
- `stream-processor` → http://localhost:4001
- `redis` → localhost:6379
- `postgres` → localhost:5432
- `prometheus` → http://localhost:9090
- `grafana` → http://localhost:3001 (login: `admin` / `admin`)

#### 2. Check Logs

```bash
# Follow logs for all services
docker compose logs -f

# Follow logs for a specific service
docker compose logs -f api-gateway
docker compose logs -f frontend
```

#### 3. Stop All Services

```bash
docker compose down
```

To also remove stored data volumes:

```bash
docker compose down -v
```

> **Note:** The platform works fully offline with mock data. No external API keys are required for basic operation.

---

### Method 2: Manual Setup (Service by Service)

Use this method if you want to run services individually for development, hot-reloading, and debugging.

Open **multiple terminal tabs** in VS Code (click **+** in the terminal panel) — one per service.

#### Step 1 — Set Up Environment Files

Copy the example environment files in each service directory:

```bash
# API Gateway
cp services/api-gateway/.env.example services/api-gateway/.env

# Data Ingestion
cp services/data-ingestion/.env.example services/data-ingestion/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

#### Step 2 — Start Redis (Required by API Gateway, Data Ingestion, Stream Processor)

**Option A — Docker (easiest, no Redis install needed):**
```bash
docker run -d --name gdivp-redis -p 6379:6379 redis:7-alpine
```

**Option B — Native Redis (if installed locally):**
```bash
redis-server
```

#### Step 3 — Start API Gateway (Terminal Tab 1)

```bash
cd services/api-gateway
npm install
npm run dev
```

> Runs at http://localhost:4000 with hot reload via nodemon.

#### Step 4 — Start Data Ingestion Service (Terminal Tab 2)

```bash
cd services/data-ingestion
pip install -r requirements.txt
uvicorn main:app --reload --port 5000
```

> Runs at http://localhost:5000

#### Step 5 — Start AI Engine (Terminal Tab 3)

```bash
cd services/ai-engine
pip install -r requirements.txt
uvicorn main:app --reload --port 5001
```

> Runs at http://localhost:5001

#### Step 6 — Start Stream Processor (Terminal Tab 4)

```bash
cd services/stream-processor
npm install
npm run dev
```

> Runs at http://localhost:4001

#### Step 7 — Start Frontend (Terminal Tab 5)

```bash
cd frontend
npm install
npm run dev
```

> Runs at http://localhost:3000 — **open this in your browser to use the dashboard.**

#### Start Order Summary

| Order | Service | Directory | Command | Port |
|-------|---------|-----------|---------|------|
| 1 | Redis | — | `docker run -d --name gdivp-redis -p 6379:6379 redis:7-alpine` | 6379 |
| 2 | API Gateway | `services/api-gateway` | `npm install && npm run dev` | 4000 |
| 3 | Data Ingestion | `services/data-ingestion` | `pip install -r requirements.txt && uvicorn main:app --reload --port 5000` | 5000 |
| 4 | AI Engine | `services/ai-engine` | `pip install -r requirements.txt && uvicorn main:app --reload --port 5001` | 5001 |
| 5 | Stream Processor | `services/stream-processor` | `npm install && npm run dev` | 4001 |
| 6 | Frontend | `frontend` | `npm install && npm run dev` | 3000 |

---

## 📁 Project Structure

```
├── frontend/                    # Next.js 14 + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Main dashboard
│   │   │   └── layout.tsx       # Root layout
│   │   ├── components/
│   │   │   ├── Globe.tsx        # Canvas 3D globe
│   │   │   ├── AlertBar.tsx     # Top alert ticker
│   │   │   ├── LayerPanel.tsx   # Layer toggles sidebar
│   │   │   ├── EventStream.tsx  # Live event log
│   │   │   └── AnalyticsDashboard.tsx
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts  # Socket.io hook
│   │   └── types/
│   │       └── index.ts         # TypeScript types
│   ├── .env.example             # Frontend environment template
│   └── Dockerfile
│
├── services/
│   ├── api-gateway/             # Node.js + Express + Socket.io (Port 4000)
│   │   ├── src/
│   │   │   ├── index.js         # Main server
│   │   │   └── mockData.js      # Data simulator
│   │   ├── .env.example
│   │   └── Dockerfile
│   │
│   ├── data-ingestion/          # Python FastAPI (Port 5000)
│   │   ├── main.py              # OpenSky, USGS, AIS ingestion
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── ai-engine/               # Python FastAPI + scikit-learn (Port 5001)
│   │   ├── main.py              # IsolationForest anomaly detection
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── stream-processor/        # Node.js event processor (Port 4001)
│       ├── src/index.js
│       └── Dockerfile
│
├── infrastructure/
│   ├── kubernetes/              # K8s manifests
│   └── monitoring/              # Prometheus + Grafana config
│
└── docker-compose.yml
```

---

## ⚙️ Environment Variables

### API Gateway (`services/api-gateway/.env`)

```env
PORT=4000
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://gdivp:password@localhost:5432/gdivp
DATA_INGESTION_URL=http://localhost:5000
AI_ENGINE_URL=http://localhost:5001
CORS_ORIGIN=http://localhost:3000
```

### Data Ingestion (`services/data-ingestion/.env`)

```env
REDIS_URL=redis://localhost:6379
OPENSKY_USERNAME=        # Optional: free account at opensky-network.org
OPENSKY_PASSWORD=        # Optional: enables real flight data
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

---

## 🔌 API Reference

### API Gateway (Port 4000)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| GET | `/api/aircraft` | All tracked aircraft |
| GET | `/api/ships` | All tracked ships |
| GET | `/api/events` | Recent events (limit query param) |
| GET | `/api/alerts` | Active alerts |
| GET | `/api/stats` | Platform statistics |
| POST | `/api/alerts/:id/acknowledge` | Acknowledge an alert |

### WebSocket Events (Socket.io)

| Event (server → client) | Payload | Description |
|------------------------|---------|-------------|
| `init` | `{aircraft, ships, alerts, events}` | Initial state on connect |
| `aircraft_update` | `Aircraft[]` | Full aircraft list update (every 2s) |
| `ship_update` | `Ship[]` | Full ship list update (every 2s) |
| `alert` | `Alert` | New alert |
| `new_event` | `GlobeEvent` | New tracked event |
| `stats_update` | `Stats` | Platform statistics |
| `alert_acknowledged` | `{id}` | Alert was acknowledged |

| Event (client → server) | Payload | Description |
|------------------------|---------|-------------|
| `acknowledge_alert` | `alertId: string` | Acknowledge an alert |

### AI Engine (Port 5001)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| POST | `/analyze/aircraft` | `{objects: Aircraft[]}` → anomaly scores |
| POST | `/analyze/ships` | `{objects: Ship[]}` → anomaly scores |
| GET | `/alerts/active` | AI-generated active alerts |
| POST | `/model/retrain` | Retrain ML models |

### Data Ingestion (Port 5000)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| GET | `/ingest/aircraft` | Aircraft data (OpenSky/mock) |
| GET | `/ingest/ships` | Ship data (AIS/mock) |
| GET | `/ingest/earthquakes` | USGS earthquake data |
| GET | `/ingest/weather` | Weather data (mock) |

---

## 🎮 Globe Controls

| Action | Control |
|--------|---------|
| Rotate globe | Click + drag |
| Zoom in/out | Scroll wheel |
| Inspect object | Click on dot |
| Dismiss selection | Click × button |

---

## ☸️ Kubernetes Deployment

```bash
# Create namespace and deploy
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/redis-deployment.yaml
kubectl apply -f infrastructure/kubernetes/postgres-deployment.yaml
kubectl apply -f infrastructure/kubernetes/api-gateway-deployment.yaml
kubectl apply -f infrastructure/kubernetes/frontend-deployment.yaml
kubectl apply -f infrastructure/kubernetes/ingress.yaml

# Check status
kubectl -n gdivp get pods
kubectl -n gdivp get services
```

---

## 📊 Mock Data Simulation

The platform runs fully standalone without external APIs:

- **120 aircraft** with realistic initial positions distributed globally
- **60 ships** in major shipping lanes
- Aircraft move based on speed + heading, updated every 2 seconds
- ~2% of objects randomly enter ANOMALY state per cycle
- New events generated every 10 seconds
- Alerts refreshed every 60 seconds
- All positions use great-circle movement math

---

## 🔄 Data Flow

```
Mock/OpenSky → Data Ingestion → Redis Cache → API Gateway
                                                    │
                                              Socket.io WS
                                                    │
                              ┌─────────────────────▼──────────────────────┐
                              │              Next.js Frontend               │
                              │  useWebSocket hook → React State → Canvas  │
                              └────────────────────────────────────────────┘
```

---

## 🔒 Security Features

- Helmet.js security headers on all Node.js services
- Rate limiting: 1000 req / 15 min per IP on API endpoints
- CORS configured per environment
- Docker containers run as non-root users
- Kubernetes secrets for database credentials
