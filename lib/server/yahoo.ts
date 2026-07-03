// Yahoo Finance data client (server-only).
//
// This is the default, key-free market data provider. All functions are
// cached (see cache.ts) and rate-limit friendly. The rest of the app talks
// to `market.ts`, which fronts this module behind a provider interface so
// paid providers (Polygon, FMP, ...) can be swapped in per-capability.

import { cached, cachedSafe } from "./cache";
import type { Candle, HistoryResult, Quote, Range, SearchResult } from "@/lib/types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const Q1 = "https://query1.finance.yahoo.com";
const Q2 = "https://query2.finance.yahoo.com";

// ---------------------------------------------------------------- crumb auth
// quoteSummary + batch quote endpoints require a session cookie and crumb.

let crumbState: { cookie: string; crumb: string; fetchedAt: number } | null = null;

async function getCrumb(): Promise<{ cookie: string; crumb: string }> {
  if (crumbState && Date.now() - crumbState.fetchedAt < 25 * 60 * 1000) {
    return crumbState;
  }
  const res = await fetch("https://fc.yahoo.com/", {
    headers: { "User-Agent": UA },
    redirect: "manual",
    cache: "no-store",
  }).catch(() => null);

  let cookie = "";
  if (res) {
    const setCookies =
      typeof (res.headers as any).getSetCookie === "function"
        ? (res.headers as any).getSetCookie()
        : [res.headers.get("set-cookie")].filter(Boolean);
    cookie = (setCookies as string[])
      .map((c) => c.split(";")[0])
      .filter(Boolean)
      .join("; ");
  }
  if (!cookie) throw new Error("yahoo: no session cookie");

  const crumbRes = await fetch(`${Q2}/v1/test/getcrumb`, {
    headers: { "User-Agent": UA, Cookie: cookie },
    cache: "no-store",
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.includes("Invalid") || crumb.length > 20) {
    throw new Error("yahoo: could not obtain crumb");
  }
  crumbState = { cookie, crumb, fetchedAt: Date.now() };
  return crumbState;
}

async function yFetch(url: string, withCrumb = false): Promise<any> {
  const headers: Record<string, string> = { "User-Agent": UA, Accept: "application/json" };
  let finalUrl = url;
  if (withCrumb) {
    const { cookie, crumb } = await getCrumb();
    headers.Cookie = cookie;
    finalUrl += (url.includes("?") ? "&" : "?") + `crumb=${encodeURIComponent(crumb)}`;
  }
  const res = await fetch(finalUrl, { headers, cache: "no-store" });
  if (res.status === 401 || res.status === 403) {
    crumbState = null; // stale crumb — force refresh on next call
    throw new Error(`yahoo: auth error ${res.status} for ${url}`);
  }
  if (!res.ok) throw new Error(`yahoo: HTTP ${res.status} for ${url}`);
  return res.json();
}

/** Extract Yahoo's `{raw, fmt}` wrapped values. */
export function rv(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return isFinite(v) ? v : undefined;
  if (typeof v === "object" && typeof v.raw === "number") return v.raw;
  return undefined;
}

// -------------------------------------------------------------------- quotes

function quoteFromV7(q: any): Quote {
  return {
    symbol: q.symbol,
    name: q.longName || q.shortName || q.symbol,
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePercent: (q.regularMarketChangePercent ?? 0) / 100,
    previousClose: q.regularMarketPreviousClose ?? 0,
    currency: q.currency ?? "USD",
    marketCap: q.marketCap,
    volume: q.regularMarketVolume,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
    exchange: q.fullExchangeName ?? q.exchange,
    marketState: q.marketState,
    quoteType: q.quoteType,
  };
}

async function quoteViaChart(symbol: string): Promise<Quote | null> {
  try {
    const data = await yFetch(
      `${Q1}/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`
    );
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice ?? 0;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
    return {
      symbol: meta.symbol ?? symbol,
      name: meta.longName ?? meta.shortName ?? symbol,
      price,
      change: price - prev,
      changePercent: prev ? (price - prev) / prev : 0,
      previousClose: prev,
      currency: meta.currency ?? "USD",
      volume: meta.regularMarketVolume,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      exchange: meta.fullExchangeName ?? meta.exchangeName,
      quoteType: meta.instrumentType,
      marketState: undefined,
    };
  } catch {
    return null;
  }
}

/** Batch quotes. Tries the v7 batch endpoint (crumb), falls back to per-symbol chart meta. */
export async function getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const unique = [...new Set(symbols.filter(Boolean))];
  const out = new Map<string, Quote>();
  if (unique.length === 0) return out;

  const key = `quotes:${unique.sort().join(",")}`;
  const result = await cachedSafe(key, 60_000, async () => {
    try {
      const data = await yFetch(
        `${Q1}/v7/finance/quote?symbols=${encodeURIComponent(unique.join(","))}`,
        true
      );
      const list = data?.quoteResponse?.result;
      if (!Array.isArray(list)) throw new Error("yahoo: bad quote payload");
      return list.map(quoteFromV7) as Quote[];
    } catch {
      // fall back to chart meta per symbol, limited concurrency
      const results: Quote[] = [];
      const batch = 8;
      for (let i = 0; i < unique.length; i += batch) {
        const chunk = await Promise.all(unique.slice(i, i + batch).map(quoteViaChart));
        for (const q of chunk) if (q) results.push(q);
      }
      return results;
    }
  });

  for (const q of result ?? []) out.set(q.symbol.toUpperCase(), q);
  return out;
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const map = await getQuotes([symbol]);
  return map.get(symbol.toUpperCase()) ?? null;
}

// ------------------------------------------------------------------- history

const RANGE_MAP: Record<Range, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "15m" },
  "1M": { range: "1mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" },
  YTD: { range: "ytd", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  "5Y": { range: "5y", interval: "1wk" },
  MAX: { range: "max", interval: "1mo" },
};

export async function getHistory(symbol: string, range: Range): Promise<HistoryResult | null> {
  const { range: r, interval } = RANGE_MAP[range] ?? RANGE_MAP["1Y"];
  return getHistoryRaw(symbol, r, interval);
}

export async function getHistoryRaw(
  symbol: string,
  range: string,
  interval: string
): Promise<HistoryResult | null> {
  const ttl = interval.endsWith("m") ? 60_000 : 10 * 60_000;
  const result = await cachedSafe(`hist:${symbol}:${range}:${interval}`, ttl, async () => {
    const data = await yFetch(
      `${Q1}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&events=div&includeAdjustedClose=true`
    );
    const res = data?.chart?.result?.[0];
    if (!res) throw new Error(`yahoo: no chart for ${symbol}`);
    const ts: number[] = res.timestamp ?? [];
    const q = res.indicators?.quote?.[0] ?? {};
    const candles: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const close = q.close?.[i];
      if (close == null) continue;
      candles.push({
        time: ts[i],
        open: q.open?.[i] ?? close,
        high: q.high?.[i] ?? close,
        low: q.low?.[i] ?? close,
        close,
        volume: q.volume?.[i] ?? 0,
      });
    }
    const dividends = res.events?.dividends
      ? Object.values(res.events.dividends as Record<string, any>).map((d) => ({
          time: d.date as number,
          amount: d.amount as number,
        }))
      : undefined;
    return {
      symbol,
      currency: res.meta?.currency ?? "USD",
      candles,
      dividends,
    } as HistoryResult;
  });
  return result ?? null;
}

/** Daily closes for the longest window needed — used by portfolio analytics. */
export async function getDailyCloses(
  symbol: string,
  fromUnix: number
): Promise<{ time: number; close: number }[]> {
  const years = (Date.now() / 1000 - fromUnix) / (365 * 86400);
  const range = years > 9 ? "max" : years > 4 ? "10y" : years > 1.8 ? "5y" : "2y";
  const hist = await getHistoryRaw(symbol, range, "1d");
  if (!hist) return [];
  return hist.candles
    .filter((c) => c.time >= fromUnix - 86400 * 7)
    .map((c) => ({ time: dayStart(c.time), close: c.close }));
}

export function dayStart(unix: number): number {
  const d = new Date(unix * 1000);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000);
}

// -------------------------------------------------------------- quoteSummary

export async function getQuoteSummary(
  symbol: string,
  modules: string[],
  ttlMs = 15 * 60_000
): Promise<any | null> {
  const key = `qs:${symbol}:${modules.join(",")}`;
  const result = await cachedSafe(key, ttlMs, async () => {
    const data = await yFetch(
      `${Q2}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules.join(",")}`,
      true
    );
    const r = data?.quoteSummary?.result?.[0];
    if (!r) throw new Error(`yahoo: no quoteSummary for ${symbol}`);
    return r;
  });
  return result ?? null;
}

// -------------------------------------------------------------------- search

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const result = await cachedSafe(`search:${query.toLowerCase()}`, 10 * 60_000, async () => {
    const data = await yFetch(
      `${Q2}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0&listsCount=0`
    );
    const quotes = data?.quotes ?? [];
    return quotes
      .filter((q: any) => q.symbol && ["EQUITY", "ETF", "INDEX", "MUTUALFUND"].includes(q.quoteType))
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exchange || "",
        type: q.quoteType,
      })) as SearchResult[];
  });
  return result ?? [];
}

// ------------------------------------------------------------------ trending

export async function getTrending(): Promise<string[]> {
  const result = await cachedSafe("trending:US", 10 * 60_000, async () => {
    const data = await yFetch(`${Q1}/v1/finance/trending/US?count=12`);
    const quotes = data?.finance?.result?.[0]?.quotes ?? [];
    return quotes.map((q: any) => q.symbol as string).filter(Boolean);
  });
  return result ?? [];
}
