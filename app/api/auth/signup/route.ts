import { z } from "zod";
import { cookies } from "next/headers";
import { db } from "@/lib/server/db";
import { createSessionToken, hashPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/auth";
import { fail, handler, ok, parseBody, rateLimit } from "@/lib/server/api";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  baseCurrency: z.enum(["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"]).default("USD"),
});

export const POST = handler(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`signup:${ip}`, 10)) return fail("Too many attempts, slow down", 429);

  const body = await parseBody(req, schema);
  const email = body.email.toLowerCase().trim();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return fail("An account with this email already exists", 409);

  const user = await db.user.create({
    data: {
      email,
      name: body.name.trim(),
      passwordHash: await hashPassword(body.password),
      baseCurrency: body.baseCurrency,
      portfolios: { create: { name: "My Portfolio", baseCurrency: body.baseCurrency } },
      watchlists: { create: { name: "My Watchlist" } },
    },
  });

  const token = await createSessionToken(user.id);
  cookies().set(SESSION_COOKIE, token, sessionCookieOptions());
  return ok({ id: user.id, email: user.email, name: user.name });
});
