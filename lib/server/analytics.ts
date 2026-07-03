// Portfolio analytics engine.
//
// Positions are derived from the transaction ledger (average-cost method).
// The daily value series converts each instrument at the FX rate prevailing
// on that day. Performance is measured two ways:
//   - Time-weighted return (TWR): daily returns net of external flows,
//     compounded — comparable to a benchmark.
//   - Money-weighted return (XIRR): Newton/bisection IRR over external flows.
// If a BUY exceeds available cash, the shortfall is treated as an implicit
// deposit on that date, so portfolios entered without explicit deposits
// still produce sound cash and flow accounting.

import type { Transaction } from "@prisma/client";
import type {
  ExposureSlice,
  PortfolioAnalytics,
  PortfolioMetrics,
  Position,
  SeriesPoint,
} from "@/lib/types";
import { findEtf } from "@/data/etfs";
import { getDailyCloses, dayStart, getQuoteSummary } from "./yahoo";
import { getQuotes } from "./market";
import { getRateSeries, getSpotRate, normalizeCurrency } from "./fx";
import { cachedSafe } from "./cache";

const DAY = 86400;
const RISK_FREE_ANNUAL = 0.02;

// ------------------------------------------------------------ ledger replay

interface Lot {
  qty: number;
  avgCost: number; // instrument ccy
  realized: number; // instrument ccy
  dividends: number;
  fees: number;
  currency: string;
  assetType: string;
  name: string;
  firstBuy: number;
}

export interface LedgerState {
  lots: Map<string, Lot>;
  cashByCcy: Map<string, number>;
  externalFlows: { date: Date; amount: number; currency: string; implicit?: boolean }[];
  dividendTotal: Map<string, number>; // ccy -> amount
  feesTotal: Map<string, number>;
}

export function replayLedger(transactions: Transaction[]): LedgerState {
  const txs = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  const lots = new Map<string, Lot>();
  const cashByCcy = new Map<string, number>();
  const externalFlows: LedgerState["externalFlows"] = [];
  const dividendTotal = new Map<string, number>();
  const feesTotal = new Map<string, number>();

  const addCash = (ccy: string, amt: number) => cashByCcy.set(ccy, (cashByCcy.get(ccy) ?? 0) + amt);

  const ensureCash = (ccy: string, needed: number, date: Date) => {
    const bal = cashByCcy.get(ccy) ?? 0;
    if (bal < needed - 1e-9) {
      const shortfall = needed - bal;
      addCash(ccy, shortfall);
      externalFlows.push({ date, amount: shortfall, currency: ccy, implicit: true });
    }
  };

  for (const tx of txs) {
    const sym = tx.symbol.toUpperCase();
    switch (tx.type) {
      case "DEPOSIT": {
        addCash(tx.currency, tx.amount);
        externalFlows.push({ date: tx.date, amount: tx.amount, currency: tx.currency });
        break;
      }
      case "WITHDRAWAL": {
        addCash(tx.currency, -tx.amount);
        externalFlows.push({ date: tx.date, amount: -tx.amount, currency: tx.currency });
        break;
      }
      case "BUY": {
        const cost = tx.quantity * tx.price + tx.fees;
        ensureCash(tx.currency, cost, tx.date);
        addCash(tx.currency, -cost);
        const lot = lots.get(sym) ?? {
          qty: 0, avgCost: 0, realized: 0, dividends: 0, fees: 0,
          currency: tx.currency, assetType: tx.assetType, name: tx.name || sym,
          firstBuy: tx.date.getTime(),
        };
        const newQty = lot.qty + tx.quantity;
        lot.avgCost = newQty > 0 ? (lot.avgCost * lot.qty + tx.price * tx.quantity) / newQty : 0;
        lot.qty = newQty;
        lot.fees += tx.fees;
        if (tx.name) lot.name = tx.name;
        lots.set(sym, lot);
        break;
      }
      case "SELL": {
        const lot = lots.get(sym);
        const proceeds = tx.quantity * tx.price - tx.fees;
        addCash(tx.currency, proceeds);
        if (lot) {
          const sellQty = Math.min(tx.quantity, lot.qty);
          lot.realized += (tx.price - lot.avgCost) * sellQty - tx.fees;
          lot.qty -= sellQty;
          lot.fees += tx.fees;
          if (lot.qty < 1e-9) lot.qty = 0;
        }
        break;
      }
      case "DIVIDEND": {
        const amt = tx.amount || tx.quantity * tx.price;
        addCash(tx.currency, amt);
        dividendTotal.set(tx.currency, (dividendTotal.get(tx.currency) ?? 0) + amt);
        const lot = lots.get(sym);
        if (lot) lot.dividends += amt;
        break;
      }
      case "FEE": {
        addCash(tx.currency, -tx.amount);
        feesTotal.set(tx.currency, (feesTotal.get(tx.currency) ?? 0) + tx.amount);
        break;
      }
    }
  }

  return { lots, cashByCcy, externalFlows, dividendTotal, feesTotal };
}

// ------------------------------------------------------------------- helpers

function forwardFill(map: Map<number, number>, days: number[]): Map<number, number> {
  const out = new Map<number, number>();
  const keys = [...map.keys()].sort((a, b) => a - b);
  let ki = 0;
  let last: number | undefined;
  for (const d of days) {
    while (ki < keys.length && keys[ki] <= d) {
      last = map.get(keys[ki]);
      ki++;
    }
    if (last !== undefined) out.set(d, last);
  }
  return out;
}

export function xirr(flows: { date: Date; amount: number }[]): number | null {
  // Convention: investments (money in) negative, proceeds/final value positive.
  if (flows.length < 2) return null;
  const t0 = flows[0].date.getTime();
  const yrs = flows.map((f) => (f.date.getTime() - t0) / (365.25 * 86400 * 1000));
  const amts = flows.map((f) => f.amount);
  if (!amts.some((a) => a > 0) || !amts.some((a) => a < 0)) return null;

  const npv = (r: number) => amts.reduce((s, a, i) => s + a / Math.pow(1 + r, yrs[i]), 0);

  // Newton
  let rate = 0.1;
  for (let i = 0; i < 60; i++) {
    const f = npv(rate);
    const h = 1e-6;
    const df = (npv(rate + h) - f) / h;
    if (Math.abs(df) < 1e-12) break;
    const next = rate - f / df;
    if (!isFinite(next) || next <= -0.999) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }
  // bisection fallback
  let lo = -0.95, hi = 10;
  let flo = npv(lo);
  if (flo * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fmid = npv(mid);
    if (Math.abs(fmid) < 1e-9) return mid;
    if (flo * fmid < 0) hi = mid;
    else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}

// -------------------------------------------------------- instrument profile

interface InstrumentMeta {
  sector?: string;
  country?: string;
}

async function getInstrumentMeta(symbol: string, assetType: string): Promise<InstrumentMeta> {
  if (assetType === "ETF") return {};
  const meta = await cachedSafe(`imeta:${symbol}`, 24 * 3600_000, async () => {
    const qs = await getQuoteSummary(symbol, ["summaryProfile"], 24 * 3600_000);
    return { sector: qs?.summaryProfile?.sector, country: qs?.summaryProfile?.country } as InstrumentMeta;
  });
  return meta ?? {};
}

// -------------------------------------------------------------- main compute

export async function computeAnalytics(
  transactions: Transaction[],
  baseCurrency: string,
  benchmark: string
): Promise<PortfolioAnalytics> {
  const state = replayLedger(transactions);
  const heldSymbols = [...state.lots.entries()].filter(([, l]) => l.qty > 0).map(([s]) => s);
  const everSymbols = [...state.lots.keys()];

  const firstTxTime = transactions.length
    ? Math.min(...transactions.map((t) => t.date.getTime()))
    : Date.now();
  const fromUnix = dayStart(Math.floor(firstTxTime / 1000)) - DAY;

  // live quotes + FX spot for every involved currency
  const quotes = await getQuotes(everSymbols);
  const currencies = new Set<string>([baseCurrency]);
  for (const [, lot] of state.lots) currencies.add(lot.currency);
  for (const ccy of state.cashByCcy.keys()) currencies.add(ccy);
  for (const sym of heldSymbols) {
    const q = quotes.get(sym);
    if (q) currencies.add(normalizeCurrency(q.currency, 0).currency);
  }

  const spotRates = new Map<string, number>();
  await Promise.all(
    [...currencies].map(async (ccy) => {
      spotRates.set(ccy, ccy === baseCurrency ? 1 : await getSpotRate(ccy, baseCurrency));
    })
  );
  const toBase = (amt: number, ccy: string) => amt * (spotRates.get(ccy) ?? 1);

  // ---------------------------------------------------------------- positions
  const positions: Position[] = [];
  for (const [sym, lot] of state.lots) {
    if (lot.qty <= 0 && Math.abs(lot.realized) < 1e-9 && lot.dividends < 1e-9) continue;
    const q = quotes.get(sym);
    let price = q?.price ?? lot.avgCost;
    let ccy = lot.currency;
    if (q) {
      const norm = normalizeCurrency(q.currency, price);
      price = norm.value;
      ccy = norm.currency;
    }
    const value = lot.qty * price;
    const cost = lot.qty * lot.avgCost;
    const meta = lot.qty > 0 ? await getInstrumentMeta(sym, lot.assetType) : {};
    const etf = findEtf(sym);
    const prevClose = q ? normalizeCurrency(q.currency, q.previousClose).value : price;
    positions.push({
      symbol: sym,
      name: etf?.name ?? q?.name ?? lot.name,
      assetType: (lot.assetType as Position["assetType"]) ?? "STOCK",
      currency: ccy,
      quantity: lot.qty,
      avgCost: lot.avgCost,
      costBasis: cost,
      price,
      value,
      valueBase: toBase(value, ccy),
      dayChangeBase: toBase(lot.qty * (price - prevClose), ccy),
      unrealizedPnl: value - cost,
      unrealizedPnlBase: toBase(value - cost, ccy),
      unrealizedPnlPct: cost > 0 ? (value - cost) / cost : 0,
      realizedPnlBase: toBase(lot.realized, lot.currency),
      dividendsBase: toBase(lot.dividends, lot.currency),
      weight: 0, // set below
      sector: etf ? etf.sectorFocus : meta.sector,
      country: etf ? undefined : meta.country,
    });
  }

  const cash = [...state.cashByCcy.entries()].reduce((s, [ccy, amt]) => s + toBase(amt, ccy), 0);
  const holdingsValue = positions.reduce((s, p) => s + (p.quantity > 0 ? p.valueBase : 0), 0);
  const totalValue = holdingsValue + cash;
  for (const p of positions) p.weight = totalValue > 0 ? p.valueBase / totalValue : 0;
  positions.sort((a, b) => b.valueBase - a.valueBase);

  // ------------------------------------------------------------- value series
  const todayUnix = dayStart(Math.floor(Date.now() / 1000));
  const days: number[] = [];
  for (let d = fromUnix; d <= todayUnix; d += DAY) days.push(d);

  // price history per symbol (daily closes forward-filled)
  const priceSeries = new Map<string, Map<number, number>>();
  const symbolCcy = new Map<string, string>();
  await Promise.all(
    everSymbols.map(async (sym) => {
      const closes = await getDailyCloses(sym, fromUnix);
      const q = quotes.get(sym);
      const rawCcy = q?.currency ?? state.lots.get(sym)?.currency ?? baseCurrency;
      const { currency: ccy } = normalizeCurrency(rawCcy, 0);
      symbolCcy.set(sym, ccy);
      const m = new Map<number, number>();
      for (const c of closes) {
        m.set(c.time, rawCcy === "GBp" ? c.close / 100 : c.close);
      }
      priceSeries.set(sym, forwardFill(m, days));
    })
  );

  // FX history per non-base currency
  const fxSeries = new Map<string, Map<number, number>>();
  await Promise.all(
    [...currencies].filter((c) => c !== baseCurrency).map(async (ccy) => {
      const rates = await getRateSeries(ccy, baseCurrency, fromUnix);
      fxSeries.set(ccy, forwardFill(rates, days));
    })
  );
  const fxAt = (ccy: string, day: number) =>
    ccy === baseCurrency ? 1 : fxSeries.get(ccy)?.get(day) ?? spotRates.get(ccy) ?? 1;

  // replay ledger day by day
  const txsSorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  const flowsByDay = new Map<number, number>(); // external flows in base ccy (approx at that day's fx)
  for (const f of state.externalFlows) {
    const d = dayStart(Math.floor(f.date.getTime() / 1000));
    flowsByDay.set(d, (flowsByDay.get(d) ?? 0) + f.amount * fxAt(f.currency, d));
  }

  const qtyBySym = new Map<string, number>();
  const cashByCcyDay = new Map<string, number>();
  let ti = 0;
  const valueSeries: SeriesPoint[] = [];

  const applyTx = (tx: Transaction) => {
    const sym = tx.symbol.toUpperCase();
    const addC = (c: string, a: number) => cashByCcyDay.set(c, (cashByCcyDay.get(c) ?? 0) + a);
    switch (tx.type) {
      case "DEPOSIT": addC(tx.currency, tx.amount); break;
      case "WITHDRAWAL": addC(tx.currency, -tx.amount); break;
      case "BUY": {
        const cost = tx.quantity * tx.price + tx.fees;
        const bal = cashByCcyDay.get(tx.currency) ?? 0;
        if (bal < cost - 1e-9) addC(tx.currency, cost - bal); // implicit deposit
        addC(tx.currency, -cost);
        qtyBySym.set(sym, (qtyBySym.get(sym) ?? 0) + tx.quantity);
        break;
      }
      case "SELL":
        addC(tx.currency, tx.quantity * tx.price - tx.fees);
        qtyBySym.set(sym, Math.max(0, (qtyBySym.get(sym) ?? 0) - tx.quantity));
        break;
      case "DIVIDEND": addC(tx.currency, tx.amount || tx.quantity * tx.price); break;
      case "FEE": addC(tx.currency, -tx.amount); break;
    }
  };

  for (const day of days) {
    while (ti < txsSorted.length && dayStart(Math.floor(txsSorted[ti].date.getTime() / 1000)) <= day) {
      applyTx(txsSorted[ti]);
      ti++;
    }
    let v = 0;
    for (const [sym, qty] of qtyBySym) {
      if (qty <= 0) continue;
      const px = priceSeries.get(sym)?.get(day);
      if (px == null) continue;
      v += qty * px * fxAt(symbolCcy.get(sym) ?? baseCurrency, day);
    }
    for (const [ccy, amt] of cashByCcyDay) v += amt * fxAt(ccy, day);
    valueSeries.push({ time: day, value: v });
  }

  // strip leading zero-value days
  const firstNonZero = valueSeries.findIndex((p) => p.value > 0.01);
  const trimmed = firstNonZero > 0 ? valueSeries.slice(firstNonZero) : valueSeries;

  // ------------------------------------------------------- TWR + risk metrics
  const twrIndex: SeriesPoint[] = [];
  const dailyReturns: number[] = [];
  let index = 100;
  for (let i = 0; i < trimmed.length; i++) {
    if (i === 0) {
      twrIndex.push({ time: trimmed[i].time, value: 100 });
      continue;
    }
    const flow = flowsByDay.get(trimmed[i].time) ?? 0;
    const prev = trimmed[i - 1].value;
    const r = prev > 0 ? (trimmed[i].value - flow - prev) / prev : 0;
    const rc = Math.max(-0.5, Math.min(0.5, r)); // clamp outliers from data gaps
    dailyReturns.push(rc);
    index *= 1 + rc;
    twrIndex.push({ time: trimmed[i].time, value: index });
  }

  const n = dailyReturns.length;
  const mean = n ? dailyReturns.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 1 ? dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const dailyVol = Math.sqrt(variance);
  const volatility = n > 20 ? dailyVol * Math.sqrt(252) : null;
  const rfDaily = RISK_FREE_ANNUAL / 252;
  const sharpe = n > 20 && dailyVol > 0 ? ((mean - rfDaily) / dailyVol) * Math.sqrt(252) : null;

  let peak = -Infinity;
  let maxDrawdown = 0;
  for (const p of twrIndex) {
    peak = Math.max(peak, p.value);
    maxDrawdown = Math.min(maxDrawdown, p.value / peak - 1);
  }

  const yearsHeld = trimmed.length > 1 ? (trimmed[trimmed.length - 1].time - trimmed[0].time) / (365.25 * DAY) : 0;
  const twrTotal = twrIndex.length ? twrIndex[twrIndex.length - 1].value / 100 - 1 : 0;
  const cagr = yearsHeld > 0.25 ? Math.pow(1 + twrTotal, 1 / yearsHeld) - 1 : null;

  // XIRR over external flows + terminal value
  const flows = state.externalFlows.map((f) => ({
    date: f.date,
    amount: -f.amount * toBaseRate(f.currency),
  }));
  function toBaseRate(ccy: string) {
    return spotRates.get(ccy) ?? 1;
  }
  flows.push({ date: new Date(), amount: totalValue });
  const xirrVal = xirr(flows);

  // -------------------------------------------------------------- benchmark
  let benchmarkIndex: SeriesPoint[] = [];
  let benchmarkReturnPct: number | null = null;
  if (trimmed.length > 1) {
    const bCloses = await getDailyCloses(benchmark, trimmed[0].time);
    const bMap = forwardFill(new Map(bCloses.map((c) => [c.time, c.close])), trimmed.map((p) => p.time));
    const base = bMap.get(trimmed[0].time);
    if (base) {
      benchmarkIndex = trimmed
        .map((p) => {
          const c = bMap.get(p.time);
          return c ? { time: p.time, value: (c / base) * 100 } : null;
        })
        .filter((x): x is SeriesPoint => x !== null);
      if (benchmarkIndex.length) {
        benchmarkReturnPct = benchmarkIndex[benchmarkIndex.length - 1].value / 100 - 1;
      }
    }
  }

  // -------------------------------------------------------------- exposures
  const sectorMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const currencyMap = new Map<string, number>();
  const assetMap = new Map<string, number>();

  for (const p of positions) {
    if (p.quantity <= 0) continue;
    const etf = findEtf(p.symbol);
    // sector
    const sector = etf ? (etf.sectorFocus === "Diversified" ? `${etf.region} Index` : etf.sectorFocus) : p.sector ?? "Other";
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + p.valueBase);
    // country: ETFs use catalog country weights, stocks use profile country
    if (etf?.countryWeights) {
      for (const [c, w] of Object.entries(etf.countryWeights)) {
        countryMap.set(c, (countryMap.get(c) ?? 0) + p.valueBase * w);
      }
    } else {
      const c = p.country ?? (etf ? etf.region : "Other");
      countryMap.set(c, (countryMap.get(c) ?? 0) + p.valueBase);
    }
    currencyMap.set(p.currency, (currencyMap.get(p.currency) ?? 0) + p.valueBase);
    const ac = etf ? etf.assetClass : p.assetType === "ETF" ? "Equity" : "Equity";
    assetMap.set(p.assetType === "STOCK" ? "Stocks" : ac === "Equity" ? "Equity ETFs" : ac, (assetMap.get(p.assetType === "STOCK" ? "Stocks" : ac === "Equity" ? "Equity ETFs" : ac) ?? 0) + p.valueBase);
  }
  if (cash > 0.01) {
    assetMap.set("Cash", cash);
    for (const [ccy, amt] of state.cashByCcy) {
      if (amt > 0.01) currencyMap.set(ccy, (currencyMap.get(ccy) ?? 0) + toBase(amt, ccy));
    }
  }

  const toSlices = (m: Map<string, number>): ExposureSlice[] => {
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    return [...m.entries()]
      .map(([label, value]) => ({ label, value, weight: total > 0 ? value / total : 0 }))
      .sort((a, b) => b.value - a.value);
  };

  // ---------------------------------------------------------------- metrics
  const unrealizedPnl = positions.reduce((s, p) => s + (p.quantity > 0 ? p.unrealizedPnlBase : 0), 0);
  const costBasisTotal = positions.reduce((s, p) => s + (p.quantity > 0 ? toBase(p.costBasis, p.currency) : 0), 0);
  const realizedPnl = positions.reduce((s, p) => s + p.realizedPnlBase, 0);
  const dividendIncome = [...state.dividendTotal.entries()].reduce((s, [ccy, amt]) => s + toBase(amt, ccy), 0);
  const dayChange = positions.reduce((s, p) => s + (p.quantity > 0 ? p.dayChangeBase : 0), 0);
  const netDeposits = state.externalFlows.reduce((s, f) => s + f.amount * toBaseRate(f.currency), 0);
  const totalReturn = totalValue - netDeposits + 0; // realized+unrealized+divs are inside value
  const prevValue = totalValue - dayChange;

  const metrics: PortfolioMetrics = {
    totalValue,
    holdingsValue,
    cash,
    dayChange,
    dayChangePct: prevValue > 0 ? dayChange / prevValue : 0,
    unrealizedPnl,
    unrealizedPnlPct: costBasisTotal > 0 ? unrealizedPnl / costBasisTotal : 0,
    realizedPnl,
    dividendIncome,
    netDeposits,
    totalReturn,
    totalReturnPct: netDeposits > 0 ? totalReturn / netDeposits : 0,
    cagr,
    xirr: xirrVal,
    sharpe,
    volatility,
    maxDrawdown: maxDrawdown < 0 ? maxDrawdown : null,
    benchmarkReturnPct,
  };

  return {
    positions,
    metrics,
    valueSeries: trimmed,
    twrIndex,
    benchmarkIndex,
    sectorExposure: toSlices(sectorMap),
    countryExposure: toSlices(countryMap),
    currencyExposure: toSlices(currencyMap),
    assetClassExposure: toSlices(assetMap),
    baseCurrency,
    benchmark,
  };
}
