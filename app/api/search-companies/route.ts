import { NextRequest, NextResponse } from 'next/server';
import { stocksList } from '../stocks-list';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string' || query.length < 1) {
      return NextResponse.json(
        { results: [] },
        { status: 200 }
      );
    }

    const lowerQuery = query.toLowerCase().trim();

    // Fuzzy search through local stocks list
    const results = stocksList
      .filter((stock) => {
        const symbolMatch = stock.symbol.toLowerCase().includes(lowerQuery);
        const nameMatch = stock.name.toLowerCase().includes(lowerQuery);
        return symbolMatch || nameMatch;
      })
      .slice(0, 10) // Limit to 10 results
      .map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        currency: 'USD',
        exchange: 'NYSE/NASDAQ',
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
