import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

function hexToRgb(hex) {
  if (typeof hex !== "string") return null;
  const cleaned = hex.trim().replace("#", "");
  if (![3, 6].includes(cleaned.length)) return null;
  const full =
    cleaned.length === 3
      ? cleaned.split("").map((c) => c + c).join("")
      : cleaned;
  const num = Number.parseInt(full, 16);
  if (!Number.isFinite(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function mixWithWhite(rgb, ratio) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return {
    r: clamp(rgb.r + (255 - rgb.r) * ratio),
    g: clamp(rgb.g + (255 - rgb.g) * ratio),
    b: clamp(rgb.b + (255 - rgb.b) * ratio)
  };
}

function buildSegmentColors(baseColor, count) {
  const fallback = { r: 131, g: 88, b: 121 };
  const rgb = hexToRgb(baseColor) || fallback;
  return Array.from({ length: Math.max(count, 1) }, (_, idx) => {
    const ratio = count <= 1 ? 0 : 0.12 + (idx / (count - 1)) * 0.55;
    const mixed = mixWithWhite(rgb, ratio);
    return `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;
  });
}

function polarToCartesian(cx, cy, r, angleDegrees) {
  const angleRad = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad)
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    cx,
    cy,
    "L",
    start.x,
    start.y,
    "A",
    r,
    r,
    0,
    largeArc,
    0,
    end.x,
    end.y,
    "Z"
  ].join(" ");
}

export default function WheelCanvas({
  entries = [],
  rotation = 0,
  primaryColor = "#835879",
  durationMs = 6000,
  className
}) {
  const { wedges, totalWeight, colors } = useMemo(() => {
    const total =
      entries.reduce((sum, entry) => sum + (Number(entry.weight) || 1), 0) || 1;
    let current = 0;
    const built = entries.map((entry) => {
      const weight = Number(entry.weight) || 1;
      const slice = (weight / total) * 360;
      const startAngle = current;
      const endAngle = startAngle + slice;
      current = endAngle;
      return {
        ...entry,
        startAngle,
        endAngle,
        midAngle: (startAngle + endAngle) / 2
      };
    });
    return {
      wedges: built,
      totalWeight: total,
      colors: buildSegmentColors(primaryColor, entries.length)
    };
  }, [entries, primaryColor]);

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="absolute -top-4 z-10 h-0 w-0 border-x-10 border-x-transparent border-b-[18px] border-b-slate-700 dark:border-b-slate-200" />
      <svg
        viewBox="0 0 400 400"
        className="h-80 w-80 rounded-full border-4 border-white bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950"
      >
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "200px 200px",
            transition: `transform ${durationMs}ms cubic-bezier(0.18, 0.85, 0.2, 1)`
          }}
        >
          {wedges.map((wedge, idx) => (
            <g key={`${wedge.label}-${idx}`}>
              <path
                d={describeArc(200, 200, 180, wedge.startAngle, wedge.endAngle)}
                fill={colors[idx]}
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="2"
              />
              <g
                transform={`rotate(${wedge.midAngle} 200 200) translate(200 200)`}
              >
                <text
                  x="0"
                  y="-120"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-900"
                  style={{
                    fontSize: wedges.length > 20 ? 10 : 12,
                    fontWeight: 600
                  }}
                >
                  {wedge.label}
                </text>
              </g>
            </g>
          ))}
          <circle cx="200" cy="200" r="70" fill="rgba(255,255,255,0.7)" />
        </g>
      </svg>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-600 shadow-md backdrop-blur dark:bg-slate-900/80 dark:text-slate-200">
        {entries.length || 0} entries · {totalWeight} tickets
      </div>
    </div>
  );
}
