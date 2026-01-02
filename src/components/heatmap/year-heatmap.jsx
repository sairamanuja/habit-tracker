"use client";

import { useMemo } from "react";
import { formatISO, subDays } from "date-fns";

function intensityClass(rate) {
  if (!rate || rate <= 0) return "bg-muted";
  if (rate < 0.25) return "bg-primary/20";
  if (rate < 0.5) return "bg-primary/40";
  if (rate < 0.75) return "bg-primary/60";
  return "bg-primary/80";
}

export default function YearHeatmap({ daily }) {
  const map = useMemo(() => {
    const m = new Map();
    for (const d of daily) m.set(d.date, d.completionRate);
    return m;
  }, [daily]);

  const days = useMemo(() => {
    const out = [];
    for (let i = 364; i >= 0; i--) {
      const dt = subDays(new Date(), i);
      const ymd = formatISO(dt, { representation: "date" });
      out.push({
        ymd,
        dow: dt.getDay(),
        rate: map.get(ymd) || 0,
      });
    }
    return out;
  }, [map]);

  // GitHub-like grid: rows = days of week, columns flow by week.
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-rows-7 grid-flow-col gap-1">
        {days.map((d) => (
          <div
            key={d.ymd}
            className={`h-3 w-3 rounded-sm ${intensityClass(d.rate)}`}
            style={{ gridRowStart: d.dow + 1 }}
            title={`${d.ymd}: ${Math.round(d.rate * 100)}%`}
          />
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Less <span className="inline-block h-3 w-3 align-middle rounded-sm bg-muted" />{" "}
        <span className="inline-block h-3 w-3 align-middle rounded-sm bg-primary/20" />{" "}
        <span className="inline-block h-3 w-3 align-middle rounded-sm bg-primary/40" />{" "}
        <span className="inline-block h-3 w-3 align-middle rounded-sm bg-primary/60" />{" "}
        <span className="inline-block h-3 w-3 align-middle rounded-sm bg-primary/80" /> More
      </div>
    </div>
  );
}
