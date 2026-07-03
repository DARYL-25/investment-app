import Link from "next/link";
import { Search } from "lucide-react";
import { getQuotes, getTrending, MARKET_INDICES } from "@/lib/server/market";
import { fmtCurrency } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChangeBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

const POPULAR = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "BRK-B", "ASML", "V"];

export default async function StocksPage() {
  const trendingSymbols = (await getTrending()).filter((s) => !s.includes("=") && !s.startsWith("^")).slice(0, 10);
  const symbols = [...new Set([...POPULAR, ...trendingSymbols])];
  const [quotes, idxQuotes] = await Promise.all([
    getQuotes(symbols),
    getQuotes(MARKET_INDICES.map((i) => i.symbol)),
  ]);

  const rows = (list: string[]) =>
    list
      .map((s) => quotes.get(s.toUpperCase()))
      .filter(Boolean)
      .map((q) => q!);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Stock research"
        subtitle="Search any listed company by ticker or name — press ⌘K or use the search bar above."
      />

      {/* market strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {MARKET_INDICES.map((idx) => {
          const q = idxQuotes.get(idx.symbol.toUpperCase());
          return (
            <Card key={idx.symbol} className="p-3.5">
              <p className="text-[11px] font-medium text-ink-dim">{idx.name}</p>
              <p className="tnum mt-1 text-base font-semibold text-ink">
                {q ? q.price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}
              </p>
              <ChangeBadge value={q?.changePercent} className="mt-1" />
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <StockTable title="Popular stocks" quotes={rows(POPULAR)} />
        <StockTable
          title="Trending today"
          subtitle="Most searched on the market right now"
          quotes={rows(trendingSymbols)}
        />
      </div>

      <Card>
        <CardBody className="flex items-center gap-3 text-xs text-ink-dim">
          <Search size={14} />
          Deep research on every stock page: interactive charts, fundamentals, financial statements,
          analyst estimates, earnings history, insider activity and institutional ownership.
        </CardBody>
      </Card>
    </div>
  );
}

function StockTable({
  title,
  subtitle,
  quotes,
}: {
  title: string;
  subtitle?: string;
  quotes: { symbol: string; name: string; price: number; currency: string; changePercent: number; marketCap?: number }[];
}) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <CardBody className="pt-3">
        <ul className="divide-y divide-stroke">
          {quotes.map((q) => (
            <li key={q.symbol}>
              <Link
                href={`/stocks/${q.symbol}`}
                className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-raised/50"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{q.symbol}</p>
                  <p className="truncate text-[11px] text-ink-dim">{q.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {q.marketCap != null && (
                    <span className="tnum hidden text-[11px] text-ink-dim sm:block">
                      {fmtCurrency(q.marketCap, q.currency, { compact: true })}
                    </span>
                  )}
                  <span className="tnum text-[13px] font-medium text-ink">
                    {fmtCurrency(q.price, q.currency)}
                  </span>
                  <ChangeBadge value={q.changePercent} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
