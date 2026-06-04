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

/* Three geo-intelligence phrases, each with its own colour and scroll speed */
const GEO_PHRASES = [
  { text: 'Conflict Zones Exposure',          color: '#f87171', dur: 9  },
  { text: 'Sanctions & High Risk Regions',    color: '#fb923c', dur: 11 },
  { text: 'Department of Defence Contracts',  color: '#fbbf24', dur: 12 },
] as const;

/*
 * Which phrase (0/1/2) each of the 9 cells shows, per face.
 * Values look random but every phrase appears 3 times across each face.
 */
const GEO_CELL_MAP: [number[], number[]] = [
  [0, 1, 2,  1, 2, 0,  2, 0, 1], // back face  (angle 180°)
  [2, 0, 1,  0, 1, 2,  1, 2, 0], // left face  (angle −90°)
];

/* Staggered animation delays so each cell starts at a different phrase position */
const CELL_DELAYS = [0, -2.8, -5.6, -8.4, -1.4, -4.2, -7.0, -9.8, -3.5];

/* 4 vertical sides */
const SIDES: Array<{ angle:number; type:'stock'|'compliance'|'geo'; idx:number }> = [
  { angle:   0, type:'stock',      idx:0 },
  { angle:  90, type:'stock',      idx:1 },
  { angle: 180, type:'geo',        idx:0 }, // geo face A
  { angle: -90, type:'geo',        idx:1 }, // geo face B
];

/* ─── animation helpers ────────────────────────────────────────── */

function easeInOut(t: number) { return t < 0.5 ? 2*t*t : 1 - (-2*t+2)**2/2; }

function lerp(kf: Array<{t:number;[k:string]:number}>, key:string, p:number): number {
  let i = kf.length - 2;
  for (let k = 0; k < kf.length - 1; k++) { if (p < kf[k+1].t) { i = k; break; } }
  const a = kf[i], b = kf[i+1];
  if (a.t === b.t) return a[key];
  return a[key] + (b[key] - a[key]) * easeInOut((p - a.t) / (b.t - a.t));
}

const ORBIT_DUR = 36_000; // horizontal spin (Y axis)
const TILT_DUR  = 52_000; // vertical tilt  (X axis) — different period → organic combos

const TWIST_DUR = 30_000;
const TWIST_KF = [
  { t:0.00, a:  0 }, { t:0.13, a:  0 },
  { t:0.30, a: 80 }, { t:0.43, a: 80 },
  { t:0.60, a:  0 }, { t:0.73, a:  0 },
  { t:0.88, a:-80 }, { t:0.96, a:-80 },
  { t:1.00, a:  0 },
];

/* ─── shared edge styling ──────────────────────────────────────── */

const FACE_SHADOW =
  'inset 1.5px 1.5px 0 rgba(190,225,255,.6), inset -1px -1px 0 rgba(0,0,20,.95), 0 0 0 1px rgba(0,0,0,.6)';
const CELL_SHADOW =
  'inset 0 1px 0 rgba(190,225,255,.28), inset 0 -1px 0 rgba(0,0,0,.4)';

/* ─── face renderers ───────────────────────────────────────────── */

function StockGrid({ rows }: { rows: string[][] }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(3,${CELL}px)`, gridTemplateRows:`repeat(3,${CELL}px)`, gap:`${GAP}px`, padding:`${GAP}px`, width:'100%', height:'100%', boxSizing:'border-box' }}>
      {rows.flat().map((sym, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,rgba(44,100,200,.88),rgba(15,42,110,.96) 60%,rgba(8,24,62,1) 100%)', border:'1px solid rgba(147,197,253,.4)', borderRadius:6, color:'#bfdbfe', fontSize:sym.length>4?'9px':'11px', fontWeight:800, fontFamily:'"Geist Mono","Courier New",monospace', letterSpacing:'0.06em', boxShadow:CELL_SHADOW }}>
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
        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,rgba(12,32,84,.93),rgba(7,18,54,.98) 100%)', border:'1px solid rgba(96,165,250,.3)', borderRadius:6, color:LABEL_COLOR[label], fontSize:label==='Non-Compliant'?'9px':'10.5px', fontWeight:800, fontFamily:'system-ui,sans-serif', textAlign:'center', lineHeight:1.2, padding:'2px', boxShadow:CELL_SHADOW }}>
          {label}
        </div>
      ))}
    </div>
  );
}

/* Single scrolling ticker cell */
function GeoTickerCell({ phraseIdx, delay }: { phraseIdx: 0|1|2; delay: number }) {
  const { text, color, dur } = GEO_PHRASES[phraseIdx];
  const paddedText = `${text}     `; // gap between repeats

  return (
    <div style={{ overflow:'hidden', background:'linear-gradient(145deg,rgba(5,16,48,.97),rgba(3,9,28,.99) 100%)', border:`1px solid ${color}38`, borderRadius:6, display:'flex', alignItems:'center', boxShadow:CELL_SHADOW }}>
      {/* Two copies side-by-side: translateX(−50%) scrolls exactly one copy → seamless loop */}
      <div style={{ display:'flex', flexShrink:0, animation:`geo-ticker ${dur}s linear infinite`, animationDelay:`${delay}s` }}>
        <span style={{ whiteSpace:'nowrap', fontSize:'9px', fontWeight:700, color, paddingRight:4, fontFamily:'system-ui,sans-serif' }}>
          {paddedText}
        </span>
        <span style={{ whiteSpace:'nowrap', fontSize:'9px', fontWeight:700, color, paddingRight:4, fontFamily:'system-ui,sans-serif' }}>
          {paddedText}
        </span>
      </div>
    </div>
  );
}

function GeoGrid({ faceIdx }: { faceIdx: number }) {
  const phraseMap = GEO_CELL_MAP[faceIdx] ?? GEO_CELL_MAP[0];
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(3,${CELL}px)`, gridTemplateRows:`repeat(3,${CELL}px)`, gap:`${GAP}px`, padding:`${GAP}px`, width:'100%', height:'100%', boxSizing:'border-box' }}>
      {phraseMap.map((phraseIdx, i) => (
        <GeoTickerCell key={i} phraseIdx={phraseIdx as 0|1|2} delay={CELL_DELAYS[i]} />
      ))}
    </div>
  );
}

/* ─── single horizontal strip (1/3 of a face) ──────────────────── */

function SideStrip({ side, row }: { side: typeof SIDES[number]; row: 0|1|2 }) {
  const isStock = side.type === 'stock';
  const isGeo   = side.type === 'geo';
  const rows    = isStock ? STOCK_FACES[side.idx] : isGeo ? null : COMPLIANCE_FACES[side.idx];
  const bg      = isStock
    ? 'linear-gradient(135deg,#1d4898 0%,#102468 40%,#091a40 100%)'
    : isGeo
    ? 'linear-gradient(135deg,#04102a 0%,#020917 100%)'
    : 'linear-gradient(135deg,#0b2057 0%,#061340 100%)';

  const originY = S/2 - row * STRIP_H;

  return (
    <div style={{ position:'absolute', top:row*STRIP_H, left:0, width:S, height:STRIP_H, overflow:'hidden', background:bg, transformOrigin:`${S/2}px ${originY}px 0`, transform:`rotateY(${side.angle}deg) translateZ(${H}px)`, boxShadow:FACE_SHADOW, borderRadius:row===0?'10px 10px 0 0':row===2?'0 0 10px 10px':0 }}>
      <div style={{ position:'absolute', top:-(row*STRIP_H), width:S, height:S }}>
        {isStock ? <StockGrid rows={rows as string[][]} />
         : isGeo  ? <GeoGrid faceIdx={side.idx} />
                  : <ComplianceGrid rows={rows as CLabel[][]} />}
      </div>
    </div>
  );
}

/* ─── top / bottom cap faces ─────────────────────────────────────── */

function CapFace({ rotX, type, faceIdx }: { rotX:number; type:'stock'|'compliance'; faceIdx:number }) {
  const rows = type==='stock' ? STOCK_FACES[faceIdx] : COMPLIANCE_FACES[faceIdx];
  const bg   = type==='stock' ? 'linear-gradient(135deg,#1d4898,#091a40)' : 'linear-gradient(135deg,#0b2057,#061340)';
  return (
    <div style={{ position:'absolute', top:0, left:0, width:S, height:S, overflow:'hidden', background:bg, transform:`rotateX(${rotX}deg) translateZ(${H}px)`, borderRadius:10, boxShadow:FACE_SHADOW }}>
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

      // horizontal spin — Y axis, 36 s cycle
      const ot = (elapsed % ORBIT_DUR) / ORBIT_DUR;
      const ry = (ot * 360) % 360;

      // vertical tilt — X axis, 52 s cycle (asynchronous → never repeats in short term)
      const tt = (elapsed % TILT_DUR) / TILT_DUR;
      const rx = 22 + 28 * Math.sin(tt * 2 * Math.PI); // 0° → ~50° → back, shows top & bottom

      // gentle Z wobble synced to horizontal spin
      const rz = 3.5 * Math.cos(ot * 2 * Math.PI * 1.1);

      if (cubeRef.current)
        cubeRef.current.style.transform = `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`;

      const midY = lerp(TWIST_KF, 'a', (elapsed % TWIST_DUR) / TWIST_DUR);
      if (midRef.current)
        midRef.current.style.transform = `rotateY(${midY.toFixed(3)}deg)`;

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const scene = S + 100;

  return (
    <div style={{ width:scene, height:scene, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        <div style={{ width:S*.9, height:S*.9, borderRadius:'50%', background:'radial-gradient(ellipse at center,rgba(59,130,246,.3),rgba(37,99,235,.1) 50%,transparent 70%)', filter:'blur(32px)' }} />
      </div>
      <div style={{ perspective:'850px', perspectiveOrigin:'50% 50%' }}>
        <div ref={cubeRef} style={{ position:'relative', width:S, height:S, transformStyle:'preserve-3d' }}>
          <div style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            <CapFace rotX={90}  type="stock"      faceIdx={2} />
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={0} />)}
          </div>
          <div ref={midRef} style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={1} />)}
          </div>
          <div style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            <CapFace rotX={-90} type="compliance" faceIdx={2} />
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={2} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
