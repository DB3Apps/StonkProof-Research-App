import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, 
  TrendingUp, 
  Star, 
  StarOff,
  Plus, 
  Trash2, 
  Loader2, 
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Brain,
  Zap,
  Target,
  Rocket,
  Lightbulb,
  MousePointer2,
  Download,
  TrendingDown,
  Smartphone,
  Monitor,
  Globe,
  Skull,
  Flame,
  CloudLightning,
  Ghost,
  Crown,
  Fingerprint,
  CircuitBoard,
  Mountain,
  Palmtree,
  Wind,
  Waves,
  Orbit,
  Anchor,
  Dna,
  Bug,
  Compass,
  Atom,
  Activity,
  Mail,
  ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ComposedChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  Bar,
  Brush,
  Line,
  ReferenceArea
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getGradeColor, calculateRSI, calculateSpiciness, calculateResearchGrade } from "@/lib/utils";
import { getTickersFromAI, getCombinedAnalysis, getCombinedAnalysisStream } from "@/lib/gemini";

import { auth, getDb, handleFirestoreError, OperationType, Timestamp, onAuthStateChanged, signInWithGoogle, logout, doc, onSnapshot, setDoc } from "./firebase";
import { User } from "firebase/auth";
import { WatchlistHeader } from "./components/WatchlistHeader";
import { StockInfo, HistoryData, AppStep } from "./types";
import { HandDrawnFilter, SPRLogo, DoodleField } from "./components/Doodles";
import { MarketAnalytics } from "./components/research/MarketAnalytics";
import { AIInsights } from "./components/research/AIInsights";
import { NewsFeed } from "./components/research/NewsFeed";
import { ResearchNotes } from "./components/research/ResearchNotes";
import { DiscoveryResults } from "./components/research/DiscoveryResults";

import { Analytics } from "@vercel/analytics/react";

// --- App Component ---
export default function App() {
  return (
    <>
      <AppContent />
      <Analytics />
    </>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [query, setQuery] = useState("");
  const [tickers, setTickers] = useState<string[]>([]);
  const [allSeenTickers, setAllSeenTickers] = useState<string[]>([]);
  const [discoveryPage, setDiscoveryPage] = useState(0);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [stockData, setStockData] = useState<Record<string, StockInfo>>({});
  const stockDataRef = useRef(stockData);
  useEffect(() => {
    stockDataRef.current = stockData;
  }, [stockData]);

  const getStockSnapshot = async (): Promise<Record<string, StockInfo>> => {
    return stockDataRef.current;
  };
  const [historyData, setHistoryData] = useState<Record<string, HistoryData[]>>({});
  const [historyError, setHistoryError] = useState<Record<string, string | null>>({});
  const [stockErrors, setStockErrors] = useState<Record<string, string | null>>({});
  const [failedTickers, setFailedTickers] = useState<Set<string>>(new Set());
  const failedTickersRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    failedTickersRef.current = failedTickers;
  }, [failedTickers]);

  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingAI, setLoadingAI] = useState<Record<string, boolean>>({});
  const [loadingChart, setLoadingChart] = useState<Record<string, boolean>>({});
  const fetchingAnalysisRef = useRef<Set<string>>(new Set());
  const [manualTicker, setManualTicker] = useState("");
  const [step, setStep] = useState<'instructions' | 'prompt' | 'results' | 'download'>('instructions');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isWatchlistExpanded, setIsWatchlistExpanded] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [isSortByGrade, setIsSortByGrade] = useState(false);

  // Define grade order for sorting
  const gradeOrder = useMemo(() => ({
    "A+": 11, "A": 10, "A-": 9,
    "B+": 8, "B": 7, "B-": 6,
    "C+": 5, "C": 4, "C-": 3,
    "D": 2, "F": 1, "---": 0
  }), []);

  const displayedTickers = useMemo(() => {
    if (!isSortByGrade) return tickers;
    return [...tickers].sort((a, b) => {
      const gradeA = stockData[a]?.researchGrade || "---";
      const gradeB = stockData[b]?.researchGrade || "---";
      return (gradeOrder[gradeB as keyof typeof gradeOrder] || 0) - (gradeOrder[gradeA as keyof typeof gradeOrder] || 0);
    });
  }, [tickers, stockData, isSortByGrade, gradeOrder]);
  
  const resetApp = () => {
    setQuery("");
    setTickers([]);
    setAllSeenTickers([]);
    setDiscoveryPage(0);
    setSelectedTicker(null);
    setIsSortByGrade(false);
    setStockData({});
    setHistoryData({});
    setHistoryError({});
    setLoading(false);
    setLoadingDetails(false);
    setLoadingSummary(false);
    setLoadingAI({});
    setLoadingChart({});
    setNote("");
    setStep('instructions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // PWA Install Listener
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    // Check for download parameter
    if (window.location.search.includes('download=true')) {
      setStep('download');
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert("Installation is handled by your browser. Look for 'Add to Home Screen' in your browser menu.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    console.log("App mounted. Auth Ready:", isAuthReady, "Step:", step);
  }, [isAuthReady, step]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      console.log("Auth state changed. User:", u?.email);
    });
    
    // Timeout fallback for auth initialization to prevent infinite loading screen
    const timer = setTimeout(() => {
      if (!isAuthReady) {
        console.warn("Auth initialization timed out. Proceeding...");
        setIsAuthReady(true);
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [isAuthReady]);

  // Firestore Watchlist Sync
  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      return;
    }

    const path = `users/${user.uid}/data/watchlist`;
    const dbInstance = getDb();
    if (!dbInstance) return;
    const unsubscribe = onSnapshot(doc(dbInstance, path), (snapshot) => {
      if (snapshot.exists()) {
        setWatchlist(snapshot.data().tickers || []);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync watchlist to Firestore
  const syncWatchlist = async (newList: string[]) => {
    const dbInstance = getDb();
    if (!user || !dbInstance) return;
    const path = `users/${user.uid}/data/watchlist`;
    try {
      await setDoc(doc(dbInstance, path), {
        userId: user.uid,
        tickers: newList,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const [note, setNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Firestore Note Sync
  useEffect(() => {
    if (!user || !selectedTicker) {
      setNote("");
      return;
    }

    const path = `users/${user.uid}/notes/${selectedTicker}`;
    const dbInstance = getDb();
    if (!dbInstance) return;
    const unsubscribe = onSnapshot(doc(dbInstance, path), (snapshot) => {
      if (snapshot.exists()) {
        setNote(snapshot.data().content || "");
      } else {
        setNote("");
      }
    }, (error) => {
      // Notes are optional, so we don't necessarily want to throw a hard error here
      console.warn("Note sync error:", error);
    });

    return () => unsubscribe();
  }, [user, selectedTicker]);

  const saveNote = async () => {
    const dbInstance = getDb();
    if (!user || !selectedTicker || !dbInstance) return;
    setIsSavingNote(true);
    const path = `users/${user.uid}/notes/${selectedTicker}`;
    try {
      await setDoc(doc(dbInstance, path), {
        userId: user.uid,
        ticker: selectedTicker,
        content: note,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSavingNote(false);
    }
  };

  const fetchStockInfo = async (ticker: string) => {
    if (failedTickersRef.current.has(ticker)) return null;
    if (stockData[ticker]) {
      // If we already have stock data, but no AI analysis yet, trigger it
      if (stockData[ticker].longBusinessSummary && !stockData[ticker].conciseSummary) {
        fetchAnalysis(ticker, false, stockData[ticker]);
      }
      return stockData[ticker];
    }
    try {
      const res = await fetch(`/api/stock/${ticker}`);
      if (res.status === 404) {
        setStockErrors(prev => ({ ...prev, [ticker]: "Symbol not found" }));
        console.info(`Ticker ${ticker} not found`);
        setFailedTickers(prev => new Set(prev).add(ticker));
        failedTickersRef.current.add(ticker);
        return null;
      }
      if (res.status === 429) {
        console.warn(`Rate limit hit for ${ticker}, will retry later.`);
        return null;
      }
      if (!res.ok) throw new Error(`HTTP fetch error! status: ${res.status}`);
      const text = await res.text();
      if (text) {
        const data = JSON.parse(text);
        setStockData(prev => ({ ...prev, [ticker]: { ...data } }));
        return data;
      }
    } catch (e) {
      console.error(e);
      setFailedTickers(prev => new Set(prev).add(ticker));
      failedTickersRef.current.add(ticker);
    }
    return null;
  };

  const fetchHistory = async (ticker: string, days = 365) => {
    // If we have enough data (at least requested days or it's a lite fetch being upgraded)
    if (failedTickersRef.current.has(ticker)) return;
    if (historyData[ticker] && (historyData[ticker].length >= (days * 0.7))) return;
    
    const isFullChart = days >= 180;
    
    if (isFullChart) {
      setLoadingChart(prev => ({ ...prev, [ticker]: true }));
    } else {
      setLoadingDetails(true);
    }

    setHistoryError(prev => ({ ...prev, [ticker]: null }));
    try {
      const res = await fetch(`/api/history/${ticker}?days=${days}`);
      if (res.status === 404) {
        setHistoryError(prev => ({ ...prev, [ticker]: "Market data not available for this symbol" }));
        setFailedTickers(prev => new Set(prev).add(ticker));
        failedTickersRef.current.add(ticker);
        return;
      }
      if (res.status === 429) {
        setHistoryError(prev => ({ ...prev, [ticker]: "Rate limit exceeded. Please wait a moment." }));
        return;
      }
      if (!res.ok) throw new Error(`HTTP fetch error! status: ${res.status}`);
      const text = await res.text();
      if (!text) throw new Error("Empty response from history engine");
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        setHistoryError(prev => ({ ...prev, [ticker]: data.error || "No historical data available" }));
        setFailedTickers(prev => new Set(prev).add(ticker));
        failedTickersRef.current.add(ticker);
        return;
      }

      const formatted = data.map((d: any) => ({
        date: new Date(d.date).toISOString(),
        displayDate: new Date(d.date).toLocaleDateString(),
        close: d.close,
        volume: d.volume
      }));
      setHistoryData(prev => ({ ...prev, [ticker]: formatted }));
      
      // Accuracy Booster: Calculate RSI and Spiciness
      const rsi = calculateRSI(formatted);
      const spiciness = calculateSpiciness(formatted);
      
      setStockData(prev => {
        const current = prev[ticker] || { symbol: ticker };
        const sentimentValue = current.sentiment ?? 5;
        const { grade } = calculateResearchGrade(sentimentValue, rsi, spiciness);
        return {
          ...prev,
          [ticker]: { ...current, rsi, spiciness, researchGrade: grade }
        };
      });
    } catch (e: any) {
      console.warn(`History fetch error for ${ticker}:`, e);
      setHistoryError(prev => ({ ...prev, [ticker]: e.message || "Failed to connect to data engine" }));
    } finally {
      if (isFullChart) {
        setLoadingChart(prev => ({ ...prev, [ticker]: false }));
      } else {
        setLoadingDetails(false);
      }
    }
  };

  const handleSearch = async (e?: React.FormEvent, customQuery?: string, isLoadMore = false) => {
    e?.preventDefault();
    if (loading) return;
    
    const activeQuery = customQuery || query;
    if (!activeQuery.trim()) return;
    setLoading(true);
    console.log("handleSearch: Starting research for", activeQuery);
    
    try {
      let results: string[] = [];
      const excluded = isLoadMore ? allSeenTickers : [];
      try {
        console.log("handleSearch: Calling getTickersFromAI");
        results = await getTickersFromAI(activeQuery, excluded);
        console.log("handleSearch: Got results", results);
      } catch (err: any) {
        console.error("Search failure:", err);
        const msg = err.message || "";
        let userMsg = "Research Engine encountered an issue.";
        if (msg.includes('429') || msg.includes('quota')) {
          userMsg = "Research limit reached. Please try again in a few minutes.";
        } else if (msg.includes('403') || msg.includes('billing') || msg.includes('funds')) {
          userMsg = "The Research Lab is currently out of fuel (API Quota/Billing). Please check your Gemini API settings or try again later.";
        } else if (msg.includes('Failed to fetch')) {
          userMsg = "Connection to Research AI lost. Check your internet.";
        }
        alert(`${userMsg}\n\nTechnical details: ${msg}`);
        return;
      }
      
      if (!results || results.length === 0) {
        if (isLoadMore) {
          alert("No more unique stock tickers found for this query.");
        } else {
          alert("No relevant stock tickers found for this query. Try being more specific!");
        }
        return;
      }
      
      // We will trust the AI's selection and let the background useEffect fetch the data.
      // This prevents the UI from hanging for 10 seconds and bypasses Yahoo Finance sequential rate limits.
      // Slice to maximum 10 results to keep UI clean.
      const finalResults = results.slice(0, 10);
  
      if (isLoadMore) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTickers(finalResults);
        setAllSeenTickers(prev => [...prev, ...finalResults]);
        setDiscoveryPage(prev => prev + 1);
      } else {
        setTickers(finalResults);
        setAllSeenTickers(finalResults);
        setDiscoveryPage(0);
        if (finalResults.length > 0) {
          // setSelectedTicker(finalResults[0]); // User requested manual selection
          setStep('results'); // Show the results page!
        }
      }
      console.log("handleSearch: Completed successfully");
    } finally {
      setLoading(false);
      console.log("handleSearch: Loading set to false");
    }
  };

  const handleCategoryClick = (cat: string) => {
    setQuery(cat);
    handleSearch(undefined, cat);
  };

  const addToWatchlist = (ticker: string) => {
    if (!watchlist.includes(ticker)) {
      const newList = [...watchlist, ticker];
      setWatchlist(newList);
      syncWatchlist(newList);
    }
  };

  const removeFromWatchlist = (ticker: string) => {
    const newList = watchlist.filter(t => t !== ticker);
    setWatchlist(newList);
    syncWatchlist(newList);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = manualTicker.toUpperCase().trim();
    if (t && !watchlist.includes(t)) {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock/${t}`);
        if (!res.ok) {
          alert(`Asset ${t} not found or invalid. Please check the symbol and try again.`);
          return;
        }
        const newList = [...watchlist, t];
        setWatchlist(newList);
        syncWatchlist(newList);
        setManualTicker("");
        setSelectedTicker(t);
      } catch (err) {
        alert("Connectivity error while validating ticker.");
      } finally {
        setLoading(false);
      }
    }
  };



  useEffect(() => {
    if (selectedTicker) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Stage 1: Absolute Priority - Metadata & Preliminary Grade
      // We start fetching both in parallel for max throughput
      fetchStockInfo(selectedTicker).then(data => {
        if (data && data.longBusinessSummary) fetchAnalysis(selectedTicker, false, data);
      });
      
      // Fetch 30-day "Lite" data first for the immediate Grade & Score
      fetchHistory(selectedTicker, 30).then(() => {
        // Stage 2: Secondary Priority - Professional Analytics Chart
        // We defer this slightly to ensure the UI feels responsive for the grades/data
        const timer = setTimeout(() => {
          fetchHistory(selectedTicker, 365);
        }, 400); // 400ms delay to let the Grade settle in the user's mind
        return () => clearTimeout(timer);
      });
    }
  }, [selectedTicker]);

  useEffect(() => {
    const fetchAllBackground = async () => {
      // Parallel fetch basic info first for all watchlist items
      await Promise.all(watchlist.map(async (t) => {
        if (!stockData[t]?.regularMarketPrice) {
          await fetchStockInfo(t);
        }
      }));

      // Grouped fetch for heavy analysis (AI and History) to avoid hitting limits too hard but faster than sequential
      for (let i = 0; i < watchlist.length; i += 3) {
        const batch = watchlist.slice(i, i + 3);
        await Promise.all(batch.map(async (t) => {
          // Sync Technical Data for correct Grade calculation (LITE - 30 days is enough)
          if (!historyData[t]) {
            await fetchHistory(t, 30);
          }
          // Sync AI Analysis
          if (stockData[t]?.longBusinessSummary && stockData[t]?.sentiment === undefined) {
            await fetchAnalysis(t, true);
          }
        }));
      }
    };
    if (watchlist.length > 0) fetchAllBackground();
  }, [watchlist]);

  useEffect(() => {
    const fetchAllBackground = async () => {
      // Parallel fetch basic info for discovered tickers
      await Promise.all(tickers.map(async (t) => {
        if (!stockData[t]?.regularMarketPrice) {
          await fetchStockInfo(t);
        }
      }));

      // Batch analysis for tickers - reduce batch size to 3
      for (let i = 0; i < tickers.length; i += 3) {
        const batch = tickers.slice(i, i + 3);
        await Promise.all(batch.map(async (t) => {
          // Sync Technical Data for correct Grade calculation (LITE - 30 days is enough)
          if (!historyData[t]) {
            await fetchHistory(t, 30);
          }
          // Sync AI Analysis
          if (stockData[t]?.longBusinessSummary && stockData[t]?.sentiment === undefined) {
            await fetchAnalysis(t, true);
          }
        }));
      }
    };
    if (tickers.length > 0) fetchAllBackground();
  }, [tickers]);

  const currentStock = selectedTicker ? stockData[selectedTicker] : null;
  const currentHistory = (selectedTicker && historyData[selectedTicker]) || [];

  const fetchAnalysis = async (ticker: string, silent = false, overrideStock: any = null) => {
    // Concurrency protection: don't fetch if already in progress for this ticker
    if (fetchingAnalysisRef.current.has(ticker)) return;
    
    const stock = overrideStock || stockData[ticker];
    if (!stock || !stock.longBusinessSummary) return;
    if (stock.sentiment !== undefined && stock.conciseSummary) return;

    try {
      fetchingAnalysisRef.current.add(ticker);
      if (!silent) setLoadingAI(prev => ({ ...prev, [ticker]: true }));
      
      let summary = stock.conciseSummary;
      let catalyst = stock.newsCatalyst;
      let sentiment = stock.sentiment;

      if (!summary || sentiment === undefined) {
        if (!silent) {
           await getCombinedAnalysisStream(stock.longBusinessSummary, (partial) => {
             if (partial.summary || partial.newsCatalyst || partial.sentiment !== undefined) {
               setStockData(prev => {
                 const current = prev[ticker] || { symbol: ticker } as StockInfo;
                 const s = partial.sentiment !== undefined ? partial.sentiment : (current.sentiment || 5);
                 const { grade } = calculateResearchGrade(s, current.rsi || 50, current.spiciness || 5);
                 return {
                   ...prev,
                   [ticker]: { 
                     ...current, 
                     conciseSummary: partial.summary || current.conciseSummary, 
                     newsCatalyst: partial.newsCatalyst || current.newsCatalyst, 
                     sentiment: s,
                     researchGrade: grade 
                   }
                 } as Record<string, StockInfo>;
               });
             }
           }, true);
           
           // Ensure final state is captured (just in case streaming ended abruptly)
           const finalStock = (await getStockSnapshot())[ticker];
           summary = finalStock?.conciseSummary;
           catalyst = finalStock?.newsCatalyst;
           sentiment = finalStock?.sentiment;
        } else {
           // Do fallback silently using combined analysis to save time
           const combined = await getCombinedAnalysis(stock.longBusinessSummary, false);
           summary = combined.summary;
           catalyst = combined.newsCatalyst;
           sentiment = combined.sentiment;
        }
      }
      
      setStockData(prev => {
        const current = prev[ticker] || { symbol: ticker } as StockInfo;
        const { grade } = calculateResearchGrade(sentiment || 5, current.rsi || 50, current.spiciness || 5);
        return {
          ...prev,
          [ticker]: { ...current, conciseSummary: summary, newsCatalyst: catalyst, sentiment, researchGrade: grade }
        } as Record<string, StockInfo>;
      });
    } catch (error) {
      console.error("Analysis error for", ticker, ":", error);
      if (!silent) alert("Analysis failed. Please try again.");
    } finally {
      fetchingAnalysisRef.current.delete(ticker);
      if (!silent) setLoadingAI(prev => ({ ...prev, [ticker]: false }));
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <HandDrawnFilter />
        <DoodleField density={15} opacity={0.2} seed={101} />
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6 relative z-10"
        >
          <SPRLogo size={64} className="mb-6 animate-pulse" />
          <h2 className="text-4xl font-heading font-extrabold text-white uppercase tracking-tighter">Initialising Lab</h2>
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="animate-spin text-trapper-lime" size={24} />
            <p className="font-hand text-xl text-slate-400 font-bold">Synchronizing instruments...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'instructions') {
    return (
        <div className="min-h-screen bg-slate-900 trapper-keeper-gradient flex items-center justify-center px-4 sm:px-8 py-12 overflow-x-hidden relative">
        <HandDrawnFilter />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl w-full p-4 sm:p-12 paper-card lined-paper flex flex-col items-center relative z-10 min-h-[80vh] shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)]"
        >
          <DoodleField density={10} opacity={0.25} seed={202} />
          {/* Red Margin Line */}
          <div className="absolute left-[4rem] top-0 bottom-0 w-[2px] bg-margin-red opacity-20 pointer-events-none" />

          {/* Notebook Spine Effect */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-black/5 flex flex-col justify-around py-8 border-r border-black/5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-slate-200 border-2 border-slate-300 mx-auto" />
            ))}
          </div>

          <div className="space-y-8 w-full px-4 sm:px-10 relative z-20">
            <div className="flex justify-center">
              <SPRLogo size={48} className="rotate-3" />
            </div>

            <div className="text-center space-y-2">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl sm:text-6xl md:text-8xl font-heading font-extrabold text-slate-900 drop-shadow-[2px_2px_0px_rgba(255,255,255,1)] break-words relative inline-block"
              >
                StonkProof
                <div className="absolute -top-4 -right-12 bg-trapper-pink text-white text-[10px] sm:text-xs font-bold px-3 py-1 -rotate-6 shadow-lg border-2 border-slate-900 uppercase tracking-widest">
                  Beta
                </div>
              </motion.h1>
              <p className="font-hand text-2xl text-slate-500 font-bold rotate-[-1deg]">Research Lab v1.0</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Discover", desc: "Find stocks with natural language.", color: "bg-trapper-lime" },
                { title: "Analyze", desc: "Real-time price verification.", color: "bg-trapper-blue" },
                { title: "Monitor", desc: "Build your conviction list.", color: "bg-trapper-pink" }
              ].map((item, i) => (
                <div key={i} className={`${item.color} p-6 doodle-border sketch-shadow space-y-2 transform transition-transform hover:rotate-1`}>
                  <h3 className="font-heading text-lg font-bold text-black uppercase tracking-tight">{item.title}</h3>
                  <p className="font-sans text-xs font-semibold text-black/80 leading-tight uppercase tracking-wider">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center pt-8 mt-auto w-full max-w-2xl mx-auto border-t-2 border-dashed border-slate-300">
              {!user ? (
                <Button 
                  onClick={signInWithGoogle}
                  className="h-16 w-full max-w-sm px-12 bg-white text-black hover:bg-slate-100 rounded-none font-heading font-bold text-xl uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none group border-2 border-slate-900"
                >
                  Sign In with Google
                  <ChevronRight className="ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                  {/* Minimized User Badge - Authenticated Visual Cue */}
                  <button 
                    onClick={logout}
                    className="relative flex-shrink-0 group cursor-pointer transition-transform hover:scale-110 active:scale-95" 
                    title="Click to Logout"
                  >
                    <img 
                      src={user.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.uid}`} 
                      alt="" 
                      className="w-14 h-14 rounded-full border-2 border-slate-900 sketch-shadow bg-white" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-2 border-2 border-slate-900 shadow-sm group-hover:bg-rose-500 transition-colors">
                      <Mail size={12} className="text-white" />
                    </div>
                  </button>

                  <Button 
                    onClick={() => setStep('prompt')}
                    className="h-14 px-8 w-full sm:w-auto bg-white text-black hover:bg-slate-100 rounded-none border-2 border-slate-900 font-heading font-bold text-lg uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none group"
                  >
                    Enter Research Lab
                    <ChevronRight className="ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>

                  <Button 
                    onClick={() => setStep('download')}
                    className="h-14 px-8 w-full sm:w-auto bg-black text-white hover:bg-slate-900 rounded-none font-heading font-bold text-xs uppercase tracking-widest transition-all hover:translate-x-1 hover:translate-y-1 group border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download App
                  </Button>
                </div>
              )}
              
              {user && (
                <Button 
                  variant="ghost"
                  onClick={logout}
                  className="h-12 px-6 text-orange-200 hover:text-sky-300 hover:bg-slate-800/50 rounded-none font-heading font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Logout
                </Button>
              )}
              {!user && (
                <p className="font-hand text-white/60 text-sm italic">Sign in to sync your watchlist and research notes.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

if (step === 'prompt') {
  return (
      <div className="min-h-screen bg-slate-900 trapper-keeper-gradient flex flex-col overflow-x-hidden relative">
      <HandDrawnFilter />
      
      <WatchlistHeader 
        watchlist={watchlist}
        stockData={stockData}
        stockErrors={stockErrors}
        selectedTicker={selectedTicker}
        manualTicker={manualTicker}
        setManualTicker={setManualTicker}
        handleManualAdd={handleManualAdd}
        isWatchlistExpanded={isWatchlistExpanded}
        setIsWatchlistExpanded={setIsWatchlistExpanded}
        removeFromWatchlist={removeFromWatchlist}
        setSelectedTicker={setSelectedTicker}
        setStep={setStep}
      />
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-12 relative overflow-x-hidden z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl space-y-8 paper-card lined-paper p-6 sm:p-12 pt-16 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] min-h-[500px] relative z-20"
        >
          <DoodleField density={12} opacity={0.25} seed={404} />
          {/* Notebook Spine Effect */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-black/5 flex flex-col justify-around py-8 border-r border-black/5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-slate-200 border-2 border-slate-300 mx-auto" />
            ))}
          </div>

          {/* Red Margin Line Overlay */}
          <div className="absolute left-[4rem] top-0 bottom-0 w-[2px] bg-margin-red opacity-20 pointer-events-none" />

          {/* Margin Note */}
          <div className="absolute top-10 left-[4.5rem] rotate-[-5deg] font-hand text-blue-500 opacity-60 hidden lg:block z-20 max-w-[120px]">
            "Don't forget to check <br/> the energy sector!"
          </div>

          <div className="text-center space-y-2 relative z-10 pl-10">
            <h2 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight text-slate-900 uppercase">Discovery Engine</h2>
            <p className="font-hand text-xl text-slate-500 font-bold">What are we researching today? Class is in session.</p>
          </div>

          <div className="relative z-10">
            <form onSubmit={handleSearch} className="flex flex-col space-y-6">
              <div className="relative doodle-border bg-white p-3 shadow-inner">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                  <Input 
                    autoFocus
                    placeholder="E.G. TECH STOCKS UNDER $15..." 
                    className="pl-16 h-14 bg-transparent border-none rounded-none font-sans text-lg font-bold focus-visible:ring-0 placeholder:text-slate-300 uppercase tracking-widest"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
              </div>
              <Button 
                type="submit"
                disabled={loading || !query.trim()}
                className="w-full h-14 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white hover:opacity-90 rounded-none font-heading font-bold text-lg uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin" />
                    <span className="font-sans font-bold uppercase tracking-widest">Processing...</span>
                  </div>
                ) : (
                  "Execute Research"
                )}
              </Button>
            </form>
          </div>

          <div className="flex flex-wrap justify-center gap-3 relative z-10">
            {["LONG-TERM STOCKS", "UNDER $5", "EMERGENT SECTOR", "TECH STOCKS", "SURPRISE ME", "CRYPTO"].map((cat) => (
              <button
                key={cat}
                className="sticker bg-trapper-lime text-black text-xs hover:scale-110 transition-transform"
                onClick={() => handleCategoryClick(cat)}
              >
                #{cat}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
    );
  }

  if (step === 'download') {
    return (
        <div className="min-h-screen bg-slate-900 trapper-keeper-gradient flex items-center justify-center px-4 overflow-x-hidden relative">
          <HandDrawnFilter />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full p-12 paper-card bg-white text-slate-900 flex flex-col items-center shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] doodle-border relative"
          >
            <DoodleField density={8} opacity={0.2} seed={707} />
            {/* Red Margin decoration */}
            <div className="absolute top-0 right-0 w-8 h-8 opacity-20 pointer-events-none">
              <div className="absolute top-0 right-10 bottom-0 w-[1px] bg-margin-red" />
            </div>

            <div className="space-y-10 w-full text-center relative z-10">
              <div className="flex justify-center">
                <SPRLogo size={80} className="-rotate-6" />
              </div>

              <div className="space-y-4">
                <h2 className="text-5xl font-heading font-extrabold uppercase tracking-tighter leading-none text-slate-900">SPR BETA</h2>
                <p className="font-hand text-xl font-bold text-slate-500 uppercase tracking-widest">Research Lab v1.0</p>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleInstall}
                  className="w-full h-20 bg-black text-white hover:bg-slate-800 rounded-none font-heading font-bold text-2xl uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none group"
                >
                  <Download className="mr-4 w-8 h-8" />
                  Download App
                </Button>
                <Button 
                  onClick={resetApp}
                  variant="ghost"
                  className="w-full mt-4 h-12 text-slate-500 hover:text-slate-900 rounded-none font-heading font-bold text-sm uppercase tracking-widest transition-all"
                >
                  ← Go Back
                </Button>
              </div>
              
              <p className="font-hand text-slate-400 text-sm italic">"One click to install. Start your research."</p>
            </div>
          </motion.div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-slate-900 trapper-keeper-gradient text-slate-900 font-sans selection:bg-trapper-lime/30 flex flex-col overflow-x-hidden relative">
      <HandDrawnFilter />
      <WatchlistHeader 
        watchlist={watchlist}
        stockData={stockData}
        stockErrors={stockErrors}
        selectedTicker={selectedTicker}
        manualTicker={manualTicker}
        setManualTicker={setManualTicker}
        handleManualAdd={handleManualAdd}
        isWatchlistExpanded={isWatchlistExpanded}
        setIsWatchlistExpanded={setIsWatchlistExpanded}
        removeFromWatchlist={removeFromWatchlist}
        setSelectedTicker={setSelectedTicker}
        setStep={setStep}
      />
      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col w-full overflow-x-hidden relative z-10">
        <div className="absolute inset-0 bg-paper/95 lined-paper pointer-events-none z-0" />
        
        <DoodleField density={40} opacity={0.15} seed={505} />

        {/* Header and Main Content with higher Z-Index */}
        <div className="flex-1 flex flex-col relative z-20">
          {/* Header */}
          <header className="border-b-2 border-slate-900 bg-gradient-to-r from-white via-slate-50 to-white backdrop-blur-xl z-50 w-full overflow-x-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={resetApp}>
            <SPRLogo size={20} className="rotate-0 shadow-none border" />
            <div className="relative">
              <h1 className="text-2xl font-heading font-extrabold tracking-tight hidden sm:block uppercase">StonkProof Research</h1>
              <h1 className="text-2xl font-heading font-extrabold tracking-tight block sm:hidden">SPR</h1>
              <div className="absolute -top-2 -right-10 bg-trapper-pink text-white text-[8px] font-bold px-1.5 py-0.5 rotate-12 shadow-sm border border-white uppercase tracking-widest hidden sm:block">
                Beta
              </div>
              <p className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">AI-Powered Research Lab</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 text-slate-500 font-heading text-[10px] font-bold uppercase tracking-widest gap-2 hidden md:flex"
              onClick={() => setStep('download')}
            >
              <Download size={14} /> Download
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 border-2 border-slate-900 bg-gradient-to-br from-trapper-lime via-emerald-400 to-trapper-lime text-black font-heading text-[10px] font-bold uppercase tracking-widest gap-2 hover:opacity-90 transition-opacity"
              onClick={() => {
                setSelectedTicker(null);
                setStep('prompt');
              }}
            >
              <Search size={14} /> New Scan
            </Button>
          </div>
        </div>
      </header>      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 overflow-x-hidden space-y-20">
          <AnimatePresence mode="wait">
            {selectedTicker ? (
              <motion.div
                key={selectedTicker}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                {/* Hero Asset Info */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <h2 className="text-4xl sm:text-6xl md:text-8xl font-heading font-extrabold tracking-tighter leading-none text-slate-900 break-all">{selectedTicker}</h2>
                      <div className="flex flex-row sm:flex-col gap-2">
                        <div className="sticker bg-trapper-blue text-black text-[10px]">
                          {currentStock?.currency || "USD"}
                        </div>
                        <div className="sticker bg-trapper-pink text-white text-[9px]">
                          {currentStock?.fullExchangeName?.split(' ')[0] || "NASD"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-1 bg-margin-red" />
                      <p className="text-1xl sm:text-2xl font-sans font-medium text-slate-500 uppercase tracking-widest">{currentStock?.longName || currentStock?.shortName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button 
                      variant={watchlist.includes(selectedTicker) ? "secondary" : "outline"}
                      className="h-14 px-8 border-2 border-slate-900 font-heading font-bold uppercase text-xs tracking-widest gap-3 bg-white hover:bg-slate-50 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                      onClick={() => watchlist.includes(selectedTicker) ? removeFromWatchlist(selectedTicker) : addToWatchlist(selectedTicker)}
                    >
                      {watchlist.includes(selectedTicker) ? <StarOff size={18} /> : <Star size={18} />}
                      {watchlist.includes(selectedTicker) ? "Drop Asset" : "Watch Asset"}
                    </Button>
                  </div>
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: "Market Value", value: `$${currentStock?.regularMarketPrice?.toFixed(2) || currentStock?.currentPrice?.toFixed(2) || "---"}`, color: "bg-white" },
                    { label: "Capitalization", value: currentStock?.marketCap ? `${(currentStock.marketCap / 1e9).toFixed(1)}B` : "---", color: "bg-white" },
                    { 
                      label: "24H Delta", 
                      value: `${(currentStock?.regularMarketChangePercent || 0) >= 0 ? "+" : ""}${currentStock?.regularMarketChangePercent?.toFixed(2)}%`,
                      color: (currentStock?.regularMarketChangePercent || 0) >= 0 ? "bg-emerald-50" : "bg-rose-50",
                      textColor: (currentStock?.regularMarketChangePercent || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                    },
                    { label: "Exchange", value: currentStock?.fullExchangeName || "NYSE/NASD", color: "bg-white" }
                  ].map((stat, i) => (
                    <div key={i} className={cn("p-6 paper-card", stat.color)}>
                      <p className="font-heading text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{stat.label}</p>
                      <p className={cn(
                        "text-2xl font-heading font-bold tracking-tight",
                        stat.textColor || "text-slate-900"
                      )}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="paper-card p-6 bg-white border-2 border-slate-900 mt-6 md:col-span-4">
                  <h4 className="font-heading font-bold uppercase tracking-widest text-[10px] text-slate-400 mb-4">Grade Legend</h4>
                  <p className="text-[9px] text-slate-500 mb-4 italic">
                    All numerical grades come from weighted calculations based on Sentiment (40%), Relative Strength (35%), and Volatility (25%).
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-heading font-bold uppercase tracking-widest text-slate-900">
                    <span>A+: 9.2 - 10.0</span>
                    <span>A: 8.5 - 9.1</span>
                    <span>A-: 7.8 - 8.4</span>
                    <span>B+: 7.1 - 7.7</span>
                    <span>B: 6.4 - 7.0</span>
                    <span>B-: 5.7 - 6.3</span>
                    <span>C: 4.3 - 5.6</span>
                    <span>D/F: &lt; 4.3</span>
                  </div>
                </div>

                <MarketAnalytics 
                  ticker={selectedTicker} 
                  stock={currentStock} 
                  history={currentHistory} 
                  error={historyError[selectedTicker]}
                  isLoading={loadingChart[selectedTicker]}
                />
                
                <div className="space-y-8">
                  <AIInsights 
                    ticker={selectedTicker} 
                    stock={currentStock} 
                    isLoadingAI={loadingAI[selectedTicker]} 
                  />
                  
                  <NewsFeed 
                    stock={currentStock} 
                    isLoadingAI={loadingAI[selectedTicker]} 
                  />

                  <ResearchNotes 
                    note={note} 
                    setNote={setNote} 
                    saveNote={saveNote} 
                    isSavingNote={isSavingNote} 
                  />
                </div>

                <div className="flex justify-center pt-8">
                  <Button 
                    variant="outline"
                    className="h-16 px-12 border-2 border-slate-900 font-heading font-bold uppercase tracking-widest gap-2 bg-white hover:bg-slate-50 shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-lg"
                    onClick={() => setSelectedTicker(null)}
                  >
                    ← Back to results
                  </Button>
                </div>
              </motion.div>
            ) : (
                <DiscoveryResults 
                  tickers={tickers}
                  displayedTickers={displayedTickers}
                  stockData={stockData}
                  selectedTicker={selectedTicker}
                  setSelectedTicker={setSelectedTicker}
                  isSortByGrade={isSortByGrade}
                  setIsSortByGrade={setIsSortByGrade}
                  loading={loading}
                  handleSearch={handleSearch}
                  discoveryPage={discoveryPage}
                />
            )}
          </AnimatePresence>

          {loading && tickers.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-16">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 w-full paper-card bg-white/50 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-slate-900 bg-white py-20 mt-20 relative overflow-hidden z-20">
        <DoodleField density={20} opacity={0.1} seed={606} />

        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <SPRLogo size={20} className="rotate-0 shadow-none border-2" />
              <span className="font-heading text-2xl font-bold tracking-tight">StonkProof Research</span>
            </div>
            <p className="font-sans text-base text-slate-500 max-w-xs font-medium">
              Advanced AI-driven market intelligence. Class is in session.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {[
              { label: "The Lab", href: "https://ai.studio/", target: "_blank" },
              { label: "Intelligence", href: "https://gemini.google.com/", target: "_blank" },
              { label: "Hall Pass", href: "https://www.google.com/search?q=top+stock+investment+apps", target: "_blank" },
              { label: "Library", href: "https://finance.yahoo.com/", target: "_blank" }
            ].map((link) => (
              <a key={link.label} href={link.href} target={link.target} className="font-heading text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-slate-100 flex flex-col items-center gap-8">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="font-heading text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors"
          >
            Back to Top
          </button>
          <p className="font-hand text-sm text-slate-400 italic">
            © 2026 STONKPROOF RESEARCH (SPR) / ALL RIGHTS RESERVED / NO CHEATING
          </p>
          <p className="text-[10px] text-slate-500 mt-2 text-center">
            StonkProof Research is for research purposes only. It is not an investment tool. It is simply a resource for investing.
          </p>
        </div>
      </footer>
    </div>
  </div>
</div>
);
}