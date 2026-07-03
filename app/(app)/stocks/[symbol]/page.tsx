import { notFound, redirect } from "next/navigation";
import { Building2, ExternalLink } from "lucide-react";
import { getUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import {
  getStockProfile,
  getHistory,
  getFinancials,
  getEarningsInfo,
  getOwnership,
} from "@/lib/server/market";
import { getSymbolNews } from "@/lib/server/news";
import { findEtf } from "@/data/etfs";
import { fmtCurrency, fmtCompact, fmtPercent, fmtNumber, fmtDate, timeAgo, changeColor, cn } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, ChangeBadge } from "@/components/ui/badge";
import { FactRow } from "@/components/stat";
import { ChartSection } from "@/components/stocks/chart-section";
import { Financials } from "@/components/stocks/financials";
import { WatchlistButton } from "@/components/watchlist-button";

export const dynamic = "force-dynamic";

export default async function StockPage({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase();

  // known catalog ETFs get the richer ETF page
  if (findEtf(symbol)) redirect(`/etfs/${encodeURIComponent(symbol)}`);

  const user = (await getUser())!;
  const [profile, history] = await Promise.all([
    getStockProfile(symbol),
    getHistory(symbol, "1Y"),
  ]);
  if (!profile || (!profile.quote && (history?.candles.length ?? 0) === 0)) notFound();

  const isEtfQuote = profile.quote?.quoteType === "ETF";
  const [financials, earnings, ownership, news, watchlist] = await Promise.all([
    isEtfQuote ? null : getFinancials(symbol),
    isEtfQuote ? null : getEarningsInfo(symbol),
    isEtfQuote ? null : getOwnership(symbol),
    getSymbolNews([symbol]).catch(() => []),
    db.watchlist.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: { items: { where: { symbol } } },
    }),
  ]);

  const q = profile.quote;
  const price = q?.price ?? history?.candles.at(-1)?.close ?? 0;
  const ccy = profile.currency;

  const range52 =
    profile.fiftyTwoWeekLow != null && profile.fiftyTwoWeekHigh != null
      ? (price - profile.fiftyTwoWeekLow) / (profile.fiftyTwoWeekHigh - profile.fiftyTwoWeekLow)
      : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stroke bg-raised text-ink-mid">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                {profile.name}
              </h1>
              <Badge>{symbol}</Badge>
              {profile.exchange && <Badge>{profile.exchange}</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-dim">
              {profile.sector && <span>{profile.sector}</span>}
              {profile.industry && <span>· {profile.industry}</span>}
              {profile.country && <span>· {profile.country}</span>}
              {profile.marketCap != null && (
                <span>· Mkt cap {fmtCurrency(profile.marketCap, ccy, { compact: true })}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="tnum text-2xl font-semibold text-ink">{fmtCurrency(price, ccy)}</p>
            <div className="mt-0.5 flex items-center justify-end gap-2">
              {q && (
                <span className={cn("tnum text-xs font-medium", changeColor(q.change))}>
                  {fmtCurrency(q.change, ccy, { sign: true })}
                </span>
              )}
              <ChangeBadge value={q?.changePercent} />
            </div>
          </div>
          <WatchlistButton
            symbol={symbol}
            assetType="STOCK"
            watchlistId={watchlist?.id ?? null}
            inWatchlist={(watchlist?.items.length ?? 0) > 0}
          />
        </div>
      </div>

      {/* chart + key stats */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <ChartSection symbol={symbol} initialCandles={history?.candles ?? []} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Key statistics" />
          <CardBody className="pt-2">
            <FactRow label="Market cap">{profile.marketCap != null ? fmtCurrency(profile.marketCap, ccy, { compact: true }) : "—"}</FactRow>
            <FactRow label="Volume">{profile.volume != null ? fmtCompact(profile.volume) : "—"}</FactRow>
            <FactRow label="Avg volume">{profile.avgVolume != null ? fmtCompact(profile.avgVolume) : "—"}</FactRow>
            <FactRow label="Beta">{fmtNumber(profile.beta)}</FactRow>
            <FactRow label="EPS (ttm)">{fmtNumber(profile.trailingEps)}</FactRow>
            <FactRow label="Next earnings">
              {profile.nextEarningsDate ? fmtDate(profile.nextEarningsDate * 1000) : "—"}
            </FactRow>
            <FactRow label="Dividend yield">
              {profile.dividendYield != null ? fmtPercent(profile.dividendYield, { sign: false }) : "—"}
            </FactRow>
            <FactRow label="Payout ratio">
              {profile.payoutRatio != null ? fmtPercent(profile.payoutRatio, { sign: false }) : "—"}
            </FactRow>
            {range52 != null && (
              <div className="pt-3">
                <div className="mb-1.5 flex justify-between text-[11px] text-ink-dim">
                  <span>52W {fmtCurrency(profile.fiftyTwoWeekLow!, ccy)}</span>
                  <span>{fmtCurrency(profile.fiftyTwoWeekHigh!, ccy)}</span>
                </div>
                <div className="relative h-1.5 rounded-full bg-raised">
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-bg bg-indigo-400"
                    style={{ left: `calc(${Math.max(0, Math.min(1, range52)) * 100}% - 6px)` }}
                  />
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* fundamentals */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader title="Valuation" />
          <CardBody className="pt-2">
            <FactRow label="P/E (ttm)">{fmtNumber(profile.trailingPE)}</FactRow>
            <FactRow label="Forward P/E">{fmtNumber(profile.forwardPE)}</FactRow>
            <FactRow label="PEG ratio">{fmtNumber(profile.pegRatio)}</FactRow>
            <FactRow label="P/S">{fmtNumber(profile.priceToSales)}</FactRow>
            <FactRow label="P/B">{fmtNumber(profile.priceToBook)}</FactRow>
            <FactRow label="EV/EBITDA">{fmtNumber(profile.evToEbitda)}</FactRow>
            <FactRow label="EV/Revenue">{fmtNumber(profile.evToRevenue)}</FactRow>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Profitability & growth" />
          <CardBody className="pt-2">
            <FactRow label="Gross margin">{profile.grossMargin != null ? fmtPercent(profile.grossMargin, { sign: false }) : "—"}</FactRow>
            <FactRow label="Operating margin">{profile.operatingMargin != null ? fmtPercent(profile.operatingMargin, { sign: false }) : "—"}</FactRow>
            <FactRow label="Profit margin">{profile.profitMargin != null ? fmtPercent(profile.profitMargin, { sign: false }) : "—"}</FactRow>
            <FactRow label="ROE">{profile.returnOnEquity != null ? fmtPercent(profile.returnOnEquity, { sign: false }) : "—"}</FactRow>
            <FactRow label="ROA">{profile.returnOnAssets != null ? fmtPercent(profile.returnOnAssets, { sign: false }) : "—"}</FactRow>
            <FactRow label="Revenue growth (yoy)">
              <span className={changeColor(profile.revenueGrowth)}>
                {profile.revenueGrowth != null ? fmtPercent(profile.revenueGrowth) : "—"}
              </span>
            </FactRow>
            <FactRow label="Earnings growth (yoy)">
              <span className={changeColor(profile.earningsGrowth)}>
                {profile.earningsGrowth != null ? fmtPercent(profile.earningsGrowth) : "—"}
              </span>
            </FactRow>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Balance & analysts" />
          <CardBody className="pt-2">
            <FactRow label="Total cash">{profile.totalCash != null ? fmtCurrency(profile.totalCash, ccy, { compact: true }) : "—"}</FactRow>
            <FactRow label="Total debt">{profile.totalDebt != null ? fmtCurrency(profile.totalDebt, ccy, { compact: true }) : "—"}</FactRow>
            <FactRow label="Debt / Equity">{fmtNumber(profile.debtToEquity)}</FactRow>
            <FactRow label="Current ratio">{fmtNumber(profile.currentRatio)}</FactRow>
            <FactRow label="Free cash flow">{profile.freeCashflow != null ? fmtCurrency(profile.freeCashflow, ccy, { compact: true }) : "—"}</FactRow>
            <FactRow label="Analyst target">
              {profile.targetMeanPrice != null ? (
                <span className={changeColor(profile.targetMeanPrice - price)}>
                  {fmtCurrency(profile.targetMeanPrice, ccy)} (
                  {fmtPercent(profile.targetMeanPrice / price - 1)})
                </span>
              ) : (
                "—"
              )}
            </FactRow>
            <FactRow label="Consensus">
              {profile.recommendationKey ? (
                <Badge
                  tone={
                    /buy/.test(profile.recommendationKey)
                      ? "gain"
                      : /sell|underperform/.test(profile.recommendationKey)
                        ? "loss"
                        : "neutral"
                  }
                >
                  {profile.recommendationKey.replace(/_/g, " ")}
                  {profile.numberOfAnalysts ? ` · ${profile.numberOfAnalysts} analysts` : ""}
                </Badge>
              ) : (
                "—"
              )}
            </FactRow>
          </CardBody>
        </Card>
      </div>

      {/* financial statements */}
      {financials && (financials.annual.income.length > 0 || financials.quarterly.income.length > 0) && (
        <Card>
          <CardHeader title="Financial statements" subtitle="Source: company filings via market data provider" />
          <CardBody>
            <Financials data={financials} />
          </CardBody>
        </Card>
      )}

      {/* earnings + ownership */}
      <div className="grid gap-5 lg:grid-cols-2">
        {earnings && (earnings.history.length > 0 || earnings.estimates.length > 0) && (
          <Card>
            <CardHeader title="Earnings" subtitle={earnings.nextEarningsDate ? `Next report ${fmtDate(earnings.nextEarningsDate * 1000)}` : undefined} />
            <CardBody className="space-y-5 pt-3">
              {earnings.history.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-dim">EPS history</p>
                  <div className="grid grid-cols-4 gap-2">
                    {earnings.history.slice(-4).map((h, i) => {
                      const beat = h.epsActual != null && h.epsEstimate != null && h.epsActual >= h.epsEstimate;
                      return (
                        <div key={i} className="rounded-xl border border-stroke bg-raised/40 p-3 text-center">
                          <p className="tnum text-sm font-semibold text-ink">{h.epsActual?.toFixed(2) ?? "—"}</p>
                          <p className="tnum text-[10px] text-ink-dim">est {h.epsEstimate?.toFixed(2) ?? "—"}</p>
                          {h.surprisePct != null && (
                            <p className={cn("tnum mt-1 text-[10px] font-semibold", beat ? "text-gain" : "text-loss")}>
                              {fmtPercent(h.surprisePct)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {earnings.estimates.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-dim">Analyst estimates</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-stroke text-[11px] text-ink-dim">
                        <th className="py-1.5 text-left font-medium">Period</th>
                        <th className="py-1.5 text-right font-medium">EPS est.</th>
                        <th className="py-1.5 text-right font-medium">Revenue est.</th>
                        <th className="py-1.5 text-right font-medium">Growth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke">
                      {earnings.estimates.map((e) => (
                        <tr key={e.period}>
                          <td className="py-2 text-ink-mid">{e.label}</td>
                          <td className="tnum py-2 text-right text-ink">{e.epsAvg?.toFixed(2) ?? "—"}</td>
                          <td className="tnum py-2 text-right text-ink">{e.revenueAvg != null ? fmtCompact(e.revenueAvg) : "—"}</td>
                          <td className={cn("tnum py-2 text-right", changeColor(e.growth))}>
                            {e.growth != null ? fmtPercent(e.growth) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {earnings.recommendations.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-dim">Analyst ratings</p>
                  {(() => {
                    const r = earnings.recommendations[0];
                    const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell || 1;
                    const seg = [
                      { n: r.strongBuy + r.buy, color: "#2fc98c", label: "Buy" },
                      { n: r.hold, color: "#e8b452", label: "Hold" },
                      { n: r.sell + r.strongSell, color: "#f26d6d", label: "Sell" },
                    ];
                    return (
                      <div>
                        <div className="flex h-2 overflow-hidden rounded-full">
                          {seg.map((s) => (
                            <div key={s.label} style={{ width: `${(s.n / total) * 100}%`, background: s.color }} />
                          ))}
                        </div>
                        <div className="mt-2 flex gap-4 text-[11px] text-ink-dim">
                          {seg.map((s) => (
                            <span key={s.label}>
                              <span className="font-semibold" style={{ color: s.color }}>{s.n}</span> {s.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {ownership && (ownership.institutions.length > 0 || ownership.insiderTransactions.length > 0) && (
          <Card>
            <CardHeader
              title="Ownership"
              subtitle={
                ownership.institutionsPct != null
                  ? `${(ownership.institutionsPct * 100).toFixed(0)}% institutional · ${((ownership.insidersPct ?? 0) * 100).toFixed(1)}% insiders`
                  : undefined
              }
            />
            <CardBody className="space-y-5 pt-3">
              {ownership.institutions.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-dim">Top institutions</p>
                  <ul className="space-y-1.5">
                    {ownership.institutions.slice(0, 6).map((inst) => (
                      <li key={inst.name} className="flex items-center justify-between text-xs">
                        <span className="truncate text-ink-mid">{inst.name}</span>
                        <span className="tnum ml-3 shrink-0 font-medium text-ink">
                          {(inst.pctHeld * 100).toFixed(2)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ownership.insiderTransactions.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-dim">Recent insider activity</p>
                  <ul className="space-y-2">
                    {ownership.insiderTransactions.slice(0, 6).map((t, i) => (
                      <li key={i} className="text-xs">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-medium text-ink">{t.name}</span>
                          <span className="tnum shrink-0 text-ink-dim">{t.date ? fmtDate(t.date * 1000) : ""}</span>
                        </div>
                        <p className="truncate text-[11px] text-ink-dim">
                          {t.relation} · {t.text || "Transaction"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* about + news */}
      <div className="grid gap-5 lg:grid-cols-2">
        {profile.description && (
          <Card>
            <CardHeader title={`About ${profile.name}`} />
            <CardBody className="pt-3">
              <p className="text-xs leading-relaxed text-ink-mid line-clamp-[12]">{profile.description}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-ink-dim">
                {profile.employees != null && <span>{profile.employees.toLocaleString()} employees</span>}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200"
                  >
                    Website <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader title={`${symbol} news`} />
          <CardBody className="pt-3">
            {news.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-dim">No recent news found.</p>
            ) : (
              <ul className="space-y-1">
                {news.slice(0, 6).map((n) => (
                  <li key={n.id}>
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-xl px-3 py-2 transition-colors hover:bg-raised/60"
                    >
                      <p className="line-clamp-2 text-[13px] font-medium leading-snug text-ink group-hover:text-white">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-dim">
                        {n.source} · {timeAgo(n.publishedAt)}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
