'use client';

import { useState } from 'react';
import { ChevronDown, Loader, Download, Globe } from 'lucide-react';
import LimitReachedModal from './LimitReachedModal';

interface CountryOption {
  name: string;
  description?: string;
}

interface AnalysisResult {
  revenue: {
    disclosed: boolean;
    figure: string | null;
    period: string | null;
    context: string;
    broader_segment: string | null;
    source: string;
  };
  physical_presence: {
    confirmed: boolean;
    details: string[];
    source: string;
  };
  capital_investment: {
    disclosed: boolean;
    figure: string | null;
    details: string;
    source: string;
  };
  notable: {
    exists: boolean;
    points: string[];
    source: string;
  };
  last_updated: string;
  data_quality: 'FULL' | 'PARTIAL' | 'MINIMAL';
}

interface DefenceContractsResult {
  found: boolean;
  points: string[];
  source: string;
}

interface ApiResponse {
  ticker: string;
  companyName: string;
  selectedCountries: string[];
  includeDefenceContracts: boolean;
  results: Record<string, AnalysisResult>;
  defenceContracts: DefenceContractsResult;
}

const COUNTRY_EMOJIS: { [key: string]: string } = {
  'DRC (Congo)': '🇨🇩',
  'Ethiopia': '🇪🇹',
  'Myanmar': '🇲🇲',
  'Nigeria': '🇳🇬',
  'Sudan': '🇸🇩',
  'Ukraine': '🇺🇦',
  'China': '🇨🇳',
  'Iran': '🇮🇷',
  'Israel': '🇮🇱',
  'North Korea': '🇰🇵',
  'Russia': '🇷🇺',
};

const CONFLICT_ZONES: CountryOption[] = [
  { name: 'DRC (Congo)', description: 'conflict minerals' },
  { name: 'Myanmar', description: 'Rohingya crisis' },
  { name: 'Sudan' },
  { name: 'Ukraine' },
];

const SANCTIONED_STATES: CountryOption[] = [
  { name: 'China', description: 'Uyghur exposure' },
  { name: 'Iran' },
  { name: 'Israel' },
  { name: 'North Korea' },
  { name: 'Russia' },
];

interface GeopoliticalExposureProps {
  ticker: string;
  companyName: string;
}

export default function GeopoliticalExposure({ ticker, companyName }: GeopoliticalExposureProps) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [includeDefenceContracts, setIncludeDefenceContracts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [limitReached, setLimitReached] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState<'fetching' | 'analyzing' | 'building'>('fetching');

  const toggleCountry = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const handleScreening = async () => {
    if (selectedCountries.length === 0) return;

    setLoading(true);
    setError('');
    setLimitReached(false);
    setLoadingPhase('fetching');

    try {
      // Create an AbortController with a 5-minute timeout for multi-country analysis
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

      const response = await fetch('/api/geopolitical-exposure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          companyName,
          selectedCountries,
          includeDefenceContracts,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          setLimitReached(true);
          return;
        }
        let msg = 'Analysis failed. Please try again.';
        try {
          const errData = await response.json();
          if (errData.error) msg = errData.error;
        } catch { /* ignore parse error, use default msg */ }
        if (response.status === 403) {
          setError(msg);
          return;
        }
        throw new Error(msg);
      }

      setLoadingPhase('analyzing');
      const responseText = await response.text();

      if (!responseText) {
        throw new Error('Empty response from server');
      }

      let data: ApiResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('JSON parse error. Response length:', responseText.length, 'First 200 chars:', responseText.substring(0, 200));
        throw new Error('Failed to parse response from server. The analysis may have timed out.');
      }

      setLoadingPhase('building');
      setResults(data);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Analysis with multiple countries can take 3-5 minutes. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const getDataQualityBadge = (quality: 'FULL' | 'PARTIAL' | 'MINIMAL') => {
    const badgeConfig = {
      FULL: { bg: 'bg-green-100', text: 'text-green-800', label: '● Full data' },
      PARTIAL: { bg: 'bg-amber-100', text: 'text-amber-800', label: '● Partial data' },
      MINIMAL: { bg: 'bg-gray-100', text: 'text-gray-800', label: '● Limited data' },
    };
    const config = badgeConfig[quality];
    return <span className={`inline-block px-3 py-1 ${config.bg} ${config.text} rounded-full text-xs font-semibold`}>{config.label}</span>;
  };

  const handleDownloadPDF = () => {
    if (!results) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = results.selectedCountries.map(country => {
      const a = results.results[country];
      if (!a) return '';
      const presenceDetails = a.physical_presence.confirmed
        ? ['Confirmed', ...a.physical_presence.details].map(d => `<p style="margin:2px 0">• ${d}</p>`).join('')
        : '<p style="margin:2px 0">None identified in SEC filings</p>';
      const notableItems = a.notable.exists
        ? a.notable.points.map(p => `<p style="margin:2px 0">• ${p}</p>`).join('')
        : '<p style="margin:2px 0">No notable items identified</p>';
      return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;page-break-inside:avoid">
        <h2 style="font-size:16px;font-weight:700;margin:0 0 14px">${COUNTRY_EMOJIS[country] || ''} ${country}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <tr style="background:#f9fafb"><td style="padding:8px 10px;font-weight:600;color:#6b7280;width:32%;vertical-align:top">Revenue</td><td style="padding:8px 10px">${a.revenue.disclosed ? `${a.revenue.figure} in ${a.revenue.period}` : 'Not separately disclosed'}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:600;color:#6b7280;vertical-align:top">Physical Presence</td><td style="padding:8px 10px">${presenceDetails}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px 10px;font-weight:600;color:#6b7280;vertical-align:top">Capital Investment</td><td style="padding:8px 10px">${a.capital_investment.disclosed ? a.capital_investment.figure || '' : 'Not separately disclosed'}${a.capital_investment.details ? `<br/><span style="color:#6b7280">${a.capital_investment.details}</span>` : ''}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:600;color:#6b7280;vertical-align:top">Notable</td><td style="padding:8px 10px">${notableItems}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px 10px;font-weight:600;color:#6b7280">Data Quality</td><td style="padding:8px 10px">${a.data_quality} · Updated: ${a.last_updated}</td></tr>
        </table>
      </div>`;
    }).join('');
    win.document.write(`<!DOCTYPE html><html><head>
    <title>Geopolitical Intelligence — ${results.companyName} (${results.ticker})</title>
    <style>body{font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:40px;color:#111;line-height:1.5}@media print{body{padding:20px}}</style>
    </head><body>
    <div style="background:#0f172a;color:#fff;padding:24px 28px;border-radius:12px;margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:#475569;text-transform:uppercase;margin-bottom:8px">HalalStocks AI · Geopolitical Intelligence</div>
      <h1 style="font-size:26px;font-weight:900;margin:0 0 4px">${results.companyName}</h1>
      <div style="color:#94a3b8;font-size:13px">${results.ticker}</div>
      <div style="color:#475569;font-size:11px;margin-top:10px">Screened: ${results.selectedCountries.join(', ')} · Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
    ${rows}
    <div style="font-size:11px;color:#9ca3af;margin-top:24px;padding:14px;background:#f9fafb;border-radius:8px">Based solely on publicly available regulatory filings and government databases. Dollar figures as reported by the company. This is not investment advice.</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const SkeletonCard = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition border-b border-gray-100"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Globe size={18} className="text-blue-600" />
            </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-900">Geopolitical Intelligence</h3>
            <p className="text-xs text-gray-500">Exposure screening — conflict zones, sanctioned states & defence contracts</p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="p-6">
          {/* Country selection panel */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">

            {/* Group 1 — Conflict Zones */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Group 1 — Conflict Zones</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CONFLICT_ZONES.map(country => (
                  <button
                    key={country.name}
                    type="button"
                    onClick={() => toggleCountry(country.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 ${
                      selectedCountries.includes(country.name)
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <span>{country.name}</span>
                    {country.description && (
                      <span className="text-[10px] opacity-50">· {country.description}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 mb-5"></div>

            {/* Group 2 — Sanctioned / High-Risk States */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Group 2 — Sanctioned / High-Risk States</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SANCTIONED_STATES.map(country => (
                  <button
                    key={country.name}
                    type="button"
                    onClick={() => toggleCountry(country.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 ${
                      selectedCountries.includes(country.name)
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <span>{country.name}</span>
                    {country.description && (
                      <span className="text-[10px] opacity-50">· {country.description}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 mb-5"></div>

            {/* Group 3 — US Defence Contracts */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Group 3 — US Defence Contracts</span>
              </div>
              <button
                type="button"
                onClick={() => setIncludeDefenceContracts(prev => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 ${
                  includeDefenceContracts
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <span className="text-sm leading-none">🛡️</span>
                <span>US Defence Contracts</span>
                <span className="text-[10px] opacity-50">— DoD contract screening</span>
              </button>
            </div>
          </div>

          {/* Run Screening Button */}
          <button
            onClick={handleScreening}
            disabled={selectedCountries.length === 0 || loading}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold transition flex items-center justify-center gap-2 text-sm mb-4 ${
              selectedCountries.length === 0 || loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
            }`}
          >
            {loading ? (
              <>
                <Loader size={15} className="animate-spin" />
                {loadingPhase === 'fetching' && 'Fetching SEC filings...'}
                {loadingPhase === 'analyzing' && 'Analyzing with AI...'}
                {loadingPhase === 'building' && 'Building report...'}
              </>
            ) : (
              'Run Screening'
            )}
          </button>

          {/* Trial limit reached modal */}
          {limitReached && (
            <LimitReachedModal onClose={() => setLimitReached(false)} />
          )}

          {/* General error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4">
              {selectedCountries.map((_country, idx) => (
                <SkeletonCard key={idx} />
              ))}
            </div>
          )}

          {/* Results Section */}
          {results && !loading && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
              {/* Results Header + Download */}
              <div className="flex items-start gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex-1">
                  <h4 className="font-bold text-gray-900 mb-1">🌍 GEOPOLITICAL EXPOSURE RESULTS</h4>
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Analyzed Countries:</span> {results.selectedCountries.join(', ')}
                  </p>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition shadow-sm flex-shrink-0 mt-0.5"
                >
                  <Download size={13} />
                  Download PDF
                </button>
              </div>

              {/* Country Result Cards */}
              <div className="space-y-6">
                {results.selectedCountries.map(country => {
                  const analysis = results.results[country];
                  if (!analysis) return null;

                  return (
                    <div key={country} className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                      {/* Card Header */}
                      <div className="border-b-4 border-gray-400 px-6 py-4 bg-gray-50">
                        <div className="text-center mb-3">
                          <p className="text-gray-700 tracking-wider">═══════════════════════════════════════</p>
                        </div>
                        <div className="text-center">
                          <h4 className="text-lg font-bold text-gray-900">
                            {COUNTRY_EMOJIS[country]} {country} EXPOSURE — {results.companyName} ({results.ticker})
                          </h4>
                        </div>
                        <div className="text-center mt-3">
                          <p className="text-gray-700 tracking-wider">═══════════════════════════════════════</p>
                        </div>
                      </div>

                      {/* Card Body - Exact Format from Spec */}
                      <div className="p-6 bg-white">
                        <div className="text-sm text-gray-800 space-y-4 font-mono">
                          {/* Revenue Section */}
                          <div>
                            <p className="font-semibold mb-2">📊 Revenue:</p>
                            <div className="ml-4 space-y-1 text-gray-700">
                              {analysis.revenue.disclosed ? (
                                <>
                                  <p>{analysis.revenue.figure} in {analysis.revenue.period}</p>
                                  <p>Source: {analysis.revenue.source}</p>
                                </>
                              ) : (
                                <>
                                  <p>Not separately disclosed</p>
                                  {analysis.revenue.broader_segment && (
                                    <p>({country} revenue included in {analysis.revenue.broader_segment})</p>
                                  )}
                                  <p>Source: {analysis.revenue.source}</p>
                                </>
                              )}
                            </div>
                          </div>

                          <p className="text-gray-400 text-center">─────────────────────────────────────</p>

                          {/* Physical Presence Section */}
                          <div>
                            <p className="font-semibold mb-2">🏢 Physical Presence:</p>
                            <div className="ml-4 space-y-1 text-gray-700">
                              {analysis.physical_presence.confirmed ? (
                                <>
                                  <p>Confirmed</p>
                                  {analysis.physical_presence.details.map((detail, idx) => (
                                    <p key={idx}>• {detail}</p>
                                  ))}
                                  <p>Source: {analysis.physical_presence.source}</p>
                                </>
                              ) : (
                                <>
                                  <p>None identified in SEC filings</p>
                                  <p>Source: {analysis.physical_presence.source}</p>
                                </>
                              )}
                            </div>
                          </div>

                          <p className="text-gray-400 text-center">─────────────────────────────────────</p>

                          {/* Capital Investment Section */}
                          <div>
                            <p className="font-semibold mb-2">💰 Capital Investment:</p>
                            <div className="ml-4 space-y-1 text-gray-700">
                              {analysis.capital_investment.disclosed ? (
                                <>
                                  <p>{analysis.capital_investment.figure}</p>
                                  <p>{analysis.capital_investment.details}</p>
                                  <p>Source: {analysis.capital_investment.source}</p>
                                </>
                              ) : (
                                <>
                                  <p>Not separately disclosed in SEC filings</p>
                                  {analysis.capital_investment.details && (
                                    <p>{analysis.capital_investment.details}</p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <p className="text-gray-400 text-center">─────────────────────────────────────</p>

                          {/* Notable Section */}
                          <div>
                            <p className="font-semibold mb-2">⚠️ Notable:</p>
                            <div className="ml-4 space-y-1 text-gray-700">
                              {analysis.notable.exists ? (
                                <>
                                  {analysis.notable.points.map((point, idx) => (
                                    <p key={idx}>• {point}</p>
                                  ))}
                                  <p>Source: {analysis.notable.source}</p>
                                </>
                              ) : (
                                <p>No notable items identified</p>
                              )}
                            </div>
                          </div>

                          <p className="text-gray-400 text-center">─────────────────────────────────────</p>

                          {/* Data Updated & Quality */}
                          <div className="text-gray-700 space-y-2">
                            <p>Data last updated: {analysis.last_updated}</p>
                            <div className="flex items-center gap-2">
                              <span>Data quality:</span>
                              {getDataQualityBadge(analysis.data_quality)}
                            </div>
                          </div>

                          <div className="text-center mt-4">
                            <p className="text-gray-700 tracking-wider">═══════════════════════════════════════</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* US Defence Contracts — standalone section, only when Group 3 was selected */}
              {results.includeDefenceContracts && (
                <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                  <div className="border-b-4 border-gray-400 px-6 py-4 bg-gray-50">
                    <div className="text-center mb-3">
                      <p className="text-gray-700 tracking-wider">═══════════════════════════════════════</p>
                    </div>
                    <div className="text-center">
                      <h4 className="text-lg font-bold text-gray-900">
                        🛡️ US DEFENCE CONTRACTS — {results.companyName} ({results.ticker})
                      </h4>
                    </div>
                    <div className="text-center mt-3">
                      <p className="text-gray-700 tracking-wider">═══════════════════════════════════════</p>
                    </div>
                  </div>
                  <div className="p-6 bg-white">
                    <div className="text-sm text-gray-800 font-mono">
                      {results.defenceContracts.found ? (
                        <div className="space-y-1 text-gray-700">
                          {results.defenceContracts.points.map((point, idx) => (
                            <p key={idx}>• {point}</p>
                          ))}
                          <p className="mt-2">Source: {results.defenceContracts.source}</p>
                        </div>
                      ) : (
                        <p className="text-gray-700">No US Defence Department contracts identified in the last 3 years.</p>
                      )}
                      <p className="mt-3 text-gray-500 italic text-xs">
                        Note: DoD at times purchases products through resellers. Those resellers appear as the contract recipient in USASpending — those contracts are not captured here.
                      </p>
                      <div className="text-center mt-4">
                        <p className="text-gray-700 tracking-wider">═══════════════════════════════════════</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600">
                <p>
                  This analysis is based solely on publicly available regulatory filings and government databases. Dollar figures shown are as
                  reported by the company. Where figures are not separately disclosed we show what is available. This is not investment advice.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
