'use client';

const S = 288; // cube side in px
const H = S / 2;

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
  'Compliant': '#4ade80',
  'Non-Compliant': '#f87171',
  'Questionable': '#fbbf24',
};

const FACES = [
  { transform: `translateZ(${H}px)`,                type: 'stock',      idx: 0 },
  { transform: `rotateY(90deg) translateZ(${H}px)`,  type: 'stock',      idx: 1 },
  { transform: `rotateX(90deg) translateZ(${H}px)`,  type: 'stock',      idx: 2 },
  { transform: `rotateY(180deg) translateZ(${H}px)`, type: 'compliance', idx: 0 },
  { transform: `rotateY(-90deg) translateZ(${H}px)`, type: 'compliance', idx: 1 },
  { transform: `rotateX(-90deg) translateZ(${H}px)`, type: 'compliance', idx: 2 },
] as const;

const GAP = 4;
const CELL = (S - GAP * 4) / 3;

function StockFace({ grid }: { grid: string[][] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(3, ${CELL}px)`,
      gridTemplateRows: `repeat(3, ${CELL}px)`,
      gap: `${GAP}px`,
      padding: `${GAP}px`,
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
    }}>
      {grid.flat().map((sym, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
        }}>
          {sym}
        </div>
      ))}
    </div>
  );
}

function ComplianceFace({ grid }: { grid: CLabel[][] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(3, ${CELL}px)`,
      gridTemplateRows: `repeat(3, ${CELL}px)`,
      gap: `${GAP}px`,
      padding: `${GAP}px`,
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
    }}>
      {grid.flat().map((label, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, rgba(10,28,70,0.92) 0%, rgba(7,18,50,0.97) 100%)',
          border: '1px solid rgba(96,165,250,0.18)',
          borderRadius: '6px',
          color: LABEL_COLORS[label],
          fontSize: label === 'Non-Compliant' ? '6.5px' : '7.5px',
          fontWeight: 800,
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          lineHeight: 1.25,
          padding: '3px',
          textShadow: `0 0 6px ${LABEL_COLORS[label]}80`,
          boxShadow: 'inset 0 1px 0 rgba(96,165,250,0.08), inset 0 -1px 0 rgba(0,0,0,0.25)',
        }}>
          {label}
        </div>
      ))}
    </div>
  );
}

const FACE_BG: Record<'stock' | 'compliance', string> = {
  stock: 'linear-gradient(135deg, #1a3f82 0%, #0e2554 60%, #091a40 100%)',
  compliance: 'linear-gradient(135deg, #0a1e52 0%, #071540 60%, #040e2e 100%)',
};

export default function RubikCube() {
  const sceneSize = S + 100;

  return (
    <div
      style={{
        width: sceneSize,
        height: sceneSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Glow behind cube — kept on a separate element so it never touches the preserve-3d context */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: S * 0.9,
          height: S * 0.9,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.28) 0%, rgba(37,99,235,0.10) 50%, transparent 70%)',
          filter: 'blur(28px)',
        }} />
      </div>

      {/* Perspective wrapper — no filter here so preserve-3d works correctly */}
      <div style={{
        perspective: '850px',
        perspectiveOrigin: '50% 50%',
      }}>
      <div
        style={{
          position: 'relative',
          width: S,
          height: S,
          transformStyle: 'preserve-3d',
          animation: 'rubik-spin 28s linear infinite',
        }}
      >
        {FACES.map((face, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: S,
              height: S,
              transform: face.transform,
              background: FACE_BG[face.type],
              borderRadius: '10px',
              overflow: 'hidden',
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
