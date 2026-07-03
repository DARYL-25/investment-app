import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { handler, ok, parseBody } from "@/lib/server/api";

export const GET = handler(async () => {
  const userId = await requireUserId();
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { transactions: true } } },
  });
  return ok(portfolios);
});

const createSchema = z.object({
  name: z.string().min(1).max(60),
  baseCurrency: z.enum(["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"]).default("USD"),
  benchmark: z.string().max(20).default("^GSPC"),
});

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const body = await parseBody(req, createSchema);
  const portfolio = await db.portfolio.create({ data: { ...body, userId } });
  return ok(portfolio);
});
