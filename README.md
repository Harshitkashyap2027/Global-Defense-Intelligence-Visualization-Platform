# 🌍 Global Defense Intelligence Visualization Platform (GDIVP)

A real-time, full-stack defense intelligence visualization platform featuring a 3D interactive globe, live tracking of aircraft and ships, AI-powered anomaly detection, and tactical dark UI.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║         GLOBAL DEFENSE INTELLIGENCE VISUALIZATION PLATFORM (GDIVP)          ║
║                  REAL-TIME TRACKING & AI ANOMALY DETECTION                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

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

## ✨ Features

- **3D Interactive Globe** — Canvas-based Earth visualization with drag-to-rotate, scroll-to-zoom, and click-to-inspect
- **Live Aircraft Tracking** — 120+ simulated aircraft with realistic position updates every 2 seconds
- **Live Ship Tracking** — 60+ simulated vessels with AIS-style data
- **AI Anomaly Detection** — Scikit-learn IsolationForest + rule-based engine detecting unusual movements
- **Real-time Alerts** — WebSocket-pushed alerts with severity classification (CRITICAL/HIGH/MEDIUM/LOW)
- **Event Stream** — Scrolling live log of all detected events with timestamps
- **Layer Controls** — Toggle Aircraft, Ships, Satellites, Weather, Earthquakes, News Events, Heatmap
- **Analytics Dashboard** — Live stats: count, event rate, anomalies, threat level with recharts mini-charts
- **Tactical Dark UI** — Glassmorphism panels, neon glow, cyan/orange color scheme
- **Data Ingestion** — OpenSky Network (real aircraft) + USGS earthquakes with mock fallbacks
- **Redis Caching** — Graceful degradation if Redis unavailable
- **Kubernetes Ready** — Full K8s manifests with health checks and resource limits
- **Monitoring** — Prometheus + Grafana dashboard

## 🚀 Quick Start (Docker Compose)

```bash
# Clone the repo
git clone <repo-url>
cd Global-Defense-Intelligence-Visualization-Platform

# Start all services
docker compose up -d

# View logs
docker compose logs -f api-gateway

# Access services
open http://localhost:3000    # Frontend (GDIVP Dashboard)
open http://localhost:4000    # API Gateway
open http://localhost:5000    # Data Ingestion
open http://localhost:5001    # AI Engine
open http://localhost:9090    # Prometheus
open http://localhost:3001    # Grafana (admin/admin)
```

> **Note:** The platform works fully offline with mock data. No external API keys required for basic operation.

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
│   └── Dockerfile
│
├── services/
│   ├── api-gateway/             # Node.js + Express + Socket.io
│   │   └── src/
│   │       ├── index.js         # Main server
│   │       └── mockData.js      # Data simulator
│   │
│   ├── data-ingestion/          # Python FastAPI
│   │   └── main.py              # OpenSky, USGS, AIS ingestion
│   │
│   ├── ai-engine/               # Python FastAPI + scikit-learn
│   │   └── main.py              # IsolationForest anomaly detection
│   │
│   └── stream-processor/        # Node.js event processor
│       └── src/index.js
│
├── infrastructure/
│   ├── kubernetes/              # K8s manifests
│   └── monitoring/              # Prometheus + Grafana
│
└── docker-compose.yml
```

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

| Event (server→client) | Payload | Description |
|----------------------|---------|-------------|
| `init` | `{aircraft, ships, alerts, events}` | Initial state on connect |
| `aircraft_update` | `Aircraft[]` | Full aircraft list update (2s) |
| `ship_update` | `Ship[]` | Full ship list update (2s) |
| `alert` | `Alert` | New alert |
| `new_event` | `GlobeEvent` | New tracked event |
| `stats_update` | `Stats` | Platform statistics |
| `alert_acknowledged` | `{id}` | Alert was acknowledged |

| Event (client→server) | Payload | Description |
|----------------------|---------|-------------|
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

## ⚙️ Environment Variables

### API Gateway (`services/api-gateway/.env.example`)
```env
PORT=4000
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://gdivp:password@localhost:5432/gdivp
DATA_INGESTION_URL=http://localhost:5000
AI_ENGINE_URL=http://localhost:5001
CORS_ORIGIN=http://localhost:3000
```

### Data Ingestion (`services/data-ingestion/.env.example`)
```env
REDIS_URL=redis://localhost:6379
OPENSKY_USERNAME=        # Optional: free account at opensky-network.org
OPENSKY_PASSWORD=        # Optional: enables real flight data
```

### Frontend (`frontend/.env.example`)
```env
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

## 🐳 Development Setup

```bash
# API Gateway
cd services/api-gateway
npm install
npm run dev  # nodemon hot reload

# Data Ingestion
cd services/data-ingestion
pip install -r requirements.txt
uvicorn main:app --reload --port 5000

# AI Engine
cd services/ai-engine
pip install -r requirements.txt
uvicorn main:app --reload --port 5001

# Stream Processor
cd services/stream-processor
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:3000
```

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

## 🎮 Globe Controls

| Action | Control |
|--------|---------|
| Rotate globe | Click + drag |
| Zoom in/out | Scroll wheel |
| Inspect object | Click on dot |
| Dismiss selection | Click × button |

## 🔒 Security Features

- Helmet.js security headers on all Node.js services
- Rate limiting: 1000 req/15min per IP on API endpoints
- CORS configured per environment
- Docker containers run as non-root users
- Kubernetes secrets for database credentials

## 📊 Mock Data Simulation

The platform runs fully standalone without external APIs:

- **120 aircraft** with realistic initial positions distributed globally
- **60 ships** in major shipping lanes
- Aircraft move based on speed + heading, updated every 2 seconds
- ~2% of objects randomly enter ANOMALY state per cycle
- New events generated every 10 seconds
- Alerts refreshed every 60 seconds
- All positions use great-circle movement math

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
