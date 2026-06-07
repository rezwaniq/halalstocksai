'use client';

import { useState } from 'react';
import { ChevronDown, Loader } from 'lucide-react';

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
  { name: 'Ethiopia' },
  { name: 'Myanmar', description: 'Rohingya crisis' },
  { name: 'Nigeria' },
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
  const [expanded, setExpanded] = useState(false);
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
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-4 hover:bg-gray-50 p-2 rounded transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌍</span>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Geopolitical Intelligence</h3>
            <p className="text-xs text-gray-500">Select regions to screen this company's exposure against</p>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <>
          <div className="space-y-6 mb-6 pb-6 border-b border-gray-200">
            {/* Conflict Zones */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Group 1 — Conflict Zones</h4>
              <div className="space-y-2">
                {CONFLICT_ZONES.map(country => (
                  <label key={country.name} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCountries.includes(country.name)}
                      onChange={() => toggleCountry(country.name)}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                    />
                    <span className="text-lg">{COUNTRY_EMOJIS[country.name]}</span>
                    <span className="text-gray-700 group-hover:text-gray-900 transition">
                      {country.name}
                      {country.description && <span className="text-gray-500 text-sm ml-2">— {country.description}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sanctioned / High-Risk States */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Group 2 — Sanctioned / High-Risk States</h4>
              <div className="space-y-2">
                {SANCTIONED_STATES.map(country => (
                  <label key={country.name} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCountries.includes(country.name)}
                      onChange={() => toggleCountry(country.name)}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                    />
                    <span className="text-lg">{COUNTRY_EMOJIS[country.name]}</span>
                    <span className="text-gray-700 group-hover:text-gray-900 transition">
                      {country.name}
                      {country.description && <span className="text-gray-500 text-sm ml-2">— {country.description}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* US Defence Contracts */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Group 3 — US Defence Contracts</h4>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeDefenceContracts}
                  onChange={() => setIncludeDefenceContracts(prev => !prev)}
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
                <span className="text-gray-700 group-hover:text-gray-900 transition">
                  US Defence Contracts
                  <span className="text-gray-500 text-sm ml-2">— screen for DoD contracts awarded to this company</span>
                </span>
              </label>
            </div>
          </div>

          {/* Start Screening Button */}
          <button
            onClick={handleScreening}
            disabled={selectedCountries.length === 0 || loading}
            className={`w-full py-2 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              selectedCountries.length === 0 || loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            }`}
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                {loadingPhase === 'fetching' && 'Fetching SEC filings...'}
                {loadingPhase === 'analyzing' && 'Analyzing with AI...'}
                {loadingPhase === 'building' && 'Building report...'}
              </>
            ) : (
              'Start Screening'
            )}
          </button>

          {/* Daily limit reached — upgrade prompt */}
          {limitReached && (
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              <p className="text-sm font-semibold text-blue-900 mb-1">Daily screening limit reached</p>
              <p className="text-xs text-blue-700 leading-relaxed mb-3">
                You&apos;ve used all your free geopolitical intelligence screenings for today.
                Upgrade to a paid plan for unlimited screenings, priority processing, and full report history.
              </p>
              <a
                href="mailto:support@halalstocks.ai?subject=Paid%20Plan%20Enquiry"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
              >
                Contact us to upgrade →
              </a>
            </div>
          )}

          {/* General error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              {selectedCountries.map((country, idx) => (
                <SkeletonCard key={idx} />
              ))}
            </div>
          )}

          {/* Results Section */}
          {results && !loading && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
              {/* Results Header */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-1">🌍 GEOPOLITICAL EXPOSURE RESULTS</h4>
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Analyzed Countries:</span> {results.selectedCountries.join(', ')}
                </p>
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

              {/* US Defence Contracts — formatted once from raw data, no per-country duplication */}
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
                        <p className="text-gray-700">No US Defence Department contracts identified</p>
                      )}
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
        </>
      )}
    </div>
  );
}
