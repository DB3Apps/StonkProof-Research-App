export interface StockInfo {
  symbol: string;
  shortName?: string;
  longName?: string;
  currentPrice?: number;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
  longBusinessSummary?: string;
  conciseSummary?: string;
  newsCatalyst?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  sentiment?: number;
  rsi?: number;
  spiciness?: number;
  researchGrade?: string;
  fullExchangeName?: string;
  news?: any[];
}

export interface HistoryData {
  date: string;
  displayDate: string;
  close: number;
  volume: number;
}

export type AppStep = 'instructions' | 'prompt' | 'results' | 'download' | 'portfolio' | 'research-lists' | 'research-detail';

