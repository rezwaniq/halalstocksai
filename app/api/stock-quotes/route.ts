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

    // Fetch quotes for popular stocks using stable endpoint
    for (const symbol of POPULAR_STOCKS) {
      try {
        const response = await axios.get(
          `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${FMP_API_KEY}`
        );

        const data = response.data && Array.isArray(response.data) ? response.data[0] : response.data;

        if (data && data.price) {
          const change = ((data.price - (data.previousClose || data.price)) / (data.previousClose || data.price)) * 100;

          quotes.push({
            symbol: data.symbol || symbol,
            price: data.price.toFixed(2),
            change: change.toFixed(2),
          });
        }
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        // Continue with next stock on error
      }
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
