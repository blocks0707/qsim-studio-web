"use client";

interface Props {
  counts: Record<string, number>;
}

function hammingWeight(s: string): number {
  let w = 0;
  for (const c of s) if (c === "1") w++;
  return w;
}

export function QSphereView({ counts }: Props) {
  const totalShots = Object.values(counts).reduce((a, b) => a + b, 0);
  const entries = Object.entries(counts).map(([state, count]) => ({
    state,
    probability: count / totalShots,
    hw: hammingWeight(state),
  }));

  const nQubits = entries[0]?.state.length ?? 0;
  const maxHW = nQubits;

  // SVG dimensions
  const cx = 200, cy = 200, R = 160;

  // Group by hamming weight
  const groups: Record<number, typeof entries> = {};
  for (const e of entries) {
    (groups[e.hw] ??= []).push(e);
  }

  // Map hamming weight to latitude (0 = north pole, maxHW = south pole)
  // y position: from top (-R) to bottom (+R)
  const dots: { x: number; y: number; r: number; state: string; prob: number }[] = [];
  const maxProb = Math.max(...entries.map((e) => e.probability), 0.001);

  for (const [hwStr, group] of Object.entries(groups)) {
    const hw = Number(hwStr);
    // theta: 0 (north) to PI (south)
    const theta = maxHW > 0 ? (hw / maxHW) * Math.PI : Math.PI / 2;
    const latY = -Math.cos(theta) * R;
    const latR = Math.sin(theta) * R; // radius of latitude circle

    group.sort((a, b) => a.state.localeCompare(b.state));
    const n = group.length;

    for (let i = 0; i < n; i++) {
      const phi = n > 1 ? (i / n) * 2 * Math.PI : 0;
      const x = cx + (latR > 0 ? Math.cos(phi) * latR : 0);
      const y = cy + latY + (latR > 0 ? Math.sin(phi) * latR * 0.3 : 0); // 0.3 for perspective squish
      const dotR = 4 + (group[i].probability / maxProb) * 16;
      dots.push({ x, y, r: dotR, state: group[i].state, prob: group[i].probability });
    }
  }

  // Color based on probability
  const probColor = (p: number) => {
    const t = p / maxProb;
    const r = Math.round(78 + t * (255 - 78));
    const g = Math.round(201 - t * 80);
    const b = Math.round(176 + t * (80 - 176));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <svg viewBox="0 0 400 400" width="100%" height="100%" style={{ maxHeight: "100%" }}>
      {/* Sphere outline */}
      <ellipse cx={cx} cy={cy} rx={R} ry={R} fill="none" stroke="var(--border, #444)" strokeWidth={1} opacity={0.5} />
      {/* Latitude lines */}
      {Array.from({ length: maxHW + 1 }, (_, hw) => {
        const theta = maxHW > 0 ? (hw / maxHW) * Math.PI : Math.PI / 2;
        const latY = cy - Math.cos(theta) * R;
        const latR = Math.sin(theta) * R;
        return latR > 2 ? (
          <ellipse key={hw} cx={cx} cy={latY} rx={latR} ry={latR * 0.3} fill="none" stroke="var(--border, #444)" strokeWidth={0.5} opacity={0.3} strokeDasharray="4 4" />
        ) : null;
      })}
      {/* Vertical axis */}
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="var(--border, #444)" strokeWidth={0.5} opacity={0.3} />
      {/* Dots */}
      {dots.map((d) => (
        <g key={d.state}>
          <circle cx={d.x} cy={d.y} r={d.r} fill={probColor(d.prob)} opacity={0.85} stroke="var(--text-primary, #fff)" strokeWidth={0.5}>
            <title>|{d.state}⟩ — {(d.prob * 100).toFixed(2)}%</title>
          </circle>
          {d.r > 8 && (
            <text x={d.x} y={d.y + d.r + 12} textAnchor="middle" fill="var(--text-secondary, #999)" fontSize={9} fontFamily="monospace">
              |{d.state}⟩
            </text>
          )}
        </g>
      ))}
      {/* Pole labels */}
      <text x={cx} y={cy - R - 8} textAnchor="middle" fill="var(--text-secondary, #999)" fontSize={10} fontFamily="monospace">
        |{"0".repeat(nQubits)}⟩
      </text>
      <text x={cx} y={cy + R + 16} textAnchor="middle" fill="var(--text-secondary, #999)" fontSize={10} fontFamily="monospace">
        |{"1".repeat(nQubits)}⟩
      </text>
    </svg>
  );
}
