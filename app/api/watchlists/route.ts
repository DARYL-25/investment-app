import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { handler, ok, parseBody } from "@/lib/server/api";

export const GET = handler(async () => {
  const userId = await requireUserId();
  const lists = await db.watchlist.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { items: { orderBy: { addedAt: "desc" } } },
  });
  return ok(lists);
});

const createSchema = z.object({ name: z.string().min(1).max(60) });

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const body = await parseBody(req, createSchema);
  const list = await db.watchlist.create({ data: { name: body.name, userId } });
  return ok(list);
});
