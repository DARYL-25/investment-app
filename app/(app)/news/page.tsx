import Link from "next/link";
import { Newspaper } from "lucide-react";
import { getUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getMarketNews, getSymbolNews } from "@/lib/server/news";
import { replayLedger } from "@/lib/server/analytics";
import { timeAgo, cn } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { key: "all", label: "All news" },
  { key: "market", label: "Markets" },
  { key: "macro", label: "Macro" },
  { key: "etf", label: "ETFs" },
  { key: "portfolio", label: "My portfolio" },
];

export default async function NewsPage({
  searchParams,
}: {
  searchParams: { c?: string };
}) {
  const category = CATEGORIES.some((c) => c.key === searchParams.c) ? searchParams.c! : "all";
  const user = (await getUser())!;

  let items: NewsItem[] = [];
  let heldSymbols: string[] = [];

  if (category === "portfolio") {
    const txs = await db.transaction.findMany({ where: { portfolio: { userId: user.id } } });
    const state = replayLedger(txs);
    heldSymbols = [...state.lots.entries()].filter(([, l]) => l.qty > 0).map(([s]) => s);
    items = heldSymbols.length ? await getSymbolNews(heldSymbols).catch(() => []) : [];
  } else {
    items = await getMarketNews(category === "all" ? undefined : category).catch(() => []);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="News"
        subtitle="Aggregated from CNBC, MarketWatch, Yahoo Finance and Google News — links open at the original publisher."
      />

      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-stroke bg-surface p-1">
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={c.key === "all" ? "/news" : `/news?c=${c.key}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              category === c.key ? "bg-raised text-ink shadow-card" : "text-ink-dim hover:text-ink-mid"
            )}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {category === "portfolio" && heldSymbols.length > 0 && (
        <p className="text-xs text-ink-dim">
          Tracking news for: {heldSymbols.map((s) => (
            <Link key={s} href={`/stocks/${s}`} className="mr-1.5 font-medium text-indigo-300 hover:text-indigo-200">
              {s}
            </Link>
          ))}
        </p>
      )}

      {items.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Newspaper size={30} />}
              title={category === "portfolio" ? "No portfolio news yet" : "No news available right now"}
              body={
                category === "portfolio"
                  ? "Add holdings to your portfolio and stock-specific news for each position will appear here."
                  : "News feeds may be temporarily unreachable — try again in a moment."
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.slice(0, 40).map((n) => (
            <a
              key={n.id}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-stroke bg-surface/80 p-4 transition-all hover:border-stroke-strong hover:shadow-pop"
            >
              <div className="flex items-center gap-2">
                <Badge tone="accent">{n.source}</Badge>
                {n.symbols?.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
                <span className="ml-auto text-[11px] text-ink-dim">{timeAgo(n.publishedAt)}</span>
              </div>
              <p className="mt-2.5 line-clamp-2 text-sm font-medium leading-snug text-ink group-hover:text-white">
                {n.title}
              </p>
              {n.summary && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-dim">{n.summary}</p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
