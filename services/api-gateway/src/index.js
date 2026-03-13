'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('redis');
const mockData = require('./mockData');

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const app = express();
const server = http.createServer(app);

// Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(','),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Redis client (optional - graceful degradation)
let redisClient = null;
let redisAvailable = false;

async function connectRedis() {
  try {
    redisClient = createClient({
      url: REDIS_URL,
      socket: { reconnectStrategy: (retries) => retries < 3 ? 500 : false },
    });
    redisClient.on('error', (err) => {
      if (redisAvailable) console.warn('[Redis] Connection error - running without cache:', err.message);
      redisAvailable = false;
    });
    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
      redisAvailable = true;
    });
    // Race the connect against a 3-second timeout so the server starts even if Redis is down
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
  } catch (err) {
    console.warn('[Redis] Unavailable - running without cache:', err.message);
  }
}

async function cacheGet(key) {
  if (!redisAvailable || !redisClient) return null;
  try {
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 5) {
  if (!redisAvailable || !redisClient) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(','),
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// In-memory state
let activeAlerts = mockData.generateAlerts(5);
const eventLog = [];

// Seed initial events
for (let i = 0; i < 20; i++) {
  eventLog.unshift(mockData.generateEvent());
}

// ─── REST Routes ────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    redis: redisAvailable,
    uptime: process.uptime(),
    aircraft: mockData.getAircraft().length,
    ships: mockData.getShips().length,
  });
});

app.get('/api/aircraft', async (req, res) => {
  try {
    const cached = await cacheGet('aircraft');
    if (cached) return res.json(cached);
    const data = mockData.getAircraft();
    await cacheSet('aircraft', data, 3);
    res.json(data);
  } catch (err) {
    console.error('[/api/aircraft]', err.message);
    res.status(500).json({ error: 'Failed to fetch aircraft data' });
  }
});

app.get('/api/ships', async (req, res) => {
  try {
    const cached = await cacheGet('ships');
    if (cached) return res.json(cached);
    const data = mockData.getShips();
    await cacheSet('ships', data, 3);
    res.json(data);
  } catch (err) {
    console.error('[/api/ships]', err.message);
    res.status(500).json({ error: 'Failed to fetch ship data' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    res.json(eventLog.slice(0, limit));
  } catch (err) {
    console.error('[/api/events]', err.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    res.json(activeAlerts.filter(a => a.active));
  } catch (err) {
    console.error('[/api/alerts]', err.message);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const alert = activeAlerts.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  alert.active = false;
  io.emit('alert_acknowledged', { id: req.params.id });
  res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
  const aircraft = mockData.getAircraft();
  const ships = mockData.getShips();
  const anomalies = [...aircraft, ...ships].filter(o => o.status === 'ANOMALY').length;
  res.json({
    aircraft: aircraft.length,
    ships: ships.length,
    totalTracked: aircraft.length + ships.length,
    activeAlerts: activeAlerts.filter(a => a.active).length,
    anomaliesDetected: anomalies,
    eventsLastHour: eventLog.filter(e => Date.now() - new Date(e.timestamp).getTime() < 3600000).length,
    threatLevel: anomalies > 10 ? 'HIGH' : anomalies > 5 ? 'ELEVATED' : 'NORMAL',
    timestamp: new Date().toISOString(),
  });
});

// ─── WebSocket ───────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Send initial state
  socket.emit('init', {
    aircraft: mockData.getAircraft(),
    ships: mockData.getShips(),
    alerts: activeAlerts.filter(a => a.active),
    events: eventLog.slice(0, 50),
  });

  socket.on('acknowledge_alert', (id) => {
    const alert = activeAlerts.find(a => a.id === id);
    if (alert) {
      alert.active = false;
      io.emit('alert_acknowledged', { id });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ─── Broadcast Loop ──────────────────────────────────────────────────────────

let tickCount = 0;

setInterval(() => {
  tickCount++;
  const aircraft = mockData.getAircraft();
  const ships = mockData.getShips();

  io.emit('aircraft_update', aircraft);
  io.emit('ship_update', ships);

  // Generate events periodically
  if (tickCount % 5 === 0) {
    const event = mockData.generateEvent();
    eventLog.unshift(event);
    if (eventLog.length > 500) eventLog.pop();
    io.emit('new_event', event);
  }

  // Rotate alerts
  if (tickCount % 30 === 0) {
    const newAlerts = mockData.generateAlerts(2);
    activeAlerts = [...newAlerts, ...activeAlerts.filter(a => a.active)].slice(0, 15);
    activeAlerts.forEach(alert => io.emit('alert', alert));
  }

  // Update stats
  if (tickCount % 3 === 0) {
    const anomalies = [...aircraft, ...ships].filter(o => o.status === 'ANOMALY').length;
    io.emit('stats_update', {
      aircraft: aircraft.length,
      ships: ships.length,
      totalTracked: aircraft.length + ships.length,
      activeAlerts: activeAlerts.filter(a => a.active).length,
      anomaliesDetected: anomalies,
      eventsLastHour: eventLog.filter(e => Date.now() - new Date(e.timestamp).getTime() < 3600000).length,
      threatLevel: anomalies > 10 ? 'HIGH' : anomalies > 5 ? 'ELEVATED' : 'NORMAL',
      timestamp: new Date().toISOString(),
    });
  }
}, 2000);

// ─── Start ───────────────────────────────────────────────────────────────────

connectRedis().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[API Gateway] Listening on port ${PORT}`);
    console.log(`[API Gateway] WebSocket ready`);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err);
});
