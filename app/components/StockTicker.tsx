'use client';

import { useState, useEffect } from 'react';

interface Stock {
  symbol: string;
  price: string | number;
  change: string;
}

export default function StockTicker() {
  const [stocks, setStocks] = useState<Stock[]>([]);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const response = await fetch('/api/stock-quotes');
        const data = await response.json();
        if (data.stocks && data.stocks.length > 0) setStocks(data.stocks);
      } catch {
        // silently use fallback
      }
    };
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 160000);
    return () => clearInterval(interval);
  }, []);

  const fallbackStocks: Stock[] = [
    { symbol: 'NVDA',      price: '892.34', change: '5.2'  },
    { symbol: '2222.SR',   price: '27.15',  change: '0.4'  },
    { symbol: 'AMZN',      price: '182.56', change: '-0.5' },
    { symbol: 'ARM',       price: '132.50', change: '2.8'  },
    { symbol: 'JPM',       price: '195.67', change: '1.2'  },
    { symbol: 'TSLA',      price: '248.73', change: '4.1'  },
    { symbol: 'SHEL',      price: '68.72',  change: '0.5'  },
    { symbol: 'GOOGL',     price: '186.92', change: '3.2'  },
    { symbol: 'EMAAR.DFM', price: '9.82',   change: '1.1'  },
    { symbol: 'WMT',       price: '89.45',  change: '2.1'  },
    { symbol: 'META',      price: '501.23', change: '2.7'  },
    { symbol: 'BA',        price: '178.45', change: '1.4'  },
    { symbol: 'BABA',      price: '89.12',  change: '-0.4' },
    { symbol: 'AAPL',      price: '228.45', change: '2.3'  },
    { symbol: 'QGTS.QA',   price: '3.24',   change: '0.6'  },
    { symbol: 'INTC',      price: '21.45',  change: '-1.3' },
    { symbol: 'V',         price: '285.43', change: '0.8'  },
    { symbol: 'NKE',       price: '74.89',  change: '-0.6' },
    { symbol: 'MSFT',      price: '417.89', change: '1.8'  },
    { symbol: 'DIS',       price: '92.78',  change: '1.5'  },
    { symbol: 'AMD',       price: '158.92', change: '3.6'  },
    { symbol: 'BP',        price: '31.45',  change: '-0.9' },
    { symbol: 'UBER',      price: '73.56',  change: '2.4'  },
    { symbol: 'JNJ',       price: '154.89', change: '-1.1' },
  ];

  const display = stocks.length > 0 ? stocks : fallbackStocks;
  const items = [...display, ...display, ...display];

  return (
    <div className="relative bg-slate-950 border-b border-slate-800 overflow-hidden select-none" style={{ height: '36px' }}>
      {/* fade edges */}
      <div className="absolute left-0 top-0 h-full w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #020617, transparent)' }} />
      <div className="absolute right-0 top-0 h-full w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #020617, transparent)' }} />

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .ticker-track {
          display: flex;
          align-items: center;
          animation: ticker 80s linear infinite;
          will-change: transform;
        }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>

      <div className="ticker-track h-full">
        {items.map((stock, idx) => {
          const change = parseFloat(stock.change);
          const up = change >= 0;
          const price = typeof stock.price === 'string' ? stock.price : stock.price.toFixed(2);
          return (
            <div key={idx} className="flex items-center gap-2.5 px-5 h-full flex-shrink-0">
              {/* separator dot */}
              <span className="text-slate-600 text-[10px]">◆</span>

              {/* symbol */}
              <span className="text-white font-bold text-xs tracking-widest" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                {stock.symbol}
              </span>

              {/* price */}
              <span className="text-slate-300 text-xs font-medium" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                ${price}
              </span>

              {/* change badge */}
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                  up
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'
                }`}
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                {up ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
