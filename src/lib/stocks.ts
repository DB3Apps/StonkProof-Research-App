import { getApiUrl } from "./utils";

export interface StockQuote {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  marketCap?: number;
  longBusinessSummary?: string;
  [key: string]: any;
}

export interface HistoricalData {
  date: string;
  close: number;
}

export async function fetchStockQuote(ticker: string): Promise<StockQuote | null> {
  try {
    const response = await fetch(getApiUrl(`/api/stock/${ticker}`));
    if (!response.ok) throw new Error("Failed to fetch stock");
    return await response.json();
  } catch (error) {
    console.error('Error fetching %s:', ticker, error);
    return null;
  }
}

export async function fetchStockHistory(ticker: string): Promise<HistoricalData[]> {
  try {
    const response = await fetch(getApiUrl(`/api/history/${ticker}`));
    if (!response.ok) throw new Error("Failed to fetch history");
    const data = await response.json();
    return data.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString(),
      close: item.close,
    }));
  } catch (error) {
    console.error('Error fetching history for %s:', ticker, error);
    return [];
  }
}
