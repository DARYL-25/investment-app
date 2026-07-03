// AI-powered portfolio insights.
//
// A deterministic rule engine analyses the computed portfolio state
// (concentration, sector/country/currency exposure, risk, costs, income)
// and produces plain-language, actionable insights plus a composite
// health score. Deterministic-first keeps insights trustworthy and free;
// the same facts are exposed to the optional Claude assistant.

import type { HealthScore, Insight, PortfolioAnalytics } from "@/lib/types";
import { findEtf } from "@/data/etfs";
import { fmtPercent } from "@/lib/utils";

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function generateInsights(a: PortfolioAnalytics): Insight[] {
  const insights: Insight[] = [];
  const held = a.positions.filter((p) => p.quantity > 0);
  const { metrics } = a;

  if (held.length === 0) {
    return [
      {
        id: "empty",
        severity: "info",
        title: "Add your first holdings",
        body: "Record buy transactions or deposits in the Portfolio section to unlock analytics, insights and your portfolio health score.",
      },
    ];
  }

  // ---- concentration ----------------------------------------------------
  const top = held[0];
  const top3 = held.slice(0, 3).reduce((s, p) => s + p.weight, 0);
  const hhi = held.reduce((s, p) => s + p.weight ** 2, 0);

  if (top.weight > 0.35) {
    insights.push({
      id: "conc-top1",
      severity: "critical",
      title: `${top.symbol} dominates your portfolio`,
      body: `Your largest position, ${top.name}, represents ${pct(top.weight)} of total value. A single-position setback would hit hard — consider trimming or diversifying around it.`,
      metric: pct(top.weight),
    });
  } else if (top.weight > 0.2) {
    insights.push({
      id: "conc-top1",
      severity: "warning",
      title: `Heavy weight in ${top.symbol}`,
      body: `${top.name} is ${pct(top.weight)} of your portfolio. Keep an eye on position sizing as it grows.`,
      metric: pct(top.weight),
    });
  }

  if (held.length >= 3 && top3 > 0.6) {
    insights.push({
      id: "conc-top3",
      severity: top3 > 0.75 ? "critical" : "warning",
      title: "Top 3 positions carry most of the risk",
      body: `Your three largest positions represent ${pct(top3)} of portfolio value. Spreading capital further would soften single-name shocks.`,
      metric: pct(top3),
    });
  }

  if (held.length < 5) {
    insights.push({
      id: "diversification-count",
      severity: "info",
      title: "Small number of holdings",
      body: `You hold ${held.length} position${held.length === 1 ? "" : "s"}. Broad index ETFs are an efficient way to diversify without managing dozens of lines.`,
    });
  } else if (hhi < 0.08) {
    insights.push({
      id: "diversification-good",
      severity: "good",
      title: "Well diversified across positions",
      body: `With ${held.length} holdings and no oversized bets, your concentration index is healthy.`,
    });
  }

  // ---- sector -------------------------------------------------------------
  const topSector = a.sectorExposure[0];
  if (topSector && topSector.weight > 0.45) {
    insights.push({
      id: "sector",
      severity: topSector.weight > 0.6 ? "critical" : "warning",
      title: `Concentrated in ${topSector.label}`,
      body: `${pct(topSector.weight)} of your portfolio sits in ${topSector.label}. Sector downturns would be amplified — balancing with other sectors or a broad index would reduce this.`,
      metric: pct(topSector.weight),
    });
  }

  // ---- geography ------------------------------------------------------
  const topCountry = a.countryExposure[0];
  if (topCountry && topCountry.weight > 0.7 && topCountry.label !== "Global") {
    insights.push({
      id: "country",
      severity: "warning",
      title: `${pct(topCountry.weight)} exposed to ${topCountry.label}`,
      body: `Most of your portfolio depends on one economy. Adding international or global funds would spread macro and political risk.`,
      metric: pct(topCountry.weight),
    });
  }

  // ---- currency ---------------------------------------------------------
  const topCcy = a.currencyExposure[0];
  if (topCcy && topCcy.label !== a.baseCurrency && topCcy.weight > 0.5) {
    insights.push({
      id: "currency",
      severity: "info",
      title: `${pct(topCcy.weight)} of your portfolio is in ${topCcy.label}`,
      body: `Your base currency is ${a.baseCurrency}, so swings in the ${topCcy.label}/${a.baseCurrency} rate directly move your returns — currency-hedged share classes can reduce this if unwanted.`,
      metric: pct(topCcy.weight),
    });
  }

  // ---- risk ---------------------------------------------------------------
  if (metrics.volatility != null && metrics.volatility > 0.28) {
    insights.push({
      id: "volatility",
      severity: "warning",
      title: "High portfolio volatility",
      body: `Annualized volatility is ${fmtPercent(metrics.volatility, { sign: false })}, well above a broad-market ~15–18%. Expect large swings; low-volatility or bond allocations would smooth the ride.`,
      metric: fmtPercent(metrics.volatility, { sign: false }),
    });
  }
  if (metrics.maxDrawdown != null && metrics.maxDrawdown < -0.3) {
    insights.push({
      id: "drawdown",
      severity: "info",
      title: "Deep historical drawdown",
      body: `Your portfolio has fallen ${fmtPercent(Math.abs(metrics.maxDrawdown), { sign: false })} from a peak at its worst. Make sure that magnitude of loss is within your tolerance.`,
    });
  }
  if (metrics.sharpe != null && metrics.sharpe > 1) {
    insights.push({
      id: "sharpe",
      severity: "good",
      title: "Strong risk-adjusted returns",
      body: `A Sharpe ratio of ${metrics.sharpe.toFixed(2)} means you're being well compensated for the risk taken.`,
      metric: metrics.sharpe.toFixed(2),
    });
  }

  // ---- benchmark -----------------------------------------------------------
  if (metrics.benchmarkReturnPct != null && metrics.cagr != null) {
    const twr = a.twrIndex.length ? a.twrIndex[a.twrIndex.length - 1].value / 100 - 1 : 0;
    const diff = twr - metrics.benchmarkReturnPct;
    if (Math.abs(diff) > 0.02) {
      insights.push({
        id: "benchmark",
        severity: diff > 0 ? "good" : "info",
        title: diff > 0 ? "Beating your benchmark" : "Trailing your benchmark",
        body: `Since inception your time-weighted return is ${fmtPercent(twr)} vs ${fmtPercent(metrics.benchmarkReturnPct)} for the benchmark (${diff > 0 ? "+" : ""}${(diff * 100).toFixed(1)} pts).`,
      });
    }
  }

  // ---- costs (ETF TER awareness) ------------------------------------------
  const etfPositions = held.filter((p) => findEtf(p.symbol));
  if (etfPositions.length > 0) {
    const etfValue = etfPositions.reduce((s, p) => s + p.valueBase, 0);
    const weightedTer =
      etfPositions.reduce((s, p) => s + (findEtf(p.symbol)!.ter * p.valueBase), 0) / (etfValue || 1);
    if (weightedTer > 0.004) {
      insights.push({
        id: "ter",
        severity: "warning",
        title: "Your ETF fees are above average",
        body: `The value-weighted expense ratio of your ETFs is ${(weightedTer * 100).toFixed(2)}%. Core index exposure is available under 0.10% — high fees compound against you.`,
        metric: `${(weightedTer * 100).toFixed(2)}%`,
      });
    } else if (weightedTer <= 0.0015) {
      insights.push({
        id: "ter",
        severity: "good",
        title: "Excellent fee discipline",
        body: `Your ETFs cost a value-weighted ${(weightedTer * 100).toFixed(2)}% per year — cost drag this low protects long-term compounding.`,
        metric: `${(weightedTer * 100).toFixed(2)}%`,
      });
    }
  }

  // ---- cash ---------------------------------------------------------------
  const cashWeight = metrics.totalValue > 0 ? metrics.cash / metrics.totalValue : 0;
  if (cashWeight > 0.25) {
    insights.push({
      id: "cash",
      severity: "info",
      title: `${pct(cashWeight)} of your portfolio is cash`,
      body: "Large idle cash drags on long-term returns. If it isn't an emergency fund or dry powder, consider money-market ETFs or deploying gradually.",
      metric: pct(cashWeight),
    });
  }

  // ---- income ---------------------------------------------------------------
  if (metrics.dividendIncome > 0) {
    insights.push({
      id: "dividends",
      severity: "good",
      title: "Dividend income received",
      body: `You've collected ${metrics.dividendIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${a.baseCurrency} in dividends. Reinvesting them accelerates compounding.`,
    });
  }

  const order = { critical: 0, warning: 1, info: 2, good: 3 };
  insights.sort((x, y) => order[x.severity] - order[y.severity]);
  return insights;
}

export function computeHealthScore(a: PortfolioAnalytics): HealthScore {
  const held = a.positions.filter((p) => p.quantity > 0);
  if (held.length === 0) {
    return { score: 0, grade: "—", components: [] };
  }

  const clamp = (x: number) => Math.max(0, Math.min(100, x));

  // Diversification: number of effective positions (1/HHI)
  const hhi = held.reduce((s, p) => s + p.weight ** 2, 0);
  const effectiveN = hhi > 0 ? 1 / hhi : 1;
  const diversification = clamp((effectiveN / 12) * 100);

  // Concentration: penalize top-heavy books
  const top1 = held[0]?.weight ?? 0;
  const concentration = clamp(100 - Math.max(0, top1 - 0.1) * 250);

  // Sector balance
  const topSector = a.sectorExposure[0]?.weight ?? 0;
  const sectorBalance = clamp(100 - Math.max(0, topSector - 0.3) * 180);

  // Geographic balance
  const topCountry = a.countryExposure[0]?.weight ?? 0;
  const geoBalance = clamp(100 - Math.max(0, topCountry - 0.55) * 160);

  // Cost efficiency (only ETFs measurable)
  const etfPositions = held.filter((p) => findEtf(p.symbol));
  let cost = 75;
  if (etfPositions.length) {
    const etfValue = etfPositions.reduce((s, p) => s + p.valueBase, 0);
    const wTer = etfPositions.reduce((s, p) => s + findEtf(p.symbol)!.ter * p.valueBase, 0) / (etfValue || 1);
    cost = clamp(100 - wTer * 18000);
  }

  // Risk-adjusted performance
  let risk = 60;
  if (a.metrics.sharpe != null) risk = clamp(50 + a.metrics.sharpe * 30);

  const components = [
    { label: "Diversification", score: Math.round(diversification), weight: 0.25, comment: `${held.length} holdings, ~${effectiveN.toFixed(1)} effective positions` },
    { label: "Concentration", score: Math.round(concentration), weight: 0.2, comment: `Largest position ${(top1 * 100).toFixed(0)}%` },
    { label: "Sector balance", score: Math.round(sectorBalance), weight: 0.15, comment: `Top sector ${(topSector * 100).toFixed(0)}%` },
    { label: "Geographic spread", score: Math.round(geoBalance), weight: 0.15, comment: `Top market ${(topCountry * 100).toFixed(0)}%` },
    { label: "Cost efficiency", score: Math.round(cost), weight: 0.1, comment: etfPositions.length ? "Value-weighted ETF fees" : "No ETFs to measure" },
    { label: "Risk-adjusted return", score: Math.round(risk), weight: 0.15, comment: a.metrics.sharpe != null ? `Sharpe ${a.metrics.sharpe.toFixed(2)}` : "Insufficient history" },
  ];

  const score = Math.round(components.reduce((s, c) => s + c.score * c.weight, 0));
  const grade =
    score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F";

  return { score, grade, components };
}
