import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

function addDelay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFMPRevenue(ticker: string, countryName: string): Promise<string> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v4/revenue-geographic-segmentation/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
    );
    if (!response.ok) return '';
    const data = await response.json();
    return JSON.stringify(data);
  } catch (err) {
    return '';
  }
}

async function fetchSECEdgarFilings(companyName: string, countryName: string): Promise<string> {
  try {
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];

    // First, search for company CIK - try to find exact match or most relevant
    const searchUrl = `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(companyName)}&action=getcompany`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'mytestproj123 contact@mytestproj123.com',
      },
    });

    if (!searchResponse.ok) return '';

    let searchHtml = await searchResponse.text();

    // Extract all CIKs and company names
    const cikMatches = searchHtml.match(/CIK=(\d+)[^<]*<\/a><\/td>\s*<td[^>]*>([^<]+)</g) || [];
    if (cikMatches.length === 0) return '';

    // Find the best match (prefer exact company name match)
    let bestCik = '';
    for (const match of cikMatches) {
      const cikRegex = /CIK=(\d+)/;
      const nameRegex = /td>\s*([^<]+)</;
      const cikResult = cikRegex.exec(match);
      const nameResult = nameRegex.exec(match);

      if (cikResult && nameResult) {
        const extractedName = nameResult[1].trim();
        // Prefer exact or near-exact match
        if (extractedName.toUpperCase().includes(companyName.toUpperCase())) {
          bestCik = cikResult[1];
          if (extractedName.toUpperCase().startsWith(companyName.toUpperCase())) {
            break; // Perfect match, stop searching
          }
        }
      }
    }

    if (!bestCik) {
      // Fallback to first CIK found
      const cikMatch = searchHtml.match(/CIK=(\d+)/);
      if (!cikMatch) return '';
      bestCik = cikMatch[1];
    }

    // Now fetch 10-K filings for this CIK using ATOM format
    const atomUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${bestCik}&type=10-K&dateb=${todayDate}&owner=exclude&count=1&output=atom`;

    const atomResponse = await fetch(atomUrl, {
      headers: {
        'User-Agent': 'mytestproj123 contact@mytestproj123.com',
      },
    });

    if (!atomResponse.ok) return '';

    let atomXml = await atomResponse.text();

    // Check if there are actually any filings
    if (!atomXml.includes('<entry>')) {
      return `Company found but no 10-K filings available`;
    }

    // Extract filing URL from ATOM - look for document link more carefully
    const filingMatch = atomXml.match(/<link\s+href="([^"]*\/Archives\/edgar[^"]*\.(htm|html|txt))"\s+rel="alternate"\s+type="text\/html"/i);
    if (!filingMatch) {
      // Fallback pattern
      const altMatch = atomXml.match(/href="([^"]*\/Archives\/edgar[^"]*\.(htm|html))"/);
      if (!altMatch) return '';
      const filingUrl = `https://www.sec.gov${altMatch[1]}`;
      return await fetchDocumentContent(filingUrl, countryName);
    }

    const filingUrl = `https://www.sec.gov${filingMatch[1]}`;
    return await fetchDocumentContent(filingUrl, countryName);
  } catch (err) {
    console.error('SEC fetching error:', err);
    return '';
  }
}

async function fetchDocumentContent(filingUrl: string, countryName: string): Promise<string> {
  try {
    const docResponse = await fetch(filingUrl, {
      headers: {
        'User-Agent': 'mytestproj123 contact@mytestproj123.com',
      },
    });

    if (!docResponse.ok) return '';

    let content = await docResponse.text();

    // Clean HTML/XML but preserve sentence structure
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    content = content.replace(/<[^>]*>/g, ' ');
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/\s+/g, ' ');

    // Extract sentences containing country name
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const relevant = sentences.filter(s => new RegExp(`\\b${countryName}\\b`, 'i').test(s)).slice(0, 5);

    if (relevant.length === 0) {
      return `10-K filing reviewed: No specific ${countryName} mentions found`;
    }

    return relevant.map(s => s.trim().substring(0, 300)).join(' ');
  } catch (err) {
    console.error('Document fetch error:', err);
    return '';
  }
}

async function fetchUSASpending(companyName: string, countryName: string): Promise<string> {
  const defenseCountries = ['Israel', 'Russia', 'Ukraine', 'China', 'Iran', 'North Korea'];

  if (!defenseCountries.includes(countryName)) {
    return '';
  }

  try {
    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: {
          recipient_search_text: [companyName],
          award_type_codes: ['A', 'B', 'C', 'D'],
          agencies: [
            {
              type: 'awarding',
              tier: 'toptier',
              name: 'Department of Defense',
            },
          ],
        },
        fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Award Date', 'Awarding Agency', 'Description'],
        limit: 5,
        sort: 'Award Amount',
        order: 'desc',
      }),
    });

    if (!response.ok) return '';
    const data = await response.json();
    return JSON.stringify(data);
  } catch (err) {
    return '';
  }
}

async function fetchConflictMinerals(companyName: string): Promise<string> {
  try {
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];
    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const startDate = fiveYearsAgo.toISOString().split('T')[0];

    const searchUrl = `https://efts.sec.gov/LATEST/search-index?q="${companyName}"&forms=SD&dateRange=custom&startdt=${startDate}&enddt=${todayDate}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'mytestproj123 contact@mytestproj123.com',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return '';
    const data = await response.json();
    return JSON.stringify(data);
  } catch (err) {
    return '';
  }
}

async function analyzeWithClaude(
  companyName: string,
  ticker: string,
  countryName: string,
  fmpData: string,
  secData: string,
  defenseData: string,
  conflictData: string
): Promise<AnalysisResult> {
  const userPrompt = `Analyze ${companyName} (${ticker}) for exposure to ${countryName}.

Data provided:
FMP geographic revenue data: ${fmpData}
SEC EDGAR 10-K excerpts: ${secData}
Defense contracts: ${defenseData}
Conflict minerals data: ${conflictData}

Return a JSON object with exactly these four fields:

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
    "details": [
      "bullet point 1",
      "bullet point 2"
    ],
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
    "points": [
      "bullet point 1",
      "bullet point 2"
    ],
    "source": "exact source name and date"
  },
  "last_updated": "FY year and filing date",
  "data_quality": "FULL/PARTIAL/MINIMAL"
}

Data quality definitions:
FULL = dollar figures found for revenue AND capital investment
PARTIAL = some figures found, some not disclosed
MINIMAL = only text mentions found, no dollar figures

Return only valid JSON. No markdown, no explanation.`;

  const systemPrompt = `You are a neutral financial research analyst specializing in geopolitical risk assessment. Your role is to extract and present factual information only from the data provided to you.

Rules you must follow:
- Never fabricate or estimate any figure
- Never express political opinions
- Never make moral judgments
- Report only what is explicitly stated in the source documents provided
- If a figure or fact is not in the provided data, say so explicitly
- Cite the exact source for every fact
- Use neutral, factual language only
- If data is unavailable or not separately disclosed, say so clearly`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}

export async function POST(request: NextRequest) {
  try {
    const { ticker, companyName, selectedCountries } = await request.json();

    if (!ticker || !companyName || !selectedCountries || selectedCountries.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const results: Record<string, AnalysisResult> = {};

    for (const countryName of selectedCountries) {
      try {
        const fmpData = await fetchFMPRevenue(ticker, countryName);
        await addDelay(100);

        const secData = await fetchSECEdgarFilings(companyName, countryName);
        await addDelay(100);

        const defenseData = await fetchUSASpending(companyName, countryName);
        await addDelay(100);

        let conflictData = '';
        if (countryName === 'DRC (Congo)') {
          conflictData = await fetchConflictMinerals(companyName);
          await addDelay(100);
        }

        const analysis = await analyzeWithClaude(
          companyName,
          ticker,
          countryName,
          fmpData,
          secData,
          defenseData,
          conflictData
        );

        results[countryName] = analysis;
      } catch (err) {
        console.error(`Error analyzing ${countryName}:`, err);
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

    return NextResponse.json({
      ticker,
      companyName,
      selectedCountries,
      results,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
