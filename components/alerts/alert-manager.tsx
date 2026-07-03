"use client";

// Alert rules: create, arm/disarm, delete. Evaluation happens server-side
// on load; triggered alerts are highlighted until re-armed.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Plus, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/skeleton";
import { fmtDate, cn } from "@/lib/utils";
import type { SearchResult } from "@/lib/types";

export interface AlertRow {
  id: string;
  symbol: string;
  kind: string;
  threshold: number;
  refPrice: number;
  active: boolean;
  triggeredAt: string | null;
  currentValue: number | null;
  note: string;
  createdAt: string;
}

const KINDS = [
  { value: "PRICE_BELOW", label: "Price falls below…", unit: "price", hint: "e.g. alert when NVDA drops under $100" },
  { value: "PRICE_ABOVE", label: "Price rises above…", unit: "price", hint: "e.g. alert when AAPL breaks $250" },
  { value: "PCT_DROP", label: "Drops by % from now…", unit: "%", hint: "e.g. alert on a 10% drawdown from today's price" },
  { value: "PCT_RISE", label: "Rises by % from now…", unit: "%", hint: "e.g. alert on a 15% rally from today's price" },
  { value: "PE_BELOW", label: "P/E falls below…", unit: "ratio", hint: "e.g. alert when the P/E goes under 20" },
  { value: "PE_ABOVE", label: "P/E rises above…", unit: "ratio", hint: "valuation getting stretched" },
  { value: "EARNINGS", label: "Earnings within X days", unit: "days", hint: "reminded before the next report" },
  { value: "DIVIDEND", label: "Ex-dividend within X days", unit: "days", hint: "don't miss the ex-date" },
];

function describe(a: AlertRow): string {
  const k = a.kind;
  if (k === "PRICE_BELOW") return `price below ${a.threshold}`;
  if (k === "PRICE_ABOVE") return `price above ${a.threshold}`;
  if (k === "PCT_DROP") return `drops ${a.threshold}% from ${a.refPrice.toFixed(2)}`;
  if (k === "PCT_RISE") return `rises ${a.threshold}% from ${a.refPrice.toFixed(2)}`;
  if (k === "PE_BELOW") return `P/E below ${a.threshold}`;
  if (k === "PE_ABOVE") return `P/E above ${a.threshold}`;
  if (k === "EARNINGS") return `earnings within ${a.threshold || 7} days`;
  if (k === "DIVIDEND") return `ex-dividend within ${a.threshold || 7} days`;
  return k;
}

function formatCurrent(a: AlertRow): string {
  if (a.currentValue == null) return "—";
  if (a.kind.startsWith("PCT_")) return `${(a.currentValue * 100).toFixed(1)}% since set`;
  if (a.kind.startsWith("PE_")) return `P/E ${a.currentValue.toFixed(1)}`;
  if (a.kind === "EARNINGS" || a.kind === "DIVIDEND") return fmtDate(a.currentValue * 1000);
  return a.currentValue.toFixed(2);
}

export function AlertManager({ alerts }: { alerts: AlertRow[] }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [kind, setKind] = useState("PRICE_BELOW");
  const [threshold, setThreshold] = useState("");
  const [note, setNote] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const kindDef = KINDS.find((k) => k.value === kind)!;

  const doSearch = async (q: string) => {
    setSymbol(q.toUpperCase());
    setShowSug(true);
    if (!q.trim()) return setSuggestions([]);
    const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setSuggestions((json.data ?? []).slice(0, 6));
  };

  const create = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol, kind, threshold: Number(threshold) || 0, note }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) return setError(json.error ?? "Failed to create alert");
    setShow(false);
    setSymbol("");
    setThreshold("");
    setNote("");
    router.refresh();
  };

  const toggle = async (a: AlertRow) => {
    await fetch(`/api/alerts/${a.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !a.active }),
    });
    router.refresh();
  };

  const remove = async (id: string) => {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const triggered = alerts.filter((a) => a.active && a.triggeredAt);
  const armed = alerts.filter((a) => a.active && !a.triggeredAt);
  const disabled = alerts.filter((a) => !a.active);

  const renderGroup = (title: string, group: AlertRow[], tone: "warn" | "neutral" | "dim") =>
    group.length > 0 && (
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-dim">{title}</p>
        <div className="space-y-2">
          {group.map((a) => (
            <Card
              key={a.id}
              className={cn("transition-colors", tone === "warn" && "border-warn/40 bg-warn/[0.04]")}
            >
              <CardBody className="flex flex-wrap items-center gap-3 py-3.5">
                <Bell size={15} className={tone === "warn" ? "text-warn" : "text-ink-dim"} />
                <Link href={`/stocks/${a.symbol}`} className="text-sm font-bold text-ink hover:text-indigo-200">
                  {a.symbol}
                </Link>
                <span className="text-xs text-ink-mid">{describe(a)}</span>
                {a.triggeredAt && <Badge tone="warn">Triggered {fmtDate(a.triggeredAt)}</Badge>}
                {a.note && <span className="text-[11px] italic text-ink-dim">“{a.note}”</span>}
                <span className="tnum ml-auto text-xs text-ink-dim">{formatCurrent(a)}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggle(a)}
                    title={a.active ? "Disable" : "Re-arm"}
                    className="rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-raised hover:text-ink"
                  >
                    {a.active ? <BellOff size={14} /> : <Bell size={14} />}
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    title="Delete"
                    className="rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-raised hover:text-loss"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShow(true)}>
          <Plus size={15} /> New alert
        </Button>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Bell size={30} />}
              title="No alerts yet"
              body='Create rules like "alert me when NVDA drops 10%" or "when AAPL P/E goes below 20" — they are checked whenever you open the app.'
              action={
                <Button onClick={() => setShow(true)} size="sm">
                  <Plus size={13} /> Create your first alert
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {renderGroup("Triggered", triggered, "warn")}
          {renderGroup("Armed", armed, "neutral")}
          {renderGroup("Disabled", disabled, "dim")}
        </>
      )}

      <Dialog open={show} onClose={() => setShow(false)} title="New alert">
        <div className="space-y-3.5">
          <div className="relative">
            <Field label="Symbol">
              <Input
                value={symbol}
                onChange={(e) => doSearch(e.target.value)}
                onBlur={() => setTimeout(() => setShowSug(false), 200)}
                placeholder="AAPL, VOO…"
              />
            </Field>
            {showSug && suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-stroke-strong bg-overlay shadow-pop">
                {suggestions.map((s) => (
                  <li key={s.symbol}>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-raised"
                      onMouseDown={() => {
                        setSymbol(s.symbol);
                        setShowSug(false);
                      }}
                    >
                      <span className="font-semibold text-ink">{s.symbol}</span>
                      <span className="truncate text-ink-dim">{s.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Field label="Condition" hint={kindDef.hint}>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`Threshold (${kindDef.unit})`}>
            <Input
              type="number"
              step="any"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={kind.startsWith("PCT") ? "10" : kind === "EARNINGS" || kind === "DIVIDEND" ? "7" : "100"}
            />
          </Field>
          <Field label="Note (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this alert matters…" />
          </Field>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setShow(false)}>
              Cancel
            </Button>
            <Button onClick={create} loading={loading} disabled={!symbol.trim()}>
              Create alert
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
