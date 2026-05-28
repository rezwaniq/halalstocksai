'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Search, BarChart3, Zap, Sparkles, Brain, Database, Flag,
  Lightbulb, Wallet, CheckCircle2, Download, Headphones, X, Check
} from 'lucide-react';
import StockTicker from './components/StockTicker';
import PurificationCalculator from './components/PurificationCalculator';
import GeopoliticalExposure from './components/GeopoliticalExposure';

interface RevenueSegment {
  name: string;
  revenue: number;
  percentage: number;
  classification: 'compliant' | 'questionable' | 'non-compliant';
  reason: string;
}

interface AnalysisResult {
  ticker: string;
  company: {
    name: string;
    sector: string;
    industry: string;
    marketCap: number;
  };
  revenueBreakdown: {
    compliant: number;
    questionable: number;
    nonCompliant: number;
    segments: RevenueSegment[];
    dataSource: string;
  };
  financialRatios: {
    interestBearingDebt: {
      amount: number;
      totalAssets: number;
      ratio: number;
      passes: boolean;
    };
    interestBearingDeposits: {
      amount: number;
      totalAssets: number;
      ratio: number;
      passes: boolean;
    };
  };
  gate1: {
    passes: boolean;
    nonCompliantRevenue: number;
    questionableRevenue: number;
  };
  gate2: {
    passes: boolean;
    debtRatioPasses: boolean;
    depositsRatioPasses: boolean;
  };
  analysis: {
    verdict: 'Halal' | 'Questionable' | 'Non-compliant';
    explanation: string;
  };
  purificationPercentage: number;
  date: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
}

export default function Home() {
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#3B82F6" strokeWidth="0.5" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Animated Chart Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="chartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Chart 1 - Top Left */}
          <polyline
            points="0,300 100,250 200,280 300,150 400,200 500,100"
            fill="none"
            stroke="url(#chartGrad)"
            strokeWidth="2"
            filter="url(#glow)"
            style={{ animation: 'float 6s ease-in-out infinite' }}
          />

          {/* Chart 2 - Top Right */}
          <polyline
            points="1000,200 1100,180 1200,220 1300,160 1400,190"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2"
            filter="url(#glow)"
            style={{ animation: 'float 7s ease-in-out infinite 1s' }}
          />

          {/* Chart 3 - Bottom Left */}
          <polyline
            points="100,800 200,750 300,800 400,700 500,750 600,650"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
            filter="url(#glow)"
            style={{ animation: 'float 8s ease-in-out infinite 2s' }}
          />
        </svg>


        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-30px); }
          }
          @keyframes glow {
            0%, 100% { filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.5)); }
            50% { filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.8)); }
          }
        `}</style>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0">
                <Image src="/logo.png" alt="HalalStocks AI Logo" width={52} height={52} priority className="rounded-full object-cover" />
              </div>
              <span className="font-bold text-3xl bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-poppins)' }}>
                HalalStocks AI
              </span>
            </div>
            <button
              onClick={() => setShowAnalyzer(true)}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded font-medium text-white transition shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
            >
              Launch App
            </button>
            <a
              href="/app2"
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded font-medium text-white transition shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
            >
              Launch App-2
            </a>
          </div>
        </nav>

        {/* Stock Ticker - Top */}
        <StockTicker />

        {!showAnalyzer ? (
          <>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-8 py-14 text-center">
          <div className="mb-8" style={{ animation: 'fadeInDown 0.8s ease-out 0.2s both' }}>
            <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-blue-600 via-gray-900 to-blue-400 bg-clip-text text-transparent leading-tight" style={{ fontFamily: 'var(--font-poppins)', letterSpacing: '0.02em' }}>
              GROW YOUR WEALTH<br />WITHOUT COMPROMISING PRINCIPLES
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              The future of Shariah-compliant investing powered by AI
            </p>
            <p className="text-gray-500 text-sm">
              Real-time financial analysis • AAOIFI compliance • Intelligent verdicts
            </p>
          </div>

          <div style={{ animation: 'fadeInUp 0.8s ease-out 0.4s both' }}>
            <button
              onClick={() => setShowAnalyzer(true)}
              className="group relative px-10 py-4 font-bold text-lg text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
            >
              <span className="relative flex items-center justify-center gap-2">
                Start Analyzing
                <span className="group-hover:translate-x-1 transition">→</span>
              </span>
            </button>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 mb-8" style={{ animation: 'fadeInUp 0.8s ease-out 0.6s both' }}>
          {[
            { label: '3 AAOIFI Ratios', value: 'Debt • Cash • Impure' },
            { label: '100% Real Data', value: 'Live APIs' },
            { label: '<2s Analysis', value: 'Instant Results' },
            { label: '∞ Stocks', value: 'Global Coverage' },
          ].map((stat, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition">
              <p className="text-blue-500 font-bold text-sm mb-1">{stat.label}</p>
              <p className="text-gray-500 text-xs">{stat.value}</p>
            </div>
          ))}
        </section>

        <style>{`
          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        {/* How It Works */}
        <section className="max-w-6xl mx-auto px-8 py-10 border-t border-gray-200" style={{ animation: 'fadeInUp 0.8s ease-out 0.8s both' }}>
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-poppins)' }}>
            HOW IT WORKS
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Enter Ticker', Icon: Search, desc: 'Search any stock' },
              { num: '02', title: 'Fetch Data', Icon: BarChart3, desc: 'Real-time data' },
              { num: '03', title: 'AI Analysis', Icon: Brain, desc: 'Smart verification' },
              { num: '04', title: 'Get Verdict', Icon: Sparkles, desc: 'Halal/Non-compliant' },
            ].map((step, idx) => {
              const Icon = step.Icon;
              return (
                <div key={idx} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg blur opacity-0 group-hover:opacity-20 transition"></div>
                  <div className="relative border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition">
                    <div className="text-4xl font-bold text-blue-500 mb-2" style={{ fontFamily: 'var(--font-space-mono)' }}>{step.num}</div>
                    <div className="text-2xl mb-3"><Icon size={28} className="text-blue-500" strokeWidth={1.5} /></div>
                    <h3 className="font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-6xl mx-auto px-8 py-10 border-t border-gray-200" style={{ animation: 'fadeInUp 0.8s ease-out 1s both' }}>
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-poppins)' }}>
            POWERFUL FEATURES
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { Icon: Brain, title: 'AI Verdicts', status: '✓' },
              { Icon: Database, title: 'Data Source', status: '✓' },
              { Icon: Flag, title: 'TSX Stocks', status: 'Limited' },
              { Icon: Lightbulb, title: 'Alternatives', status: '✓' },
              { Icon: Wallet, title: 'Zakat Calc', status: 'Pro' },
              { Icon: CheckCircle2, title: 'Purification', status: 'Basic' },
              { Icon: Download, title: 'Download', status: '✓' },
              { Icon: Headphones, title: '24/7 Support', status: '✓' },
            ].map((feature, idx) => {
              const Icon = feature.Icon;
              return (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-2">
                    <Icon size={24} className="text-blue-500" strokeWidth={1.5} />
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      feature.status === '✓'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {feature.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>{feature.title}</h3>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-8 py-10 text-center border-t border-gray-200" style={{ animation: 'fadeInUp 0.8s ease-out 1.2s both' }}>
          <h2 className="text-4xl font-bold mb-6 text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>READY TO START?</h2>
          <p className="text-gray-600 mb-10 text-lg">
            Join thousands screening stocks with confidence
          </p>
          <button
            onClick={() => setShowAnalyzer(true)}
            className="group relative px-10 py-4 font-bold text-lg text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
          >
            <span className="relative flex items-center justify-center gap-2">
              Launch Analyzer
              <span className="group-hover:translate-x-1 transition">→</span>
            </span>
          </button>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 py-6 text-center text-gray-500 text-sm">
          <p>&copy; 2026 HalalStocks AI. Powered by AI & Financial Intelligence.</p>
        </footer>
          </>
        ) : (
          <AnalyzerContent onClose={() => setShowAnalyzer(false)} />
        )}
      </div>
    </div>
  );
}

function AnalyzerContent({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [ticker, setTicker] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const searchBox = document.getElementById('search-input');
      const dropdown = document.getElementById('search-dropdown');
      if (
        searchBox &&
        dropdown &&
        !searchBox.contains(e.target as Node) &&
        !dropdown.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    setSearch(query);
    setTicker(''); // Clear old ticker when user types new search
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      const res = await fetch('/api/search-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
      setShowDropdown(true);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const selectCompany = (symbol: string) => {
    setTicker(symbol);
    setSearch(symbol);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use search field value as priority (most recent user input)
    const tickerToUse = search.trim().toUpperCase() || ticker.trim().toUpperCase();

    if (!tickerToUse) {
      setError('Please enter a ticker symbol');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      // Check for mock data first
      const mockData = getMockData(tickerToUse);
      if (mockData) {
        setResults(mockData);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/analyze-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: tickerToUse.toUpperCase() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Analysis failed');
      }

      const data: AnalysisResult = await res.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'Halal': return 'bg-green-100 text-green-700 border-green-300';
      case 'Questionable': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Non-compliant': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getSegmentColor = (cls: RevenueSegment['classification']) => {
    if (cls === 'compliant') return 'bg-green-100 text-green-700';
    if (cls === 'questionable') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const getMockData = (_ticker: string): AnalysisResult | null => null;

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-poppins)' }}>
          HALAL STOCK ANALYZER
        </h1>
        <button onClick={onClose} className="text-gray-400 hover:text-blue-500">
          <X size={28} strokeWidth={1.5} />
        </button>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm text-gray-600 mb-2">Company Name or Ticker</label>
            <input
              id="search-input"
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Search by name or ticker (e.g., Apple, AAPL)"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50"
            />
            {showDropdown && searchResults.length > 0 && (
              <div id="search-dropdown" className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    type="button"
                    onClick={() => selectCompany(result.symbol)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 border-b border-gray-200 last:border-0 transition"
                  >
                    <div className="font-semibold">{result.name}</div>
                    <div className="text-sm text-gray-500">{result.symbol} • {result.exchange}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-600/30"
          >
            {loading ? 'Analyzing...' : 'Analyze Stock'}
          </button>
        </form>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700">{error}</div>
        )}
      </div>

      {results && (
        <div className="space-y-3">

          {/* VERDICT HEADER */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-black text-gray-900" style={{ fontFamily: 'var(--font-rajdhani)', letterSpacing: '0.05em' }}>
                  {results.ticker}
                </h2>
                <p className="text-gray-600 text-sm mt-2">{results.company.name} • {results.company.sector}</p>
              </div>
              <div className="text-right">
                <div className={`px-6 py-3 rounded-lg border font-bold text-lg mb-2 inline-block ${getVerdictColor(results.analysis.verdict)}`} style={{ fontFamily: 'var(--font-poppins)' }}>
                  {results.analysis.verdict.toUpperCase()}
                </div>
                <p className="text-gray-500 text-xs">Analysis Date: {results.date}</p>
              </div>
            </div>
          </div>

          {/* BUSINESS ACTIVITY SCREEN */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>BUSINESS ACTIVITY SCREEN</h3>
              <div className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 ${
                results.gate1.passes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {results.gate1.passes ? <><Check size={12} /> PASS</> : <><X size={12} /> FAIL</>}
              </div>
            </div>

            {/* 3-tier revenue bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Revenue Breakdown</span>
                <span className="font-mono">
                  <span className="text-green-600">{results.revenueBreakdown.compliant.toFixed(2)}%</span>
                  {' / '}
                  <span className="text-amber-600">{results.revenueBreakdown.questionable.toFixed(2)}%</span>
                  {' / '}
                  <span className="text-red-600">{results.revenueBreakdown.nonCompliant.toFixed(2)}%</span>
                </span>
              </div>
              <div className="flex h-4 rounded-full overflow-hidden border border-gray-200">
                <div className="bg-green-500 transition-all" style={{ width: `${results.revenueBreakdown.compliant}%` }} />
                <div className="bg-amber-400 transition-all" style={{ width: `${results.revenueBreakdown.questionable}%` }} />
                <div className="bg-red-500 transition-all" style={{ width: `${results.revenueBreakdown.nonCompliant}%` }} />
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Compliant</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Questionable</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Non-Compliant</span>
              </div>
            </div>

            {/* 3-tile summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Compliant</p>
                <p className="text-green-700 font-bold text-lg">{results.revenueBreakdown.compliant.toFixed(2)}%</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Questionable</p>
                <p className="text-amber-700 font-bold text-lg">{results.revenueBreakdown.questionable.toFixed(2)}%</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Non-Compliant</p>
                <p className="text-red-700 font-bold text-lg">{results.revenueBreakdown.nonCompliant.toFixed(2)}%</p>
              </div>
            </div>

            {/* Segment breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue by Segment</p>
              {results.revenueBreakdown.segments.map((seg, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{seg.name}</p>
                    <p className="text-xs text-gray-500 truncate">{seg.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className="text-sm font-mono font-semibold text-gray-700">{seg.percentage.toFixed(2)}%</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${getSegmentColor(seg.classification)}`}>
                      {seg.classification}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-3">Source: {results.revenueBreakdown.dataSource}</p>
          </div>

          {/* FINANCIAL SCREEN */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>FINANCIAL SCREEN</h3>
              <div className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 ${
                results.gate2.passes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {results.gate2.passes ? <><Check size={12} /> PASS</> : <><X size={12} /> FAIL</>}
              </div>
            </div>
            <div className="space-y-4">

              {/* Debt Ratio */}
              <div className="pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 ${
                    results.gate2.debtRatioPasses ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {results.gate2.debtRatioPasses ? <><Check size={12} /> PASS</> : <><X size={12} /> FAIL</>}
                  </div>
                  <span className="text-gray-700 font-semibold text-sm">Interest-Bearing Debt Ratio</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-gray-600 text-xs">Interest-Bearing Debt (bonds + notes)</span>
                    <span className="text-blue-500 font-bold text-sm">${(results.financialRatios.interestBearingDebt.amount / 1e9).toFixed(2)}B</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-600 text-xs">Total Assets</span>
                    <span className="text-gray-900 font-bold text-sm">${(results.financialRatios.interestBearingDebt.totalAssets / 1e9).toFixed(2)}B</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Ratio: {(results.financialRatios.interestBearingDebt.ratio * 100).toFixed(2)}% | Threshold: 33%
                </p>
              </div>

              {/* Deposits Ratio */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 ${
                    results.gate2.depositsRatioPasses ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {results.gate2.depositsRatioPasses ? <><Check size={12} /> PASS</> : <><X size={12} /> FAIL</>}
                  </div>
                  <span className="text-gray-700 font-semibold text-sm">Interest-Bearing Deposits Ratio</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-gray-600 text-xs">Cash + Short-Term Investments</span>
                    <span className="text-blue-500 font-bold text-sm">${(results.financialRatios.interestBearingDeposits.amount / 1e9).toFixed(2)}B</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-600 text-xs">Total Assets</span>
                    <span className="text-gray-900 font-bold text-sm">${(results.financialRatios.interestBearingDeposits.totalAssets / 1e9).toFixed(2)}B</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Ratio: {(results.financialRatios.interestBearingDeposits.ratio * 100).toFixed(2)}% | Threshold: 33%
                </p>
              </div>
            </div>
          </div>

          {/* SHARIAH COMPLIANCE ANALYSIS */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-poppins)' }}>SHARIAH COMPLIANCE ANALYSIS</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Summary</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{results.analysis.explanation.split('\n')[0]}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-blue-500">Verdict (AAOIFI Standard No. 21 — Two Gate System)</h4>

                {/* Gate 1 */}
                <div className={`border rounded-lg p-3 ${results.gate1.passes ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">Gate 1 — Business Activity Screening</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${results.gate1.passes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {results.gate1.passes ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-700">
                    <p><span className="font-semibold">Non-compliant revenue:</span> {results.gate1.nonCompliantRevenue.toFixed(2)}% (Threshold: 5%)
                      {' '}{results.gate1.passes ? '✓' : '✗'}
                    </p>
                    <p><span className="font-semibold">Questionable revenue:</span> {results.gate1.questionableRevenue.toFixed(2)}% (Threshold: 5%)
                      {' '}{results.gate1.questionableRevenue < 5 ? '✓' : '⚠'}
                    </p>
                    <p className="mt-1 leading-relaxed text-gray-600">
                      {results.gate1.passes
                        ? `✓ Non-compliant revenue is below the 5% AAOIFI threshold.`
                        : `✗ Non-compliant revenue exceeds the 5% AAOIFI threshold.`}
                      {results.gate1.questionableRevenue >= 5 && ` Questionable revenue (${results.gate1.questionableRevenue.toFixed(2)}%) is significant and drives the overall verdict to Questionable.`}
                    </p>
                  </div>
                </div>

                {/* Gate 2 */}
                <div className={`border rounded-lg p-3 ${results.gate2.passes ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">Gate 2 — Quantitative Financial Ratios</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${results.gate2.passes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {results.gate2.passes ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-gray-700">
                    <div>
                      <p className="font-semibold">Interest-Bearing Debt / Total Assets: {(results.financialRatios.interestBearingDebt.ratio * 100).toFixed(2)}% (Threshold: 33%) {results.gate2.debtRatioPasses ? '✓' : '✗'}</p>
                      <p className="text-gray-600 leading-relaxed">
                        {results.gate2.debtRatioPasses
                          ? `✓ Bonds and notes payable are well within AAOIFI limits — the company does not rely heavily on riba-based financing.`
                          : `✗ Interest-bearing debt exceeds the 33% threshold, indicating excessive reliance on riba-based financing.`}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Interest-Bearing Deposits / Total Assets: {(results.financialRatios.interestBearingDeposits.ratio * 100).toFixed(2)}% (Threshold: 33%) {results.gate2.depositsRatioPasses ? '✓' : '✗'}</p>
                      <p className="text-gray-600 leading-relaxed">
                        {results.gate2.depositsRatioPasses
                          ? `✓ Cash and short-term investments are within acceptable AAOIFI limits.`
                          : `✗ Cash and investments held in interest-bearing accounts exceed the 33% threshold.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-blue-500 mb-1">Overall Assessment</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{results.analysis.explanation.split('\n')[0]}</p>
              </div>
            </div>
          </div>

          {/* PURIFICATION CALCULATOR */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>🧼 PURIFICATION CALCULATOR (AAOIFI STANDARD NO. 21)</h3>
            <PurificationCalculator
              verdict={results.analysis.verdict.toLowerCase() as 'halal' | 'questionable' | 'non-compliant'}
              impureIncomePercentage={results.purificationPercentage}
            />
          </div>

          {/* GEOPOLITICAL EXPOSURE INTELLIGENCE */}
          <GeopoliticalExposure
            ticker={results.ticker}
            companyName={results.company.name}
          />

        </div>
      )}
    </div>
  );
}
