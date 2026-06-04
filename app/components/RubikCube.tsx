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

/* Rolling geo-intelligence ticker — 3 phrases cycle seamlessly in each cell */
const GEO_TICKER =
  'Conflict Zones Exposure  ·  Sanctions & High Risk Regions  ·  Department of Defence Contracts  ·  ';

/* 4 vertical side faces — front(0°), right(90°), back(180°), left(−90°) */
const SIDES: Array<{ angle: number; type: 'stock'|'compliance'|'geo'; idx: number }> = [
  { angle:   0, type: 'stock',      idx: 0 },
  { angle:  90, type: 'stock',      idx: 1 },
  { angle: 180, type: 'geo',        idx: 0 }, // geo intelligence face
  { angle: -90, type: 'geo',        idx: 0 }, // geo intelligence face
];

/* ─── animation helpers ────────────────────────────────────────── */

function easeInOut(t: number) { return t < 0.5 ? 2*t*t : 1 - (-2*t+2)**2/2; }

function lerp(kf: Array<{ t: number; [k: string]: number }>, key: string, p: number): number {
  let i = kf.length - 2;
  for (let k = 0; k < kf.length - 1; k++) { if (p < kf[k+1].t) { i = k; break; } }
  const a = kf[i], b = kf[i+1];
  if (a.t === b.t) return a[key];
  return a[key] + (b[key] - a[key]) * easeInOut((p - a.t) / (b.t - a.t));
}

const ORBIT_DUR = 36_000; // 36 s full rotation

/* Middle layer horizontal (Y-axis) twist — 30 s cycle, Y only (natural Rubik move) */
const TWIST_DUR = 30_000;
const TWIST_KF = [
  { t:0.00, a:  0 },
  { t:0.13, a:  0 },  // hold
  { t:0.30, a: 80 },  // twist right
  { t:0.43, a: 80 },  // hold
  { t:0.60, a:  0 },  // return
  { t:0.73, a:  0 },  // hold
  { t:0.88, a:-80 },  // twist left
  { t:0.96, a:-80 },  // hold
  { t:1.00, a:  0 },  // return
];

/* ─── face renderers ───────────────────────────────────────────── */

/* Shiny metallic edge style shared by all face panels */
const FACE_SHADOW =
  'inset 1px 1px 0 rgba(180,220,255,.55), inset -1px -1px 0 rgba(0,0,20,.9), 0 0 0 1px rgba(0,0,0,.55)';

/* Cell base shadow: bright top edge + dark bottom */
const CELL_SHADOW =
  'inset 0 1px 0 rgba(180,220,255,.3), inset 0 -1px 0 rgba(0,0,0,.35)';

function StockGrid({ rows }: { rows: string[][] }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(3,${CELL}px)`, gridTemplateRows:`repeat(3,${CELL}px)`, gap:`${GAP}px`, padding:`${GAP}px`, width:'100%', height:'100%', boxSizing:'border-box' }}>
      {rows.flat().map((sym, i) => (
        <div key={i} style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'linear-gradient(145deg,rgba(42,96,190,.88) 0%,rgba(15,42,110,.96) 70%,rgba(8,24,60,1) 100%)',
          border:'1px solid rgba(147,197,253,.38)',
          borderRadius:6,
          color:'#bfdbfe',
          fontSize:sym.length>4?'9px':'11px',
          fontWeight:800,
          fontFamily:'"Geist Mono","Courier New",monospace',
          letterSpacing:'0.06em',
          boxShadow: CELL_SHADOW,
        }}>
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
        <div key={i} style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'linear-gradient(145deg,rgba(12,32,82,.93) 0%,rgba(7,18,52,.98) 100%)',
          border:'1px solid rgba(96,165,250,.28)',
          borderRadius:6,
          color:LABEL_COLOR[label],
          fontSize:label==='Non-Compliant'?'9px':'10.5px',
          fontWeight:800,
          fontFamily:'system-ui,sans-serif',
          textAlign:'center',
          lineHeight:1.2,
          padding:'2px',
          boxShadow: CELL_SHADOW,
        }}>
          {label}
        </div>
      ))}
    </div>
  );
}

/* One scrolling ticker cell — each of the 9 geo cells gets a staggered start */
function GeoTickerCell({ delay }: { delay: number }) {
  return (
    <div style={{
      overflow:'hidden',
      background:'linear-gradient(145deg,rgba(6,20,55,.96) 0%,rgba(3,11,32,.99) 100%)',
      border:'1px solid rgba(96,165,250,.32)',
      borderRadius:6,
      display:'flex',
      alignItems:'center',
      boxShadow: CELL_SHADOW,
    }}>
      {/* two copies side-by-side so translateX(-50%) = one copy = seamless loop */}
      <div style={{
        display:'flex',
        flexShrink:0,
        animation:`geo-ticker 16s linear infinite`,
        animationDelay:`${delay}s`,
      }}>
        <span style={{ whiteSpace:'nowrap', fontSize:'7px', fontWeight:700, color:'#93c5fd', paddingRight:6, fontFamily:'system-ui,sans-serif' }}>
          {GEO_TICKER}
        </span>
        <span style={{ whiteSpace:'nowrap', fontSize:'7px', fontWeight:700, color:'#93c5fd', paddingRight:6, fontFamily:'system-ui,sans-serif' }}>
          {GEO_TICKER}
        </span>
      </div>
    </div>
  );
}

function GeoGrid() {
  /* stagger each cell by −1.8 s so they all start at different phrase positions */
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(3,${CELL}px)`, gridTemplateRows:`repeat(3,${CELL}px)`, gap:`${GAP}px`, padding:`${GAP}px`, width:'100%', height:'100%', boxSizing:'border-box' }}>
      {Array.from({ length: 9 }, (_, i) => (
        <GeoTickerCell key={i} delay={-(i * 1.8)} />
      ))}
    </div>
  );
}

/* ─── single horizontal strip (1/3 of a side face) ─────────────── */

function SideStrip({ side, row }: { side: typeof SIDES[number]; row: 0|1|2 }) {
  const isStock = side.type === 'stock';
  const isGeo   = side.type === 'geo';
  const rows    = isStock ? STOCK_FACES[side.idx] : isGeo ? null : COMPLIANCE_FACES[side.idx];
  const bg      = isStock
    ? 'linear-gradient(135deg,#1c4490 0%,#102468 40%,#091a40 100%)'
    : isGeo
    ? 'linear-gradient(135deg,#050f2a 0%,#030919 100%)'
    : 'linear-gradient(135deg,#0b2057 0%,#061340 100%)';

  const originY = S/2 - row * STRIP_H; // transformOrigin Y at cube centre

  return (
    <div style={{
      position:'absolute', top: row * STRIP_H, left:0, width:S, height:STRIP_H,
      overflow:'hidden', background:bg,
      transformOrigin:`${S/2}px ${originY}px 0`,
      transform:`rotateY(${side.angle}deg) translateZ(${H}px)`,
      boxShadow: FACE_SHADOW,
      borderRadius: row===0 ? '10px 10px 0 0' : row===2 ? '0 0 10px 10px' : 0,
    }}>
      <div style={{ position:'absolute', top: -(row * STRIP_H), width:S, height:S }}>
        {isStock ? <StockGrid rows={rows as string[][]} />
         : isGeo  ? <GeoGrid />
                  : <ComplianceGrid rows={rows as CLabel[][]} />}
      </div>
    </div>
  );
}

/* ─── top / bottom cap faces ─────────────────────────────────────── */

function CapFace({ rotX, type, faceIdx }: { rotX:number; type:'stock'|'compliance'; faceIdx:number }) {
  const rows = type==='stock' ? STOCK_FACES[faceIdx] : COMPLIANCE_FACES[faceIdx];
  const bg   = type==='stock'
    ? 'linear-gradient(135deg,#1c4490,#091a40)'
    : 'linear-gradient(135deg,#0b2057,#061340)';
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

      /* smooth orbital drift — pure trig, no jump artifacts */
      const ot    = (elapsed % ORBIT_DUR) / ORBIT_DUR;
      const angle = ot * 2 * Math.PI;
      const rx    = 28 + 7   * Math.sin(angle * 0.7);
      const ry    = (ot * 360) % 360;
      const rz    = 3.5 * Math.cos(angle * 1.1);
      if (cubeRef.current) {
        cubeRef.current.style.transform =
          `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`;
      }

      /* middle layer — horizontal Y twist only (natural Rubik move) */
      const tp   = (elapsed % TWIST_DUR) / TWIST_DUR;
      const midY = lerp(TWIST_KF, 'a', tp);
      if (midRef.current) {
        midRef.current.style.transform = `rotateY(${midY.toFixed(3)}deg)`;
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
        <div style={{ width:S*.9, height:S*.9, borderRadius:'50%', background:'radial-gradient(ellipse at center,rgba(59,130,246,.3),rgba(37,99,235,.1) 50%,transparent 70%)', filter:'blur(32px)' }} />
      </div>

      {/* perspective */}
      <div style={{ perspective:'850px', perspectiveOrigin:'50% 50%' }}>
        <div ref={cubeRef} style={{ position:'relative', width:S, height:S, transformStyle:'preserve-3d' }}>

          {/* top ring */}
          <div style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            <CapFace rotX={90}  type="stock"      faceIdx={2} />
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={0} />)}
          </div>

          {/* middle ring — Y-axis twist only */}
          <div ref={midRef} style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={1} />)}
          </div>

          {/* bottom ring */}
          <div style={{ position:'absolute', top:0, left:0, width:S, height:S, transformStyle:'preserve-3d' }}>
            <CapFace rotX={-90} type="compliance" faceIdx={2} />
            {SIDES.map((s,i) => <SideStrip key={i} side={s} row={2} />)}
          </div>

        </div>
      </div>
    </div>
  );
}
