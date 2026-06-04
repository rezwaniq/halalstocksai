'use client';

import { useEffect, useRef } from 'react';

const S = 288;
const H = S / 2;
const DURATION = 28000; // ms per cycle

/* ── Content ── */

const STOCK_FACES: string[][][] = [
  [['AAPL', 'MSFT', 'AMZN'], ['GOOGL', 'TSLA', 'NVDA'], ['META', 'AMD', 'V']],
  [['JPM', 'JNJ', 'WMT'],   ['XOM', 'BAC', 'PG'],      ['MA', 'NFLX', 'ADBE']],
  [['CRM', 'ORCL', 'CSCO'], ['IBM', 'QCOM', 'TXN'],    ['AVGO', 'INTC', 'MU']],
];

type CLabel = 'Compliant' | 'Non-Compliant' | 'Questionable';

const COMPLIANCE_FACES: CLabel[][][] = [
  [
    ['Compliant', 'Non-Compliant', 'Questionable'],
    ['Compliant', 'Compliant', 'Non-Compliant'],
    ['Questionable', 'Compliant', 'Compliant'],
  ],
  [
    ['Questionable', 'Compliant', 'Non-Compliant'],
    ['Compliant', 'Questionable', 'Compliant'],
    ['Compliant', 'Non-Compliant', 'Questionable'],
  ],
  [
    ['Non-Compliant', 'Compliant', 'Compliant'],
    ['Questionable', 'Non-Compliant', 'Compliant'],
    ['Compliant', 'Questionable', 'Compliant'],
  ],
];

const LABEL_COLORS: Record<CLabel, string> = {
  'Compliant':     '#4ade80',
  'Non-Compliant': '#f87171',
  'Questionable':  '#fbbf24',
};

/* ── Face definitions ── */

const FACES = [
  { transform: `translateZ(${H}px)`,                type: 'stock',      idx: 0 },
  { transform: `rotateY(90deg) translateZ(${H}px)`,  type: 'stock',      idx: 1 },
  { transform: `rotateX(90deg) translateZ(${H}px)`,  type: 'stock',      idx: 2 },
  { transform: `rotateY(180deg) translateZ(${H}px)`, type: 'compliance', idx: 0 },
  { transform: `rotateY(-90deg) translateZ(${H}px)`, type: 'compliance', idx: 1 },
  { transform: `rotateX(-90deg) translateZ(${H}px)`, type: 'compliance', idx: 2 },
] as const;

// Face centers in cube-local space (used to compute screen-Z for z-index sorting)
const FACE_CENTERS: [number, number, number][] = [
  [0, 0, H],    // front  (stock 0)
  [H, 0, 0],    // right  (stock 1)
  [0, -H, 0],   // top    (stock 2)
  [0, 0, -H],   // back   (compliance 0)
  [-H, 0, 0],   // left   (compliance 1)
  [0, H, 0],    // bottom (compliance 2)
];

/* ── Animation keyframes (mirror of the CSS keyframes, now in JS) ── */

const KF = [
  { t: 0.00, rx: 28, ry:   0, rz:  0 },
  { t: 0.11, rx: 26, ry:  44, rz:  0 },
  { t: 0.16, rx: 34, ry: 134, rz:  0 },
  { t: 0.24, rx: 34, ry: 134, rz:  0 }, // hold
  { t: 0.36, rx: 28, ry: 192, rz:  3 },
  { t: 0.40, rx: 52, ry: 206, rz:  0 },
  { t: 0.48, rx: 52, ry: 206, rz:  0 }, // hold
  { t: 0.60, rx: 26, ry: 278, rz: -2 },
  { t: 0.64, rx: 20, ry: 318, rz:-14 },
  { t: 0.72, rx: 20, ry: 318, rz:-14 }, // hold
  { t: 1.00, rx: 28, ry: 360, rz:  0 },
];

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function getRotation(p: number): { rx: number; ry: number; rz: number } {
  let i = KF.length - 2;
  for (let k = 0; k < KF.length - 1; k++) {
    if (p < KF[k + 1].t) { i = k; break; }
  }
  const a = KF[i], b = KF[i + 1];
  if (a.t === b.t) return { rx: a.rx, ry: a.ry, rz: a.rz };
  const local = (p - a.t) / (b.t - a.t);
  // Short segments (<6% of cycle) are twists → ease-out; longer are drifts → ease-in-out
  const ease = (b.t - a.t) < 0.06 ? easeOut(local) : easeInOut(local);
  return {
    rx: a.rx + (b.rx - a.rx) * ease,
    ry: a.ry + (b.ry - a.ry) * ease,
    rz: a.rz + (b.rz - a.rz) * ease,
  };
}

// Screen Z of a cube-local point after rotateX(rx°) rotateY(ry°)
function screenZ(x: number, y: number, z: number, rxDeg: number, ryDeg: number): number {
  const rx = rxDeg * Math.PI / 180;
  const ry = ryDeg * Math.PI / 180;
  const zY = -x * Math.sin(ry) + z * Math.cos(ry); // after rotateY
  return y * Math.sin(rx) + zY * Math.cos(rx);      // after rotateX → final Z
}

/* ── Sub-components ── */

const GAP  = 4;
const CELL = (S - GAP * 4) / 3;

function StockFace({ grid }: { grid: string[][] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(3, ${CELL}px)`,
      gridTemplateRows:    `repeat(3, ${CELL}px)`,
      gap: `${GAP}px`, padding: `${GAP}px`,
      width: '100%', height: '100%', boxSizing: 'border-box',
    }}>
      {grid.flat().map((sym, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(145deg, rgba(30,74,156,0.85) 0%, rgba(15,42,100,0.95) 100%)',
          border: '1px solid rgba(147,197,253,0.22)',
          borderRadius: '6px',
          color: '#bfdbfe',
          fontSize: sym.length > 4 ? '9px' : '11px',
          fontWeight: 800,
          fontFamily: '"Geist Mono", "Courier New", monospace',
          letterSpacing: '0.06em',
          textShadow: '0 0 8px rgba(147,197,253,0.6)',
          boxShadow: 'inset 0 1px 0 rgba(147,197,253,0.12), inset 0 -1px 0 rgba(0,0,0,0.2)',
        }}>{sym}</div>
      ))}
    </div>
  );
}

function ComplianceFace({ grid }: { grid: CLabel[][] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(3, ${CELL}px)`,
      gridTemplateRows:    `repeat(3, ${CELL}px)`,
      gap: `${GAP}px`, padding: `${GAP}px`,
      width: '100%', height: '100%', boxSizing: 'border-box',
    }}>
      {grid.flat().map((label, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(145deg, rgba(10,28,70,0.92) 0%, rgba(7,18,50,0.97) 100%)',
          border: '1px solid rgba(96,165,250,0.18)',
          borderRadius: '6px',
          color: LABEL_COLORS[label],
          fontSize: label === 'Non-Compliant' ? '9px' : '10.5px',
          fontWeight: 800,
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          lineHeight: 1.2,
          padding: '2px',
          textShadow: `0 0 8px ${LABEL_COLORS[label]}cc, 0 0 2px ${LABEL_COLORS[label]}`,
          boxShadow: 'inset 0 1px 0 rgba(96,165,250,0.08), inset 0 -1px 0 rgba(0,0,0,0.25)',
        }}>{label}</div>
      ))}
    </div>
  );
}

const FACE_BG: Record<'stock' | 'compliance', string> = {
  stock:      'linear-gradient(135deg, #1a3f82 0%, #0e2554 60%, #091a40 100%)',
  compliance: 'linear-gradient(135deg, #0a1e52 0%, #071540 60%, #040e2e 100%)',
};

/* ── Main component ── */

export default function RubikCube() {
  const cubeRef  = useRef<HTMLDivElement>(null);
  const faceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let rafId: number;

    const frame = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const progress = ((now - startRef.current) % DURATION) / DURATION;
      const { rx, ry, rz } = getRotation(progress);

      // Drive the cube transform from JS (no CSS animation needed)
      const cube = cubeRef.current;
      if (cube) {
        cube.style.transform =
          `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
      }

      // Sort faces by screen-Z and assign z-index so closest face is always on top
      const depths = FACE_CENTERS.map(([x, y, z]) => screenZ(x, y, z, rx, ry));
      depths
        .map((z, i) => ({ z, i }))
        .sort((a, b) => a.z - b.z)          // ascending: farthest → lowest rank
        .forEach(({ i }, rank) => {
          const el = faceRefs.current[i];
          if (el) el.style.zIndex = String(rank);
        });

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const sceneSize = S + 100;

  return (
    <div style={{
      width: sceneSize, height: sceneSize,
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Glow — sibling element, never touches the 3D context */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: S * 0.9, height: S * 0.9,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.28) 0%, rgba(37,99,235,0.10) 50%, transparent 70%)',
          filter: 'blur(28px)',
        }} />
      </div>

      {/* Perspective wrapper */}
      <div style={{ perspective: '850px', perspectiveOrigin: '50% 50%' }}>
        <div
          ref={cubeRef}
          style={{
            position: 'relative',
            width: S, height: S,
            transformStyle: 'preserve-3d',
          }}
        >
          {FACES.map((face, i) => (
            <div
              key={i}
              ref={el => { faceRefs.current[i] = el; }}
              style={{
                position: 'absolute',
                width: S, height: S,
                transform: face.transform,
                background: FACE_BG[face.type],
                borderRadius: '10px',
                overflow: 'hidden', // intentionally breaks preserve-3d Z-sort; zIndex managed by rAF loop
                boxShadow: `
                  inset 0 0 0 1px rgba(147,197,253,0.18),
                  inset 0 2px 6px rgba(147,197,253,0.08),
                  0 0 0 1px rgba(0,0,0,0.4)
                `,
              }}
            >
              {face.type === 'stock'
                ? <StockFace grid={STOCK_FACES[face.idx]} />
                : <ComplianceFace grid={COMPLIANCE_FACES[face.idx]} />
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
