import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-engine")

app = FastAPI(title="GDIVP AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ───────────────────────────────────────────────────────────────────

class AircraftData(BaseModel):
    id: str
    lat: float
    lng: float
    altitude: float
    speed: float
    heading: float
    callsign: Optional[str] = None
    country: Optional[str] = None


class ShipData(BaseModel):
    id: str
    lat: float
    lng: float
    speed: float
    heading: float
    name: Optional[str] = None
    country: Optional[str] = None


class AnalysisRequest(BaseModel):
    objects: List[Dict]


class AnomalyResult(BaseModel):
    id: str
    anomaly_score: float
    is_anomaly: bool
    classification: str
    reasons: List[str]
    confidence: float


# ── Isolation Forest Models ──────────────────────────────────────────────────

aircraft_model: Optional[IsolationForest] = None
ship_model: Optional[IsolationForest] = None
active_alerts: List[Dict] = []


def train_aircraft_model():
    global aircraft_model
    # Synthetic training data: [altitude, speed, heading_change, lat_variance]
    normal_data = np.array([
        [random.uniform(5000, 42000), random.uniform(400, 950),
         random.uniform(0, 10), random.uniform(0, 2)]
        for _ in range(500)
    ])
    aircraft_model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    aircraft_model.fit(normal_data)
    logger.info("Aircraft anomaly model trained")


def train_ship_model():
    global ship_model
    normal_data = np.array([
        [random.uniform(0, 25), random.uniform(0, 5),
         random.uniform(0, 3), random.uniform(0, 1)]
        for _ in range(300)
    ])
    ship_model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    ship_model.fit(normal_data)
    logger.info("Ship anomaly model trained")


@app.on_event("startup")
async def startup():
    train_aircraft_model()
    train_ship_model()
    asyncio.create_task(alert_maintenance_loop())


# ── Rule-based checks ────────────────────────────────────────────────────────

def check_aircraft_rules(obj: Dict) -> List[str]:
    reasons = []
    alt = obj.get("altitude", 0)
    speed = obj.get("speed", 0)
    lat = abs(obj.get("lat", 0))

    if alt > 45000:
        reasons.append(f"Extreme altitude: {alt}ft (threshold: 45000ft)")
    if alt < 1000 and speed > 300:
        reasons.append(f"Low altitude high speed: {alt}ft at {speed}kts")
    if speed > 1000:
        reasons.append(f"Supersonic speed detected: {speed}kts")
    if speed < 50 and alt > 10000:
        reasons.append(f"Near-stall speed at altitude: {speed}kts at {alt}ft")
    if lat > 80:
        reasons.append(f"Operating in extreme polar region: {lat}° latitude")

    return reasons


def check_ship_rules(obj: Dict) -> List[str]:
    reasons = []
    speed = obj.get("speed", 0)

    if speed > 40:
        reasons.append(f"Extreme speed for vessel: {speed}kts (threshold: 40kts)")
    if speed > 30:
        reasons.append(f"High speed vessel movement: {speed}kts")

    return reasons


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "ai-engine",
        "models": {
            "aircraft": aircraft_model is not None,
            "ship": ship_model is not None,
        },
        "active_alerts": len(active_alerts),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/analyze/aircraft")
async def analyze_aircraft(request: AnalysisRequest):
    if not aircraft_model:
        raise HTTPException(status_code=503, detail="Aircraft model not ready")

    results = []
    new_alerts = []

    for obj in request.objects:
        alt = float(obj.get("altitude", 10000))
        speed = float(obj.get("speed", 500))
        heading = float(obj.get("heading", 0))
        lat = float(obj.get("lat", 0))
        heading_change = abs(heading - 180) / 180.0
        lat_var = abs(lat) / 90.0

        features = np.array([[alt, speed, heading_change * 10, lat_var * 2]])
        score = aircraft_model.decision_function(features)[0]
        prediction = aircraft_model.predict(features)[0]
        normalized_score = float(1 - (score + 0.5))
        is_anomaly = prediction == -1 or normalized_score > 0.7

        rule_reasons = check_aircraft_rules(obj)
        if rule_reasons:
            is_anomaly = True

        classification = "NOMINAL"
        if is_anomaly:
            if normalized_score > 0.85 or len(rule_reasons) >= 2:
                classification = "CRITICAL_ANOMALY"
            elif normalized_score > 0.7 or len(rule_reasons) == 1:
                classification = "ANOMALY"
            else:
                classification = "SUSPICIOUS"

        if is_anomaly:
            alert = {
                "id": str(uuid4()),
                "type": "AI_AIRCRAFT_ANOMALY",
                "severity": "HIGH" if classification == "CRITICAL_ANOMALY" else "MEDIUM",
                "subject": obj.get("callsign", obj.get("id", "Unknown")),
                "object_id": obj.get("id"),
                "anomaly_score": round(normalized_score, 3),
                "classification": classification,
                "reasons": rule_reasons,
                "lat": obj.get("lat", 0),
                "lng": obj.get("lng", 0),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "active": True,
            }
            new_alerts.append(alert)

        results.append({
            "id": obj.get("id", str(uuid4())),
            "anomaly_score": round(normalized_score, 3),
            "is_anomaly": is_anomaly,
            "classification": classification,
            "reasons": rule_reasons,
            "confidence": round(min(abs(score) * 2, 1.0), 3),
        })

    active_alerts.extend(new_alerts)
    if len(active_alerts) > 100:
        active_alerts[:] = active_alerts[-100:]

    return {
        "analyzed": len(results),
        "anomalies": sum(1 for r in results if r["is_anomaly"]),
        "new_alerts": len(new_alerts),
        "results": results,
    }


@app.post("/analyze/ships")
async def analyze_ships(request: AnalysisRequest):
    if not ship_model:
        raise HTTPException(status_code=503, detail="Ship model not ready")

    results = []
    new_alerts = []

    for obj in request.objects:
        speed = float(obj.get("speed", 10))
        heading = float(obj.get("heading", 0))
        heading_change = abs(heading - 180) / 180.0
        speed_variance = speed / 35.0

        features = np.array([[speed, heading_change * 5, speed_variance * 2, abs(float(obj.get("lat", 0))) / 90.0]])
        score = ship_model.decision_function(features)[0]
        prediction = ship_model.predict(features)[0]
        normalized_score = float(1 - (score + 0.5))
        is_anomaly = prediction == -1 or normalized_score > 0.7

        rule_reasons = check_ship_rules(obj)
        if rule_reasons:
            is_anomaly = True

        classification = "NOMINAL"
        if is_anomaly:
            classification = "CRITICAL_ANOMALY" if normalized_score > 0.85 else "ANOMALY"

        if is_anomaly:
            alert = {
                "id": str(uuid4()),
                "type": "AI_SHIP_ANOMALY",
                "severity": "HIGH" if classification == "CRITICAL_ANOMALY" else "MEDIUM",
                "subject": obj.get("name", obj.get("id", "Unknown")),
                "object_id": obj.get("id"),
                "anomaly_score": round(normalized_score, 3),
                "classification": classification,
                "reasons": rule_reasons,
                "lat": obj.get("lat", 0),
                "lng": obj.get("lng", 0),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "active": True,
            }
            new_alerts.append(alert)

        results.append({
            "id": obj.get("id", str(uuid4())),
            "anomaly_score": round(normalized_score, 3),
            "is_anomaly": is_anomaly,
            "classification": classification,
            "reasons": rule_reasons,
            "confidence": round(min(abs(score) * 2, 1.0), 3),
        })

    active_alerts.extend(new_alerts)
    if len(active_alerts) > 100:
        active_alerts[:] = active_alerts[-100:]

    return {
        "analyzed": len(results),
        "anomalies": sum(1 for r in results if r["is_anomaly"]),
        "new_alerts": len(new_alerts),
        "results": results,
    }


@app.get("/alerts/active")
async def get_active_alerts():
    return {
        "count": len([a for a in active_alerts if a.get("active")]),
        "alerts": [a for a in active_alerts if a.get("active")][-20:],
    }


@app.post("/alerts/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str):
    for alert in active_alerts:
        if alert["id"] == alert_id:
            alert["active"] = False
            return {"success": True}
    raise HTTPException(status_code=404, detail="Alert not found")


@app.post("/model/retrain")
async def retrain_models():
    train_aircraft_model()
    train_ship_model()
    return {"success": True, "message": "Models retrained successfully"}


async def alert_maintenance_loop():
    while True:
        await asyncio.sleep(3600)
        stale_cutoff = datetime.now(timezone.utc).timestamp() - 3600
        for alert in active_alerts:
            ts = datetime.fromisoformat(alert["timestamp"].replace("Z", "+00:00")).timestamp()
            if ts < stale_cutoff:
                alert["active"] = False
        logger.info(f"Alert maintenance: {len([a for a in active_alerts if a['active']])} active")
