'use strict';

const { v4: uuidv4 } = require('uuid');

const AIRCRAFT_TYPES = ['B737', 'B747', 'A320', 'A380', 'F-16', 'F-35', 'C-130', 'E-3', 'P-8', 'RC-135'];
const SHIP_TYPES = ['Destroyer', 'Carrier', 'Submarine', 'Frigate', 'Cruiser', 'Tanker', 'Container', 'Patrol'];
const CALLSIGNS = ['EAGLE', 'FALCON', 'VIPER', 'GHOST', 'SHADOW', 'THUNDER', 'STORM', 'RAVEN', 'COBRA', 'WOLF'];
const COUNTRIES = ['USA', 'GBR', 'FRA', 'DEU', 'JPN', 'AUS', 'CAN', 'ITA', 'ESP', 'NLD', 'POL', 'NOR', 'TUR', 'CHN', 'RUS', 'IND', 'BRA', 'ISR'];
const EVENT_TYPES = ['FLIGHT_ANOMALY', 'SHIP_DEVIATION', 'AIRSPACE_VIOLATION', 'SPEED_ANOMALY', 'ALTITUDE_CHANGE', 'COURSE_CHANGE', 'SIGNAL_LOSS', 'NEW_CONTACT', 'EXERCISE_ACTIVITY'];
const ALERT_TYPES = ['AIRSPACE_BREACH', 'UNUSUAL_MOVEMENT', 'UNIDENTIFIED_CONTACT', 'RESTRICTED_ZONE', 'HIGH_SPEED_APPROACH'];

let aircraftPool = [];
let shipPool = [];

function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function initAircraftPool(count = 120) {
  aircraftPool = Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    callsign: `${pickRandom(CALLSIGNS)}${randInt(10, 99)}`,
    type: pickRandom(AIRCRAFT_TYPES),
    country: pickRandom(COUNTRIES),
    lat: randBetween(-70, 70),
    lng: randBetween(-180, 180),
    altitude: randInt(5000, 42000),
    speed: randInt(400, 950),
    heading: randInt(0, 359),
    status: Math.random() > 0.05 ? 'NOMINAL' : 'ANOMALY',
    squawk: String(randInt(1000, 7777)),
    lastUpdate: Date.now(),
  }));
}

function initShipPool(count = 60) {
  shipPool = Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    name: `${pickRandom(COUNTRIES)}-${pickRandom(SHIP_TYPES).toUpperCase()}-${randInt(100, 999)}`,
    type: pickRandom(SHIP_TYPES),
    country: pickRandom(COUNTRIES),
    lat: randBetween(-60, 60),
    lng: randBetween(-180, 180),
    speed: randBetween(0, 30),
    heading: randInt(0, 359),
    mmsi: String(randInt(100000000, 999999999)),
    status: Math.random() > 0.05 ? 'NOMINAL' : 'ANOMALY',
    lastUpdate: Date.now(),
  }));
}

function updatePositions() {
  const now = Date.now();
  aircraftPool.forEach(ac => {
    const dt = (now - ac.lastUpdate) / 1000;
    const speedKmS = (ac.speed * 1.852) / 3600;
    const dist = speedKmS * dt;
    const headingRad = (ac.heading * Math.PI) / 180;
    const R = 6371;
    const dLat = (dist / R) * (180 / Math.PI) * Math.cos(headingRad);
    const dLng = (dist / R) * (180 / Math.PI) * Math.sin(headingRad) / Math.cos((ac.lat * Math.PI) / 180);

    ac.lat = ((ac.lat + dLat + 90) % 180) - 90;
    ac.lng = ((ac.lng + dLng + 360) % 360) - 180;

    if (Math.random() < 0.02) ac.heading = (ac.heading + randBetween(-15, 15) + 360) % 360;
    if (Math.random() < 0.01) ac.altitude = Math.max(1000, Math.min(45000, ac.altitude + randInt(-2000, 2000)));
    ac.lastUpdate = now;
    ac.status = Math.random() < 0.02 ? 'ANOMALY' : 'NOMINAL';
  });

  shipPool.forEach(ship => {
    const dt = (now - ship.lastUpdate) / 1000;
    const speedKmS = (ship.speed * 1.852) / 3600;
    const dist = speedKmS * dt;
    const headingRad = (ship.heading * Math.PI) / 180;
    const R = 6371;
    const dLat = (dist / R) * (180 / Math.PI) * Math.cos(headingRad);
    const dLng = (dist / R) * (180 / Math.PI) * Math.sin(headingRad) / Math.cos((ship.lat * Math.PI) / 180);

    ship.lat = Math.max(-80, Math.min(80, ship.lat + dLat));
    ship.lng = ((ship.lng + dLng + 360) % 360) - 180;

    if (Math.random() < 0.01) ship.heading = (ship.heading + randBetween(-5, 5) + 360) % 360;
    if (Math.random() < 0.005) ship.speed = Math.max(0, Math.min(35, ship.speed + randBetween(-2, 2)));
    ship.lastUpdate = now;
    ship.status = Math.random() < 0.02 ? 'ANOMALY' : 'NOMINAL';
  });
}

function generateEvent() {
  const type = pickRandom(EVENT_TYPES);
  const severity = Math.random() < 0.1 ? 'HIGH' : Math.random() < 0.3 ? 'MEDIUM' : 'LOW';
  const isAircraft = Math.random() > 0.4;
  const subject = isAircraft
    ? (aircraftPool.length ? pickRandom(aircraftPool) : null)
    : (shipPool.length ? pickRandom(shipPool) : null);

  return {
    id: uuidv4(),
    type,
    severity,
    timestamp: new Date().toISOString(),
    lat: subject ? subject.lat : randBetween(-70, 70),
    lng: subject ? subject.lng : randBetween(-180, 180),
    subject: subject ? (subject.callsign || subject.name) : 'UNKNOWN',
    description: generateEventDescription(type, subject),
    acknowledged: false,
  };
}

function generateEventDescription(type, subject) {
  const name = subject ? (subject.callsign || subject.name) : 'Contact';
  const descriptions = {
    FLIGHT_ANOMALY: `${name} exhibiting unusual flight pattern - deviation from filed route`,
    SHIP_DEVIATION: `${name} has deviated from expected shipping lane`,
    AIRSPACE_VIOLATION: `${name} has entered restricted airspace without clearance`,
    SPEED_ANOMALY: `${name} detected exceeding normal operational speed parameters`,
    ALTITUDE_CHANGE: `${name} performing rapid altitude change outside normal parameters`,
    COURSE_CHANGE: `${name} made unexpected course change of >45 degrees`,
    SIGNAL_LOSS: `Transponder signal lost for ${name} - last known position logged`,
    NEW_CONTACT: `New unidentified contact detected - tracking initiated`,
    EXERCISE_ACTIVITY: `${name} participating in military exercise activity`,
  };
  return descriptions[type] || `Anomalous activity detected for ${name}`;
}

function generateAlerts(count = 3) {
  return Array.from({ length: count }, () => {
    const type = pickRandom(ALERT_TYPES);
    const severity = Math.random() < 0.2 ? 'CRITICAL' : Math.random() < 0.4 ? 'HIGH' : 'MEDIUM';
    const subject = Math.random() > 0.5 && aircraftPool.length
      ? pickRandom(aircraftPool)
      : (shipPool.length ? pickRandom(shipPool) : null);

    return {
      id: uuidv4(),
      type,
      severity,
      timestamp: new Date().toISOString(),
      lat: subject ? subject.lat : randBetween(-70, 70),
      lng: subject ? subject.lng : randBetween(-180, 180),
      subject: subject ? (subject.callsign || subject.name) : 'UNKNOWN',
      message: generateAlertMessage(type, subject),
      active: true,
    };
  });
}

function generateAlertMessage(type, subject) {
  const name = subject ? (subject.callsign || subject.name) : 'Unknown Contact';
  const messages = {
    AIRSPACE_BREACH: `ALERT: ${name} has breached restricted airspace boundary`,
    UNUSUAL_MOVEMENT: `WARNING: ${name} displaying unusual movement pattern - AI anomaly score >0.85`,
    UNIDENTIFIED_CONTACT: `CAUTION: Unidentified contact near ${name} - classification pending`,
    RESTRICTED_ZONE: `ALERT: ${name} approaching restricted maritime exclusion zone`,
    HIGH_SPEED_APPROACH: `WARNING: High-speed approach detected toward ${name} - vector analysis in progress`,
  };
  return messages[type] || `Alert: Anomalous activity detected`;
}

// Initialize pools on module load
initAircraftPool(120);
initShipPool(60);

module.exports = {
  getAircraft: () => {
    updatePositions();
    return aircraftPool;
  },
  getShips: () => {
    updatePositions();
    return shipPool;
  },
  generateEvent,
  generateAlerts,
  updatePositions,
};
