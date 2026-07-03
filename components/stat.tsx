import { cn, changeColor } from "@/lib/utils";

/** Dashboard stat tile: label, big number, optional delta line. */
export function Stat({
  label,
  value,
  delta,
  deltaValue,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  /** formatted delta string, colored by deltaValue sign */
  delta?: string;
  deltaValue?: number | null;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-stroke bg-surface/80 p-5", className)}>
      <p className="text-xs font-medium text-ink-dim">{label}</p>
      <p className="tnum mt-1.5 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {delta && (
        <p className={cn("tnum mt-1 text-xs font-medium", changeColor(deltaValue))}>{delta}</p>
      )}
      {hint && <p className="mt-1 text-[11px] text-ink-dim">{hint}</p>}
    </div>
  );
}

/** Compact key-value row used in fact sheets. */
export function FactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stroke py-2.5 text-sm last:border-0">
      <span className="text-ink-dim">{label}</span>
      <span className="tnum text-right font-medium text-ink">{children}</span>
    </div>
  );
}
