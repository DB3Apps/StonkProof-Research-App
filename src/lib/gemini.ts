import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to retry AI requests with exponential backoff on frontend
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    console.log("withRetry: Attempting function call");
    return await fn();
  } catch (error: any) {
    console.log("withRetry: Error caught", error);
    const errObj = error.error || error;
    const status = errObj.status || (errObj.response?.status) || errObj.code || (error.error?.code);
    const message = ((errObj.error?.message) || (errObj.message) || "").toLowerCase();
    
    // If it's a specific quota error for search grounding, we don't want to retry with the same config
    if (status === 429 && (message.includes('search_grounding') || message.includes('quota exceeded'))) {
      throw error; // Rethrow to let the specific function handle fallback
    }

    const isTransient = status === 503 || status === 429 || status === 504 || status === 500 || 
                      message.includes('high demand') || 
                      message.includes('busy') ||
                      message.includes('resource_exhausted');
    
    if (retries > 0 && isTransient) {
      console.warn(`AI transient error. Retrying in ${delay}ms... (${retries} retries left). Error: ${message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function getTickersFromAI(userPrompt: string, excludedTickers: string[] = []): Promise<string[]> {
  try {
    console.log("getTickersFromAI: Starting AI call");
    const exclusionText = excludedTickers.length > 0 ? ` DO NOT include these tickers as primary results: ${excludedTickers.join(', ')}.` : "";
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: [{ role: 'user', parts: [{ text: userPrompt + exclusionText }] }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: "You are a professional stock market analyst. You MUST always provide EXACTLY 7 relevant stock ticker symbols based on the user's prompt. This is a strict requirement. Focus on US markets (NYSE/NASDAQ). No matter how specific the query is, broaden your scope to ensure exactly 7 tickers are always returned. Return the result in a property named 'tickers'. If you cannot find 7 specific matches, include broadly related popular stocks to fill the quota to exactly 7.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tickers: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["tickers"]
        }
      },
    }));
    console.log("getTickersFromAI: AI call returned");
    
    const text = response.text;
    if (!text) {
      console.error("Gemini API returned empty response for ticker discovery");
      throw new Error('AI Engine returned no data (Empty Response)');
    }
    const parsed = JSON.parse(text);
    return parsed.tickers || [];
  } catch (error: any) {
    console.error("AI Discovery Error Details:", error);
    throw new Error(`Ticker Discovery Failed: ${error.message || 'Unknown Error'}`);
  }
}

export async function summarizeBusiness(longSummary: string, useSearch = true): Promise<{ summary: string, newsCatalyst: string }> {
  const truncated = longSummary.slice(0, 3000); 
  const generate = (withSearch: boolean) => ai.models.generateContent({
    model: "gemini-flash-lite-latest",
    contents: [{ role: 'user', parts: [{ text: `Analyze this business and provide the absolute latest market context: ${truncated}` }] }],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: withSearch 
        ? "You are a professional investment analyst. USE THE GOOGLE SEARCH TOOL to check for recent news or earnings reports (past 30 days) that might affect your summary. Provide a concise business summary (3-4 sentences) and a separate section for the single most important recent news catalyst. Explain briefly why it matters."
        : "You are a professional investment analyst. Provide a concise business summary (3-4 sentences) and a separate section for the single most important news catalyst or trend you know about for this company. Explain briefly why it matters.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "A simple 3-4 sentence paragraph about what the company does and its current position." },
          newsCatalyst: { type: Type.STRING, description: "The single most important recent news headline or catalyst found." }
        },
        required: ["summary", "newsCatalyst"]
      },
      tools: withSearch ? [{ googleSearch: {} }] : []
    }
  });

  try {
    const response = await withRetry(() => generate(useSearch));
    const text = response.text;
    if (!text) return { summary: "", newsCatalyst: "" };
    const parsed = JSON.parse(text);
    return { summary: parsed.summary || "", newsCatalyst: parsed.newsCatalyst || "" };
  } catch (error: any) {
    const message = (error.message || "").toLowerCase();
    if (useSearch && (message.includes('quota') || message.includes('search_grounding') || message.includes('exhausted') || error.status === 429)) {
      console.warn("Search Quota hit, falling back to internal knowledge for summary...");
      return summarizeBusiness(longSummary, false);
    }
    console.error("Summarization AI Error:", error);
    throw error;
  }
}

export async function analyzeSentiment(summary: string, useSearch = true): Promise<number> {
  const generate = (withSearch: boolean) => ai.models.generateContent({
    model: "gemini-flash-lite-latest",
    contents: [{ role: 'user', parts: [{ text: `Determine the sentiment score based on this summary and current market reality: ${summary}` }] }],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: withSearch
        ? "Analyze the sentiment of the business based on its 30-day investment potential. YOU MUST USE GOOGLE SEARCH to verify if the stock is currently trending up or down based on recent headlines. Return a single integer score between 1 (Extreme Bearish) and 10 (Extreme Bullish). Focus on growth prospects and current market sentiment."
        : "Analyze the sentiment of the business based on its 30-day investment potential. Estimate how the stock is currently trending based on internal knowledge. Return a single integer score between 1 (Extreme Bearish) and 10 (Extreme Bullish). Focus on growth prospects and general market sentiment.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER }
        },
        required: ["score"]
      },
      tools: withSearch ? [{ googleSearch: {} }] : []
    }
  });

  try {
    const response = await withRetry(() => generate(useSearch));
    const text = response.text;
    if (!text) return 5;
    const parsed = JSON.parse(text);
    const score = parseInt(String(parsed.score), 10);
    return isNaN(score) ? 5 : Math.max(1, Math.min(10, score));
  } catch (error: any) {
    const message = (error.message || "").toLowerCase();
    if (useSearch && (message.includes('quota') || message.includes('search_grounding') || message.includes('exhausted') || error.status === 429)) {
      console.warn("Search Quota hit, falling back to internal knowledge for sentiment...");
      return analyzeSentiment(summary, false);
    }
    console.error("Sentiment AI Error:", error);
    return 5;
  }
}
