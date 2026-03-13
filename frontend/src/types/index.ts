export type ObjectType = 'aircraft' | 'ship' | 'satellite' | 'event' | 'earthquake';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ThreatLevel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface TrackedObject {
  id: string;
  type: ObjectType;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  callsign?: string;
  name?: string;
  country?: string;
  status: 'NOMINAL' | 'ANOMALY' | 'UNKNOWN';
  lastUpdate?: number;
  squawk?: string;
  mmsi?: string;
}

export interface Aircraft extends TrackedObject {
  type: 'aircraft';
  callsign: string;
  altitude: number;
  speed: number;
  heading: number;
  squawk?: string;
}

export interface Ship extends TrackedObject {
  type: 'ship';
  name: string;
  mmsi?: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: Severity;
  message?: string;
  subject: string;
  lat: number;
  lng: number;
  timestamp: string;
  active: boolean;
  acknowledged?: boolean;
}

export interface GlobeEvent {
  id: string;
  type: string;
  severity: Severity;
  timestamp: string;
  lat: number;
  lng: number;
  subject: string;
  description: string;
  acknowledged: boolean;
}

export interface Stats {
  aircraft: number;
  ships: number;
  totalTracked: number;
  activeAlerts: number;
  anomaliesDetected: number;
  eventsLastHour: number;
  threatLevel: ThreatLevel;
  timestamp: string;
}

export interface LayerConfig {
  id: string;
  label: string;
  enabled: boolean;
  color: string;
  icon: string;
  count?: number;
}

export interface WebSocketState {
  connected: boolean;
  aircraft: Aircraft[];
  ships: Ship[];
  alerts: Alert[];
  events: GlobeEvent[];
  stats: Stats | null;
}

export interface GlobeViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  rotation: number;
  pitch: number;
}
