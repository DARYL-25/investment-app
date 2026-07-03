"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  CandlestickChart,
  Layers,
  Newspaper,
  Star,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/stocks", label: "Stocks", icon: CandlestickChart },
  { href: "/etfs", label: "ETFs", icon: Layers },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/watchlists", label: "Watchlists", icon: Star },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-stroke bg-surface/60 backdrop-blur-xl lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Meridian</span>
        </Link>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all",
                  active
                    ? "bg-accent-soft/50 text-ink shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.25)]"
                    : "text-ink-dim hover:bg-raised hover:text-ink-mid"
                )}
              >
                <Icon size={16} className={active ? "text-indigo-300" : ""} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stroke p-3">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold uppercase text-indigo-300">
              {userName.slice(0, 1)}
            </div>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-mid">{userName}</span>
            <button
              onClick={logout}
              title="Sign out"
              className="rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-raised hover:text-loss"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-stroke bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                active ? "text-indigo-300" : "text-ink-dim"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="url(#lg)" />
      <path
        d="M8 21.5 13 13l4 5.5L24 9.5"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7b79f7" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
    </svg>
  );
}
