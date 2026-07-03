import { getUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getQuotes, getHistory } from "@/lib/server/market";
import { PageHeader } from "@/components/page-header";
import { WatchlistManager, type WatchlistData } from "@/components/watchlists/watchlist-manager";

export const dynamic = "force-dynamic";

export default async function WatchlistsPage() {
  const user = (await getUser())!;
  const lists = await db.watchlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { items: { orderBy: { addedAt: "desc" } } },
  });

  const allSymbols = [...new Set(lists.flatMap((l) => l.items.map((i) => i.symbol)))];
  const quotes = await getQuotes(allSymbols);

  // 1M sparklines (cached per symbol server-side)
  const sparks = new Map<string, number[]>();
  await Promise.all(
    allSymbols.slice(0, 30).map(async (s) => {
      const h = await getHistory(s, "1M").catch(() => null);
      if (h) sparks.set(s, h.candles.map((c) => c.close));
    })
  );

  const data: WatchlistData[] = lists.map((l) => ({
    id: l.id,
    name: l.name,
    items: l.items.map((i) => ({
      id: i.id,
      symbol: i.symbol,
      assetType: i.assetType,
      note: i.note,
      quote: quotes.get(i.symbol.toUpperCase()) ?? null,
      spark: sparks.get(i.symbol) ?? [],
    })),
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Watchlists"
        subtitle="Track stocks and ETFs with live prices, monthly trend and personal notes."
      />
      <WatchlistManager lists={data} />
    </div>
  );
}
