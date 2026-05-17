import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface CompanyProfile {
  name: string;
  marketCap: number;
  industry: string;
  sector: string;
  description: string;
}

interface FinancialData {
  totalDebt: number;
  cash: number;
  totalAssets: number;
  netIncome: number;
  revenue: number;
}

interface Ratios {
  debtToMarketCap: number;
  cashToMarketCap: number;
  impureIncomeRatio: number;
  interestBearingDebtRatio?: number;
  interestBearingDepositsRatio?: number;
}

interface FinancialMetrics {
  totalDebtDollars: number;
  interestBearingDebtDollars: number;
  cashDollars: number;
  interestBearingDepositsDollars: number;
  purificationPercentage: number;
}

async function fetchFMPData(ticker: string): Promise<{
  profile: CompanyProfile;
  financials: FinancialData;
}> {
  try {
    // Fetch company profile using stable endpoint
    const profileRes = await fetch(
      `https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${FMP_API_KEY}`
    );
    const profileData = await profileRes.json();
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;

    if (!profile || !profile.symbol) {
      throw new Error(`Company not found: ${ticker}`);
    }

    // Fetch balance sheet using stable endpoint
    const balanceRes = await fetch(
      `https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${ticker}&apikey=${FMP_API_KEY}`
    );
    const balanceData = await balanceRes.json();
    const latestBalance = Array.isArray(balanceData) ? balanceData[0] : {};

    // Fetch income statement using stable endpoint
    const incomeRes = await fetch(
      `https://financialmodelingprep.com/stable/income-statement?symbol=${ticker}&apikey=${FMP_API_KEY}`
    );
    const incomeData = await incomeRes.json();
    const latestIncome = Array.isArray(incomeData) ? incomeData[0] : {};

    const companyProfile: CompanyProfile = {
      name: profile.companyName || ticker,
      marketCap: profile.marketCap || profile.marketCapitalization || 0,
      sector: profile.sector || 'Unknown',
      industry: profile.industry || 'Unknown',
      description: profile.description || '',
    };

    const financials: FinancialData = {
      totalDebt: latestBalance.totalDebt || (latestBalance.shortTermDebt || 0) + (latestBalance.longTermDebt || 0),
      cash: latestBalance.cashAndCashEquivalents || 0,
      totalAssets: latestBalance.totalAssets || 0,
      netIncome: latestIncome.netIncome || 0,
      revenue: latestIncome.revenue || 0,
    };

    return { profile: companyProfile, financials };
  } catch (error) {
    console.error(`Error fetching FMP data for ${ticker}:`, error);
    throw new Error(`Failed to fetch data for ${ticker}`);
  }
}

function calculateRatios(profile: CompanyProfile, financials: FinancialData): Ratios {
  const marketCap = profile.marketCap;

  // Debt-to-market-cap ratio
  const debtToMarketCap = marketCap > 0 ? financials.totalDebt / marketCap : 0;

  // Cash-to-market-cap ratio
  const cashToMarketCap = marketCap > 0 ? financials.cash / marketCap : 0;

  // Interest-bearing debt ratio (approximately 75% of total debt)
  const interestBearingDebtRatio = debtToMarketCap * 0.75;

  // Interest-bearing deposits ratio (cash in interest-bearing accounts ~50%)
  const interestBearingDepositsRatio = cashToMarketCap * 0.5;

  // Impure income ratio - estimate based on non-compliant sectors and industries
  const impureIncomeRatio = estimateImpureIncomeRatio(profile.sector, profile.industry);

  return {
    debtToMarketCap: Math.round(debtToMarketCap * 10000) / 10000,
    cashToMarketCap: Math.round(cashToMarketCap * 10000) / 10000,
    impureIncomeRatio: Math.round(impureIncomeRatio * 10000) / 10000,
    interestBearingDebtRatio: Math.round(interestBearingDebtRatio * 10000) / 10000,
    interestBearingDepositsRatio: Math.round(interestBearingDepositsRatio * 10000) / 10000,
  };
}

function estimateImpureIncomeRatio(sector: string, industry: string = ''): number {
  const sectorLower = sector.toLowerCase();
  const industryLower = industry.toLowerCase();
  const combined = `${sectorLower} ${industryLower}`;

  // Non-compliant sectors with high impure income
  const nonCompliantSectors: { [key: string]: number } = {
    'financial services': 0.8,
    'banks': 0.9,
    'insurance': 0.7,
    'alcohol': 0.95,
    'gambling': 0.95,
    'tobacco': 0.95,
    'weapons': 0.95,
    'defense': 0.95,
    'aerospace & defense': 0.95,
    'aerospace': 0.9,
    'entertainment': 0.4,
  };

  // Compliant sectors with low impure income
  const compliantSectors: { [key: string]: number } = {
    'technology': 0.01,
    'software': 0.01,
    'consumer electronics': 0.02,
    'automotive': 0.02,
    'healthcare': 0.03,
    'pharmaceuticals': 0.03,
    'energy': 0.03,
    'manufacturing': 0.02,
    'retail': 0.02,
    'utilities': 0.02,
    'education': 0.01,
    'halal': 0.01,
    'islamic': 0.01,
  };

  // Check compliant sectors first
  for (const [key, value] of Object.entries(compliantSectors)) {
    if (combined.includes(key)) {
      return value;
    }
  }

  // Check non-compliant sectors
  for (const [key, value] of Object.entries(nonCompliantSectors)) {
    if (combined.includes(key)) {
      return value;
    }
  }

  return 0.02; // Default low impure income for unknown sectors
}

async function analyzeWithClaude(
  ticker: string,
  company: CompanyProfile,
  financials: FinancialData,
  ratios: Ratios
): Promise<{
  verdict: 'Halal' | 'Questionable' | 'Non-compliant';
  explanation: string;
}> {
  const client = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });

  const prompt = `You are a Shariah compliance analyst for Islamic finance. Analyze the following company for halal compliance based on AAOIFI (Accounting and Auditing Organization for Islamic Financial Institutions) standards.

Company: ${ticker}
Sector: ${company.sector}
Industry: ${company.industry}
Market Cap: $${(company.marketCap / 1e9).toFixed(2)}B

Financial Metrics (AAOIFI Two-Gate Test):
- Interest-Bearing Debt Ratio: ${(ratios.debtToMarketCap * 100).toFixed(2)}% (Threshold: 33%)
  ${ratios.debtToMarketCap <= 0.33 ? '✓ PASS - Acceptable debt levels' : '✗ FAIL - Excessive debt'}
- Impure Income Ratio: ${(ratios.impureIncomeRatio * 100).toFixed(2)}% (Threshold: 5%)
  ${ratios.impureIncomeRatio <= 0.05 ? '✓ PASS - Minimal non-halal revenue' : '✗ FAIL - Significant non-halal revenue'}

Analysis Framework:
1. Evaluate the company's PRIMARY BUSINESS MODEL and SECTOR for halal compliance
   - Is the core business activity permissible under Islamic law?
   - Does the company operate in prohibited sectors? (alcohol, gambling, weapons/defense, interest banking, etc.)
   - What percentage of operations are compliant vs. non-compliant?

2. Evaluate the FINANCIAL METRICS using AAOIFI thresholds
   - Debt and interest-bearing assets must pass both gates

3. Make your VERDICT based on BOTH factors:
   - HALAL: Both gates pass AND core business is Islamic-compliant
   - QUESTIONABLE: Gates pass but core business has concerns OR gates fail but business is mostly halal
   - NON-COMPLIANT: Core business is prohibited OR both gates fail

START your response with EXACTLY ONE of these lines:
VERDICT: Halal
VERDICT: Questionable
VERDICT: Non-compliant

Then explain your reasoning, discussing both financial metrics and business sector appropriateness.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract verdict from the structured response
  let verdict: 'Halal' | 'Questionable' | 'Non-compliant' = 'Questionable';

  const verdictMatch = responseText.match(/VERDICT:\s*(Halal|Questionable|Non-compliant)/i);
  if (verdictMatch) {
    const verdictText = verdictMatch[1].toLowerCase();
    if (verdictText === 'halal') {
      verdict = 'Halal';
    } else if (verdictText === 'non-compliant') {
      verdict = 'Non-compliant';
    } else {
      verdict = 'Questionable';
    }
  }

  return {
    verdict,
    explanation: responseText,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!FMP_API_KEY || !ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Missing API keys' },
        { status: 500 }
      );
    }

    const { ticker } = await request.json();

    if (!ticker || typeof ticker !== 'string') {
      return NextResponse.json(
        { error: 'Invalid ticker symbol' },
        { status: 400 }
      );
    }

    const { profile, financials } = await fetchFMPData(ticker.toUpperCase());
    const ratios = calculateRatios(profile, financials);
    const analysis = await analyzeWithClaude(ticker.toUpperCase(), profile, financials, ratios);

    // Calculate financial metrics for detailed display
    const interestBearingDebt = financials.totalDebt * 0.75;
    const interestBearingDeposits = financials.cash * 0.5;
    const impureIncome = financials.revenue * ratios.impureIncomeRatio;
    const purificationPercentage = ratios.impureIncomeRatio * 100;

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      company: {
        name: profile.name,
        sector: profile.sector,
        industry: profile.industry,
        marketCap: profile.marketCap,
      },
      ratios,
      financialMetrics: {
        totalDebtDollars: financials.totalDebt,
        interestBearingDebtDollars: interestBearingDebt,
        cashDollars: financials.cash,
        interestBearingDepositsDollars: interestBearingDeposits,
        purificationPercentage: Math.round(purificationPercentage * 100) / 100,
      },
      analysis,
      date: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Error analyzing stock:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
