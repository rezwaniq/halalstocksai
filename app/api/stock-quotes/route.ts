import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const POPULAR_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'JNJ', 'WMT', 'DIS'];

export async function GET(request: NextRequest) {
  try {
    if (!ALPHA_VANTAGE_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const quotes = [];

    // Fetch quotes for popular stocks
    for (const symbol of POPULAR_STOCKS) {
      try {
        const response = await axios.get(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
        );

        const data = response.data['Global Quote'];

        if (data && data['05. price']) {
          const price = parseFloat(data['05. price']);
          const previousClose = parseFloat(data['08. previous close'] || data['05. price']);
          const change = price - previousClose;
          const changePercent = (change / previousClose) * 100;

          quotes.push({
            symbol,
            price: price.toFixed(2),
            change: changePercent.toFixed(2),
          });
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
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
