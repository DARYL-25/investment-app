import Link from "next/link";
import { notFound } from "next/navigation";
import { GitCompareArrows, Layers } from "lucide-react";
import { getUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { findEtf } from "@/data/etfs";
import { getEtfLiveData, getHistory } from "@/lib/server/market";
import { getSymbolNews } from "@/lib/server/news";
import { fmtCurrency, fmtCompact, fmtPercent, fmtDate, timeAgo, changeColor, cn } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, ChangeBadge } from "@/components/ui/badge";
import { FactRow } from "@/components/stat";
import { BarList } from "@/components/charts/bar-list";
import { Donut } from "@/components/charts/donut";
import { Button } from "@/components/ui/button";
import { ChartSection } from "@/components/stocks/chart-section";
import { WatchlistButton } from "@/components/watchlist-button";

export const dynamic = "force-dynamic";

export default async function EtfPage({ params }: { params: { symbol: string } }) {
  const raw = decodeURIComponent(params.symbol).toUpperCase();
  const entry = findEtf(raw);
  const dataSymbol = entry?.yahooSymbol ?? raw;

  const user = (await getUser())!;
  const [live, history, watchlist] = await Promise.all([
    getEtfLiveData(dataSymbol),
    getHistory(dataSymbol, "1Y"),
    db.watchlist.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: { items: { where: { symbol: entry?.symbol ?? raw } } },
    }),
  ]);

  if (!entry && !live?.quote) notFound();

  const news = await getSymbolNews([dataSymbol]).catch(() => []);
  const q = live?.quote;
  const displaySymbol = entry?.symbol ?? raw;
  const name = entry?.name ?? q?.name ?? raw;
  const ccy = q?.currency ?? entry?.currency ?? "USD";
  const price = q?.price ?? history?.candles.at(-1)?.close ?? 0;
  const ter = live?.expenseRatio ?? entry?.ter;
  const aum = live?.totalAssets ?? (entry ? entry.aum * 1e9 : undefined);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stroke bg-raised text-indigo-300">
            <Layers size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{name}</h1>
              <Badge>{displaySymbol}</Badge>
              {entry?.ucits && <Badge tone="accent">UCITS</Badge>}
              {entry?.esg && <Badge tone="gain">ESG</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-dim">
              {entry && <span>{entry.issuer}</span>}
              {entry && <span>· tracks {entry.benchmark}</span>}
              {live?.category && <span>· {live.category}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="tnum text-2xl font-semibold text-ink">{fmtCurrency(price, ccy)}</p>
            <div className="mt-0.5 flex justify-end">
              <ChangeBadge value={q?.changePercent} />
            </div>
          </div>
          <WatchlistButton
            symbol={displaySymbol}
            assetType="ETF"
            watchlistId={watchlist?.id ?? null}
            inWatchlist={(watchlist?.items.length ?? 0) > 0}
          />
          <Link href={`/etfs/compare?symbols=${displaySymbol}`}>
            <Button variant="secondary" size="sm">
              <GitCompareArrows size={13} /> Compare
            </Button>
          </Link>
        </div>
      </div>

      {/* chart + fact sheet */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <ChartSection symbol={dataSymbol} initialCandles={history?.candles ?? []} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Fund facts" />
          <CardBody className="pt-2">
            <FactRow label="Expense ratio (TER)">
              <span className={ter != null && ter <= 0.001 ? "text-gain" : undefined}>
                {ter != null ? `${(ter * 100).toFixed(2)}%` : "—"}
              </span>
            </FactRow>
            <FactRow label="Fund size (AUM)">{aum != null ? `$${fmtCompact(aum)}` : "—"}</FactRow>
            <FactRow label="Issuer">{entry?.issuer ?? "—"}</FactRow>
            <FactRow label="Domicile">{entry?.domicile ?? "—"}</FactRow>
            <FactRow label="Replication">{entry?.replication ?? "Physical"}</FactRow>
            <FactRow label="Distribution">{entry?.distribution ?? "—"}</FactRow>
            <FactRow label="Dividend yield">
              {live?.yield != null ? fmtPercent(live.yield, { sign: false }) : "—"}
            </FactRow>
            <FactRow label="Benchmark">{entry?.benchmark ?? live?.category ?? "—"}</FactRow>
            <FactRow label="Inception">
              {live?.inceptionDate ? fmtDate(live.inceptionDate * 1000) : "—"}
            </FactRow>
            <FactRow label="Asset class">{entry?.assetClass ?? "—"}</FactRow>
          </CardBody>
        </Card>
      </div>

      {/* performance + description */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader title="Trailing returns" />
          <CardBody className="pt-2">
            <FactRow label="YTD">
              <span className={changeColor(live?.ytdReturn)}>
                {live?.ytdReturn != null ? fmtPercent(live.ytdReturn) : "—"}
              </span>
            </FactRow>
            <FactRow label="3 years (ann.)">
              <span className={changeColor(live?.threeYearReturn)}>
                {live?.threeYearReturn != null ? fmtPercent(live.threeYearReturn) : "—"}
              </span>
            </FactRow>
            <FactRow label="5 years (ann.)">
              <span className={changeColor(live?.fiveYearReturn)}>
                {live?.fiveYearReturn != null ? fmtPercent(live.fiveYearReturn) : "—"}
              </span>
            </FactRow>
            <FactRow label="Beta (3Y)">{live?.beta3Year?.toFixed(2) ?? "—"}</FactRow>
          </CardBody>
        </Card>

        {entry && (
          <Card className="md:col-span-2">
            <CardHeader title="Strategy" />
            <CardBody className="pt-3">
              <p className="text-sm leading-relaxed text-ink-mid">{entry.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {entry.tags.map((t) => (
                  <Badge key={t}>{t.replace(/-/g, " ")}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* holdings + allocations */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Top holdings" />
          <CardBody className="pt-3">
            {live?.topHoldings.length ? (
              <BarList
                items={live.topHoldings.map((h) => ({
                  label: h.name || h.symbol,
                  weight: h.weight,
                }))}
                max={10}
              />
            ) : (
              <p className="py-6 text-center text-xs text-ink-dim">Holdings data unavailable.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sector allocation" />
          <CardBody className="pt-3">
            {live?.sectorWeights.length ? (
              <Donut
                slices={live.sectorWeights.map((s) => ({ label: s.sector, weight: s.weight }))}
                size={140}
                maxLegend={7}
              />
            ) : (
              <p className="py-6 text-center text-xs text-ink-dim">Sector data unavailable.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Country allocation" />
          <CardBody className="pt-3">
            {entry?.countryWeights ? (
              <BarList
                items={Object.entries(entry.countryWeights).map(([label, weight]) => ({ label, weight }))}
                color="#2fc98c"
                max={8}
              />
            ) : (
              <p className="py-6 text-center text-xs text-ink-dim">Country data unavailable.</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* news */}
      <Card>
        <CardHeader title={`${displaySymbol} news`} />
        <CardBody className="grid gap-1 pt-3 sm:grid-cols-2">
          {news.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-dim sm:col-span-2">No recent news found.</p>
          ) : (
            news.slice(0, 6).map((n) => (
              <a
                key={n.id}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl px-3 py-2.5 transition-colors hover:bg-raised/60"
              >
                <p className="line-clamp-2 text-[13px] font-medium leading-snug text-ink group-hover:text-white">
                  {n.title}
                </p>
                <p className="mt-1 text-[11px] text-ink-dim">
                  {n.source} · {timeAgo(n.publishedAt)}
                </p>
              </a>
            ))
          )}
        </CardBody>
      </Card>

      <p className={cn("pb-2 text-center text-[11px] text-ink-dim")}>
        TER and static fund data from the Meridian catalog (issuer figures); live price, holdings and performance from market data providers.
      </p>
    </div>
  );
}
