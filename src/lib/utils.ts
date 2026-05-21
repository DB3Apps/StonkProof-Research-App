import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateLinearRegression(data: { x: number; y: number }[]) {
  const n = data.length;
  if (n === 0) return { m: 0, b: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of data) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

export function projectPrice(data: number[], monthsAhead: number) {
    const n = data.length;
    const points = data.map((y, x) => ({ x, y }));
    const { m, b } = calculateLinearRegression(points);
    
    const projection = [];
    for (let i = 1; i <= monthsAhead * 21; i++) { // Approx 21 trading days per month
        projection.push(m * (n + i) + b);
    }
    return projection;
}

/**
 * Calculates the 14-period Relative Strength Index (RSI)
 */
export function calculateRSI(history: { close: number }[], period = 14): number {
  if (history.length <= period) return 50; 

  const prices = history.map(h => h.close);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculates a 'Spiciness' rating (1-10) based on historical volatility
 * relative to a typical benchmark (heuristic volatility).
 */
export function calculateSpiciness(history: { close: number }[]): number {
  if (history.length < 10) return 5;
  
  const returns = [];
  for (let i = 1; i < history.length; i++) {
    returns.push((history[i].close - history[i - 1].close) / history[i - 1].close);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Standardize: ~0.01 daily std dev is normal, > 0.03 is spicy
  const score = (stdDev / 0.005); 
  return Math.max(1, Math.min(10, Math.round(score)));
}

/**
 * Calculates a consolidated 'Research Grade' (A-F)
 * Uses a weighted algorithm considering Sentiment, Trend (RSI), and Volatility (Spiciness).
 */
export function calculateResearchGrade(sentiment: number = 5, rsi: number = 50, spiciness: number = 5): { grade: string; score: number } {
  // 1. Sentiment Component (40% Weight)
  // Baseline driver of the grade.
  const sScore = sentiment;

  // 2. Trend (RSI) Component (35% Weight)
  // Heavily rewards the golden zone (45-55) and penalizes overextended extremes.
  let rScore = 10 - (Math.abs(rsi - 50) / 4);
  rScore = Math.max(0, Math.min(10, rScore));

  // 3. Volatility (Spiciness) Alignment (25% Weight)
  // Nuance: High volatility is tolerated better in bullish setups but penalized in bearish ones.
  let vScore = 0;
  if (sentiment >= 7) {
    // Bullish: Reward moderate-high momentum spice (optimal 6)
    vScore = 10 - Math.abs(spiciness - 6); 
  } else if (sentiment <= 4) {
    // Bearish: High volatility is a major risk factor (optimal 1)
    vScore = 11 - spiciness; 
  } else {
    // Neutral: Preferences stability (optimal 3)
    vScore = 10 - Math.abs(spiciness - 3); 
  }
  vScore = Math.max(0, Math.min(10, vScore));

  // Calculate Weighted Score
  const total = (sScore * 0.4) + (rScore * 0.35) + (vScore * 0.25);
  
  // Highly Granular Thresholds (Spread across the full grade curve)
  if (total >= 9.2) return { grade: "A+", score: total };
  if (total >= 8.5) return { grade: "A", score: total };
  if (total >= 7.8) return { grade: "A-", score: total };
  if (total >= 7.1) return { grade: "B+", score: total };
  if (total >= 6.4) return { grade: "B", score: total };
  if (total >= 5.7) return { grade: "B-", score: total };
  if (total >= 5.0) return { grade: "C+", score: total };
  if (total >= 4.3) return { grade: "C", score: total };
  if (total >= 3.6) return { grade: "C-", score: total };
  if (total >= 2.8) return { grade: "D", score: total };
  return { grade: "F", score: total };
}

/**
 * Returns Tailwind classes for grade color coding based on the letter grade. 
 */
export function getGradeColor(grade: string): string {
  if (!grade || grade === "---") return 'bg-white text-slate-900 border-slate-900';
  const cleanGrade = grade.trim().toUpperCase();
  if (cleanGrade.startsWith('A')) return 'bg-trapper-lime text-black border-slate-900';
  if (cleanGrade.startsWith('B')) return 'bg-trapper-blue text-black border-slate-900';
  if (cleanGrade.startsWith('C')) return 'bg-white text-slate-900 border-slate-900';
  if (cleanGrade.startsWith('D')) return 'bg-amber-200 text-amber-900 border-amber-900';
  if (cleanGrade.startsWith('F')) return 'bg-trapper-pink text-white border-slate-900';
  return 'bg-white text-slate-900 border-slate-900';
}

/**
 * Returns a fully-qualified API URL if running natively, or a relative URL on web.
 */
export function getApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Use VITE_API_URL if configured
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl) {
    return `${envApiUrl.replace(/\/$/, '')}${cleanPath}`;
  }

  // Detect native Capacitor container context
  const isCapNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNative;
  if (isCapNative) {
    const savedUrl = localStorage.getItem('custom_api_server_url');
    if (savedUrl) {
      return `${savedUrl.replace(/\/$/, '')}${cleanPath}`;
    }
    // Deep fallback dynamic resolve
    const defaultHost = "https://ais-dev-2w4r6e7fi5khrjy2ii6n5z-226246344653.us-west1.run.app";
    return `${defaultHost}${cleanPath}`;
  }
  
  return cleanPath;
}

/**
 * Multi-Platform Safe Alert Utility
 * Bypasses iframe sandbox blockades by showing an elegant, non-blocking absolute HTML Toast Alert.
 */
export function safeAlert(message: string): void {
  try {
    console.warn("[App Warning Alert]:", message);
    if (typeof window !== "undefined") {
      // Remove stale toasts first
      const existing = document.getElementById("stonkproof-toast");
      if (existing) existing.remove();

      const toast = document.createElement("div");
      toast.id = "stonkproof-toast";
      
      // Inline Tailwind-compatible style structure or generic absolute layout classes
      toast.className = "fixed bottom-5 right-5 z-[10000] max-w-sm border-2 border-black bg-slate-900 text-white p-4 shadow-[4px_4px_0_0_#ea580c] animate-in fade-in slide-in-from-bottom duration-300 font-sans text-xs flex flex-col gap-2";
      
      toast.innerHTML = `
        <div class="flex items-center justify-between gap-4">
          <span class="font-bold text-orange-500 uppercase tracking-widest text-[11px]">⚠️ RESEARCH WARNING</span>
          <button id="stonkproof-toast-close" class="text-slate-400 hover:text-white font-bold cursor-pointer text-sm">✕</button>
        </div>
        <p class="text-slate-200 mt-1 leading-relaxed">${message.replace(/\n/g, '<br/>')}</p>
      `;
      
      document.body.appendChild(toast);
      
      // Bind click handler dynamically
      const closeBtn = toast.querySelector("#stonkproof-toast-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => toast.remove());
      }
      
      // Safety auto-dismiss
      setTimeout(() => {
        try {
          toast.remove();
        } catch (_) {}
      }, 8000);
    }
  } catch (err) {
    console.error("Failed to showcase safe alert:", err);
  }
}
