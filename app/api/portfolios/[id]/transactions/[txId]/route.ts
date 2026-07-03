import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { fail, handler, ok } from "@/lib/server/api";

type Ctx = { params: { id: string; txId: string } };

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const tx = await db.transaction.findUnique({
    where: { id: params.txId },
    include: { portfolio: true },
  });
  if (!tx || tx.portfolioId !== params.id || tx.portfolio.userId !== userId) {
    return fail("Not found", 404);
  }
  await db.transaction.delete({ where: { id: params.txId } });
  return ok({ deleted: true });
});
