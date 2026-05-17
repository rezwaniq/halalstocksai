import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface ScreenRequest {
  ticker: string;
  companyName: string;
  selectedCountries: string[];
}

// Known US Defense Contractors
const US_DEFENSE_CONTRACTORS = [
  { name: 'Lockheed Martin', ticker: 'LMT', aliases: ['lockheed', 'lmt'] },
  { name: 'Boeing', ticker: 'BA', aliases: ['boeing', 'ba'] },
  { name: 'Raytheon Technologies', ticker: 'RTX', aliases: ['raytheon', 'rtx'] },
  { name: 'General Dynamics', ticker: 'GD', aliases: ['general dynamics', 'gd'] },
  { name: 'Northrop Grumman', ticker: 'NOG', aliases: ['northrop', 'nog'] },
  { name: 'L3Harris Technologies', ticker: 'LHX', aliases: ['l3harris', 'lhx', 'l3'] },
  { name: 'Huntington Ingalls', ticker: 'HII', aliases: ['huntington', 'hii'] },
  { name: 'Leidos', ticker: 'LDOS', aliases: ['leidos', 'ldos'] },
  { name: 'Spirit AeroSystems', ticker: 'SPR', aliases: ['spirit', 'spr'] },
  { name: 'Meggitt', ticker: 'MGGT', aliases: ['meggitt'] },
  { name: 'Textron', ticker: 'TXT', aliases: ['textron', 'txt'] },
  { name: 'Heico', ticker: 'HEI', aliases: ['heico'] },
  { name: 'TransDigm', ticker: 'TDG', aliases: ['transdigm', 'tdg'] },
  { name: 'KBR', ticker: 'KBR', aliases: ['kbr'] },
  { name: 'Orbital ATK', ticker: 'OPS', aliases: ['orbital', 'atk'] },
];

async function analyzeDefenseExposure(
  companyName: string,
  secText: string,
  spendingData: string
): Promise<{
  totalExposure: string;
  contractors: any[];
  analysis: string;
  trend?: string;
}> {
  try {
    const client = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    // Build search patterns for defense contractors
    const contractorPatterns = US_DEFENSE_CONTRACTORS.map(c => c.aliases.join('|')).join('|');

    const prompt = `Analyze the following company data for investments, partnerships, and supply chain relationships with US defense contractors.

Company: ${companyName}

Available data:
SEC 10-K excerpts: ${secText.substring(0, 2000)}
Government contracts/partnerships: ${spendingData}

Known US Defense Contractors to search for:
${US_DEFENSE_CONTRACTORS.map(c => `- ${c.name} (${c.ticker})`).join('\n')}

For EACH defense contractor mentioned:
1. State the company name and relationship type (supplier, partner, investor, joint venture, etc)
2. If investment amount is mentioned: cite the amount and year
3. If no specific amount: describe the nature of relationship
4. Rate exposure as HIGH/MODERATE/LOW based on strategic importance

If no defense contractor relationships are found, state that clearly.

Format each contractor on one line: [Contractor]: [Relationship] [Amount if any]

Then provide a 2-3 sentence overall analysis of defense sector exposure.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse Claude's response to extract contractor info
    const contractors: any[] = [];
    const lines = responseText.split('\n');

    for (const line of lines) {
      for (const contractor of US_DEFENSE_CONTRACTORS) {
        if (line.toLowerCase().includes(contractor.name.toLowerCase())) {
          const match = line.match(/([^:]+):\s*(.+)/);
          if (match) {
            contractors.push({
              contractor: contractor.name,
              relationship: match[2].trim(),
              exposureLevel: line.toLowerCase().includes('high')
                ? 'HIGH'
                : line.toLowerCase().includes('moderate')
                  ? 'MODERATE'
                  : 'LOW',
            });
          }
        }
      }
    }

    // Extract analysis paragraph
    const analysisMatch = responseText.match(/(?:analysis|overall)[\s\S]*?([^\n.]+\.[^\n.]+\.[^\n.]*\.)/i);
    const analysis = analysisMatch ? analysisMatch[1].trim() : 'See detailed findings above.';

    return {
      totalExposure:
        contractors.length > 0
          ? `${contractors.length} contractor(s) identified`
          : 'No direct defense contractor exposure identified',
      contractors,
      analysis,
    };
  } catch (error) {
    console.error('Defense exposure analysis error:', error);
    return {
      totalExposure: 'Analysis unavailable',
      contractors: [],
      analysis: 'Unable to analyze defense contractor exposure at this time.',
    };
  }
}

interface ScreenResult {
  country: string;
  analysis: string;
  exposureLevel: 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';
}

async function fetchSECData(companyName: string): Promise<{ text: string; filingDate: string }> {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const startDate = oneYearAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(
      companyName
    )}&dateRange=custom&startdt=${startDate}&enddt=${endDate}&forms=10-K`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('SEC fetch failed');

    const html = await response.text();

    // Extract basic filing information from HTML
    // This is a simplified extraction - in production you'd parse more carefully
    const filingMatch = html.match(/Filing Date[^>]*>([^<]+)/);
    const filingDate = filingMatch ? filingMatch[1].trim() : new Date().toISOString().split('T')[0];

    // Return a reasonable excerpt from the HTML
    const excerpt = html.substring(0, 2000); // Simplified - would extract risk factors/geographic sections in production

    return {
      text: excerpt || 'SEC 10-K filing data extracted',
      filingDate,
    };
  } catch (error) {
    console.error('SEC data fetch error:', error);
    return { text: '', filingDate: '' };
  }
}

async function fetchUSASpendingData(companyName: string): Promise<string> {
  try {
    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          keyword: companyName,
          award_type_codes: ['A', 'B', 'C', 'D'],
        },
        limit: 10,
      }),
    });

    if (!response.ok) throw new Error('USASpending fetch failed');

    const data = await response.json();

    // Extract defense-related contracts
    const contracts = data.results?.results || [];
    if (contracts.length === 0) {
      return 'No government contracts found';
    }

    // Format contract data
    return contracts
      .slice(0, 5)
      .map(
        (contract: any) =>
          `${contract.award_description || 'Contract'}: $${contract.total_obligation || 0}`
      )
      .join('; ');
  } catch (error) {
    console.error('USASpending data fetch error:', error);
    return 'Government contracts data unavailable';
  }
}

async function fetchFMPGeographicData(ticker: string): Promise<{ formatted: string; raw: any }> {
  try {
    if (!FMP_API_KEY) {
      return {
        formatted: 'Geographic revenue data unavailable - FMP API key not configured',
        raw: null,
      };
    }

    // Try multiple endpoints to get geographic data
    const endpoints = [
      `https://financialmodelingprep.com/stable/revenue-geographic-segmentation?symbol=${ticker}&apikey=${FMP_API_KEY}`,
      `https://financialmodelingprep.com/stable/earning-call-transcript?symbol=${ticker}&apikey=${FMP_API_KEY}`,
    ];

    let data = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          data = await response.json();
          if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!data) {
      return {
        formatted: 'Geographic revenue breakdown not available in current FMP data',
        raw: null,
      };
    }

    // Parse geographic segments
    let segments: any[] = [];
    if (Array.isArray(data)) {
      segments = data[0]?.geographicalSegments || data[0]?.segments || [];
    } else {
      segments = data.geographicalSegments || data.segments || [];
    }

    if (segments.length === 0) {
      return {
        formatted: 'No geographic revenue breakdown available in FMP data',
        raw: null,
      };
    }

    const formatted = segments
      .map((seg: any) => {
        const country = seg.country || seg.region || seg.geography || 'Unknown';
        const revenue = seg.revenue || seg.value || 0;
        const percentage = seg.percentage || seg.percent || 0;

        if (percentage) {
          return `${country}: ${percentage}% of revenue (${revenue})`;
        }
        return `${country}: ${revenue}`;
      })
      .join('; ');

    return {
      formatted,
      raw: segments,
    };
  } catch (error) {
    console.error('FMP geographic data fetch error:', error);
    return {
      formatted: 'Geographic revenue data unavailable',
      raw: null,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const { ticker, companyName, selectedCountries } = (await request.json()) as ScreenRequest;

    if (!ticker || !companyName || !selectedCountries || selectedCountries.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Fetch data from all sources
    const [secData, spendingData, fmpDataResult] = await Promise.all([
      fetchSECData(companyName),
      fetchUSASpendingData(companyName),
      fetchFMPGeographicData(ticker),
    ]);

    const fmpData = fmpDataResult.formatted;

    // Analyze defense exposure (after getting SEC and spending data)
    const defenseExposure = await analyzeDefenseExposure(companyName, secData.text, spendingData);

    // Prepare Claude prompt with emphasis on geographic revenue data
    const prompt = `You are a neutral financial analyst specializing in geopolitical risk assessment. You provide factual, source-cited analysis only. You do not express political opinions or make moral judgments. You report only what is documented in official filings and government databases.

Analyze ${companyName} (${ticker}) for geopolitical exposure to these countries: ${selectedCountries.join(', ')}.

IMPORTANT: Use the Geographic Revenue data as your PRIMARY source for country exposure.
Any country listed in the geographic revenue breakdown has material exposure.

Data available:
Geographic revenue breakdown by country: ${fmpData}
SEC 10-K excerpts: ${secData.text || 'No SEC data available'}
Defense contracts: ${spendingData}

For each of these selected countries: ${selectedCountries.join(', ')}

1. First, check the Geographic Revenue data above for any entry containing this country name
2. If found in geographic data: state the revenue percentage/amount and describe the operations
3. Then check SEC/defense contracts for additional details (military, government ties, etc)
4. Cite sources precisely: "Geographic Revenue Data shows X%", "10-K mentions Y", "No government contracts found"
5. If NO exposure found in ANY source: explicitly state "No documented exposure in available sources"

Format: One paragraph per country, max 3 sentences. Be factual and cite specific percentages from the data.
End with: Sources: [list actual sources used]

Then provide one sentence summarizing overall exposure.`;

    // Call Claude API
    const client = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse Claude's response to extract country-by-country analysis
    const results: ScreenResult[] = [];
    const sources: string[] = [];

    // Track which sources were actually used
    if (secData.text) sources.push('sec');
    if (spendingData && spendingData !== 'Government contracts data unavailable') sources.push('usaspending');
    if (fmpData && fmpData !== 'Geographic revenue data unavailable') sources.push('fmp');

    for (const country of selectedCountries) {
      // Extract analysis for each country from Claude's response
      const countryRegex = new RegExp(`${country}[:\s]*([^]*?)(?=${selectedCountries.join('|')}|Sources:|$)`, 'i');
      const match = responseText.match(countryRegex);
      const analysis = match ? match[1].trim().substring(0, 300) : `No geopolitical exposure found for ${country}.`;

      // Determine exposure level based on keywords in analysis
      let exposureLevel: 'HIGH' | 'MODERATE' | 'LOW' | 'NONE' = 'NONE';
      const lowerAnalysis = analysis.toLowerCase();

      if (lowerAnalysis.includes('significant') || lowerAnalysis.includes('substantial') || lowerAnalysis.includes('major')) {
        exposureLevel = 'HIGH';
      } else if (lowerAnalysis.includes('some') || lowerAnalysis.includes('moderate') || lowerAnalysis.includes('minor')) {
        exposureLevel = 'MODERATE';
      } else if (
        lowerAnalysis.includes('minimal') ||
        lowerAnalysis.includes('limited') ||
        lowerAnalysis.includes('small')
      ) {
        exposureLevel = 'LOW';
      } else if (lowerAnalysis.includes('no') || lowerAnalysis.includes('none')) {
        exposureLevel = 'NONE';
      }

      results.push({
        country,
        analysis,
        exposureLevel,
      });
    }

    // Extract summary (last paragraph)
    const summaryMatch = responseText.match(/(?:Summary|Overall)[:\s]*([^]*?)(?:Sources:|$)/i);
    const summary = summaryMatch
      ? summaryMatch[1].trim().substring(0, 500)
      : 'See country-level analysis above.';

    return NextResponse.json({
      ticker,
      selectedCountries,
      results,
      summary,
      sources,
      filingDate: secData.filingDate,
      defenseExposure,
    });
  } catch (error) {
    console.error('Geopolitical screen error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 400 }
    );
  }
}
