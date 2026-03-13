'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Aircraft, Ship, Alert, LayerConfig } from '@/types';

interface GlobeProps {
  aircraft: Aircraft[];
  ships: Ship[];
  alerts: Alert[];
  layers: LayerConfig[];
  onObjectClick?: (obj: Aircraft | Ship | null) => void;
}

interface CanvasObject {
  id: string;
  type: 'aircraft' | 'ship';
  lat: number;
  lng: number;
  heading?: number;
  callsign?: string;
  name?: string;
  status: string;
  speed?: number;
  altitude?: number;
  country?: string;
}

interface Tooltip {
  x: number;
  y: number;
  obj: CanvasObject;
}

// Project lat/lng to canvas x/y with rotation
function project(lat: number, lng: number, rotX: number, rotY: number, scale: number, cx: number, cy: number) {
  const phi = (lat * Math.PI) / 180;
  const lam = ((lng + rotY) * Math.PI) / 180;

  // 3D sphere coords
  const x3 = Math.cos(phi) * Math.cos(lam);
  const y3 = Math.sin(phi);
  const z3 = Math.cos(phi) * Math.sin(lam);

  // Rotate around X axis
  const rotXRad = (rotX * Math.PI) / 180;
  const y3r = y3 * Math.cos(rotXRad) - z3 * Math.sin(rotXRad);
  const z3r = y3 * Math.sin(rotXRad) + z3 * Math.cos(rotXRad);

  // Only render front-facing points
  if (x3 < -0.1) return null;

  // Orthographic projection
  const px = cx + z3r * scale;
  const py = cy - y3r * scale;

  return { x: px, y: py, depth: x3 };
}

export default function Globe({ aircraft, ships, alerts, layers, onObjectClick }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const rotY = useRef(0);
  const rotX = useRef(-15);
  const zoom = useRef(1);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [selectedObj, setSelectedObj] = useState<CanvasObject | null>(null);
  const frameCount = useRef(0);

  const layerMap = Object.fromEntries(layers.map(l => [l.id, l.enabled]));

  // Gentle auto-rotation
  useEffect(() => {
    const id = setInterval(() => {
      if (!isDragging.current) {
        rotY.current = (rotY.current + 0.05) % 360;
      }
    }, 16);
    return () => clearInterval(id);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const baseRadius = Math.min(W, H) * 0.38;
    const scale = baseRadius * zoom.current;

    frameCount.current++;
    ctx.clearRect(0, 0, W, H);

    // ── Background ──────────────────────────────────────────────────────────

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H));
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(1, '#050a0f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle star field
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 137 + 23) % W);
      const sy = ((i * 251 + 71) % H);
      const dist = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
      if (dist > scale + 20) {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Globe sphere ────────────────────────────────────────────────────────

    const globeGrad = ctx.createRadialGradient(cx - scale * 0.2, cy - scale * 0.2, scale * 0.1, cx, cy, scale);
    globeGrad.addColorStop(0, '#0d2545');
    globeGrad.addColorStop(0.4, '#081530');
    globeGrad.addColorStop(0.8, '#050f20');
    globeGrad.addColorStop(1, '#020810');
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, Math.PI * 2);
    ctx.fillStyle = globeGrad;
    ctx.fill();

    // Globe rim glow
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Clip to globe ────────────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, scale - 1, 0, Math.PI * 2);
    ctx.clip();

    // ── Grid lines ───────────────────────────────────────────────────────────

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
    ctx.lineWidth = 0.5;

    // Latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
      ctx.beginPath();
      let first = true;
      for (let lng = -180; lng <= 180; lng += 3) {
        const p = project(lat, lng, rotX.current, rotY.current, scale, cx, cy);
        if (!p) { first = true; continue; }
        if (first) { ctx.moveTo(p.x, p.y); first = false; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Longitude lines
    for (let lng = -180; lng < 180; lng += 20) {
      ctx.beginPath();
      let first = true;
      for (let lat = -90; lat <= 90; lat += 3) {
        const p = project(lat, lng, rotX.current, rotY.current, scale, cx, cy);
        if (!p) { first = true; continue; }
        if (first) { ctx.moveTo(p.x, p.y); first = false; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Equator
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.18)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    let firstEq = true;
    for (let lng = -180; lng <= 180; lng += 2) {
      const p = project(0, lng, rotX.current, rotY.current, scale, cx, cy);
      if (!p) { firstEq = true; continue; }
      if (firstEq) { ctx.moveTo(p.x, p.y); firstEq = false; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Prime meridian
    ctx.beginPath();
    let firstPm = true;
    for (let lat = -90; lat <= 90; lat += 2) {
      const p = project(lat, 0, rotX.current, rotY.current, scale, cx, cy);
      if (!p) { firstPm = true; continue; }
      if (firstPm) { ctx.moveTo(p.x, p.y); firstPm = false; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // ── Tracked objects ───────────────────────────────────────────────────────

    const allObjects: CanvasObject[] = [];

    if (layerMap['aircraft']) {
      aircraft.forEach(ac => allObjects.push({ ...ac, type: 'aircraft' as const }));
    }
    if (layerMap['ships']) {
      ships.forEach(s => allObjects.push({ ...s, type: 'ship' as const }));
    }

    // Draw alert pings first (behind objects)
    alerts.forEach(alert => {
      const p = project(alert.lat, alert.lng, rotX.current, rotY.current, scale, cx, cy);
      if (!p) return;
      const t = (frameCount.current % 60) / 60;
      const pingR = t * 20;
      const alpha = 1 - t;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pingR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 45, 85, ${alpha * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw objects
    allObjects.forEach(obj => {
      const p = project(obj.lat, obj.lng, rotX.current, rotY.current, scale, cx, cy);
      if (!p) return;

      const isAnomaly = obj.status === 'ANOMALY';
      const isAircraft = obj.type === 'aircraft';
      const isSelected = selectedObj?.id === obj.id;

      // Base color
      let color: string;
      if (isAircraft) {
        color = isAnomaly ? '#ff2d55' : '#00d4ff';
      } else {
        color = isAnomaly ? '#ff6b35' : '#00ff88';
      }

      // Anomaly pulse ring
      if (isAnomaly) {
        const t = (frameCount.current % 40) / 40;
        const pr = 4 + t * 8;
        const pa = 0.6 * (1 - t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
        ctx.strokeStyle = color.replace(')', `, ${pa})`).replace('rgb', 'rgba');
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Selected highlight
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw the dot
      const dotSize = isAircraft ? 2.5 : 3.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = isAnomaly ? 8 : 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Direction indicator for aircraft
      if (isAircraft && obj.heading !== undefined) {
        const headingRad = ((obj.heading - 90) * Math.PI) / 180;
        const tailLen = 6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(headingRad) * tailLen, p.y + Math.sin(headingRad) * tailLen);
        ctx.strokeStyle = `${color}99`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    ctx.restore();

    // ── Globe highlight/glare ─────────────────────────────────────────────────
    const glareGrad = ctx.createRadialGradient(
      cx - scale * 0.3, cy - scale * 0.3, scale * 0.05,
      cx - scale * 0.3, cy - scale * 0.3, scale * 0.6
    );
    glareGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
    glareGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, Math.PI * 2);
    ctx.fillStyle = glareGrad;
    ctx.fill();

    // ── HUD labels ────────────────────────────────────────────────────────────

    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(0, 212, 255, 0.4)';
    ctx.fillText(`AIRCRAFT: ${aircraft.length}`, 10, 20);
    ctx.fillText(`SHIPS: ${ships.length}`, 10, 34);
    ctx.fillText(`ALERTS: ${alerts.length}`, 10, 48);

    // Corner brackets
    const bSize = 20;
    const bOffset = 8;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 1.5;
    [[bOffset, bOffset], [W - bOffset, bOffset], [bOffset, H - bOffset], [W - bOffset, H - bOffset]].forEach(([bx, by], i) => {
      ctx.beginPath();
      const dx = i % 2 === 0 ? bSize : -bSize;
      const dy = i < 2 ? bSize : -bSize;
      ctx.moveTo(bx + dx, by);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx, by + dy);
      ctx.stroke();
    });

    animRef.current = requestAnimationFrame(draw);
  }, [aircraft, ships, alerts, layerMap, selectedObj]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Mouse interactions
  const getObjectAtPoint = useCallback((clientX: number, clientY: number): CanvasObject | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) * 0.38 * zoom.current;

    const allObjs: CanvasObject[] = [
      ...(layerMap['aircraft'] ? aircraft : []).map(a => ({ ...a, type: 'aircraft' as const })),
      ...(layerMap['ships'] ? ships : []).map(s => ({ ...s, type: 'ship' as const })),
    ];

    for (const obj of allObjs) {
      const p = project(obj.lat, obj.lng, rotX.current, rotY.current, scale, cx, cy);
      if (!p) continue;
      const dist = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
      if (dist < 8) return obj;
    }
    return null;
  }, [aircraft, ships, layerMap]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      rotY.current = (rotY.current + dx * 0.4) % 360;
      rotX.current = Math.max(-85, Math.min(85, rotX.current - dy * 0.4));
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setTooltip(null);
    } else {
      const obj = getObjectAtPoint(e.clientX, e.clientY);
      if (obj) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, obj });
      } else {
        setTooltip(null);
      }
    }
  }, [getObjectAtPoint]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const obj = getObjectAtPoint(e.clientX, e.clientY);
    setSelectedObj(obj);
    onObjectClick?.(obj as Aircraft | Ship | null);
  }, [getObjectAtPoint, onObjectClick]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    zoom.current = Math.max(0.5, Math.min(3.5, zoom.current - e.deltaY * 0.001));
  }, []);

  return (
    <div className="relative w-full h-full bg-[#050a0f] select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 bg-[#0a1628]/95 border border-cyan-700/60 rounded px-3 py-2 text-xs font-mono"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            maxWidth: 200,
            transform: tooltip.x > (canvasRef.current?.width ?? 500) * 0.7 ? 'translateX(-110%)' : 'none',
          }}
        >
          <div className="text-cyan-400 font-bold text-[11px] mb-1">
            {tooltip.obj.type === 'aircraft' ? '✈' : '⛵'} {tooltip.obj.callsign || tooltip.obj.name || tooltip.obj.id.slice(0, 8)}
          </div>
          {tooltip.obj.type === 'aircraft' && (
            <>
              <div className="text-gray-400">ALT: <span className="text-white">{tooltip.obj.altitude?.toLocaleString()}ft</span></div>
              <div className="text-gray-400">SPD: <span className="text-white">{tooltip.obj.speed}kts</span></div>
              <div className="text-gray-400">HDG: <span className="text-white">{tooltip.obj.heading}°</span></div>
            </>
          )}
          {tooltip.obj.type === 'ship' && (
            <>
              <div className="text-gray-400">SPD: <span className="text-white">{tooltip.obj.speed?.toFixed(1)}kts</span></div>
              <div className="text-gray-400">HDG: <span className="text-white">{tooltip.obj.heading}°</span></div>
            </>
          )}
          <div className="text-gray-400">CTRY: <span className="text-white">{tooltip.obj.country || 'UNK'}</span></div>
          <div className="text-gray-400">POS: <span className="text-white">{tooltip.obj.lat.toFixed(2)}°, {tooltip.obj.lng.toFixed(2)}°</span></div>
          <div className={`mt-1 font-bold text-[10px] ${tooltip.obj.status === 'ANOMALY' ? 'text-red-400' : 'text-green-400'}`}>
            ● {tooltip.obj.status}
          </div>
        </div>
      )}

      {/* Selected object panel */}
      {selectedObj && (
        <div className="absolute bottom-4 right-4 z-20 bg-[#0a1628]/95 border border-cyan-600/50 rounded-lg p-3 w-52 font-mono">
          <div className="flex justify-between items-center mb-2">
            <span className="text-cyan-400 text-[11px] font-bold">SELECTED TARGET</span>
            <button onClick={() => setSelectedObj(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="text-gray-400">ID: <span className="text-white">{selectedObj.callsign || selectedObj.name || selectedObj.id.slice(0, 12)}</span></div>
            <div className="text-gray-400">TYPE: <span className="text-white uppercase">{selectedObj.type}</span></div>
            <div className="text-gray-400">COUNTRY: <span className="text-white">{selectedObj.country || 'UNKNOWN'}</span></div>
            <div className="text-gray-400">LAT: <span className="text-white">{selectedObj.lat.toFixed(4)}°</span></div>
            <div className="text-gray-400">LNG: <span className="text-white">{selectedObj.lng.toFixed(4)}°</span></div>
            {selectedObj.altitude && <div className="text-gray-400">ALT: <span className="text-white">{selectedObj.altitude.toLocaleString()}ft</span></div>}
            {selectedObj.speed && <div className="text-gray-400">SPD: <span className="text-white">{selectedObj.speed.toFixed(1)}kts</span></div>}
            <div className={`mt-1 font-bold ${selectedObj.status === 'ANOMALY' ? 'text-red-400' : 'text-green-400'}`}>
              STATUS: {selectedObj.status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
