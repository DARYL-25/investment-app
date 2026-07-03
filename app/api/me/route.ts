import { z } from "zod";
import { db } from "@/lib/server/db";
import { getUser, requireUserId, verifyPassword, hashPassword } from "@/lib/server/auth";
import { fail, handler, ok, parseBody } from "@/lib/server/api";

export const GET = handler(async () => {
  const user = await getUser();
  if (!user) return fail("Unauthorized", 401);
  return ok(user);
});

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  baseCurrency: z.enum(["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"]).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(200).optional(),
});

export const PATCH = handler(async (req: Request) => {
  const userId = await requireUserId();
  const body = await parseBody(req, updateSchema);

  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name.trim();
  if (body.baseCurrency) data.baseCurrency = body.baseCurrency;

  if (body.newPassword) {
    if (!body.currentPassword) return fail("Current password is required", 400);
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
      return fail("Current password is incorrect", 401);
    }
    data.passwordHash = await hashPassword(body.newPassword);
  }

  const updated = await db.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, baseCurrency: true, plan: true },
  });
  return ok(updated);
});
