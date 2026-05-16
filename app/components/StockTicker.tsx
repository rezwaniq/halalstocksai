'use client';

import { useState, useEffect } from 'react';

interface Stock {
  symbol: string;
  price: string | number;
  change: string;
}

export default function StockTicker() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const response = await fetch('/api/stock-quotes');
        const data = await response.json();

        if (data.stocks && data.stocks.length > 0) {
          setStocks(data.stocks);
        }
      } catch (error) {
        console.error('Error fetching stock quotes:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchQuotes();

    // Refresh every 60 seconds
    const interval = setInterval(fetchQuotes, 60000);
    return () => clearInterval(interval);
  }, []);

  // Use mock data as fallback while loading
  const fallbackStocks = [
    { symbol: 'AAPL', price: '228.45', change: '2.3' },
    { symbol: 'MSFT', price: '417.89', change: '1.8' },
    { symbol: 'GOOGL', price: '186.92', change: '3.2' },
    { symbol: 'AMZN', price: '182.56', change: '-0.5' },
    { symbol: 'TSLA', price: '248.73', change: '4.1' },
    { symbol: 'META', price: '501.23', change: '2.7' },
    { symbol: 'NVDA', price: '892.34', change: '5.2' },
    { symbol: 'JPM', price: '195.67', change: '1.2' },
    { symbol: 'V', price: '285.43', change: '0.8' },
    { symbol: 'JNJ', price: '154.89', change: '-1.1' },
    { symbol: 'WMT', price: '89.45', change: '2.1' },
    { symbol: 'DIS', price: '92.78', change: '1.5' },
  ];

  const displayStocks = stocks.length > 0 ? stocks : fallbackStocks;

  // Duplicate for seamless loop
  const tickerItems = [...displayStocks, ...displayStocks];

  return (
    <div className="bg-[#1E2D3D] border-y-2 border-blue-900 overflow-hidden">
      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .ticker-scroll {
          animation: scroll-left 60s linear infinite;
          display: flex;
          gap: 2rem;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="overflow-hidden py-3">
        <div className="ticker-scroll">
          {tickerItems.map((stock, idx) => (
            <div key={idx} className="flex items-center gap-4 px-6 whitespace-nowrap flex-shrink-0">
              {idx > 0 && (
                <span className="text-blue-400 text-xs">●</span>
              )}
              <span
                className="font-bold text-sm text-white tracking-wide"
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                {stock.symbol}
              </span>
              <span className="text-blue-300 font-semibold text-sm" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                ${typeof stock.price === 'string' ? stock.price : stock.price.toFixed(2)}
              </span>
              <span
                className={`text-xs font-bold ${
                  parseFloat(stock.change) >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {parseFloat(stock.change) >= 0 ? '▲' : '▼'}{stock.change}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
