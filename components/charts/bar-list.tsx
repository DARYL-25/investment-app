// Horizontal weighted bar list — sector/country exposure, holdings weights.

import { cn } from "@/lib/utils";

export function BarList({
  items,
  color = "#7b79f7",
  className,
  max = 10,
}: {
  items: { label: string; weight: number; display?: string }[];
  color?: string;
  className?: string;
  max?: number;
}) {
  const top = items.slice(0, max);
  const peak = Math.max(...top.map((i) => i.weight), 0.0001);
  return (
    <ul className={cn("space-y-2.5", className)}>
      {top.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-ink-mid">{item.label}</span>
            <span className="tnum shrink-0 font-medium text-ink">
              {item.display ?? `${(item.weight * 100).toFixed(1)}%`}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(item.weight / peak) * 100}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
