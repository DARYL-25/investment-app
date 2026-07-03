"use client";

// Add-transaction dialog with live ticker autocomplete.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import type { SearchResult, TxType } from "@/lib/types";

const TX_TYPES: { value: TxType; label: string }[] = [
  { value: "BUY", label: "Buy" },
  { value: "SELL", label: "Sell" },
  { value: "DIVIDEND", label: "Dividend" },
  { value: "DEPOSIT", label: "Deposit" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
  { value: "FEE", label: "Fee" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"];

export function TxDialog({
  portfolioId,
  open,
  onClose,
}: {
  portfolioId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<TxType>("BUY");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("STOCK");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [fees, setFees] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSug, setShowSug] = useState(false);

  const needsInstrument = ["BUY", "SELL", "DIVIDEND"].includes(type);
  const needsQtyPrice = ["BUY", "SELL"].includes(type);
  const needsAmount = ["DIVIDEND", "DEPOSIT", "WITHDRAWAL", "FEE"].includes(type);

  useEffect(() => {
    if (!symbol.trim() || !showSug) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(symbol)}`);
      const json = await res.json();
      setSuggestions((json.data ?? []).slice(0, 6));
    }, 250);
    return () => clearTimeout(t);
  }, [symbol, showSug]);

  const submit = async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/portfolios/${portfolioId}/transactions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        assetType,
        symbol: needsInstrument ? symbol : "",
        name: needsInstrument ? name : "",
        quantity: needsQtyPrice ? Number(quantity) || 0 : 0,
        price: needsQtyPrice ? Number(price) || 0 : 0,
        amount: needsAmount ? Number(amount) || 0 : 0,
        fees: Number(fees) || 0,
        currency,
        date: new Date(date).toISOString(),
        note,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error ?? "Could not save transaction");
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add transaction">
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as TxType)}>
              {TX_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        {needsInstrument && (
          <div className="grid grid-cols-3 gap-3">
            <div className="relative col-span-2">
              <Field label="Symbol">
                <Input
                  value={symbol}
                  onChange={(e) => {
                    setSymbol(e.target.value.toUpperCase());
                    setShowSug(true);
                  }}
                  onBlur={() => setTimeout(() => setShowSug(false), 200)}
                  placeholder="AAPL, VOO, CSPX.L…"
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
                          setName(s.name);
                          setAssetType(s.type === "ETF" ? "ETF" : "STOCK");
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
            <Field label="Asset type">
              <Select value={assetType} onChange={(e) => setAssetType(e.target.value)}>
                <option value="STOCK">Stock</option>
                <option value="ETF">ETF</option>
              </Select>
            </Field>
          </div>
        )}

        {needsQtyPrice && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Quantity">
              <Input type="number" step="any" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="10" />
            </Field>
            <Field label="Price / share">
              <Input type="number" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150.00" />
            </Field>
            <Field label="Fees">
              <Input type="number" step="any" min="0" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0" />
            </Field>
          </div>
        )}

        {needsAmount && (
          <Field label={type === "DIVIDEND" ? "Dividend amount" : "Amount"}>
            <Input type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="" />
          </Field>
        </div>

        {needsQtyPrice && quantity && price && (
          <p className="tnum text-xs text-ink-dim">
            Total: {(Number(quantity) * Number(price) + Number(fees || 0)).toLocaleString("en-US", { maximumFractionDigits: 2 })} {currency}
          </p>
        )}
        {error && <p className="text-xs text-loss">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={loading}>
            Save transaction
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
