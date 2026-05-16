'use client';

import { ReactNode } from 'react';

interface ComplianceData {
  ticker: string;
  companyName: string;
  verdict: 'halal' | 'questionable' | 'non-compliant';
  reportDate: string;
  businessActivityScreen: {
    status: 'pass' | 'fail';
    compliantRevenue: number;
    nonCompliantRevenue: number;
    segments: {
      name: string;
      percentage: number;
      status: 'compliant' | 'non-compliant';
    }[];
    dataSource: string;
    filingDate: string;
  };
  financialScreen: {
    interestBearingDebtRatio: {
      status: 'pass' | 'fail';
      percentage: number;
      debtAmount: number;
      totalDebt: number;
      threshold: string;
    };
    interestBearingDepositsRatio: {
      status: 'pass' | 'fail';
      percentage: number;
      depositsAmount: number;
      totalAssets: number;
      threshold: string;
    };
    tradingCapitalRatio: {
      status: 'pass' | 'fail';
      percentage: number;
      threshold: string;
    };
  };
  aiAnalysis: string;
  purification: {
    percentage: number;
    amount: string;
    explanation: string;
  };
}

interface ComplianceReportProps {
  data: ComplianceData;
}

// Helper Components
const VerdictBadge = ({ verdict }: { verdict: 'halal' | 'questionable' | 'non-compliant' }) => {
  const colors = {
    halal: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    questionable: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    'non-compliant': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800',
  };

  const labels = {
    halal: '✓ Halal Compliant',
    questionable: '⚠ Questionable',
    'non-compliant': '✕ Non-Compliant',
  };

  return (
    <span className={`px-4 py-2 rounded-lg font-semibold text-sm border ${colors[verdict]}`}>
      {labels[verdict]}
    </span>
  );
};

const StatusBadge = ({ status }: { status: 'pass' | 'fail' }) => {
  const isPass = status === 'pass';
  return (
    <span
      className={`px-3 py-1 rounded text-xs font-bold ${
        isPass
          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      }`}
    >
      {isPass ? '✓ Pass' : '✕ Fail'}
    </span>
  );
};

const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 ${className}`}>
    {children}
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <h2 className="text-lg font-bold text-white flex items-center gap-2">
    {title}
  </h2>
);

const ProgressBar = ({
  compliantPercentage,
  nonCompliantPercentage,
}: {
  compliantPercentage: number;
  nonCompliantPercentage: number;
}) => (
  <div className="flex h-8 rounded-lg overflow-hidden border border-blue-300 dark:border-blue-600">
    <div
      className="bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold transition-all"
      style={{ width: `${compliantPercentage}%` }}
    >
      {compliantPercentage > 5 && `${compliantPercentage}%`}
    </div>
    <div
      className="bg-red-500 flex items-center justify-center text-white text-xs font-semibold transition-all"
      style={{ width: `${nonCompliantPercentage}%` }}
    >
      {nonCompliantPercentage > 5 && `${nonCompliantPercentage}%`}
    </div>
  </div>
);

const RatioDisplay = ({
  label,
  percentage,
  primaryAmount,
  primaryLabel,
  secondaryAmount,
  secondaryLabel,
  threshold,
}: {
  label: string;
  percentage: number;
  primaryAmount: string;
  primaryLabel: string;
  secondaryAmount: string;
  secondaryLabel: string;
  threshold: string;
}) => (
  <div className="flex-1">
    <div className="flex items-start justify-between mb-3">
      <span className="text-sm font-medium text-white">{label}</span>
      <div className="text-right">
        <div className="text-2xl font-bold text-white">
          {percentage.toFixed(2)}%
        </div>
      </div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="flex justify-between text-xs text-white">
        <span>{primaryLabel}</span>
        <span className="font-mono font-semibold text-white">{primaryAmount}</span>
      </div>
      <div className="flex justify-between text-xs text-white">
        <span>{secondaryLabel}</span>
        <span className="font-mono font-semibold text-white">{secondaryAmount}</span>
      </div>
    </div>
    <div className="pt-3 border-t border-blue-300 dark:border-blue-600">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Threshold: <span className="font-semibold text-white">{threshold}</span>
      </div>
    </div>
  </div>
);

export default function ComplianceReport({ data }: ComplianceReportProps) {
  const compliantPercentage = Math.round(
    (data.businessActivityScreen.compliantRevenue /
      (data.businessActivityScreen.compliantRevenue + data.businessActivityScreen.nonCompliantRevenue)) *
      100
  );
  const nonCompliantPercentage = 100 - compliantPercentage;

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatCurrencyDetailed = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-8">
      {/* Verdict Header */}
      <Card className="p-8 border-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-3 mb-3">
              <h1 className="text-4xl font-bold text-white">{data.ticker}</h1>
              <span className="text-lg text-white">{data.companyName}</span>
            </div>
            <p className="text-sm text-white">
              Report Date: {new Date(data.reportDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <VerdictBadge verdict={data.verdict} />
        </div>
      </Card>

      {/* Business Activity Screen */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 px-8 py-6 bg-slate-50 dark:bg-slate-700/50">
          <div className="flex items-center justify-between">
            <SectionHeader title="📋 Business Activity Screen" />
            <StatusBadge status={data.businessActivityScreen.status} />
          </div>
        </div>
        <div className="p-8 space-y-8">
          {/* Compliance Bar */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              Revenue Compliance
            </h3>
            <ProgressBar
              compliantPercentage={compliantPercentage}
              nonCompliantPercentage={nonCompliantPercentage}
            />
            <div className="flex justify-between mt-2 text-xs text-white">
              <span>
                Compliant: <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {compliantPercentage}%
                </span>
              </span>
              <span>
                Non-Compliant: <span className="font-semibold text-red-600 dark:text-red-400">
                  {nonCompliantPercentage}%
                </span>
              </span>
            </div>
          </div>

          {/* Revenue Segments */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              Revenue Breakdown by Segment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.businessActivityScreen.segments.map((segment, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-blue-300 dark:border-blue-600 bg-slate-50 dark:bg-slate-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white text-sm">
                      {segment.name}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        segment.status === 'compliant'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {segment.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-300 dark:bg-slate-600">
                    <div
                      className={`h-full rounded-full transition-all ${
                        segment.status === 'compliant' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${segment.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Source and Filing Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-blue-300 dark:border-blue-600">
            <div>
              <p className="text-xs text-white mb-1">Data Source</p>
              <p className="font-semibold text-white text-sm">
                {data.businessActivityScreen.dataSource}
              </p>
            </div>
            <div>
              <p className="text-xs text-white mb-1">Filing Date</p>
              <p className="font-semibold text-white text-sm">
                {new Date(data.businessActivityScreen.filingDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Financial Screen */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 px-8 py-6 bg-slate-50 dark:bg-slate-700/50">
          <SectionHeader title="💰 Financial Screen" />
        </div>
        <div className="p-8">
          {/* Overall Status Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8 pb-8 border-b border-blue-300 dark:border-blue-600">
            <div className="text-center">
              <div className="mb-2">
                <StatusBadge status={data.financialScreen.interestBearingDebtRatio.status} />
              </div>
              <p className="text-xs text-white">Interest Bearing Debt</p>
            </div>
            <div className="text-center">
              <div className="mb-2">
                <StatusBadge status={data.financialScreen.interestBearingDepositsRatio.status} />
              </div>
              <p className="text-xs text-white">Interest Bearing Deposits</p>
            </div>
            <div className="text-center">
              <div className="mb-2">
                <StatusBadge status={data.financialScreen.tradingCapitalRatio.status} />
              </div>
              <p className="text-xs text-white">Trading Capital</p>
            </div>
          </div>

          {/* Detailed Ratios */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <RatioDisplay
              label="Interest Bearing Debt Ratio"
              percentage={data.financialScreen.interestBearingDebtRatio.percentage}
              primaryAmount={formatCurrencyDetailed(data.financialScreen.interestBearingDebtRatio.debtAmount)}
              primaryLabel="Interest-Bearing Debt"
              secondaryAmount={formatCurrency(data.financialScreen.interestBearingDebtRatio.totalDebt)}
              secondaryLabel="Total Debt"
              threshold={data.financialScreen.interestBearingDebtRatio.threshold}
            />
            <RatioDisplay
              label="Interest Bearing Deposits Ratio"
              percentage={data.financialScreen.interestBearingDepositsRatio.percentage}
              primaryAmount={formatCurrencyDetailed(data.financialScreen.interestBearingDepositsRatio.depositsAmount)}
              primaryLabel="Interest-Bearing Deposits"
              secondaryAmount={formatCurrency(data.financialScreen.interestBearingDepositsRatio.totalAssets)}
              secondaryLabel="Total Assets"
              threshold={data.financialScreen.interestBearingDepositsRatio.threshold}
            />
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-white">
                  Trading Capital Ratio
                </span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {data.financialScreen.tradingCapitalRatio.percentage.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="h-32 flex items-end justify-center mb-4">
                <div
                  className="bg-emerald-500 rounded-t w-12 transition-all"
                  style={{
                    height: `${Math.min(data.financialScreen.tradingCapitalRatio.percentage, 100)}%`,
                  }}
                />
              </div>
              <div className="pt-3 border-t border-blue-300 dark:border-blue-600">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Threshold: <span className="font-semibold text-white">
                    {data.financialScreen.tradingCapitalRatio.threshold}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Analysis */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 px-8 py-6 bg-slate-50 dark:bg-slate-700/50">
          <SectionHeader title="🤖 AI Analysis" />
        </div>
        <div className="p-8">
          <p className="text-white leading-relaxed whitespace-pre-wrap">
            {data.aiAnalysis}
          </p>
        </div>
      </Card>

      {/* Purification */}
      <Card className="overflow-hidden border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
        <div className="border-b border-amber-300 dark:border-amber-700 px-8 py-6 bg-amber-100 dark:bg-amber-900/30">
          <SectionHeader title="🧼 Purification Requirement" />
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="sm:col-span-2">
              <h3 className="text-sm font-semibold text-white mb-3">
                Purification Amount
              </h3>
              <div className="flex items-baseline gap-3">
                <div className="text-4xl font-bold text-amber-700 dark:text-amber-400">
                  {data.purification.percentage}%
                </div>
                <div className="text-sm text-white">
                  of annual investment returns
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-amber-200 dark:border-amber-700">
                <p className="text-sm font-mono text-white">
                  Donate: <span className="font-bold text-amber-700 dark:text-amber-400">
                    {data.purification.amount}
                  </span>
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">
                Explanation
              </h3>
              <p className="text-sm text-white leading-relaxed">
                {data.purification.explanation}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-white py-8">
        <p>
          This report is for informational purposes only and should not be construed as Islamic financial advice.
          Please consult with a qualified Islamic finance scholar.
        </p>
      </div>
    </div>
  );
}
