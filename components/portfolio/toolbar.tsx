"use client";

// Portfolio switcher + create/edit/delete + add-transaction entry point.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { TxDialog } from "./tx-dialog";
import { cn } from "@/lib/utils";

interface PortfolioLite {
  id: string;
  name: string;
  baseCurrency: string;
  benchmark: string;
}

const BENCHMARK_OPTIONS = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^NDX", name: "Nasdaq 100" },
  { symbol: "URTH", name: "MSCI World" },
  { symbol: "VT", name: "FTSE Global All Cap" },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50" },
];

export function PortfolioToolbar({
  portfolios,
  activeId,
}: {
  portfolios: PortfolioLite[];
  activeId: string;
}) {
  const router = useRouter();
  const active = portfolios.find((p) => p.id === activeId) ?? portfolios[0];
  const [showTx, setShowTx] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: "", baseCurrency: "USD", benchmark: "^GSPC" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createPortfolio = async () => {
    setLoading(true);
    const res = await fetch("/api/portfolios", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) return setError(json.error ?? "Failed");
    setShowNew(false);
    router.push(`/portfolio?p=${json.data.id}`);
    router.refresh();
  };

  const updatePortfolio = async () => {
    setLoading(true);
    const res = await fetch(`/api/portfolios/${active.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) return setError(json.error ?? "Failed");
    setShowEdit(false);
    router.refresh();
  };

  const deletePortfolio = async () => {
    if (!confirm(`Delete portfolio "${active.name}" and all its transactions?`)) return;
    const res = await fetch(`/api/portfolios/${active.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) return alert(json.error ?? "Failed");
    setShowEdit(false);
    router.push("/portfolio");
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-xl border border-stroke bg-surface p-1">
        {portfolios.map((p) => (
          <button
            key={p.id}
            onClick={() => router.push(`/portfolio?p=${p.id}`)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              p.id === active.id ? "bg-raised text-ink shadow-card" : "text-ink-dim hover:text-ink-mid"
            )}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => {
            setForm({ name: "", baseCurrency: active.baseCurrency, benchmark: "^GSPC" });
            setError("");
            setShowNew(true);
          }}
          className="rounded-lg p-1.5 text-ink-dim hover:text-ink"
          title="New portfolio"
        >
          <Plus size={14} />
        </button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        title="Portfolio settings"
        onClick={() => {
          setForm({ name: active.name, baseCurrency: active.baseCurrency, benchmark: active.benchmark });
          setError("");
          setShowEdit(true);
        }}
      >
        <Settings2 size={15} />
      </Button>

      <Button onClick={() => setShowTx(true)} size="md">
        <Plus size={15} /> Transaction
      </Button>

      <TxDialog portfolioId={active.id} open={showTx} onClose={() => setShowTx(false)} />

      <Dialog open={showNew || showEdit} onClose={() => (showNew ? setShowNew(false) : setShowEdit(false))} title={showNew ? "New portfolio" : "Portfolio settings"}>
        <div className="space-y-3.5">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Retirement, Trading…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Base currency">
              <Select value={form.baseCurrency} onChange={(e) => setForm({ ...form, baseCurrency: e.target.value })}>
                {["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Benchmark">
              <Select value={form.benchmark} onChange={(e) => setForm({ ...form, benchmark: e.target.value })}>
                {BENCHMARK_OPTIONS.map((b) => (
                  <option key={b.symbol} value={b.symbol}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex items-center justify-between pt-1">
            {showEdit ? (
              <Button variant="danger" size="sm" onClick={deletePortfolio}>
                <Trash2 size={13} /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => (showNew ? setShowNew(false) : setShowEdit(false))}>
                Cancel
              </Button>
              <Button onClick={showNew ? createPortfolio : updatePortfolio} loading={loading} disabled={!form.name.trim()}>
                {showNew ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
