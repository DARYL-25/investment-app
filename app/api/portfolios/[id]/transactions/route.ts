import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { fail, handler, ok, parseBody } from "@/lib/server/api";

type Ctx = { params: { id: string } };

const txSchema = z.object({
  type: z.enum(["BUY", "SELL", "DIVIDEND", "DEPOSIT", "WITHDRAWAL", "FEE"]),
  assetType: z.enum(["STOCK", "ETF", "CASH"]).default("STOCK"),
  symbol: z.string().max(20).default(""),
  name: z.string().max(120).default(""),
  quantity: z.number().min(0).default(0),
  price: z.number().min(0).default(0),
  amount: z.number().min(0).default(0),
  fees: z.number().min(0).default(0),
  currency: z.enum(["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"]).default("USD"),
  date: z.string().refine((s) => !isNaN(Date.parse(s)), "invalid date"),
  note: z.string().max(300).default(""),
}).superRefine((tx, ctx) => {
  if (["BUY", "SELL"].includes(tx.type)) {
    if (!tx.symbol.trim()) ctx.addIssue({ code: "custom", message: "symbol required", path: ["symbol"] });
    if (tx.quantity <= 0) ctx.addIssue({ code: "custom", message: "quantity must be > 0", path: ["quantity"] });
    if (tx.price <= 0) ctx.addIssue({ code: "custom", message: "price must be > 0", path: ["price"] });
  }
  if (["DIVIDEND"].includes(tx.type) && !tx.symbol.trim()) {
    ctx.addIssue({ code: "custom", message: "symbol required", path: ["symbol"] });
  }
  if (["DEPOSIT", "WITHDRAWAL", "FEE", "DIVIDEND"].includes(tx.type) && tx.amount <= 0) {
    ctx.addIssue({ code: "custom", message: "amount must be > 0", path: ["amount"] });
  }
});

async function assertOwned(portfolioId: string, userId: string) {
  const p = await db.portfolio.findUnique({ where: { id: portfolioId } });
  return p && p.userId === userId;
}

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  if (!(await assertOwned(params.id, userId))) return fail("Not found", 404);
  const txs = await db.transaction.findMany({
    where: { portfolioId: params.id },
    orderBy: { date: "desc" },
  });
  return ok(txs);
});

export const POST = handler(async (req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  if (!(await assertOwned(params.id, userId))) return fail("Not found", 404);
  const body = await parseBody(req, txSchema);
  const tx = await db.transaction.create({
    data: {
      ...body,
      symbol: body.symbol.toUpperCase().trim(),
      date: new Date(body.date),
      portfolioId: params.id,
    },
  });
  return ok(tx);
});
