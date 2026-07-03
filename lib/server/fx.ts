// Currency conversion built on Yahoo FX pairs (e.g. "EURUSD=X").
// Spot rates are cached for 10 minutes; historical daily rates are used by
// portfolio analytics so multi-currency value series are converted at the
// rate that prevailed on each day.

import { cachedSafe } from "./cache";
import { getDailyCloses, getQuotes } from "./yahoo";

/** Yahoo quotes GBp (pence) for LSE listings — normalize to GBP. */
export function normalizeCurrency(currency: string, value: number): { currency: string; value: number } {
  if (currency === "GBp") return { currency: "GBP", value: value / 100 };
  return { currency, value };
}

export async function getSpotRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  const rate = await cachedSafe(`fx:${from}${to}`, 10 * 60_000, async () => {
    const pair = `${from}${to}=X`;
    const quotes = await getQuotes([pair]);
    const q = quotes.get(pair.toUpperCase());
    if (!q || !q.price) throw new Error(`fx: no rate for ${pair}`);
    return q.price;
  });
  if (rate) return rate;
  // try the inverse pair
  const inv = await cachedSafe(`fx:${to}${from}`, 10 * 60_000, async () => {
    const pair = `${to}${from}=X`;
    const quotes = await getQuotes([pair]);
    const q = quotes.get(pair.toUpperCase());
    if (!q || !q.price) throw new Error(`fx: no rate for ${pair}`);
    return q.price;
  });
  return inv ? 1 / inv : 1;
}

export async function convert(amount: number, from: string, to: string): Promise<number> {
  if (from === to || !amount) return amount;
  const rate = await getSpotRate(from, to);
  return amount * rate;
}

/**
 * Daily FX rate series from `fromUnix` to now, forward-filled by the caller.
 * Returns a map dayStartUnix -> rate (from -> to).
 */
export async function getRateSeries(
  from: string,
  to: string,
  fromUnix: number
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (from === to) return map;
  const closes = await getDailyCloses(`${from}${to}=X`, fromUnix);
  for (const c of closes) map.set(c.time, c.close);
  return map;
}
