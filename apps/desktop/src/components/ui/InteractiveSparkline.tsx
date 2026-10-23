"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SparklinePoint {
  label: string;
  value: number;
  formatted?: string;
}

export interface InteractiveSparklineProps {
  data: number[];
  labels?: string[];
  height?: number;
  width?: number;
  color?: string;
  areaGradientFrom?: string;
  areaGradientTo?: string;
  metricName?: string;
  unit?: string;
  secondaryData?: number[];
  secondaryColor?: string;
  secondaryMetricName?: string;
  secondaryUnit?: string;
  className?: string;
}

/**
 * Computes a smooth cubic Bezier curve through coordinates
 */
function createSmoothBezierPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function InteractiveSparkline({
  data,
  labels = ["-15m", "-10m", "-5m", "Live"],
  height = 80,
  width = 300,
  color = "var(--accent)",
  areaGradientFrom,
  areaGradientTo = "transparent",
  metricName = "Value",
  unit = "%",
  secondaryData,
  secondaryColor = "#38bdf8",
  secondaryMetricName = "Secondary",
  secondaryUnit = "%",
  className,
}: InteractiveSparklineProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const uid = React.useId().replace(/:/g, "");

  const padTop = 8;
  const padBottom = 20;
  const plotH = Math.max(20, height - padTop - padBottom);

  const maxVal = Math.max(100, ...data, ...(secondaryData || []));
  const minVal = 0;

  const toY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padTop + (1 - (clamped - minVal) / (maxVal - minVal || 1)) * plotH;
  };

  const primaryCoords = React.useMemo(() => {
    if (!data.length) return [];
    return data.map((val, idx) => ({
      x: (idx / Math.max(1, data.length - 1)) * (width - 24),
      y: toY(val),
    }));
  }, [data, width, height, maxVal]);

  const secondaryCoords = React.useMemo(() => {
    if (!secondaryData || !secondaryData.length) return [];
    return secondaryData.map((val, idx) => ({
      x: (idx / Math.max(1, secondaryData.length - 1)) * (width - 24),
      y: toY(val),
    }));
  }, [secondaryData, width, height, maxVal]);

  const primaryCurve = React.useMemo(
    () => createSmoothBezierPath(primaryCoords),
    [primaryCoords],
  );
  const secondaryCurve = React.useMemo(
    () =>
      secondaryCoords.length ? createSmoothBezierPath(secondaryCoords) : "",
    [secondaryCoords],
  );

  const lastPrimary = primaryCoords[primaryCoords.length - 1] || { x: 0, y: 0 };
  const lastSecondary = secondaryCoords[secondaryCoords.length - 1] || {
    x: 0,
    y: 0,
  };

  const primaryArea = React.useMemo(() => {
    if (!primaryCoords.length) return "";
    return `${primaryCurve} L ${lastPrimary.x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L 0 ${(padTop + plotH).toFixed(1)} Z`;
  }, [primaryCurve, lastPrimary, padTop, plotH]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !data.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const idx = Math.round(ratio * (data.length - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activeIdx = hoverIndex !== null ? hoverIndex : data.length - 1;
  const activePrimaryVal = data[activeIdx] ?? 0;
  const activeSecondaryVal = secondaryData
    ? (secondaryData[activeIdx] ?? 0)
    : null;
  const activeX = primaryCoords[activeIdx]?.x ?? lastPrimary.x;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative w-full select-none cursor-crosshair group/sparkline",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`grad-prim-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={areaGradientFrom || color}
              stopOpacity="0.22"
            />
            <stop offset="100%" stopColor={areaGradientTo} stopOpacity="0.0" />
          </linearGradient>
          {secondaryData && (
            <linearGradient id={`grad-sec-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.16" />
              <stop
                offset="100%"
                stopColor={areaGradientTo}
                stopOpacity="0.0"
              />
            </linearGradient>
          )}
        </defs>

        {/* Reference Gridlines */}
        <line
          x1="0"
          y1={toY(100)}
          x2={width - 24}
          y2={toY(100)}
          stroke="currentColor"
          className="text-black/5 dark:text-white/[0.06]"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1={toY(50)}
          x2={width - 24}
          y2={toY(50)}
          stroke="currentColor"
          className="text-black/5 dark:text-white/[0.05]"
          strokeDasharray="3 3"
          strokeWidth="1"
        />

        {/* Shaded Areas */}
        {secondaryAreaCurve(secondaryCoords, lastSecondary, padTop, plotH, uid)}
        <path d={primaryArea} fill={`url(#grad-prim-${uid})`} />

        {/* Secondary Curve */}
        {secondaryCurve && (
          <path
            d={secondaryCurve}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        )}

        {/* Primary Curve */}
        {primaryCurve && (
          <path
            d={primaryCurve}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {/* Interactive Scrubber Guideline */}
        {hoverIndex !== null && (
          <line
            x1={activeX}
            y1={padTop}
            x2={activeX}
            y2={padTop + plotH}
            stroke="var(--foreground)"
            strokeWidth="1"
            strokeDasharray="2 2"
            className="opacity-60"
          />
        )}

        {/* Current / Hover Target Dots */}
        {secondaryData && (
          <circle
            cx={secondaryCoords[activeIdx]?.x ?? lastSecondary.x}
            cy={secondaryCoords[activeIdx]?.y ?? lastSecondary.y}
            r={hoverIndex !== null ? "3.5" : "2.5"}
            fill={secondaryColor}
            className="transition-all duration-150"
          />
        )}
        <circle
          cx={activeX}
          cy={primaryCoords[activeIdx]?.y ?? lastPrimary.y}
          r={hoverIndex !== null ? "4" : "3"}
          fill={color}
          className="transition-all duration-150"
        />

        {/* X-Axis Ticks */}
        {labels.map((lbl, i) => {
          const ratio = i / Math.max(1, labels.length - 1);
          const xPos = ratio * (width - 40);
          const isLive = lbl.toLowerCase() === "live";
          return (
            <text
              key={lbl}
              x={xPos}
              y={height - 4}
              fontSize="9"
              className={cn(
                "font-mono select-none fill-current",
                isLive
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-[var(--muted)]/70",
              )}
            >
              {lbl}
            </text>
          );
        })}
      </svg>

      {/* Floating Micro-Scrubber Tooltip */}
      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute -top-8 px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-[10px] font-mono shadow-md text-[var(--foreground)] flex items-center gap-2 -translate-x-1/2 z-30"
          style={{
            left: `${Math.max(30, Math.min(width - 30, (activeX / (width - 24)) * 100))}%`,
          }}
        >
          <span
            className="flex items-center gap-1 font-semibold"
            style={{ color }}
          >
            {metricName}: {activePrimaryVal}
            {unit}
          </span>
          {activeSecondaryVal !== null && (
            <span
              className="flex items-center gap-1 font-semibold"
              style={{ color: secondaryColor }}
            >
              {secondaryMetricName}: {activeSecondaryVal}
              {secondaryUnit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function secondaryAreaCurve(
  coords: { x: number; y: number }[],
  lastPt: { x: number; y: number },
  top: number,
  h: number,
  uid: string,
) {
  if (!coords.length) return null;
  const path = `${createSmoothBezierPath(coords)} L ${lastPt.x.toFixed(1)} ${(top + h).toFixed(1)} L 0 ${(top + h).toFixed(1)} Z`;
  return <path d={path} fill={`url(#grad-sec-${uid})`} />;
}
