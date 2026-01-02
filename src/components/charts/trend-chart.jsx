"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function TrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
        <XAxis 
          dataKey="date" 
          hide 
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          domain={[0, 100]} 
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
          width={30}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v) => [`${v}%`, "Completion"]}
          labelFormatter={(l) => l}
          contentStyle={{ 
            fontSize: 12, 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          itemStyle={{ color: '#22c55e' }}
        />
        <Area 
          type="monotone" 
          dataKey="pct" 
          stroke="#22c55e" 
          strokeWidth={2}
          fill="url(#colorPct)"
          dot={false}
          activeDot={{ r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
