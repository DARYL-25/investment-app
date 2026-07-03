import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { handler, ok, parseBody } from "@/lib/server/api";
import { evaluateAlerts } from "@/lib/server/alerts";
import { getQuote } from "@/lib/server/market";

/** GET returns all alerts with fresh evaluation. */
export const GET = handler(async () => {
  const userId = await requireUserId();
  return ok(await evaluateAlerts(userId));
});

const createSchema = z.object({
  symbol: z.string().min(1).max(20),
  kind: z.enum([
    "PRICE_ABOVE",
    "PRICE_BELOW",
    "PCT_DROP",
    "PCT_RISE",
    "PE_BELOW",
    "PE_ABOVE",
    "EARNINGS",
    "DIVIDEND",
  ]),
  threshold: z.number().default(0),
  note: z.string().max(300).default(""),
});

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const body = await parseBody(req, createSchema);
  const symbol = body.symbol.toUpperCase().trim();

  // capture reference price for percentage alerts
  let refPrice = 0;
  if (body.kind === "PCT_DROP" || body.kind === "PCT_RISE") {
    const q = await getQuote(symbol);
    refPrice = q?.price ?? 0;
  }

  const alert = await db.alert.create({
    data: { userId, symbol, kind: body.kind, threshold: body.threshold, refPrice, note: body.note },
  });
  return ok(alert);
});
