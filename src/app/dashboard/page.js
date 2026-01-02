import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import AppHeader from "@/components/app-header";
import DashboardClient from "./dashboard-client";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/signin");

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-6">
        <DashboardClient />
      </main>
    </div>
  );
}
