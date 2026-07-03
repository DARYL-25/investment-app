import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { fail, handler, ok, parseBody } from "@/lib/server/api";

type Ctx = { params: { id: string } };

const patchSchema = z.object({
  active: z.boolean().optional(),
  threshold: z.number().optional(),
  note: z.string().max(300).optional(),
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const alert = await db.alert.findUnique({ where: { id: params.id } });
  if (!alert || alert.userId !== userId) return fail("Not found", 404);
  const body = await parseBody(req, patchSchema);
  const updated = await db.alert.update({
    where: { id: params.id },
    data: {
      ...body,
      // re-arming an alert clears its trigger state
      ...(body.active ? { triggeredAt: null } : {}),
    },
  });
  return ok(updated);
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const alert = await db.alert.findUnique({ where: { id: params.id } });
  if (!alert || alert.userId !== userId) return fail("Not found", 404);
  await db.alert.delete({ where: { id: params.id } });
  return ok({ deleted: true });
});
