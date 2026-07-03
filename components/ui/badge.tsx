import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "gain" | "loss" | "warn";

const tones: Record<Tone, string> = {
  neutral: "bg-raised text-ink-mid border-stroke-strong",
  accent: "bg-accent-soft/60 text-indigo-300 border-accent/30",
  gain: "bg-gain/10 text-gain border-gain/25",
  loss: "bg-loss/10 text-loss border-loss/25",
  warn: "bg-warn/10 text-warn border-warn/25",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Colored percent-change pill, the finance staple. */
export function ChangeBadge({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value == null || !isFinite(value)) return <Badge className={className}>—</Badge>;
  const tone: Tone = value > 0.0001 ? "gain" : value < -0.0001 ? "loss" : "neutral";
  const arrow = value > 0.0001 ? "▲" : value < -0.0001 ? "▼" : "";
  return (
    <Badge tone={tone} className={cn("tnum", className)}>
      {arrow} {Math.abs(value * 100).toFixed(2)}%
    </Badge>
  );
}
