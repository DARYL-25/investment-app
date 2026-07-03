"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const seed = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/demo", { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error ?? "Could not load demo data");
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={seed} loading={loading} size="lg">
        <Sparkles size={16} />
        Load demo portfolio
      </Button>
      {error && <p className="text-xs text-loss">{error}</p>}
    </div>
  );
}
