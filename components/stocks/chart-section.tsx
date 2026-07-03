"use client";

// Interactive stock/ETF chart: timeframe switching, area vs candlestick.

import { useEffect, useState } from "react";
import { AreaChart, CandlestickChart } from "lucide-react";
import { PriceChart } from "@/components/charts/price-chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { Candle, HistoryResult, Range } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES: Range[] = ["1D", "1W", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];

export function ChartSection({
  symbol,
  initialCandles,
  initialRange = "1Y",
}: {
  symbol: string;
  initialCandles: Candle[];
  initialRange?: Range;
}) {
  const [range, setRange] = useState<Range>(initialRange);
  const [mode, setMode] = useState<"area" | "candles">("area");
  const [candles, setCandles] = useState<Candle[]>(initialCandles);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (range === initialRange) {
      setCandles(initialCandles);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: HistoryResult }) => {
        if (!cancelled && json.ok && json.data) setCandles(json.data.candles);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range, symbol, initialCandles, initialRange]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
        <div className="inline-flex items-center gap-1 rounded-xl border border-stroke bg-surface p-1">
          <button
            onClick={() => setMode("area")}
            title="Area"
            className={cn("rounded-lg p-1.5", mode === "area" ? "bg-raised text-ink" : "text-ink-dim")}
          >
            <AreaChart size={14} />
          </button>
          <button
            onClick={() => setMode("candles")}
            title="Candlesticks"
            className={cn("rounded-lg p-1.5", mode === "candles" ? "bg-raised text-ink" : "text-ink-dim")}
          >
            <CandlestickChart size={14} />
          </button>
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-[360px] w-full" />
      ) : candles.length === 0 ? (
        <p className="flex h-[360px] items-center justify-center text-xs text-ink-dim">
          No chart data available.
        </p>
      ) : (
        <PriceChart candles={candles} mode={mode} intraday={range === "1D" || range === "1W"} />
      )}
    </div>
  );
}
