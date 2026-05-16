import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
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

async function fetchAlphaVantageData(ticker: string): Promise<{
  profile: CompanyProfile;
  financials: FinancialData;
}> {
  const baseUrl = 'https://www.alphavantage.co/query';

  try {
    // Fetch company overview
    const overviewRes = await fetch(
      `${baseUrl}?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const overview = await overviewRes.json();

    console.log(`Alpha Vantage response for ${ticker}:`, overview);

    if (!overview.Symbol) {
      if (overview.Note) {
        throw new Error(`Daily rate limit exceeded. Alpha Vantage free tier allows 25 requests/day. Please try again tomorrow or upgrade to a premium plan.`);
      }
      if (overview.Information) {
        if (overview.Information.includes('rate limit')) {
          throw new Error(`Daily rate limit exceeded. Alpha Vantage free tier allows 25 requests/day. Please try again tomorrow or upgrade to a premium plan.`);
        }
        throw new Error(`API Error: ${overview.Information}`);
      }
      throw new Error(`Company not found: ${ticker}`);
    }

    // Fetch balance sheet
    const balanceRes = await fetch(
      `${baseUrl}?function=BALANCE_SHEET&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const balanceData = await balanceRes.json();
    const latestBalance = balanceData.annualReports?.[0] || {};

    // Fetch income statement
    const incomeRes = await fetch(
      `${baseUrl}?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const incomeData = await incomeRes.json();
    const latestIncome = incomeData.annualReports?.[0] || {};

    const companyProfile: CompanyProfile = {
      name: overview.Name || ticker,
      marketCap: parseInt(overview.MarketCapitalization) || 0,
      sector: overview.Sector || 'Unknown',
      industry: overview.Industry || 'Unknown',
      description: overview.Description || '',
    };

    const financials: FinancialData = {
      totalDebt: (parseInt(latestBalance.shortTermDebt) || 0) + (parseInt(latestBalance.longTermDebt) || 0),
      cash: parseInt(latestBalance.cashAndCashEquivalents) || 0,
      totalAssets: parseInt(latestBalance.totalAssets) || 0,
      netIncome: parseInt(latestIncome.netIncome) || 0,
      revenue: parseInt(latestIncome.totalRevenue) || 0,
    };

    return { profile: companyProfile, financials };
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
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

  // Impure income ratio - estimate based on non-compliant sectors
  const impureIncomeRatio = estimateImpureIncomeRatio(profile.sector);

  return {
    debtToMarketCap: Math.round(debtToMarketCap * 10000) / 10000,
    cashToMarketCap: Math.round(cashToMarketCap * 10000) / 10000,
    impureIncomeRatio: Math.round(impureIncomeRatio * 10000) / 10000,
    interestBearingDebtRatio: Math.round(interestBearingDebtRatio * 10000) / 10000,
    interestBearingDepositsRatio: Math.round(interestBearingDepositsRatio * 10000) / 10000,
  };
}

function estimateImpureIncomeRatio(sector: string): number {
  const sectorLower = sector.toLowerCase();

  // Non-compliant sectors with high impure income
  const nonCompliantSectors: { [key: string]: number } = {
    'financial services': 0.8,
    'banks': 0.9,
    'insurance': 0.7,
    'alcohol': 0.95,
    'gambling': 0.95,
    'tobacco': 0.95,
    'defense': 0.6,
    'aerospace': 0.6,
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
    if (sectorLower.includes(key)) {
      return value;
    }
  }

  // Check non-compliant sectors
  for (const [key, value] of Object.entries(nonCompliantSectors)) {
    if (sectorLower.includes(key)) {
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

Key Financial Metrics:
- Debt-to-Market-Cap Ratio: ${ratios.debtToMarketCap.toFixed(4)} (threshold: 0.33)
- Cash-to-Market-Cap Ratio: ${ratios.cashToMarketCap.toFixed(4)}
- Impure Income Ratio: ${ratios.impureIncomeRatio.toFixed(4)} (threshold: 0.05)

Guidelines:
1. A company is compliant if debt-to-market-cap < 0.33 AND impure income < 0.05
2. Consider the nature of the business and sector
3. Evaluate if the company's operations align with Islamic principles

START your response with EXACTLY ONE of these lines:
VERDICT: Halal
VERDICT: Questionable
VERDICT: Non-compliant

Then explain your reasoning in plain English.`;

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
    if (!ALPHA_VANTAGE_API_KEY || !ANTHROPIC_API_KEY) {
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

    const { profile, financials } = await fetchAlphaVantageData(ticker.toUpperCase());
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
