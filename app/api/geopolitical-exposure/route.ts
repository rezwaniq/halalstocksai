import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { checkAndIncrementUsage } from '@/lib/users';

export const maxDuration = 300;

const SESSION_COOKIE = 'hsa_session';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Interfaces ────────────────────────────────────────────────────────────────

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

// ── Utilities ─────────────────────────────────────────────────────────────────

function addDelay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fix 2: per-fetch timeout so a single slow server can't hang the whole request
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Fix 7: exponential-backoff retry — only retries on network errors and retriable HTTP codes
const RETRIABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000,
  maxAttempts = 3,
): Promise<Response> {
  let lastErr: Error = new Error('fetchWithRetry: no attempts made');
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const backoffMs = 1000 * 2 ** (attempt - 1); // 1 s → 2 s → 4 s
      console.log(`[fetch] retry ${attempt}/${maxAttempts - 1}, backoff ${backoffMs} ms for ${url}`);
      await addDelay(backoffMs);
    }
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);
      if (RETRIABLE_STATUS.has(res.status)) {
        lastErr = new Error(`HTTP ${res.status} — retriable`);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr;
}

// Fix 8: deterministic context-window extraction — identical input always yields identical output.
// Scans cleaned text for every keyword match and returns ±windowChars of surrounding prose.
// Overlapping windows are merged so there is no duplication.
function extractWithContextWindow(
  text: string,
  terms: string[],
  windowChars = 600,
  maxOutputChars = 12000,
): string {
  const lower = text.toLowerCase();
  const windows: [number, number][] = [];

  for (const term of terms) {
    let pos = lower.indexOf(term);
    while (pos !== -1) {
      windows.push([
        Math.max(0, pos - windowChars),
        Math.min(text.length, pos + term.length + windowChars),
      ]);
      pos = lower.indexOf(term, pos + 1);
    }
  }

  if (windows.length === 0) return '';

  windows.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [windows[0]];
  for (const w of windows.slice(1)) {
    const last = merged[merged.length - 1];
    if (w[0] <= last[1]) {
      last[1] = Math.max(last[1], w[1]);
    } else {
      merged.push(w);
    }
  }

  return merged
    .map(([s, e]) => text.slice(s, e).replace(/\s+/g, ' ').trim())
    .join(' … ')
    .slice(0, maxOutputChars);
}

// Fix 6: confirms the HTML document was fully received (not truncated mid-transfer).
// Checks for the closing HTML tag AND the mandatory signatures block that every
// SEC 10-K must contain near the end of the document.
function isCompleteHTMLDoc(raw: string): boolean {
  return (
    /<\/html>/i.test(raw) &&
    /pursuant to the requirements of the securities exchange act/i.test(raw)
  );
}

function cleanHtml(raw: string): string {
  return raw
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

// ── Country mappings ──────────────────────────────────────────────────────────

// Search terms for extracting country-relevant narrative from the 10-K body
const countrySearchTerms: Record<string, string[]> = {
  'Israel': ['israel', 'herzliya', 'tel aviv', 'jerusalem', 'r&d center', 'tech hub', 'research center', 'mobileye', 'hebrew university', 'technion'],
  'China': ['china', 'beijing', 'shanghai', 'shenzhen', 'manufacturing', 'supply chain', 'uyghur'],
  'Russia': ['russia', 'moscow', 'sanctions', 'exposure'],
  'Iran': ['iran', 'tehran', 'sanctions'],
  'Ukraine': ['ukraine', 'kyiv', 'war', 'conflict', 'russian'],
  'Myanmar': ['myanmar', 'burma', 'rohingya'],
  'DRC (Congo)': ['congo', 'drc', 'minerals', 'conflict minerals'],
  'Sudan': ['sudan', 'khartoum'],
  'North Korea': ['north korea', 'pyongyang', 'dprk'],
};

// Revenue segment keywords to identify which geographic segments map to each country
const countrySegmentKeywords: Record<string, string[]> = {
  'Israel': ['israel', 'emea', 'europe', 'middle east', 'international'],
  'China': ['china', 'greater china', 'asia', 'pacific', 'apac'],
  'Russia': ['russia', 'emea', 'europe', 'cis', 'international'],
  'Iran': ['iran', 'emea', 'middle east', 'international'],
  'Ukraine': ['ukraine', 'emea', 'europe', 'international'],
  'Myanmar': ['myanmar', 'burma', 'asia', 'pacific', 'apac', 'southeast asia', 'international'],
  'DRC (Congo)': ['africa', 'emea', 'sub-saharan', 'international'],
  'Sudan': ['africa', 'emea', 'middle east', 'international'],
  'North Korea': ['korea', 'north korea', 'asia', 'pacific', 'international'],
};

// ── FMP fetchers (Fix 3, 4, 5) ────────────────────────────────────────────────

// Fix 3: use the stable/ endpoint instead of the deprecated v4/ endpoint
async function fetchFMPGeographicRevenue(ticker: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/revenue-geographic-segmentation?symbol=${ticker}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`,
      {},
      10000,
    );
    if (!res.ok) {
      console.log('[FMP] Geographic revenue not available:', res.status);
      return '';
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return '';
    // Return two most recent fiscal years
    return JSON.stringify(data.slice(0, 2));
  } catch (err) {
    console.error('[FMP] Geographic revenue error:', err);
    return '';
  }
}

// Fix 5: employee count gives Claude a physical-presence proxy even when
// the 10-K narrative doesn't name the country explicitly
async function fetchFMPEmployeeCount(ticker: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/employee-count?symbol=${ticker}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`,
      {},
      10000,
    );
    if (!res.ok) return '';
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return '';
    const recent = data[0];
    return JSON.stringify({
      employeeCount: recent.employeeCount,
      period: recent.periodOfReport,
      filingDate: recent.filingDate,
    });
  } catch (err) {
    console.error('[FMP] Employee count error:', err);
    return '';
  }
}

// Fix 4: retrieve the 10-K document URL directly from FMP — eliminates the
// fragile ATOM-feed parse and the hardcoded CIK map
async function fetchTenKUrl(ticker: string): Promise<string | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const fromDate = twoYearsAgo.toISOString().split('T')[0];

    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/sec-filings-search/symbol?symbol=${ticker}&formType=10-K&from=${fromDate}&to=${today}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`,
      {},
      10000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;

    // FMP may return 10-K/A amendments alongside 10-K filings — take the most recent annual
    const annual = data.find((f: { formType: string }) => f.formType === '10-K');
    const url = annual?.finalLink ?? null;
    console.log(`[FMP] 10-K URL for ${ticker}: ${url}`);
    return url;
  } catch (err) {
    console.error('[FMP] 10-K URL fetch error:', err);
    return null;
  }
}

// Fetches and cleans the 10-K HTML document (Fix 6 + Fix 7)
async function fetchTenKDocument(url: string): Promise<string> {
  try {
    const res = await fetchWithRetry(
      url,
      { headers: { 'User-Agent': 'mytestproj123 contact@mytestproj123.com' } },
      25000,
      3,
    );

    if (!res.ok) {
      console.log(`[SEC] Document fetch failed: ${res.status}`);
      return '';
    }

    const raw = await res.text();
    console.log(`[SEC] Document fetched, length: ${raw.length}`);

    // Fix 6: reject truncated documents — missing closing tag means partial transfer
    if (!isCompleteHTMLDoc(raw)) {
      console.warn('[SEC] Document appears truncated — missing </html> or signature block; discarding');
      return '';
    }

    return cleanHtml(raw);
  } catch (err) {
    console.error('[SEC] Document fetch error:', err);
    return '';
  }
}

// Filters the raw geographic revenue JSON to show segments most likely relevant
// to the country being screened, while still passing Claude the full breakdown
function filterGeographicRevenue(rawData: string, countryName: string): string {
  if (!rawData) return '';
  try {
    const data = JSON.parse(rawData) as Array<{
      fiscalYear: number;
      date: string;
      reportedCurrency: string;
      data: Record<string, number>;
    }>;

    const keywords = countrySegmentKeywords[countryName] ?? ['international', 'non-us'];

    return JSON.stringify(
      data.map(year => {
        const matched: Record<string, number> = {};
        for (const [key, val] of Object.entries(year.data)) {
          if (keywords.some(kw => key.toLowerCase().includes(kw))) {
            matched[key] = val;
          }
        }
        return {
          fiscalYear: year.fiscalYear,
          date: year.date,
          currency: year.reportedCurrency ?? 'USD',
          allSegments: year.data,
          matchedSegmentsForCountry: matched,
        };
      }),
    );
  } catch {
    return rawData;
  }
}

// ── Defence contracts formatter ───────────────────────────────────────────────

// Formats USASpending raw JSON into clean bullet points without Claude.
// Deterministic and runs once per request regardless of how many countries are selected.
function formatDefenceContracts(raw: string): DefenceContractsResult {
  if (!raw) return { found: false, points: [], source: 'USASpending.gov' };
  try {
    const data = JSON.parse(raw) as {
      results: Array<Record<string, unknown>>;
      page_metadata?: { hasNext?: boolean; total?: number };
    };
    if (!data?.results?.length) return { found: false, points: [], source: 'USASpending.gov' };

    const points: string[] = data.results.map(award => {
      const id = award['Award ID'] ?? 'N/A';
      const recipient = award['Recipient Name'] ?? 'Unknown';
      const amount =
        typeof award['Award Amount'] === 'number'
          ? `$${(award['Award Amount'] as number).toLocaleString()}`
          : 'Amount not disclosed';
      // Strip leading NSN codes (e.g. "8502518555!") that USASpending prepends to descriptions
      const rawDesc = (award['Description'] as string) ?? 'No description';
      const description = rawDesc.replace(/^\d+[!]\s*/, '');
      return `Award ${id} — ${recipient} — ${amount}: ${description}.`;
    });

    if (data.page_metadata?.hasNext) {
      const total = data.page_metadata.total;
      const note = total
        ? `Note: ${total} total DoD awards on record; showing top ${data.results.length} by value.`
        : `Note: Additional DoD awards exist beyond the top ${data.results.length} shown.`;
      points.push(note);
    }

    return { found: true, points, source: 'USASpending.gov' };
  } catch {
    return { found: false, points: [], source: 'USASpending.gov' };
  }
}

// ── Government fetchers ───────────────────────────────────────────────────────

// Fix 7: retries on network hiccups; also validates page_metadata presence
// (Fix 10-equivalent for USASpending — confirms the response is complete)
async function fetchUSASpending(companyName: string): Promise<string> {
  try {
    const res = await fetchWithRetry(
      'https://api.usaspending.gov/api/v2/search/spending_by_award/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            recipient_search_text: [companyName],
            award_type_codes: ['A', 'B', 'C', 'D'],
            agencies: [{ type: 'awarding', tier: 'toptier', name: 'Department of Defense' }],
          },
          fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Award Date', 'Awarding Agency', 'Description'],
          limit: 5,
          sort: 'Award Amount',
          order: 'desc',
        }),
      },
      25000,
      3,
    );

    if (!res.ok) return '';
    const data = await res.json();

    // page_metadata indicates a complete, well-formed response
    if (!data?.results || !data?.page_metadata) {
      console.warn('[USASpending] Incomplete response — missing results or page_metadata; discarding');
      return '';
    }

    return JSON.stringify(data);
  } catch (err) {
    console.error('[USASpending] fetch error:', err);
    return '';
  }
}

async function fetchConflictMinerals(companyName: string): Promise<string> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const startDate = fiveYearsAgo.toISOString().split('T')[0];

    const res = await fetchWithRetry(
      `https://efts.sec.gov/LATEST/search-index?q="${companyName}"&forms=SD&dateRange=custom&startdt=${startDate}&enddt=${today}`,
      {
        headers: {
          'User-Agent': 'mytestproj123 contact@mytestproj123.com',
          Accept: 'application/json',
        },
      },
      12000,
      2,
    );

    if (!res.ok) return '';
    const data = await res.json();
    return JSON.stringify(data);
  } catch (err) {
    console.error('[ConflictMinerals] fetch error:', err);
    return '';
  }
}

// ── Claude analysis (Fix 1, 9) ────────────────────────────────────────────────

async function analyzeWithClaude(
  companyName: string,
  ticker: string,
  countryName: string,
  fmpRevenue: string,
  employeeCount: string,
  tenKNarrative: string,
  conflictData: string,
): Promise<AnalysisResult> {
  const userPrompt = `Analyze ${companyName} (${ticker}) for exposure to ${countryName}.

DATA PROVIDED:

1. FMP Geographic Revenue Segments (structured data from SEC filings, via FMP):
${fmpRevenue || '(no data available)'}
"matchedSegmentsForCountry" shows segments most likely relevant to ${countryName}. "allSegments" is the full geographic breakdown. Figures are in USD unless the currency field states otherwise.

2. Employee Count (global headcount from most recent 10-K, via FMP):
${employeeCount || '(no data available)'}
This is company-wide headcount — use as supporting context for physical presence assessment, not as a direct indicator of presence in ${countryName}.

3. SEC 10-K Narrative (text excerpts mentioning ${countryName} or related terms, extracted deterministically from the actual 10-K filing):
${tenKNarrative || '(no relevant mentions found in filing)'}

${conflictData ? `4. Conflict Minerals Disclosure (SEC Form SD filings):
${conflictData}` : ''}

Important: If provided data is incomplete for a field, supplement with your general knowledge about ${companyName}'s known operations in ${countryName}. Label all general-knowledge facts with "[Source: General knowledge / public record]".

Return a JSON object with exactly these fields:

{
  "revenue": {
    "disclosed": true/false,
    "figure": "$X.XB" or null,
    "period": "FY2025" or null,
    "context": "one sentence explanation",
    "broader_segment": "EMEA $24.1B" or null,
    "source": "exact source name and date"
  },
  "physical_presence": {
    "confirmed": true/false,
    "details": ["bullet point 1", "bullet point 2"],
    "source": "exact source name and date"
  },
  "capital_investment": {
    "disclosed": true/false,
    "figure": "$X.XB" or null,
    "details": "one sentence explanation",
    "source": "exact source name and date"
  },
  "notable": {
    "exists": true/false,
    "points": ["bullet point 1", "bullet point 2"],
    "source": "exact source name and date"
  },
  "last_updated": "FY year and filing date"
}

RULES:
- The "notable" field must NEVER contain defence, arms, weapons, military, or US government contract information.
- Limit "notable.points" to a maximum of 5 bullet points. Include only the most material facts.

Return only valid JSON. No markdown, no explanation.`;

  const systemPrompt = `You are a neutral financial research analyst specializing in geopolitical risk assessment. Extract and present factual information from provided data, supplementing with clearly labeled general knowledge where necessary.

You have two types of knowledge:
1. Provided Data Sources (FMP, SEC filings, USASpending): cite the specific document.
2. General Knowledge (training data about publicly known operations): label with "[Source: General knowledge / public record]".

Rules:
- Never fabricate or estimate any financial figure. All dollar amounts must come from provided data.
- Never express political opinions or make moral judgments.
- Narrative facts may come from general knowledge if explicitly labeled.
- Use neutral, factual language only.`;

  // Fix 1: temperature: 0 eliminates LLM-level non-determinism
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in Claude response');

  const parsed = JSON.parse(jsonMatch[0]) as Omit<AnalysisResult, 'data_quality'>;

  // Derive data_quality from structured fields — not from Claude's judgement — so it
  // is always consistent across runs for the same underlying data.
  const hasRevenue = parsed.revenue?.disclosed === true;
  const hasCapex = parsed.capital_investment?.disclosed === true;
  const data_quality: AnalysisResult['data_quality'] =
    hasRevenue && hasCapex ? 'FULL' : hasRevenue || hasCapex ? 'PARTIAL' : 'MINIMAL';

  // Cap bullet lists to prevent count drift between runs
  if (Array.isArray(parsed.notable?.points) && parsed.notable.points.length > 5) {
    parsed.notable.points = parsed.notable.points.slice(0, 5);
  }
  if (Array.isArray(parsed.physical_presence?.details) && parsed.physical_presence.details.length > 4) {
    parsed.physical_presence.details = parsed.physical_presence.details.slice(0, 4);
  }

  return { ...parsed, data_quality };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const usageResult = checkAndIncrementUsage(sessionToken, 'geopolitical-exposure');
    if (!usageResult) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!usageResult.allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached', remaining: 0, resetAt: usageResult.resetAt },
        { status: 429 },
      );
    }

    const { ticker, companyName, selectedCountries, includeDefenceContracts } = await request.json();

    if (!ticker || !companyName || !selectedCountries || selectedCountries.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[GEO] Starting analysis for ${ticker} — countries: ${selectedCountries.join(', ')}`);

    // ── Company-level fetches: done once and shared across all country analyses ──
    // This also means the expensive 10-K document is only downloaded once regardless
    // of how many countries the user selected.
    const [fmpRevenue, employeeCount, tenKUrl, defenseData] = await Promise.all([
      fetchFMPGeographicRevenue(ticker),
      fetchFMPEmployeeCount(ticker),
      fetchTenKUrl(ticker),
      includeDefenceContracts ? fetchUSASpending(companyName) : Promise.resolve(''),
    ]);

    // Fetch and clean the 10-K HTML once (Fix 4 + 6 + 7 apply here)
    const tenKDocument = tenKUrl ? await fetchTenKDocument(tenKUrl) : '';
    if (!tenKDocument) {
      console.warn('[GEO] No valid 10-K document — narrative fields will rely on FMP and general knowledge');
    }

    // Conflict minerals only needed for DRC — fetch once if applicable
    const conflictData = selectedCountries.includes('DRC (Congo)')
      ? await fetchConflictMinerals(companyName)
      : '';

    // ── Per-country analysis ──────────────────────────────────────────────────
    const results: Record<string, AnalysisResult> = {};

    const analyzeCountry = async (countryName: string): Promise<[string, AnalysisResult]> => {
      const countryRevenue = filterGeographicRevenue(fmpRevenue, countryName);

      // Fix 8: context-window extraction is deterministic; sentence-splitting was not
      const searchTerms = countrySearchTerms[countryName] ?? [countryName.toLowerCase()];
      const narrative = tenKDocument ? extractWithContextWindow(tenKDocument, searchTerms) : '';

      console.log(
        `[GEO] Analyzing ${countryName} — narrative: ${narrative.length} chars, revenue: ${countryRevenue ? 'available' : 'none'}`,
      );

      const countryConflictData = countryName === 'DRC (Congo)' ? conflictData : '';

      const analysis = await analyzeWithClaude(
        companyName,
        ticker,
        countryName,
        countryRevenue,
        employeeCount,
        narrative,
        countryConflictData,
      );
      return [countryName, analysis];
    };

    const settled = await Promise.allSettled(selectedCountries.map(analyzeCountry));

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        const [countryName, analysis] = outcome.value;
        results[countryName] = analysis;
      } else {
        const idx = settled.indexOf(outcome);
        const countryName = selectedCountries[idx];
        console.error(`[GEO] Error analyzing ${countryName}:`, outcome.reason);
        results[countryName] = {
          revenue: { disclosed: false, figure: null, period: null, context: 'Error', broader_segment: null, source: 'Error' },
          physical_presence: { confirmed: false, details: [], source: 'Error' },
          capital_investment: { disclosed: false, figure: null, details: 'Error', source: 'Error' },
          notable: { exists: false, points: [], source: 'Error' },
          last_updated: 'Error',
          data_quality: 'MINIMAL',
        };
      }
    }

    // Defence contracts formatted once from raw data — not per-country via Claude
    const defenceContracts = includeDefenceContracts
      ? formatDefenceContracts(defenseData)
      : { found: false, points: [], source: 'Not requested' };

    return NextResponse.json({
      ticker,
      companyName,
      selectedCountries,
      includeDefenceContracts: !!includeDefenceContracts,
      results,
      defenceContracts,
    });
  } catch (error) {
    console.error('[GEO] API Error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
