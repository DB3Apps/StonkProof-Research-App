// Client-side API client for Gemini Proxy Routes
// This prevents exposing the Gemini API key on the client or running into CORS/blocked third-party cookie issues in the iframe.

import { getApiUrl } from "./utils";

export async function getTickersFromAI(userPrompt: string, limit: number = 5, excludedTickers: string[] = []): Promise<string[]> {
  try {
    const response = await fetch(getApiUrl('/api/gemini/getTickersFromAI'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userPrompt, limit, excludedTickers })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    return data.tickers || [];
  } catch (error: any) {
    console.error("Client getTickersFromAI Error:", error);
    return [];
  }
}

export async function getCombinedAnalysis(longSummary: string, useSearch = true): Promise<{ summary: string, newsCatalyst: string, sentiment: number }> {
  try {
    const response = await fetch(getApiUrl('/api/gemini/getCombinedAnalysis'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ longSummary, useSearch })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Client getCombinedAnalysis Error:", error);
    return {
      summary: "Analysis failed due to technical constraints on the server.",
      newsCatalyst: "Market data link unstable.",
      sentiment: 5
    };
  }
}

export async function getCombinedAnalysisStream(
  longSummary: string, 
  onUpdate: (partial: { summary?: string, newsCatalyst?: string, sentiment?: number }) => void,
  useSearch = true
): Promise<void> {
  try {
    const response = await fetch(getApiUrl('/api/gemini/getCombinedAnalysisStream'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ longSummary, useSearch })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) {
      throw new Error("Failed to get reader from stream reaction");
    }

    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const dataContent = trimmed.slice(6).trim();
          if (dataContent === "[DONE]") {
            break;
          }
          try {
            const parsed = JSON.parse(dataContent);
            if (parsed.text) {
              fullText += parsed.text;

              // Parse matching patterns in progress
              const summaryMatch = fullText.match(/SUMMARY:\s*([\s\S]*?)(?=CATALYST:|SCORE:|$)/i);
              const catalystMatch = fullText.match(/CATALYST:\s*([\s\S]*?)(?=SCORE:|SUMMARY:|$)/i);
              const scoreMatch = fullText.match(/SCORE:\s*(\d{1,2})/i);

              onUpdate({
                summary: summaryMatch?.[1]?.trim(),
                newsCatalyst: catalystMatch?.[1]?.trim(),
                sentiment: scoreMatch?.[1] ? parseInt(scoreMatch[1], 10) : undefined
              });
            }
          } catch (e) {
            // Ignore temporary JSON parsing issues for incomplete chunks
          }
        }
      }
    }
  } catch (error: any) {
    console.error("Client getCombinedAnalysisStream Error:", error);
    onUpdate({
      summary: "Underlying streaming channel lost. Server or network issue.",
      newsCatalyst: "Streaming interrupted.",
      sentiment: 5
    });
  }
}

export async function getDeepDiveAnalysis(ticker: string, companyInfo: string): Promise<string> {
  try {
    const response = await fetch(getApiUrl('/api/gemini/getDeepDiveAnalysis'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ticker, companyInfo })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    return data.analysis || "Deep dive analysis unavailable.";
  } catch (error: any) {
    console.error("Client getDeepDiveAnalysis Error:", error);
    return "Failed to synthesize deep dive. Server connection interrupted.";
  }
}

export async function summarizeBusiness(longSummary: string, useSearch = true): Promise<{ summary: string, newsCatalyst: string }> {
  const result = await getCombinedAnalysis(longSummary, useSearch);
  return { summary: result.summary, newsCatalyst: result.newsCatalyst };
}

export async function analyzeSentiment(summary: string, useSearch = true): Promise<number> {
  const result = await getCombinedAnalysis(summary, useSearch);
  return result.sentiment;
}
