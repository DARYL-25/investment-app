import Link from "next/link";
import { ArrowRight, Bell, CalendarDays, LineChart } from "lucide-react";
import { getUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { computeAnalytics } from "@/lib/server/analytics";
import { generateInsights, computeHealthScore } from "@/lib/server/insights";
import { getMarketNews } from "@/lib/server/news";
import { getQuotes, MARKET_INDICES, BENCHMARKS } from "@/lib/server/market";
import { getQuoteSummary, rv } from "@/lib/server/yahoo";
import { fmtCurrency, fmtPercent, fmtDate, timeAgo, changeColor, cn } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/stat";
import { Donut } from "@/components/charts/donut";
import { BarList } from "@/components/charts/bar-list";
import { ChangeBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { PerformanceCard } from "@/components/dashboard/performance-card";
import { DemoButton } from "@/components/dashboard/demo-button";
import { InsightCard, HealthScoreCard } from "@/components/insights";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = (await getUser())!;

  const [portfolios, watchlist, alerts] = await Promise.all([
    db.portfolio.findMany({
      where: { userId: user.id },
      include: { transactions: true },
      orderBy: { createdAt: "asc" },
    }),
    db.watchlist.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: { items: { orderBy: { addedAt: "desc" }, take: 6 } },
    }),
    db.alert.findMany({
      where: { userId: user.id, active: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const allTxs = portfolios.flatMap((p) => p.transactions);
  const benchmark = portfolios[0]?.benchmark ?? "^GSPC";
  const benchmarkLabel = BENCHMARKS.find((b) => b.symbol === benchmark)?.name ?? benchmark;

  if (allTxs.length === 0) {
    return (
      <div className="hero-veil -mx-4 -mt-6 min-h-[70vh] px-4 pt-6 sm:-mx-6 sm:px-6">
        <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} subtitle="Let's set up your portfolio." />
        <Card className="mx-auto mt-14 max-w-xl shadow-pop">
          <CardBody className="py-12">
            <EmptyState
              icon={<LineChart size={32} />}
              title="Your dashboard is waiting for data"
              body="Add transactions in the Portfolio section, or load a realistic demo portfolio to explore analytics, insights, benchmarks and the health score instantly."
              action={
                <div className="flex flex-col items-center gap-3">
                  <DemoButton />
                  <Link href="/portfolio" className="text-xs font-medium text-indigo-300 hover:text-indigo-200">
                    Or add transactions manually →
                  </Link>
                </div>
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const analytics = await computeAnalytics(allTxs, user.baseCurrency, benchmark);
  const { metrics } = analytics;
  const insights = generateInsights(analytics).slice(0, 4);
  const health = computeHealthScore(analytics);

  // watchlist quotes
  const wlSymbols = watchlist?.items.map((i) => i.symbol) ?? [];
  const wlQuotes = await getQuotes(wlSymbols);

  // market indices
  const idxQuotes = await getQuotes(MARKET_INDICES.map((i) => i.symbol));

  // earnings calendar for held positions
  const held = analytics.positions.filter((p) => p.quantity > 0 && p.assetType === "STOCK").slice(0, 8);
  const earnings = (
    await Promise.all(
      held.map(async (p) => {
        const qs = await getQuoteSummary(p.symbol, ["calendarEvents"], 6 * 3600_000);
        const dates: number[] = (qs?.calendarEvents?.earnings?.earningsDate ?? [])
          .map((d: any) => rv(d))
          .filter((n: any): n is number => typeof n === "number");
        const next = dates[0];
        return next && next * 1000 > Date.now() - 86400_000
          ? { symbol: p.symbol, name: p.name, date: next }
          : null;
      })
    )
  )
    .filter((x): x is { symbol: string; name: string; date: number } => x !== null)
    .sort((a, b) => a.date - b.date)
    .slice(0, 5);

  const news = (await getMarketNews("market").catch(() => [])).slice(0, 6);
  const ccy = user.baseCurrency;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`${portfolios.length} portfolio${portfolios.length > 1 ? "s" : ""} · base currency ${ccy}`}
      />

      {/* headline stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Total portfolio value"
          value={fmtCurrency(metrics.totalValue, ccy, { compact: true })}
          delta={`${fmtCurrency(metrics.dayChange, ccy, { sign: true, compact: true })} (${fmtPercent(metrics.dayChangePct)}) today`}
          deltaValue={metrics.dayChange}
        />
        <Stat
          label="Unrealized gain"
          value={fmtCurrency(metrics.unrealizedPnl, ccy, { compact: true, sign: true })}
          delta={fmtPercent(metrics.unrealizedPnlPct)}
          deltaValue={metrics.unrealizedPnl}
        />
        <Stat
          label="Realized gain"
          value={fmtCurrency(metrics.realizedPnl, ccy, { compact: true, sign: true })}
          hint="From closed positions"
        />
        <Stat
          label="Dividend income"
          value={fmtCurrency(metrics.dividendIncome, ccy, { compact: true })}
          hint="All time"
        />
      </div>

      {/* performance + allocation */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Performance"
            subtitle={
              metrics.benchmarkReturnPct != null
                ? `Time-weighted vs ${benchmarkLabel}`
                : "Time-weighted return"
            }
          />
          <CardBody>
            <PerformanceCard
              valueSeries={analytics.valueSeries}
              twrIndex={analytics.twrIndex}
              benchmarkIndex={analytics.benchmarkIndex}
              benchmarkLabel={benchmarkLabel}
            />
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Allocation" subtitle="By asset class" />
            <CardBody>
              <Donut
                slices={analytics.assetClassExposure.map((s) => ({ label: s.label, weight: s.weight }))}
                centerValue={fmtCurrency(metrics.totalValue, ccy, { compact: true })}
                centerLabel="Total"
                size={150}
              />
            </CardBody>
          </Card>
          <HealthScoreCard health={health} compact />
        </div>
      </div>

      {/* exposures */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader title="Sector exposure" />
          <CardBody>
            <BarList items={analytics.sectorExposure.map((s) => ({ label: s.label, weight: s.weight }))} max={6} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Geographic exposure" />
          <CardBody>
            <BarList items={analytics.countryExposure.map((s) => ({ label: s.label, weight: s.weight }))} color="#2fc98c" max={6} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Currency exposure" />
          <CardBody>
            <BarList items={analytics.currencyExposure.map((s) => ({ label: s.label, weight: s.weight }))} color="#e8b452" max={6} />
          </CardBody>
        </Card>
      </div>

      {/* insights */}
      <Card>
        <CardHeader
          title="AI insights"
          subtitle="Generated from your live portfolio composition"
          action={
            <Link href="/portfolio" className="flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200">
              Full analysis <ArrowRight size={12} />
            </Link>
          }
        />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {insights.map((ins) => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
        </CardBody>
      </Card>

      {/* watchlist + indices + alerts/earnings */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Watchlist"
            action={
              <Link href="/watchlists" className="text-xs font-medium text-indigo-300 hover:text-indigo-200">
                Manage
              </Link>
            }
          />
          <CardBody className="pt-3">
            {wlSymbols.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-dim">No symbols yet — add some in Watchlists.</p>
            ) : (
              <ul className="divide-y divide-stroke">
                {watchlist!.items.map((item) => {
                  const q = wlQuotes.get(item.symbol.toUpperCase());
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.assetType === "ETF" ? `/etfs/${item.symbol}` : `/stocks/${item.symbol}`}
                        className="flex items-center justify-between gap-2 py-2.5 transition-colors hover:bg-raised/50 -mx-2 px-2 rounded-lg"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-ink">{item.symbol}</p>
                          <p className="truncate text-[11px] text-ink-dim">{q?.name ?? ""}</p>
                        </div>
                        <div className="text-right">
                          <p className="tnum text-[13px] font-medium text-ink">
                            {q ? fmtCurrency(q.price, q.currency) : "—"}
                          </p>
                          <ChangeBadge value={q?.changePercent} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Markets" subtitle="Major indices" />
          <CardBody className="pt-3">
            <ul className="divide-y divide-stroke">
              {MARKET_INDICES.map((idx) => {
                const q = idxQuotes.get(idx.symbol.toUpperCase());
                return (
                  <li key={idx.symbol} className="flex items-center justify-between py-2.5">
                    <span className="text-[13px] font-medium text-ink-mid">{idx.name}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="tnum text-[13px] font-medium text-ink">
                        {q ? q.price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}
                      </span>
                      <ChangeBadge value={q?.changePercent} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Alerts"
              action={
                <Link href="/alerts" className="text-xs font-medium text-indigo-300 hover:text-indigo-200">
                  All alerts
                </Link>
              }
            />
            <CardBody className="pt-3">
              {alerts.length === 0 ? (
                <p className="py-4 text-center text-xs text-ink-dim">No active alerts.</p>
              ) : (
                <ul className="space-y-2">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex items-center gap-2.5 text-xs">
                      <Bell size={12} className={a.triggeredAt ? "text-warn" : "text-ink-dim"} />
                      <span className="font-semibold text-ink">{a.symbol}</span>
                      <span className="text-ink-dim">
                        {a.kind.replace(/_/g, " ").toLowerCase()} {a.threshold || ""}
                      </span>
                      {a.triggeredAt && <span className="ml-auto font-medium text-warn">triggered</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Earnings calendar" subtitle="Your holdings" />
            <CardBody className="pt-3">
              {earnings.length === 0 ? (
                <p className="py-4 text-center text-xs text-ink-dim">No upcoming earnings found.</p>
              ) : (
                <ul className="space-y-2.5">
                  {earnings.map((e) => (
                    <li key={e.symbol} className="flex items-center gap-2.5 text-xs">
                      <CalendarDays size={12} className="text-indigo-300" />
                      <Link href={`/stocks/${e.symbol}`} className="font-semibold text-ink hover:text-indigo-200">
                        {e.symbol}
                      </Link>
                      <span className="truncate text-ink-dim">{e.name}</span>
                      <span className="tnum ml-auto shrink-0 text-ink-mid">{fmtDate(e.date * 1000)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* news */}
      <Card>
        <CardHeader
          title="Market news"
          action={
            <Link href="/news" className="flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200">
              All news <ArrowRight size={12} />
            </Link>
          }
        />
        <CardBody className="grid gap-1 pt-3 sm:grid-cols-2">
          {news.map((n) => (
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
          ))}
        </CardBody>
      </Card>

      <p className={cn("pb-2 text-center text-[11px] text-ink-dim")}>
        Sharpe {metrics.sharpe?.toFixed(2) ?? "—"} · Volatility {metrics.volatility != null ? fmtPercent(metrics.volatility, { sign: false }) : "—"} · Max drawdown {metrics.maxDrawdown != null ? fmtPercent(metrics.maxDrawdown, { sign: false }) : "—"} · CAGR {metrics.cagr != null ? fmtPercent(metrics.cagr) : "—"} · XIRR {metrics.xirr != null ? fmtPercent(metrics.xirr) : "—"}
      </p>
    </div>
  );
}
