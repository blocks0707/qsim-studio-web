"use client";

interface Props {
  counts: Record<string, number>;
}

export function StateCityView({ counts }: Props) {
  const totalShots = Object.values(counts).reduce((a, b) => a + b, 0);
  const entries = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([state, count]) => ({ state, probability: count / totalShots }));

  const maxProb = Math.max(...entries.map((e) => e.probability), 0.001);
  const n = entries.length;

  // Isometric projection helpers
  const isoX = (col: number, row: number) => (col - row) * 40;
  const isoY = (col: number, row: number) => (col + row) * 20;

  // Layout: single row of bars
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);

  const barWidth = 28;
  const maxBarHeight = 150;

  // Calculate bounding box for centering
  const positions = entries.map((_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { col, row };
  });

  const allX = positions.map((p) => isoX(p.col, p.row));
  const allY = positions.map((p) => isoY(p.col, p.row));
  const minX = Math.min(...allX) - barWidth;
  const maxX = Math.max(...allX) + barWidth * 2;
  const minY = Math.min(...allY) - maxBarHeight - 30;
  const maxY = Math.max(...allY) + 40;

  const viewW = maxX - minX + 40;
  const viewH = maxY - minY + 40;
  const offX = -minX + 20;
  const offY = -minY + 20;

  // Color gradient based on probability
  const barColor = (p: number) => {
    const t = p / maxProb;
    const r = Math.round(78 + t * (177 - 78));
    const g = Math.round(201 - t * 40);
    const b = Math.round(176 + t * (245 - 176));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} width="100%" height="100%" style={{ maxHeight: "100%" }}>
      {entries.map((entry, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = offX + isoX(col, row);
        const by = offY + isoY(col, row);
        const h = (entry.probability / maxProb) * maxBarHeight;
        const color = barColor(entry.probability);

        // Isometric bar: front face, top face, right face
        const w = barWidth;
        const d = w * 0.5; // depth

        // Front face
        const front = `M${bx},${by} L${bx},${by - h} L${bx + w},${by - h} L${bx + w},${by} Z`;
        // Top face
        const top = `M${bx},${by - h} L${bx + d},${by - h - d * 0.6} L${bx + w + d},${by - h - d * 0.6} L${bx + w},${by - h} Z`;
        // Right face
        const right = `M${bx + w},${by} L${bx + w},${by - h} L${bx + w + d},${by - h - d * 0.6} L${bx + w + d},${by - d * 0.6} Z`;

        return (
          <g key={entry.state}>
            {/* Shadow/base */}
            <ellipse cx={bx + w / 2 + d / 2} cy={by + 2} rx={w * 0.4} ry={4} fill="#000" opacity={0.15} />
            {/* Front face */}
            <path d={front} fill={color} opacity={0.9} stroke="var(--border, #444)" strokeWidth={0.5}>
              <title>|{entry.state}⟩ — {(entry.probability * 100).toFixed(2)}%</title>
            </path>
            {/* Top face */}
            <path d={top} fill={color} opacity={1} stroke="var(--border, #444)" strokeWidth={0.5} filter="brightness(1.2)">
              <title>|{entry.state}⟩ — {(entry.probability * 100).toFixed(2)}%</title>
            </path>
            {/* Right face */}
            <path d={right} fill={color} opacity={0.7} stroke="var(--border, #444)" strokeWidth={0.5}>
              <title>|{entry.state}⟩ — {(entry.probability * 100).toFixed(2)}%</title>
            </path>
            {/* Label */}
            <text x={bx + w / 2} y={by + 16} textAnchor="middle" fill="var(--text-secondary, #999)" fontSize={8} fontFamily="monospace">
              |{entry.state}⟩
            </text>
            {/* Probability label on top */}
            {h > 15 && (
              <text x={bx + w / 2 + d / 2} y={by - h - d * 0.6 - 4} textAnchor="middle" fill="var(--text-secondary, #999)" fontSize={8}>
                {(entry.probability * 100).toFixed(1)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
