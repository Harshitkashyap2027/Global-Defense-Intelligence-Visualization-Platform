'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Aircraft, Ship, Alert, GlobeEvent, Stats, WebSocketState } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

const DEFAULT_STATE: WebSocketState = {
  connected: false,
  aircraft: [],
  ships: [],
  alerts: [],
  events: [],
  stats: null,
};

export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>(DEFAULT_STATE);
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected');
      setState(prev => ({ ...prev, connected: true }));
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      setState(prev => ({ ...prev, connected: false }));
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
      setState(prev => ({ ...prev, connected: false }));
    });

    socket.on('init', (data: { aircraft: Aircraft[]; ships: Ship[]; alerts: Alert[]; events: GlobeEvent[] }) => {
      setState(prev => ({
        ...prev,
        aircraft: data.aircraft || [],
        ships: data.ships || [],
        alerts: (data.alerts || []).filter(a => a.active),
        events: data.events || [],
      }));
    });

    socket.on('aircraft_update', (aircraft: Aircraft[]) => {
      setState(prev => ({ ...prev, aircraft: aircraft || [] }));
    });

    socket.on('ship_update', (ships: Ship[]) => {
      setState(prev => ({ ...prev, ships: ships || [] }));
    });

    socket.on('alert', (alert: Alert) => {
      setState(prev => ({
        ...prev,
        alerts: [alert, ...prev.alerts.filter(a => a.id !== alert.id && a.active)].slice(0, 20),
      }));
    });

    socket.on('alert_acknowledged', ({ id }: { id: string }) => {
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(a => a.id === id ? { ...a, active: false } : a).filter(a => a.active),
      }));
    });

    socket.on('new_event', (event: GlobeEvent) => {
      setState(prev => ({
        ...prev,
        events: [event, ...prev.events].slice(0, 200),
      }));
    });

    socket.on('stats_update', (stats: Stats) => {
      setState(prev => ({ ...prev, stats }));
    });

    socketRef.current = socket;
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    socketRef.current?.emit('acknowledge_alert', id);
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(a => a.id !== id),
    }));
  }, []);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [connect]);

  return { ...state, acknowledgeAlert };
}
