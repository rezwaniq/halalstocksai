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

async function fetchSECData(companyName: string, ticker: string): Promise<{ text: string; filingDate: string }> {
  try {
    // Try to get CIK from company ticker lookup first
    let cik: string | null = null;

    // Try fetching CIK using SEC company tickers JSON
    try {
      const tickersResponse = await fetch('https://www.sec.gov/files/company_tickers.json');
      if (tickersResponse.ok) {
        const tickersData = await tickersResponse.json();
        // Find company by ticker
        for (const [, company] of Object.entries(tickersData as any)) {
          if ((company as any).ticker?.toUpperCase() === ticker?.toUpperCase()) {
            cik = String((company as any).cik_str).padStart(10, '0');
            console.log(`Found CIK for ${ticker}: ${cik}`);
            break;
          }
        }
      }
    } catch (err) {
      console.log('Could not fetch CIK from tickers file');
    }

    if (!cik) {
      console.log('Could not find CIK for', ticker);
      return { text: '', filingDate: '' };
    }

    // Fetch company filings from SEC data.sec.gov
    const companyUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
    const companyResponse = await fetch(companyUrl);

    if (!companyResponse.ok) {
      console.log('Could not fetch company filings:', companyResponse.status);
      return { text: '', filingDate: '' };
    }

    const companyData = await companyResponse.json() as any;

    // Get the most recent 10-K filing
    const filings = companyData.filings?.recent?.form as string[];
    const accessionNumbers = companyData.filings?.recent?.accessionNumber as string[];
    const filingDates = companyData.filings?.recent?.filingDate as string[];
    const primaryDocuments = companyData.filings?.recent?.primaryDocument as string[];

    if (!filings || filings.length === 0) {
      console.log('No filings found for company');
      return { text: '', filingDate: '' };
    }

    // Find the most recent 10-K
    const tenKIndex = filings.findIndex(f => f === '10-K');
    if (tenKIndex < 0) {
      console.log('No 10-K filing found');
      return { text: '', filingDate: '' };
    }

    const accession = accessionNumbers[tenKIndex];
    const filingDate = filingDates[tenKIndex];
    const primaryDoc = primaryDocuments[tenKIndex];

    if (!accession || !primaryDoc) {
      console.log('Missing accession or primary document');
      return { text: '', filingDate };
    }

    // Construct URL to the filing document
    const accessionPath = accession.replace(/-/g, '');
    const filingUrl = `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik.replace(/^0+/, '')}&accession_number=${accession}&xbrl_type=v`;
    const txtUrl = `https://www.sec.gov/Archives/edgar/${cik}/${accessionPath}/${primaryDoc}`;

    console.log(`Fetching 10-K from: ${txtUrl}`);

    try {
      const filingResponse = await fetch(txtUrl);
      if (filingResponse.ok) {
        const filingText = await filingResponse.text();

        // Extract relevant sections: Business, Geographic, Risk Factors
        const businessMatch = filingText.match(/Item\s+1[.\s]*Business([\s\S]{0,20000}?)(?=Item\s+1A|$)/i);
        const geoMatch = filingText.match(/(?:geographic|country|region|international|revenue by country|revenue by geography)([\s\S]{0,10000}?)(?=Item\s+\d|$)/i);
        const riskMatch = filingText.match(/Item\s+1A[.\s]*Risk\s+Factors([\s\S]{0,15000}?)(?=Item\s+\d|$)/i);

        let extracted = '';
        if (businessMatch) {
          extracted += 'BUSINESS SECTION:\n' + businessMatch[1].substring(0, 15000) + '\n\n';
        }
        if (geoMatch) {
          extracted += 'GEOGRAPHIC/REVENUE SECTION:\n' + geoMatch[1].substring(0, 10000) + '\n\n';
        }
        if (riskMatch) {
          extracted += 'RISK FACTORS:\n' + riskMatch[1].substring(0, 10000) + '\n';
        }

        if (extracted.length > 500) {
          console.log(`Extracted ${extracted.length} characters from 10-K filing`);
          return {
            text: extracted,
            filingDate: filingDate || '',
          };
        } else {
          console.log('Extracted text too short, using full document snippet');
          return {
            text: filingText.substring(0, 20000),
            filingDate: filingDate || '',
          };
        }
      }
    } catch (err) {
      console.log('Could not fetch filing text:', err);
    }

    return { text: '', filingDate };
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

    // Prepare context for Claude
    const dataContext = [];
    if (fmpGeographicData) {
      dataContext.push(`FMP GEOGRAPHIC REVENUE DATA (Primary Source):\n${fmpGeographicData}`);
    }
    if (secText) {
      dataContext.push(`SEC 10-K Filing Content (Supplementary):\n${secText}`);
    }

    const dataSection = dataContext.length > 0
      ? dataContext.join('\n\n')
      : '(Note: Geographic revenue APIs are not available in the current subscription tier. This is a limitation - geographic revenue data exists in SEC 10-K filings but requires premium API access or manual review.)';

    const prompt = `You are a neutral financial analyst researching geographic revenue exposure for ${companyName} in these countries: ${selectedCountries.join(', ')}

Your task: Extract ONLY exact figures for:
1. Revenue earned FROM each country (in the company's fiscal year)
2. Capital assets or investments LOCATED IN each country (manufacturing plants, facilities, joint ventures, subsidiaries)

CRITICAL RULES:
- State exact dollar figures only if available in the provided data
- Always cite the source (FMP, SEC, or filing date/section) for every figure
- If a figure is not found, state clearly: "not separately disclosed"
- DO NOT estimate, interpolate, or infer figures
- DO NOT use external knowledge - only use data provided below

PROVIDED DATA:
${dataSection}

For EACH country (${selectedCountries.join(', ')}):

{Country}:
- Revenue: [exact amount in FY20XX, source, OR "not separately disclosed"]
- Capital Invested: [exact amount, type of assets, FY20XX, source, OR "not separately disclosed"]

Format output as short paragraphs, one per country. Be concise.`;

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
      fetchSECData(companyName, ticker),
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
