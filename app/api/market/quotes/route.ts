import { getQuotes } from "@/lib/server/market";
import { fail, handler, ok } from "@/lib/server/api";

export const GET = handler(async (req: Request) => {
  const symbols = (new URL(req.url).searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  if (symbols.length === 0) return fail("symbols required", 400);
  const map = await getQuotes(symbols);
  return ok(Object.fromEntries(map));
});
