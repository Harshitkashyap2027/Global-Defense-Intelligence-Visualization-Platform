'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GlobeEvent } from '@/types';

interface EventStreamProps {
  events: GlobeEvent[];
}

const severityColors: Record<string, string> = {
  CRITICAL: 'text-red-400 border-red-700/50',
  HIGH: 'text-orange-400 border-orange-700/50',
  MEDIUM: 'text-yellow-400 border-yellow-700/40',
  LOW: 'text-blue-400 border-blue-700/30',
};

const severityBg: Record<string, string> = {
  CRITICAL: 'bg-red-950/30',
  HIGH: 'bg-orange-950/20',
  MEDIUM: 'bg-yellow-950/10',
  LOW: 'bg-blue-950/10',
};

function formatTime(ts: string) {
  return new Date(ts).toISOString().slice(11, 19) + 'Z';
}

export default function EventStream({ events }: EventStreamProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  useEffect(() => {
    if (events.length > prevLen.current && listRef.current) {
      listRef.current.scrollTop = 0;
    }
    prevLen.current = events.length;
  }, [events.length]);

  return (
    <div className="h-full flex flex-col bg-[rgba(7,12,26,0.98)] border-t border-cyan-900/30">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-cyan-900/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-cyan-500 tracking-widest">LIVE EVENT STREAM</span>
        </div>
        <span className="text-[9px] font-mono text-gray-600">{events.length} EVENTS</span>
      </div>

      {/* Stream */}
      <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence initial={false}>
          {events.slice(0, 100).map((event) => {
            const colorClass = severityColors[event.severity] || severityColors.LOW;
            const bgClass = severityBg[event.severity] || severityBg.LOW;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-2 px-3 py-1.5 border-b border-gray-900/50 ${bgClass} hover:bg-white/5 transition-colors cursor-default`}
              >
                <span className="text-[9px] font-mono text-gray-600 shrink-0 mt-0.5 w-16">
                  {formatTime(event.timestamp)}
                </span>
                <span className={`text-[9px] font-mono font-bold shrink-0 mt-0.5 border px-1 rounded ${colorClass}`}>
                  {event.severity.slice(0, 3)}
                </span>
                <span className="text-[9px] font-mono text-cyan-600 shrink-0 mt-0.5 w-24 truncate">
                  {event.type}
                </span>
                <span className="text-[9px] font-mono text-cyan-400 shrink-0 mt-0.5 w-20 truncate font-bold">
                  {event.subject}
                </span>
                <span className="text-[9px] font-mono text-gray-400 min-w-0 mt-0.5 truncate">
                  {event.description}
                </span>
                <span className="text-[9px] font-mono text-gray-700 shrink-0 mt-0.5 hidden lg:block">
                  {event.lat.toFixed(1)}°,{event.lng.toFixed(1)}°
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {events.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] font-mono text-gray-700">AWAITING EVENTS...</p>
          </div>
        )}
      </div>
    </div>
  );
}
