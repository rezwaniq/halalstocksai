import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface RevenueSegment {
  name: string;
  revenue: number;
  percentage: number;
  classification: 'compliant' | 'questionable' | 'non-compliant';
  reason: string;
}

interface RevenueBreakdown {
  compliant: number;
  questionable: number;
  nonCompliant: number;
  segments: RevenueSegment[];
  dataSource: string;
}

interface FinancialRatios {
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
}

interface Gate1Result {
  passes: boolean;
  nonCompliantRevenue: number;
  questionableRevenue: number;
}

interface Gate2Result {
  passes: boolean;
  debtRatioPasses: boolean;
  depositsRatioPasses: boolean;
}

async function fetchFMPData(ticker: string) {
  const [profileRes, balanceRes, incomeRes] = await Promise.all([
    fetch(`https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${FMP_API_KEY}`),
    fetch(`https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${ticker}&apikey=${FMP_API_KEY}`),
    fetch(`https://financialmodelingprep.com/stable/income-statement?symbol=${ticker}&apikey=${FMP_API_KEY}`),
  ]);

  const [profileData, balanceData, incomeData] = await Promise.all([
    profileRes.json(),
    balanceRes.json(),
    incomeRes.json(),
  ]);

  const profile = Array.isArray(profileData) ? profileData[0] : profileData;
  if (!profile?.symbol) throw new Error(`Company not found: ${ticker}`);

  const balance = Array.isArray(balanceData) ? balanceData[0] : {};
  const income = Array.isArray(incomeData) ? incomeData[0] : {};

  return { profile, balance, income };
}

async function fetchProductSegments(ticker: string): Promise<{ name: string; revenue: number }[] | null> {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/revenue-product-segmentation?symbol=${ticker}&apikey=${FMP_API_KEY}`
    );
    const data = await res.json();

    const latest = Array.isArray(data) ? data[0] : null;
    if (!latest?.data || typeof latest.data !== 'object') return null;

    const segments: { name: string; revenue: number }[] = [];
    for (const [key, value] of Object.entries(latest.data as Record<string, unknown>)) {
      if (typeof value === 'number' && value > 0) {
        segments.push({ name: key, revenue: value });
      }
    }
    return segments.length > 0 ? segments : null;
  } catch {
    return null;
  }
}

async function classifySegmentsWithClaude(
  ticker: string,
  companyName: string,
  sector: string,
  industry: string,
  rawSegments: { name: string; revenue: number }[],
  totalRevenue: number
): Promise<RevenueSegment[]> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const segmentsText = rawSegments
    .map((s, i) => {
      const pct = ((s.revenue / totalRevenue) * 100).toFixed(2);
      return `${i + 1}. ${s.name}: $${(s.revenue / 1e9).toFixed(2)}B (${pct}% of total revenue)`;
    })
    .join('\n');

  const systemPrompt = `You are a Shariah compliance analyst specializing in AAOIFI Standard No. 21 revenue screening.

CORE PRINCIPLE:
The AAOIFI business activity screen asks: "Is the PRIMARY business activity of this segment prohibited?"
If the primary activity is permissible, the segment is COMPLIANT regardless of whether some incidental prohibited products exist within it.
Only flag a segment as NON-COMPLIANT if the prohibited activity IS the primary revenue driver.

SEGMENT CLASSIFICATION RULES:

RULE 1 — GENERAL RETAIL / E-COMMERCE / PHYSICAL STORES:
Online Stores, Physical Stores, General Merchandise, Grocery Retail, Third-Party Seller Services, Marketplace → COMPLIANT.
PRIMARY activity = general retail. General retail is a permissible trade.
The existence of some prohibited products in a large retail catalog does NOT make the segment haram under AAOIFI Standard No. 21.
This applies to Walmart, Amazon, Target, Costco, and all general retailers.

RULE 2 — CLOUD COMPUTING / TECHNOLOGY SERVICES:
AWS, Azure, Google Cloud, enterprise software, SaaS, and all technology services → COMPLIANT.
PRIMARY activity = technology. Permissible.

RULE 3 — MARKETPLACE COMMISSIONS / FULFILLMENT / LOGISTICS:
Third-party seller fees, fulfillment services, shipping, warehousing, logistics → COMPLIANT.
PRIMARY activity = commerce facilitation. Permissible.

RULE 4 — ADVERTISING SERVICES:
Advertising revenue → QUESTIONABLE.
May promote prohibited products. Scholarly debate exists on whether facilitating promotion of haram goods is itself haram.

RULE 5 — SUBSCRIPTION SERVICES BUNDLING ENTERTAINMENT:
Subscription services that bundle streaming video, music, audiobooks, or other entertainment content → QUESTIONABLE.
Entertainment content may include prohibited material.

RULE 6 — CONVENTIONAL BANKING / LENDING / INSURANCE:
Interest-based lending, conventional insurance, credit card interest, riba-based financial services → NON-COMPLIANT.
PRIMARY activity = riba/interest. Absolutely prohibited.

RULE 7 — INTEREST INCOME (NON-OPERATING):
Any segment named "Interest Income" or describing non-operating riba-based income → NON-COMPLIANT without exception.
This is the most important non-compliant figure for most technology and retail companies.`;

  const userPrompt = `Company: ${companyName} (${ticker})
Sector: ${sector} | Industry: ${industry}

Revenue Segments (including non-operating income where applicable):
${segmentsText}

Classify each segment using the rules strictly. Key mappings:
- Online Stores / Physical Stores / General Merchandise / Grocery / Warehouse Club → compliant (Rule 1)
- Third-party seller services / fulfillment / logistics → compliant (Rule 3)
- Cloud computing (AWS, Azure, Google Cloud) → compliant (Rule 2)
- Advertising services → questionable (Rule 4)
- Subscription services with entertainment streaming → questionable (Rule 5)
- Banking / lending / insurance / riba-based services → non-compliant (Rule 6)
- Interest Income → non-compliant (Rule 7, mandatory, no exceptions)

Respond with ONLY a valid JSON array. No markdown, no explanation outside JSON:
[
  {"name": "exact segment name from list", "classification": "compliant", "reason": "one sentence AAOIFI-based reason"},
  ...
]`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';

  let classifications: { name: string; classification: string; reason: string }[] = [];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) classifications = JSON.parse(jsonMatch[0]);
  } catch {
    return rawSegments.map((s) => ({
      name: s.name,
      revenue: s.revenue,
      percentage: (s.revenue / totalRevenue) * 100,
      classification: 'questionable' as const,
      reason: 'Classification unavailable',
    }));
  }

  const classMap = new Map(classifications.map((c) => [c.name, c]));

  return rawSegments.map((s) => {
    const cls = classMap.get(s.name);
    const classification = (cls?.classification as 'compliant' | 'questionable' | 'non-compliant') ?? 'questionable';
    return {
      name: s.name,
      revenue: s.revenue,
      percentage: (s.revenue / totalRevenue) * 100,
      classification,
      reason: cls?.reason ?? 'Insufficient data',
    };
  });
}

function buildRevenueBreakdown(segments: RevenueSegment[]): Omit<RevenueBreakdown, 'dataSource'> {
  let compliant = 0;
  let questionable = 0;
  let nonCompliant = 0;

  for (const s of segments) {
    if (s.classification === 'compliant') compliant += s.percentage;
    else if (s.classification === 'questionable') questionable += s.percentage;
    else nonCompliant += s.percentage;
  }

  return {
    compliant: Math.round(compliant * 100) / 100,
    questionable: Math.round(questionable * 100) / 100,
    nonCompliant: Math.round(nonCompliant * 100) / 100,
    segments,
  };
}

// AAOIFI Standard No. 21: total assets as denominator; excludes capital lease obligations.
function calculateFinancialRatios(balance: Record<string, number>): FinancialRatios {
  const totalAssets = balance.totalAssets || 1;

  const interestBearingDebtAmount =
    (balance.longTermDebt || 0) + (balance.shortTermDebt || 0);

  const interestBearingDepositsAmount =
    (balance.cashAndCashEquivalents || 0) + (balance.shortTermInvestments || 0);

  const debtRatio = interestBearingDebtAmount / totalAssets;
  const depositsRatio = interestBearingDepositsAmount / totalAssets;

  return {
    interestBearingDebt: {
      amount: interestBearingDebtAmount,
      totalAssets,
      ratio: Math.round(debtRatio * 10000) / 10000,
      passes: debtRatio < 0.33,
    },
    interestBearingDeposits: {
      amount: interestBearingDepositsAmount,
      totalAssets,
      ratio: Math.round(depositsRatio * 10000) / 10000,
      passes: depositsRatio < 0.33,
    },
  };
}

// AAOIFI Two-Gate System.
// Gate 1: non-compliant revenue < 5% (questionable does NOT trigger a Gate 1 fail).
// Questionable revenue >= 5% upgrades verdict to Questionable but does not fail Gate 1.
function determineVerdict(
  revenueBreakdown: Omit<RevenueBreakdown, 'dataSource'>,
  financialRatios: FinancialRatios,
  sector: string,
  industry: string
): { verdict: 'Halal' | 'Questionable' | 'Non-compliant'; gate1: Gate1Result; gate2: Gate2Result } {
  const combined = `${sector} ${industry}`.toLowerCase();

  const prohibitedPrimary =
    combined.includes('bank') ||
    combined.includes('financial services') ||
    combined.includes('insurance') ||
    combined.includes('alcohol') ||
    combined.includes('gambling') ||
    combined.includes('tobacco') ||
    combined.includes('weapons') ||
    combined.includes('defense') ||
    combined.includes('aerospace & defense') ||
    combined.includes('adult entertainment');

  const gate1: Gate1Result = {
    passes: revenueBreakdown.nonCompliant < 5,
    nonCompliantRevenue: revenueBreakdown.nonCompliant,
    questionableRevenue: revenueBreakdown.questionable,
  };

  const gate2: Gate2Result = {
    debtRatioPasses: financialRatios.interestBearingDebt.passes,
    depositsRatioPasses: financialRatios.interestBearingDeposits.passes,
    passes: financialRatios.interestBearingDebt.passes && financialRatios.interestBearingDeposits.passes,
  };

  let verdict: 'Halal' | 'Questionable' | 'Non-compliant';

  if (prohibitedPrimary) {
    verdict = 'Non-compliant';
  } else if (!gate1.passes) {
    verdict = 'Non-compliant';
  } else if (!gate2.debtRatioPasses) {
    verdict = 'Non-compliant';
  } else if (gate1.questionableRevenue >= 5 || !gate2.depositsRatioPasses) {
    verdict = 'Questionable';
  } else {
    verdict = 'Halal';
  }

  return { verdict, gate1, gate2 };
}

function buildExplanation(
  companyName: string,
  financialRatios: FinancialRatios,
  gate1: Gate1Result,
  gate2: Gate2Result,
  verdict: string
): string {
  if (verdict === 'Halal') {
    return `${companyName} passes both AAOIFI gates and is Halal-compliant.`;
  } else if (verdict === 'Questionable') {
    if (gate1.questionableRevenue >= 5) {
      return `${companyName} is questionable because ${gate1.questionableRevenue.toFixed(2)}% of revenue falls in a gray area under AAOIFI standards (threshold: 5%).`;
    }
    return `${companyName} is questionable because its interest-bearing deposits ratio (${(financialRatios.interestBearingDeposits.ratio * 100).toFixed(2)}%) exceeds the 33% AAOIFI threshold.`;
  } else {
    if (gate1.nonCompliantRevenue >= 5) {
      return `${companyName} is non-compliant: non-halal revenue is ${gate1.nonCompliantRevenue.toFixed(2)}%, exceeding the 5% AAOIFI Gate 1 threshold.`;
    } else if (!gate2.debtRatioPasses) {
      return `${companyName} is non-compliant: interest-bearing debt ratio is ${(financialRatios.interestBearingDebt.ratio * 100).toFixed(2)}%, exceeding the 33% AAOIFI Gate 2 threshold.`;
    }
    return `${companyName} is non-compliant due to a prohibited primary business activity.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!FMP_API_KEY || !ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing API keys' }, { status: 500 });
    }

    const { ticker } = await request.json();
    if (!ticker || typeof ticker !== 'string') {
      return NextResponse.json({ error: 'Invalid ticker symbol' }, { status: 400 });
    }

    const sym = ticker.toUpperCase();

    const { profile, balance, income } = await fetchFMPData(sym);

    const companyName = profile.companyName || sym;
    const marketCap = profile.marketCap || profile.marketCapitalization || 0;
    const sector = profile.sector || 'Unknown';
    const industry = profile.industry || 'Unknown';
    const totalRevenue = income.revenue || 0;

    // Interest income is always non-compliant (riba). Inject as synthetic segment.
    const interestIncome = (income.interestIncome || 0) > 0 ? (income.interestIncome || 0) : 0;

    const rawSegments = await fetchProductSegments(sym);

    let revenueBreakdown: Omit<RevenueBreakdown, 'dataSource'>;
    let dataSource: string;

    if (rawSegments && rawSegments.length > 0 && totalRevenue > 0) {
      const augmentedSegments = interestIncome > 0
        ? [...rawSegments, { name: 'Interest Income', revenue: interestIncome }]
        : rawSegments;
      const augmentedTotal = totalRevenue + interestIncome;

      const classified = await classifySegmentsWithClaude(
        sym, companyName, sector, industry, augmentedSegments, augmentedTotal
      );

      revenueBreakdown = buildRevenueBreakdown(classified);
      dataSource = 'FMP Revenue Segments (AAOIFI-classified, primary-activity method)';
    } else {
      const fallbackSegments = interestIncome > 0
        ? [{ name: companyName, revenue: totalRevenue }, { name: 'Interest Income', revenue: interestIncome }]
        : [{ name: companyName, revenue: totalRevenue }];
      const augmentedTotal = totalRevenue + interestIncome;
      const classified = await classifySegmentsWithClaude(
        sym, companyName, sector, industry, fallbackSegments, augmentedTotal
      );
      revenueBreakdown = buildRevenueBreakdown(classified);
      dataSource = 'AAOIFI classification — primary-activity method (segment data unavailable)';
    }

    const financialRatios = calculateFinancialRatios(balance);
    const { verdict, gate1, gate2 } = determineVerdict(revenueBreakdown, financialRatios, sector, industry);
    const explanation = buildExplanation(companyName, financialRatios, gate1, gate2, verdict);

    return NextResponse.json({
      ticker: sym,
      company: { name: companyName, sector, industry, marketCap },
      revenueBreakdown: { ...revenueBreakdown, dataSource },
      financialRatios,
      gate1,
      gate2,
      analysis: { verdict, explanation },
      purificationPercentage: revenueBreakdown.nonCompliant,
      date: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Error analyzing stock (app2):', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
