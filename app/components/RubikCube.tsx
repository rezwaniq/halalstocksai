'use client';

import { useEffect, useRef } from 'react';

const S        = 288;
const H        = S / 2;
const STRIP_H  = S / 3;
const GAP      = 4;
const CELL     = (S - GAP * 4) / 3;

/* ─── content ───────────────────────────────────────────────── */

const STOCK_FACES: string[][][] = [
  [['AAPL','MSFT','AMZN'], ['GOOGL','TSLA','NVDA'], ['META','AMD','V']],
  [['JPM','JNJ','WMT'],    ['XOM','BAC','PG'],      ['MA','NFLX','ADBE']],
  [['CRM','ORCL','CSCO'],  ['IBM','QCOM','TXN'],    ['AVGO','INTC','MU']],
];

type CLabel = 'Compliant' | 'Non-Compliant' | 'Questionable';

const COMPLIANCE_FACES: CLabel[][][] = [
  [['Compliant','Non-Compliant','Questionable'], ['Compliant','Compliant','Non-Compliant'],    ['Questionable','Compliant','Compliant']],
  [['Questionable','Compliant','Non-Compliant'], ['Compliant','Questionable','Compliant'],     ['Compliant','Non-Compliant','Questionable']],
  [['Non-Compliant','Compliant','Compliant'],    ['Questionable','Non-Compliant','Compliant'], ['Compliant','Questionable','Compliant']],
];

const LABEL_COLOR: Record<CLabel, string> = {
  'Compliant':     '#4ade80',
  'Non-Compliant': '#f87171',
  'Questionable':  '#fbbf24',
};

/* 4 vertical sides of the cube: [angle, type, face-index] */
const SIDES = [
  { angle:   0, type: 'stock'      as const, idx: 0 },
  { angle:  90, type: 'stock'      as const, idx: 1 },
  { angle: 180, type: 'compliance' as const, idx: 0 },
  { angle: -90, type: 'compliance' as const, idx: 1 },
];

/* ─── animation helpers ──────────────────────────────────────── */

function easeInOut(t: number) { return t < 0.5 ? 2*t*t : 1 - (-2*t+2)**2/2; }
function easeOut(t: number)   { return 1 - (1-t)**3; }

function interpolate(
  kf: { t: number; [k: string]: number }[],
  keys: string[],
  p: number,
): Record<string, number> {
  let i = kf.length - 2;
  for (let k = 0; k < kf.length - 1; k++) { if (p < kf[k+1].t) { i = k; break; } }
  const a = kf[i], b = kf[i+1];
  if (a.t === b.t) { const r: Record<string,number> = {}; keys.forEach(k => r[k] = a[k]); return r; }
  const local = (p - a.t) / (b.t - a.t);
  const ease  = (b.t - a.t) < 0.06 ? easeOut(local) : easeInOut(local);
  const r: Record<string,number> = {};
  keys.forEach(k => r[k] = a[k] + (b[k] - a[k]) * ease);
  return r;
}

/* orbit keyframes (whole cube) — 28 s */
const ORBIT_KF = [
  { t:0.00, rx:28, ry:  0, rz:  0 },
  { t:0.11, rx:26, ry: 44, rz:  0 },
  { t:0.16, rx:34, ry:134, rz:  0 },
  { t:0.24, rx:34, ry:134, rz:  0 },
  { t:0.36, rx:28, ry:192, rz:  3 },
  { t:0.40, rx:52, ry:206, rz:  0 },
  { t:0.48, rx:52, ry:206, rz:  0 },
  { t:0.60, rx:26, ry:278, rz: -2 },
  { t:0.64, rx:20, ry:318, rz:-14 },
  { t:0.72, rx:20, ry:318, rz:-14 },
  { t:1.00, rx:28, ry:360, rz:  0 },
];
const ORBIT_DUR = 28_000;

/* layer-twist keyframes (middle ring only) — 22 s */
const TWIST_KF = [
  { t:0.00, a:  0 },
  { t:0.14, a:  0 },   // hold
  { t:0.32, a: 90 },   // twist → right
  { t:0.46, a: 90 },   // hold
  { t:0.60, a:  0 },   // twist back
  { t:0.74, a:  0 },   // hold
  { t:0.88, a:-90 },   // twist → left
  { t:0.95, a:-90 },   // hold
  { t:1.00, a:  0 },   // twist back
];
const TWIST_DUR = 22_000;

/* ─── face-content renderers ─────────────────────────────────── */

function StockGrid({ rows }: { rows: string[][] }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(3,${CELL}px)`, gridTemplateRows:`repeat(3,${CELL}px)`, gap:`${GAP}px`, padding:`${GAP}px`, width:'100%', height:'100%', boxSizing:'border-box' }}>
      {rows.flat().map((sym, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,rgba(30,74,156,.85),rgba(15,42,100,.95))', border:'1px solid rgba(147,197,253,.22)', borderRadius:6, color:'#bfdbfe', fontSize:sym.length>4?'9px':'11px', fontWeight:800, fontFamily:'"Geist Mono","Courier New",monospace', letterSpacing:'0.06em' }}>
          {sym}
        </div>
      ))}
    </div>
  );
}

function ComplianceGrid({ rows }: { rows: CLabel[][] }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(3,${CELL}px)`, gridTemplateRows:`repeat(3,${CELL}px)`, gap:`${GAP}px`, padding:`${GAP}px`, width:'100%', height:'100%', boxSizing:'border-box' }}>
      {rows.flat().map((label, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,rgba(10,28,70,.92),rgba(7,18,50,.97))', border:'1px solid rgba(96,165,250,.18)', borderRadius:6, color:LABEL_COLOR[label], fontSize:label==='Non-Compliant'?'9px':'10.5px', fontWeight:800, fontFamily:'system-ui,sans-serif', textAlign:'center', lineHeight:1.2, padding:'2px' }}>
          {label}
        </div>
      ))}
    </div>
  );
}

/* ─── a single horizontal strip (1 of 3 rows) on a side face ── */

interface StripProps {
  side:   typeof SIDES[number];
  row:    0 | 1 | 2;
}

function SideStrip({ side, row }: StripProps) {
  const rows = side.type === 'stock' ? STOCK_FACES[side.idx] : COMPLIANCE_FACES[side.idx];
  const bg   = side.type === 'stock'
    ? 'linear-gradient(135deg,#1a3f82,#091a40)'
    : 'linear-gradient(135deg,#0a1e52,#040e2e)';

  /* transformOrigin must sit at the cube centre so rotateY spins around the cube Y-axis.
     Strip is positioned at top = row*STRIP_H; cube centre in strip-local Y coords: S/2 - row*STRIP_H */
  const originY = S/2 - row * STRIP_H;

  return (
    <div style={{
      position:        'absolute',
      top:             row * STRIP_H,
      left:            0,
      width:           S,
      height:          STRIP_H,
      overflow:        'hidden',
      background:      bg,
      transformOrigin: `${S/2}px ${originY}px 0`,
      transform:       `rotateY(${side.angle}deg) translateZ(${H}px)`,
      boxShadow:       'inset 0 0 0 1px rgba(147,197,253,.15), 0 0 0 1px rgba(0,0,0,.4)',
      /* rounded corners only on the outermost horizontal edges of the cube */
      borderRadius: row === 0 ? '10px 10px 0 0' : row === 2 ? '0 0 10px 10px' : 0,
    }}>
      {/* shift the full 3×3 grid up so only row `row` is visible */}
      <div style={{ position:'absolute', top: -(row * STRIP_H), width:S, height:S }}>
        {side.type === 'stock'
          ? <StockGrid rows={rows as string[][]} />
          : <ComplianceGrid rows={rows as CLabel[][]} />}
      </div>
    </div>
  );
}

/* ─── top / bottom cap faces ─────────────────────────────────── */

function CapFace({ rotX, faceIdx, type }: { rotX: number; faceIdx: number; type: 'stock'|'compliance' }) {
  const rows = type === 'stock' ? STOCK_FACES[faceIdx] : COMPLIANCE_FACES[faceIdx];
  const bg   = type === 'stock'
    ? 'linear-gradient(135deg,#1a3f82,#091a40)'
    : 'linear-gradient(135deg,#0a1e52,#040e2e)';
  return (
    <div style={{ position:'absolute', top:0, left:0, width:S, height:S, overflow:'hidden', background:bg, transform:`rotateX(${rotX}deg) translateZ(${H}px)`, borderRadius:10, boxShadow:'inset 0 0 0 1px rgba(147,197,253,.15), 0 0 0 1px rgba(0,0,0,.4)' }}>
      {type === 'stock' ? <StockGrid rows={rows as string[][]} /> : <ComplianceGrid rows={rows as CLabel[][]} />}
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────── */

export default function RubikCube() {
  const cubeRef  = useRef<HTMLDivElement>(null);
  const midRef   = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let rafId: number;
    const frame = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;

      /* orbit */
      const op  = (elapsed % ORBIT_DUR) / ORBIT_DUR;
      const orb = interpolate(ORBIT_KF, ['rx','ry','rz'], op);
      if (cubeRef.current) {
        cubeRef.current.style.transform =
          `rotateX(${orb.rx}deg) rotateY(${orb.ry}deg) rotateZ(${orb.rz}deg)`;
      }

      /* middle-layer twist */
      const tp    = (elapsed % TWIST_DUR) / TWIST_DUR;
      const twist = interpolate(TWIST_KF, ['a'], tp);
      if (midRef.current) {
        midRef.current.style.transform = `rotateY(${twist.a}deg)`;
      }

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const scene = S + 100;

  return (
    <div style={{ width:scene, height:scene, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {/* ambient glow */}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        <div style={{ width:S*.9, height:S*.9, borderRadius:'50%', background:'radial-gradient(ellipse at center,rgba(59,130,246,.28),rgba(37,99,235,.1) 50%,transparent 70%)', filter:'blur(28px)' }} />
      </div>

      {/* perspective */}
      <div style={{ perspective:'850px', perspectiveOrigin:'50% 50%' }}>
        <div ref={cubeRef} style={{ position:'relative', width:S, height:S, transformStyle:'preserve-3d' }}>

          {/* ── top layer (row 0 strips + top cap) ── */}
          <div style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            <CapFace rotX={90}  faceIdx={2} type="stock" />
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={0} />)}
          </div>

          {/* ── middle layer (row 1 strips) — twists independently ── */}
          <div ref={midRef} style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={1} />)}
          </div>

          {/* ── bottom layer (row 2 strips + bottom cap) ── */}
          <div style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            <CapFace rotX={-90} faceIdx={2} type="compliance" />
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={2} />)}
          </div>

        </div>
      </div>
    </div>
  );
}
