import { Timestamp } from "firebase/firestore";

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
  currency?: string;
  sector?: string;
  industry?: string;
  fullExchangeName?: string;
}

export interface HistoryData {
  date: string;
  displayDate: string;
  close: number;
  volume: number;
}

export interface WatchlistData {
  userId: string;
  tickers: string[];
  updatedAt: Timestamp;
}

export interface NoteData {
  userId: string;
  ticker: string;
  content: string;
  createdAt: Timestamp;
}

export type AppStep = 'instructions' | 'prompt' | 'results' | 'download';
