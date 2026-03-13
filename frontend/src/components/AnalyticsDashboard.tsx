'use client';

import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import type { Stats, GlobeEvent } from '@/types';

interface AnalyticsDashboardProps {
  stats: Stats | null;
  events: GlobeEvent[];
}

const threatConfig = {
  NORMAL: { color: '#00ff88', label: 'NORMAL', bg: 'bg-green-950/30 border-green-700/40' },
  ELEVATED: { color: '#ffd700', label: 'ELEVATED', bg: 'bg-yellow-950/30 border-yellow-700/40' },
  HIGH: { color: '#ff6b35', label: 'HIGH', bg: 'bg-orange-950/40 border-orange-600/50' },
  CRITICAL: { color: '#ff2d55', label: 'CRITICAL', bg: 'bg-red-950/50 border-red-600/60' },
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  pulse?: boolean;
}

function StatCard({ label, value, sub, color = '#00d4ff', pulse = false }: StatCardProps) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 bg-[rgba(0,212,255,0.03)] border border-cyan-900/25 rounded min-w-[80px]">
      <span className="text-[8px] font-mono text-gray-600 tracking-widest uppercase">{label}</span>
      <motion.span
        key={String(value)}
        initial={{ opacity: 0.5, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`text-lg font-mono font-bold ${pulse ? 'animate-pulse' : ''}`}
        style={{ color }}
      >
        {value}
      </motion.span>
      {sub && <span className="text-[8px] font-mono text-gray-600">{sub}</span>}
    </div>
  );
}

function buildEventChart(events: GlobeEvent[]) {
  const now = Date.now();
  const buckets: Record<number, number> = {};
  for (let i = 0; i < 30; i++) {
    buckets[i] = 0;
  }
  events.forEach(e => {
    const age = now - new Date(e.timestamp).getTime();
    const bucket = Math.floor(age / (2 * 60 * 1000));
    if (bucket >= 0 && bucket < 30) buckets[bucket]++;
  });
  return Object.entries(buckets)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([, count]) => ({ count }));
}

export default function AnalyticsDashboard({ stats, events }: AnalyticsDashboardProps) {
  const threat = threatConfig[stats?.threatLevel || 'NORMAL'];
  const chartData = buildEventChart(events);

  return (
    <div className="h-full flex items-center gap-3 px-3 py-1.5 bg-[rgba(7,12,26,0.98)] border-t border-cyan-900/30 overflow-x-auto">
      {/* Threat level badge */}
      <div className={`flex flex-col items-center px-3 py-1.5 rounded border ${threat.bg} shrink-0`}>
        <span className="text-[8px] font-mono text-gray-500 tracking-widest">THREAT</span>
        <span className="text-[13px] font-mono font-bold animate-pulse" style={{ color: threat.color }}>
          {threat.label}
        </span>
      </div>

      <div className="w-px h-8 bg-cyan-900/30 shrink-0" />

      {/* Stats */}
      <StatCard
        label="Aircraft"
        value={stats?.aircraft ?? '—'}
        sub="tracked"
        color="#00d4ff"
      />
      <StatCard
        label="Ships"
        value={stats?.ships ?? '—'}
        sub="tracked"
        color="#00ff88"
      />
      <StatCard
        label="Alerts"
        value={stats?.activeAlerts ?? '—'}
        sub="active"
        color="#ff2d55"
        pulse={(stats?.activeAlerts ?? 0) > 0}
      />
      <StatCard
        label="Anomalies"
        value={stats?.anomaliesDetected ?? '—'}
        sub="AI detected"
        color="#ff6b35"
      />
      <StatCard
        label="Evt/hr"
        value={stats?.eventsLastHour ?? '—'}
        sub="events"
        color="#ffd700"
      />
      <StatCard
        label="Total"
        value={stats?.totalTracked ?? '—'}
        sub="objects"
        color="#c084fc"
      />

      <div className="w-px h-8 bg-cyan-900/30 shrink-0" />

      {/* Mini event chart */}
      <div className="shrink-0 hidden md:flex flex-col gap-0.5">
        <span className="text-[8px] font-mono text-gray-600 tracking-widest">EVENT RATE (60m)</span>
        <div className="w-40 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="eventGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="count"
                stroke="#00d4ff"
                strokeWidth={1}
                fill="url(#eventGrad)"
                isAnimationActive={false}
              />
              <Tooltip
                contentStyle={{ background: '#0a1628', border: '1px solid #00d4ff44', fontSize: 9, fontFamily: 'monospace' }}
                itemStyle={{ color: '#00d4ff' }}
                labelStyle={{ display: 'none' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Severity breakdown */}
      <div className="shrink-0 hidden lg:flex flex-col gap-0.5">
        <span className="text-[8px] font-mono text-gray-600 tracking-widest">SEVERITY MIX</span>
        <div className="flex gap-1">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => {
            const count = events.filter(e => e.severity === sev).length;
            const sevColors = { CRITICAL: '#ff2d55', HIGH: '#ff6b35', MEDIUM: '#ffd700', LOW: '#00d4ff' };
            return (
              <div key={sev} className="flex flex-col items-center">
                <span className="text-[9px] font-mono font-bold" style={{ color: sevColors[sev] }}>{count}</span>
                <span className="text-[7px] font-mono text-gray-700">{sev.slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
