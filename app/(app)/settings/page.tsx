import { Check, Smartphone } from "lucide-react";
import { getUser } from "@/lib/server/auth";
import { fmtDate } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ProfileForm, PasswordForm } from "@/components/settings/settings-forms";

export const dynamic = "force-dynamic";

const PREMIUM_FEATURES = [
  "Broker integrations & automatic sync",
  "Tax reports & dividend forecasting",
  "Backtesting & portfolio optimization",
  "Monte Carlo retirement simulation",
  "AI investment assistant",
];

export default async function SettingsPage() {
  const user = (await getUser())!;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Settings" subtitle={user.email} />

      <ProfileForm initialName={user.name} initialCurrency={user.baseCurrency} />
      <PasswordForm />

      <Card>
        <CardHeader
          title="Subscription"
          subtitle={`Member since ${fmtDate(user.createdAt)}`}
          action={<Badge tone={user.plan === "premium" ? "accent" : "neutral"}>{user.plan === "premium" ? "Premium" : "Free plan"}</Badge>}
        />
        <CardBody className="pt-3">
          <p className="text-sm text-ink-mid">
            You&apos;re on the <span className="font-semibold text-ink">free plan</span> — full portfolio
            analytics, ETF intelligence, news, watchlists and alerts included.
          </p>
          <div className="mt-4 rounded-xl border border-accent/25 bg-accent-soft/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
              Premium — coming soon
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-ink-mid">
                  <Check size={12} className="text-indigo-300" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Install on iPhone" action={<Smartphone size={16} className="text-ink-dim" />} />
        <CardBody className="pt-3 text-sm leading-relaxed text-ink-mid">
          Meridian is a full-screen web app. Open it in <span className="font-medium text-ink">Safari</span>,
          tap the <span className="font-medium text-ink">Share</span> button, then{" "}
          <span className="font-medium text-ink">Add to Home Screen</span> — it installs like a native app
          with its own icon, splash screen and standalone window.
        </CardBody>
      </Card>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-ink-dim">
        Market data may be delayed and is provided for information only. Nothing in Meridian is investment advice.
      </p>
    </div>
  );
}
