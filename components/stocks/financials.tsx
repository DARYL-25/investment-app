"use client";

// Financial statements viewer: annual/quarterly × income/balance/cashflow.

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtCompact } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { FinancialStatements, StatementRow } from "@/lib/server/market";

function StatementTable({ periods, rows, currency }: { periods: string[]; rows: StatementRow[]; currency: string }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-ink-dim">No data available.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-stroke text-[11px] uppercase tracking-wide text-ink-dim">
            <th className="py-2 pr-4 font-medium">({currency})</th>
            {periods.map((p) => (
              <th key={p} className="tnum py-2 pl-4 text-right font-medium">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stroke">
          {rows.map((row) => {
            const emphasize = /^(Total Revenue|Gross Profit|Operating Income|Net Income|Total Assets|Total Liabilities|Shareholders' Equity|Operating Cash Flow|Net Change in Cash)$/.test(
              row.label
            );
            return (
              <tr key={row.label} className={cn(emphasize && "bg-raised/30")}>
                <td className={cn("py-2 pr-4", emphasize ? "font-semibold text-ink" : "text-ink-mid")}>
                  {row.label}
                </td>
                {row.values.map((v, i) => (
                  <td
                    key={i}
                    className={cn(
                      "tnum py-2 pl-4 text-right",
                      v != null && v < 0 ? "text-loss" : emphasize ? "text-ink" : "text-ink-mid"
                    )}
                  >
                    {v == null ? "—" : fmtCompact(v)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Financials({ data }: { data: FinancialStatements }) {
  const [period, setPeriod] = useState<"annual" | "quarterly">("annual");
  const [statement, setStatement] = useState<"income" | "balance" | "cashflow">("income");
  const set = data[period];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Tabs value={statement} onValueChange={(v) => setStatement(v as any)}>
          <TabsList>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
          <TabsList>
            <TabsTrigger value="annual">Annual</TabsTrigger>
            <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <StatementTable periods={set.periods} rows={set[statement]} currency={data.currency} />
    </div>
  );
}
