'use strict';

require('dotenv').config();

const express = require('express');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const PORT = process.env.PORT || 4001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:4000';

const app = express();
app.use(express.json());

let redisClient = null;
let redisAvailable = false;

// In-memory stream buffer
const eventBuffer = [];
const MAX_BUFFER_SIZE = 1000;

async function connectRedis() {
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => {
      if (redisAvailable) console.warn('[Redis] Error:', err.message);
      redisAvailable = false;
    });
    await redisClient.connect();
    redisAvailable = true;
    console.log('[Redis] Connected');
  } catch (err) {
    console.warn('[Redis] Unavailable:', err.message);
  }
}

// ── Stream processing functions ──────────────────────────────────────────────

function processAircraftEvent(aircraft) {
  const events = [];

  if (aircraft.altitude > 45000) {
    events.push({
      id: uuidv4(),
      type: 'ALTITUDE_BREACH',
      severity: 'HIGH',
      subject: aircraft.callsign || aircraft.id,
      detail: `Aircraft ${aircraft.callsign} at extreme altitude: ${aircraft.altitude}ft`,
      lat: aircraft.lat,
      lng: aircraft.lng,
      timestamp: new Date().toISOString(),
    });
  }

  if (aircraft.speed > 1000) {
    events.push({
      id: uuidv4(),
      type: 'SPEED_ANOMALY',
      severity: 'HIGH',
      subject: aircraft.callsign || aircraft.id,
      detail: `Supersonic speed detected: ${aircraft.speed}kts`,
      lat: aircraft.lat,
      lng: aircraft.lng,
      timestamp: new Date().toISOString(),
    });
  }

  if (aircraft.status === 'ANOMALY') {
    events.push({
      id: uuidv4(),
      type: 'ANOMALY_FLAGGED',
      severity: 'MEDIUM',
      subject: aircraft.callsign || aircraft.id,
      detail: `Aircraft ${aircraft.callsign} flagged as anomalous by tracking system`,
      lat: aircraft.lat,
      lng: aircraft.lng,
      timestamp: new Date().toISOString(),
    });
  }

  return events;
}

function processShipEvent(ship) {
  const events = [];

  if (ship.speed > 35) {
    events.push({
      id: uuidv4(),
      type: 'SHIP_SPEED_ANOMALY',
      severity: 'MEDIUM',
      subject: ship.name || ship.id,
      detail: `Vessel ${ship.name} exceeding normal speed: ${ship.speed.toFixed(1)}kts`,
      lat: ship.lat,
      lng: ship.lng,
      timestamp: new Date().toISOString(),
    });
  }

  if (ship.status === 'ANOMALY') {
    events.push({
      id: uuidv4(),
      type: 'SHIP_ANOMALY',
      severity: 'MEDIUM',
      subject: ship.name || ship.id,
      detail: `Vessel ${ship.name} flagged as anomalous`,
      lat: ship.lat,
      lng: ship.lng,
      timestamp: new Date().toISOString(),
    });
  }

  return events;
}

async function pushToRedis(events) {
  if (!redisAvailable || !redisClient || events.length === 0) return;
  try {
    const pipeline = redisClient.multi();
    events.forEach(e => {
      pipeline.lPush('stream:events', JSON.stringify(e));
    });
    pipeline.lTrim('stream:events', 0, 999);
    await pipeline.exec();
  } catch (err) {
    console.warn('[Redis] Push error:', err.message);
  }
}

// ── REST Routes ──────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'stream-processor',
    redis: redisAvailable,
    bufferSize: eventBuffer.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/stream/events', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);

  if (redisAvailable && redisClient) {
    try {
      const raw = await redisClient.lRange('stream:events', 0, limit - 1);
      return res.json(raw.map(r => JSON.parse(r)));
    } catch (err) {
      console.warn('[Redis] Read error:', err.message);
    }
  }

  res.json(eventBuffer.slice(0, limit));
});

app.post('/stream/process', async (req, res) => {
  const { aircraft = [], ships = [] } = req.body;
  const events = [];

  aircraft.forEach(ac => events.push(...processAircraftEvent(ac)));
  ships.forEach(ship => events.push(...processShipEvent(ship)));

  events.forEach(e => {
    eventBuffer.unshift(e);
    if (eventBuffer.length > MAX_BUFFER_SIZE) eventBuffer.pop();
  });

  await pushToRedis(events);
  res.json({ processed: events.length, events });
});

app.get('/stream/stats', async (req, res) => {
  res.json({
    bufferSize: eventBuffer.length,
    recentEvents: eventBuffer.slice(0, 10),
    timestamp: new Date().toISOString(),
  });
});

// ── Polling loop ─────────────────────────────────────────────────────────────

async function pollAndProcess() {
  try {
    const [aircraftRes, shipsRes] = await Promise.allSettled([
      axios.get(`${API_GATEWAY_URL}/api/aircraft`, { timeout: 5000 }),
      axios.get(`${API_GATEWAY_URL}/api/ships`, { timeout: 5000 }),
    ]);

    const aircraft = aircraftRes.status === 'fulfilled' ? aircraftRes.value.data : [];
    const ships = shipsRes.status === 'fulfilled' ? shipsRes.value.data : [];

    const events = [];
    aircraft.forEach(ac => events.push(...processAircraftEvent(ac)));
    ships.forEach(ship => events.push(...processShipEvent(ship)));

    events.forEach(e => {
      eventBuffer.unshift(e);
      if (eventBuffer.length > MAX_BUFFER_SIZE) eventBuffer.pop();
    });

    await pushToRedis(events);

    if (events.length > 0) {
      console.log(`[Stream] Processed ${events.length} events from ${aircraft.length} aircraft, ${ships.length} ships`);
    }
  } catch (err) {
    // API gateway may not be ready yet
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────

connectRedis().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Stream Processor] Listening on port ${PORT}`);
  });

  // Start polling after a delay to allow API gateway to start
  setTimeout(() => {
    setInterval(pollAndProcess, 10000);
  }, 15000);
});
