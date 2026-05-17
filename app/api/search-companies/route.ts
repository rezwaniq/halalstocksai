import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;

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
      `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query.trim())}&limit=10&apikey=${FMP_API_KEY}`
    );

    const results = (response.data || [])
      .slice(0, 10) // Limit to 10 results
      .map((item: any) => ({
        symbol: item.symbol,
        name: item.name,
        currency: item.currency || 'USD',
        exchange: item.exchangeShortName || item.exchange || 'Unknown',
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
