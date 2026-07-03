// Market data facade — the only module the app imports for market data.
// Currently backed by the Yahoo client; the normalized return shapes are
// provider-agnostic so Polygon/FMP adapters can replace individual
// capabilities without touching callers.

import { getQuoteSummary, getQuotes, getQuote, getHistory, searchSymbols, getTrending, rv } from "./yahoo";
import type { Quote, Range } from "@/lib/types";

export { getQuotes, getQuote, getHistory, searchSymbols, getTrending };

// ------------------------------------------------------------ stock profile

export interface StockProfile {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  country?: string;
  website?: string;
  employees?: number;
  description?: string;
  exchange?: string;
  currency: string;
  marketCap?: number;
  quote: Quote | null;
  // valuation
  trailingPE?: number;
  forwardPE?: number;
  pegRatio?: number;
  priceToSales?: number;
  priceToBook?: number;
  evToEbitda?: number;
  evToRevenue?: number;
  // dividends
  dividendYield?: number;
  dividendRate?: number;
  payoutRatio?: number;
  exDividendDate?: number;
  // quality / risk
  beta?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  debtToEquity?: number;
  currentRatio?: number;
  profitMargin?: number;
  operatingMargin?: number;
  grossMargin?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  freeCashflow?: number;
  totalCash?: number;
  totalDebt?: number;
  trailingEps?: number;
  forwardEps?: number;
  targetMeanPrice?: number;
  recommendationKey?: string;
  recommendationMean?: number;
  numberOfAnalysts?: number;
  sharesOutstanding?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  volume?: number;
  avgVolume?: number;
  nextEarningsDate?: number;
}

const PROFILE_MODULES = [
  "price",
  "summaryProfile",
  "summaryDetail",
  "defaultKeyStatistics",
  "financialData",
  "calendarEvents",
];

export async function getStockProfile(symbol: string): Promise<StockProfile | null> {
  const [qs, quote] = await Promise.all([
    getQuoteSummary(symbol, PROFILE_MODULES),
    getQuote(symbol),
  ]);
  if (!qs && !quote) return null;

  const p = qs?.summaryProfile ?? {};
  const sd = qs?.summaryDetail ?? {};
  const ks = qs?.defaultKeyStatistics ?? {};
  const fd = qs?.financialData ?? {};
  const price = qs?.price ?? {};
  const cal = qs?.calendarEvents ?? {};

  const earningsDates: number[] = (cal?.earnings?.earningsDate ?? [])
    .map((d: any) => rv(d))
    .filter((n: any): n is number => typeof n === "number");

  return {
    symbol: symbol.toUpperCase(),
    name: price.longName || price.shortName || quote?.name || symbol,
    sector: p.sector,
    industry: p.industry,
    country: p.country,
    website: p.website,
    employees: p.fullTimeEmployees,
    description: p.longBusinessSummary,
    exchange: price.exchangeName || quote?.exchange,
    currency: price.currency || quote?.currency || "USD",
    marketCap: rv(price.marketCap) ?? quote?.marketCap,
    quote,
    trailingPE: rv(sd.trailingPE),
    forwardPE: rv(sd.forwardPE) ?? rv(ks.forwardPE),
    pegRatio: rv(ks.pegRatio) ?? rv(fd.pegRatio),
    priceToSales: rv(sd.priceToSalesTrailing12Months),
    priceToBook: rv(ks.priceToBook),
    evToEbitda: rv(ks.enterpriseToEbitda),
    evToRevenue: rv(ks.enterpriseToRevenue),
    dividendYield: rv(sd.dividendYield),
    dividendRate: rv(sd.dividendRate),
    payoutRatio: rv(sd.payoutRatio),
    exDividendDate: rv(sd.exDividendDate),
    beta: rv(sd.beta),
    returnOnEquity: rv(fd.returnOnEquity),
    returnOnAssets: rv(fd.returnOnAssets),
    debtToEquity: rv(fd.debtToEquity),
    currentRatio: rv(fd.currentRatio),
    profitMargin: rv(fd.profitMargins) ?? rv(ks.profitMargins),
    operatingMargin: rv(fd.operatingMargins),
    grossMargin: rv(fd.grossMargins),
    revenueGrowth: rv(fd.revenueGrowth),
    earningsGrowth: rv(fd.earningsGrowth),
    freeCashflow: rv(fd.freeCashflow),
    totalCash: rv(fd.totalCash),
    totalDebt: rv(fd.totalDebt),
    trailingEps: rv(ks.trailingEps),
    forwardEps: rv(ks.forwardEps),
    targetMeanPrice: rv(fd.targetMeanPrice),
    recommendationKey: fd.recommendationKey,
    recommendationMean: rv(fd.recommendationMean),
    numberOfAnalysts: rv(fd.numberOfAnalystOpinions),
    sharesOutstanding: rv(ks.sharesOutstanding),
    fiftyTwoWeekLow: rv(sd.fiftyTwoWeekLow) ?? quote?.fiftyTwoWeekLow,
    fiftyTwoWeekHigh: rv(sd.fiftyTwoWeekHigh) ?? quote?.fiftyTwoWeekHigh,
    volume: rv(sd.volume) ?? quote?.volume,
    avgVolume: rv(sd.averageVolume),
    nextEarningsDate: earningsDates[0],
  };
}

// ------------------------------------------------------- financial statements

export interface StatementRow {
  label: string;
  values: (number | null)[]; // aligned with `periods`
}

export interface FinancialStatements {
  currency: string;
  annual: { periods: string[]; income: StatementRow[]; balance: StatementRow[]; cashflow: StatementRow[] };
  quarterly: { periods: string[]; income: StatementRow[]; balance: StatementRow[]; cashflow: StatementRow[] };
}

const INCOME_FIELDS: [string, string][] = [
  ["totalRevenue", "Total Revenue"],
  ["costOfRevenue", "Cost of Revenue"],
  ["grossProfit", "Gross Profit"],
  ["researchDevelopment", "R&D"],
  ["sellingGeneralAdministrative", "SG&A"],
  ["operatingIncome", "Operating Income"],
  ["ebit", "EBIT"],
  ["interestExpense", "Interest Expense"],
  ["incomeBeforeTax", "Pre-Tax Income"],
  ["incomeTaxExpense", "Tax Expense"],
  ["netIncome", "Net Income"],
];

const BALANCE_FIELDS: [string, string][] = [
  ["cash", "Cash & Equivalents"],
  ["shortTermInvestments", "Short-Term Investments"],
  ["netReceivables", "Receivables"],
  ["inventory", "Inventory"],
  ["totalCurrentAssets", "Total Current Assets"],
  ["propertyPlantEquipment", "PP&E"],
  ["goodWill", "Goodwill"],
  ["totalAssets", "Total Assets"],
  ["accountsPayable", "Accounts Payable"],
  ["shortLongTermDebt", "Short-Term Debt"],
  ["totalCurrentLiabilities", "Total Current Liabilities"],
  ["longTermDebt", "Long-Term Debt"],
  ["totalLiab", "Total Liabilities"],
  ["totalStockholderEquity", "Shareholders' Equity"],
];

const CASHFLOW_FIELDS: [string, string][] = [
  ["totalCashFromOperatingActivities", "Operating Cash Flow"],
  ["capitalExpenditures", "Capital Expenditures"],
  ["totalCashflowsFromInvestingActivities", "Investing Cash Flow"],
  ["dividendsPaid", "Dividends Paid"],
  ["repurchaseOfStock", "Stock Buybacks"],
  ["totalCashFromFinancingActivities", "Financing Cash Flow"],
  ["changeInCash", "Net Change in Cash"],
];

function buildStatement(items: any[], fields: [string, string][]): { periods: string[]; rows: StatementRow[] } {
  const sorted = [...(items ?? [])].sort((a, b) => (rv(a.endDate) ?? 0) - (rv(b.endDate) ?? 0));
  const periods = sorted.map((it) => {
    const ts = rv(it.endDate);
    return ts ? new Date(ts * 1000).toISOString().slice(0, 7) : "—";
  });
  const rows: StatementRow[] = fields
    .map(([key, label]) => ({
      label,
      values: sorted.map((it) => rv(it[key]) ?? null),
    }))
    // Yahoo emits 0 for fields it no longer populates — hide rows with no signal
    .filter((r) => r.values.some((v) => v != null && v !== 0));
  return { periods, rows };
}

export async function getFinancials(symbol: string): Promise<FinancialStatements | null> {
  const qs = await getQuoteSummary(
    symbol,
    [
      "incomeStatementHistory",
      "incomeStatementHistoryQuarterly",
      "balanceSheetHistory",
      "balanceSheetHistoryQuarterly",
      "cashflowStatementHistory",
      "cashflowStatementHistoryQuarterly",
      "price",
    ],
    30 * 60_000
  );
  if (!qs) return null;

  const ai = buildStatement(qs.incomeStatementHistory?.incomeStatementHistory, INCOME_FIELDS);
  const ab = buildStatement(qs.balanceSheetHistory?.balanceSheetStatements, BALANCE_FIELDS);
  const ac = buildStatement(qs.cashflowStatementHistory?.cashflowStatements, CASHFLOW_FIELDS);
  const qi = buildStatement(qs.incomeStatementHistoryQuarterly?.incomeStatementHistory, INCOME_FIELDS);
  const qb = buildStatement(qs.balanceSheetHistoryQuarterly?.balanceSheetStatements, BALANCE_FIELDS);
  const qc = buildStatement(qs.cashflowStatementHistoryQuarterly?.cashflowStatements, CASHFLOW_FIELDS);

  return {
    currency: qs.price?.currency ?? "USD",
    annual: { periods: ai.periods.length ? ai.periods : ab.periods, income: ai.rows, balance: ab.rows, cashflow: ac.rows },
    quarterly: { periods: qi.periods.length ? qi.periods : qb.periods, income: qi.rows, balance: qb.rows, cashflow: qc.rows },
  };
}

// -------------------------------------------------- earnings / analysts / etc

export interface EarningsInfo {
  history: { quarter: string; epsEstimate: number | null; epsActual: number | null; surprisePct: number | null }[];
  estimates: { period: string; label: string; epsAvg: number | null; epsLow: number | null; epsHigh: number | null; revenueAvg: number | null; growth: number | null }[];
  recommendations: { period: string; strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }[];
  nextEarningsDate?: number;
  quarterlyEarnings: { quarter: string; revenue: number | null; earnings: number | null }[];
}

export async function getEarningsInfo(symbol: string): Promise<EarningsInfo | null> {
  const qs = await getQuoteSummary(
    symbol,
    ["earnings", "earningsHistory", "earningsTrend", "recommendationTrend", "calendarEvents"],
    30 * 60_000
  );
  if (!qs) return null;

  const history = (qs.earningsHistory?.history ?? []).map((h: any) => ({
    quarter: h.period ?? "",
    epsEstimate: rv(h.epsEstimate) ?? null,
    epsActual: rv(h.epsActual) ?? null,
    surprisePct: rv(h.surprisePercent) ?? null,
  }));

  const labels: Record<string, string> = {
    "0q": "Current Qtr",
    "+1q": "Next Qtr",
    "0y": "Current Year",
    "+1y": "Next Year",
    "+5y": "Next 5 Years",
    "-5y": "Past 5 Years",
  };
  const estimates = (qs.earningsTrend?.trend ?? [])
    .filter((t: any) => ["0q", "+1q", "0y", "+1y"].includes(t.period))
    .map((t: any) => ({
      period: t.period,
      label: labels[t.period] ?? t.period,
      epsAvg: rv(t.earningsEstimate?.avg) ?? null,
      epsLow: rv(t.earningsEstimate?.low) ?? null,
      epsHigh: rv(t.earningsEstimate?.high) ?? null,
      revenueAvg: rv(t.revenueEstimate?.avg) ?? null,
      growth: rv(t.growth) ?? null,
    }));

  const recommendations = (qs.recommendationTrend?.trend ?? []).map((t: any) => ({
    period: t.period,
    strongBuy: t.strongBuy ?? 0,
    buy: t.buy ?? 0,
    hold: t.hold ?? 0,
    sell: t.sell ?? 0,
    strongSell: t.strongSell ?? 0,
  }));

  const earningsDates: number[] = (qs.calendarEvents?.earnings?.earningsDate ?? [])
    .map((d: any) => rv(d))
    .filter((n: any): n is number => typeof n === "number");

  const quarterlyEarnings = (qs.earnings?.financialsChart?.quarterly ?? []).map((q: any) => ({
    quarter: String(q.date ?? ""),
    revenue: rv(q.revenue) ?? null,
    earnings: rv(q.earnings) ?? null,
  }));

  return { history, estimates, recommendations, nextEarningsDate: earningsDates[0], quarterlyEarnings };
}

export interface OwnershipInfo {
  insidersPct?: number;
  institutionsPct?: number;
  institutions: { name: string; pctHeld: number; value: number }[];
  insiderTransactions: { name: string; relation: string; text: string; date: number; shares?: number; value?: number }[];
}

export async function getOwnership(symbol: string): Promise<OwnershipInfo | null> {
  const qs = await getQuoteSummary(
    symbol,
    ["majorHoldersBreakdown", "institutionOwnership", "insiderTransactions"],
    60 * 60_000
  );
  if (!qs) return null;
  return {
    insidersPct: rv(qs.majorHoldersBreakdown?.insidersPercentHeld),
    institutionsPct: rv(qs.majorHoldersBreakdown?.institutionsPercentHeld),
    institutions: (qs.institutionOwnership?.ownershipList ?? []).slice(0, 10).map((o: any) => ({
      name: o.organization ?? "",
      pctHeld: rv(o.pctHeld) ?? 0,
      value: rv(o.value) ?? 0,
    })),
    insiderTransactions: (qs.insiderTransactions?.transactions ?? []).slice(0, 12).map((t: any) => ({
      name: t.filerName ?? "",
      relation: t.filerRelation ?? "",
      text: t.transactionText ?? "",
      date: rv(t.startDate) ?? 0,
      shares: rv(t.shares),
      value: rv(t.value),
    })),
  };
}

// -------------------------------------------------------------- ETF live data

export interface EtfLiveData {
  quote: Quote | null;
  expenseRatio?: number;
  totalAssets?: number;
  yield?: number;
  category?: string;
  topHoldings: { symbol: string; name: string; weight: number }[];
  sectorWeights: { sector: string; weight: number }[];
  ytdReturn?: number;
  threeYearReturn?: number;
  fiveYearReturn?: number;
  beta3Year?: number;
  inceptionDate?: number;
}

const SECTOR_LABELS: Record<string, string> = {
  realestate: "Real Estate",
  consumer_cyclical: "Consumer Cyclical",
  basic_materials: "Basic Materials",
  consumer_defensive: "Consumer Defensive",
  technology: "Technology",
  communication_services: "Communication Services",
  financial_services: "Financial Services",
  utilities: "Utilities",
  industrials: "Industrials",
  energy: "Energy",
  healthcare: "Healthcare",
};

export async function getEtfLiveData(symbol: string): Promise<EtfLiveData | null> {
  const [qs, quote] = await Promise.all([
    getQuoteSummary(symbol, ["topHoldings", "fundProfile", "summaryDetail", "defaultKeyStatistics", "fundPerformance"], 60 * 60_000),
    getQuote(symbol),
  ]);
  if (!qs && !quote) return null;

  const th = qs?.topHoldings ?? {};
  const fp = qs?.fundProfile ?? {};
  const sd = qs?.summaryDetail ?? {};
  const ks = qs?.defaultKeyStatistics ?? {};
  const perf = qs?.fundPerformance?.trailingReturns ?? {};

  const sectorWeights: { sector: string; weight: number }[] = [];
  for (const entry of th.sectorWeightings ?? []) {
    for (const [key, val] of Object.entries(entry)) {
      const w = rv(val);
      if (w && w > 0.0005) sectorWeights.push({ sector: SECTOR_LABELS[key] ?? key, weight: w });
    }
  }
  sectorWeights.sort((a, b) => b.weight - a.weight);

  return {
    quote,
    expenseRatio: rv(fp.feesExpensesInvestment?.annualReportExpenseRatio) ?? rv(ks.annualReportExpenseRatio),
    totalAssets: rv(sd.totalAssets),
    yield: rv(sd.yield) ?? rv(sd.dividendYield),
    category: fp.categoryName,
    topHoldings: (th.holdings ?? []).map((h: any) => ({
      symbol: h.symbol ?? "",
      name: h.holdingName ?? h.symbol ?? "",
      weight: rv(h.holdingPercent) ?? 0,
    })),
    sectorWeights,
    // Yahoo reports exactly 0 when it has no trailing-return data (common on
    // LSE/Xetra listings) — treat that as missing rather than a 0% return
    ytdReturn: rv(perf.ytd) || undefined,
    threeYearReturn: rv(perf.threeYear) || undefined,
    fiveYearReturn: rv(perf.fiveYear) || undefined,
    beta3Year: rv(ks.beta3Year),
    inceptionDate: rv(fp.fundInceptionDate) ?? rv(ks.fundInceptionDate),
  };
}

// ------------------------------------------------------------------- indices

export const MARKET_INDICES = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^NDX", name: "Nasdaq 100" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50" },
  { symbol: "^VIX", name: "VIX" },
  { symbol: "^TNX", name: "US 10Y Yield" },
];

export const BENCHMARKS = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^NDX", name: "Nasdaq 100" },
  { symbol: "URTH", name: "MSCI World (URTH)" },
  { symbol: "VT", name: "FTSE Global All Cap (VT)" },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50" },
];
