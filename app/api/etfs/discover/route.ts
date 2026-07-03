import { z } from "zod";
import { discoverEtfsSmart } from "@/lib/server/etf";
import { handler, ok, parseBody, rateLimit, fail } from "@/lib/server/api";

const schema = z.object({ query: z.string().min(3).max(400) });

export const POST = handler(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`discover:${ip}`, 30)) return fail("Too many requests", 429);
  const { query } = await parseBody(req, schema);
  const { results, explanation } = await discoverEtfsSmart(query);
  return ok({
    explanation,
    results: results.map((r) => ({
      symbol: r.etf.symbol,
      name: r.etf.name,
      issuer: r.etf.issuer,
      ter: r.etf.ter,
      aum: r.etf.aum,
      ucits: r.etf.ucits,
      distribution: r.etf.distribution,
      region: r.etf.region,
      assetClass: r.etf.assetClass,
      description: r.etf.description,
      reasons: r.reasons,
      score: Math.round(r.score),
    })),
  });
});
