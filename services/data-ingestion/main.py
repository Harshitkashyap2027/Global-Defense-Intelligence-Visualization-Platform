import asyncio
import json
import logging
import random
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

import aiohttp
import redis.asyncio as aioredis
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("data-ingestion")

app = FastAPI(title="GDIVP Data Ingestion Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
OPENSKY_USERNAME = os.getenv("OPENSKY_USERNAME", "")
OPENSKY_PASSWORD = os.getenv("OPENSKY_PASSWORD", "")

redis_client: Optional[aioredis.Redis] = None


@app.on_event("startup")
async def startup():
    global redis_client
    try:
        redis_client = aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        await redis_client.ping()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis unavailable: {e} - running without cache")
        redis_client = None
    asyncio.create_task(background_fetch_loop())


async def cache_get(key: str) -> Optional[Any]:
    if not redis_client:
        return None
    try:
        val = await redis_client.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


async def cache_set(key: str, value: Any, ttl: int = 30):
    if not redis_client:
        return
    try:
        await redis_client.setex(key, ttl, json.dumps(value))
    except Exception:
        pass


# ── Mock generators ──────────────────────────────────────────────────────────

AIRCRAFT_TYPES = ["B737", "B747", "A320", "A380", "F-16", "F-35", "C-130", "E-3", "P-8"]
SHIP_TYPES = ["Destroyer", "Carrier", "Submarine", "Frigate", "Cruiser", "Tanker", "Container"]
COUNTRIES = ["USA", "GBR", "FRA", "DEU", "JPN", "AUS", "CAN", "ITA", "CHN", "RUS", "IND"]


def mock_aircraft(count: int = 80) -> List[Dict]:
    return [
        {
            "id": str(uuid4()),
            "callsign": f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=3))}{random.randint(10,99)}",
            "type": random.choice(AIRCRAFT_TYPES),
            "country": random.choice(COUNTRIES),
            "lat": round(random.uniform(-70, 70), 4),
            "lng": round(random.uniform(-180, 180), 4),
            "altitude": random.randint(5000, 42000),
            "speed": random.randint(400, 950),
            "heading": random.randint(0, 359),
            "source": "mock",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        for _ in range(count)
    ]


def mock_ships(count: int = 40) -> List[Dict]:
    return [
        {
            "id": str(uuid4()),
            "name": f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=5))}-{random.randint(100,999)}",
            "type": random.choice(SHIP_TYPES),
            "country": random.choice(COUNTRIES),
            "lat": round(random.uniform(-60, 60), 4),
            "lng": round(random.uniform(-180, 180), 4),
            "speed": round(random.uniform(0, 30), 1),
            "heading": random.randint(0, 359),
            "mmsi": str(random.randint(100000000, 999999999)),
            "source": "mock",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        for _ in range(count)
    ]


def mock_earthquakes(count: int = 10) -> List[Dict]:
    return [
        {
            "id": str(uuid4()),
            "magnitude": round(random.uniform(2.0, 7.5), 1),
            "depth": round(random.uniform(5, 200), 1),
            "lat": round(random.uniform(-60, 60), 4),
            "lng": round(random.uniform(-180, 180), 4),
            "place": f"Region {random.randint(1, 100)} km from {random.choice(['coast', 'city', 'border'])}",
            "time": datetime.now(timezone.utc).isoformat(),
            "source": "mock",
        }
        for _ in range(count)
    ]


def mock_weather(count: int = 20) -> List[Dict]:
    conditions = ["Clear", "Cloudy", "Stormy", "Foggy", "Rain", "Snow", "Severe Thunderstorm"]
    return [
        {
            "id": str(uuid4()),
            "lat": round(random.uniform(-70, 70), 2),
            "lng": round(random.uniform(-180, 180), 2),
            "condition": random.choice(conditions),
            "temperature": round(random.uniform(-30, 45), 1),
            "wind_speed": round(random.uniform(0, 120), 1),
            "wind_direction": random.randint(0, 359),
            "visibility": round(random.uniform(0.5, 30), 1),
            "pressure": round(random.uniform(950, 1050), 1),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        for _ in range(count)
    ]


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "data-ingestion",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "redis": redis_client is not None,
    }


@app.get("/ingest/aircraft")
async def ingest_aircraft():
    cached = await cache_get("ingest:aircraft")
    if cached:
        return {"source": "cache", "count": len(cached), "data": cached}

    data = None
    source = "mock"

    if OPENSKY_USERNAME and OPENSKY_PASSWORD:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://opensky-network.org/api/states/all",
                    auth=aiohttp.BasicAuth(OPENSKY_USERNAME, OPENSKY_PASSWORD),
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        raw = await resp.json()
                        states = raw.get("states", []) or []
                        data = [
                            {
                                "id": s[0] or str(uuid4()),
                                "callsign": (s[1] or "").strip() or "N/A",
                                "country": s[2] or "Unknown",
                                "lat": s[6] or 0,
                                "lng": s[5] or 0,
                                "altitude": int(s[7] or 0),
                                "speed": int((s[9] or 0) * 3.6),
                                "heading": int(s[10] or 0),
                                "source": "opensky",
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            }
                            for s in states[:150]
                            if s[6] is not None and s[5] is not None
                        ]
                        source = "opensky"
        except Exception as e:
            logger.warning(f"OpenSky fetch failed: {e}")

    if not data:
        data = mock_aircraft(80)
        source = "mock"

    await cache_set("ingest:aircraft", data, 30)
    return {"source": source, "count": len(data), "data": data}


@app.get("/ingest/ships")
async def ingest_ships():
    cached = await cache_get("ingest:ships")
    if cached:
        return {"source": "cache", "count": len(cached), "data": cached}

    data = mock_ships(40)
    await cache_set("ingest:ships", data, 30)
    return {"source": "mock", "count": len(data), "data": data}


@app.get("/ingest/earthquakes")
async def ingest_earthquakes():
    cached = await cache_get("ingest:earthquakes")
    if cached:
        return {"source": "cache", "count": len(cached), "data": cached}

    data = None
    source = "mock"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    raw = await resp.json()
                    features = raw.get("features", [])
                    data = [
                        {
                            "id": f.get("id", str(uuid4())),
                            "magnitude": f["properties"].get("mag", 0),
                            "place": f["properties"].get("place", "Unknown"),
                            "lat": f["geometry"]["coordinates"][1],
                            "lng": f["geometry"]["coordinates"][0],
                            "depth": f["geometry"]["coordinates"][2],
                            "time": datetime.fromtimestamp(
                                f["properties"]["time"] / 1000, tz=timezone.utc
                            ).isoformat(),
                            "source": "usgs",
                        }
                        for f in features[:50]
                    ]
                    source = "usgs"
    except Exception as e:
        logger.warning(f"USGS fetch failed: {e}")

    if not data:
        data = mock_earthquakes(10)
        source = "mock"

    await cache_set("ingest:earthquakes", data, 120)
    return {"source": source, "count": len(data), "data": data}


@app.get("/ingest/weather")
async def ingest_weather():
    cached = await cache_get("ingest:weather")
    if cached:
        return {"source": "cache", "count": len(cached), "data": cached}

    data = mock_weather(20)
    await cache_set("ingest:weather", data, 60)
    return {"source": "mock", "count": len(data), "data": data}


# ── Background Tasks ─────────────────────────────────────────────────────────

async def background_fetch_loop():
    while True:
        try:
            await ingest_aircraft()
            await ingest_earthquakes()
            logger.info("Background data refresh complete")
        except Exception as e:
            logger.error(f"Background fetch error: {e}")
        await asyncio.sleep(60)
