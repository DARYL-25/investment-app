"use client";

// ETF screener filter bar — writes filters into URL search params so results
// are server-rendered, shareable and back-button friendly.

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function EtfFilterBar({
  regions,
  issuers,
  assetClasses,
}: {
  regions: string[];
  issuers: string[];
  assetClasses: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`/etfs?${next.toString()}`, { scroll: false });
    },
    [params, router]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) setParam("q", q);
    }, 350);
    return () => clearTimeout(t);
  }, [q, params, setParam]);

  const toggle = (key: string, value: string) =>
    setParam(key, params.get(key) === value ? "" : value);

  const chip = (active: boolean) =>
    cn(
      "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
      active
        ? "border-accent/40 bg-accent-soft/60 text-indigo-200"
        : "border-stroke-strong bg-raised text-ink-dim hover:text-ink-mid"
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, ticker, index or strategy…"
          className="max-w-xs"
        />
        <Select
          value={params.get("region") ?? ""}
          onChange={(e) => setParam("region", e.target.value)}
          className="w-40"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select
          value={params.get("assetClass") ?? ""}
          onChange={(e) => setParam("assetClass", e.target.value)}
          className="w-40"
        >
          <option value="">All asset classes</option>
          {assetClasses.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select
          value={params.get("issuer") ?? ""}
          onChange={(e) => setParam("issuer", e.target.value)}
          className="w-40"
        >
          <option value="">All issuers</option>
          {issuers.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </Select>
        <Select
          value={params.get("sort") ?? ""}
          onChange={(e) => setParam("sort", e.target.value)}
          className="w-36"
        >
          <option value="">Sort: AUM</option>
          <option value="ter">Sort: lowest TER</option>
          <option value="name">Sort: name</option>
        </Select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button className={chip(params.get("ucits") === "1")} onClick={() => toggle("ucits", "1")}>
          UCITS
        </button>
        <button className={chip(params.get("dist") === "Accumulating")} onClick={() => toggle("dist", "Accumulating")}>
          Accumulating
        </button>
        <button className={chip(params.get("dist") === "Distributing")} onClick={() => toggle("dist", "Distributing")}>
          Distributing
        </button>
        <button className={chip(params.get("esg") === "1")} onClick={() => toggle("esg", "1")}>
          ESG
        </button>
        <button className={chip(params.get("maxTer") === "0.001")} onClick={() => toggle("maxTer", "0.001")}>
          TER ≤ 0.10%
        </button>
        <button className={chip(params.get("maxTer") === "0.002")} onClick={() => toggle("maxTer", "0.002")}>
          TER ≤ 0.20%
        </button>
      </div>
    </div>
  );
}
