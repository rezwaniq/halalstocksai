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

    // Try FMP revenue-geographic-segmentation endpoint (works with stable API)
    const geoUrl = `https://financialmodelingprep.com/stable/revenue-geographic-segmentation?symbol=${ticker}&apikey=${FMP_API_KEY}`;

    try {
      console.log(`Fetching geographic revenue from: ${geoUrl.split('?')[0]}`);
      const geoResponse = await fetch(geoUrl);
      console.log(`FMP geographic-segmentation response status: ${geoResponse.status}`);

      if (geoResponse.ok) {
        const geoData = await geoResponse.json() as any;
        console.log(`FMP data received, keys: ${JSON.stringify(Object.keys(geoData).slice(0, 5))}`);

        // Log first item to see structure
        if (Array.isArray(geoData) && geoData.length > 0) {
          console.log(`First FMP data item: ${JSON.stringify(geoData[0]).substring(0, 200)}`);
        }

        // Check if we got valid geographic data
        if (geoData && typeof geoData === 'object' && Object.keys(geoData).length > 0) {
          let formatted = 'FMP REVENUE BY GEOGRAPHIC SEGMENT:\n';
          let foundData = false;

          // Handle FMP revenue-geographic-segmentation array response
          if (Array.isArray(geoData)) {
            geoData.forEach((report: any) => {
              const year = report.fiscalYear || report.year || 'Latest';
              const reportDate = report.date || '';

              // FMP returns segment data in the 'data' field
              if (report.data && typeof report.data === 'object') {
                Object.entries(report.data).forEach(([segmentName, revenue]: [string, any]) => {
                  if (!revenue || revenue === 0) return;

                  // Map segment names to countries
                  let country = '';
                  const lowerSegment = segmentName.toLowerCase();

                  if (lowerSegment.includes('china')) country = 'China';
                  else if (lowerSegment.includes('israel')) country = 'Israel';
                  else if (lowerSegment.includes('iran')) country = 'Iran';
                  else if (lowerSegment.includes('russia')) country = 'Russia';
                  else if (lowerSegment.includes('ukraine')) country = 'Ukraine';
                  else if (lowerSegment.includes('korea')) country = 'North Korea';
                  // Also try direct country matches
                  else if (lowerSegment.includes('americas') || lowerSegment.includes('us ') || lowerSegment.includes('north america')) country = 'Americas';
                  else if (lowerSegment.includes('europe')) country = 'Europe';
                  else if (lowerSegment.includes('asia') && !lowerSegment.includes('china')) country = 'Asia Pacific';
                  else return; // Skip non-matching segments

                  if (country && revenue > 0) {
                    const revenueBillions = typeof revenue === 'number' ? (revenue / 1000000000).toFixed(2) : revenue;
                    formatted += `- ${country}: $${revenueBillions}B (FY${year})\n`;
                    foundData = true;
                  }
                });
              }
            });
          } else {
            // Handle object response
            Object.entries(geoData).forEach(([key, value]: [string, any]) => {
              if (typeof value === 'object' && value !== null) {
                const country = value.country || value.region || key;
                const revenue = value.revenue || value.value || value.amount;
                const year = value.fiscalYear || value.year || 'Latest';
                const percent = value.percentage || value.percent;

                if (revenue || percent) {
                  if (revenue) {
                    formatted += `- ${country}: $${typeof revenue === 'number' ? (revenue / 1000000).toFixed(2) : revenue}M${percent ? ` (${percent}%)` : ''} (${year})\n`;
                  } else if (percent) {
                    formatted += `- ${country}: ${percent}% of revenue (${year})\n`;
                  }
                  foundData = true;
                }
              }
            });
          }

          if (foundData) {
            console.log('FMP geographic revenue data found');
            return formatted;
          }
        }
      } else if (geoResponse.status === 404) {
        console.log(`FMP geographic-segmentation endpoint returned 404 (not available for this ticker)`);
      } else {
        console.log(`FMP geographic-segmentation returned status ${geoResponse.status}`);
      }
    } catch (err) {
      console.log(`Error fetching FMP geographic data: ${err}`);
    }

    // Try financial-reports-json for segment data
    try {
      console.log(`Attempting financial-reports-json for geographic segments`);
      const reportsUrl = `https://financialmodelingprep.com/stable/financial-reports-json?symbol=${ticker}&year=2023&period=FY&apikey=${FMP_API_KEY}`;
      const reportsResponse = await fetch(reportsUrl);

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json() as any;
        // Check if there's segment data in financial reports
        if (reportsData?.segment && Object.keys(reportsData.segment).length > 0) {
          let formatted = 'FMP SEGMENT DATA (Geographic):\n';
          Object.entries(reportsData.segment).forEach(([country, data]: [string, any]) => {
            if (typeof data === 'object' && data.revenue) {
              formatted += `- ${country}: $${(data.revenue / 1000000).toFixed(2)}M\n`;
            }
          });
          if (formatted.split('\n').length > 2) {
            console.log('Geographic segment data found in financial reports');
            return formatted;
          }
        }
      }
    } catch (err) {
      console.log(`Error fetching financial reports: ${err}`);
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

    // Log what data we have
    console.log(`analyzeCountryInvestment called for ${companyName}`);
    console.log(`FMP data available: ${fmpGeographicData ? 'YES (' + fmpGeographicData.length + ' chars)' : 'NO'}`);
    console.log(`SEC data available: ${secText ? 'YES (' + secText.length + ' chars)' : 'NO'}`);

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

    const prompt = `You are a financial analyst. Extract geographic revenue and capital investment data for ${companyName} in: ${selectedCountries.join(', ')}

CRITICAL - Output ONLY in this format for EACH country:
- {Country} is showing \$X.XXB {metric} ({FiscalYear}) OR
- {Country}: Inconclusive data found

Metrics: "revenue", "capital invested"
Example outputs:
- China is showing \$64.38B revenue (FY2025)
- Israel: Inconclusive data found

If the data has multiple fiscal years, show the most recent year ONLY.
If you cannot find exact dollar figures, output "Inconclusive data found" for that country.
DO NOT estimate, infer, or use external knowledge.

PROVIDED DATA:
${dataSection}`;


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

    console.log(`Claude response: ${responseText.substring(0, 200)}`);

    // Parse bullet-point responses for each country
    return selectedCountries.map(country => {
      // Look for lines mentioning this country
      const lines = responseText.split('\n');
      const countryLine = lines.find(line =>
        line.toLowerCase().includes(country.toLowerCase()) &&
        (line.includes('showing') || line.includes('Inconclusive') || line.includes(':'))
      );

      if (countryLine) {
        // Extract just the core fact from the line
        const cleaned = countryLine.replace(/^[-•]\s*/, '').trim();
        return { country, analysis: cleaned };
      }

      return { country, analysis: `${country}: Inconclusive data found` };
    });
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
