'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiAlertCircle, FiX, FiWifi, FiWifiOff } from 'react-icons/fi';
import type { Alert } from '@/types';

interface AlertBarProps {
  alerts: Alert[];
  connected: boolean;
  onAcknowledge: (id: string) => void;
}

const severityConfig = {
  CRITICAL: { bg: 'bg-red-900/80', border: 'border-red-500', text: 'text-red-300', pulse: 'animate-pulse', icon: FiAlertCircle, label: 'CRITICAL' },
  HIGH: { bg: 'bg-orange-900/60', border: 'border-orange-500', text: 'text-orange-300', pulse: '', icon: FiAlertTriangle, label: 'HIGH' },
  MEDIUM: { bg: 'bg-yellow-900/40', border: 'border-yellow-500/60', text: 'text-yellow-300', pulse: '', icon: FiAlertTriangle, label: 'MED' },
  LOW: { bg: 'bg-blue-900/30', border: 'border-blue-500/40', text: 'text-blue-300', pulse: '', icon: FiAlertTriangle, label: 'LOW' },
};

export default function AlertBar({ alerts, connected, onAcknowledge }: AlertBarProps) {
  const activeAlerts = alerts.filter(a => a.active).slice(0, 5);

  return (
    <div className="h-10 flex items-center gap-2 px-3 bg-[#070c1a] border-b border-cyan-900/40 overflow-hidden">
      {/* Connection status */}
      <div className="flex items-center gap-1.5 shrink-0">
        {connected ? (
          <FiWifi className="text-cyan-400 w-3.5 h-3.5" />
        ) : (
          <FiWifiOff className="text-red-400 w-3.5 h-3.5 animate-pulse" />
        )}
        <span className={`text-[10px] font-mono font-bold tracking-widest ${connected ? 'text-cyan-400' : 'text-red-400'}`}>
          {connected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      <div className="w-px h-5 bg-cyan-900/60 shrink-0" />

      {/* System label */}
      <span className="text-[10px] font-mono text-cyan-600 tracking-widest shrink-0 hidden sm:block">
        GDIVP // THREAT MONITOR
      </span>

      {/* Alerts ticker */}
      <div className="flex-1 flex items-center gap-2 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {activeAlerts.length === 0 ? (
            <motion.span
              key="clear"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] font-mono text-green-500/70"
            >
              ● ALL SYSTEMS NOMINAL — NO ACTIVE ALERTS
            </motion.span>
          ) : (
            activeAlerts.map((alert) => {
              const cfg = severityConfig[alert.severity] || severityConfig.LOW;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.pulse} shrink-0 group`}
                >
                  <Icon className={`w-3 h-3 ${cfg.text}`} />
                  <span className={`text-[10px] font-mono font-bold ${cfg.text}`}>[{cfg.label}]</span>
                  <span className="text-[10px] font-mono text-gray-300 max-w-[200px] truncate">
                    {alert.subject}: {alert.message || alert.type}
                  </span>
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FiX className="w-3 h-3 text-gray-400 hover:text-white" />
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Alert count */}
      {activeAlerts.length > 0 && (
        <div className="shrink-0 flex items-center gap-1">
          <span className="text-[10px] font-mono text-gray-500">
            {activeAlerts.length} ACTIVE
          </span>
        </div>
      )}

      {/* Timestamp */}
      <div className="shrink-0 hidden md:block">
        <Clock />
      </div>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => setTime(new Date().toUTCString().slice(17, 25) + ' UTC');
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-[10px] font-mono text-cyan-700 tracking-widest">{time}</span>
  );
}


