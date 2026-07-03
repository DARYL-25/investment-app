import { getMarketNews, getSymbolNews } from "@/lib/server/news";
import { handler, ok } from "@/lib/server/api";
import { getUserId } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { replayLedger } from "@/lib/server/analytics";

export const GET = handler(async (req: Request) => {
  const params = new URL(req.url).searchParams;
  const category = params.get("category") ?? undefined;
  const symbols = params.get("symbols");

  if (symbols) {
    return ok(await getSymbolNews(symbols.split(",").slice(0, 12)));
  }

  if (category === "portfolio") {
    // portfolio-aware news: pull the user's held symbols
    const userId = await getUserId();
    if (!userId) return ok([]);
    const txs = await db.transaction.findMany({
      where: { portfolio: { userId } },
    });
    const state = replayLedger(txs);
    const held = [...state.lots.entries()].filter(([, l]) => l.qty > 0).map(([s]) => s);
    if (held.length === 0) return ok([]);
    return ok(await getSymbolNews(held));
  }

  return ok(await getMarketNews(category));
});
