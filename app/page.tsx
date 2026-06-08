'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Search, Brain, Database, Flag,
  Lightbulb, Wallet, CheckCircle2, Download, X, Check,
  Shield, ChevronRight, Globe, BarChart3,
  Crosshair, ShieldAlert, Building2, ArrowRight, Zap,
} from 'lucide-react';
import StockTicker from './components/StockTicker';
import PurificationCalculator from './components/PurificationCalculator';
import GeopoliticalExposure from './components/GeopoliticalExposure';
import SignupModal from './components/SignupModal';
import AccountMenu from './components/AccountMenu';
import RubikCube from './components/RubikCube';

interface UsageSummary {
  analyzeStock: { remaining: number; resetAt: string };
  geopoliticalExposure: { remaining: number; resetAt: string };
}

type AuthState = 'loading' | 'unauthenticated' | 'approved';

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
  const [showSignup, setShowSignup] = useState(false);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'approved') {
          setAuthState('approved');
          setUsage(data.usage);
          setUserEmail(data.email);
        } else {
          setAuthState('unauthenticated');
        }
      })
      .catch(() => setAuthState('unauthenticated'));
  }, []);

  const handleLaunchAnalyzer = () => {
    if (authState === 'approved') {
      setShowAnalyzer(true);
    } else {
      setShowSignup(true);
    }
  };

  const handleApproved = () => {
    setShowSignup(false);
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'approved') {
          setAuthState('approved');
          setUsage(data.usage);
          setUserEmail(data.email);
          setShowAnalyzer(true);
        }
      });
  };

  const handleSignOut = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    setAuthState('unauthenticated');
    setUsage(null);
    setUserEmail('');
    setShowAnalyzer(false);
  };

  const refreshUsage = () => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'approved') setUsage(data.usage);
      });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {showSignup && (
        <SignupModal onApproved={handleApproved} onClose={() => setShowSignup(false)} />
      )}
      {/* Subtle gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[600px]" style={{
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.07) 0%, rgba(99,102,241,0.05) 50%, transparent 70%)',
          filter: 'blur(40px)'
        }} />
        <div className="absolute top-1/2 -right-32 w-[500px] h-[500px]" style={{
          background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.04) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }} />
      </div>

      <div className="relative z-10">
        {/* ─── Navigation ─── */}
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="HalalStocks AI" width={36} height={36} priority className="flex-shrink-0" />
              <span className="font-bold text-xl text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
                HalalStocks<span className="text-blue-600"> AI</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition">How it works</a>
              <a href="#features" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition">Features</a>
              <a href="#standards" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition">Standards</a>
            </div>

            <div className="flex items-center gap-3">
              {authState === 'approved' && (
                <button
                  onClick={handleLaunchAnalyzer}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-sm text-white transition shadow-md shadow-blue-500/20"
                >
                  Launch App
                </button>
              )}
              <AccountMenu
                authState={authState}
                userEmail={userEmail}
                onSignIn={() => setShowSignup(true)}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </nav>

        {/* Stock Ticker */}
        <StockTicker />

        {!showAnalyzer ? (
          <>
            {/* ─── Hero ─── */}
            <section className="max-w-7xl mx-auto px-6 pt-16 pb-16">
              <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                {/* ── Text column ── */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold text-blue-700">
                    <Shield size={12} />
                    AAOIFI Standard No. 21 · Two-Gate Screening
                  </div>

                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Grow Your Wealth<br />
                    <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                      the Halal Way.
                    </span>
                  </h1>

                  <p className="text-xl text-gray-500 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                    AI-powered Shariah compliance screening built on real financial data and the globally accepted AAOIFI methodology.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-center lg:justify-start mb-10">
                    <button
                      onClick={handleLaunchAnalyzer}
                      className="group flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition hover:scale-[1.02] text-base"
                    >
                      {authState === 'approved' ? 'Launch Analyzer' : 'Request Early Access'}
                      <ChevronRight size={18} className="group-hover:translate-x-0.5 transition" />
                    </button>
                    <a
                      href="#how-it-works"
                      className="flex items-center gap-2 px-8 py-4 border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-xl transition hover:bg-gray-50 text-base"
                    >
                      See How It Works
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-gray-500">
                    {['Early access trial', 'Real financial data', 'AAOIFI methodology', 'Instant AI analysis'].map((t, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <Check size={13} className="text-green-500 flex-shrink-0" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ── Rubik Cube column ── */}
                <div className="flex-shrink-0 flex items-center justify-center">
                  <RubikCube />
                </div>
              </div>
            </section>

            {/* ─── Standards bar ─── */}
            <section className="border-y border-gray-100 bg-gray-50/50 py-8">
              <div className="max-w-6xl mx-auto px-6">
                <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
                  Built on trusted standards and live data
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { Icon: Shield, label: 'AAOIFI No. 21', sub: 'Two-Gate Methodology' },
                    { Icon: Database, label: 'Live Financial Data', sub: 'Real SEC filings' },
                    { Icon: Brain, label: 'AI-Powered Analysis', sub: 'Claude AI' },
                    { Icon: Globe, label: 'Global Coverage', sub: 'NYSE, NASDAQ, TSX' },
                  ].map(({ Icon, label, sub }, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ─── Stats ─── */}
            <section className="max-w-6xl mx-auto px-6 py-16">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-black text-gray-900 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                  Built for Muslim Investors
                </h2>
                <p className="text-gray-500 text-lg">Rigorous analysis you can trust</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                  { value: '5,000+', label: 'Global Stocks', sub: 'NYSE, NASDAQ & more' },
                  { value: '2', label: 'AAOIFI Gates', sub: 'Standard No. 21' },
                  { value: '<2s', label: 'Analysis Speed', sub: 'Real-time results' },
                  { value: '100%', label: 'Real Data', sub: 'No estimates used' },
                ].map((stat, i) => (
                  <div key={i} className="border border-gray-100 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition text-center">
                    <p className="text-4xl font-black text-blue-600 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>{stat.value}</p>
                    <p className="font-bold text-gray-900 text-sm">{stat.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ─── Geopolitical Intelligence Feature Showcase ─── */}
            <section className="bg-slate-900 py-20">
              <div className="max-w-6xl mx-auto px-6">

                {/* ── header ── */}
                <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold text-blue-300">
                    <Globe size={12} />
                    Geopolitical Intelligence — Exclusive Feature
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Invest Beyond<br />
                    <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                      Compliance.
                    </span>
                  </h2>
                  <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                    HalalStocks AI is the <span className="text-white font-semibold">only</span> halal screener with built-in{' '}
                    <span className="text-blue-300 font-semibold">Geopolitical Intelligence</span> — so your investments reflect your <em>complete</em> ethical values.
                  </p>
                </div>

                {/* ── three feature rows ── */}
                <div className="space-y-5 mb-16">
                  {([
                    {
                      num: '01',
                      Icon: Crosshair,
                      title: 'Conflict Zones Exposure',
                      desc: 'Identify companies with revenue or operations tied to active conflict zones. Know exactly where your money is deployed — and whether it funds human suffering.',
                      tags: ['DRC Congo','Myanmar','Ukraine','Sudan','Nigeria','Ethiopia'],
                      color: '#f87171',
                      ringColor: 'rgba(239,68,68,.18)',
                      glow: 'rgba(239,68,68,.06)',
                      border: 'rgba(239,68,68,.18)',
                    },
                    {
                      num: '02',
                      Icon: ShieldAlert,
                      title: 'Sanctions & High Risk Regions',
                      desc: 'Screen for exposure to heavily sanctioned states or regions. Go beyond Shariah thresholds and apply global human rights standards to every holding.',
                      tags: ['Iran','Russia','China','North Korea','Israel'],
                      color: '#fb923c',
                      ringColor: 'rgba(251,146,60,.18)',
                      glow: 'rgba(251,146,60,.06)',
                      border: 'rgba(251,146,60,.18)',
                    },
                    {
                      num: '03',
                      Icon: Building2,
                      title: 'Department of Defence Contracts',
                      desc: 'Reveal companies holding US DoD contracts — for investors who apply ethical criteria that extend beyond standard halal screening methodology.',
                      tags: ['Lockheed Martin','RTX','Boeing','Northrop','L3Harris'],
                      color: '#fbbf24',
                      ringColor: 'rgba(251,191,36,.18)',
                      glow: 'rgba(251,191,36,.06)',
                      border: 'rgba(251,191,36,.18)',
                    },
                  ] as const).map(({ num, Icon, title, desc, tags, color, ringColor, glow, border }) => (
                    <div key={title} className="group relative flex flex-col lg:flex-row items-start lg:items-center gap-6 rounded-2xl px-7 py-6 transition-all duration-300" style={{ background: glow, border: `1px solid ${border}` }}>
                      {/* step number */}
                      <div className="font-black text-5xl leading-none flex-shrink-0 select-none" style={{ color: `${color}20`, fontFamily: 'var(--font-poppins)', minWidth: '3rem' }}>
                        {num}
                      </div>
                      {/* icon circle */}
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: `${color}14`, border: `1px solid ${ringColor}`, boxShadow: `0 0 24px ${color}18` }}>
                        <Icon size={24} style={{ color }} strokeWidth={1.6} />
                      </div>
                      {/* text */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-white mb-1.5" style={{ fontFamily: 'var(--font-poppins)' }}>{title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                      </div>
                      {/* tags */}
                      <div className="flex flex-wrap gap-2 lg:justify-end lg:max-w-[220px] flex-shrink-0">
                        {tags.map(t => (
                          <span key={t} className="text-xs font-semibold border rounded-lg px-2.5 py-1 transition" style={{ color, borderColor: `${color}35`, background: `${color}0d` }}>{t}</span>
                        ))}
                      </div>
                      {/* right arrow accent */}
                      <ArrowRight size={16} className="hidden lg:block flex-shrink-0 opacity-20 transition-opacity group-hover:opacity-50" style={{ color }} />
                    </div>
                  ))}
                </div>

                {/* ── comparison table ── */}
                <div className="grid md:grid-cols-2 gap-4 mb-10">
                  {/* Other screeners */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                        <X size={12} className="text-gray-400" strokeWidth={2.5} />
                      </div>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Other Halal Screeners</p>
                    </div>
                    <ul className="space-y-3">
                      {[
                        'Shariah revenue ratios only',
                        'Basic Halal / Haram verdict',
                        'No geopolitical context whatsoever',
                      ].map(item => (
                        <li key={item} className="flex items-center gap-3 text-gray-500 text-sm">
                          <X size={13} className="text-gray-600 flex-shrink-0" strokeWidth={2} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* HalalStocks AI */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center">
                        <Zap size={12} className="text-blue-400" strokeWidth={2.5} />
                      </div>
                      <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">HalalStocks AI</p>
                    </div>
                    <ul className="space-y-3">
                      {[
                        'AAOIFI two-gate Shariah screening',
                        'Conflict zones exposure screening',
                        'Sanctions & high-risk region screening',
                        'US Defence contract screening',
                        'AI-powered ethical verdict + purification calc',
                      ].map(item => (
                        <li key={item} className="flex items-center gap-3 text-white text-sm">
                          <Check size={13} className="text-green-400 flex-shrink-0" strokeWidth={2.5} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* ── CTA ── */}
                <div className="text-center">
                  <button
                    onClick={handleLaunchAnalyzer}
                    className="group inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/40 text-base"
                  >
                    {authState === 'approved' ? 'Launch Analyzer' : 'Try Geopolitical Screening'}
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition" />
                  </button>
                </div>

              </div>
            </section>

            {/* ─── How It Works ─── */}
            <section id="how-it-works" className="bg-gray-50/70 border-y border-gray-100 py-16">
              <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-10">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">Simple Process</p>
                  <h2 className="text-4xl font-black text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>How It Works</h2>
                </div>
                <div className="grid md:grid-cols-4 gap-5">
                  {[
                    { num: '01', title: 'Search a Stock', Icon: Search, desc: 'Enter any company name or ticker from NYSE, NASDAQ, or TSX.' },
                    { num: '02', title: 'Fetch Live Data', Icon: Database, desc: 'We pull real-time financial data directly from SEC filings and market APIs.' },
                    { num: '03', title: 'AI Screens It', Icon: Brain, desc: 'Claude AI applies the AAOIFI two-gate methodology to assess compliance.' },
                    { num: '04', title: 'Get Your Verdict', Icon: CheckCircle2, desc: 'Receive Halal, Questionable, or Non-compliant with a full breakdown.' },
                  ].map((step, idx) => {
                    const Icon = step.Icon;
                    return (
                      <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
                          <Icon size={20} className="text-white" strokeWidth={2} />
                        </div>
                        <div className="text-xs font-bold text-blue-400 mb-1 tracking-wider">{step.num}</div>
                        <h3 className="font-bold text-gray-900 mb-2 text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>{step.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ─── Features ─── */}
            <section id="features" className="max-w-6xl mx-auto px-6 py-16">
              <div className="text-center mb-10">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">Everything You Need</p>
                <h2 className="text-4xl font-black text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Powerful Features</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {([
                  { Icon: Brain, title: 'AI Verdicts', desc: 'Claude AI-powered Shariah analysis', status: 'Live', color: 'green' },
                  { Icon: Database, title: 'Real Data', desc: 'SEC filings & live market data', status: 'Live', color: 'green' },
                  { Icon: Flag, title: 'TSX Stocks', desc: 'Canadian market coverage', status: 'Limited', color: 'amber' },
                  { Icon: Lightbulb, title: 'Alternatives', desc: 'Halal alternative suggestions', status: 'Live', color: 'green' },
                  { Icon: Wallet, title: 'Zakat Calc', desc: 'Annual Zakat calculation tool', status: 'Pro', color: 'blue' },
                  { Icon: CheckCircle2, title: 'Purification', desc: 'Income purification amounts', status: 'Basic', color: 'amber' },
                  { Icon: Download, title: 'Reports', desc: 'Download compliance reports', status: 'Live', color: 'green' },
                  { Icon: Globe, title: 'Geo Intelligence', desc: 'Conflict zones, sanctions & DoD screen', status: 'Live', color: 'green' },
                ] as const).map(({ Icon, title, desc, status, color }, idx) => {
                  const pillClass = {
                    green: 'bg-green-50 text-green-700 border border-green-100',
                    amber: 'bg-amber-50 text-amber-700 border border-amber-100',
                    blue:  'bg-blue-50 text-blue-700 border border-blue-100',
                  }[color];
                  return (
                    <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                          <Icon size={20} className="text-blue-600" strokeWidth={1.5} />
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pillClass}`}>{status}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>{title}</h3>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ─── AAOIFI Dark Section ─── */}
            <section id="standards" className="bg-slate-900 py-20">
              <div className="max-w-4xl mx-auto px-6 text-center">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold text-blue-300">
                  <Shield size={12} />
                  Shariah Compliance Framework
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
                  Grounded in<br />
                  <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    AAOIFI Standards
                  </span>
                </h2>
                <p className="text-gray-400 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
                  Every analysis is grounded in AAOIFI Standard No. 21 — the globally recognized framework for Islamic equity screening, applying the rigorous two-gate system trusted by Islamic finance institutions worldwide.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-10 text-left">
                  {[
                    { title: 'Gate 1: Business Screen', desc: 'Non-compliant and questionable revenue each screened against the 5% AAOIFI threshold.' },
                    { title: 'Gate 2: Financial Ratios', desc: 'Interest-bearing debt and deposits screened against 33% of total assets.' },
                    { title: 'Purification Calculator', desc: 'Calculate the exact amount to donate from borderline holdings to purify returns.' },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center mb-3">
                        <Shield size={16} className="text-blue-400" />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-2">{item.title}</h4>
                      <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleLaunchAnalyzer}
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/40 text-base"
                >
                  {authState === 'approved' ? 'Launch Analyzer' : 'Request Early Access'}
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition" />
                </button>
              </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="border-t border-gray-100 bg-white py-10">
              <div className="max-w-6xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <Image src="/logo.png" alt="HalalStocks AI" width={32} height={32} />
                    <span className="font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
                      HalalStocks<span className="text-blue-600"> AI</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-400">
                    <span>Powered by Claude AI</span>
                    <span>·</span>
                    <span>AAOIFI Standard No. 21</span>
                    <span>·</span>
                    <span>Real-time Financial Data</span>
                  </div>
                  <p className="text-xs text-gray-400">&copy; 2026 HalalStocks AI</p>
                </div>
              </div>
            </footer>
          </>
        ) : (
          <AnalyzerContent
            onClose={() => setShowAnalyzer(false)}
            usage={usage}
            onUsageChange={refreshUsage}
          />
        )}
      </div>
    </div>
  );
}

function AnalyzerContent({
  onClose,
  usage,
  onUsageChange,
}: {
  onClose: () => void;
  usage: UsageSummary | null;
  onUsageChange: () => void;
}) {
  const [search, setSearch] = useState('');
  const [ticker, setTicker] = useState('');
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());
  const [analysisMode, setAnalysisMode] = useState<'stock' | 'geo' | null>(null);

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
    setTicker('');
    setSelectedCompanyName('');
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

  const selectCompany = (symbol: string, name: string) => {
    setTicker(symbol);
    setSearch(symbol);
    setSelectedCompanyName(name);
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
    setAnalysisMode('stock');
    try {
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
        if (res.status === 429) {
          throw new Error("You've used all 3 daily analyses. Your limit resets every 24 hours.");
        }
        if (res.status === 401) {
          throw new Error('Session expired. Please refresh the page and sign in again.');
        }
        throw new Error(errData.error || 'Analysis failed');
      }
      const data: AnalysisResult = await res.json();
      setResults(data);
      onUsageChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'Halal': return 'bg-green-50 text-green-700 border-green-300';
      case 'Questionable': return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'Non-compliant': return 'bg-red-50 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getGateStatus = (gatePasses: boolean, gateNumber: 1 | 2, verdict: string) => {
    if (!gatePasses) return { label: 'NON-COMPLIANT', style: 'bg-red-50 text-red-700 border border-red-200', icon: <X size={13} /> };
    if (gateNumber === 1 && verdict === 'Questionable') return { label: 'QUESTIONABLE', style: 'bg-amber-50 text-amber-700 border border-amber-200', icon: null };
    return { label: 'PASS', style: 'bg-green-50 text-green-700 border border-green-200', icon: <Check size={13} /> };
  };

  const getSegmentColor = (cls: RevenueSegment['classification']) => {
    if (cls === 'compliant') return 'bg-green-100 text-green-700';
    if (cls === 'questionable') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const getMockData = (_ticker: string): AnalysisResult | null => null;

  const handleStockPDF = () => {
    if (!results) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const vColor = results.analysis.verdict === 'Halal' ? '#15803d' : results.analysis.verdict === 'Questionable' ? '#d97706' : '#dc2626';
    win.document.write(`<!DOCTYPE html><html><head>
    <title>AAOIFI Analysis — ${results.ticker}</title>
    <style>body{font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:40px;color:#111;line-height:1.5}.card{border:1px solid #e5e7eb;border-radius:8px;padding:18px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:12px}td{padding:7px 10px;border-bottom:1px solid #f3f4f6}td:first-child{color:#6b7280;font-weight:600;width:55%}@media print{body{padding:20px}}</style>
    </head><body>
    <div style="background:#0f172a;color:#fff;padding:24px 28px;border-radius:12px;margin-bottom:24px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:#475569;text-transform:uppercase;margin-bottom:8px">HalalStocks AI · AAOIFI Standard No. 21</div>
      <h1 style="font-size:36px;font-weight:900;margin:0 0 2px;letter-spacing:-.5px">${results.ticker}</h1>
      <div style="color:#94a3b8;font-size:13px">${results.company.name} · ${results.company.sector}</div>
      <div style="color:#475569;font-size:11px;margin-top:8px">Analysed: ${results.date} · Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
    <div style="margin-bottom:20px">
      <div style="display:inline-block;padding:6px 18px;background:${vColor}18;border:2px solid ${vColor};border-radius:8px;font-weight:900;font-size:18px;color:${vColor};margin-bottom:10px">${results.analysis.verdict.toUpperCase()}</div>
      <p style="font-size:13px;color:#4b5563;margin:0">${results.analysis.explanation.split('\n')[0]}</p>
    </div>
    <div class="card">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:10px">Gate 1 — Business Activity Screen · <span style="color:${results.gate1.passes ? '#15803d' : '#dc2626'}">${results.gate1.passes ? '✓ PASS' : '✗ FAIL'}</span></div>
      <table>
        <tr><td>Compliant Revenue</td><td>${results.revenueBreakdown.compliant.toFixed(1)}%</td></tr>
        <tr><td>Questionable Revenue</td><td>${results.revenueBreakdown.questionable.toFixed(1)}%</td></tr>
        <tr><td>Non-Compliant Revenue</td><td>${results.revenueBreakdown.nonCompliant.toFixed(1)}%</td></tr>
      </table>
    </div>
    <div class="card">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:10px">Gate 2 — Financial Ratio Screen · <span style="color:${results.gate2.passes ? '#15803d' : '#dc2626'}">${results.gate2.passes ? '✓ PASS' : '✗ FAIL'}</span></div>
      <table>
        <tr><td>Interest-Bearing Debt / Total Assets (limit 33%)</td><td>${(results.financialRatios.interestBearingDebt.ratio * 100).toFixed(2)}% ${results.gate2.debtRatioPasses ? '✓' : '✗'}</td></tr>
        <tr><td>Interest-Bearing Deposits / Total Assets (limit 33%)</td><td>${(results.financialRatios.interestBearingDeposits.ratio * 100).toFixed(2)}% ${results.gate2.depositsRatioPasses ? '✓' : '✗'}</td></tr>
      </table>
    </div>
    <div class="card">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:10px">Purification</div>
      <p style="font-size:13px;color:#374151;margin:0">Impure income percentage to purify: <strong>${results.purificationPercentage.toFixed(4)}%</strong></p>
    </div>
    <div style="font-size:11px;color:#9ca3af;margin-top:24px;padding:14px;background:#f9fafb;border-radius:8px">HalalStocks AI · AAOIFI Standard No. 21 · This is not investment advice.</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex justify-end items-center mb-8">
        <div className="flex items-center gap-3">
          {usage && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                <BarChart3 size={12} className="text-blue-500" />
                <span>Analyze: <strong className="text-gray-700">{usage.analyzeStock.remaining}/3</strong></span>
              </span>
              <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                <Globe size={12} className="text-blue-500" />
                <span>Geo: <strong className="text-gray-700">{usage.geopoliticalExposure.remaining}/3</strong></span>
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Company Name or Ticker Symbol
            </label>
            <div className="relative">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="search-input"
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="e.g. Apple, AAPL, Microsoft, MSFT..."
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:bg-white transition text-sm"
              />
            </div>
            {showDropdown && searchResults.length > 0 && (
              <div id="search-dropdown" className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    type="button"
                    onClick={() => selectCompany(result.symbol, result.name)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition"
                  >
                    <div className="font-semibold text-sm text-gray-900">{result.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{result.symbol} · {result.exchange}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {/* Analyze Stock button with tooltip */}
            <div className="relative group flex-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/20 text-sm"
              >
                {loading && analysisMode === 'stock' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Shield size={15} />
                    Analyze Stock (AAOIFI No. 21)
                    <span className="text-[9px] font-bold bg-white/25 px-1.5 py-0.5 rounded-full ml-0.5 tracking-wide">BETA</span>
                  </>
                )}
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-20 text-center leading-relaxed shadow-2xl">
                Screens stocks for Shariah compliance using AAOIFI Standard No. 21 — covers revenue sources, debt ratios, and financial purity.
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45 rounded-sm"></div>
              </div>
            </div>
            {/* Geopolitical Intelligence button with tooltip */}
            <div className="relative group flex-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const tickerToUse = ticker.trim().toUpperCase() || search.trim().toUpperCase();
                  if (!tickerToUse) { setError('Please enter a company name or ticker symbol'); return; }
                  setError('');
                  setResults(null);
                  setAnalysisMode('geo');
                }}
                className="w-full flex items-center justify-center gap-2 bg-pink-200 hover:bg-pink-300 disabled:opacity-50 text-pink-900 font-bold py-3.5 rounded-xl transition shadow-lg shadow-pink-200/40 text-sm"
              >
                <Globe size={15} />
                Geopolitical Intelligence
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-20 text-center leading-relaxed shadow-2xl">
                Investigates corporate exposure to conflict zones, sanctioned states, and US defence contracts using public SEC filings.
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45 rounded-sm"></div>
              </div>
            </div>
          </div>
        </form>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
            <p className="font-semibold text-red-700 mb-0.5">Something went wrong</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>

      {analysisMode === 'geo' && (ticker || search) && (
        <GeopoliticalExposure
          ticker={ticker.trim().toUpperCase() || search.trim().toUpperCase()}
          companyName={selectedCompanyName || search}
        />
      )}

      {analysisMode === 'stock' && results && (
        <div className="space-y-4">

          {/* Download PDF */}
          <div className="flex justify-end">
            <button
              onClick={handleStockPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition shadow-sm"
            >
              <Download size={13} />
              Download PDF
            </button>
          </div>

          {/* ── VERDICT HEADER ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Ticker</p>
                <h2 className="text-5xl font-black text-gray-900 leading-none mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                  {results.ticker}
                </h2>
                <p className="text-gray-600 text-sm font-medium">{results.company.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{results.company.sector} · {results.company.industry}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`inline-block px-5 py-2.5 rounded-xl border-2 font-black text-base tracking-wide mb-2 ${getVerdictColor(results.analysis.verdict)}`} style={{ fontFamily: 'var(--font-poppins)' }}>
                  {results.analysis.verdict.toUpperCase()}
                </div>
                <p className="text-xs text-gray-400">Analysed: {results.date}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Mkt Cap: ${(results.company.marketCap / 1e9).toFixed(1)}B
                </p>
              </div>
            </div>
          </div>

          {/* ── BUSINESS ACTIVITY SCREEN ── */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden" style={{ borderLeft: '4px solid #3b82f6' }}>
            <div className="flex items-center justify-between px-6 py-4 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-black" style={{ fontFamily: 'var(--font-poppins)' }}>G1</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Gate 1</p>
                  <h3 className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Business Activity Screen</h3>
                </div>
              </div>
              {(() => { const s = getGateStatus(results.gate1.passes, 1, results.analysis.verdict); return (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${s.style}`}>
                  {s.icon}{s.label}
                </div>
              ); })()}
            </div>
            <div className="p-6">

            <div className="mb-5">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span className="font-medium">Revenue Breakdown</span>
                <span className="font-mono">
                  <span className="text-green-600 font-semibold">{results.revenueBreakdown.compliant.toFixed(1)}%</span>
                  {' / '}
                  <span className="text-amber-500 font-semibold">{results.revenueBreakdown.questionable.toFixed(1)}%</span>
                  {' / '}
                  <span className="text-red-500 font-semibold">{results.revenueBreakdown.nonCompliant.toFixed(1)}%</span>
                </span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                <div className="bg-green-500 transition-all" style={{ width: `${results.revenueBreakdown.compliant}%` }} />
                <div className="bg-amber-400 transition-all" style={{ width: `${results.revenueBreakdown.questionable}%` }} />
                <div className="bg-red-500 transition-all" style={{ width: `${results.revenueBreakdown.nonCompliant}%` }} />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Compliant</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Questionable</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Non-Compliant</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Compliant</p>
                <p className="text-green-700 font-black text-xl">{results.revenueBreakdown.compliant.toFixed(1)}%</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Questionable</p>
                <p className="text-amber-700 font-black text-xl">{results.revenueBreakdown.questionable.toFixed(1)}%</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Non-Compliant</p>
                <p className="text-red-700 font-black text-xl">{results.revenueBreakdown.nonCompliant.toFixed(1)}%</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Revenue Segments</p>
              <div className="space-y-2">
                {results.revenueBreakdown.segments.map((seg, i) => {
                  const expanded = expandedSegments.has(i);
                  return (
                    <div
                      key={i}
                      className="py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
                      onClick={() => setExpandedSegments(prev => {
                        const next = new Set(prev);
                        expanded ? next.delete(i) : next.add(i);
                        return next;
                      })}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-800 truncate">{seg.name}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-mono font-bold text-gray-700">{seg.percentage.toFixed(1)}%</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg capitalize ${getSegmentColor(seg.classification)}`}>
                            {seg.classification}
                          </span>
                        </div>
                      </div>
                      <p className={`text-xs text-gray-500 mt-1 ${expanded ? '' : 'truncate'}`}>{seg.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">Source: {results.revenueBreakdown.dataSource}</p>
            </div>
          </div>

          {/* ── FINANCIAL SCREEN ── */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <div className="flex items-center justify-between px-6 py-4 bg-violet-50 border-b border-violet-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-black" style={{ fontFamily: 'var(--font-poppins)' }}>G2</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Gate 2</p>
                  <h3 className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Financial Screen</h3>
                </div>
              </div>
              {(() => { const s = getGateStatus(results.gate2.passes, 2, results.analysis.verdict); return (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${s.style}`}>
                  {s.icon}{s.label}
                </div>
              ); })()}
            </div>
            <div className="p-6">
            <div className="space-y-4">
              {/* Debt Ratio */}
              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-800">Interest-Bearing Debt Ratio</span>
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                    results.gate2.debtRatioPasses ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {results.gate2.debtRatioPasses ? <Check size={11} /> : <X size={11} />}
                    {results.gate2.debtRatioPasses ? 'PASS' : 'FAIL'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Interest-Bearing Debt</p>
                    <p className="text-blue-600 font-bold text-sm">${(results.financialRatios.interestBearingDebt.amount / 1e9).toFixed(2)}B</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Total Assets</p>
                    <p className="text-gray-900 font-bold text-sm">${(results.financialRatios.interestBearingDebt.totalAssets / 1e9).toFixed(2)}B</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Ratio vs 33% threshold</span>
                  <span className={`text-sm font-black ${results.gate2.debtRatioPasses ? 'text-green-600' : 'text-red-600'}`}>
                    {(results.financialRatios.interestBearingDebt.ratio * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${results.gate2.debtRatioPasses ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min((results.financialRatios.interestBearingDebt.ratio * 100 / 33) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">Limit: 33%</p>
              </div>

              {/* Deposits Ratio */}
              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-800">Interest-Bearing Deposits Ratio</span>
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                    results.gate2.depositsRatioPasses ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {results.gate2.depositsRatioPasses ? <Check size={11} /> : <X size={11} />}
                    {results.gate2.depositsRatioPasses ? 'PASS' : 'FAIL'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Cash + Short-Term Investments</p>
                    <p className="text-blue-600 font-bold text-sm">${(results.financialRatios.interestBearingDeposits.amount / 1e9).toFixed(2)}B</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Total Assets</p>
                    <p className="text-gray-900 font-bold text-sm">${(results.financialRatios.interestBearingDeposits.totalAssets / 1e9).toFixed(2)}B</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Ratio vs 33% threshold</span>
                  <span className={`text-sm font-black ${results.gate2.depositsRatioPasses ? 'text-green-600' : 'text-red-600'}`}>
                    {(results.financialRatios.interestBearingDeposits.ratio * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${results.gate2.depositsRatioPasses ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min((results.financialRatios.interestBearingDeposits.ratio * 100 / 33) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">Limit: 33%</p>
              </div>
            </div>
            </div>
          </div>

          {/* ── SHARIAH COMPLIANCE ANALYSIS ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-900 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>
              Shariah Compliance Analysis
            </h3>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700 leading-relaxed">{results.analysis.explanation.split('\n')[0]}</p>
            </div>

            <p className="text-xs font-semibold text-blue-600 mb-3">
              Verdict — AAOIFI Standard No. 21 Two-Gate System
            </p>

            <div className="space-y-3">
              <div className={`border rounded-xl p-4 ${results.gate1.passes ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-700">Gate 1 — Business Activity Screening</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${results.gate1.passes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {results.gate1.passes ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <p><span className="font-semibold">Non-compliant revenue:</span> {results.gate1.nonCompliantRevenue.toFixed(2)}% (Threshold: 5%) {results.gate1.passes ? '✓' : '✗'}</p>
                  <p><span className="font-semibold">Questionable revenue:</span> {results.gate1.questionableRevenue.toFixed(2)}% (Threshold: 5%) {results.gate1.questionableRevenue < 5 ? '✓' : '⚠'}</p>
                  <p className="mt-1 pt-1 border-t border-gray-200 leading-relaxed">
                    {results.gate1.passes
                      ? `✓ Non-compliant revenue is below the 5% AAOIFI threshold.`
                      : `✗ Non-compliant revenue exceeds the 5% AAOIFI threshold.`}
                    {results.gate1.questionableRevenue >= 5 && ` Questionable revenue (${results.gate1.questionableRevenue.toFixed(2)}%) is significant and drives the overall verdict to Questionable.`}
                  </p>
                </div>
              </div>

              <div className={`border rounded-xl p-4 ${results.gate2.passes ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-700">Gate 2 — Quantitative Financial Ratios</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${results.gate2.passes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {results.gate2.passes ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  <div>
                    <p className="font-semibold text-gray-700">Interest-Bearing Debt / Total Assets: {(results.financialRatios.interestBearingDebt.ratio * 100).toFixed(2)}% (Threshold: 33%) {results.gate2.debtRatioPasses ? '✓' : '✗'}</p>
                    <p className="leading-relaxed mt-0.5">
                      {results.gate2.debtRatioPasses
                        ? `✓ Bonds and notes payable are within AAOIFI limits.`
                        : `✗ Interest-bearing debt exceeds the 33% threshold.`}
                    </p>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <p className="font-semibold text-gray-700">Interest-Bearing Deposits / Total Assets: {(results.financialRatios.interestBearingDeposits.ratio * 100).toFixed(2)}% (Threshold: 33%) {results.gate2.depositsRatioPasses ? '✓' : '✗'}</p>
                    <p className="leading-relaxed mt-0.5">
                      {results.gate2.depositsRatioPasses
                        ? `✓ Cash and short-term investments are within AAOIFI limits.`
                        : `✗ Cash and investments in interest-bearing accounts exceed the 33% threshold.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <h4 className="text-xs font-bold text-blue-600 mb-1">Overall Assessment</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{results.analysis.explanation.split('\n')[0]}</p>
            </div>
          </div>

          {/* ── PURIFICATION CALCULATOR ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <CheckCircle2 size={16} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Purification Calculator</h3>
                <p className="text-xs text-gray-500">AAOIFI Standard No. 21</p>
              </div>
            </div>
            <PurificationCalculator
              verdict={results.analysis.verdict.toLowerCase() as 'halal' | 'questionable' | 'non-compliant'}
              impureIncomePercentage={results.purificationPercentage}
            />
          </div>

          {/* ── GEOPOLITICAL EXPOSURE ── */}
          <GeopoliticalExposure
            ticker={results.ticker}
            companyName={results.company.name}
          />

        </div>
      )}
    </div>
  );
}
