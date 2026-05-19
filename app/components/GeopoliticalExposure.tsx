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

interface ApiResponse {
  ticker: string;
  companyName: string;
  selectedCountries: string[];
  results: Record<string, AnalysisResult>;
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
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string>('');
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
    setLoadingPhase('fetching');

    try {
      const response = await fetch('/api/geopolitical-exposure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          companyName,
          selectedCountries,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Analysis failed');
      }

      setLoadingPhase('analyzing');
      const data: ApiResponse = await response.json();

      setLoadingPhase('building');
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getDataQualityBadge = (quality: 'FULL' | 'PARTIAL' | 'MINIMAL') => {
    switch (quality) {
      case 'FULL':
        return <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">● Full data</span>;
      case 'PARTIAL':
        return <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">● Partial data</span>;
      case 'MINIMAL':
        return <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">● Limited data</span>;
    }
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
            <h3 className="text-lg font-bold text-gray-900">Geopolitical Exposure Intelligence</h3>
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

          {/* Error Message */}
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
                    <div key={country} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Card Header */}
                      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-bold text-gray-900">
                            <span className="text-2xl mr-2">{COUNTRY_EMOJIS[country]}</span>
                            {country} EXPOSURE — {results.companyName} ({results.ticker})
                          </h4>
                          <div>{getDataQualityBadge(analysis.data_quality)}</div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 space-y-4">
                        {/* Revenue Section */}
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <span>📊</span> Revenue
                          </h5>
                          <div className="text-sm text-gray-700 space-y-1">
                            {analysis.revenue.disclosed ? (
                              <>
                                <p className="flex items-center gap-2">
                                  <span className="text-green-600">●</span>
                                  {analysis.revenue.figure} in {analysis.revenue.period}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="flex items-center gap-2">
                                  <span className="text-gray-400">●</span>
                                  Not separately disclosed
                                </p>
                                {analysis.revenue.broader_segment && (
                                  <p className="text-gray-600 italic">({country} revenue included in {analysis.revenue.broader_segment})</p>
                                )}
                              </>
                            )}
                            <p className="text-xs text-gray-600 mt-2">Source: {analysis.revenue.source}</p>
                          </div>
                        </div>

                        <div className="border-t border-gray-200"></div>

                        {/* Physical Presence Section */}
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <span>🏢</span> Physical Presence
                          </h5>
                          <div className="text-sm text-gray-700 space-y-1">
                            {analysis.physical_presence.confirmed ? (
                              <>
                                <p className="flex items-center gap-2">
                                  <span className="text-green-600">●</span>
                                  Confirmed
                                </p>
                                <ul className="ml-6 space-y-1">
                                  {analysis.physical_presence.details.map((detail, idx) => (
                                    <li key={idx}>• {detail}</li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <p className="flex items-center gap-2">
                                <span className="text-gray-400">●</span>
                                None identified in SEC filings
                              </p>
                            )}
                            <p className="text-xs text-gray-600 mt-2">Source: {analysis.physical_presence.source}</p>
                          </div>
                        </div>

                        <div className="border-t border-gray-200"></div>

                        {/* Capital Investment Section */}
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <span>💰</span> Capital Investment
                          </h5>
                          <div className="text-sm text-gray-700 space-y-1">
                            {analysis.capital_investment.disclosed ? (
                              <>
                                <p className="flex items-center gap-2">
                                  <span className="text-green-600">●</span>
                                  {analysis.capital_investment.figure}
                                </p>
                                <p className="text-gray-600">{analysis.capital_investment.details}</p>
                              </>
                            ) : (
                              <>
                                <p className="flex items-center gap-2">
                                  <span className="text-gray-400">●</span>
                                  Not separately disclosed in SEC filings
                                </p>
                                {analysis.capital_investment.details && (
                                  <p className="text-gray-600 italic">{analysis.capital_investment.details}</p>
                                )}
                              </>
                            )}
                            <p className="text-xs text-gray-600 mt-2">Source: {analysis.capital_investment.source}</p>
                          </div>
                        </div>

                        <div className="border-t border-gray-200"></div>

                        {/* Notable Section */}
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <span>⚠️</span> Notable
                          </h5>
                          <div className="text-sm text-gray-700 space-y-1">
                            {analysis.notable.exists ? (
                              <>
                                <ul className="space-y-1">
                                  {analysis.notable.points.map((point, idx) => (
                                    <li key={idx}>• {point}</li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <p>No notable items identified</p>
                            )}
                            <p className="text-xs text-gray-600 mt-2">Source: {analysis.notable.source}</p>
                          </div>
                        </div>

                        <div className="border-t border-gray-200"></div>

                        {/* Data Updated */}
                        <div className="text-xs text-gray-600 pt-2">
                          <p>Data last updated: {analysis.last_updated}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

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
