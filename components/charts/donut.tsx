// Server-renderable SVG donut chart for allocations. No client JS needed.

import { cn } from "@/lib/utils";

const PALETTE = [
  "#7b79f7",
  "#2fc98c",
  "#e8b452",
  "#5db4f0",
  "#f26d6d",
  "#c084fc",
  "#4fd1c5",
  "#f59fb0",
  "#9aa5ce",
  "#8ce99a",
];

export interface DonutSlice {
  label: string;
  weight: number; // fraction 0-1
  display?: string;
}

export function Donut({
  slices,
  size = 168,
  centerLabel,
  centerValue,
  className,
  maxLegend = 6,
}: {
  slices: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
  maxLegend?: number;
}) {
  const top = slices.slice(0, 9);
  const rest = slices.slice(9);
  const restWeight = rest.reduce((s, x) => s + x.weight, 0);
  const finalSlices = restWeight > 0.001 ? [...top, { label: "Other", weight: restWeight }] : top;

  const r = 42;
  const stroke = 13;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={cn("flex items-center gap-5", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--raised))" strokeWidth={stroke} />
          {finalSlices.map((s, i) => {
            const len = Math.max(0, s.weight) * c;
            const el = (
              <circle
                key={s.label + i}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(len - 1.2, 0)} ${c}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="tnum text-lg font-semibold text-ink">{centerValue}</span>}
            {centerLabel && <span className="text-[10px] uppercase tracking-wide text-ink-dim">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {finalSlices.slice(0, maxLegend).map((s, i) => (
          <li key={s.label + i} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="truncate text-ink-mid">{s.label}</span>
            <span className="tnum ml-auto shrink-0 font-medium text-ink">
              {s.display ?? `${(s.weight * 100).toFixed(1)}%`}
            </span>
          </li>
        ))}
        {finalSlices.length > maxLegend && (
          <li className="text-[11px] text-ink-dim">+{finalSlices.length - maxLegend} more</li>
        )}
      </ul>
    </div>
  );
}
