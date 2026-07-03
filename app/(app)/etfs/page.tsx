import Link from "next/link";
import { Sparkles, GitCompareArrows } from "lucide-react";
import { filterCatalog, withLiveQuotes } from "@/lib/server/etf";
import { ETF_ASSET_CLASSES, ETF_ISSUERS, ETF_REGIONS } from "@/data/etfs";
import { fmtCompact } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, ChangeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EtfFilterBar } from "@/components/etfs/filter-bar";

export const dynamic = "force-dynamic";

export default async function EtfsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filtered = filterCatalog({
    q: searchParams.q,
    region: searchParams.region,
    assetClass: searchParams.assetClass,
    issuer: searchParams.issuer,
    ucits: searchParams.ucits === "1" ? true : undefined,
    distribution: searchParams.dist,
    esg: searchParams.esg === "1" ? true : undefined,
    maxTer: searchParams.maxTer ? Number(searchParams.maxTer) : undefined,
    sort: searchParams.sort as any,
  });
  const list = await withLiveQuotes(filtered.slice(0, 40));

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="ETF intelligence"
        subtitle={`${filtered.length} funds matching · curated US + UCITS catalog with live data`}
        action={
          <>
            <Link href="/etfs/discover">
              <Button variant="secondary" size="sm">
                <Sparkles size={13} /> Discovery
              </Button>
            </Link>
            <Link href="/etfs/compare?symbols=VOO,SPY,CSPX">
              <Button variant="secondary" size="sm">
                <GitCompareArrows size={13} /> Compare
              </Button>
            </Link>
          </>
        }
      />

      <EtfFilterBar regions={ETF_REGIONS} issuers={ETF_ISSUERS} assetClasses={ETF_ASSET_CLASSES} />

      <Card>
        <CardBody className="overflow-x-auto pt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stroke text-[11px] uppercase tracking-wide text-ink-dim">
                <th className="py-2 pr-4 font-medium">Fund</th>
                <th className="py-2 pr-4 font-medium">Region</th>
                <th className="py-2 pr-4 text-right font-medium">TER</th>
                <th className="py-2 pr-4 text-right font-medium">AUM</th>
                <th className="py-2 pr-4 font-medium">Dist.</th>
                <th className="py-2 pr-4 font-medium">Domicile</th>
                <th className="py-2 text-right font-medium">Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {list.map((etf) => (
                <tr key={etf.symbol} className="transition-colors hover:bg-raised/40">
                  <td className="py-3 pr-4">
                    <Link href={`/etfs/${etf.symbol}`} className="group block">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink group-hover:text-indigo-200">{etf.symbol}</span>
                        {etf.ucits && <Badge tone="accent">UCITS</Badge>}
                        {etf.esg && <Badge tone="gain">ESG</Badge>}
                      </div>
                      <p className="mt-0.5 max-w-md truncate text-[11px] text-ink-dim">{etf.name}</p>
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-ink-mid">{etf.region}</td>
                  <td className="tnum py-3 pr-4 text-right font-medium text-ink">
                    {(etf.ter * 100).toFixed(2)}%
                  </td>
                  <td className="tnum py-3 pr-4 text-right text-ink-mid">${fmtCompact(etf.aum * 1e9)}</td>
                  <td className="py-3 pr-4 text-ink-mid">{etf.distribution === "Accumulating" ? "Acc" : "Dist"}</td>
                  <td className="py-3 pr-4 text-ink-mid">{etf.domicile}</td>
                  <td className="py-3 text-right">
                    <ChangeBadge value={etf.changePercent} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <p className="py-10 text-center text-xs text-ink-dim">
              No ETFs match these filters. Try widening your criteria or use the Discovery engine.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
