// Shared domain types used across server and client.

export type AssetType = "STOCK" | "ETF" | "CASH";
export type TxType = "BUY" | "SELL" | "DIVIDEND" | "DEPOSIT" | "WITHDRAWAL" | "FEE";
export type AlertKind =
  | "PRICE_ABOVE"
  | "PRICE_BELOW"
  | "PCT_DROP"
  | "PCT_RISE"
  | "PE_BELOW"
  | "PE_ABOVE"
  | "EARNINGS"
  | "DIVIDEND";

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number; // fraction, e.g. 0.0123
  previousClose: number;
  currency: string;
  marketCap?: number;
  volume?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  exchange?: string;
  marketState?: string;
  quoteType?: string; // EQUITY | ETF | INDEX | CURRENCY
}

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoryResult {
  symbol: string;
  currency: string;
  candles: Candle[];
  dividends?: { time: number; amount: number }[];
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string; // EQUITY | ETF | INDEX ...
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string; // ISO
  summary?: string;
  symbols?: string[];
  category: string;
}

export type Range = "1D" | "1W" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

export interface Position {
  symbol: string;
  name: string;
  assetType: AssetType;
  currency: string;
  quantity: number;
  avgCost: number; // per unit, instrument currency
  costBasis: number; // instrument currency
  price: number;
  value: number; // instrument currency
  valueBase: number; // portfolio base currency
  dayChangeBase: number;
  unrealizedPnl: number; // instrument currency
  unrealizedPnlBase: number;
  unrealizedPnlPct: number;
  realizedPnlBase: number;
  dividendsBase: number;
  weight: number; // fraction of portfolio value
  sector?: string;
  country?: string;
}

export interface PortfolioMetrics {
  totalValue: number;
  holdingsValue: number;
  cash: number;
  dayChange: number;
  dayChangePct: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  realizedPnl: number;
  dividendIncome: number;
  netDeposits: number;
  totalReturn: number;
  totalReturnPct: number;
  cagr: number | null;
  xirr: number | null;
  sharpe: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  benchmarkReturnPct: number | null;
}

export interface SeriesPoint {
  time: number; // unix seconds (UTC midnight)
  value: number;
}

export interface ExposureSlice {
  label: string;
  value: number; // base currency
  weight: number; // fraction
}

export interface PortfolioAnalytics {
  positions: Position[];
  metrics: PortfolioMetrics;
  valueSeries: SeriesPoint[]; // portfolio value over time (base ccy)
  twrIndex: SeriesPoint[]; // time-weighted return index, base 100
  benchmarkIndex: SeriesPoint[]; // benchmark normalized to 100 over same window
  sectorExposure: ExposureSlice[];
  countryExposure: ExposureSlice[];
  currencyExposure: ExposureSlice[];
  assetClassExposure: ExposureSlice[];
  baseCurrency: string;
  benchmark: string;
}

export interface Insight {
  id: string;
  severity: "info" | "good" | "warning" | "critical";
  title: string;
  body: string;
  metric?: string;
}

export interface HealthScore {
  score: number; // 0-100
  grade: string; // A+ ... F
  components: { label: string; score: number; weight: number; comment: string }[];
}
