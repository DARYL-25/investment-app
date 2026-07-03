import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/server/db";
import { fail, handler, ok, parseBody, rateLimit } from "@/lib/server/api";

const schema = z.object({ email: z.string().email() });

// Creates a single-use reset token (1h expiry). Without an email provider
// configured, the reset link is returned in the response in development so
// the flow is fully usable; in production wire this to Resend/SES and
// remove `devLink`.
export const POST = handler(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`reset:${ip}`, 5)) return fail("Too many attempts, slow down", 429);

  const body = await parseBody(req, schema);
  const user = await db.user.findUnique({ where: { email: body.email.toLowerCase().trim() } });

  // Always report success to avoid account enumeration
  if (!user) return ok({ sent: true });

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3600_000) },
  });

  const link = `/reset?token=${token}`;
  // TODO(production): send `link` via email provider instead of returning it.
  const devLink = process.env.NODE_ENV !== "production" ? link : undefined;
  return ok({ sent: true, devLink });
});
