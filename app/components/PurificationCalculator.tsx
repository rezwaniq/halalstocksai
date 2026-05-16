'use client';

import { useState } from 'react';

interface PurificationCalculatorProps {
  verdict: 'halal' | 'questionable' | 'non-compliant';
  impureIncomePercentage: number;
}

export default function PurificationCalculator({
  verdict,
  impureIncomePercentage,
}: PurificationCalculatorProps) {
  const [dividendAmount, setDividendAmount] = useState<string>('');
  const [capitalGainAmount, setCapitalGainAmount] = useState<string>('');

  const dividendPurification =
    dividendAmount && !isNaN(parseFloat(dividendAmount))
      ? (parseFloat(dividendAmount) * impureIncomePercentage) / 100
      : 0;

  const capitalGainPurification =
    capitalGainAmount && !isNaN(parseFloat(capitalGainAmount))
      ? (parseFloat(capitalGainAmount) * impureIncomePercentage) / 100
      : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // NON-COMPLIANT: Hide purification calculator completely
  if (verdict === 'non-compliant') {
    return (
      <div className="text-center p-6">
        <p className="text-lg text-white font-semibold">
          This stock is not permissible for Islamic investment. Do not invest.
        </p>
      </div>
    );
  }

  // HALAL or QUESTIONABLE: Show purification calculator
  return (
    <div className="space-y-6">
      {/* Primary Purification - Dividends (AAOIFI Required) */}
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-emerald-400">💰 Dividends Purification</h3>
            <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              AAOIFI Requirement
            </span>
          </div>
          <p className="text-sm text-gray-300">
            Purify dividends received based on the company's impure income percentage
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Dividend Amount Received ($)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={dividendAmount}
              onChange={(e) => setDividendAmount(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-emerald-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Impure Income Ratio
            </label>
            <div className="px-4 py-2 rounded-lg bg-slate-700 border border-emerald-500/30 text-white flex items-center">
              {impureIncomePercentage.toFixed(2)}%
            </div>
          </div>
        </div>

        {dividendAmount && parseFloat(dividendAmount) > 0 && (
          <div className="p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
            <p className="text-sm text-gray-300 mb-2">Formula:</p>
            <p className="text-white font-mono text-sm mb-3">
              ${parseFloat(dividendAmount).toFixed(2)} × {impureIncomePercentage.toFixed(2)}% ={' '}
              <span className="font-bold text-emerald-400">{formatCurrency(dividendPurification)}</span>
            </p>
            <p className="text-sm text-emerald-300 font-semibold">
              Donate: <span className="text-emerald-400">{formatCurrency(dividendPurification)}</span>
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3 italic">
          📌 Required per AAOIFI Standard No. 21
        </p>
      </div>

      {/* Secondary Purification - Capital Gains (Scholar's Recommendation) */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-amber-400">📈 Capital Gains Purification</h3>
            <span className="text-xs font-bold px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Not Required by AAOIFI
            </span>
          </div>
          <p className="text-sm text-gray-300">
            Recommended by some scholars as additional precaution
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Sale Profit Amount ($)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={capitalGainAmount}
              onChange={(e) => setCapitalGainAmount(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-amber-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Impure Income Ratio
            </label>
            <div className="px-4 py-2 rounded-lg bg-slate-700 border border-amber-500/30 text-white flex items-center">
              {impureIncomePercentage.toFixed(2)}%
            </div>
          </div>
        </div>

        {capitalGainAmount && parseFloat(capitalGainAmount) > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/20 border border-amber-500/40">
            <p className="text-sm text-gray-300 mb-2">Formula:</p>
            <p className="text-white font-mono text-sm mb-3">
              ${parseFloat(capitalGainAmount).toFixed(2)} × {impureIncomePercentage.toFixed(2)}% ={' '}
              <span className="font-bold text-amber-400">{formatCurrency(capitalGainPurification)}</span>
            </p>
            <p className="text-sm text-amber-300 font-semibold">
              Donate: <span className="text-amber-400">{formatCurrency(capitalGainPurification)}</span>
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3 italic">
          ⚠️ Not required by AAOIFI but recommended by some scholars as additional precaution
        </p>
      </div>

      {/* Summary */}
      {(dividendAmount || capitalGainAmount) &&
        (parseFloat(dividendAmount || '0') > 0 || parseFloat(capitalGainAmount || '0') > 0) && (
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-6">
            <h3 className="text-lg font-bold text-blue-400 mb-4">📋 Purification Summary</h3>
            <div className="space-y-2">
              {parseFloat(dividendAmount || '0') > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-blue-500/20">
                  <span className="text-white">Dividends Purification (Required)</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(dividendPurification)}</span>
                </div>
              )}
              {parseFloat(capitalGainAmount || '0') > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-blue-500/20">
                  <span className="text-white">Capital Gains Purification (Recommended)</span>
                  <span className="font-bold text-amber-400">{formatCurrency(capitalGainPurification)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-3 pt-4 bg-blue-500/10 px-3 rounded">
                <span className="font-bold text-white">Total to Donate</span>
                <span className="text-2xl font-bold text-blue-400">
                  {formatCurrency(dividendPurification + capitalGainPurification)}
                </span>
              </div>
            </div>
          </div>
        )}

      {/* Disclaimer */}
      <div className="text-center text-xs text-gray-400 border-t border-gray-700 pt-6">
        <p>
          Purification calculations are based on AAOIFI Standard No. 21. Consult your local scholar
          for guidance specific to your situation.
        </p>
      </div>
    </div>
  );
}
