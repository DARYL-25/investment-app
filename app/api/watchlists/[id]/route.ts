import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { fail, handler, ok, parseBody } from "@/lib/server/api";

type Ctx = { params: { id: string } };

async function owned(id: string, userId: string) {
  const w = await db.watchlist.findUnique({ where: { id } });
  return w && w.userId === userId ? w : null;
}

const itemSchema = z.object({
  symbol: z.string().min(1).max(20),
  assetType: z.enum(["STOCK", "ETF"]).default("STOCK"),
  note: z.string().max(300).default(""),
});

/** Add an item to the watchlist (upserts on symbol). */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  if (!(await owned(params.id, userId))) return fail("Not found", 404);
  const body = await parseBody(req, itemSchema);
  const symbol = body.symbol.toUpperCase().trim();
  const item = await db.watchlistItem.upsert({
    where: { watchlistId_symbol: { watchlistId: params.id, symbol } },
    create: { watchlistId: params.id, symbol, assetType: body.assetType, note: body.note },
    update: { note: body.note },
  });
  return ok(item);
});

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  // update a single item's note
  itemSymbol: z.string().max(20).optional(),
  itemNote: z.string().max(300).optional(),
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  if (!(await owned(params.id, userId))) return fail("Not found", 404);
  const body = await parseBody(req, patchSchema);
  if (body.name) {
    await db.watchlist.update({ where: { id: params.id }, data: { name: body.name } });
  }
  if (body.itemSymbol !== undefined && body.itemNote !== undefined) {
    await db.watchlistItem.update({
      where: { watchlistId_symbol: { watchlistId: params.id, symbol: body.itemSymbol.toUpperCase() } },
      data: { note: body.itemNote },
    });
  }
  return ok({ updated: true });
});

export const DELETE = handler(async (req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  if (!(await owned(params.id, userId))) return fail("Not found", 404);
  const symbol = new URL(req.url).searchParams.get("symbol");
  if (symbol) {
    await db.watchlistItem.deleteMany({
      where: { watchlistId: params.id, symbol: symbol.toUpperCase() },
    });
    return ok({ deleted: "item" });
  }
  const count = await db.watchlist.count({ where: { userId } });
  if (count <= 1) return fail("You need at least one watchlist", 400);
  await db.watchlist.delete({ where: { id: params.id } });
  return ok({ deleted: "list" });
});
