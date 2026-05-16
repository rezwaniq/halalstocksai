'use client';

import { useState, FormEvent, useEffect } from 'react';
import Image from 'next/image';
import {
  Search, BarChart3, Zap, Sparkles, Brain, Database, Flag,
  Lightbulb, Wallet, CheckCircle2, Download, Headphones, X, TrendingUp, Check
} from 'lucide-react';
import StockTicker from './components/StockTicker';

interface AnalysisResult {
  ticker: string;
  company: {
    name: string;
    sector: string;
    industry: string;
    marketCap: number;
  };
  ratios: {
    debtToMarketCap: number;
    cashToMarketCap: number;
    impureIncomeRatio: number;
    interestBearingDebtRatio?: number;
    interestBearingDepositsRatio?: number;
  };
  financialMetrics: {
    totalDebtDollars: number;
    interestBearingDebtDollars: number;
    cashDollars: number;
    interestBearingDepositsDollars: number;
    purificationPercentage: number;
  };
  analysis: {
    verdict: 'Halal' | 'Questionable' | 'Non-compliant';
    explanation: string;
  };
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (showAnalyzer) {
    return <AnalyzerPage onClose={() => setShowAnalyzer(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Animated Chart Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="chartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
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
        <nav className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-emerald-500/20">
          <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="HalalStocks AI Logo" width={56} height={56} priority className="rounded-full object-cover" />
              <span className="font-bold text-4xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-rajdhani)' }}>
                HalalStocks AI
              </span>
            </div>
            <button
              onClick={() => setShowAnalyzer(true)}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded font-medium transition shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/80"
            >
              Launch App
            </button>
          </div>
        </nav>

        {/* Stock Ticker - Top */}
        <StockTicker />

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-8 py-32 text-center">
          <div className="mb-8">
            <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-emerald-300 via-white to-cyan-300 bg-clip-text text-transparent leading-tight" style={{ fontFamily: 'var(--font-rajdhani)', letterSpacing: '0.05em' }}>
              ISLAMIC FINANCE<br />INTELLIGENCE
            </h1>
            <p className="text-xl text-gray-400 mb-4">
              The future of Shariah-compliant investing powered by AI
            </p>
            <p className="text-gray-500 text-sm">
              Real-time financial analysis • AAOIFI compliance • Intelligent verdicts
            </p>
          </div>

          <button
            onClick={() => setShowAnalyzer(true)}
            className="group relative px-10 py-4 font-bold text-lg text-black bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-lg hover:from-emerald-500 hover:to-emerald-600 transition shadow-2xl shadow-emerald-500/50 hover:shadow-emerald-500/80 hover:scale-105"
          >
            <span className="relative flex items-center justify-center gap-2">
              Start Analyzing
              <span className="group-hover:translate-x-1 transition">→</span>
            </span>
          </button>
        </section>

        {/* Stats Bar */}
        <section className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
          {[
            { label: '3 AAOIFI Ratios', value: 'Debt • Cash • Impure' },
            { label: '100% Real Data', value: 'Live APIs' },
            { label: '<2s Analysis', value: 'Instant Results' },
            { label: '∞ Stocks', value: 'Global Coverage' },
          ].map((stat, idx) => (
            <div key={idx} className="border border-emerald-500/30 rounded-lg p-4 bg-emerald-500/5 backdrop-blur hover:bg-emerald-500/10 transition">
              <p className="text-emerald-400 font-bold text-sm mb-1">{stat.label}</p>
              <p className="text-gray-400 text-xs">{stat.value}</p>
            </div>
          ))}
        </section>

        {/* How It Works */}
        <section className="max-w-6xl mx-auto px-8 py-24 border-t border-emerald-500/20">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-rajdhani)' }}>
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
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur opacity-0 group-hover:opacity-30 transition"></div>
                  <div className="relative border border-emerald-500/30 rounded-lg p-6 bg-black/50 backdrop-blur hover:bg-emerald-500/5 transition">
                    <div className="text-4xl font-bold text-emerald-500 mb-2" style={{ fontFamily: 'var(--font-space-mono)' }}>{step.num}</div>
                    <div className="text-2xl mb-3"><Icon size={28} className="text-cyan-400" strokeWidth={1.5} /></div>
                    <h3 className="font-bold text-white mb-1" style={{ fontFamily: 'var(--font-rajdhani)' }}>{step.title}</h3>
                    <p className="text-sm text-gray-400">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-6xl mx-auto px-8 py-24 border-t border-emerald-500/20">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-rajdhani)' }}>
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
                <div key={idx} className="border border-emerald-500/20 rounded-lg p-4 bg-black/50 backdrop-blur hover:border-emerald-500/50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <Icon size={24} className="text-cyan-400" strokeWidth={1.5} />
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      feature.status === '✓'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {feature.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white" style={{ fontFamily: 'var(--font-rajdhani)' }}>{feature.title}</h3>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-8 py-24 text-center border-t border-emerald-500/20">
          <h2 className="text-4xl font-bold mb-6" style={{ fontFamily: 'var(--font-rajdhani)' }}>READY TO START?</h2>
          <p className="text-gray-400 mb-10 text-lg">
            Join thousands screening stocks with confidence
          </p>
          <button
            onClick={() => setShowAnalyzer(true)}
            className="group relative px-10 py-4 font-bold text-lg text-black bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-lg hover:from-emerald-500 hover:to-emerald-600 transition shadow-2xl shadow-emerald-500/50 hover:shadow-emerald-500/80 hover:scale-105"
          >
            <span className="relative flex items-center justify-center gap-2">
              Launch Analyzer
              <span className="group-hover:translate-x-1 transition">→</span>
            </span>
          </button>
        </section>

        {/* Footer */}
        <footer className="border-t border-emerald-500/20 py-12 text-center text-gray-500 text-sm">
          <p>&copy; 2026 HalalStocks AI. Powered by AI & Financial Intelligence.</p>
        </footer>
      </div>
    </div>
  );
}

function AnalyzerPage({ onClose }: { onClose: () => void }) {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const tickerToUse = ticker.trim() || search.trim().toUpperCase();

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
      case 'Halal':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'Questionable':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'Non-compliant':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getRatioColor = (value: number, threshold: number) => {
    return value <= threshold ? 'bg-emerald-500' : 'bg-red-500';
  };

  const getMockData = (ticker: string) => {
    const mockCompanies: { [key: string]: AnalysisResult } = {
      'GOOD': {
        ticker: 'GOOD',
        company: {
          name: 'Good Halal Corp',
          sector: 'Technology',
          industry: 'Software',
          marketCap: 500000000000,
        },
        ratios: {
          debtToMarketCap: 0.15,
          cashToMarketCap: 0.25,
          impureIncomeRatio: 0.02,
          interestBearingDebtRatio: 0.1125,
          interestBearingDepositsRatio: 0.125,
        },
        financialMetrics: {
          totalDebtDollars: 75000000000,
          interestBearingDebtDollars: 56250000000,
          cashDollars: 125000000000,
          interestBearingDepositsDollars: 62500000000,
          purificationPercentage: 2,
        },
        analysis: {
          verdict: 'Halal',
          explanation: `This company demonstrates strong Shariah compliance. The debt-to-market-cap ratio of 0.15 is well below the 0.33 threshold, indicating conservative leverage. The impure income ratio of 2% is significantly below the 5% threshold, showing excellent business activity alignment with Islamic principles. The company operates primarily in technology and software, both halal-compliant sectors. Interest-bearing debt represents only 11.25% of market cap, further supporting compliance. The business model is transparent and excludes involvement in prohibited industries. Overall assessment: HALAL - This company is suitable for Islamic investment portfolios.`,
        },
        date: new Date().toISOString().split('T')[0],
      },
      'BAD': {
        ticker: 'BAD',
        company: {
          name: 'Bad Finance Inc',
          sector: 'Financial Services',
          industry: 'Banking',
          marketCap: 300000000000,
        },
        ratios: {
          debtToMarketCap: 0.65,
          cashToMarketCap: 0.12,
          impureIncomeRatio: 0.85,
          interestBearingDebtRatio: 0.4875,
          interestBearingDepositsRatio: 0.06,
        },
        financialMetrics: {
          totalDebtDollars: 195000000000,
          interestBearingDebtDollars: 146250000000,
          cashDollars: 36000000000,
          interestBearingDepositsDollars: 18000000000,
          purificationPercentage: 85,
        },
        analysis: {
          verdict: 'Non-compliant',
          explanation: `This company fails multiple Shariah compliance criteria and is not suitable for Islamic investment. The debt-to-market-cap ratio of 0.65 significantly exceeds the acceptable threshold of 0.33, indicating excessive leverage. Most critically, the impure income ratio of 85% far exceeds the 5% threshold, indicating the company derives the majority of its revenue from non-compliant sources including interest-based banking operations. The company operates in the financial services sector with a core business model built on riba (interest), which is explicitly prohibited in Islamic finance. Interest-bearing debt accounts for 48.75% of market cap. The business structure is fundamentally incompatible with Shariah principles. Overall assessment: NON-COMPLIANT - This company is unsuitable for Islamic investment portfolios.`,
        },
        date: new Date().toISOString().split('T')[0],
      },
    };
    return mockCompanies[ticker.toUpperCase()] || null;
  };

  const renderAnalysisWithSections = (text: string, verdict?: string, ratios?: any) => {
    // Extract summary (first 1-2 sentences)
    const summaryMatch = text.match(/^[^.!?]+[.!?]\s*[^.!?]*[.!?]?/);
    const summary = summaryMatch ? summaryMatch[0].trim() : text.substring(0, 150);

    // Determine Gate 1 status (business activity) - based on impure income
    const gate1Pass = ratios?.impureIncomeRatio <= 0.05;
    const gate1Status = gate1Pass ? 'PASS' : 'FAIL';
    const gate1Color = gate1Pass ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-red-500/10 border-red-500/40';

    // Determine Gate 2 status (financial ratios)
    const gate2Pass = ratios?.debtToMarketCap <= 0.33 && ratios?.impureIncomeRatio <= 0.05;
    const gate2Status = gate2Pass ? 'PASS' : 'FAIL';
    const gate2Color = gate2Pass ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-red-500/10 border-red-500/40';

    // Extract overall assessment and conclusion
    const lastSentence = text.match(/[^.]*[.!?](?!.*[.!?])/)?.[0] || 'See detailed analysis below.';

    return (
      <div className="space-y-5">
        {/* Summary */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Summary</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{summary}</p>
        </div>

        {/* Verdict - Two Gate System */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-cyan-400">Verdict (AAOIFI Standard No. 21 - Two Gate System)</h4>

          {/* Gate 1 */}
          <div className={`${gate1Color} border rounded-lg p-3`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-300">Gate 1 — Business Activity Screening</span>
              <span className={`text-xs font-bold px-2 py-1 rounded ${gate1Pass ? 'bg-emerald-500/30 text-emerald-300' : 'bg-red-500/30 text-red-300'}`}>
                {gate1Status}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Impure Income Ratio: {(ratios?.impureIncomeRatio * 100).toFixed(2)}% (Threshold: 5%)
            </p>
          </div>

          {/* Gate 2 */}
          <div className={`${gate2Color} border rounded-lg p-3`}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-gray-300">Gate 2 — Quantitative Financial Ratios</span>
              <span className={`text-xs font-bold px-2 py-1 rounded ${gate2Pass ? 'bg-emerald-500/30 text-emerald-300' : 'bg-red-500/30 text-red-300'}`}>
                {gate2Status}
              </span>
            </div>
            <div className="space-y-2 text-xs text-gray-400">
              <p>
                <span className="text-gray-300">Ratio 1 — Interest-Bearing Debt:</span> {ratios?.debtToMarketCap.toFixed(4)} (Threshold: 0.33)
              </p>
              <p>
                <span className="text-gray-300">Ratio 2 — Interest-Bearing Cash:</span> {(ratios?.interestBearingDepositsRatio || 0).toFixed(4)}
              </p>
              <p>
                <span className="text-gray-300">Ratio 3 — Impure Income:</span> {(ratios?.impureIncomeRatio * 100).toFixed(2)}% (Threshold: 5%)
              </p>
            </div>
          </div>
        </div>

        {/* Overall Assessment */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">Overall Assessment</h4>
          <p className="text-gray-300 text-sm leading-relaxed">
            According to AAOIFI standards, {lastSentence.toLowerCase().startsWith('this company') ? lastSentence.substring(0, 1).toLowerCase() + lastSentence.substring(1) : lastSentence}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-rajdhani)' }}>
            HALAL STOCK ANALYZER
          </h1>
          <button onClick={onClose} className="text-gray-400 hover:text-emerald-400">
            <X size={28} strokeWidth={1.5} />
          </button>
        </div>

        <div className="bg-black/50 backdrop-blur border border-emerald-500/30 rounded-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-sm text-gray-400 mb-2">Company Name or Ticker</label>
              <input
                id="search-input"
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="Search by name or ticker (e.g., Apple, AAPL)"
                className="w-full px-4 py-3 bg-gray-900 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
              />

              {showDropdown && searchResults.length > 0 && (
                <div id="search-dropdown" className="absolute z-50 w-full mt-1 bg-gray-900 border border-emerald-500/30 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.symbol}
                      type="button"
                      onClick={() => selectCompany(result.symbol)}
                      className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 text-gray-100 border-b border-gray-700 last:border-0 transition"
                    >
                      <div className="font-semibold">{result.name}</div>
                      <div className="text-sm text-gray-400">{result.symbol} • {result.exchange}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-black font-bold py-3 rounded-lg transition disabled:opacity-50 shadow-lg shadow-emerald-500/30"
            >
              {loading ? 'Analyzing...' : 'Analyze Stock'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}
        </div>

        {results && (
          <div className="space-y-3">
            {/* VERDICT HEADER */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 backdrop-blur border border-emerald-500/40 rounded-lg p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-4xl font-black" style={{ fontFamily: 'var(--font-rajdhani)', letterSpacing: '0.05em' }}>
                    {results.ticker}
                  </h2>
                  <p className="text-gray-400 text-sm mt-2">{results.company.name} • {results.company.sector}</p>
                </div>
                <div className="text-right">
                  <div className={`px-6 py-3 rounded-lg border font-bold text-lg mb-2 inline-block ${getVerdictColor(results.analysis.verdict)}`} style={{ fontFamily: 'var(--font-rajdhani)' }}>
                    {results.analysis.verdict.toUpperCase()}
                  </div>
                  <p className="text-gray-400 text-xs">Analysis Date: {results.date}</p>
                </div>
              </div>
            </div>

            {/* BUSINESS ACTIVITY SCREEN */}
            <div className="bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 backdrop-blur border border-emerald-500/40 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-3" style={{ fontFamily: 'var(--font-rajdhani)' }}>BUSINESS ACTIVITY SCREEN</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  {results.ratios.impureIncomeRatio <= 0.05 ? (
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded flex items-center gap-1">
                      <Check size={14} /> PASS
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded flex items-center gap-1">
                      <X size={14} /> FAIL
                    </div>
                  )}
                  <span className="text-gray-400 text-sm">Non-compliant revenue ≤ 5%</span>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300 text-sm">Compliant vs Non-Compliant Revenue</span>
                    <span className="text-emerald-400 font-semibold text-sm">{((1 - results.ratios.impureIncomeRatio) * 100).toFixed(1)}% / {(results.ratios.impureIncomeRatio * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      style={{ width: `${Math.min((1 - results.ratios.impureIncomeRatio) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Compliant Revenue</p>
                    <p className="text-emerald-400 font-bold">{((1 - results.ratios.impureIncomeRatio) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Non-Compliant Revenue</p>
                    <p className="text-red-400 font-bold">{(results.ratios.impureIncomeRatio * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FINANCIAL SCREEN */}
            <div className="bg-gradient-to-r from-cyan-500/5 to-blue-500/5 backdrop-blur border border-cyan-500/40 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-rajdhani)' }}>FINANCIAL SCREEN</h3>
              <div className="space-y-4">
                {/* Debt Ratio */}
                <div className="pb-4 border-b border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    {results.ratios.debtToMarketCap <= 0.33 ? (
                      <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded flex items-center gap-1">
                        <Check size={14} /> PASS
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded flex items-center gap-1">
                        <X size={14} /> FAIL
                      </div>
                    )}
                    <span className="text-gray-300 font-semibold">Interest-Bearing Debt Ratio</span>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mb-2">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-gray-300 text-xs">Interest-Bearing Debt</span>
                      <span className="text-cyan-300 font-bold text-sm">${(results.financialMetrics.interestBearingDebtDollars / 1e9).toFixed(2)}B</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-gray-300 text-xs">Market Cap</span>
                      <span className="text-white font-bold text-sm">${(results.company.marketCap / 1e9).toFixed(2)}B</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center">Ratio: {results.ratios.debtToMarketCap.toFixed(4)} | Threshold: 0.33</p>
                </div>

                {/* Deposits Ratio */}
                <div className="pb-4 border-b border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded flex items-center gap-1">
                      <Check size={12} /> INFO
                    </div>
                    <span className="text-gray-300 font-semibold text-sm">Interest-Bearing Deposits Ratio</span>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-2">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-gray-300 text-xs">Interest-Bearing Deposits</span>
                      <span className="text-blue-300 font-bold text-sm">${(results.financialMetrics.interestBearingDepositsDollars / 1e9).toFixed(2)}B</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-gray-300 text-xs">Market Cap</span>
                      <span className="text-white font-bold text-sm">${(results.company.marketCap / 1e9).toFixed(2)}B</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center">Ratio: {(results.ratios.interestBearingDepositsRatio || 0).toFixed(4)}</p>
                </div>

                {/* Impure Income */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {results.ratios.impureIncomeRatio <= 0.05 ? (
                      <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded flex items-center gap-1">
                        <Check size={12} /> PASS
                      </div>
                    ) : (
                      <div className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded flex items-center gap-1">
                        <X size={12} /> FAIL
                      </div>
                    )}
                    <span className="text-gray-300 font-semibold text-sm">Impure Income Ratio</span>
                  </div>
                  <div className="w-full bg-gray-800/50 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${getRatioColor(results.ratios.impureIncomeRatio, 0.05)}`}
                      style={{ width: `${Math.min((results.ratios.impureIncomeRatio / 0.05) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 text-center">Ratio: {(results.ratios.impureIncomeRatio * 100).toFixed(2)}% | Threshold: 5%</p>
                </div>
              </div>
            </div>

            {/* AI ANALYSIS */}
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-3" style={{ fontFamily: 'var(--font-rajdhani)' }}>SHARIAH COMPLIANCE ANALYSIS</h3>
              <div className="bg-gray-900/50 rounded-lg p-4">
                {renderAnalysisWithSections(results.analysis.explanation, results.analysis.verdict, results.ratios)}
              </div>
            </div>

            {/* PURIFICATION */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur border border-purple-500/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-rajdhani)' }}>PURIFICATION REQUIREMENT</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Recommended Donation (Zakat Purification)</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-rajdhani)' }}>
                    {results.financialMetrics.purificationPercentage.toFixed(2)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs mb-1">Of annual gains to charitable causes</p>
                  <p className="text-gray-500 text-xs">Calculated based on non-compliant revenue</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
