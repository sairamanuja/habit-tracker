"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export default function TrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <XAxis dataKey="date" hide />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} width={30} />
        <Tooltip
          formatter={(v) => [`${v}%`, "Completion"]}
          labelFormatter={(l) => l}
          contentStyle={{ fontSize: 12 }}
        />
        <Line type="monotone" dataKey="pct" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
