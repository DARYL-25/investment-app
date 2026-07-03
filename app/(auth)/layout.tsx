import Link from "next/link";
import { Logo } from "@/components/layout/sidebar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-veil flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <Logo size={32} />
        <span className="text-lg font-semibold tracking-tight text-ink">Meridian</span>
      </Link>
      <div className="w-full max-w-sm animate-slide-up">{children}</div>
      <p className="mt-10 text-center text-[11px] leading-relaxed text-ink-dim">
        Market data may be delayed. Nothing here is investment advice.
      </p>
    </div>
  );
}
