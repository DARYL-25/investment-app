// Financial news aggregation over official public RSS feeds.
// Reuters/Bloomberg no longer expose public feeds, so coverage comes from
// CNBC's official RSS, Dow Jones' MarketWatch feeds, Yahoo Finance per-ticker
// feeds and Google News' business section — all licensed for syndication.
// Items always link out to the original publisher.

import { XMLParser } from "fast-xml-parser";
import { cachedSafe } from "./cache";
import type { NewsItem } from "@/lib/types";

const UA = "Mozilla/5.0 (compatible; InvestmentApp/1.0; +https://localhost)";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

interface FeedDef {
  url: string;
  source: string;
  category: string;
}

const FEEDS: FeedDef[] = [
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", source: "CNBC", category: "market" },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664", source: "CNBC", category: "market" },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258", source: "CNBC", category: "macro" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch", category: "market" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines", source: "MarketWatch", category: "market" },
  { url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain", source: "MarketWatch", category: "market" },
  { url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en", source: "Google News", category: "macro" },
  { url: "https://news.google.com/rss/search?q=ETF%20when:2d&hl=en-US&gl=US&ceid=US:en", source: "Google News", category: "etf" },
];

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseFeed(xml: string, def: FeedDef): NewsItem[] {
  try {
    const doc = parser.parse(xml);
    const channel = doc?.rss?.channel ?? doc?.feed;
    let items = channel?.item ?? channel?.entry ?? [];
    if (!Array.isArray(items)) items = [items];
    return items
      .map((it: any): NewsItem | null => {
        const title = stripHtml(String(it.title?.["#text"] ?? it.title ?? ""));
        let link = it.link;
        if (typeof link === "object") link = link?.["@_href"] ?? link?.["#text"] ?? "";
        link = String(link ?? "").trim();
        const pub = it.pubDate ?? it.published ?? it.updated ?? it["dc:date"];
        const date = pub ? new Date(pub) : new Date();
        if (!title || !link) return null;
        // Google News aggregates other publishers; surface the real source
        let source = def.source;
        if (def.source === "Google News" && it.source?.["#text"]) source = String(it.source["#text"]);
        return {
          id: `${source}:${link}`.slice(0, 300),
          title,
          link,
          source,
          publishedAt: isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
          summary: stripHtml(String(it.description ?? it.summary ?? "")).slice(0, 240) || undefined,
          category: def.category,
        };
      })
      .filter((x: NewsItem | null): x is NewsItem => x !== null);
  } catch {
    return [];
  }
}

async function fetchFeed(def: FeedDef): Promise<NewsItem[]> {
  const items = await cachedSafe(`news:${def.url}`, 5 * 60_000, async () => {
    const res = await fetch(def.url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) throw new Error(`news: HTTP ${res.status} ${def.url}`);
    return parseFeed(await res.text(), def);
  });
  return items ?? [];
}

export async function getMarketNews(category?: string): Promise<NewsItem[]> {
  const defs = category ? FEEDS.filter((f) => f.category === category) : FEEDS;
  const all = (await Promise.all(defs.map(fetchFeed))).flat();
  return dedupeSort(all);
}

/** Ticker-specific news via Yahoo Finance RSS. */
export async function getSymbolNews(symbols: string[]): Promise<NewsItem[]> {
  const unique = [...new Set(symbols.filter(Boolean))].slice(0, 12);
  const lists = await Promise.all(
    unique.map(async (sym) => {
      const items = await cachedSafe(`news:sym:${sym}`, 5 * 60_000, async () => {
        const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(sym)}&region=US&lang=en-US`;
        const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
        if (!res.ok) throw new Error(`news: HTTP ${res.status} for ${sym}`);
        return parseFeed(await res.text(), { url, source: "Yahoo Finance", category: "stock" }).map(
          (n) => ({ ...n, symbols: [sym] })
        );
      });
      return items ?? [];
    })
  );
  return dedupeSort(lists.flat());
}

function dedupeSort(items: NewsItem[]): NewsItem[] {
  const seen = new Map<string, NewsItem>();
  for (const it of items) {
    const key = it.title.toLowerCase().slice(0, 80);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, it);
    } else if (it.symbols?.length) {
      existing.symbols = [...new Set([...(existing.symbols ?? []), ...it.symbols])];
    }
  }
  return [...seen.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
