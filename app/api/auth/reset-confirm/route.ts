import { z } from "zod";
import { createHash } from "crypto";
import { db } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/auth";
import { fail, handler, ok, parseBody } from "@/lib/server/api";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(200),
});

export const POST = handler(async (req: Request) => {
  const body = await parseBody(req, schema);
  const tokenHash = createHash("sha256").update(body.token).digest("hex");

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail("This reset link is invalid or has expired", 400);
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(body.password) },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return ok({ reset: true });
});
