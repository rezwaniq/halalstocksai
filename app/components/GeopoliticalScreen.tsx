'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface GeopoliticalScreenProps {
  ticker: string;
  companyName: string;
}

interface CountryAnalysis {
  country: string;
  analysis: string;
}

interface DefenseContract {
  description: string;
  amount: number;
  agency: string;
  date: string;
}

interface ScreeningResponse {
  ticker: string;
  selectedCountries: string[];
  section1: {
    title: string;
    countries: CountryAnalysis[];
  };
  section2: {
    title: string;
    check2a: {
      title: string;
      analysis: string;
    };
    check2b: {
      title: string;
      contracts: DefenseContract[];
      totalValue: number;
      count: number;
    };
  };
  filingDate: string;
  error?: string;
}

const COUNTRIES = ['China', 'Iran', 'Israel', 'North Korea', 'Russia', 'Ukraine'];

const COUNTRY_EMOJIS: { [key: string]: string } = {
  'China': '🇨🇳',
  'Iran': '🇮🇷',
  'Israel': '🇮🇱',
  'North Korea': '🇰🇵',
  'Russia': '🇷🇺',
  'Ukraine': '🇺🇦',
};


export default function GeopoliticalScreen({ ticker, companyName }: GeopoliticalScreenProps) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScreeningResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [expanded, setExpanded] = useState(false);

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

    try {
      const response = await fetch('/api/geopolitical-screen', {
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
        throw new Error(errData.error || 'Screening failed');
      }

      const data: ScreeningResponse = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-4 hover:bg-gray-50 p-2 rounded transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌍</span>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Geopolitical Exposure Screen</h3>
            <p className="text-xs text-gray-500">Select regions to screen this company against</p>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <>
          {/* Country Checkboxes */}
          <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
            {COUNTRIES.map(country => (
              <label key={country} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedCountries.includes(country)}
                  onChange={() => toggleCountry(country)}
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
                <span className="text-lg">{COUNTRY_EMOJIS[country]}</span>
                <span className="text-gray-700 group-hover:text-gray-900 transition">{country}</span>
              </label>
            ))}
          </div>

          {/* Start Screening Button */}
          <button
            onClick={handleScreening}
            disabled={selectedCountries.length === 0 || loading}
            className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
              selectedCountries.length === 0 || loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            }`}
          >
            {loading ? 'Screening in progress...' : 'Start Screening'}
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Results Section */}
          {results && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-5">
              {/* Results Header */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-2">🌍 GEOPOLITICAL EXPOSURE RESULTS</h4>
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Analyzed Countries:</span> {results.selectedCountries.join(', ')}
                </p>
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Data sources:</span> SEC EDGAR 10-K filings, USASpending.gov, FMP Financial Data
                </p>
              </div>

              {/* Section 1: Country Investment Analysis */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 text-base">Section 1: {results.section1.title}</h4>
                {results.section1.countries.map(country => (
                  <div key={country.country} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <h5 className="text-lg font-bold text-gray-900 mb-2">
                      {COUNTRY_EMOJIS[country.country]} {country.country}
                    </h5>
                    <p className="text-sm text-gray-700 leading-relaxed">{country.analysis}</p>
                  </div>
                ))}
              </div>

              {/* Section 2: Defense Exposure Analysis */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                <h4 className="font-bold text-gray-900 text-base">Section 2: {results.section2.title}</h4>

                {/* Check 2A: Defense Contractor Relationships */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-bold text-gray-900 mb-3">2A. {results.section2.check2a.title}</h5>
                  <p className="text-sm text-gray-700 leading-relaxed">{results.section2.check2a.analysis}</p>
                </div>

                {/* Check 2B: US Government Defense Contracts */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h5 className="font-bold text-gray-900 mb-3">2B. {results.section2.check2b.title}</h5>
                  <p className="text-sm text-gray-700 mb-3">
                    <span className="font-semibold">Total Value:</span> ${(results.section2.check2b.totalValue / 1000000).toFixed(2)}M ({results.section2.check2b.count} contracts)
                  </p>

                  {results.section2.check2b.contracts.length > 0 ? (
                    <div className="space-y-3">
                      {results.section2.check2b.contracts.map((contract, idx) => (
                        <div key={idx} className="bg-white rounded p-3 border border-orange-100">
                          <h6 className="font-semibold text-gray-900 mb-1">{contract.description}</h6>
                          <p className="text-sm text-gray-700 mb-1">
                            <span className="font-semibold">Amount:</span> ${(contract.amount / 1000000).toFixed(2)}M
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-semibold">Agency:</span> {contract.agency}
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-semibold">Date:</span> {contract.date}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 italic">No US government defense contracts identified.</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="text-xs text-gray-600 space-y-1 pt-4 border-t border-gray-200">
                {results.filingDate && <p>Filed: {results.filingDate}</p>}
                <p>This analysis is for informational purposes only and does not constitute investment advice.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
