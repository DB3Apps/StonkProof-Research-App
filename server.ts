import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import _yahooFinance from 'yahoo-finance2';
import rateLimit from 'express-rate-limit';
import { getTickersFromAI, getCombinedAnalysis, handleCombinedAnalysisStream, getDeepDiveAnalysis } from './server/gemini.js';

const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

let yahoo: any;
try {
  yahoo = new (_yahooFinance as any)();
} catch (e: any) {
  if (_yahooFinance && (_yahooFinance as any).default && typeof (_yahooFinance as any).default === 'function') {
    yahoo = new (_yahooFinance as any).default();
  } else {
    yahoo = _yahooFinance;
  }
}

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

  app.set('trust proxy', 1);
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
  });
  app.use('/api', limiter);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Gemini Proxy Routes
  app.post('/api/gemini/getTickersFromAI', async (req, res) => {
    try {
      const { userPrompt, limit, excludedTickers } = req.body;
      const tickers = await getTickersFromAI(userPrompt, limit, excludedTickers);
      res.json({ tickers });
    } catch (error: any) {
      console.error("Error in /api/gemini/getTickersFromAI:", error);
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  app.post('/api/gemini/getCombinedAnalysis', async (req, res) => {
    try {
      const { longSummary, useSearch } = req.body;
      const analysis = await getCombinedAnalysis(longSummary, useSearch);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error in /api/gemini/getCombinedAnalysis:", error);
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  app.post('/api/gemini/getCombinedAnalysisStream', async (req, res) => {
    try {
      const { longSummary, useSearch } = req.body;
      await handleCombinedAnalysisStream(longSummary, res, useSearch);
    } catch (error: any) {
      console.error("Error in /api/gemini/getCombinedAnalysisStream:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || String(error) });
      }
    }
  });

  app.post('/api/gemini/getDeepDiveAnalysis', async (req, res) => {
    try {
      const { ticker, companyInfo } = req.body;
      const analysis = await getDeepDiveAnalysis(ticker, companyInfo);
      res.json({ analysis });
    } catch (error: any) {
      console.error("Error in /api/gemini/getDeepDiveAnalysis:", error);
      res.status(500).json({ error: error.message || String(error) });
    }
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
      // Log as warn instead of error to avoid excessive noise for expected 404s
      console.warn('Error fetching stock info for %s: %s', req.params.ticker, error.message);

      // If Yahoo specifically says ticker not found
      if (error.message?.includes('Not Found') || error.message?.includes('No data found') || error.message?.includes('No result')) {
        return res.status(404).json({ error: 'Ticker not found' });
      } else {
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
          console.error('Chart fetch failed for %s: %s', normalizedTicker, e.message);
        }
      }
      
      const data = (history && history.quotes) ? history.quotes : [];
      cache.history.set(cacheKey, { data, timestamp: Date.now() });
      res.json(data);
    } catch (error: any) {
      if (error.message === 'No result') {
        res.status(404).json({ error: 'Ticker not found' });
      } else {
        console.warn('Error fetching history for %s: %s', req.params.ticker, error.message);
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
    // In production, server.cjs is in dist/, so _dirname is already the dist folder.
    // If run directly via node outside dist, we resolve to dist.
    const distPath = _dirname.endsWith('dist') ? _dirname : path.resolve(_dirname, 'dist');
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
