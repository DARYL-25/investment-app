"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WatchlistButton({
  symbol,
  assetType,
  watchlistId,
  inWatchlist,
}: {
  symbol: string;
  assetType: "STOCK" | "ETF";
  watchlistId: string | null;
  inWatchlist: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(inWatchlist);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!watchlistId) return;
    setLoading(true);
    if (saved) {
      await fetch(`/api/watchlists/${watchlistId}?symbol=${encodeURIComponent(symbol)}`, {
        method: "DELETE",
      });
      setSaved(false);
    } else {
      await fetch(`/api/watchlists/${watchlistId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol, assetType }),
      });
      setSaved(true);
    }
    setLoading(false);
    router.refresh();
  };

  return (
    <Button variant={saved ? "secondary" : "outline"} size="sm" onClick={toggle} loading={loading}>
      <Star size={13} className={cn(saved && "fill-warn text-warn")} />
      {saved ? "Watching" : "Watch"}
    </Button>
  );
}
