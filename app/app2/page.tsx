'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import PurificationCalculator from '../components/PurificationCalculator';
import GeopoliticalExposure from '../components/GeopoliticalExposure';

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

export default function App2Page() {
  const [search, setSearch] = useState('');
  const [ticker, setTicker] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const searchBox = document.getElementById('search-input-2');
      const dropdown = document.getElementById('search-dropdown-2');
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
    setTicker('');
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
    const tickerToUse = search.trim().toUpperCase() || ticker.trim().toUpperCase();
    if (!tickerToUse) {
      setError('Please enter a ticker symbol');
      return;
    }
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch('/api/analyze-stock-2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: tickerToUse }),
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

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a href="/" className="text-gray-400 hover:text-blue-500 text-sm font-medium">← Back</a>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-xl bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent">
              HalalStocks AI — App 2
            </span>
          </div>
          <span className="text-xs text-gray-400 bg-purple-50 border border-purple-200 rounded px-3 py-1">
            Experimental — Primary activity classification
          </span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent">
            HALAL STOCK ANALYZER — APP 2
          </h1>
        </div>

        {/* Search Form */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-sm text-gray-600 mb-2">Company Name or Ticker</label>
              <input
                id="search-input-2"
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="Search by name or ticker (e.g., Apple, AAPL)"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50"
              />
              {showDropdown && searchResults.length > 0 && (
                <div id="search-dropdown-2" className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
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
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 shadow-lg shadow-purple-600/30"
            >
              {loading ? 'Analyzing...' : 'Analyze Stock-2'}
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
                  <h2 className="text-4xl font-black text-gray-900">{results.ticker}</h2>
                  <p className="text-gray-600 text-sm mt-2">{results.company.name} • {results.company.sector}</p>
                </div>
                <div className="text-right">
                  <div className={`px-6 py-3 rounded-lg border font-bold text-lg mb-2 inline-block ${getVerdictColor(results.analysis.verdict)}`}>
                    {results.analysis.verdict.toUpperCase()}
                  </div>
                  <p className="text-gray-500 text-xs">Analysis Date: {results.date}</p>
                </div>
              </div>
            </div>

            {/* BUSINESS ACTIVITY SCREEN */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">BUSINESS ACTIVITY SCREEN</h3>
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
                <h3 className="text-lg font-bold text-gray-900">FINANCIAL SCREEN</h3>
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
              <h3 className="text-lg font-bold text-gray-900 mb-3">SHARIAH COMPLIANCE ANALYSIS</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Summary</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{results.analysis.explanation.split('\n')[0]}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-purple-500">Verdict (AAOIFI Standard No. 21 — Two Gate System)</h4>

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
                      <p><span className="font-semibold">Questionable revenue:</span> {results.gate1.questionableRevenue.toFixed(2)}% (shown for awareness)
                        {' '}{results.gate1.questionableRevenue < 5 ? '✓' : '⚠'}
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
                    <div className="space-y-1 text-xs text-gray-700">
                      <p><span className="font-semibold">Interest-Bearing Debt / Total Assets:</span> {(results.financialRatios.interestBearingDebt.ratio * 100).toFixed(2)}% (Threshold: 33%) {results.gate2.debtRatioPasses ? '✓' : '✗'}</p>
                      <p><span className="font-semibold">Interest-Bearing Deposits / Total Assets:</span> {(results.financialRatios.interestBearingDeposits.ratio * 100).toFixed(2)}% (Threshold: 33%) {results.gate2.depositsRatioPasses ? '✓' : '✗'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-purple-600 mb-1">Overall Assessment</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{results.analysis.explanation.split('\n')[0]}</p>
                </div>
              </div>
            </div>

            {/* PURIFICATION CALCULATOR */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">🧼 PURIFICATION CALCULATOR (AAOIFI STANDARD NO. 21)</h3>
              <PurificationCalculator
                verdict={results.analysis.verdict.toLowerCase() as 'halal' | 'questionable' | 'non-compliant'}
                impureIncomePercentage={results.purificationPercentage}
              />
            </div>

            {/* GEOPOLITICAL EXPOSURE */}
            <GeopoliticalExposure
              ticker={results.ticker}
              companyName={results.company.name}
            />

          </div>
        )}
      </div>
    </div>
  );
}
