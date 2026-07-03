import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { fail, handler, ok } from "@/lib/server/api";

// Seeds a realistic multi-currency demo portfolio so a new user can explore
// every analytics feature immediately. Only allowed on an empty portfolio.

function d(monthsAgo: number, day = 5): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, day));
}

const DEMO_TXS = [
  { type: "DEPOSIT", amount: 25000, currency: "USD", date: d(30) },
  { type: "BUY", symbol: "AAPL", name: "Apple Inc.", assetType: "STOCK", quantity: 25, price: 170, fees: 1, currency: "USD", date: d(29) },
  { type: "BUY", symbol: "MSFT", name: "Microsoft Corp.", assetType: "STOCK", quantity: 15, price: 330, fees: 1, currency: "USD", date: d(28) },
  { type: "BUY", symbol: "VOO", name: "Vanguard S&P 500 ETF", assetType: "ETF", quantity: 18, price: 390, fees: 0, currency: "USD", date: d(26) },
  { type: "DEPOSIT", amount: 15000, currency: "USD", date: d(20) },
  { type: "BUY", symbol: "NVDA", name: "NVIDIA Corp.", assetType: "STOCK", quantity: 60, price: 45, fees: 1, currency: "USD", date: d(19) },
  { type: "BUY", symbol: "SCHD", name: "Schwab US Dividend Equity ETF", assetType: "ETF", quantity: 80, price: 72, fees: 0, currency: "USD", date: d(18) },
  { type: "DIVIDEND", symbol: "SCHD", amount: 52, currency: "USD", date: d(15) },
  { type: "BUY", symbol: "IWDA.AS", name: "iShares Core MSCI World UCITS ETF", assetType: "ETF", quantity: 60, price: 78, fees: 2, currency: "USD", date: d(14) },
  { type: "DEPOSIT", amount: 10000, currency: "USD", date: d(12) },
  { type: "BUY", symbol: "ASML", name: "ASML Holding", assetType: "STOCK", quantity: 6, price: 640, fees: 2, currency: "USD", date: d(11) },
  { type: "SELL", symbol: "AAPL", quantity: 5, price: 195, fees: 1, currency: "USD", date: d(8) },
  { type: "DIVIDEND", symbol: "AAPL", amount: 24, currency: "USD", date: d(7) },
  { type: "DIVIDEND", symbol: "SCHD", amount: 55, currency: "USD", date: d(6) },
  { type: "BUY", symbol: "GLD", name: "SPDR Gold Shares", assetType: "ETF", quantity: 10, price: 185, fees: 1, currency: "USD", date: d(5) },
  { type: "DIVIDEND", symbol: "MSFT", amount: 22, currency: "USD", date: d(3) },
  { type: "DIVIDEND", symbol: "SCHD", amount: 58, currency: "USD", date: d(1) },
] as const;

export const POST = handler(async () => {
  const userId = await requireUserId();
  const portfolio = await db.portfolio.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { transactions: true } } },
  });
  if (!portfolio) return fail("No portfolio found", 404);
  if (portfolio._count.transactions > 0) {
    return fail("Demo data can only be loaded into an empty portfolio", 400);
  }

  await db.transaction.createMany({
    data: DEMO_TXS.map((t) => ({
      portfolioId: portfolio.id,
      type: t.type,
      assetType: "assetType" in t ? t.assetType : "CASH",
      symbol: "symbol" in t ? t.symbol : "",
      name: "name" in t && t.name ? t.name : "",
      quantity: "quantity" in t ? t.quantity : 0,
      price: "price" in t ? t.price : 0,
      amount: "amount" in t ? t.amount : 0,
      fees: "fees" in t ? t.fees : 0,
      currency: t.currency,
      date: t.date,
      note: "Demo data",
    })),
  });

  // seed the default watchlist too
  const watchlist = await db.watchlist.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (watchlist) {
    const items = [
      { symbol: "AMZN", assetType: "STOCK", note: "Waiting for a pullback" },
      { symbol: "GOOGL", assetType: "STOCK", note: "" },
      { symbol: "VWCE.DE", assetType: "ETF", note: "Core candidate" },
      { symbol: "TSLA", assetType: "STOCK", note: "Volatile — watch only" },
    ];
    for (const item of items) {
      await db.watchlistItem.upsert({
        where: { watchlistId_symbol: { watchlistId: watchlist.id, symbol: item.symbol } },
        create: { watchlistId: watchlist.id, ...item },
        update: {},
      });
    }
  }

  return ok({ seeded: true, portfolioId: portfolio.id });
});
