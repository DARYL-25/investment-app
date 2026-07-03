"use client";

// Interactive price chart built on TradingView's lightweight-charts.
// Area mode for clean overview, candlestick mode for traders, volume
// histogram underlay, range switching handled by the parent via props.

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/types";

const INK_DIM = "#697089";
const STROKE = "#20242f";
const ACCENT = "#7b79f7";
const GAIN = "#2fc98c";
const LOSS = "#f26d6d";

export function PriceChart({
  candles,
  mode = "area",
  height = 360,
  showVolume = true,
  intraday = false,
}: {
  candles: Candle[];
  mode?: "area" | "candles";
  height?: number;
  showVolume?: boolean;
  intraday?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || candles.length === 0) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: INK_DIM,
        fontFamily: "inherit",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: STROKE },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: INK_DIM, width: 1, style: 3, labelBackgroundColor: "#2a2f3e" },
        horzLine: { color: INK_DIM, width: 1, style: 3, labelBackgroundColor: "#2a2f3e" },
      },
      rightPriceScale: { borderColor: "transparent" },
      timeScale: {
        borderColor: "transparent",
        timeVisible: intraday,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: true },
      handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: true },
    });
    chartRef.current = chart;

    const up = candles[candles.length - 1].close >= candles[0].close;
    const lineColor = up ? GAIN : LOSS;

    if (mode === "candles") {
      const series = chart.addCandlestickSeries({
        upColor: GAIN,
        downColor: LOSS,
        borderUpColor: GAIN,
        borderDownColor: LOSS,
        wickUpColor: GAIN,
        wickDownColor: LOSS,
      });
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    } else {
      const series = chart.addAreaSeries({
        lineColor,
        topColor: up ? "rgba(47,201,140,0.25)" : "rgba(242,109,109,0.25)",
        bottomColor: "rgba(0,0,0,0)",
        lineWidth: 2,
        priceLineVisible: false,
      });
      series.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
    }

    if (showVolume && candles.some((c) => c.volume > 0)) {
      const vol = chart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
        color: "rgba(105,112,137,0.35)",
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      vol.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? "rgba(47,201,140,0.3)" : "rgba(242,109,109,0.3)",
        }))
      );
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
      chart.timeScale().fitContent();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, mode, height, showVolume, intraday]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
