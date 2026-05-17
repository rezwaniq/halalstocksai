import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface ScreenRequest {
  ticker: string;
  companyName: string;
  selectedCountries: string[];
}

const TOP_15_DEFENSE_CONTRACTORS = [
  'Lockheed Martin',
  'RTX',
  'Raytheon',
  'Boeing Defense',
  'Northrop Grumman',
  'General Dynamics',
  'L3Harris Technologies',
  'BAE Systems',
  'Leidos',
  'Booz Allen Hamilton',
  'SAIC',
  'Huntington Ingalls Industries',
  'Textron',
  'CACI International',
  'ManTech International',
];

async function fetchFMPGeographicData(ticker: string): Promise<string> {
  try {
    if (!FMP_API_KEY) return '';

    // Try multiple FMP endpoints for geographic data
    const endpoints = [
      `https://financialmodelingprep.com/stable/geographic-revenue?symbol=${ticker}&apikey=${FMP_API_KEY}`,
      `https://financialmodelingprep.com/api/v4/geographic-revenue?symbol=${ticker}&apikey=${FMP_API_KEY}`,
      `https://financialmodelingprep.com/api/v3/geographic-revenue?symbol=${ticker}&apikey=${FMP_API_KEY}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);

        // Skip if status is not ok
        if (!response.ok) {
          console.log(`FMP endpoint ${endpoint.split('?')[0]} - Status: ${response.status}`);
          continue;
        }

        const data = await response.json();

        // Check if response has error message
        if (data?.Error || data?.ErrorMessage) {
          console.log(`FMP endpoint returned error:`, data.Error || data.ErrorMessage);
          continue;
        }

        // Check if we got valid geographic data
        if (Array.isArray(data) && data.length > 0) {
          let formatted = 'FMP GEOGRAPHIC REVENUE DATA (Financial Modeling Prep):\n';
          data.forEach((item: any) => {
            const country = item.country || item.region || item.countryName;
            const revenue = item.revenue || item.value || item.revenueBillion;
            const year = item.fiscalYear || item.year || 'Latest';
            if (country && revenue) {
              formatted += `- ${country}: $${revenue}${typeof revenue === 'number' && revenue < 100 ? 'B' : ''} (FY${year})\n`;
            }
          });
          if (formatted.split('\n').length > 2) {
            console.log('FMP geographic data found');
            return formatted;
          }
        }
      } catch (err) {
        console.log(`FMP endpoint error: ${err}`);
        continue;
      }
    }

    console.log('No geographic revenue data available from FMP for', ticker);
    return '';
  } catch (error) {
    console.error('FMP geographic data fetch error:', error);
    return '';
  }
}

async function fetchSECData(companyName: string): Promise<{ text: string; filingDate: string }> {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const startDate = oneYearAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    // First, search for the filing
    const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(
      companyName
    )}&dateRange=custom&startdt=${startDate}&enddt=${endDate}&forms=10-K`;

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) throw new Error('SEC search failed');

    const searchHtml = await searchResponse.text();
    const filingMatch = searchHtml.match(/Filing Date[^>]*>([^<]+)/);
    const filingDate = filingMatch ? filingMatch[1].trim() : new Date().toISOString().split('T')[0];

    // Extract the CIK from search results to construct direct filing URL
    // Try to get the actual filing document instead of just metadata
    // SEC EDGAR filing URL pattern: /cgi-bin/browse-edgar?action=getcompany&CIK=...
    const cikMatch = searchHtml.match(/\/cgi-bin\/browse-edgar[^"]*CIK=(\d+)/);
    if (!cikMatch) {
      console.log('Could not extract CIK from SEC search results');
      return { text: '', filingDate };
    }

    const cik = cikMatch[1];
    // Fetch the company's recent filings
    const companyUrl = `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`;

    const companyResponse = await fetch(companyUrl);
    if (companyResponse.ok) {
      const companyData = await companyResponse.json();
      // Get the most recent 10-K filing
      const filings = companyData.filings?.recent?.form;
      if (filings) {
        const tenKIndex = filings.indexOf('10-K');
        if (tenKIndex >= 0) {
          const filingDetails = {
            accession: companyData.filings.recent.accessionNumber[tenKIndex],
            filingDate: companyData.filings.recent.filingDate[tenKIndex],
          };

          if (filingDetails.accession) {
            // Construct the URL to the actual filing document
            const accessionPath = filingDetails.accession.replace(/-/g, '');
            const filePath = `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${filingDetails.accession}&xbrl_type=v`;

            try {
              const filingResponse = await fetch(filePath);
              if (filingResponse.ok) {
                const filingText = await filingResponse.text();
                // Extract relevant sections: Business, Risk Factors, Geographic data
                const businessMatch = filingText.match(/Item\s+1[.\s]*Business([\s\S]{0,15000}?)(?=Item\s+\d|$)/i);
                const riskMatch = filingText.match(/Item\s+1A[.\s]*Risk\s+Factors([\s\S]{0,10000}?)(?=Item\s+\d|$)/i);

                let extracted = '';
                if (businessMatch) extracted += 'BUSINESS SECTION:\n' + businessMatch[1].substring(0, 8000) + '\n\n';
                if (riskMatch) extracted += 'RISK FACTORS:\n' + riskMatch[1].substring(0, 5000) + '\n';

                return {
                  text: extracted || filingText.substring(0, 15000),
                  filingDate: filingDetails.filingDate || filingDate,
                };
              }
            } catch (err) {
              console.log('Could not fetch actual filing text:', err);
            }
          }
        }
      }
    }

    // Fallback to search metadata if direct filing fetch fails
    return {
      text: searchHtml.substring(0, 5000),
      filingDate,
    };
  } catch (error) {
    console.error('SEC data fetch error:', error);
    return { text: '', filingDate: '' };
  }
}

async function analyzeCountryInvestment(
  companyName: string,
  selectedCountries: string[],
  secText: string,
  fmpGeographicData: string
): Promise<any[]> {
  try {
    const client = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    const prompt = `You are a neutral financial analyst. From the following financial data for ${companyName}, extract ONLY the revenue and capital investment figures for these countries: ${selectedCountries.join(', ')}

IMPORTANT: Prioritize data from FMP Geographic Revenue (most reliable). If not found there, check SEC 10-K filing excerpts.

1. Revenue earned from these countries: ${selectedCountries.join(', ')}
   - State exact dollar figures if available
   - Note the fiscal year
   - Cite data source (FMP or SEC)

2. Capital assets or investments located in these countries: ${selectedCountries.join(', ')}
   - State exact dollar figures if available
   - Include manufacturing plants, facilities, joint ventures, subsidiaries
   - Note the fiscal year

${fmpGeographicData ? `FMP GEOGRAPHIC REVENUE DATA (Primary Source):\n${fmpGeographicData}\n` : ''}
${secText ? `SEC 10-K Filing Excerpts (Supplementary):\n${secText}` : ''}

For EACH country:
- If revenue figure is found: "{Country}: Revenue $X million/billion in FY20XX. Source: [FMP or SEC]"
- If revenue not found: "{Country}: Revenue not separately disclosed"
- If capital figure is found: "{Country}: Capital invested $X million/billion in FY20XX. Source: [FMP or SEC]"
- If capital not found: "{Country}: Capital invested not separately disclosed"

DO NOT estimate or infer figures. Only cite exact figures from the data.
Format as one paragraph per country.`;

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

    // Parse response for each country
    return selectedCountries.map(country => ({
      country,
      analysis: responseText.match(new RegExp(`${country}[^.]*\\.`, 'i'))?.[0] || `${country}: Data not found in filing`,
    }));
  } catch (error) {
    console.error('Country investment analysis error:', error);
    return selectedCountries.map(country => ({
      country,
      analysis: `${country}: Analysis unavailable`,
    }));
  }
}

async function analyzeDefenseContractorRelationships(
  companyName: string,
  secText: string
): Promise<string> {
  try {
    const client = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    const prompt = `From the following SEC filings for ${companyName}, identify any business relationships, investments, equity stakes, customer relationships, or partnerships with any of these defense contractors:
${TOP_15_DEFENSE_CONTRACTORS.join(', ')}

SEC filing excerpts:
${secText}

State exact figures where available.
Cite source for every finding.
If none found, state clearly: "No material relationship identified with top US defense contractors in SEC filings reviewed."
Do not infer or estimate.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return message.content[0].type === 'text' ? message.content[0].text : 'Analysis unavailable';
  } catch (error) {
    console.error('Defense contractor analysis error:', error);
    return 'Analysis unavailable';
  }
}

async function fetchUSASpendingDefenseContracts(companyName: string): Promise<any[]> {
  try {
    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        limit: 5,
      }),
    });

    if (!response.ok) throw new Error('USASpending fetch failed');

    const data = await response.json();
    const contracts = data.results?.results || [];

    return contracts.map((contract: any) => ({
      description: contract.award_description || 'Defense Contract',
      amount: contract.total_obligation || 0,
      agency: 'Department of Defense',
      date: contract.award_date || 'Unknown',
    }));
  } catch (error) {
    console.error('USASpending data fetch error:', error);
    return [];
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

    // Fetch SEC data and FMP geographic data in parallel
    const [secData, fmpGeographicData] = await Promise.all([
      fetchSECData(companyName),
      fetchFMPGeographicData(ticker),
    ]);

    // SECTION 1: Country Investment Analysis
    const countryAnalysis = await analyzeCountryInvestment(companyName, selectedCountries, secData.text, fmpGeographicData);

    // SECTION 2A: Defense Contractor Relationships
    const defenseContractorAnalysis = await analyzeDefenseContractorRelationships(companyName, secData.text);

    // SECTION 2B: Government Defense Contracts
    const defenseContracts = await fetchUSASpendingDefenseContracts(companyName);

    const totalDefenseContractValue = defenseContracts.reduce((sum, contract) => sum + (contract.amount || 0), 0);

    return NextResponse.json({
      ticker,
      selectedCountries,
      section1: {
        title: 'Country Investment Analysis',
        countries: countryAnalysis,
      },
      section2: {
        title: 'Defense Exposure Analysis',
        check2a: {
          title: 'Defense Contractor Relationships',
          analysis: defenseContractorAnalysis,
        },
        check2b: {
          title: 'US Government Defense Contracts',
          contracts: defenseContracts,
          totalValue: totalDefenseContractValue,
          count: defenseContracts.length,
        },
      },
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
