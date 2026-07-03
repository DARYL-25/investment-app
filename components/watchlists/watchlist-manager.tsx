"use client";

// Watchlist management: multiple lists, add/remove symbols, inline notes.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Check, Star } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { ChangeBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/charts/sparkline";
import { fmtCurrency, cn } from "@/lib/utils";
import type { Quote, SearchResult } from "@/lib/types";

export interface WatchlistData {
  id: string;
  name: string;
  items: {
    id: string;
    symbol: string;
    assetType: string;
    note: string;
    quote: Quote | null;
    spark: number[];
  }[];
}

export function WatchlistManager({ lists }: { lists: WatchlistData[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(lists[0]?.id ?? "");
  const active = lists.find((l) => l.id === activeId) ?? lists[0];
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const createList = async () => {
    setLoading(true);
    const res = await fetch("/api/watchlists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.ok) {
      setShowNew(false);
      setNewName("");
      setActiveId(json.data.id);
      router.refresh();
    }
  };

  const deleteList = async () => {
    if (!active || !confirm(`Delete watchlist "${active.name}"?`)) return;
    const res = await fetch(`/api/watchlists/${active.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) return alert(json.error ?? "Failed");
    setActiveId(lists.find((l) => l.id !== active.id)?.id ?? "");
    router.refresh();
  };

  const doSearch = async (q: string) => {
    setSearch(q);
    if (!q.trim()) return setSuggestions([]);
    const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setSuggestions((json.data ?? []).slice(0, 8));
  };

  const addSymbol = async (s: SearchResult) => {
    await fetch(`/api/watchlists/${active.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: s.symbol, assetType: s.type === "ETF" ? "ETF" : "STOCK" }),
    });
    setShowAdd(false);
    setSearch("");
    setSuggestions([]);
    router.refresh();
  };

  const removeSymbol = async (symbol: string) => {
    await fetch(`/api/watchlists/${active.id}?symbol=${encodeURIComponent(symbol)}`, {
      method: "DELETE",
    });
    router.refresh();
  };

  const saveNote = async (symbol: string) => {
    await fetch(`/api/watchlists/${active.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemSymbol: symbol, itemNote: noteDraft }),
    });
    setEditingNote(null);
    router.refresh();
  };

  if (!active) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-xl border border-stroke bg-surface p-1">
          {lists.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveId(l.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                l.id === active.id ? "bg-raised text-ink shadow-card" : "text-ink-dim hover:text-ink-mid"
              )}
            >
              {l.name}
              <span className="ml-1.5 text-[10px] text-ink-dim">{l.items.length}</span>
            </button>
          ))}
          <button
            onClick={() => setShowNew(true)}
            className="rounded-lg p-1.5 text-ink-dim hover:text-ink"
            title="New watchlist"
          >
            <Plus size={14} />
          </button>
        </div>
        <Button variant="ghost" size="icon" onClick={deleteList} title="Delete this watchlist">
          <Trash2 size={14} />
        </Button>
        <Button onClick={() => setShowAdd(true)} size="md" className="ml-auto">
          <Plus size={15} /> Add symbol
        </Button>
      </div>

      <Card>
        <CardHeader title={active.name} subtitle={`${active.items.length} tracked`} />
        <CardBody className="overflow-x-auto pt-3">
          {active.items.length === 0 ? (
            <EmptyState
              icon={<Star size={28} />}
              title="Nothing tracked yet"
              body="Add stocks or ETFs to follow their price, trend and your own notes."
            />
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stroke text-[11px] uppercase tracking-wide text-ink-dim">
                  <th className="py-2 pr-4 font-medium">Symbol</th>
                  <th className="py-2 pr-4 text-right font-medium">Price</th>
                  <th className="py-2 pr-4 text-right font-medium">Today</th>
                  <th className="hidden py-2 pr-4 font-medium sm:table-cell">Trend (1M)</th>
                  <th className="hidden py-2 pr-4 font-medium md:table-cell">Note</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke">
                {active.items.map((item) => (
                  <tr key={item.id} className="group transition-colors hover:bg-raised/40">
                    <td className="py-3 pr-4">
                      <Link
                        href={item.assetType === "ETF" ? `/etfs/${item.symbol}` : `/stocks/${item.symbol}`}
                        className="block"
                      >
                        <span className="font-semibold text-ink hover:text-indigo-200">{item.symbol}</span>
                        <p className="max-w-[180px] truncate text-[11px] text-ink-dim">
                          {item.quote?.name ?? ""}
                        </p>
                      </Link>
                    </td>
                    <td className="tnum py-3 pr-4 text-right font-medium text-ink">
                      {item.quote ? fmtCurrency(item.quote.price, item.quote.currency) : "—"}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <ChangeBadge value={item.quote?.changePercent} />
                    </td>
                    <td className="hidden py-3 pr-4 sm:table-cell">
                      <Sparkline points={item.spark} />
                    </td>
                    <td className="hidden max-w-[220px] py-3 pr-4 md:table-cell">
                      {editingNote === item.symbol ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveNote(item.symbol)}
                            className="h-7 text-xs"
                            autoFocus
                          />
                          <button onClick={() => saveNote(item.symbol)} className="text-gain">
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingNote(item.symbol);
                            setNoteDraft(item.note);
                          }}
                          className="group/note flex items-center gap-1.5 text-left text-ink-dim hover:text-ink-mid"
                        >
                          <span className="truncate">{item.note || "Add note…"}</span>
                          <Pencil size={11} className="shrink-0 opacity-0 group-hover/note:opacity-100" />
                        </button>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => removeSymbol(item.symbol)}
                        className="rounded-md p-1 text-ink-dim opacity-0 transition-all hover:bg-raised hover:text-loss group-hover:opacity-100"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Dialog open={showNew} onClose={() => setShowNew(false)} title="New watchlist">
        <div className="space-y-3.5">
          <Field label="Name">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tech, Dividends…" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
            <Button onClick={createList} loading={loading} disabled={!newName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title={`Add to ${active.name}`}>
        <div className="space-y-3">
          <Input
            value={search}
            onChange={(e) => doSearch(e.target.value)}
            placeholder="Search stocks or ETFs…"
            autoFocus
          />
          <ul className="max-h-72 divide-y divide-stroke overflow-y-auto">
            {suggestions.map((s) => (
              <li key={s.symbol}>
                <button
                  onClick={() => addSymbol(s)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-xs hover:bg-raised"
                >
                  <span className="w-16 shrink-0 font-semibold text-ink">{s.symbol}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-mid">{s.name}</span>
                  <span className="shrink-0 text-[10px] uppercase text-ink-dim">{s.type}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </div>
  );
}
