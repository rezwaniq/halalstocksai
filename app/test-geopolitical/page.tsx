'use client';

import { useState } from 'react';
import GeopoliticalExposure from '../components/GeopoliticalExposure';

const TEST_COMPANIES = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corporation' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'IBM', name: 'IBM Corporation' },
];

export default function TestGeopoliticalPage() {
  const [selectedCompany, setSelectedCompany] = useState(TEST_COMPANIES[0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🌍 Geopolitical Exposure Test Page</h1>
          <p className="text-gray-600">Test the Geopolitical Exposure Intelligence component</p>
        </div>

        {/* Company Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">Select a test company:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TEST_COMPANIES.map(company => (
              <button
                key={company.ticker}
                onClick={() => setSelectedCompany(company)}
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${
                  selectedCompany.ticker === company.ticker
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {company.ticker}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Testing with: <span className="font-semibold">{selectedCompany.name}</span> ({selectedCompany.ticker})
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Select a company above</li>
            <li>Click the Geopolitical Exposure section to expand</li>
            <li>Select one or more countries or regions to screen</li>
            <li>Click "Start Screening" to fetch data from FMP, SEC EDGAR, USASpending.gov, and Claude AI</li>
            <li>View the analysis results in the cards below</li>
          </ol>
        </div>

        {/* Component */}
        <GeopoliticalExposure ticker={selectedCompany.ticker} companyName={selectedCompany.name} />

        {/* Test Info */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Testing Information</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              <strong>Branch:</strong>{' '}
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">feature/geopolitical-exposure-intelligence</code>
            </p>
            <p>
              <strong>API Endpoint:</strong>{' '}
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">POST /api/geopolitical-exposure</code>
            </p>
            <p>
              <strong>Component:</strong>{' '}
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">app/components/GeopoliticalExposure.tsx</code>
            </p>
            <p className="text-xs text-gray-600 mt-4">
              This test page is at <code className="bg-gray-200 px-1 rounded">/test-geopolitical</code> and is not integrated into the main
              page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
