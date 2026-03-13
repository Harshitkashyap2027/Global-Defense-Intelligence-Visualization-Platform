'use client';

import { motion } from 'framer-motion';
import type { LayerConfig } from '@/types';

interface LayerPanelProps {
  layers: LayerConfig[];
  onToggle: (id: string) => void;
}

export default function LayerPanel({ layers, onToggle }: LayerPanelProps) {
  return (
    <div className="w-52 flex flex-col gap-1 p-3 bg-[rgba(7,12,26,0.95)] border-r border-cyan-900/30 overflow-y-auto">
      <div className="mb-2 pb-2 border-b border-cyan-900/30">
        <h2 className="text-[10px] font-mono font-bold text-cyan-500 tracking-widest uppercase">
          Layer Controls
        </h2>
      </div>

      {layers.map((layer) => (
        <motion.button
          key={layer.id}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onToggle(layer.id)}
          className={`flex items-center justify-between px-3 py-2 rounded border transition-all duration-200 text-left
            ${layer.enabled
              ? 'bg-cyan-950/40 border-cyan-700/50 text-cyan-300'
              : 'bg-gray-900/40 border-gray-700/30 text-gray-500'
            }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{layer.icon}</span>
            <span className="text-[11px] font-mono">{layer.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {layer.count !== undefined && layer.enabled && (
              <span className="text-[9px] font-mono text-cyan-600 bg-cyan-950/60 px-1 py-0.5 rounded">
                {layer.count}
              </span>
            )}
            <div
              className={`w-7 h-3.5 rounded-full transition-all duration-200 relative
                ${layer.enabled ? 'bg-cyan-500/70' : 'bg-gray-700'}`}
            >
              <div
                className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all duration-200
                  ${layer.enabled ? 'left-[14px]' : 'left-0.5'}`}
              />
            </div>
          </div>
        </motion.button>
      ))}

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-cyan-900/30">
        <p className="text-[9px] font-mono text-cyan-700 mb-2 tracking-widest">LEGEND</p>
        <div className="space-y-1.5">
          {[
            { color: '#00d4ff', label: 'Aircraft (Nominal)' },
            { color: '#ff2d55', label: 'Aircraft (Anomaly)' },
            { color: '#00ff88', label: 'Ship (Nominal)' },
            { color: '#ff6b35', label: 'Ship (Anomaly)' },
            { color: '#ffd700', label: 'Alert / Event' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color, boxShadow: `0 0 4px ${item.color}` }}
              />
              <span className="text-[9px] font-mono text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid info */}
      <div className="mt-3 pt-3 border-t border-cyan-900/30">
        <p className="text-[9px] font-mono text-cyan-700 mb-1 tracking-widest">PROJECTION</p>
        <p className="text-[9px] font-mono text-gray-600">Equirectangular</p>
        <p className="text-[9px] font-mono text-cyan-700 mt-2 mb-1 tracking-widest">CONTROLS</p>
        <p className="text-[9px] font-mono text-gray-600">Drag: Rotate</p>
        <p className="text-[9px] font-mono text-gray-600">Scroll: Zoom</p>
        <p className="text-[9px] font-mono text-gray-600">Click: Inspect</p>
      </div>
    </div>
  );
}
