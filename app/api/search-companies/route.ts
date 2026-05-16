import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

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
      'https://finnhub.io/api/v1/search',
      {
        params: {
          q: query.trim(),
          token: FINNHUB_API_KEY,
        },
      }
    );

    const results = (response.data.result || [])
      .filter((item: any) => {
        // Filter to common stocks
        return item.type === 'Common Stock';
      })
      .slice(0, 10) // Limit to 10 results
      .map((item: any) => ({
        symbol: item.symbol,
        name: item.description,
        currency: 'USD',
        exchange: item.displaySymbol,
      }));

    return NextResponse.json(
      { results },
      { status: 200 }
    );
  } catch (error) {
    console.error('Search error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return NextResponse.json(
      { results: [] },
      { status: 200 }
    );
  }
}
