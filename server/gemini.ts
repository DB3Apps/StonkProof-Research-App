import { GoogleGenAI, Type } from "@google/genai";
import express from "express";

// Initialize official Google GenAI with API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Helper to retry AI requests with exponential backoff on server
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorJson = JSON.stringify(error) || "";
    const status = error.status || (error.response?.status) || 500;
    const message = (error.message || "").toLowerCase();
    const statusText = (error.statusText || "").toLowerCase();
    
    // Quick exit for quota exhausted
    if (status === 429 || message.includes('quota') || errorJson.includes('RESOURCE_EXHAUSTED') || errorJson.includes('429')) {
      throw error;
    }

    // Transient error detection
    const isTransient = status === 503 || status === 504 || status === 408 ||
                      message.includes('high demand') || 
                      message.includes('busy') ||
                      message.includes('unavailable') ||
                      message.includes('overloaded') ||
                      message.includes('failed to fetch') ||
                      message.includes('deadline expired') ||
                      statusText.includes('unavailable') ||
                      statusText.includes('deadline');
    
    if (retries > 0 && isTransient) {
      console.warn(`[Gemini Server Retry] Request failed (${status}). Retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

export async function getTickersFromAI(userPrompt: string, limit: number = 5, excludedTickers: string[] = []): Promise<string[]> {
  try {
    const exclusionText = excludedTickers && excludedTickers.length > 0 ? ` DO NOT include these tickers as primary results: ${excludedTickers.join(', ')}.` : "";
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: 'user', parts: [{ text: userPrompt + exclusionText }] }],
      config: {
        systemInstruction: `You are a professional market analyst. USE THE GOOGLE SEARCH TOOL to find the most accurate and up-to-date information matching the user's criteria (e.g., current stock prices, recent news, etc). You MUST always provide EXACTLY ${limit} relevant asset ticker symbols (including Stocks, Cryptocurrency, Market Indices, ETFs, and Bonds) based on the user's prompt. Focus on US markets (NYSE/NASDAQ), major cryptocurrencies, indices, and ETFs. DO NOT return less than ${limit}. If you cannot find ${limit} specific matches, include broadly related popular assets to fill the quota to exactly ${limit}. Return the result as a json object with a 'tickers' array property.`,
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
        },
        tools: [{ googleSearch: {} }]
      },
    }));

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    const parsed = JSON.parse(text);
    return parsed.tickers || [];
  } catch (error: any) {
    const errorJson = JSON.stringify(error) || "";
    console.error("Server AI Discovery Error:", errorJson);
    throw error;
  }
}

export async function getCombinedAnalysis(longSummary: string, useSearch = true): Promise<{ summary: string, newsCatalyst: string, sentiment: number }> {
  try {
    const truncated = (longSummary || "").slice(0, 3000);
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: 'user', parts: [{ text: `Analyze this business and provide market context: ${truncated}` }] }],
      config: {
        systemInstruction: (useSearch 
            ? "You are a professional investment analyst. USE THE GOOGLE SEARCH TOOL to check for recent news or earnings reports (past 30 days) that might affect your analysis. Provide a concise business summary (3-4 sentences), a separate section for the single most important recent news catalyst, and a sentiment score between 1 (Extreme Bearish) and 10 (Extreme Bullish) based on its 30-day investment potential."
            : "You are a professional investment analyst. Provide a concise business summary (3-4 sentences), a separate section for the single most important news catalyst or trend you know about for this company, and a sentiment score between 1 (Extreme Bearish) and 10 (Extreme Bullish) based on its 30-day investment potential.") + "\n\nRETURN EXACTLY this JSON format: {\"summary\": \"...\", \"newsCatalyst\": \"...\", \"score\": 7}",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            newsCatalyst: { type: Type.STRING },
            score: { type: Type.NUMBER }
          },
          required: ["summary", "newsCatalyst", "score"]
        },
        tools: useSearch ? [{ googleSearch: {} }] : []
      }
    }));

    const text = response.text;
    if (!text) throw new Error('No analysis generated');
    const parsed = JSON.parse(text);
    
    return {
      summary: parsed.summary || "",
      newsCatalyst: parsed.newsCatalyst || "",
      sentiment: isNaN(parsed.score) ? 5 : Math.max(1, Math.min(10, parsed.score))
    };
  } catch (error: any) {
    console.error("Server Combined Analysis Error:", error);
    throw error;
  }
}

export async function handleCombinedAnalysisStream(
  longSummary: string, 
  res: express.Response,
  useSearch = true
): Promise<void> {
  const truncated = (longSummary || "").slice(0, 3000);
  const input = truncated || "Provide a general market analysis for a context-less asset.";
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: [{ role: 'user', parts: [{ text: `Analyze this business: ${input}` }] }],
      config: {
        systemInstruction: (useSearch 
            ? "You are a professional investment analyst. USE THE GOOGLE SEARCH TOOL to check for recent news or earnings reports (past 30 days) that might affect your analysis. Provide a concise business summary (3-4 sentences), a separate section for the single most important recent news catalyst, and a sentiment score between 1 (Extreme Bearish) and 10 (Extreme Bullish) based on its 30-day investment potential."
            : "You are a professional investment analyst. Provide a concise business summary (3-4 sentences), a separate section for the single most important news catalyst or trend you know about for this company, and a sentiment score between 1 (Extreme Bearish) and 10 (Extreme Bullish) based on its 30-day investment potential.") + 
            "\n\nFormat your response EXACTLY as follows for parsing:\nSUMMARY: [summary text]\nCATALYST: [catalyst text]\nSCORE: [number]",
        tools: useSearch ? [{ googleSearch: {} }] : []
      }
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of responseStream) {
      if (chunk.text) {
        // Format as EventStream chunk
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("Server streaming error:", err);
    res.status(500).json({ error: "Streaming analysis failed", details: err?.message || String(err) });
  }
}

export async function getDeepDiveAnalysis(ticker: string, companyInfo: string): Promise<string> {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: 'user', parts: [{ text: `Perform an exhaustive deep dive research report for ${ticker}. \nContextInfo: ${companyInfo.slice(0, 2000)}` }] }],
      config: {
        systemInstruction: `You are a Senior Equity Research Analyst at a top-tier hedge fund. Perform an "Institutional Deep Dive" into the provided asset. 
Your report must be structured as follows:

## I. STRATEGIC POSITIONING & MOAT
Analyze the core business model, value proposition, and competitive advantages (scaling, network effects, IP, etc.).

## II. COMPETITIVE LANDSCAPE
Identify direct and indirect competitors. How does this asset differentiate? What is the "bear case" relative to peers?

## III. GROWTH CATALYSTS & TAILWINDS
What are the specific drivers for the next 12-24 months? (New products, expansion, macro trends).

## IV. RISK VULNERABILITIES
List the 3 most critical threats to the long-term thesis (Regulation, disruption, execution, macro).

## V. OPERATIONAL VITALITY
Qualitative review of business efficiency and market presence.

## VI. ANALYST VERDICT
Synthesize all findings into a final high-conviction outlook.

Use clean Markdown with bold headers. Keep it high-signal and data-dense. USE GOOGLE SEARCH to verify current fiscal year developments or recent structural changes.`,
        tools: [{ googleSearch: {} }]
      },
    }));

    return response.text || "Deep dive analysis unavailable.";
  } catch (error: any) {
    console.error("Server Deep Dive Error:", error);
    throw error;
  }
}
