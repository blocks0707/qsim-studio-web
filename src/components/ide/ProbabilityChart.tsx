"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  counts: Record<string, number>;
}

export function ProbabilityChart({ counts }: Props) {
  const totalShots = Object.values(counts).reduce((a, b) => a + b, 0);
  const data = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([state, count]) => ({
      state: `|${state}⟩`,
      probability: count / totalShots,
    }));

  const colors = data.map((_, i) => {
    const t = data.length > 1 ? i / (data.length - 1) : 0;
    const r = Math.round(78 + t * (86 - 78));
    const g = Math.round(201 + t * (156 - 201));
    const b = Math.round(176 + t * (214 - 176));
    return `rgb(${r},${g},${b})`;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <defs>
          {data.map((_, i) => (
            <linearGradient key={i} id={`probGrad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[i]} stopOpacity={1} />
              <stop offset="100%" stopColor={colors[i]} stopOpacity={0.5} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="state"
          tick={{ fill: "#ccc", fontSize: 11, fontFamily: "monospace" }}
          axisLine={{ stroke: "#555" }}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fill: "#ccc", fontSize: 11 }}
          axisLine={{ stroke: "#555" }}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
        />
        <Tooltip
          contentStyle={{ background: "#1e1e2e", border: "1px solid #555", borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: "#ccc" }}
          formatter={(value: number) => [`${(value * 100).toFixed(4)}%`, "Probability"]}
        />
        <Bar dataKey="probability" radius={[4, 4, 0, 0]} label={{ position: "top", fill: "#999", fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(1)}%` }}>
          {data.map((_, i) => (
            <Cell key={i} fill={`url(#probGrad${i})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
