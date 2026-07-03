import { requireUserId } from "@/lib/server/auth";
import { evaluateAlerts } from "@/lib/server/alerts";
import { PageHeader } from "@/components/page-header";
import { AlertManager, type AlertRow } from "@/components/alerts/alert-manager";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const userId = await requireUserId();
  const evaluated = await evaluateAlerts(userId);

  const rows: AlertRow[] = evaluated.map((a) => ({
    id: a.id,
    symbol: a.symbol,
    kind: a.kind,
    threshold: a.threshold,
    refPrice: a.refPrice,
    active: a.active,
    triggeredAt: a.triggeredAt ? a.triggeredAt.toISOString() : null,
    currentValue: a.currentValue,
    note: a.note,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Alerts"
        subtitle="Price, valuation, earnings and dividend rules — evaluated live every time you open the app."
      />
      <AlertManager alerts={rows} />
    </div>
  );
}
