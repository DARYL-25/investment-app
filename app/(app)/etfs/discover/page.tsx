"use client";

// Natural-language ETF discovery — describe what you want, get ranked matches.

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { fmtCompact } from "@/lib/utils";

interface DiscoveryHit {
  symbol: string;
  name: string;
  issuer: string;
  ter: number;
  aum: number;
  ucits: boolean;
  distribution: string;
  region: string;
  assetClass: string;
  description: string;
  reasons: string[];
  score: number;
}

const EXAMPLES = [
  "A low-cost UCITS ETF tracking the S&P 500",
  "Accumulating world ETF for long-term investing",
  "Dividend ETF with growing payouts",
  "AI and robotics exposure",
  "Somewhere safe to park cash in EUR",
  "Sustainable global equity fund",
];

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscoveryHit[] | null>(null);
  const [explanation, setExplanation] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    if (q.trim().length < 3) return;
    setLoading(true);
    setQuery(q);
    try {
      const res = await fetch("/api/etfs/discover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();
      if (json.ok) {
        setResults(json.data.results);
        setExplanation(json.data.explanation);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="ETF discovery"
        subtitle="Describe what you're looking for in plain language — the engine matches strategy, wrapper, costs and distribution policy."
      />

      <Card className="hero-veil">
        <CardBody className="py-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search(query);
            }}
            className="mx-auto flex max-w-2xl items-center gap-2"
          >
            <div className="relative flex-1">
              <Sparkles size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='e.g. "I want a low-cost UCITS ETF tracking the S&P 500"'
                className="h-12 w-full rounded-2xl border border-stroke-strong bg-raised pl-11 pr-4 text-sm text-ink placeholder:text-ink-dim focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
            <Button type="submit" size="lg" loading={loading}>
              Find ETFs
            </Button>
          </form>
          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => search(ex)}
                className="rounded-lg border border-stroke-strong bg-surface px-2.5 py-1.5 text-[11px] text-ink-dim transition-colors hover:border-accent/40 hover:text-ink-mid"
              >
                {ex}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {explanation && (
        <p className="text-center text-xs text-ink-mid">
          <Sparkles size={11} className="mr-1 inline text-indigo-300" />
          {explanation}
        </p>
      )}

      {results && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <Card>
              <CardBody>
                <p className="py-6 text-center text-xs text-ink-dim">
                  No strong matches — try describing the region, strategy (dividend, tech, world…) or
                  wrapper (UCITS, accumulating).
                </p>
              </CardBody>
            </Card>
          ) : (
            results.map((r, i) => (
              <Link key={r.symbol} href={`/etfs/${r.symbol}`} className="block">
                <Card className="card-hover">
                  <CardBody className="flex flex-wrap items-center gap-4 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft/60 text-xs font-bold text-indigo-200">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-ink">{r.symbol}</span>
                        <span className="truncate text-xs text-ink-mid">{r.name}</span>
                        {r.ucits && <Badge tone="accent">UCITS</Badge>}
                        <Badge>{r.distribution === "Accumulating" ? "Acc" : "Dist"}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-ink-dim">{r.description}</p>
                      {r.reasons.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {r.reasons.map((reason) => (
                            <span key={reason} className="rounded bg-gain/10 px-1.5 py-0.5 text-[10px] font-medium text-gain">
                              ✓ {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-5 text-right">
                      <div>
                        <p className="tnum text-sm font-semibold text-ink">{(r.ter * 100).toFixed(2)}%</p>
                        <p className="text-[10px] uppercase tracking-wide text-ink-dim">TER</p>
                      </div>
                      <div>
                        <p className="tnum text-sm font-semibold text-ink">${fmtCompact(r.aum * 1e9)}</p>
                        <p className="text-[10px] uppercase tracking-wide text-ink-dim">AUM</p>
                      </div>
                      <ArrowRight size={15} className="text-ink-dim" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
