import { GoogleGenAI, Type } from "@google/genai";

// platform automatically provides the API key in process.env.GEMINI_API_KEY
// but only for frontend builds.
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Helper to retry AI requests with exponential backoff on frontend
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

    // Improved transient error detection for Gemini
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
      console.warn('AI request failed (%s). Retrying in %sms... (%s left)', status, delay, retries);
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
      model: "gemini-3-flash-preview",
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
    if (errorJson.includes('429') || errorJson.includes('RESOURCE_EXHAUSTED')) {
      console.warn("AI Discovery quota exceeded");
      return [];
    }
    console.error("AI Discovery Error:", errorJson);
    return [];
  }
}

export async function getCombinedAnalysis(longSummary: string, useSearch = true): Promise<{ summary: string, newsCatalyst: string, sentiment: number }> {
    try {
        const truncated = longSummary.slice(0, 3000);
        const response = await withRetry(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
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
        const errorJson = JSON.stringify(error) || "";
        if (errorJson.includes('429') || errorJson.includes('RESOURCE_EXHAUSTED')) {
            console.warn("Combined analysis quota exceeded");
            return {
                summary: "Research paused: Daily AI analysis quota exceeded. Check plan/billing.",
                newsCatalyst: "Unable to fetch latest catalysts (Quota Exceeded)",
                sentiment: 5
            };
        }
        console.error("Combined Analysis Error:", errorJson);
        return { summary: "Analysis failed due to technical constraints.", newsCatalyst: "Market data link unstable.", sentiment: 5 };
    }
}

export async function getCombinedAnalysisStream(
  longSummary: string, 
  onUpdate: (partial: { summary?: string, newsCatalyst?: string, sentiment?: number }) => void,
  useSearch = true
): Promise<void> {
  // Use withRetry even for the stream setup
  return withRetry(async () => {
    try {
      const truncated = (longSummary || "").slice(0, 3000);
      const input = truncated || "Provide a general market analysis for a context-less asset.";
      
      const response = await ai.models.generateContentStream({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: `Analyze this business: ${input}` }] }],
          config: {
              systemInstruction: (useSearch 
                  ? "You are a professional investment analyst. USE THE GOOGLE SEARCH TOOL to check for recent news or earnings reports (past 30 days) that might affect your analysis. Provide a concise business summary (3-4 sentences), a separate section for the single most important recent news catalyst, and a sentiment score between 1 (Extreme Bearish) and 10 (Extreme Bullish) based on its 30-day investment potential."
                  : "You are a professional investment analyst. Provide a concise business summary (3-4 sentences), a separate section for the single most important news catalyst or trend you know about for this company, and a sentiment score between 1 (Extreme Bearish) and 10 (Extreme Bullish) based on its 30-day investment potential.") + 
                  "\n\nFormat your response EXACTLY as follows for parsing:\nSUMMARY: [summary text]\nCATALYST: [catalyst text]\nSCORE: [number]",
              tools: useSearch ? [{ googleSearch: {} }] : []
          }
      });

      let fullText = "";
      for await (const chunk of response) {
          fullText += chunk.text || "";
          
          // Basic parser for the expected format: SUMMARY: ... CATALYST: ... SCORE: ...
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
      const errorJson = JSON.stringify(error) || "";
      if (errorJson.includes('429') || errorJson.includes('RESOURCE_EXHAUSTED')) {
        console.warn("Analysis stream quota exceeded");
        onUpdate({
            summary: "Research paused: Daily AI analysis quota exceeded. Check plan/billing.",
            newsCatalyst: "Unable to fetch latest catalysts (Quota Exceeded)",
            sentiment: 5
        });
        return;
      }
      if (error?.status === 503 || error?.response?.status === 503 || errorJson.includes("503") || errorJson.includes("ApiError")) {
        console.warn("Analysis stream API temporarily unavailable (503).");
        onUpdate({
            summary: "AI service is currently experiencing high demand and is temporarily unavailable. Please try again in a few moments.",
            newsCatalyst: "Market data unavailable (Service 503).",
            sentiment: 5
        });
        return;
      }
      console.error("Internal Streaming Error:", errorJson);
      throw error; // Propagate for withRetry
    }
  }, 3, 2000); // 3 retries for streaming to avoid too long wait
}

export async function summarizeBusiness(longSummary: string, useSearch = true): Promise<{ summary: string, newsCatalyst: string }> {
    const result = await getCombinedAnalysis(longSummary, useSearch);
    return { summary: result.summary, newsCatalyst: result.newsCatalyst };
}

export async function analyzeSentiment(summary: string, useSearch = true): Promise<number> {
    const result = await getCombinedAnalysis(summary, useSearch);
    return result.sentiment;
}

export async function getDeepDiveAnalysis(ticker: string, companyInfo: string): Promise<string> {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Perform an exhaustive deep dive research report for ${ticker}. 
      ContextInfo: ${companyInfo.slice(0, 2000)}` }] }],
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
    const errorJson = JSON.stringify(error) || "";
    if (errorJson.includes('429') || errorJson.includes('RESOURCE_EXHAUSTED')) {
      console.warn("Deep dive quota exceeded");
      return "Research paused: Daily AI analysis quota exceeded. Check plan/billing.";
    }
    console.error("Deep Dive Error:", errorJson);
    return "Failed to synthesize deep dive. Market data link interrupted.";
  }
}
