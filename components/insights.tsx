import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import type { HealthScore, Insight } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SEVERITY = {
  critical: { icon: ShieldAlert, cls: "text-loss", border: "border-loss/25" },
  warning: { icon: AlertTriangle, cls: "text-warn", border: "border-warn/25" },
  info: { icon: Info, cls: "text-indigo-300", border: "border-accent/25" },
  good: { icon: CheckCircle2, cls: "text-gain", border: "border-gain/25" },
} as const;

export function InsightCard({ insight }: { insight: Insight }) {
  const s = SEVERITY[insight.severity];
  const Icon = s.icon;
  return (
    <div className={cn("rounded-xl border bg-raised/40 p-4", s.border)}>
      <div className="flex items-start gap-3">
        <Icon size={16} className={cn("mt-0.5 shrink-0", s.cls)} />
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-semibold text-ink">{insight.title}</p>
            {insight.metric && (
              <span className={cn("tnum shrink-0 text-sm font-bold", s.cls)}>{insight.metric}</span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-mid">{insight.body}</p>
        </div>
      </div>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "#2fc98c";
  if (score >= 60) return "#e8b452";
  return "#f26d6d";
}

export function HealthScoreCard({ health, compact }: { health: HealthScore; compact?: boolean }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const filled = (health.score / 100) * c;
  const color = scoreColor(health.score);

  return (
    <Card>
      <CardHeader title="Portfolio health" subtitle="Composite quality score" />
      <CardBody className="flex items-center gap-5">
        <div className="relative h-[110px] w-[110px] shrink-0">
          <svg viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--raised))" strokeWidth="9" />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${c}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tnum text-2xl font-bold text-ink">{health.score}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
              Grade {health.grade}
            </span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {(compact ? health.components.slice(0, 4) : health.components).map((comp) => (
            <li key={comp.label} className="flex items-center gap-2 text-[11px]">
              <span className="w-28 shrink-0 truncate text-ink-dim">{comp.label}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${comp.score}%`, background: scoreColor(comp.score) }}
                />
              </div>
              <span className="tnum w-6 shrink-0 text-right font-medium text-ink-mid">{comp.score}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
