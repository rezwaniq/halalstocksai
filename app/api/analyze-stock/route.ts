import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { checkAndIncrementUsage } from '@/lib/users';

const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SESSION_COOKIE = 'hsa_session';

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

    // FMP returns: [{ symbol, fiscalYear, period, date, data: { segmentName: revenue, ... } }]
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

CRITICAL AAOIFI SEGMENT CLASSIFICATION RULES — follow these exactly:

RULE 1 — RETAIL MARKETPLACE RULE:
A general retail marketplace or e-commerce platform (e.g. Amazon Online Stores, Walmart.com, eBay) is classified as COMPLIANT at the segment level even if it sells some prohibited items among predominantly permissible products. Do NOT classify the entire Online Stores segment as questionable because some prohibited items exist in the product catalog. The 5% impure income threshold applies to the business model, not individual SKUs within a marketplace.

RULE 2 — THIRD PARTY MARKETPLACE FEES:
Third-party seller services (commissions, fulfillment fees, shipping fees earned from facilitating marketplace sales) are classified as COMPLIANT. The marketplace operator is not the seller of prohibited goods — the third-party sellers are.

RULE 3 — PHYSICAL RETAIL STORES:
General grocery and retail stores (Whole Foods, Amazon Fresh, supermarkets, department stores) are classified as COMPLIANT at segment level. Do NOT classify the entire Physical Stores segment as questionable.

RULE 4 — CLOUD COMPUTING:
Cloud infrastructure services (AWS, Azure, Google Cloud) are classified as COMPLIANT. Pure technology services with no inherently prohibited elements.

RULE 5 — ADVERTISING SERVICES:
Advertising revenue is QUESTIONABLE because it may include promotion of prohibited products (alcohol, tobacco, adult content, gambling). Classify as questionable, not compliant.

RULE 6 — SUBSCRIPTION SERVICES:
Subscription services that bundle entertainment content (streaming video, music, audiobooks) with permissible services are QUESTIONABLE because the entertainment portion may include prohibited content.

RULE 7 — INTEREST INCOME:
Any segment named "Interest Income" or describing riba-based income is NON-COMPLIANT without exception. This is absolute.

RULE 8 — GENERAL PRINCIPLE:
Ask: is the PRIMARY business activity of this segment permissible? If yes → COMPLIANT. Only classify as questionable if there is genuine ambiguity about the primary activity.`;

  const userPrompt = `Company: ${companyName} (${ticker})
Sector: ${sector} | Industry: ${industry}

Revenue Segments (including non-operating income where applicable):
${segmentsText}

Classify each segment as exactly one of: "compliant", "questionable", or "non-compliant".

Apply your system prompt rules strictly. Key mappings:
- Online Stores / e-commerce retail → compliant (Rule 1)
- Third-party seller services / marketplace fees → compliant (Rule 2)
- Physical stores / grocery retail → compliant (Rule 3)
- Cloud computing (AWS, Azure etc.) → compliant (Rule 4)
- Advertising services → questionable (Rule 5)
- Subscription services with media streaming → questionable (Rule 6)
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
    // fallback: treat all as questionable
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

// Detects and removes parent/aggregate segments that are rollups of other listed segments.
// FMP sometimes returns both a consolidated total and its constituent line items, causing
// percentages to sum well above 100%.
//
// Pass 1 (name-based): strip entries whose names indicate they are rollup totals —
// these names never appear on real business segments so false positives are impossible.
// Pass 2 (math-based fallback): if the sum still exceeds totalRevenue by >10%, try removing
// each remaining candidate (largest first) until the rest lands within 8% of totalRevenue.
const AGGREGATE_NAME_RE =
  /reportable\s+sub.?segments?|total\s+seg|all\s+seg|seg.*total|consolidated\s+(revenue|sales)|total\s+(revenue|sales)/i;

function deduplicateAggregateSegments(
  segments: { name: string; revenue: number }[],
  totalRevenue: number,
): { name: string; revenue: number }[] {
  if (segments.length <= 1) return segments;

  // Pass 1 — name-based removal
  const afterNames = segments.filter(s => {
    if (AGGREGATE_NAME_RE.test(s.name)) {
      console.log(`[dedup] Removed named rollup: "${s.name}"`);
      return false;
    }
    return true;
  });

  // Pass 2 — math-based fallback (only if sum still exceeds totalRevenue after name pass)
  if (totalRevenue <= 0) return afterNames;
  const segSum = afterNames.reduce((acc, s) => acc + s.revenue, 0);
  if (segSum <= totalRevenue * 1.10) return afterNames;

  const byRevDesc = [...afterNames].sort((a, b) => b.revenue - a.revenue);
  for (const candidate of byRevDesc) {
    const rest = afterNames.filter(s => s !== candidate);
    const restSum = rest.reduce((acc, s) => acc + s.revenue, 0);
    if (Math.abs(restSum - totalRevenue) / totalRevenue <= 0.08) {
      console.log(`[dedup] Removed math rollup: "${candidate.name}"`);
      return deduplicateAggregateSegments(rest, totalRevenue);
    }
  }
  return afterNames;
}

// FIX 3: Post-process classified segments to extract the doubtful digital media portion
// of any general "Online Stores" segment using eMarketer methodology:
// Books/Music/Video = 11.5% of Online Stores revenue; digital media (music/video) = 50% of that = 5.75%.
function applyOnlineStoresSubsegmentation(segments: RevenueSegment[], totalRevenue: number): RevenueSegment[] {
  const result: RevenueSegment[] = [];

  for (const seg of segments) {
    const isOnlineStores = /online store/i.test(seg.name) && seg.classification === 'compliant';
    if (!isOnlineStores) {
      result.push(seg);
      continue;
    }

    const doubtfulRevenue = seg.revenue * 0.0575; // 11.5% × 50%
    const compliantRevenue = seg.revenue - doubtfulRevenue;

    result.push({
      name: seg.name,
      revenue: compliantRevenue,
      percentage: (compliantRevenue / totalRevenue) * 100,
      classification: 'compliant',
      reason: seg.reason,
    });
    result.push({
      name: `${seg.name} — Digital Media (Music & Video)`,
      revenue: doubtfulRevenue,
      percentage: (doubtfulRevenue / totalRevenue) * 100,
      classification: 'questionable',
      reason: 'eMarketer: ~5.75% of Online Stores revenue is music/video streaming — doubtful under AAOIFI entertainment content rules.',
    });
  }

  return result;
}

// AAOIFI Standard No. 21: uses total assets as denominator (industry standard practice).
// Excludes finance/capital lease obligations — only bonds, notes, and revolving credit are
// interest-bearing in the AAOIFI sense.
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

// AAOIFI Standard No. 21 — Two-Gate System
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
    // Non-compliant revenue >= 5%
    verdict = 'Non-compliant';
  } else if (!gate2.debtRatioPasses) {
    // Interest-bearing debt exceeds 33% — AAOIFI Gate 2 hard fail
    verdict = 'Non-compliant';
  } else if (gate1.questionableRevenue >= 5 || !gate2.depositsRatioPasses) {
    // Questionable revenue >= 5%, or deposits ratio fails — upgrades to Questionable
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
  const lines: string[] = [];

  if (verdict === 'Halal') {
    lines.push(`${companyName} passes both AAOIFI gates and is Halal-compliant.`);
  } else if (verdict === 'Questionable') {
    if (gate1.questionableRevenue >= 5) {
      lines.push(
        `${companyName} is questionable because ${gate1.questionableRevenue.toFixed(2)}% of revenue falls in a gray area under AAOIFI standards (threshold: 5%).`
      );
    } else {
      lines.push(
        `${companyName} is questionable because its interest-bearing deposits ratio (${(financialRatios.interestBearingDeposits.ratio * 100).toFixed(2)}%) exceeds the 33% AAOIFI threshold.`
      );
    }
  } else {
    if (gate1.nonCompliantRevenue >= 5) {
      lines.push(
        `${companyName} is non-compliant: non-halal revenue is ${gate1.nonCompliantRevenue.toFixed(2)}%, exceeding the 5% AAOIFI Gate 1 threshold.`
      );
    } else if (!gate2.debtRatioPasses) {
      lines.push(
        `${companyName} is non-compliant: interest-bearing debt ratio is ${(financialRatios.interestBearingDebt.ratio * 100).toFixed(2)}%, exceeding the 33% AAOIFI Gate 2 threshold.`
      );
    } else {
      lines.push(`${companyName} is non-compliant due to a prohibited primary business activity.`);
    }
  }

  lines.push('');
  lines.push(`CONCLUSION: ${lines[0]}`);
  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const usageResult = checkAndIncrementUsage(sessionToken, 'analyze-stock');
    if (!usageResult) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (usageResult.pending) {
      return NextResponse.json(
        { error: 'Your re-access request is pending admin approval. You will be notified by email once approved.' },
        { status: 403 },
      );
    }
    if (!usageResult.allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached', remaining: 0, resetAt: usageResult.resetAt },
        { status: 429 },
      );
    }

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

    // FIX 2: Extract non-operating interest income (riba) from income statement.
    // This is always non-compliant under AAOIFI — must be added as a synthetic segment.
    const interestIncome = (income.interestIncome || 0) > 0 ? (income.interestIncome || 0) : 0;

    // Fetch real product revenue segments
    const rawSegments = await fetchProductSegments(sym);
    // Strip any parent/rollup entries FMP may include alongside their children
    const dedupedSegments = rawSegments ? deduplicateAggregateSegments(rawSegments, totalRevenue) : null;

    let revenueBreakdown: Omit<RevenueBreakdown, 'dataSource'>;
    let dataSource: string;

    if (dedupedSegments && dedupedSegments.length > 0 && totalRevenue > 0) {
      // FIX 2: Inject interest income as synthetic non-compliant segment if > 0.
      // Use totalRevenue + interestIncome as denominator so percentages sum to 100%.
      const augmentedSegments = interestIncome > 0
        ? [...dedupedSegments, { name: 'Interest Income', revenue: interestIncome }]
        : dedupedSegments;
      const augmentedTotal = totalRevenue + interestIncome;

      const classified = await classifySegmentsWithClaude(
        sym, companyName, sector, industry, augmentedSegments, augmentedTotal
      );

      // FIX 3: Online Stores sub-segmentation (eMarketer methodology).
      // Books/Music/Video = 11.5% of Online Stores; 50% of that is digital media = 5.75% doubtful.
      const postProcessed = applyOnlineStoresSubsegmentation(classified, augmentedTotal);

      revenueBreakdown = buildRevenueBreakdown(postProcessed);
      dataSource = 'FMP Revenue Segments (AAOIFI-classified)';
    } else {
      // Fallback: single segment = entire company revenue, classified by Claude
      const fallbackSegments = interestIncome > 0
        ? [{ name: companyName, revenue: totalRevenue }, { name: 'Interest Income', revenue: interestIncome }]
        : [{ name: companyName, revenue: totalRevenue }];
      const augmentedTotal = totalRevenue + interestIncome;
      const classified = await classifySegmentsWithClaude(
        sym, companyName, sector, industry, fallbackSegments, augmentedTotal
      );
      revenueBreakdown = buildRevenueBreakdown(classified);
      dataSource = 'AAOIFI classification (segment data unavailable)';
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
    console.error('Error analyzing stock:', error);
    let message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('credit balance') || message.includes('credit_balance')) {
      message = 'Service temporarily unavailable — API quota reached. Please try again later.';
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
