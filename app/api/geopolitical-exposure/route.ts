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
    // Note: FMP revenue-geographic-segmentation endpoint is deprecated as of Aug 2025
    // Try alternative endpoints if needed, otherwise return empty
    const response = await fetch(
      `https://financialmodelingprep.com/api/v4/revenue-geographic-segmentation/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
    );
    if (!response.ok) {
      console.log('FMP API not available (endpoint deprecated)');
      return '';
    }
    const data = await response.json();
    if (data.Error || data['Error Message']) {
      console.log('FMP API error:', data['Error Message']);
      return '';
    }
    return JSON.stringify(data);
  } catch (err) {
    console.log('FMP fetch error:', err);
    return '';
  }
}

// Known CIKs for major companies (hardcoded for reliability)
const knownCIKs: Record<string, string> = {
  'APPLE': '0000320193',
  'MICROSOFT': '0000789019',
  'GOOGLE': '0001652044',
  'AMAZON': '0001018724',
  'TESLA': '0001318605',
  'META': '0001326801',
  'NVIDIA': '0001045810',
};

async function fetchSECEdgarFilings(companyName: string, ticker: string, countryName: string): Promise<string> {
  try {
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];

    // Check for known CIK first - try both full name and first word
    let companyKey = companyName.toUpperCase();
    let bestCik = knownCIKs[companyKey];

    // If not found, try just the first word (e.g. "Apple" from "Apple Inc.")
    if (!bestCik) {
      const firstWord = companyName.split(' ')[0].toUpperCase();
      bestCik = knownCIKs[firstWord];
    }

    if (!bestCik) {
      // Fallback: try to find via browse-edgar
      return await tryDirectBrowseEdgar(companyName, ticker, countryName, todayDate);
    }

    // Now fetch up to 5 years of 10-K filings using ATOM format
    const atomUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${bestCik}&type=10-K&dateb=${todayDate}&owner=exclude&count=5&output=atom`;

    const atomResponse = await fetch(atomUrl, {
      headers: {
        'User-Agent': 'mytestproj123 contact@mytestproj123.com',
      },
    });

    if (!atomResponse.ok) {
      console.error('ATOM fetch failed:', atomResponse.status);
      return '';
    }

    let atomXml = await atomResponse.text();
    console.log('ATOM XML length:', atomXml.length, 'Has entries:', atomXml.includes('<entry>'));

    // Check if there are actually any filings
    if (!atomXml.includes('<entry>')) {
      return '';
    }

    // Extract all filing entries from ATOM
    const entries = atomXml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
    console.log('[SEC] Found', entries.length, '10-K filings');

    if (entries.length === 0) {
      return '';
    }

    const allFilingData: string[] = [];

    // Process each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Extract filing URL from this entry
      let filingUrl = '';
      let filingDate = '';

      // Try to get the full URL directly
      let match = entry.match(/href="(https?:\/\/[^"]*\/Archives\/edgar[^"]*\.htm[l]?)"/i);
      if (match) {
        filingUrl = match[1];
      } else {
        // Try to get relative URL and prepend domain
        match = entry.match(/href="(\/Archives\/edgar[^"]*\.htm[l]?)"/i);
        if (match) {
          filingUrl = `https://www.sec.gov${match[1]}`;
        }
      }

      // Extract filing date (format: <updated>YYYY-MM-DD...)
      const dateMatch = entry.match(/<updated>(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        filingDate = dateMatch[1];
      }

      if (!filingUrl) {
        console.log(`[SEC] Skipping entry ${i + 1}: could not extract filing URL`);
        continue;
      }

      console.log(`[SEC] Processing filing ${i + 1}/${entries.length}: ${filingUrl.substring(filingUrl.lastIndexOf('/') + 1)} (${filingDate})`);

      // Fetch document content with rate limiting
      const docContent = await fetchDocumentContent(filingUrl, ticker, countryName);

      if (docContent) {
        // Tag the content with the filing year
        const year = filingDate.split('-')[0];
        allFilingData.push(`[10-K FY${year} filed ${filingDate}]: ${docContent}`);
      }

      // Rate limiting between fetches - 500ms between each to respect SEC EDGAR limits
      if (i < entries.length - 1) {
        await addDelay(500);
      }
    }

    if (allFilingData.length === 0) {
      console.log('[SEC] No relevant data found in any 10-K filing');
      return '';
    }

    const combinedData = allFilingData.join(' ');
    console.log('[SEC] Combined data from', allFilingData.length, 'filings, total length:', combinedData.length);

    // Cap the combined data to avoid exceeding token limits (target ~15k chars)
    const maxLength = 15000;
    return combinedData.length > maxLength ? combinedData.substring(0, maxLength) : combinedData;
  } catch (err) {
    console.error('SEC fetching error:', err);
    return '';
  }
}

async function tryDirectBrowseEdgar(companyName: string, ticker: string, countryName: string, todayDate: string): Promise<string> {
  try {
    // Fallback: use browse-edgar directly and extract first CIK found
    const searchUrl = `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(companyName)}&action=getcompany`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'mytestproj123 contact@mytestproj123.com',
      },
    });

    if (!response.ok) return '';

    const html = await response.text();
    const cikMatch = html.match(/CIK=(\d{7,})/);
    if (!cikMatch) return '';

    const cik = cikMatch[1];
    const atomUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K&dateb=${todayDate}&owner=exclude&count=1&output=atom`;

    const atomResponse = await fetch(atomUrl, {
      headers: {
        'User-Agent': 'mytestproj123 contact@mytestproj123.com',
      },
    });

    if (!atomResponse.ok) return '';

    const atomXml = await atomResponse.text();
    if (!atomXml.includes('<entry>')) return '';

    // Extract filing URL - handle both full and relative URLs
    let filingUrl = '';
    let match = atomXml.match(/href="(https?:\/\/[^"]*\/Archives\/edgar[^"]*\.(htm|html))"/i);
    if (match) {
      filingUrl = match[1];
    } else {
      match = atomXml.match(/href="(\/Archives\/edgar[^"]*\.(htm|html))"/i);
      if (match) {
        filingUrl = `https://www.sec.gov${match[1]}`;
      }
    }

    if (!filingUrl) return '';

    return await fetchDocumentContent(filingUrl, ticker, countryName);
  } catch (err) {
    console.error('Fallback browse-edgar error:', err);
    return '';
  }
}

// Country-specific search terms for more comprehensive document extraction
const countrySearchTerms: Record<string, string[]> = {
  'Israel': ['israel', 'herzliya', 'tel aviv', 'jerusalem', 'r&d center', 'tech hub', 'research center', 'mobileye', 'realface', 'emotient', 'hebrew university', 'technion'],
  'China': ['china', 'beijing', 'shanghai', 'shenzhen', 'manufacturing', 'supply chain', 'uyghur'],
  'Russia': ['russia', 'moscow', 'sanctions', 'exposure', 'ukraine'],
  'Iran': ['iran', 'tehran', 'sanctions'],
  'Ukraine': ['ukraine', 'kyiv', 'war', 'conflict', 'russian'],
  'Myanmar': ['myanmar', 'burma', 'rohingya'],
  'DRC (Congo)': ['congo', 'drc', 'minerals', 'conflict minerals', 'congo'],
  'Nigeria': ['nigeria', 'lagos'],
  'Sudan': ['sudan', 'khartoum'],
  'Ethiopia': ['ethiopia', 'addis ababa'],
  'North Korea': ['north korea', 'pyongyang', 'dprk'],
};

async function fetchDocumentContent(filingUrl: string, ticker: string, countryName: string): Promise<string> {
  try {
    console.log(`[SEC] Fetching from: ${filingUrl}`);

    let content = '';

    // If this is an index page, fetch it to find the actual 10-K document
    if (filingUrl.includes('-index.htm')) {
      console.log('[SEC] This is an index page, fetching to find main document...');

      // Try to construct the likely filename based on ticker
      const basePath = filingUrl.substring(0, filingUrl.lastIndexOf('/'));

      // Try common filename patterns for the 10-K document
      const filenamePatterns = [
        `${ticker.toLowerCase()}-10k.htm`,
        `${ticker.toLowerCase()}-10k.html`,
        `${ticker.toLowerCase()}.htm`,
        `${ticker.toLowerCase()}.html`,
        // Try longer form with date patterns
        `${ticker.toLowerCase()}-2[0-9]*.htm`,
      ];

      let foundUrl = '';

      for (const pattern of filenamePatterns) {
        if (pattern.includes('*')) {
          // For patterns with wildcards, try fetching the index to search
          const indexResponse = await fetch(filingUrl, {
            headers: {
              'User-Agent': 'mytestproj123 contact@mytestproj123.com',
            },
          });

          if (indexResponse.ok) {
            const indexHtml = await indexResponse.text();
            const regex = new RegExp(`href="([^"]*${pattern.replace('*', '[0-9]*')})"`);
            const match = indexHtml.match(regex);
            if (match) {
              // Extract just the filename from the match
              const filename = match[1].split('/').pop() || match[1];
              foundUrl = `${basePath}/${filename}`;
              console.log(`[SEC] Found document matching pattern ${pattern}: ${foundUrl}`);
              break;
            }
          }
        } else {
          // For fixed patterns, try directly
          const testUrl = `${basePath}/${pattern}`;
          const testResponse = await fetch(testUrl, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'mytestproj123 contact@mytestproj123.com',
            },
          });

          if (testResponse.ok || testResponse.status === 200) {
            foundUrl = testUrl;
            console.log(`[SEC] Found document: ${pattern}`);
            break;
          }
        }
      }

      if (foundUrl) {
        filingUrl = foundUrl;
      } else {
        console.log('[SEC] Could not find 10-K document with known patterns');
        return '';
      }
    }

    // Fetch the actual document
    const docResponse = await fetch(filingUrl, {
      headers: {
        'User-Agent': 'mytestproj123 contact@mytestproj123.com',
      },
    });

    if (!docResponse.ok) {
      console.log(`[SEC] Document fetch failed: ${docResponse.status}`);
      return '';
    }

    content = await docResponse.text();
    console.log(`[SEC] Document fetched, length: ${content.length}`);

    // Clean HTML/XML but preserve sentence structure
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    content = content.replace(/<[^>]*>/g, ' ');
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/\s+/g, ' ');

    // Split into sentences for analysis (lower threshold to catch shorter mentions)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    console.log(`[SEC] Total sentences in document: ${sentences.length}`);

    // Get search terms for this country (country name + major cities/terms)
    const searchTerms = countrySearchTerms[countryName] || [countryName.toLowerCase()];

    // Find sentences matching any of the search terms
    const relevant = sentences.filter(s => {
      const lowerSentence = s.toLowerCase();
      return searchTerms.some(term => lowerSentence.includes(term));
    });

    console.log(`[SEC] Sentences mentioning "${countryName}" or related terms: ${relevant.length}`);

    // If we found direct mentions, return those
    if (relevant.length > 0) {
      const result = relevant.slice(0, 20).map(s => s.trim()).join(' ');
      console.log(`[SEC] Returning ${result.length} chars of direct mention data`);
      return result;
    }

    // If no direct mentions found, look for geographic/segment revenue and operational information
    // This helps capture information about geographic segments, EMEA, and related content
    const segmentKeywords = ['geographic', 'segment', 'emea', 'americas', 'revenue', 'net sales', 'international', 'international net sales', 'region', 'area'];
    const riskKeywords = ['risk', 'political', 'government', 'regulation', 'compliance', 'conflict', 'sanction', 'exposure'];
    const operationalKeywords = ['research', 'development', 'office', 'facility', 'center', 'hub', 'acquired', 'acquisition', 'subsidiary'];

    // Priority 1: Look for segment/revenue information
    const segmentSentences = sentences.filter(s => {
      const lowerSentence = s.toLowerCase();
      return segmentKeywords.some(keyword => lowerSentence.includes(keyword));
    });

    let result = '';
    if (segmentSentences.length > 0) {
      console.log(`[SEC] Found ${segmentSentences.length} segment/revenue sentences`);
      result = segmentSentences.slice(0, 30).map(s => s.trim()).join(' ');
    }

    // Priority 2: Add risk-related information
    const riskSentences = sentences.filter(s => {
      const lowerSentence = s.toLowerCase();
      return riskKeywords.some(keyword => lowerSentence.includes(keyword));
    });

    if (riskSentences.length > 0) {
      console.log(`[SEC] Found ${riskSentences.length} risk-related sentences`);
      if (result) result += ' ';
      result += riskSentences.slice(0, 20).map(s => s.trim()).join(' ');
    }

    // Priority 3: Add operational information
    const operationalSentences = sentences.filter(s => {
      const lowerSentence = s.toLowerCase();
      return operationalKeywords.some(keyword => lowerSentence.includes(keyword));
    });

    if (operationalSentences.length > 0) {
      console.log(`[SEC] Found ${operationalSentences.length} operational sentences`);
      if (result) result += ' ';
      result += operationalSentences.slice(0, 20).map(s => s.trim()).join(' ');
    }

    if (result.length > 0) {
      console.log(`[SEC] Returning ${result.length} chars of contextual data`);
      return result;
    }

    console.log(`[SEC] No contextual information found for ${countryName} in 10-K`);
    return '';
  } catch (err) {
    console.error('[SEC] Document fetch error:', err);
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
FMP geographic revenue data: ${fmpData ? fmpData : '(no data available)'}
SEC EDGAR 10-K excerpts (multiple years): ${secData ? secData : '(no data available)'}
Defense contracts: ${defenseData ? defenseData : '(not applicable or no data)'}
Conflict minerals data: ${conflictData ? conflictData : '(not applicable or no data)'}

Important: If provided data is incomplete, supplement your analysis with your general knowledge about ${companyName}'s known operations, offices, R&D centers, and acquisitions in ${countryName}. Clearly label all general-knowledge facts with "[Source: General knowledge / public record]" in the source field.

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
PARTIAL = some figures found, some not disclosed (possibly supplemented with narrative from general knowledge)
MINIMAL = only text mentions found, no dollar figures

Return only valid JSON. No markdown, no explanation.`;

  const systemPrompt = `You are a neutral financial research analyst specializing in geopolitical risk assessment. Your role is to extract and present factual information from provided data AND supplement with general knowledge when appropriate.

You have two types of knowledge to draw from:

1. **Provided Data Sources** (SEC filings, FMP, USASpending): Always cite the specific document (e.g., "Apple 10-K FY2023 filed 2023-11-02" or "USASpending.gov").

2. **General Knowledge** (your training data about publicly known company operations): You MAY use this to fill gaps, but you MUST clearly label every such fact with "[Source: General knowledge / public record]" in the source field.

Rules you must follow:
- Never fabricate or estimate any FINANCIAL FIGURE. All dollar amounts must come from provided data sources.
- Never express political opinions or make moral judgments.
- Narrative facts (office locations, known acquisitions, R&D centers, known subsidiaries) MAY come from general knowledge if explicitly labeled.
- Cite the exact source for every fact in the "source" field.
- Use neutral, factual language only.
- When data is unavailable from provided sources, explicitly note this and supplement from general knowledge if appropriate.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
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

        const secData = await fetchSECEdgarFilings(companyName, ticker, countryName);
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
