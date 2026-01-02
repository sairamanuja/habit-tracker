"use client";

import { useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { format } from "date-fns";

import ThemeToggle from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function AppHeader() {
  const { data } = useSession();
  const today = useMemo(() => format(new Date(), "PPP"), []);

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <div className="text-sm text-muted-foreground">{today}</div>
          <div className="text-lg font-semibold">Dashboard</div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {data?.user ? (
            <Button variant="secondary" onClick={() => signOut({ callbackUrl: "/signin" })}>
              Sign out
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
