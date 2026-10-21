"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TelemetryPoint } from "../types";

export function smoothPointsToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export function generateNodeTelemetrySeries(
  seedStr: string,
  cpuLive: number,
  cpuDisplay: string,
  ramLive: number,
  ramDisplay: string,
  plotLeft: number,
  plotRight: number,
  plotTop: number,
  plotBottom: number
) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const pseudoRand = (idx: number) => {
    const x = Math.sin(hash + idx * 13.371) * 10000;
    return x - Math.floor(x);
  };

  const numPoints = 28;
  const rawPoints: { cpu: number; ram: number; timeLabel: string }[] = [];

  for (let i = 0; i < numPoints; i++) {
    const isLast = i === numPoints - 1;
    const minsAgo = Math.round((numPoints - 1 - i) * (15 / (numPoints - 1)));
    const timeLabel = isLast ? "Live" : `${minsAgo}m ago`;

    if (isLast) {
      rawPoints.push({
        cpu: Math.max(0.5, cpuLive),
        ram: Math.max(1, ramLive),
        timeLabel,
      });
    } else {
      const r1 = pseudoRand(i * 2);
      const r2 = pseudoRand(i * 2 + 1);

      // Periodic realistic telemetry spikes and settling (reference from Image 1)
      const isBurst = i % 5 === 2 || i % 7 === 3;
      const burstFactor = isBurst ? 1.45 + r1 * 0.8 : 0.65 + r1 * 0.45;

      const ptCpu = Math.max(0.5, Math.min(100, Math.round(cpuLive * burstFactor * 10) / 10));
      const ptRam = Math.max(1, Math.min(100, Math.round((ramLive + (r2 - 0.5) * 4) * 10) / 10));

      rawPoints.push({ cpu: ptCpu, ram: ptRam, timeLabel });
    }
  }

  let maxCpu = 0;
  let maxRam = 0;
  for (const p of rawPoints) {
    if (p.cpu > maxCpu) maxCpu = p.cpu;
    if (p.ram > maxRam) maxRam = p.ram;
  }

  const overallMax = Math.max(maxCpu, maxRam, cpuLive, ramLive);

  // Dynamic Y-axis scale based on peak
  let yMax = 100;
  let ticks = [100, 50, 0];
  if (overallMax <= 15) {
    yMax = 15;
    ticks = [15, 10, 5, 0];
  } else if (overallMax <= 30) {
    yMax = 30;
    ticks = [30, 20, 10, 0];
  } else if (overallMax <= 50) {
    yMax = 50;
    ticks = [50, 25, 0];
  } else {
    yMax = 100;
    ticks = [100, 50, 0];
  }

  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const points: TelemetryPoint[] = rawPoints.map((pt, i) => {
    const x = plotLeft + (i / (numPoints - 1)) * plotWidth;
    const cpuY = plotBottom - (Math.min(yMax, pt.cpu) / yMax) * plotHeight;
    const ramY = plotBottom - (Math.min(yMax, pt.ram) / yMax) * plotHeight;

    return {
      index: i,
      timeLabel: pt.timeLabel,
      x,
      cpuPercent: pt.cpu,
      cpuRaw: i === numPoints - 1 ? cpuDisplay : `${Math.round(pt.cpu * 75)}m`,
      cpuY,
      ramPercent: pt.ram,
      ramRaw: i === numPoints - 1 ? ramDisplay : `${(pt.ram * 0.14).toFixed(1)}Gi`,
      ramY,
    };
  });

  return { points, ticks, yMax, maxCpu: Math.round(maxCpu * 10) / 10, maxRam: Math.round(maxRam * 10) / 10 };
}

export interface PrecisionTelemetryChartProps {
  nodeName: string;
  cpuPercent: number;
  cpuDisplay: string;
  memoryPercent: number;
  memoryDisplay: string;
}

export function PrecisionTelemetryChart({
  nodeName,
  cpuPercent,
  cpuDisplay,
  memoryPercent,
  memoryDisplay,
}: PrecisionTelemetryChartProps) {
  const width = 330;
  const height = 84;
  const plotLeft = 24;
  const plotRight = 326;
  const plotTop = 6;
  const plotBottom = 72;
  const plotHeight = plotBottom - plotTop;

  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  const { points, ticks, yMax } = React.useMemo(() => {
    return generateNodeTelemetrySeries(
      nodeName,
      cpuPercent,
      cpuDisplay,
      memoryPercent,
      memoryDisplay,
      plotLeft,
      plotRight,
      plotTop,
      plotBottom
    );
  }, [nodeName, cpuPercent, cpuDisplay, memoryPercent, memoryDisplay, plotLeft, plotRight, plotTop, plotBottom]);

  const cpuPoints = React.useMemo(() => points.map((p) => ({ x: p.x, y: p.cpuY })), [points]);
  const ramPoints = React.useMemo(() => points.map((p) => ({ x: p.x, y: p.ramY })), [points]);

  const cpuLine = React.useMemo(() => smoothPointsToSvgPath(cpuPoints), [cpuPoints]);
  const ramLine = React.useMemo(() => smoothPointsToSvgPath(ramPoints), [ramPoints]);

  const cpuArea = `${cpuLine} L ${plotRight} ${plotBottom} L ${plotLeft} ${plotBottom} Z`;
  const ramArea = `${ramLine} L ${plotRight} ${plotBottom} L ${plotLeft} ${plotBottom} Z`;

  const safeId = nodeName.replace(/[^a-zA-Z0-9_-]/g, "");
  const ramGradId = `chart-ram-${safeId}`;
  const cpuGradId = `chart-cpu-${safeId}`;

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;
  const lastPoint = points[points.length - 1];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    const clampedX = Math.max(plotLeft, Math.min(plotRight, mouseX));
    const ratio = (clampedX - plotLeft) / (plotRight - plotLeft);
    const idx = Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1))));
    setHoveredIdx(idx);
  };

  return (
    <div className="w-full space-y-2 pt-1 select-none">
      {/* Chart Canvas with Image 1-style Interactive Crosshair & Tooltip */}
      <div className="relative w-full h-[84px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id={ramGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={cpuGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 1. Subtle Vertical Grid Lines */}
          {[0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88].map((ratio) => {
            const vx = plotLeft + ratio * (plotRight - plotLeft);
            return (
              <line
                key={ratio}
                x1={vx}
                y1={plotTop}
                x2={vx}
                y2={plotBottom}
                stroke="currentColor"
                strokeWidth="1"
                className="text-black/[0.04] dark:text-white/[0.04]"
              />
            );
          })}

          {/* 2. Horizontal Gridlines & Y-Axis Numeric Ticks */}
          {ticks.map((tick) => {
            const y = plotBottom - (tick / yMax) * plotHeight;
            return (
              <g key={tick}>
                <line
                  x1={plotLeft}
                  y1={y}
                  x2={plotRight}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? undefined : "2,2"}
                  className={tick === 0 ? "text-black/15 dark:text-white/15" : "text-black/[0.06] dark:text-white/[0.06]"}
                />
                <text
                  x={plotLeft - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] font-mono fill-[var(--muted)]/75"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* 3. RAM Telemetry Area Fill & Line */}
          <path d={ramArea} fill={`url(#${ramGradId})`} />
          <path
            d={ramLine}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* 4. CPU Telemetry Area Fill & Line */}
          <path d={cpuArea} fill={`url(#${cpuGradId})`} />
          <path
            d={cpuLine}
            fill="none"
            stroke="#34d399"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* 5. Static Endpoint Hollow Rings at Live when not hovered */}
          {hoveredIdx === null && lastPoint && (
            <>
              <circle
                cx={lastPoint.x - 1}
                cy={lastPoint.ramY}
                r="3.5"
                className="fill-[var(--surface)]"
                stroke="#38bdf8"
                strokeWidth="2"
              />
              <circle
                cx={lastPoint.x - 1}
                cy={lastPoint.cpuY}
                r="3.5"
                className="fill-[var(--surface)]"
                stroke="#34d399"
                strokeWidth="2"
              />
            </>
          )}

          {/* 6. Active Interactive Hover Elements: Dashed Crosshair & Halo Dots */}
          {hoveredPoint && (
            <>
              <line
                x1={hoveredPoint.x}
                y1={plotTop}
                x2={hoveredPoint.x}
                y2={plotBottom}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3,3"
                className="text-slate-400 dark:text-slate-400"
              />

              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.ramY}
                r="7"
                fill="rgba(56, 189, 248, 0.28)"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.ramY}
                r="3"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.cpuY}
                r="7"
                fill="rgba(52, 211, 153, 0.28)"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.cpuY}
                r="3"
                fill="#34d399"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </>
          )}
        </svg>

        {/* 7. Image 1 Tooltip Box */}
        {hoveredPoint && (
          <div
            className={cn(
              "absolute z-30 pointer-events-none bg-[#161a22] dark:bg-[#161a22] border border-white/15 rounded-md px-2.5 py-1.5 shadow-2xl text-xs font-mono space-y-1 backdrop-blur-md transition-all duration-75",
              hoveredPoint.x > width * 0.6 ? "-translate-x-full mr-2" : "ml-2"
            )}
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: "4px",
            }}
          >
            <div className="text-[10px] text-[var(--muted)] font-medium border-b border-white/10 pb-0.5 flex items-center justify-between gap-3">
              <span>Time: {hoveredPoint.timeLabel}</span>
              <span className="text-emerald-400 font-bold">{hoveredPoint.cpuPercent}%</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-[var(--muted)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" /> CPU
              </span>
              <span className="font-bold text-[var(--foreground)] tabular-nums">
                {hoveredPoint.cpuPercent}% ({hoveredPoint.cpuRaw})
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-[var(--muted)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" /> RAM
              </span>
              <span className="font-bold text-[var(--foreground)] tabular-nums">
                {hoveredPoint.ramPercent}% ({hoveredPoint.ramRaw})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 8. Bottom Legend */}
      <div className="flex items-center justify-between pt-0.5 text-[11px] font-mono text-[var(--muted)] select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 rounded-full shrink-0" />
            <span className="hover:text-[var(--foreground)] transition-colors">CPU</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-sky-400 rounded-full shrink-0" />
            <span className="hover:text-[var(--foreground)] transition-colors">RAM</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span>15m window</span>
          <span className="inline-flex items-center gap-1 text-emerald-500 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>
    </div>
  );
}
