import { z } from "zod";
import { cookies } from "next/headers";
import { db } from "@/lib/server/db";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from "@/lib/server/auth";
import { fail, handler, ok, parseBody, rateLimit } from "@/lib/server/api";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = handler(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`login:${ip}`, 20)) return fail("Too many attempts, slow down", 429);

  const body = await parseBody(req, schema);
  const user = await db.user.findUnique({ where: { email: body.email.toLowerCase().trim() } });
  // constant-shape response for wrong email vs wrong password
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return fail("Invalid email or password", 401);
  }

  const token = await createSessionToken(user.id);
  cookies().set(SESSION_COOKIE, token, sessionCookieOptions());
  return ok({ id: user.id, email: user.email, name: user.name });
});
