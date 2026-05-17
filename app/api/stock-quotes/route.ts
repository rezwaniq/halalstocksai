import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;

const POPULAR_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'JNJ', 'WMT', 'DIS'];

export async function GET(request: NextRequest) {
  try {
    if (!FMP_API_KEY) {
      return NextResponse.json(
        { error: 'FMP API key not configured' },
        { status: 500 }
      );
    }

    const quotes = [];

    // Fetch all quotes in one request using FMP batch endpoint
    try {
      const symbolList = POPULAR_STOCKS.join(',');
      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/quote/${symbolList}?apikey=${FMP_API_KEY}`
      );

      const data = response.data;

      if (Array.isArray(data)) {
        for (const stock of data) {
          if (stock.symbol && stock.price) {
            const change = ((stock.price - stock.previousClose) / stock.previousClose) * 100;

            quotes.push({
              symbol: stock.symbol,
              price: stock.price.toFixed(2),
              change: change.toFixed(2),
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching FMP quotes:', error);
      // Return empty on error - UI will show fallback data
    }

    if (quotes.length === 0) {
      return NextResponse.json(
        { error: 'No quotes available', stocks: [] },
        { status: 200 }
      );
    }

    return NextResponse.json({
      stocks: quotes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching stock quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock quotes', stocks: [] },
      { status: 200 }
    );
  }
}
