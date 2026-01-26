import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

function hexToRgb(hex) {
  if (typeof hex !== "string") return null;
  const cleaned = hex.trim().replace("#", "");
  if (![3, 6].includes(cleaned.length)) return null;
  const full = cleaned.length === 3
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
    const ratio = count <= 1 ? 0 : 0.15 + (idx / (count - 1)) * 0.5;
    const mixed = mixWithWhite(rgb, ratio);
    return `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;
  });
}

export default function WheelCanvas({
  entries = [],
  rotation = 0,
  primaryColor = "#835879",
  className
}) {
  const gradient = useMemo(() => {
    if (!entries.length) return primaryColor;
    const totalWeight = entries.reduce(
      (sum, entry) => sum + (Number(entry.weight) || 1),
      0
    ) || 1;
    const colors = buildSegmentColors(primaryColor, entries.length);
    let current = 0;
    const segments = entries.map((entry, idx) => {
      const weight = Number(entry.weight) || 1;
      const slice = (weight / totalWeight) * 360;
      const start = current;
      const end = start + slice;
      current = end;
      return `${colors[idx]} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${segments.join(", ")})`;
  }, [entries, primaryColor]);

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="absolute -top-3 z-10 h-0 w-0 border-x-8 border-x-transparent border-b-[14px] border-b-slate-700 dark:border-b-slate-200" />
      <div
        className="relative h-72 w-72 rounded-full border-4 border-white shadow-xl transition-transform duration-[1400ms] ease-out dark:border-slate-800"
        style={{ background: gradient, transform: `rotate(${rotation}deg)` }}
      >
        <div className="absolute inset-6 rounded-full bg-white/80 backdrop-blur dark:bg-slate-950/60" />
      </div>
    </div>
  );
}
