"use client";

// Multi-series normalized comparison chart (portfolio vs benchmark,
// ETF vs ETF). Values are expected pre-normalized (e.g. base 100).

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type UTCTimestamp,
} from "lightweight-charts";
import type { SeriesPoint } from "@/lib/types";
import { COMPARE_COLORS } from "@/lib/palette";

export function LineCompareChart({
  series,
  height = 320,
  percentScale = false,
}: {
  series: { label: string; points: SeriesPoint[]; color?: string }[];
  height?: number;
  /** Render values as % difference from 100 */
  percentScale?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || series.every((s) => s.points.length === 0)) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#697089",
        fontFamily: "inherit",
        fontSize: 11,
      },
      grid: { vertLines: { color: "transparent" }, horzLines: { color: "#20242f" } },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "#697089", width: 1, style: 3, labelBackgroundColor: "#2a2f3e" },
        horzLine: { color: "#697089", width: 1, style: 3, labelBackgroundColor: "#2a2f3e" },
      },
      rightPriceScale: { borderColor: "transparent" },
      timeScale: { borderColor: "transparent", timeVisible: false },
      handleScroll: { mouseWheel: false, pressedMouseMove: true },
      handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: true },
      localization: percentScale
        ? { priceFormatter: (v: number) => `${(v - 100).toFixed(1)}%` }
        : undefined,
    });

    series.forEach((s, i) => {
      if (s.points.length === 0) return;
      const line = chart.addLineSeries({
        color: s.color ?? COMPARE_COLORS[i % COMPARE_COLORS.length],
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: s.label,
      });
      line.setData(s.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    });

    chart.timeScale().fitContent();
    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
      chart.timeScale().fitContent();
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [series, height, percentScale]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
