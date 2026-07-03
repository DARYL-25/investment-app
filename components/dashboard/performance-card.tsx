"use client";

// Portfolio performance card: value chart or TWR-vs-benchmark comparison,
// with client-side range switching over the precomputed daily series.

import { useMemo, useState } from "react";
import { LineCompareChart } from "@/components/charts/line-compare-chart";
import type { SeriesPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES = ["1M", "6M", "YTD", "1Y", "MAX"] as const;
type R = (typeof RANGES)[number];

function sliceRange(points: SeriesPoint[], range: R): SeriesPoint[] {
  if (points.length === 0) return points;
  const last = points[points.length - 1].time;
  let from = 0;
  const now = new Date(last * 1000);
  switch (range) {
    case "1M": from = last - 31 * 86400; break;
    case "6M": from = last - 183 * 86400; break;
    case "YTD": from = Math.floor(Date.UTC(now.getUTCFullYear(), 0, 1) / 1000); break;
    case "1Y": from = last - 366 * 86400; break;
    case "MAX": return points;
  }
  return points.filter((p) => p.time >= from);
}

function rebase(points: SeriesPoint[]): SeriesPoint[] {
  if (points.length === 0) return points;
  const base = points[0].value || 1;
  return points.map((p) => ({ time: p.time, value: (p.value / base) * 100 }));
}

export function PerformanceCard({
  valueSeries,
  twrIndex,
  benchmarkIndex,
  benchmarkLabel,
}: {
  valueSeries: SeriesPoint[];
  twrIndex: SeriesPoint[];
  benchmarkIndex: SeriesPoint[];
  benchmarkLabel: string;
}) {
  const [range, setRange] = useState<R>("MAX");
  const [mode, setMode] = useState<"value" | "benchmark">("benchmark");

  const series = useMemo(() => {
    if (mode === "value") {
      return [{ label: "Portfolio value", points: sliceRange(valueSeries, range), color: "#7b79f7" }];
    }
    return [
      { label: "Portfolio", points: rebase(sliceRange(twrIndex, range)), color: "#7b79f7" },
      { label: benchmarkLabel, points: rebase(sliceRange(benchmarkIndex, range)), color: "#697089" },
    ];
  }, [mode, range, valueSeries, twrIndex, benchmarkIndex, benchmarkLabel]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 rounded-xl border border-stroke bg-surface p-1">
          {(["benchmark", "value"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                mode === m ? "bg-raised text-ink shadow-card" : "text-ink-dim hover:text-ink-mid"
              )}
            >
              {m === "benchmark" ? "vs Benchmark" : "Value"}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                range === r ? "bg-accent-soft/60 text-indigo-200" : "text-ink-dim hover:text-ink-mid"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <LineCompareChart series={series} height={300} percentScale={mode === "benchmark"} />
    </div>
  );
}
