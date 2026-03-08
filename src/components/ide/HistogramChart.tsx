"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  counts: Record<string, number>;
}

export function HistogramChart({ counts }: Props) {
  const totalShots = Object.values(counts).reduce((a, b) => a + b, 0);
  const data = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([state, count]) => ({
      state: `|${state}⟩`,
      count,
      pct: ((count / totalShots) * 100).toFixed(1) + "%",
    }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="state"
          tick={{ fill: "#ccc", fontSize: 11, fontFamily: "monospace" }}
          axisLine={{ stroke: "#555" }}
        />
        <YAxis
          tick={{ fill: "#ccc", fontSize: 11 }}
          axisLine={{ stroke: "#555" }}
        />
        <Tooltip
          contentStyle={{ background: "#1e1e2e", border: "1px solid #555", borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: "#ccc" }}
          formatter={(value) => [
            `${value} (${((Number(value) / totalShots) * 100).toFixed(1)}%)`,
            "Count",
          ]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} label={{ position: "top", fill: "#999", fontSize: 10 }}>
          {data.map((_, i) => (
            <Cell key={i} fill="#4ec9b0" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
