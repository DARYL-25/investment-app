import { getHistory } from "@/lib/server/market";
import { fail, handler, ok } from "@/lib/server/api";
import type { Range } from "@/lib/types";

const RANGES = new Set(["1D", "1W", "1M", "6M", "YTD", "1Y", "5Y", "MAX"]);

export const GET = handler(async (req: Request) => {
  const params = new URL(req.url).searchParams;
  const symbol = params.get("symbol");
  const range = (params.get("range") ?? "1Y").toUpperCase();
  if (!symbol) return fail("symbol required", 400);
  if (!RANGES.has(range)) return fail("invalid range", 400);
  const hist = await getHistory(symbol, range as Range);
  if (!hist) return fail("no data for symbol", 404);
  return ok(hist);
});
