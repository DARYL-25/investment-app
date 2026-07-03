import { searchSymbols } from "@/lib/server/market";
import { handler, ok } from "@/lib/server/api";

export const GET = handler(async (req: Request) => {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return ok(await searchSymbols(q.slice(0, 60)));
});
