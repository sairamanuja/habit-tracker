"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }) {
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold">Something went wrong</div>
      <div className="text-sm text-muted-foreground">{error?.message || "Unknown error"}</div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
