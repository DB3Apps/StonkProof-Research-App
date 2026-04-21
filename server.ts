import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import yahooFinance from 'yahoo-finance2';

// Initialize yahoo-finance2 instance correctly for v3+
const yahoo = new (yahooFinance as any)();

// Simple in-memory cache to mitigate rate limits
const cache = {
  quote: new Map<string, { data: any, timestamp: number }>(),
  history: new Map<string, { data: any, timestamp: number }>()
};
const CACHE_TTL = 10 * 60 * 1000; // Increase to 10 minutes for quotes/summaries

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Globally disable validation to improve performance and stability
  if (typeof yahoo.setGlobalConfig === 'function') {
    yahoo.setGlobalConfig({
      validation: { logErrors: false, logResults: false },
      suppressNotices: ['yahooSurvey']
    });
  }

  // Middleware to parse JSON
  app.use(express.json());

  // API diagnostic endpoint
  app.get('/api/diagnostic', async (req, res) => {
    try {
      const start = Date.now();
      const testQuote = await yahoo.quote('AAPL');
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          yahooFinance: {
            status: 'ok',
            latency: Date.now() - start,
            testData: testQuote.symbol
          },
          env: {
            geminiKeySet: !!process.env.GEMINI_API_KEY,
            nodeEnv: process.env.NODE_ENV
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        error: error.message,
        services: {
          yahooFinance: {
            status: 'error',
            message: error.message
          }
        }
      });
    }
  });

  // API endpoint for stock info
  app.get('/api/stock/:ticker', async (req, res) => {
    try {
      const { ticker } = req.params;
      const normalizedTicker = ticker.toUpperCase().replace(/\./g, '-');

      // Check cache
      const cached = cache.quote.get(normalizedTicker);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return res.json(cached.data);
      }

      const [quote, summary] = await Promise.all([
        yahoo.quote(normalizedTicker, {}, { validateResult: false }),
        yahoo.quoteSummary(normalizedTicker, { modules: ["assetProfile"] }, { validateResult: false }).catch(() => null)
      ]);

      if (!quote) {
        return res.status(404).json({ error: 'Stock not found' });
      }

      const combinedData = {
        ...quote,
        longBusinessSummary: summary?.assetProfile?.longBusinessSummary
      };

      // Update cache
      cache.quote.set(normalizedTicker, { data: combinedData, timestamp: Date.now() });
      res.json(combinedData);
    } catch (error: any) {
      console.error(`Error fetching stock info for ${req.params.ticker}:`, error);
      
      // If Yahoo specifically says ticker not found
      if (error.message?.includes('Not Found') || error.message?.includes('No data found')) {
        return res.status(404).json({ error: 'Ticker not found' });
      }
      
      // Pass through 429 if it happened
      if (error.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
      }

      res.status(500).json({ error: 'Failed to fetch stock info' });
    }
  });

  // API endpoint for stock history
  app.get('/api/history/:ticker', async (req, res) => {
    try {
      const { ticker } = req.params;
      const days = parseInt(req.query.days as string, 10) || 365;
      const normalizedTicker = ticker.toUpperCase().replace(/\./g, '-');
      const cacheKey = `${normalizedTicker}_${days}`;

      // Check cache
      const cached = cache.history.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return res.json(cached.data);
      }

      const history = await yahoo.chart(normalizedTicker, {
        period1: new Date(new Date().setDate(new Date().getDate() - days)),
        interval: '1d'
      }, { validateResult: false });

      if (!history || !(history as any).quotes) {
        return res.status(404).json({ error: 'History not found' });
      }
      
      const data = (history as any).quotes;

      // Update cache
      cache.history.set(cacheKey, { data, timestamp: Date.now() });
      res.json(data);
    } catch (error: any) {
      console.error(`Error fetching history for ${req.params.ticker}:`, error);
      
      if (error.message?.includes('Not Found') || error.message?.includes('No data found')) {
        return res.status(404).json({ error: 'Ticker history not found' });
      }

      if (error.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
      }

      res.status(500).json({ error: 'Failed to fetch stock history' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
