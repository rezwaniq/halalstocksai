'use client';

import { useEffect, useRef } from 'react';

const S       = 288;
const H       = S / 2;
const STRIP_H = S / 3;
const GAP     = 4;
const CELL    = (S - GAP * 4) / 3;

/* ─── content ─────────────────────────────────────────────────── */

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
  'Compliant':'#4ade80', 'Non-Compliant':'#f87171', 'Questionable':'#fbbf24',
};

type GLabel = 'Conflict'|'Sanctions'|'DoD'|'High Risk'|'Assessed'|'Monitored'|'Clean'|'Exposed'|'Screened';
const GEO_FACE: GLabel[][] = [
  ['Conflict',  'Sanctions', 'DoD'],
  ['High Risk', 'Assessed',  'Monitored'],
  ['Clean',     'Exposed',   'Screened'],
];
const GEO_COLOR: Record<GLabel, string> = {
  'Conflict':'#f87171', 'Sanctions':'#fb923c', 'DoD':'#fbbf24',
  'High Risk':'#f87171','Assessed':'#60a5fa',  'Monitored':'#fbbf24',
  'Clean':'#4ade80',    'Exposed':'#f87171',   'Screened':'#4ade80',
};

/* 4 vertical sides — front, right, back, left */
const SIDES: Array<{ angle: number; type: 'stock'|'compliance'|'geo'; idx: number }> = [
  { angle:   0, type: 'stock',      idx: 0 },
  { angle:  90, type: 'stock',      idx: 1 },
  { angle: 180, type: 'compliance', idx: 0 },
  { angle: -90, type: 'geo',        idx: 0 },
];

/* ─── animation ────────────────────────────────────────────────── */

/* easeInOut for ALL transitions — no sharp snaps anywhere */
function easeInOut(t: number) { return t < 0.5 ? 2*t*t : 1 - (-2*t+2)**2/2; }

function lerp(
  kf: Array<{ t: number; [k: string]: number }>,
  key: string,
  p: number,
): number {
  let i = kf.length - 2;
  for (let k = 0; k < kf.length - 1; k++) { if (p < kf[k+1].t) { i = k; break; } }
  const a = kf[i], b = kf[i+1];
  if (a.t === b.t) return a[key];
  return a[key] + (b[key] - a[key]) * easeInOut((p - a.t) / (b.t - a.t));
}

/* Whole-cube orbit: smooth sine-based drift, 36 s cycle */
const ORBIT_DUR = 36_000;

/* Middle layer — horizontal (Y) twist: 30 s cycle */
const TWIST_Y_DUR = 30_000;
const TWIST_Y_KF = [
  { t:0.00, a:  0 },
  { t:0.13, a:  0 },   // hold
  { t:0.30, a: 80 },   // slow twist right
  { t:0.43, a: 80 },   // hold
  { t:0.60, a:  0 },   // slow return
  { t:0.73, a:  0 },   // hold
  { t:0.88, a:-80 },   // slow twist left
  { t:0.96, a:-80 },   // hold
  { t:1.00, a:  0 },   // return
];

/* Middle layer — vertical (X) twist: 48 s cycle (asynchronous → organic combos) */
const TWIST_X_DUR = 48_000;
const TWIST_X_KF = [
  { t:0.00, a:  0 },
  { t:0.20, a:  0 },   // hold
  { t:0.38, a:-70 },   // slow tilt forward (top of cube comes toward viewer)
  { t:0.54, a:-70 },   // hold
  { t:0.72, a:  0 },   // slow return
  { t:0.88, a:  0 },   // hold
  { t:1.00, a:  0 },
];

/* ─── renderers ────────────────────────────────────────────────── */

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

function GeoGrid({ rows }: { rows: GLabel[][] }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(3,${CELL}px)`, gridTemplateRows:`repeat(3,${CELL}px)`, gap:`${GAP}px`, padding:`${GAP}px`, width:'100%', height:'100%', boxSizing:'border-box' }}>
      {rows.flat().map((label, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,rgba(5,18,50,.95),rgba(3,10,30,.98))', border:'1px solid rgba(96,165,250,.18)', borderRadius:6, color:GEO_COLOR[label], fontSize:'8.5px', fontWeight:800, fontFamily:'system-ui,sans-serif', textAlign:'center', lineHeight:1.15, padding:'2px' }}>
          {label}
        </div>
      ))}
    </div>
  );
}

/* ─── single horizontal strip (1/3 of a side face) ─────────────── */

function SideStrip({ side, row }: { side: typeof SIDES[number]; row: 0|1|2 }) {
  const isStock      = side.type === 'stock';
  const isGeo        = side.type === 'geo';
  const rows         = isStock ? STOCK_FACES[side.idx] : isGeo ? GEO_FACE : COMPLIANCE_FACES[side.idx];
  const bg           = isStock ? 'linear-gradient(135deg,#1a3f82,#091a40)'
                     : isGeo   ? 'linear-gradient(135deg,#04122e,#020a1c)'
                               : 'linear-gradient(135deg,#0a1e52,#040e2e)';
  /* transformOrigin at cube centre so rotateY pivots around the cube Y-axis */
  const originY      = S/2 - row * STRIP_H;

  return (
    <div style={{
      position:'absolute', top: row * STRIP_H, left:0, width:S, height:STRIP_H,
      overflow:'hidden', background:bg,
      transformOrigin:`${S/2}px ${originY}px 0`,
      transform:`rotateY(${side.angle}deg) translateZ(${H}px)`,
      boxShadow:'inset 0 0 0 1px rgba(147,197,253,.15), 0 0 0 1px rgba(0,0,0,.4)',
      borderRadius: row===0 ? '10px 10px 0 0' : row===2 ? '0 0 10px 10px' : 0,
    }}>
      <div style={{ position:'absolute', top: -(row * STRIP_H), width:S, height:S }}>
        {isStock ? <StockGrid rows={rows as string[][]} />
         : isGeo  ? <GeoGrid   rows={rows as GLabel[][]} />
                  : <ComplianceGrid rows={rows as CLabel[][]} />}
      </div>
    </div>
  );
}

/* ─── top / bottom cap faces ─────────────────────────────────────── */

function CapFace({ rotX, type, faceIdx }: { rotX:number; type:'stock'|'compliance'; faceIdx:number }) {
  const rows = type==='stock' ? STOCK_FACES[faceIdx] : COMPLIANCE_FACES[faceIdx];
  const bg   = type==='stock' ? 'linear-gradient(135deg,#1a3f82,#091a40)' : 'linear-gradient(135deg,#0a1e52,#040e2e)';
  return (
    <div style={{ position:'absolute', top:0, left:0, width:S, height:S, overflow:'hidden', background:bg, transform:`rotateX(${rotX}deg) translateZ(${H}px)`, borderRadius:10, boxShadow:'inset 0 0 0 1px rgba(147,197,253,.15), 0 0 0 1px rgba(0,0,0,.4)' }}>
      {type==='stock' ? <StockGrid rows={rows as string[][]} /> : <ComplianceGrid rows={rows as CLabel[][]} />}
    </div>
  );
}

/* ─── main ──────────────────────────────────────────────────────── */

export default function RubikCube() {
  const cubeRef  = useRef<HTMLDivElement>(null);
  const midRef   = useRef<HTMLDivElement>(null);
  const startRef = useRef<number|null>(null);

  useEffect(() => {
    let rafId: number;

    const frame = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;

      /* ── smooth orbital drift (no keyframes, pure trig) ── */
      const ot    = (elapsed % ORBIT_DUR) / ORBIT_DUR;
      const angle = ot * 2 * Math.PI;
      const rx    = 28 + 7   * Math.sin(angle * 0.7);
      const ry    = (ot * 360) % 360;
      const rz    = 3.5 * Math.cos(angle * 1.1);
      if (cubeRef.current) {
        cubeRef.current.style.transform =
          `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`;
      }

      /* ── middle layer: horizontal (Y) twist ── */
      const yp  = (elapsed % TWIST_Y_DUR) / TWIST_Y_DUR;
      const midY = lerp(TWIST_Y_KF, 'a', yp);

      /* ── middle layer: vertical (X) twist ── */
      const xp  = (elapsed % TWIST_X_DUR) / TWIST_X_DUR;
      const midX = lerp(TWIST_X_KF, 'a', xp);

      if (midRef.current) {
        midRef.current.style.transform =
          `rotateY(${midY.toFixed(3)}deg) rotateX(${midX.toFixed(3)}deg)`;
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

          {/* top ring — row 0 strips + top cap */}
          <div style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            <CapFace rotX={90}  type="stock"      faceIdx={2} />
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={0} />)}
          </div>

          {/* middle ring — twists on both Y and X independently */}
          <div ref={midRef} style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={1} />)}
          </div>

          {/* bottom ring — row 2 strips + bottom cap */}
          <div style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            <CapFace rotX={-90} type="compliance" faceIdx={2} />
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={2} />)}
          </div>

        </div>
      </div>
    </div>
  );
}
