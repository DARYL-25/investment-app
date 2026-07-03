// Alert rule evaluation. Runs on demand (page load / API poll) and is
// idempotent, so it can also be driven by a cron endpoint in production.

import type { Alert } from "@prisma/client";
import { db } from "./db";
import { getQuotes } from "./market";
import { getQuoteSummary, rv } from "./yahoo";

export interface EvaluatedAlert extends Alert {
  currentValue: number | null;
  justTriggered: boolean;
}

export async function evaluateAlerts(userId: string): Promise<EvaluatedAlert[]> {
  const alerts = await db.alert.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });
  if (alerts.length === 0) return [];

  const symbols = [...new Set(alerts.map((a) => a.symbol))];
  const quotes = await getQuotes(symbols);

  // P/E data only for alerts that need it
  const peSymbols = [...new Set(alerts.filter((a) => a.kind.startsWith("PE_")).map((a) => a.symbol))];
  const peMap = new Map<string, number>();
  await Promise.all(
    peSymbols.map(async (sym) => {
      const qs = await getQuoteSummary(sym, ["summaryDetail"], 30 * 60_000);
      const pe = rv(qs?.summaryDetail?.trailingPE);
      if (pe != null) peMap.set(sym.toUpperCase(), pe);
    })
  );

  const results: EvaluatedAlert[] = [];
  for (const alert of alerts) {
    const quote = quotes.get(alert.symbol.toUpperCase());
    const price = quote?.price ?? null;
    let currentValue: number | null = price;
    let hit = false;

    switch (alert.kind) {
      case "PRICE_ABOVE":
        hit = price != null && price >= alert.threshold;
        break;
      case "PRICE_BELOW":
        hit = price != null && price <= alert.threshold;
        break;
      case "PCT_DROP": {
        const ref = alert.refPrice || price || 0;
        const change = price != null && ref > 0 ? (price - ref) / ref : 0;
        currentValue = change;
        hit = change <= -Math.abs(alert.threshold) / 100;
        break;
      }
      case "PCT_RISE": {
        const ref = alert.refPrice || price || 0;
        const change = price != null && ref > 0 ? (price - ref) / ref : 0;
        currentValue = change;
        hit = change >= Math.abs(alert.threshold) / 100;
        break;
      }
      case "PE_BELOW": {
        const pe = peMap.get(alert.symbol.toUpperCase()) ?? null;
        currentValue = pe;
        hit = pe != null && pe <= alert.threshold;
        break;
      }
      case "PE_ABOVE": {
        const pe = peMap.get(alert.symbol.toUpperCase()) ?? null;
        currentValue = pe;
        hit = pe != null && pe >= alert.threshold;
        break;
      }
      case "EARNINGS": {
        const qs = await getQuoteSummary(alert.symbol, ["calendarEvents"], 60 * 60_000);
        const dates: number[] = (qs?.calendarEvents?.earnings?.earningsDate ?? [])
          .map((d: any) => rv(d))
          .filter((n: any): n is number => typeof n === "number");
        const next = dates[0];
        currentValue = next ?? null;
        const daysUntil = next ? (next * 1000 - Date.now()) / 86400000 : Infinity;
        hit = daysUntil <= (alert.threshold || 7) && daysUntil >= -1;
        break;
      }
      case "DIVIDEND": {
        const qs = await getQuoteSummary(alert.symbol, ["calendarEvents", "summaryDetail"], 60 * 60_000);
        const exDate = rv(qs?.calendarEvents?.exDividendDate) ?? rv(qs?.summaryDetail?.exDividendDate);
        currentValue = exDate ?? null;
        const daysUntil = exDate ? (exDate * 1000 - Date.now()) / 86400000 : Infinity;
        hit = daysUntil <= (alert.threshold || 7) && daysUntil >= -1;
        break;
      }
    }

    const justTriggered = hit && alert.active && !alert.triggeredAt;
    if (justTriggered || (alert.active && alert.lastValue !== currentValue)) {
      await db.alert.update({
        where: { id: alert.id },
        data: {
          triggeredAt: hit ? alert.triggeredAt ?? new Date() : null,
          lastValue: currentValue,
        },
      });
    }
    results.push({
      ...alert,
      triggeredAt: hit ? alert.triggeredAt ?? new Date() : null,
      currentValue,
      justTriggered,
    });
  }
  return results;
}
