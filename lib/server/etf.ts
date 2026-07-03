// ETF intelligence: screening, enrichment, comparison and natural-language
// discovery over the curated catalog + live market data.

import { ETF_CATALOG, findEtf, type EtfCatalogEntry } from "@/data/etfs";
import { getEtfLiveData, getQuotes, type EtfLiveData } from "./market";
import { getHistoryRaw } from "./yahoo";

export interface EtfListItem extends EtfCatalogEntry {
  price?: number;
  changePercent?: number;
  ytdReturn?: number;
}

export interface EtfFilters {
  q?: string;
  region?: string;
  assetClass?: string;
  issuer?: string;
  ucits?: boolean;
  distribution?: string;
  esg?: boolean;
  maxTer?: number;
  sort?: "ter" | "aum" | "name";
}

export function filterCatalog(f: EtfFilters): EtfCatalogEntry[] {
  let list = [...ETF_CATALOG];
  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter(
      (e) =>
        e.symbol.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.issuer.toLowerCase().includes(q) ||
        e.benchmark.toLowerCase().includes(q) ||
        e.tags.some((t) => t.includes(q))
    );
  }
  if (f.region) list = list.filter((e) => e.region === f.region);
  if (f.assetClass) list = list.filter((e) => e.assetClass === f.assetClass);
  if (f.issuer) list = list.filter((e) => e.issuer === f.issuer);
  if (f.ucits !== undefined) list = list.filter((e) => e.ucits === f.ucits);
  if (f.distribution) list = list.filter((e) => e.distribution === f.distribution);
  if (f.esg) list = list.filter((e) => e.esg);
  if (f.maxTer != null) list = list.filter((e) => e.ter <= f.maxTer!);

  switch (f.sort) {
    case "ter":
      list.sort((a, b) => a.ter - b.ter);
      break;
    case "name":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      list.sort((a, b) => b.aum - a.aum);
  }
  return list;
}

/** Attach live price/change to a list of catalog entries. */
export async function withLiveQuotes(entries: EtfCatalogEntry[]): Promise<EtfListItem[]> {
  const quotes = await getQuotes(entries.map((e) => e.yahooSymbol));
  return entries.map((e) => {
    const q = quotes.get(e.yahooSymbol.toUpperCase());
    return { ...e, price: q?.price, changePercent: q?.changePercent };
  });
}

// ------------------------------------------------------------------ compare

export interface EtfComparison {
  entries: (EtfCatalogEntry & { live: EtfLiveData | null })[];
  performance: { symbol: string; series: { time: number; value: number }[] }[]; // normalized to 100
  overlap: { pair: [string, string]; overlapPct: number; common: { name: string; weight: number }[] }[];
  trailing: { symbol: string; r1m: number | null; r6m: number | null; r1y: number | null; r3y: number | null; r5y: number | null; vol1y: number | null; maxDrawdown1y: number | null }[];
}

function trailingReturn(closes: { time: number; close: number }[], days: number): number | null {
  if (closes.length < 2) return null;
  const last = closes[closes.length - 1];
  const cutoff = last.time - days * 86400;
  let start = closes[0];
  for (const c of closes) {
    if (c.time >= cutoff) {
      start = c;
      break;
    }
  }
  // require at least ~80% of the window to exist
  if (last.time - closes[0].time < days * 86400 * 0.8 && days > 40) return null;
  return start.close ? last.close / start.close - 1 : null;
}

export async function compareEtfs(symbols: string[]): Promise<EtfComparison> {
  const entries = symbols
    .map((s) => findEtf(s))
    .filter((x): x is EtfCatalogEntry => Boolean(x));

  const [lives, histories] = await Promise.all([
    Promise.all(entries.map((e) => getEtfLiveData(e.yahooSymbol))),
    Promise.all(entries.map((e) => getHistoryRaw(e.yahooSymbol, "5y", "1d"))),
  ]);

  // normalized performance (common start)
  const performance = entries.map((e, i) => {
    const candles = histories[i]?.candles ?? [];
    const base = candles[0]?.close || 1;
    return {
      symbol: e.symbol,
      series: candles.map((c) => ({ time: c.time, value: (c.close / base) * 100 })),
    };
  });

  // trailing returns + risk
  const trailing = entries.map((e, i) => {
    const closes = (histories[i]?.candles ?? []).map((c) => ({ time: c.time, close: c.close }));
    const oneYear = closes.filter((c) => c.time >= Date.now() / 1000 - 370 * 86400);
    let vol: number | null = null;
    let mdd: number | null = null;
    if (oneYear.length > 30) {
      const rets: number[] = [];
      for (let j = 1; j < oneYear.length; j++) {
        if (oneYear[j - 1].close > 0) rets.push(oneYear[j].close / oneYear[j - 1].close - 1);
      }
      const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      const varr = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
      vol = Math.sqrt(varr) * Math.sqrt(252);
      let peak = -Infinity;
      let worst = 0;
      for (const c of oneYear) {
        peak = Math.max(peak, c.close);
        worst = Math.min(worst, c.close / peak - 1);
      }
      mdd = worst;
    }
    return {
      symbol: e.symbol,
      r1m: trailingReturn(closes, 30),
      r6m: trailingReturn(closes, 182),
      r1y: trailingReturn(closes, 365),
      r3y: trailingReturn(closes, 365 * 3),
      r5y: trailingReturn(closes, 365 * 5),
      vol1y: vol,
      maxDrawdown1y: mdd,
    };
  });

  // holdings overlap (top-10 based; weight-min method)
  const overlap: EtfComparison["overlap"] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = lives[i]?.topHoldings ?? [];
      const b = lives[j]?.topHoldings ?? [];
      const bMap = new Map(b.map((h) => [normHolding(h.symbol || h.name), h]));
      let sum = 0;
      const common: { name: string; weight: number }[] = [];
      for (const h of a) {
        const match = bMap.get(normHolding(h.symbol || h.name));
        if (match) {
          const w = Math.min(h.weight, match.weight);
          sum += w;
          common.push({ name: h.name || h.symbol, weight: w });
        }
      }
      common.sort((x, y) => y.weight - x.weight);
      overlap.push({ pair: [entries[i].symbol, entries[j].symbol], overlapPct: sum, common });
    }
  }

  return {
    entries: entries.map((e, i) => ({ ...e, live: lives[i] })),
    performance,
    overlap,
    trailing,
  };
}

function normHolding(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

// ---------------------------------------------------- natural-language search

// Keyword-driven scoring over the catalog. If ANTHROPIC_API_KEY is set the
// query is first translated into structured filters by Claude; otherwise a
// robust keyword engine handles the common phrasings directly.

interface ParsedIntent {
  keywords: string[];
  ucits?: boolean;
  distribution?: string;
  lowCost?: boolean;
  esg?: boolean;
  assetClass?: string;
  region?: string;
}

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  sp500: ["s&p 500", "s&p500", "sp500", "sp 500", "500", "s&p"],
  nasdaq100: ["nasdaq", "qqq", "nasdaq-100", "nasdaq 100"],
  world: ["world", "global", "all-world", "acwi", "whole world", "international"],
  "emerging-markets": ["emerging", "em ", "emerging markets"],
  dividend: ["dividend", "income", "yield", "payout"],
  "dividend-growth": ["dividend growth", "aristocrat", "growing dividend"],
  tech: ["tech", "technology", "software"],
  ai: ["ai", "artificial intelligence", "machine learning", "robotics", "automation"],
  semiconductors: ["semiconductor", "chip", "chips"],
  bond: ["bond", "fixed income", "treasury", "treasuries"],
  gold: ["gold", "precious metal"],
  "clean-energy": ["clean energy", "renewable", "solar", "green energy", "climate"],
  esg: ["esg", "sri", "sustainable", "ethical", "socially responsible"],
  "small-cap": ["small cap", "small-cap", "smallcap"],
  "low-volatility": ["low volatility", "min vol", "defensive", "low risk"],
  value: ["value"],
  growth: ["growth"],
  quality: ["quality"],
  momentum: ["momentum"],
  "cash-like": ["cash", "money market", "parking", "overnight", "t-bill", "tbill"],
  europe: ["europe", "european", "stoxx"],
  japan: ["japan", "japanese"],
  china: ["china", "chinese"],
  reit: ["reit", "real estate", "property"],
  "covered-call": ["covered call", "option income", "premium income"],
};

export function parseQuery(query: string): ParsedIntent {
  const q = ` ${query.toLowerCase()} `;
  const keywords: string[] = [];
  for (const [tag, synonyms] of Object.entries(KEYWORD_SYNONYMS)) {
    if (synonyms.some((s) => q.includes(s))) keywords.push(tag);
  }
  const intent: ParsedIntent = { keywords };

  if (/\bucits\b|europe[- ]domiciled|irish|ireland|eu investor/i.test(query)) intent.ucits = true;
  if (/accumulat|acc\b|reinvest/i.test(query)) intent.distribution = "Accumulating";
  if (/distribut|dist\b|pays? (out|dividends)|quarterly payout/i.test(query)) intent.distribution = "Distributing";
  if (/low[- ]cost|cheap|low fee|low ter|lowest/i.test(query)) intent.lowCost = true;
  if (/\besg\b|sustainab|ethical|sri\b/i.test(query)) intent.esg = true;
  if (/\bbond|fixed income|treasur/i.test(query)) intent.assetClass = "Bond";
  if (/\bgold|commodit/i.test(query)) intent.assetClass = "Commodity";

  return intent;
}

export interface DiscoveryResult {
  etf: EtfCatalogEntry;
  score: number;
  reasons: string[];
}

export function discoverEtfs(query: string, limit = 8): DiscoveryResult[] {
  const intent = parseQuery(query);
  const results: DiscoveryResult[] = [];

  for (const etf of ETF_CATALOG) {
    let score = 0;
    const reasons: string[] = [];

    for (const kw of intent.keywords) {
      if (etf.tags.includes(kw)) {
        score += 30;
        reasons.push(`matches "${kw.replace(/-/g, " ")}"`);
      }
    }
    // direct text hits
    const q = query.toLowerCase();
    if (etf.name.toLowerCase().includes(q) || etf.symbol.toLowerCase() === q.trim()) score += 40;
    if (etf.benchmark.toLowerCase().split(" ").some((w) => w.length > 3 && q.includes(w.toLowerCase()))) score += 5;

    if (intent.ucits !== undefined) {
      if (etf.ucits === intent.ucits) {
        score += 25;
        if (intent.ucits) reasons.push("UCITS fund");
      } else {
        score -= 40;
      }
    }
    if (intent.distribution) {
      if (etf.distribution === intent.distribution) {
        score += 15;
        reasons.push(intent.distribution.toLowerCase());
      } else {
        score -= 20;
      }
    }
    if (intent.esg) {
      if (etf.esg) {
        score += 20;
        reasons.push("ESG screened");
      } else score -= 15;
    }
    if (intent.assetClass && etf.assetClass === intent.assetClass) score += 20;

    if (intent.lowCost) {
      // reward cheapness within the matched set
      score += Math.max(0, 15 - etf.ter * 10000 * 1.5);
      if (etf.ter <= 0.001) reasons.push(`ultra-low ${(etf.ter * 100).toFixed(2)}% TER`);
      else if (etf.ter <= 0.002) reasons.push(`low ${(etf.ter * 100).toFixed(2)}% TER`);
    }

    // liquidity/size prior: prefer larger funds slightly
    score += Math.min(10, Math.log10(Math.max(etf.aum, 0.1)) * 4);

    if (score > 25) results.push({ etf, score, reasons: [...new Set(reasons)].slice(0, 3) });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/** Optional Claude-powered intent parsing for harder queries. */
export async function discoverEtfsSmart(query: string): Promise<{ results: DiscoveryResult[]; explanation?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const baseline = discoverEtfs(query);
  if (!apiKey) return { results: baseline };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `You translate an investor's natural-language ETF request into search keywords. Reply ONLY with JSON: {"keywords": string[], "explanation": string}. Available keyword tags: ${Object.keys(KEYWORD_SYNONYMS).join(", ")}, plus "ucits", "accumulating", "distributing", "low-cost". Request: "${query.slice(0, 300)}"`,
          },
        ],
      }),
      cache: "no-store",
    });
    if (!res.ok) return { results: baseline };
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const enriched = discoverEtfs(`${query} ${(json.keywords ?? []).join(" ")}`);
    return { results: enriched, explanation: json.explanation };
  } catch {
    return { results: baseline };
  }
}
