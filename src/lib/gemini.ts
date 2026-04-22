import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

let _ai: GoogleGenAI | null = null;
export const getAi = () => {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key_to_prevent_crash" });
  }
  return _ai;
};

// Kept for simple access, but now it references a dummy key if env is missing instead of crashing
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key_to_prevent_crash" });

// Helper to retry AI requests with exponential backoff on frontend
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 3000): Promise<T> {
  try {
    console.log("withRetry: Attempting function call");
    return await fn();
  } catch (error: any) {
    console.log("withRetry: Error caught", error);
    const errObj = error.error || error;
    const status = errObj.status || (errObj.response?.status) || errObj.code || (error.error?.code);
    const message = ((errObj.error?.message) || (errObj.message) || "").toLowerCase();
    
    // If it's a specific quota or billing error, we should inform the user
    if (status === 429 || status === 403) {
      if (message.includes('billing') || message.includes('quota') || message.includes('exhausted') || message.includes('funds')) {
        throw error; // Rethrow to let the specific function handle fallback or inform user
      }
    }

    const isTransient = status === 503 || status === 504 || status === 500 || 
                      message.includes('high demand') || 
                      message.includes('busy') ||
                      message.includes('unavailable') ||
                      message.includes('overloaded') ||
                      message.includes('failed to fetch');
    
    if (retries > 0 && isTransient) {
      console.warn(`AI transient error (${status}). Retrying in ${delay}ms... (${retries} retries left). Error: ${message}`);
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
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: userPrompt + exclusionText }] }],
      config: {
        systemInstruction: "You are a professional market analyst. You MUST always provide EXACTLY 10 relevant asset ticker symbols (including Stocks, Cryptocurrency, Market Indices, ETFs, and Bonds) based on the user's prompt. Focus on US markets (NYSE/NASDAQ), major cryptocurrencies, indices, and ETFs. DO NOT return less than 10. If you cannot find 10 specific matches, include broadly related popular assets to fill the quota to exactly 10. Return the result as a json object with a 'tickers' array property.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tickers: {
              type: Type.ARRAY,
              description: "Array of EXACTLY 10 ticker symbols.",
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
    model: "gemini-3.1-flash-lite-preview",
    contents: [{ role: 'user', parts: [{ text: `Analyze this business and provide the absolute latest market context: ${truncated}` }] }],
    config: {
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
    model: "gemini-3.1-flash-lite-preview",
    contents: [{ role: 'user', parts: [{ text: `Determine the sentiment score based on this summary and current market reality: ${summary}` }] }],
    config: {
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

export async function getCombinedAnalysis(longSummary: string, useSearch = true): Promise<{ summary: string, newsCatalyst: string, sentiment: number }> {
  const truncated = longSummary.slice(0, 3000); 
  
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Analyze this business and provide the absolute latest market context: ${truncated}` }] }],
      config: {
        systemInstruction: (useSearch 
          ? "You are a professional investment analyst. USE THE GOOGLE SEARCH TOOL to check for recent news or earnings reports (past 30 days) that might affect your analysis. Provide a concise business summary (3-4 sentences), a separate section for the single most important recent news catalyst, and a sentiment score between 1 (Extreme Bearish) and 10 (Extreme Bullish) based on its 30-day investment potential."
          : "You are a professional investment analyst. Provide a concise business summary (3-4 sentences), a separate section for the single most important news catalyst or trend you know about for this company, and a sentiment score between 1 (Extreme Bearish) and 10 (Extreme Bullish) based on its 30-day investment potential.") + "\n\nRETURN EXACTLY this JSON format WITHOUT markdown fencing: {\"summary\": \"...\", \"newsCatalyst\": \"...\", \"score\": 7}",
        ...(useSearch ? {} : {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "A simple 3-4 sentence paragraph about what the company does and its current position." },
              newsCatalyst: { type: Type.STRING, description: "The single most important recent news headline or catalyst found." },
              score: { type: Type.NUMBER, description: "Integer score from 1 to 10 based on sentiment." }
            },
            required: ["summary", "newsCatalyst", "score"]
          }
        }),
        tools: useSearch ? [{ googleSearch: {} }] : []
      }
    }));

    let text = response.text || "";
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    if (!text) return { summary: "", newsCatalyst: "", sentiment: 5 };
    const parsed = JSON.parse(text);
    const score = parseInt(String(parsed.score), 10);
    return { 
      summary: parsed.summary || "", 
      newsCatalyst: parsed.newsCatalyst || "",
      sentiment: isNaN(score) ? 5 : Math.max(1, Math.min(10, score))
    };
  } catch (error: any) {
    const message = (error.message || "").toLowerCase();
    if (useSearch && (message.includes('quota') || message.includes('search_grounding') || message.includes('exhausted') || error.status === 429)) {
      console.warn("Search Quota hit, falling back to internal knowledge for combined analysis...");
      return getCombinedAnalysis(longSummary, false);
    }
    console.error("Combined Analysis AI Error:", error);
    throw error;
  }
}

export async function getCombinedAnalysisStream(
  longSummary: string, 
  onUpdate: (partial: { summary?: string, newsCatalyst?: string, sentiment?: number }) => void,
  useSearch = true
): Promise<void> {
  const truncated = longSummary.slice(0, 3000); 
  
  try {
    const responseStream = await withRetry(() => ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Analyze this business: ${truncated}` }] }],
      config: {
        systemInstruction: (useSearch 
          ? "You are a professional investment analyst. USE THE GOOGLE SEARCH TOOL to check for recent news or earnings reports (past 30 days) that might affect your analysis. Provide a concise business summary (3-4 sentences), a separate section for the single most important recent news catalyst, and a sentiment score between 1 (Extreme Bearish) and 10 (Extreme Bullish) based on its 30-day investment potential."
          : "You are a professional investment analyst. Provide a concise business summary (3-4 sentences), a separate section for the single most important news catalyst or trend you know about for this company, and a sentiment score between 1 (Extreme Bearish) and 10 (Extreme Bullish) based on its 30-day investment potential.") + 
          "\n\nFormat your response EXACTLY as follows for parsing:\nSUMMARY: [summary text]\nCATALYST: [catalyst text]\nSCORE: [number]",
        tools: useSearch ? [{ googleSearch: {} }] : []
      }
    }));

    let fullText = "";
    for await (const chunk of responseStream) {
      const chunkText = chunk.text || "";
      fullText += chunkText;
      
      // Basic parser for partial content
      const summaryMatch = fullText.match(/SUMMARY:\s*([\s\S]*?)(?=CATALYST:|SCORE:|$)/i);
      const catalystMatch = fullText.match(/CATALYST:\s*([\s\S]*?)(?=SCORE:|SUMMARY:|$)/i);
      const scoreMatch = fullText.match(/SCORE:\s*(\d{1,2})/i);

      onUpdate({
        summary: summaryMatch?.[1]?.trim(),
        newsCatalyst: catalystMatch?.[1]?.trim(),
        sentiment: scoreMatch?.[1] ? parseInt(scoreMatch[1], 10) : undefined
      });
    }
  } catch (error: any) {
    console.error("Combined Analysis Streaming Error:", error);
    if (useSearch && (error.message?.includes('quota') || error.message?.includes('search'))) {
      return getCombinedAnalysisStream(longSummary, onUpdate, false);
    }
    throw error;
  }
}

