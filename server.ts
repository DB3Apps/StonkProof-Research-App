import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import yahooFinance from 'yahoo-finance2';
import { checkBotId } from 'botid/server';

// In version 3 ESM, the default export is the YahooFinance class itself.
// We must instantiate it to use it.
const yahoo = new (yahooFinance as any)();

// Simple in-memory cache to mitigate rate limits
const cache = {
  quote: new Map<string, { data: any, timestamp: number }>(),
  history: new Map<string, { data: any, timestamp: number }>()
};
const CACHE_TTL = 10 * 60 * 1000; // Increase to 10 minutes for quotes/summaries

// Helper to fetch data with a fallback for crypto tickers (e.g., SOL -> SOL-USD)
async function fetchWithCryptoFallback(ticker: string, fetchFn: (symbol: string) => Promise<any>) {
  try {
    const result = await fetchFn(ticker);
    if (result) return result;
    throw new Error('No result');
  } catch (primaryError: any) {
    // If primary failed and ticker doesn't already have a suffix, try -USD
    if (!ticker.includes('-') && !ticker.includes('=')) {
      try {
        const fallbackSymbol = `${ticker}-USD`;
        const result = await fetchFn(fallbackSymbol);
        if (result) return result;
      } catch (secondaryError) {
        // Both failed, throw the primary error
        throw primaryError;
      }
    }
    throw primaryError;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Globally disable validation to improve performance and stability
  // and ensure we are using a configured instance
  try {
    if (yahoo && typeof yahoo.setGlobalConfig === 'function') {
      yahoo.setGlobalConfig({
        validation: { logErrors: false, logResults: false },
        suppressNotices: ['yahooSurvey']
      });
    }
  } catch (e) {
    console.error("Failed to set global config for yahoo-finance2", e);
  }

  // Middleware to parse JSON
  app.use(express.json());

  // Bot Protection Middleware
  const botProtectionMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Only run in production (or if specifically testing)
    if (process.env.NODE_ENV === 'development') return next();

    try {
      const verification = await checkBotId({
        advancedOptions: {
          headers: req.headers
        }
      });

      if (verification.isBot && !verification.isVerifiedBot) {
        console.warn(`[BotID] Blocked suspected bot request to ${req.originalUrl}`);
        return res.status(403).json({ error: 'Access denied: Automated traffic detected' });
      }
      next();
    } catch (error) {
      console.error('BotID check error:', error);
      next();
    }
  };

  // Apply bot protection to all API routes
  app.use('/api', botProtectionMiddleware);

  // API diagnostic endpoint
  app.get('/api/diagnostic', async (req, res) => {
    try {
      const start = Date.now();
      const testQuote = await (yahoo as any).quote('AAPL');
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          yahooFinance: {
            status: 'ok',
            latency: Date.now() - start,
            testData: testQuote?.symbol
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

      const getCombined = async (symbol: string) => {
        const quote = await (yahoo as any).quote(symbol, {}, { validateResult: false });
        if (!quote) return null;
        
        const summary = await (yahoo as any).quoteSummary(symbol, { modules: ["assetProfile"] }, { validateResult: false }).catch(() => null);
        return {
          ...quote,
          longBusinessSummary: summary?.assetProfile?.longBusinessSummary
        };
      };

      const combinedData = await fetchWithCryptoFallback(normalizedTicker, getCombined);

      // Update cache
      cache.quote.set(normalizedTicker, { data: combinedData, timestamp: Date.now() });
      res.json(combinedData);
    } catch (error: any) {
      // Log as warn instead of error to avoid excessive noise for expected 404s
      console.warn(`Error fetching stock info for ${req.params.ticker}:`, error.message);
      
      // If Yahoo specifically says ticker not found
      if (error.message?.includes('Not Found') || error.message?.includes('No data found') || error.message?.includes('No result')) {
        console.info(`Ticker not found or delisted: ${req.params.ticker}`);
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

      const getHistory = async (symbol: string) => {
        const history = await (yahoo as any).chart(symbol, {
          period1: new Date(new Date().setDate(new Date().getDate() - days)),
          interval: '1d'
        }, { validateResult: false });
        
        if (!history || !(history as any).quotes) return null;
        return (history as any).quotes;
      };

      const data = await fetchWithCryptoFallback(normalizedTicker, getHistory);

      // Update cache
      cache.history.set(cacheKey, { data, timestamp: Date.now() });
      res.json(data);
    } catch (error: any) {
      // Log as warn instead of error to avoid excessive noise for expected 404s
      console.warn(`Error fetching history for ${req.params.ticker}:`, error.message);
      
      if (error.message?.includes('Not Found') || error.message?.includes('No data found') || error.message?.includes('No result')) {
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
