import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  GBp: "p",
  CHF: "CHF ",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
};

export function fmtCurrency(
  value: number | null | undefined,
  currency = "USD",
  opts: { compact?: boolean; decimals?: number; sign?: boolean } = {}
): string {
  if (value == null || !isFinite(value)) return "—";
  const sym = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const sign = opts.sign && value > 0 ? "+" : "";
  if (opts.compact && Math.abs(value) >= 1000) {
    return `${sign}${sym}${fmtCompact(value)}`;
  }
  const decimals = opts.decimals ?? 2;
  return `${sign}${sym}${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function fmtCompact(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(2);
}

export function fmtNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null || !isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPercent(
  value: number | null | undefined,
  opts: { sign?: boolean; decimals?: number } = {}
): string {
  if (value == null || !isFinite(value)) return "—";
  const sign = (opts.sign ?? true) && value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(opts.decimals ?? 2)}%`;
}

export function fmtDate(d: Date | string | number | null | undefined): string {
  if (d == null) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function timeAgo(d: Date | string | number): string {
  const date = new Date(d);
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(date);
}

export function changeColor(v: number | null | undefined): string {
  if (v == null || !isFinite(v) || v === 0) return "text-ink-mid";
  return v > 0 ? "text-gain" : "text-loss";
}
