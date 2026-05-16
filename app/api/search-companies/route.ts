import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string' || query.length < 2) {
      return NextResponse.json(
        { results: [] },
        { status: 200 }
      );
    }

    const response = await axios.get(
      'https://www.alphavantage.co/query',
      {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: query.trim(),
          apikey: ALPHA_VANTAGE_API_KEY,
        },
      }
    );

    const results = (response.data.bestMatches || [])
      .filter((item: any) => {
        // Filter to main market listings (avoid duplicates and OTC)
        const mainExchanges = ['NASDAQ', 'NYSE', 'AMEX'];
        return mainExchanges.some(ex => item['4. region']?.includes(ex));
      })
      .slice(0, 10) // Limit to 10 results
      .map((item: any) => ({
        symbol: item['1. symbol'],
        name: item['2. name'],
        currency: item['8. currency'],
        exchange: item['4. region'],
      }));

    return NextResponse.json(
      { results },
      { status: 200 }
    );
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { results: [] },
      { status: 200 }
    );
  }
}
