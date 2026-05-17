import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface ScreenRequest {
  ticker: string;
  companyName: string;
  selectedCountries: string[];
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

async function fetchFMPGeographicData(ticker: string): Promise<string> {
  try {
    if (!FMP_API_KEY) {
      return 'Geographic revenue data unavailable - FMP API key not configured';
    }

    const response = await fetch(
      `https://financialmodelingprep.com/stable/revenue-geographic-segmentation?symbol=${ticker}&apikey=${FMP_API_KEY}`
    );

    if (!response.ok) throw new Error('FMP geographic fetch failed');

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return 'Geographic revenue data unavailable';
    }

    // Extract geographic breakdown from first entry
    const geographic = data[0];
    const segments = geographic.geographicalSegments || [];

    if (segments.length === 0) {
      return 'No geographic revenue breakdown available';
    }

    return segments
      .map((seg: any) => `${seg.country || 'Unknown'}: ${seg.revenue || 0}`)
      .join('; ');
  } catch (error) {
    console.error('FMP geographic data fetch error:', error);
    return 'Geographic revenue data unavailable';
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
    const [secData, spendingData, fmpData] = await Promise.all([
      fetchSECData(companyName),
      fetchUSASpendingData(companyName),
      fetchFMPGeographicData(ticker),
    ]);

    // Prepare Claude prompt
    const prompt = `You are a neutral financial analyst specializing in geopolitical risk assessment. You provide factual, source-cited analysis only. You do not express political opinions or make moral judgments. You report only what is documented in official filings and government databases.

Analyze ${companyName} (${ticker}) for geopolitical exposure to these countries: ${selectedCountries.join(', ')}.

Data available:
SEC 10-K excerpts: ${secData.text || 'No SEC data available'}
Defense contracts: ${spendingData}
Geographic revenue: ${fmpData}

For each selected country:
1. State whether any exposure was found
2. If found: describe it factually with figures
3. Cite the specific source (10-K, USASpending, etc)
4. If no exposure found: state that clearly

Format your response with one paragraph per country, starting with the country name followed by a colon.
Be concise — maximum 3 sentences per country.
Do not editorialize or make recommendations.
End with: Sources: [list actual sources used]

Then provide a one-paragraph summary of overall geopolitical exposure.`;

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
    });
  } catch (error) {
    console.error('Geopolitical screen error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 400 }
    );
  }
}
