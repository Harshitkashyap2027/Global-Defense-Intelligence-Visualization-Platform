'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import AlertBar from '@/components/AlertBar';
import LayerPanel from '@/components/LayerPanel';
import EventStream from '@/components/EventStream';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { LayerConfig } from '@/types';

const Globe = dynamic(() => import('@/components/Globe'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-[#050a0f]">
      <div className="text-center">
        <div className="w-16 h-16 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-cyan-500/70 text-sm font-mono tracking-widest">INITIALIZING GLOBE...</p>
      </div>
    </div>
  ),
});

const INITIAL_LAYERS: LayerConfig[] = [
  { id: 'aircraft', label: 'Aircraft', enabled: true, color: '#00d4ff', icon: '✈' },
  { id: 'ships', label: 'Ships', enabled: true, color: '#00ff88', icon: '⛵' },
  { id: 'satellites', label: 'Satellites', enabled: false, color: '#c084fc', icon: '🛰' },
  { id: 'weather', label: 'Weather', enabled: false, color: '#60a5fa', icon: '🌩' },
  { id: 'earthquakes', label: 'Earthquakes', enabled: true, color: '#f87171', icon: '🔴' },
  { id: 'news', label: 'News Events', enabled: false, color: '#fbbf24', icon: '📡' },
  { id: 'heatmap', label: 'Heatmap', enabled: false, color: '#fb923c', icon: '��' },
];

export default function Home() {
  const { connected, aircraft, ships, alerts, events, stats, acknowledgeAlert } = useWebSocket();
  const [layers, setLayers] = useState<LayerConfig[]>(INITIAL_LAYERS);
  const [activeTab, setActiveTab] = useState<'events' | 'analytics'>('events');

  const layersWithCount = useMemo(() => {
    return layers.map(l => ({
      ...l,
      count: l.id === 'aircraft' ? aircraft.length : l.id === 'ships' ? ships.length : undefined,
    }));
  }, [layers, aircraft.length, ships.length]);

  const handleToggleLayer = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l));
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0f1e]">
      <AlertBar alerts={alerts} connected={connected} onAcknowledge={acknowledgeAlert} />

      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 40px - 160px - 52px)' }}>
        <LayerPanel layers={layersWithCount} onToggle={handleToggleLayer} />

        <div className="flex-1 relative overflow-hidden">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-[rgba(7,12,26,0.85)] border border-cyan-900/40 rounded px-4 py-1.5 backdrop-blur-sm">
              <h1 className="text-[11px] font-mono font-bold text-cyan-500 tracking-widest text-center">
                GLOBAL DEFENSE INTELLIGENCE VISUALIZATION PLATFORM
              </h1>
              <p className="text-[8px] font-mono text-cyan-700 text-center tracking-widest">
                GDIVP // REAL-TIME TRACKING &amp; AI ANOMALY DETECTION
              </p>
            </div>
          </div>

          <Globe
            aircraft={aircraft}
            ships={ships}
            alerts={alerts.filter(a => a.active)}
            layers={layersWithCount}
          />
        </div>
      </div>

      <div style={{ height: 160 }} className="flex flex-col overflow-hidden">
        <div className="flex items-center border-t border-cyan-900/30 bg-[#070c1a] shrink-0">
          {(['events', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-[9px] font-mono tracking-widest transition-colors border-b-2
                ${activeTab === tab
                  ? 'text-cyan-400 border-cyan-500 bg-cyan-950/20'
                  : 'text-gray-600 border-transparent hover:text-gray-400'}`}
            >
              {tab === 'events' ? 'EVENT STREAM' : 'ANALYTICS'}
            </button>
          ))}
          <div className="flex-1" />
          <span className="px-3 text-[8px] font-mono text-gray-700">
            {events.length} EVENTS BUFFERED
          </span>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'events' ? (
            <EventStream events={events} />
          ) : (
            <AnalyticsDashboard stats={stats} events={events} />
          )}
        </div>
      </div>

      <div style={{ height: 52 }} className="shrink-0 overflow-hidden">
        <AnalyticsDashboard stats={stats} events={events} />
      </div>
    </div>
  );
}
