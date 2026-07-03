import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { fail, handler, ok, parseBody } from "@/lib/server/api";

type Ctx = { params: { id: string } };

async function ownedPortfolio(id: string, userId: string) {
  const p = await db.portfolio.findUnique({ where: { id } });
  return p && p.userId === userId ? p : null;
}

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  baseCurrency: z.enum(["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"]).optional(),
  benchmark: z.string().max(20).optional(),
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  if (!(await ownedPortfolio(params.id, userId))) return fail("Not found", 404);
  const body = await parseBody(req, updateSchema);
  const updated = await db.portfolio.update({ where: { id: params.id }, data: body });
  return ok(updated);
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  if (!(await ownedPortfolio(params.id, userId))) return fail("Not found", 404);
  const count = await db.portfolio.count({ where: { userId } });
  if (count <= 1) return fail("You need at least one portfolio", 400);
  await db.portfolio.delete({ where: { id: params.id } });
  return ok({ deleted: true });
});
