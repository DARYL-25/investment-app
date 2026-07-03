import Link from "next/link";
import { Briefcase } from "lucide-react";
import { getUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { computeAnalytics } from "@/lib/server/analytics";
import { generateInsights, computeHealthScore } from "@/lib/server/insights";
import { BENCHMARKS } from "@/lib/server/market";
import { fmtCurrency, fmtPercent, changeColor, cn } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Stat, FactRow } from "@/components/stat";
import { Donut } from "@/components/charts/donut";
import { BarList } from "@/components/charts/bar-list";
import { ChangeBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { PerformanceCard } from "@/components/dashboard/performance-card";
import { InsightCard, HealthScoreCard } from "@/components/insights";
import { PortfolioToolbar } from "@/components/portfolio/toolbar";
import { TxTable } from "@/components/portfolio/tx-table";

export const dynamic = "force-dynamic";

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: { p?: string };
}) {
  const user = (await getUser())!;
  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const active = portfolios.find((p) => p.id === searchParams.p) ?? portfolios[0];
  if (!active) return null;

  const transactions = await db.transaction.findMany({
    where: { portfolioId: active.id },
    orderBy: { date: "desc" },
  });

  const toolbar = (
    <PortfolioToolbar
      portfolios={portfolios.map((p) => ({
        id: p.id,
        name: p.name,
        baseCurrency: p.baseCurrency,
        benchmark: p.benchmark,
      }))}
      activeId={active.id}
    />
  );

  if (transactions.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Portfolio" action={toolbar} />
        <Card className="mx-auto mt-10 max-w-xl">
          <CardBody className="py-10">
            <EmptyState
              icon={<Briefcase size={30} />}
              title={`"${active.name}" has no transactions yet`}
              body="Add your first buy, deposit or dividend with the Transaction button above. Multi-currency and UCITS symbols (e.g. CSPX.L, VWCE.DE) are fully supported."
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const analytics = await computeAnalytics(transactions, active.baseCurrency, active.benchmark);
  const { metrics, positions } = analytics;
  const held = positions.filter((p) => p.quantity > 0);
  const closed = positions.filter((p) => p.quantity <= 0);
  const insights = generateInsights(analytics);
  const health = computeHealthScore(analytics);
  const ccy = active.baseCurrency;
  const benchmarkLabel = BENCHMARKS.find((b) => b.symbol === active.benchmark)?.name ?? active.benchmark;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Portfolio" subtitle={`${active.name} · ${ccy}`} action={toolbar} />

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <Stat label="Total value" value={fmtCurrency(metrics.totalValue, ccy, { compact: true })} delta={`${fmtPercent(metrics.dayChangePct)} today`} deltaValue={metrics.dayChange} />
        <Stat label="Unrealized P&L" value={fmtCurrency(metrics.unrealizedPnl, ccy, { compact: true, sign: true })} delta={fmtPercent(metrics.unrealizedPnlPct)} deltaValue={metrics.unrealizedPnl} />
        <Stat label="Cash" value={fmtCurrency(metrics.cash, ccy, { compact: true })} />
        <Stat label="XIRR" value={metrics.xirr != null ? fmtPercent(metrics.xirr) : "—"} hint="Money-weighted, annualized" />
        <Stat label="CAGR" value={metrics.cagr != null ? fmtPercent(metrics.cagr) : "—"} hint="Time-weighted, annualized" />
        <Stat label="Sharpe" value={metrics.sharpe?.toFixed(2) ?? "—"} hint={metrics.volatility != null ? `Vol ${fmtPercent(metrics.volatility, { sign: false })}` : undefined} />
      </div>

      {/* performance + risk */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Performance" subtitle={`Time-weighted vs ${benchmarkLabel}`} />
          <CardBody>
            <PerformanceCard
              valueSeries={analytics.valueSeries}
              twrIndex={analytics.twrIndex}
              benchmarkIndex={analytics.benchmarkIndex}
              benchmarkLabel={benchmarkLabel}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Risk & return" />
          <CardBody className="pt-2">
            <FactRow label="Total return (TWR)">
              <span className={changeColor(analytics.twrIndex.at(-1) ? analytics.twrIndex.at(-1)!.value - 100 : 0)}>
                {fmtPercent((analytics.twrIndex.at(-1)?.value ?? 100) / 100 - 1)}
              </span>
            </FactRow>
            <FactRow label={`${benchmarkLabel} (same period)`}>
              {metrics.benchmarkReturnPct != null ? fmtPercent(metrics.benchmarkReturnPct) : "—"}
            </FactRow>
            <FactRow label="XIRR (money-weighted)">{metrics.xirr != null ? fmtPercent(metrics.xirr) : "—"}</FactRow>
            <FactRow label="Volatility (ann.)">{metrics.volatility != null ? fmtPercent(metrics.volatility, { sign: false }) : "—"}</FactRow>
            <FactRow label="Max drawdown">
              <span className="text-loss">{metrics.maxDrawdown != null ? fmtPercent(metrics.maxDrawdown, { sign: false }) : "—"}</span>
            </FactRow>
            <FactRow label="Net deposits">{fmtCurrency(metrics.netDeposits, ccy, { compact: true })}</FactRow>
            <FactRow label="Realized P&L">{fmtCurrency(metrics.realizedPnl, ccy, { compact: true, sign: true })}</FactRow>
            <FactRow label="Dividends collected">{fmtCurrency(metrics.dividendIncome, ccy, { compact: true })}</FactRow>
          </CardBody>
        </Card>
      </div>

      {/* holdings */}
      <Card>
        <CardHeader title="Holdings" subtitle={`${held.length} open position${held.length === 1 ? "" : "s"}`} />
        <CardBody className="overflow-x-auto pt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stroke text-[11px] uppercase tracking-wide text-ink-dim">
                <th className="py-2 pr-4 font-medium">Asset</th>
                <th className="py-2 pr-4 text-right font-medium">Qty</th>
                <th className="py-2 pr-4 text-right font-medium">Avg cost</th>
                <th className="py-2 pr-4 text-right font-medium">Price</th>
                <th className="py-2 pr-4 text-right font-medium">Value ({ccy})</th>
                <th className="py-2 pr-4 text-right font-medium">Day</th>
                <th className="py-2 pr-4 text-right font-medium">Unrealized</th>
                <th className="py-2 text-right font-medium">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {held.map((p) => (
                <tr key={p.symbol} className="transition-colors hover:bg-raised/40">
                  <td className="py-3 pr-4">
                    <Link
                      href={p.assetType === "ETF" ? `/etfs/${p.symbol}` : `/stocks/${p.symbol}`}
                      className="group"
                    >
                      <span className="font-semibold text-ink group-hover:text-indigo-200">{p.symbol}</span>
                      <span className="ml-2 hidden text-ink-dim sm:inline">{p.name.slice(0, 34)}</span>
                    </Link>
                  </td>
                  <td className="tnum py-3 pr-4 text-right text-ink-mid">
                    {p.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                  </td>
                  <td className="tnum py-3 pr-4 text-right text-ink-mid">{fmtCurrency(p.avgCost, p.currency)}</td>
                  <td className="tnum py-3 pr-4 text-right text-ink">{fmtCurrency(p.price, p.currency)}</td>
                  <td className="tnum py-3 pr-4 text-right font-medium text-ink">
                    {fmtCurrency(p.valueBase, ccy, { compact: true })}
                  </td>
                  <td className="tnum py-3 pr-4 text-right">
                    <span className={changeColor(p.dayChangeBase)}>
                      {fmtCurrency(p.dayChangeBase, ccy, { sign: true, compact: true })}
                    </span>
                  </td>
                  <td className="tnum py-3 pr-4 text-right">
                    <span className={changeColor(p.unrealizedPnl)}>
                      {fmtCurrency(p.unrealizedPnlBase, ccy, { sign: true, compact: true })}
                      <span className="ml-1 text-[10px]">({fmtPercent(p.unrealizedPnlPct)})</span>
                    </span>
                  </td>
                  <td className="tnum py-3 text-right text-ink-mid">{(p.weight * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {metrics.cash > 0.01 && (
                <tr>
                  <td className="py-3 pr-4 font-medium text-ink-mid">Cash</td>
                  <td colSpan={3} />
                  <td className="tnum py-3 pr-4 text-right font-medium text-ink">
                    {fmtCurrency(metrics.cash, ccy, { compact: true })}
                  </td>
                  <td colSpan={2} />
                  <td className="tnum py-3 text-right text-ink-mid">
                    {metrics.totalValue > 0 ? ((metrics.cash / metrics.totalValue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {closed.length > 0 && (
            <p className="mt-3 text-[11px] text-ink-dim">
              Closed positions: {closed.map((p) => `${p.symbol} (${fmtCurrency(p.realizedPnlBase, ccy, { sign: true, compact: true })} realized)`).join(" · ")}
            </p>
          )}
        </CardBody>
      </Card>

      {/* exposures */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader title="Asset classes" />
          <CardBody>
            <Donut slices={analytics.assetClassExposure.map((s) => ({ label: s.label, weight: s.weight }))} size={130} maxLegend={5} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sectors" />
          <CardBody>
            <BarList items={analytics.sectorExposure.map((s) => ({ label: s.label, weight: s.weight }))} max={6} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Geography" />
          <CardBody>
            <BarList items={analytics.countryExposure.map((s) => ({ label: s.label, weight: s.weight }))} color="#2fc98c" max={6} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Currencies" />
          <CardBody>
            <BarList items={analytics.currencyExposure.map((s) => ({ label: s.label, weight: s.weight }))} color="#e8b452" max={6} />
          </CardBody>
        </Card>
      </div>

      {/* insights + health */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="AI insights" subtitle="Concentration, risk, costs and income analysis" />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            {insights.map((ins) => (
              <InsightCard key={ins.id} insight={ins} />
            ))}
          </CardBody>
        </Card>
        <HealthScoreCard health={health} />
      </div>

      {/* transactions */}
      <Card>
        <CardHeader title="Transaction history" subtitle={`${transactions.length} transactions`} />
        <CardBody className="pt-3">
          <TxTable
            portfolioId={active.id}
            transactions={transactions.map((t) => ({
              id: t.id,
              type: t.type,
              symbol: t.symbol,
              name: t.name,
              quantity: t.quantity,
              price: t.price,
              amount: t.amount,
              fees: t.fees,
              currency: t.currency,
              date: t.date.toISOString(),
              note: t.note,
            }))}
          />
        </CardBody>
      </Card>

      <p className={cn("pb-2 text-center text-[11px] text-ink-dim")}>
        Implicit deposits are assumed when buys exceed recorded cash, so XIRR stays meaningful without full cash bookkeeping.
      </p>
    </div>
  );
}
