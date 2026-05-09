import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import yahooFinance from 'yahoo-finance2';

const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

const yahoo = new (yahooFinance as any)({
  logger: {
    info: (...args: any[]) => {},
    warn: (...args: any[]) => {},
    error: (...args: any[]) => {},
    debug: (...args: any[]) => {},
    dir: (...args: any[]) => {}
  }
});
if (yahoo && typeof (yahoo as any).setGlobalConfig === 'function') {
  (yahoo as any).setGlobalConfig({
    validation: { 
      logErrors: false, 
      logResults: false,
      halt: false
    },
    suppressNotices: ['yahooSurvey']
  });
}

// Simple in-memory cache
const cache = {
  quote: new Map<string, { data: any, timestamp: number }>(),
  history: new Map<string, { data: any, timestamp: number }>()
};
const CACHE_TTL = 1 * 60 * 1000;

async function fetchWithCryptoFallback(ticker: string, fetchFn: (symbol: string) => Promise<any>) {
  try {
    const result = await fetchFn(ticker);
    if (result) return result;
    throw new Error('No result');
  } catch (primaryError: any) {
    if (!ticker.includes('-') && !ticker.includes('=')) {
      try {
        const fallbackSymbol = `${ticker}-USD`;
        const result = await fetchFn(fallbackSymbol);
        if (result) return result;
      } catch (secondaryError) {
        throw primaryError;
      }
    }
    throw primaryError;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/stock/:ticker', async (req, res) => {
    try {
      const { ticker } = req.params;
      const normalizedTicker = ticker.toUpperCase().replace(/\./g, '-');
      
      const cached = cache.quote.get(normalizedTicker);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return res.json(cached.data);
      }

      // Try quoteSummary first for rich metadata (summary, profile)
      let data: any = {};
      const mapSummaryData = (summary: any) => {
        return {
          symbol: normalizedTicker,
          shortName: summary.price?.shortName || summary.price?.longName,
          longName: summary.price?.longName,
          regularMarketPrice: summary.price?.regularMarketPrice,
          currentPrice: summary.price?.regularMarketPrice,
          regularMarketChange: summary.price?.regularMarketChange,
          regularMarketChangePercent: summary.price?.regularMarketChangePercent ? summary.price.regularMarketChangePercent * 100 : undefined,
          marketCap: summary.price?.marketCap,
          currency: summary.price?.currency,
          longBusinessSummary: summary.assetProfile?.longBusinessSummary || summary.summaryProfile?.longBusinessSummary,
          sector: summary.assetProfile?.sector,
          industry: summary.assetProfile?.industry,
          quoteType: summary.quoteType?.quoteType
        };
      };

      try {
        const summary = await (yahoo as any).quoteSummary(normalizedTicker, { 
          modules: ['summaryProfile', 'assetProfile', 'price', 'quoteType'] 
        });
        
        if (summary) {
          data = mapSummaryData(summary);
        }
      } catch (e: any) {
        if (e.name === 'FailedYahooValidationError' && e.result) {
          data = mapSummaryData(e.result);
        }
      }

      // Fallback or augment with standard quote
      if (!data.regularMarketPrice || !data.shortName) {
        const quote = await fetchWithCryptoFallback(normalizedTicker, (s) => (yahoo as any).quote(s));
        data = { ...quote, ...data };
      }

      cache.quote.set(normalizedTicker, { data, timestamp: Date.now() });
      res.json(data);
    } catch (error: any) {
      if (error.message === 'No result') {
        res.status(404).json({ error: 'Ticker not found' });
      } else {
        console.error(`Error fetching stock ${req.params.ticker}:`, error);
        res.status(502).json({ 
          error: 'Failed to fetch data from financial provider',
          message: error.message 
        });
      }
    }
  });

  app.get('/api/history/:ticker', async (req, res) => {
    try {
      const { ticker } = req.params;
      const days = parseInt(req.query.days as string, 10) || 30;
      const normalizedTicker = ticker.toUpperCase().replace(/\./g, '-');
      
      const cacheKey = `${normalizedTicker}_${days}`;
      const cached = cache.history.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return res.json(cached.data);
      }

      let history: any = { quotes: [] };
      try {
        history = await fetchWithCryptoFallback(normalizedTicker, (s) => (yahoo as any).chart(s, {
          period1: new Date(new Date().setDate(new Date().getDate() - days)),
          interval: '1d'
        }));
      } catch (e: any) {
        if (e.message !== 'No result') {
          console.error(`Chart fetch failed for ${normalizedTicker}: ${e.message}`);
        }
      }
      
      const data = (history && history.quotes) ? history.quotes : [];
      cache.history.set(cacheKey, { data, timestamp: Date.now() });
      res.json(data);
    } catch (error: any) {
      if (error.message === 'No result') {
        res.status(404).json({ error: 'Ticker not found' });
      } else {
        console.error(`Error fetching history for ${req.params.ticker}:`, error);
        res.status(502).json({ 
          error: 'Failed to fetch history from financial provider',
          message: error.message 
        });
      }
    }
  });

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.get('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(_dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = _dirname.endsWith('build') ? _dirname : path.resolve(_dirname, 'build');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
