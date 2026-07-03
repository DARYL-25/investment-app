// Shared helpers for API route handlers: uniform error handling,
// zod validation and lightweight per-user rate limiting.

import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AuthError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Wrap a handler with uniform error mapping + logging. */
export function handler<T extends (...args: any[]) => Promise<NextResponse>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AuthError) return fail("Unauthorized", 401);
      if (err instanceof ZodError) {
        return fail(err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "), 422);
      }
      console.error("[api]", err instanceof Error ? err.stack : err);
      return fail("Internal server error", 500);
    }
  }) as T;
}

// ZodType<T, any, any> binds T to the schema *output* so fields with
// .default() come back non-optional.
export async function parseBody<T>(req: Request, schema: ZodType<T, any, any>): Promise<T> {
  const json = await req.json().catch(() => {
    throw new ZodError([{ code: "custom", message: "Invalid JSON body", path: [] }]);
  });
  return schema.parse(json);
}

// ------------------------------------------------------------- rate limiting
// Token-bucket per key (user id or IP). In-memory — swap for Redis in
// multi-instance deployments.

const buckets = new Map<string, { tokens: number; refilledAt: number }>();

export function rateLimit(key: string, maxPerMinute = 120): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: maxPerMinute, refilledAt: now };
  const elapsed = (now - bucket.refilledAt) / 60_000;
  bucket.tokens = Math.min(maxPerMinute, bucket.tokens + elapsed * maxPerMinute);
  bucket.refilledAt = now;
  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}
