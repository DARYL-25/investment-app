import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { compareEtfs } from "@/lib/server/etf";
import { ETF_CATALOG } from "@/data/etfs";
import { fmtCompact, fmtPercent, changeColor, cn } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { LineCompareChart } from "@/components/charts/line-compare-chart";
import { COMPARE_COLORS } from "@/lib/palette";
import { ComparePicker } from "@/components/etfs/compare-picker";
import { BarList } from "@/components/charts/bar-list";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { symbols?: string };
}) {
  const symbols = (searchParams.symbols ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 4);

  const picker = (
    <ComparePicker
      selected={symbols}
      catalog={ETF_CATALOG.map((e) => ({ symbol: e.symbol, name: e.name }))}
    />
  );

  if (symbols.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="ETF comparison" subtitle="Put up to four funds side by side." />
        {picker}
        <Card className="mx-auto mt-10 max-w-lg">
          <CardBody>
            <EmptyState
              icon={<GitCompareArrows size={30} />}
              title="Pick ETFs to compare"
              body="Try VOO vs SPY vs CSPX to see fees, performance, risk and holdings overlap side by side."
              action={
                <Link href="/etfs/compare?symbols=VOO,SPY,CSPX" className="text-xs font-medium text-indigo-300 hover:text-indigo-200">
                  Load example comparison →
                </Link>
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const cmp = await compareEtfs(symbols);
  const { entries, performance, overlap, trailing } = cmp;

  const rows: { label: string; render: (i: number) => React.ReactNode; highlight?: "min" | "max"; values?: (number | null)[] }[] = [
    { label: "Issuer", render: (i) => entries[i].issuer },
    {
      label: "TER",
      values: entries.map((e) => e.live?.expenseRatio ?? e.ter),
      highlight: "min",
      render: (i) => `${(((entries[i].live?.expenseRatio ?? entries[i].ter) as number) * 100).toFixed(2)}%`,
    },
    {
      label: "AUM",
      values: entries.map((e) => e.live?.totalAssets ?? e.aum * 1e9),
      highlight: "max",
      render: (i) => `$${fmtCompact(entries[i].live?.totalAssets ?? entries[i].aum * 1e9)}`,
    },
    { label: "Domicile", render: (i) => entries[i].domicile },
    { label: "UCITS", render: (i) => (entries[i].ucits ? "Yes" : "No") },
    { label: "Replication", render: (i) => entries[i].replication },
    { label: "Distribution", render: (i) => entries[i].distribution },
    {
      label: "Dividend yield",
      render: (i) => (entries[i].live?.yield != null ? fmtPercent(entries[i].live!.yield!, { sign: false }) : "—"),
    },
    { label: "Benchmark", render: (i) => entries[i].benchmark },
  ];

  const perfRows: { label: string; key: keyof (typeof trailing)[number]; invert?: boolean }[] = [
    { label: "1 month", key: "r1m" },
    { label: "6 months", key: "r6m" },
    { label: "1 year", key: "r1y" },
    { label: "3 years", key: "r3y" },
    { label: "5 years", key: "r5y" },
    { label: "Volatility (1Y)", key: "vol1y", invert: true },
    { label: "Max drawdown (1Y)", key: "maxDrawdown1y", invert: true },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="ETF comparison" subtitle="Fees, performance, risk and overlap — side by side." />
      {picker}

      {/* fact table */}
      <Card>
        <CardBody className="overflow-x-auto pt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stroke">
                <th className="w-40 py-2 pr-4" />
                {entries.map((e, i) => (
                  <th key={e.symbol} className="min-w-[150px] py-2 pr-4">
                    <Link href={`/etfs/${e.symbol}`} className="group">
                      <span
                        className="text-sm font-bold group-hover:underline"
                        style={{ color: COMPARE_COLORS[i] }}
                      >
                        {e.symbol}
                      </span>
                      <p className="mt-0.5 max-w-[180px] truncate text-[10px] font-normal text-ink-dim">
                        {e.name}
                      </p>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {rows.map((row) => {
                let bestIdx = -1;
                if (row.values && row.highlight) {
                  const valid = row.values.map((v, i) => [v, i] as const).filter(([v]) => v != null);
                  if (valid.length > 1) {
                    bestIdx = valid.reduce((best, cur) =>
                      row.highlight === "min"
                        ? (cur[0]! < best[0]! ? cur : best)
                        : (cur[0]! > best[0]! ? cur : best)
                    )[1];
                  }
                }
                return (
                  <tr key={row.label}>
                    <td className="py-2.5 pr-4 text-ink-dim">{row.label}</td>
                    {entries.map((e, i) => (
                      <td
                        key={e.symbol}
                        className={cn(
                          "tnum py-2.5 pr-4 font-medium",
                          i === bestIdx ? "text-gain" : "text-ink"
                        )}
                      >
                        {row.render(i)}
                        {i === bestIdx && <span className="ml-1 text-[9px] uppercase text-gain">best</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* performance chart */}
      <Card>
        <CardHeader title="Performance" subtitle="5 years, normalized to 100 at common start" />
        <CardBody>
          <LineCompareChart
            series={performance.map((p, i) => ({
              label: p.symbol,
              points: p.series,
              color: COMPARE_COLORS[i],
            }))}
            height={340}
            percentScale
          />
        </CardBody>
      </Card>

      {/* trailing returns + risk */}
      <Card>
        <CardHeader title="Returns & risk" />
        <CardBody className="overflow-x-auto pt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stroke text-[11px] uppercase tracking-wide text-ink-dim">
                <th className="w-40 py-2 pr-4 font-medium">Metric</th>
                {entries.map((e, i) => (
                  <th key={e.symbol} className="py-2 pr-4 font-semibold" style={{ color: COMPARE_COLORS[i] }}>
                    {e.symbol}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {perfRows.map((row) => (
                <tr key={row.label}>
                  <td className="py-2.5 pr-4 text-ink-dim">{row.label}</td>
                  {trailing.map((t) => {
                    const v = t[row.key] as number | null;
                    return (
                      <td
                        key={t.symbol}
                        className={cn("tnum py-2.5 pr-4 font-medium", row.invert ? "text-ink" : changeColor(v))}
                      >
                        {v != null ? fmtPercent(v, { sign: !row.invert }) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* overlap + sectors */}
      <div className="grid gap-5 lg:grid-cols-2">
        {overlap.length > 0 && (
          <Card>
            <CardHeader
              title="Holdings overlap"
              subtitle="Weight-of-common-holdings across each fund's top 10"
            />
            <CardBody className="space-y-4 pt-3">
              {overlap.map((o) => (
                <div key={o.pair.join("-")}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">
                      {o.pair[0]} × {o.pair[1]}
                    </span>
                    <span className="tnum font-bold text-indigo-300">
                      {(o.overlapPct * 100).toFixed(1)}% overlap
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-raised">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-300"
                      style={{ width: `${Math.min(100, o.overlapPct * 100)}%` }}
                    />
                  </div>
                  {o.common.length > 0 && (
                    <p className="mt-1.5 truncate text-[11px] text-ink-dim">
                      Shared: {o.common.slice(0, 5).map((c) => c.name).join(", ")}
                      {o.common.length > 5 ? "…" : ""}
                    </p>
                  )}
                </div>
              ))}
              <p className="text-[10px] leading-relaxed text-ink-dim">
                Based on published top-10 holdings — funds tracking the same index will show high but
                not perfect overlap due to reporting dates.
              </p>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="Sector exposure" />
          <CardBody className="grid gap-5 pt-3 sm:grid-cols-2">
            {entries.map((e, i) => (
              <div key={e.symbol}>
                <p className="mb-2 text-xs font-semibold" style={{ color: COMPARE_COLORS[i] }}>
                  {e.symbol}
                </p>
                {e.live?.sectorWeights.length ? (
                  <BarList
                    items={e.live.sectorWeights.slice(0, 6).map((s) => ({ label: s.sector, weight: s.weight }))}
                    color={COMPARE_COLORS[i]}
                    max={6}
                  />
                ) : (
                  <p className="text-[11px] text-ink-dim">No sector data{e.assetClass !== "Equity" ? ` (${e.assetClass.toLowerCase()} fund)` : ""}.</p>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {entries.some((e) => e.ucits) && entries.some((e) => !e.ucits) && (
        <Card>
          <CardBody className="flex items-start gap-3 text-xs leading-relaxed text-ink-mid">
            <Badge tone="accent">Note</Badge>
            You are comparing US-domiciled and UCITS funds. European investors typically prefer UCITS
            (Irish domicile reduces dividend withholding tax to 15% and avoids US estate-tax exposure),
            while US investors should use US-listed funds.
          </CardBody>
        </Card>
      )}
    </div>
  );
}
