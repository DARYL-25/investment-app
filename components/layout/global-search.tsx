"use client";

// Global ticker/company search with keyboard navigation.
// Routes stocks to /stocks/[symbol] and known ETFs to /etfs/[symbol].

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Layers } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.data ?? []);
        setActive(0);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const go = useCallback(
    (r: SearchResult) => {
      setOpen(false);
      setQuery("");
      const path = r.type === "ETF" ? `/etfs/${encodeURIComponent(r.symbol)}` : `/stocks/${encodeURIComponent(r.symbol)}`;
      router.push(path);
    },
    [router]
  );

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              go(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search stocks, ETFs…  (⌘K)"
          className="h-9 w-full rounded-xl border border-stroke-strong bg-raised pl-9 pr-4 text-[13px] text-ink placeholder:text-ink-dim focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>

      {open && (results.length > 0 || loading) && (
        <div className="absolute top-11 z-50 w-full overflow-hidden rounded-xl border border-stroke-strong bg-overlay shadow-pop">
          {loading && results.length === 0 ? (
            <div className="px-4 py-3 text-xs text-ink-dim">Searching…</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r, i) => (
                <li key={`${r.symbol}-${i}`}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3.5 py-2.5 text-left",
                      i === active && "bg-raised"
                    )}
                  >
                    {r.type === "ETF" ? (
                      <Layers size={14} className="shrink-0 text-indigo-300" />
                    ) : (
                      <TrendingUp size={14} className="shrink-0 text-gain" />
                    )}
                    <span className="w-16 shrink-0 text-[13px] font-semibold text-ink">{r.symbol}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-mid">{r.name}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-ink-dim">
                      {r.exchange}
                    </span>
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
