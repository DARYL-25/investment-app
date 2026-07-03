"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { fmtCurrency, fmtDate, cn } from "@/lib/utils";

interface Tx {
  id: string;
  type: string;
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
  fees: number;
  currency: string;
  date: string | Date;
  note: string;
}

const TYPE_STYLE: Record<string, string> = {
  BUY: "text-gain",
  SELL: "text-loss",
  DIVIDEND: "text-indigo-300",
  DEPOSIT: "text-ink-mid",
  WITHDRAWAL: "text-warn",
  FEE: "text-ink-dim",
};

export function TxTable({ portfolioId, transactions }: { portfolioId: string; transactions: Tx[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (txId: string) => {
    if (!confirm("Delete this transaction?")) return;
    setBusy(txId);
    await fetch(`/api/portfolios/${portfolioId}/transactions/${txId}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  };

  if (transactions.length === 0) {
    return <p className="py-8 text-center text-xs text-ink-dim">No transactions yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-stroke text-[11px] uppercase tracking-wide text-ink-dim">
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">Asset</th>
            <th className="py-2 pr-4 text-right font-medium">Qty</th>
            <th className="py-2 pr-4 text-right font-medium">Price</th>
            <th className="py-2 pr-4 text-right font-medium">Total</th>
            <th className="py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stroke">
          {transactions.map((tx) => {
            const total =
              tx.type === "BUY"
                ? tx.quantity * tx.price + tx.fees
                : tx.type === "SELL"
                  ? tx.quantity * tx.price - tx.fees
                  : tx.amount;
            return (
              <tr key={tx.id} className="group">
                <td className="tnum py-2.5 pr-4 text-ink-mid">{fmtDate(tx.date)}</td>
                <td className={cn("py-2.5 pr-4 font-semibold", TYPE_STYLE[tx.type])}>{tx.type}</td>
                <td className="py-2.5 pr-4">
                  <span className="font-semibold text-ink">{tx.symbol || "—"}</span>
                  {tx.note && <span className="ml-2 text-ink-dim">{tx.note}</span>}
                </td>
                <td className="tnum py-2.5 pr-4 text-right text-ink-mid">
                  {tx.quantity ? tx.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "—"}
                </td>
                <td className="tnum py-2.5 pr-4 text-right text-ink-mid">
                  {tx.price ? fmtCurrency(tx.price, tx.currency) : "—"}
                </td>
                <td className="tnum py-2.5 pr-4 text-right font-medium text-ink">
                  {fmtCurrency(total, tx.currency)}
                </td>
                <td className="py-2.5 text-right">
                  <button
                    onClick={() => remove(tx.id)}
                    disabled={busy === tx.id}
                    className="rounded-md p-1 text-ink-dim opacity-0 transition-all hover:bg-raised hover:text-loss group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
