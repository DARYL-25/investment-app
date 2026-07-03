"use client";

// Symbol chips + catalog autocomplete for the ETF comparison tool.
// Selection is stored in the URL (?symbols=VOO,SPY) → server renders the rest.

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ComparePicker({
  selected,
  catalog,
}: {
  selected: string[];
  catalog: { symbol: string; name: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return catalog
      .filter(
        (e) =>
          !selected.includes(e.symbol) &&
          (e.symbol.toLowerCase().includes(q) || e.name.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [query, catalog, selected]);

  const update = (symbols: string[]) => {
    router.push(`/etfs/compare?symbols=${symbols.join(",")}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent-soft/50 px-3 py-1.5 text-xs font-semibold text-indigo-200"
        >
          {s}
          <button
            onClick={() => update(selected.filter((x) => x !== s))}
            className="rounded p-0.5 hover:bg-raised/80"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      {selected.length < 4 && (
        <div className="relative">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-xl border border-dashed border-stroke-strong px-3 py-1.5",
              open && "border-accent/50"
            )}
          >
            <Plus size={12} className="text-ink-dim" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 180)}
              placeholder="Add ETF…"
              className="w-24 bg-transparent text-xs text-ink placeholder:text-ink-dim focus:outline-none"
            />
          </div>
          {open && matches.length > 0 && (
            <ul className="absolute z-30 mt-1 w-72 overflow-hidden rounded-xl border border-stroke-strong bg-overlay shadow-pop">
              {matches.map((m) => (
                <li key={m.symbol}>
                  <button
                    onMouseDown={() => {
                      update([...selected, m.symbol]);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-raised"
                  >
                    <span className="w-14 shrink-0 font-semibold text-ink">{m.symbol}</span>
                    <span className="truncate text-ink-dim">{m.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
