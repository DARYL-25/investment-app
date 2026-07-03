import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Briefcase,
  CandlestickChart,
  GitCompareArrows,
  Layers,
  Newspaper,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getUserId } from "@/lib/server/auth";
import { Logo } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Briefcase,
    title: "Portfolio intelligence",
    body: "Multi-portfolio, multi-currency tracking with XIRR, CAGR, Sharpe, drawdown and full exposure analytics — computed from your real transaction history.",
  },
  {
    icon: CandlestickChart,
    title: "Deep stock research",
    body: "Interactive charts, fundamentals, financial statements, analyst estimates, earnings history, insider and institutional activity for every listed company.",
  },
  {
    icon: Layers,
    title: "ETF intelligence",
    body: "A curated US + UCITS catalog with TER, domicile, replication and distribution policy — searchable by strategy, cost and wrapper.",
  },
  {
    icon: GitCompareArrows,
    title: "World-class comparison",
    body: "Put VOO vs SPY vs CSPX side by side: fees, performance, risk, dividend yield and holdings overlap in one view.",
  },
  {
    icon: Sparkles,
    title: "AI-powered insights",
    body: "Concentration, sector, currency and cost analysis in plain language, plus a composite portfolio health score you can act on.",
  },
  {
    icon: Bell,
    title: "Watchlists & alerts",
    body: "Price, valuation, earnings and dividend alerts. Portfolio-aware news from trusted sources, linked to your holdings.",
  },
];

export default async function LandingPage() {
  if (await getUserId()) redirect("/dashboard");

  return (
    <div className="hero-veil min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-[17px] font-semibold tracking-tight text-ink">Meridian</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* hero */}
        <section className="py-20 text-center sm:py-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/40 px-3.5 py-1.5 text-xs font-medium text-indigo-200">
            <Sparkles size={12} />
            Portfolio analytics · ETF intelligence · AI insights
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-6xl">
            Invest with
            <span className="bg-gradient-to-r from-indigo-300 via-indigo-400 to-cyan-300 bg-clip-text text-transparent">
              {" "}
              clarity
            </span>
            .
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-mid sm:text-lg">
            The premium platform for long-term investors: portfolio management, stock research, ETF
            discovery and AI-powered insights — beautifully unified.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg">
                Create free account <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-dim">
            Free forever for personal portfolios · installs on iPhone as a full-screen app
          </p>
        </section>

        {/* features */}
        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-stroke bg-surface/70 p-6 backdrop-blur-sm transition-all hover:border-stroke-strong hover:shadow-pop"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft/60 text-indigo-300">
                <Icon size={18} />
              </div>
              <h3 className="text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">{body}</p>
            </div>
          ))}
        </section>

        {/* trust strip */}
        <section className="mb-20 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-stroke bg-surface/60 px-6 py-5 text-xs text-ink-dim">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-gain" /> Encrypted sessions, your data stays yours
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Newspaper size={13} className="text-indigo-300" /> News from CNBC, MarketWatch & more
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers size={13} className="text-warn" /> US-listed + UCITS ETF coverage
          </span>
        </section>
      </main>

      <footer className="border-t border-stroke py-8 text-center text-[11px] text-ink-dim">
        Meridian · Market data may be delayed · Not investment advice
      </footer>
    </div>
  );
}
