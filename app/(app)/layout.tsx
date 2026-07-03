import { redirect } from "next/navigation";
import { getUser } from "@/lib/server/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { GlobalSearch } from "@/components/layout/global-search";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <Sidebar userName={user.name} />
      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-stroke bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
          <GlobalSearch />
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
