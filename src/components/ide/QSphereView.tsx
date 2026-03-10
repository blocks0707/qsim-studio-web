"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";

interface QSphereViewProps {
  counts: Record<string, number>;
  statevector?: [number, number][];
}

function hammingWeight(s: string): number {
  return s.split("").filter((c) => c === "1").length;
}

function stateToSphereCoords(
  state: string,
  indexInLayer: number,
  layerSize: number,
  nQubits: number,
): [number, number, number] {
  const hw = hammingWeight(state);
  const phi = Math.PI / 2 - (hw / nQubits) * Math.PI;
  const theta = layerSize === 1 ? 0 : (indexInLayer / layerSize) * 2 * Math.PI;
  const R = 1.8;
  return [
    R * Math.cos(phi) * Math.cos(theta),
    R * Math.sin(phi),
    R * Math.cos(phi) * Math.sin(theta),
  ];
}

function latitudeCircle(phi: number, segments = 64): [number, number, number][] {
  const R = 1.8;
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    points.push([R * Math.cos(phi) * Math.cos(theta), R * Math.sin(phi), R * Math.cos(phi) * Math.sin(theta)]);
  }
  return points;
}

function longitudeCircle(theta: number, segments = 64): [number, number, number][] {
  const R = 1.8;
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const phi = (i / segments) * 2 * Math.PI - Math.PI;
    points.push([R * Math.cos(phi) * Math.cos(theta), R * Math.sin(phi), R * Math.cos(phi) * Math.sin(theta)]);
  }
  return points;
}

function RotatingGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.15;
  });
  return <group ref={ref}>{children}</group>;
}

function phaseColor(phase: number): string {
  const hue = ((phase / (2 * Math.PI)) * 360 + 360) % 360;
  return `hsl(${hue}, 80%, 55%)`;
}

function probColor(prob: number, maxProb: number): string {
  const t = maxProb > 0 ? prob / maxProb : 0;
  const r = Math.round(100 + t * 155);
  const g = Math.round(180 - t * 60);
  const b = Math.round(100 - t * 60);
  return `rgb(${r},${g},${b})`;
}

export default function QSphereView({ counts, statevector }: QSphereViewProps) {
  const data = useMemo(() => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return { states: [], nQubits: 0, maxProb: 0, hasStatevector: false };

    const nQubits = Object.keys(counts)[0]?.length || 0;
    const hasStatevector = !!statevector && statevector.length === (1 << nQubits);

    const layers: Map<number, { state: string; prob: number; phase: number }[]> = new Map();
    for (const [state, count] of Object.entries(counts)) {
      const hw = hammingWeight(state);
      if (!layers.has(hw)) layers.set(hw, []);

      let phase = 0;
      if (hasStatevector) {
        const idx = parseInt(state, 2);
        const [re, im] = statevector![idx];
        phase = Math.atan2(im, re);
      }

      layers.get(hw)!.push({ state, prob: count / total, phase });
    }

    const maxProb = Math.max(...Object.values(counts).map((c) => c / total));

    const states: { state: string; prob: number; phase: number; pos: [number, number, number] }[] = [];
    for (const [, items] of layers) {
      items.sort((a, b) => a.state.localeCompare(b.state));
      items.forEach((item, idx) => {
        const pos = stateToSphereCoords(item.state, idx, items.length, nQubits);
        states.push({ ...item, pos });
      });
    }

    return { states, nQubits, maxProb, hasStatevector };
  }, [counts, statevector]);

  if (data.states.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--text-secondary)" }}>
        Run a simulation to see Q-Sphere
      </div>
    );
  }

  const latCircles = useMemo(() => {
    const circles: [number, number, number][][] = [];
    for (let hw = 0; hw <= data.nQubits; hw++) {
      const phi = Math.PI / 2 - (hw / data.nQubits) * Math.PI;
      circles.push(latitudeCircle(phi));
    }
    return circles;
  }, [data.nQubits]);

  return (
    <div className="w-full h-full" style={{ minHeight: 300 }}>
      <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -3, -5]} intensity={0.3} />

        <RotatingGroup>
          {/* Wireframe sphere */}
          <mesh>
            <sphereGeometry args={[1.8, 32, 32]} />
            <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.06} />
          </mesh>

          {/* Latitude circles */}
          {latCircles.map((points, i) => (
            <Line key={`lat-${i}`} points={points} color="#666666" lineWidth={0.5} transparent opacity={0.3} dashed dashSize={0.1} gapSize={0.05} />
          ))}

          {/* Longitude lines */}
          {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((theta, i) => (
            <Line key={`lon-${i}`} points={longitudeCircle(theta)} color="#666666" lineWidth={0.5} transparent opacity={0.2} dashed dashSize={0.1} gapSize={0.05} />
          ))}

          {/* Axis */}
          <Line points={[[0, -2.1, 0], [0, 2.1, 0]]} color="#888888" lineWidth={1} transparent opacity={0.3} />
          <Text position={[0, 2.3, 0]} fontSize={0.15} color="#aaaaaa">|0⟩</Text>
          <Text position={[0, -2.3, 0]} fontSize={0.15} color="#aaaaaa">|1⟩</Text>

          {/* State points */}
          {data.states.map(({ state, prob, phase, pos }) => {
            const radius = 0.08 + prob * 0.35;
            const color = data.hasStatevector ? phaseColor(phase) : probColor(prob, data.maxProb);
            return (
              <group key={state} position={pos}>
                <mesh>
                  <sphereGeometry args={[radius, 16, 16]} />
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.9} />
                </mesh>
                <Text position={[0, -(radius + 0.12), 0]} fontSize={0.1} color="#cccccc" anchorX="center" anchorY="top">
                  |{state}⟩
                </Text>
                <Text position={[0, radius + 0.08, 0]} fontSize={0.08} color="#999999" anchorX="center" anchorY="bottom">
                  {(prob * 100).toFixed(1)}%
                </Text>
              </group>
            );
          })}
        </RotatingGroup>

        <OrbitControls enablePan={false} minDistance={3} maxDistance={8} />
      </Canvas>
    </div>
  );
}
