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
  Mail
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
import { cn, calculateLinearRegression, calculateRSI, calculateSpiciness, calculateResearchGrade, getGradeColor } from "@/lib/utils";
import { getTickersFromAI, ai, summarizeBusiness, analyzeSentiment } from "@/lib/gemini";

import { auth, signInWithGoogle, logout, getDb, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, setDoc, Timestamp } from "firebase/firestore";
// --- Types ---
interface StockInfo {
  symbol: string;
  shortName?: string;
  longName?: string;
  currentPrice?: number;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
  longBusinessSummary?: string;
  conciseSummary?: string;
  newsCatalyst?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  sentiment?: number;
  rsi?: number;
  spiciness?: number;
  researchGrade?: string;
}

interface HistoryData {
  date: string;
  close: number;
}

// --- Components ---
const SPRLogo = ({ size = 48, className = "", innerClassName = "" }: { size?: number, className?: string, innerClassName?: string }) => {
  const p = size * 0.35;
  const fs = size * 0.4;
  const strokeScale = Math.max(1, size / 48);
  
  return (
    <div 
      className={cn("bg-white doodle-border rotate-2 shadow-xl border !border-slate-900 overflow-hidden relative inline-block", className)}
      style={{ padding: `${p}px` }}
    >
      <div 
        className="absolute opacity-40" 
        style={{ 
          top: `${p * 0.15}px`, 
          right: `${p * 0.15}px`,
          width: `${fs}px`,
          height: `${fs}px`,
          transform: `scale(${strokeScale})`
        }}
      >
        <HandDrawnDoodle type="flame" size={fs} className={cn("pencil-doodle", innerClassName)} strokeWidth={1.8 * Math.min(1.5, strokeScale)} />
      </div>
      <div className="relative z-10">
        <HandDrawnDoodle type="skull" size={size} className={cn("pencil-doodle", innerClassName)} strokeWidth={1.8 * Math.min(1.5, strokeScale)} />
      </div>
    </div>
  );
};

const HandDrawnFilter = () => (
  <svg style={{ position: 'fixed', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
    <filter id="pencil-jitter" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" />
    </filter>
  </svg>
);

const SKETCH_PATHS = {
  skull: "M12 2C7.5 2 4 5.5 4 10C4 12.5 5.5 14.5 7.5 15.5L7 19C7 20.5 8.5 22 10 22H14C15.5 22 17 20.5 17 19L16.5 15.5C18.5 14.5 20 12.5 20 10C20 5.5 16.5 2 12 2ZM9 8C9.5 8 10 8.5 10 9C10 9.5 9.5 10 9 10C8.5 10 8 9.5 8 9C8 8.5 8.5 8 9 8ZM15 8C15.5 8 16 8.5 16 9C16 9.5 15.5 10 15 10C14.5 10 14 9.5 14 9C14 8.5 14.5 8 15 8ZM10 16H14M10 19H14",
  star: "M12 2L15 9H22L16 14L18 21L12 17L6 21L8 14L2 9H9L12 2Z",
  ghost: "M12 2C8 2 4 5 4 10V20L7 18L10 20L13 18L16 20L20 22V10C20 5 16 2 12 2ZM8 9C8.5 9 9 9.5 9 10C9 10.5 8.5 11 8 11C7.5 11 7 10.5 7 10C7 9.5 7.5 9 8 9ZM16 9C16.5 9 17 9.5 17 10C17 10.5 16.5 11 16 11C15.5 11 15 10.5 15 10C15 9.5 15.5 9 16 9Z",
  eyeX: "M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12ZM12 15C13.6 15 15 13.6 15 12C15 10.4 13.6 9 12 9C10.4 9 9 10.4 9 12C9 13.6 10.4 15 12 15ZM10 10L14 14M14 10L10 14",
  flame: "M12 22C16.4 22 20 18.4 20 14C20 9.6 12 2 12 2C12 2 4 9.6 4 14C4 18.4 7.6 22 12 22ZM12 18C13.6 18 15 16.6 15 15C15 13.4 12 10 12 10C12 10 9 13.4 9 15C9 16.6 10.4 18 12 18Z",
  cloud: "M17 19C19.2 19 21 17.2 21 15C21 13.1 19.6 11.4 17.8 11.1C17.3 8.2 14.9 6 12 6C10.1 6 8.4 6.9 7.3 8.3C6.9 8.1 6.4 8 6 8C4.3 8 3 9.3 3 11C3 11.2 3 11.5 3.1 11.8C1.8 12.8 1 14.3 1 16C1 18.2 2.8 20 5 20L17 19ZM8 22L7 25M13 22L12 25M18 22L17 25",
  mushroom: "M12 2C7 2 3 6 3 10C3 11 6 11 6 11V18C6 20 8 22 10 22H14C16 22 18 20 18 18V11C18 11 21 11 21 10C21 6 17 2 12 2ZM8 7C8.5 7 9 7.5 9 8C9 8.5 8.5 9 8 9C7.5 9 7 8.5 7 8C7 7.5 7.5 7 8 7ZM15 5C15.5 5 16 5.5 16 6C16 6.5 15.5 7 15 7C14.5 7 14 6.5 14 6C14 5.5 14.5 5 15 5Z",
  bolt: "M13 2L3 14H12L11 22L21 10H12L13 2Z",
  heart: "M12 21L10 19C6 15 2 12 2 8C2 5 4 2 8 2C10 2 11 3 12 4C13 3 14 2 16 2C20 2 22 5 22 8C22 12 18 15 14 19L12 21Z",
  smile: "M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22ZM9 9C9.5 9 10 10M15 9C15.5 9 16 10M8 15C9 17 10 18 12 18C14 18 15 17 16 15",
  pizza: "M12 2L4 18H20L12 2ZM10 12C10.6 12 11 11.6 11 11M14 14C14.6 14 15 13.6 15 13M9 16C9.6 16 10 15.6 10 15",
  soda: "M6 6V18C6 20.2 8.7 22 12 22C15.3 22 18 20.2 18 18V6M6 6C6 3.8 8.7 2 12 2C15.3 2 18 3.8 18 6M6 6C6 8.2 8.7 10 12 10C15.3 10 18 8.2 18 6",
  cat: "M12 13C10 13 8 14 8 16C8 18 10 20 12 20C14 20 16 18 16 16C16 14 14 13 12 13ZM12 13V15M8 16H6M16 16H18M7 8L4 4V10M17 8L20 4V10",
  bat: "M12 12C12 12 10 9 7 9C4 9 2 11 2 13C2 15 4 17 7 17C10 17 12 14 12 14C12 14 14 17 17 17C20 17 22 15 22 13C22 11 20 9 17 9C14 9 12 12 12 12Z",
  dice: "M4 4H20V20H4V4ZM8 8H8.1M16 16H16.1M12 12H12.1",
  pin: "M16 4L4 16M4 16C3 17 3 19 4 20C5 21 7 21 8 20C8 20 18 10 20 8C22 6 22 4 20 2C18 0 16 0 14 2L6 10",
  skateboard: "M4 14H20M6 14V17M18 14V17M3 13C6 11 18 11 21 13",
  crown: "M3 14L6 4L9 10L12 4L15 10L18 4L21 14Z",
  mountain: "M3 14L6 4L6.5 4.5L7 4L9 10L12 4L12.5 4.5L13 4L15 10L18 4L18.5 4.5L19 4L21 14"
};

const HandDrawnDoodle = ({ type, size, className, style, strokeWidth = 1.8 }: { type: keyof typeof SKETCH_PATHS, size: number, className?: string, style?: any, key?: any, strokeWidth?: number }) => {
  const path = SKETCH_PATHS[type];
  if (!path) return null;

  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      className={className}
      style={style}
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth}
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {/* Draw path twice with slight offset for sketchy look */}
      <path d={path} opacity="0.3" transform="translate(0.5, 0.5)" />
      <path d={path} />
    </svg>
  );
};

const DoodleField = ({ density = 8, opacity = 1.0, seed = 1 }: { density?: number, opacity?: number, seed?: number }) => {
  const types = Object.keys(SKETCH_PATHS) as (keyof typeof SKETCH_PATHS)[];
  
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0" style={{ opacity }}>
      {[...Array(density)].map((_, i) => {
        const type = types[i % types.length];
        const s = seed + i * 13.5;
        const top = seededRandom(s) * 85 + 5;
        const left = seededRandom(s + 1) * 85 + 5;
        const rotate = seededRandom(s + 2) * 360;
        const size = 32 + seededRandom(s + 3) * 32;
        
        return (
          <HandDrawnDoodle 
            key={i}
            type={type}
            size={size}
            className="absolute pencil-doodle"
            style={{
              top: `${top}%`,
              left: `${left}%`,
              transform: `rotate(${rotate}deg)`
            }}
          />
        );
      })}
    </div>
  );
};


// --- Types ---

const ZoomArea = ReferenceArea as any;

// --- App Component ---
interface WatchlistHeaderProps {
  watchlist: string[];
  stockData: Record<string, StockInfo>;
  selectedTicker: string | null;
  manualTicker: string;
  setManualTicker: (val: string) => void;
  handleManualAdd: (e: React.FormEvent) => void;
  isWatchlistExpanded: boolean;
  setIsWatchlistExpanded: (val: boolean) => void;
  removeFromWatchlist: (ticker: string) => void;
  setSelectedTicker: (ticker: string) => void;
  setStep: (step: 'instructions' | 'prompt' | 'results') => void;
}

const WatchlistHeader = ({
  watchlist,
  stockData,
  selectedTicker,
  manualTicker,
  setManualTicker,
  handleManualAdd,
  isWatchlistExpanded,
  setIsWatchlistExpanded,
  removeFromWatchlist,
  setSelectedTicker,
  setStep
}: WatchlistHeaderProps) => (
  <div className="relative z-[60] w-full px-4 sm:px-6 pt-2">
    <div className="max-w-7xl mx-auto space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
        {/* Section 1: Watchlist Toggle */}
        <div 
          className={cn(
            "h-14 trapper-keeper-gradient border-2 border-slate-900 sketch-shadow flex items-center px-4 cursor-pointer hover:brightness-110 transition-all relative overflow-hidden",
            isWatchlistExpanded && "ring-2 ring-slate-900 ring-offset-2"
          )}
          onClick={() => setIsWatchlistExpanded(!isWatchlistExpanded)}
        >
          {/* Spine Rings */}
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-black/20 flex flex-col justify-around py-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-white/40 mx-auto border border-black/10" />
            ))}
          </div>
          <div className="flex items-center gap-3 pl-6 w-full text-white">
            <SPRLogo size={16} className="rotate-0 shadow-none border-2 shrink-0" />
            <span className="font-heading text-xs font-bold uppercase tracking-widest flex-1">Watchlist</span>
            <div className="bg-white text-black font-marker text-[10px] px-2 py-0.5 rotate-[-5deg] shadow-sm">
              {watchlist.length}
            </div>
            {isWatchlistExpanded ? <ChevronUp size={12} className="text-white/60" /> : <ChevronDown size={12} className="text-white/60" />}
          </div>
        </div>

        {/* Section 2: Manual Ticker Input */}
        <div className="h-14 trapper-keeper-gradient border-2 border-slate-900 sketch-shadow flex items-center px-4 relative overflow-hidden">
          {/* Spine Rings (Right Side) */}
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-black/20 flex flex-col justify-around py-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-white/40 mx-auto border border-black/10" />
            ))}
          </div>
          <form onSubmit={handleManualAdd} className="flex items-center gap-2 w-full pr-6">
            <span className="font-heading text-[10px] font-bold text-white uppercase tracking-widest hidden md:block">Add Asset:</span>
            <div className="flex-1 flex items-center">
              <Input 
                placeholder="TICKER" 
                className="flex-1 h-8 bg-white/20 border-2 border-slate-900/30 rounded-none font-heading font-bold text-[9px] uppercase tracking-widest focus-visible:ring-0 focus-visible:border-slate-900 placeholder:text-white/40"
                value={manualTicker}
                onChange={(e) => setManualTicker(e.target.value)}
              />
              <Button size="icon" variant="secondary" type="submit" className="h-8 w-8 rounded-none bg-slate-900 text-white hover:bg-slate-800 shrink-0">
                <Plus size={12} />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Expanded Watchlist Content */}
      <AnimatePresence>
        {isWatchlistExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="paper-card bg-white border-2 border-slate-900 p-6 max-h-[60vh] sm:max-h-[400px] !overflow-y-auto notebook-scrollbar !overflow-x-hidden overscroll-contain touch-pan-y">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {watchlist.length === 0 ? (
                  <div className="col-span-full py-12 text-center">
                    <p className="font-hand text-lg text-slate-400 italic">Your conviction list is empty. Start adding tickers!</p>
                  </div>
                ) : (
                  watchlist.map((t) => {
                    const info = stockData[t];
                    const isActive = selectedTicker === t;
                    return (
                      <div 
                        key={t}
                        onClick={() => {
                          setSelectedTicker(t);
                          setStep('results');
                        }}
                        className={cn(
                          "flex flex-col justify-between p-4 cursor-pointer transition-all border-2 group relative h-32 paper-card",
                          isActive ? "bg-white text-black border-slate-900 scale-[1.02]" : "bg-white/90 border-slate-900/20 hover:border-slate-900"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="font-heading text-2xl font-bold tracking-tight leading-none">{t}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center gap-0.5" title="Research Grade: Weighted average of AI Conviction, Price Stability, and Risk.">
                              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Grade</span>
                              <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full border-2 font-heading text-xs font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] cursor-help transition-colors",
                                getGradeColor(info?.researchGrade || "")
                              )}>
                                {info?.researchGrade || "---"}
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromWatchlist(t);
                              }}
                              className="transition-opacity p-1 hover:bg-rose-100 text-rose-500 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col items-start">
                            <span className="font-heading text-lg font-bold">${info?.regularMarketPrice?.toFixed(2) || "---"}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className={cn(
                              "sticker text-white text-[8px] px-2 py-0.5",
                              isActive ? "bg-slate-900" : "bg-trapper-pink"
                            )}>
                              {isActive ? "VIEWING" : "ACTIVE"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [query, setQuery] = useState("");
  const [tickers, setTickers] = useState<string[]>([]);
  const [allSeenTickers, setAllSeenTickers] = useState<string[]>([]);
  const [discoveryPage, setDiscoveryPage] = useState(0);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [stockData, setStockData] = useState<Record<string, StockInfo>>({});
  const [historyData, setHistoryData] = useState<Record<string, HistoryData[]>>({});
  const [historyError, setHistoryError] = useState<Record<string, string | null>>({});
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
  
  // Zoom State
  const [zoomState, setZoomState] = useState({
    left: 'dataMin',
    right: 'dataMax',
    refAreaLeft: '',
    refAreaRight: '',
    top: 'auto' as any,
    bottom: 'auto' as any,
  });

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

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

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
    if (stockData[ticker]) return stockData[ticker];
    try {
      const res = await fetch(`/api/stock/${ticker}`);
      if (res.status === 404) {
        console.warn(`Ticker ${ticker} not found`);
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
    }
    return null;
  };

  const fetchHistory = async (ticker: string, days = 365) => {
    // If we have enough data (at least requested days or it's a lite fetch being upgraded)
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
        const current = prev[ticker] || {};
        const { grade } = calculateResearchGrade(current.sentiment, rsi, spiciness);
        return {
          ...prev,
          [ticker]: { ...current, rsi, spiciness, researchGrade: grade }
        };
      });
    } catch (e) {
      console.error(e);
      setHistoryError(prev => ({ ...prev, [ticker]: "Failed to connect to data engine" }));
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
    if (loading) return; // Prevent concurrent requests
    
    const activeQuery = customQuery || query;
    if (!activeQuery.trim()) return;
    setLoading(true);
    console.log("handleSearch: Starting research for", activeQuery);
    
    try {
      // 1. Get suggestions from AI, excluding already found tickers for context
      let results: string[] = [];
      const excluded = isLoadMore ? allSeenTickers : [];
      try {
        console.log("handleSearch: Calling getTickersFromAI");
        results = await getTickersFromAI(activeQuery, excluded);
        console.log("handleSearch: Got results", results);
      } catch (err: any) {
        console.error("Search failure:", err);
        alert(`Research Engine encountered an issue:\n\n${err.message || 'Please try a different query type.'}`);
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
      
      // 2. Fetch real-time prices for all suggestions to verify constraints
      const stockInfos: Record<string, StockInfo> = {};
      for (const t of results) {
        if (Object.keys(stockInfos).length >= 5) break; 
        console.log("handleSearch: Fetching stock info for", t);
        try {
          let attempts = 0;
          let success = false;
          
          while (attempts < 2 && !success) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 8000); // 8s timeout
            
            try {
              const res = await fetch(`/api/stock/${t}`, { signal: controller.signal });
              clearTimeout(id);
              if (res.ok) {
                const text = await res.text();
                if (text) {
                  const data = JSON.parse(text);
                  if (data && !data.error) {
                    stockInfos[t] = data;
                    success = true;
                    console.log("handleSearch: Got info for", t);
                  }
                }
              } else if (res.status === 429) {
                console.warn(`Rate limited for ${t}, waiting longer... (attempt ${attempts + 1})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
                attempts++;
              } else {
                break; // Other error, don't retry
              }
            } catch (err) {
              clearTimeout(id);
              throw err;
            }
          }
          
          // Consistent delay between symbols to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 600));
        } catch (err) {
          console.error(`Verification failed for ${t}:`, err);
        }
      }
      console.log("handleSearch: Finished fetching stock infos");
      
      // Update global stock data cache
      
      // Filter incomplete data
      const validStockInfos: Record<string, StockInfo> = {};
      for (const t of Object.keys(stockInfos)) {
        const info = stockInfos[t];
        // Loosened validation: focus on primary ticker info existence rather than strict business summary at discovery stage
        if (info.shortName && info.regularMarketPrice !== undefined) {
          validStockInfos[t] = info;
        } else {
          console.warn(`Dropping incomplete stock: ${t}`);
        }
      }
      
      setStockData(prev => ({ ...prev, ...validStockInfos }));
  
      if (Object.keys(validStockInfos).length === 0) {
        alert("AI found tickers, but we couldn't retrieve market data for them. Try a different query.");
        return;
      }
  
      // 3. Apply client-side price filtering if price constraint detected
      // Look for price-specific constraints like "under $50" or "below 20 dollars"
      const priceMatch = activeQuery.match(/(?:price\s*(?:under|below|less|is\s*[\<\$]))\s*(\d+)|\$\s*(\d+)/i);
      const limit = priceMatch ? parseFloat(priceMatch[1] || priceMatch[2]) : null;
      
      // We already have validStockInfos (keys are tickers that passed validation)
      let candidates = Object.keys(validStockInfos);
      
      if (limit !== null) {
        candidates = candidates.filter(t => {
          const price = validStockInfos[t]?.regularMarketPrice;
          return price !== undefined && price <= limit;
        });
      }
  
      // Now strictly take the first 5 candidates that passed everything
      const finalResults = candidates.slice(0, 5);
  
      if (isLoadMore) {
        // Transition smoothly by replacing the current 5 with the next 5
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTickers(finalResults);
        setAllSeenTickers(prev => [...prev, ...finalResults]);
        setDiscoveryPage(prev => prev + 1);
      } else {
        setTickers(finalResults);
        setAllSeenTickers(finalResults);
        setDiscoveryPage(0);
        if (finalResults.length > 0) {
          setSelectedTicker(finalResults[0]);
          setStep('results');
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
          alert(`Ticker ${t} not found or invalid. Please check the symbol and try again.`);
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
        if (data?.longBusinessSummary) fetchAnalysis(selectedTicker);
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

      // Batch analysis for tickers
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

  // Calculate trend for main chart if > 48h
  const trendLine = useMemo(() => {
    // If zoomed, filter to visible range
    let dataToTrend = currentHistory;
    if (zoomState.left !== 'dataMin' || zoomState.right !== 'dataMax') {
       dataToTrend = currentHistory.filter(d => d.date >= zoomState.left && d.date <= zoomState.right);
    }
    
    if (dataToTrend.length < 5) return null;
    const points = dataToTrend.map((h, i) => ({ x: i, y: h.close }));
    const { m, b } = calculateLinearRegression(points);
    return points.map((p, i) => ({ date: p.date, trend: m * i + b }));
  }, [currentHistory, zoomState.left, zoomState.right]);

  // Helper to format large numbers
  const formatCompactNumber = (number: number) => {
    if (!number) return "---";
    return Intl.NumberFormat('en-US', {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(number);
  };

  const handleZoom = () => {
    let { refAreaLeft, refAreaRight } = zoomState;

    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setZoomState(prev => ({ ...prev, refAreaLeft: '', refAreaRight: '' }));
      return;
    }

    // xAxis domain
    if (refAreaLeft > refAreaRight) [refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];

    // yAxis domain
    const visibleData = currentHistory.filter(d => d.date >= refAreaLeft && d.date <= refAreaRight);
    if (visibleData.length > 0) {
      const prices = visibleData.map(d => d.close);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const padding = (max - min) * 0.1;
      
      setZoomState({
        left: refAreaLeft,
        right: refAreaRight,
        refAreaLeft: '',
        refAreaRight: '',
        bottom: Math.max(0, min - padding),
        top: max + padding,
      });
    } else {
      setZoomState(prev => ({ ...prev, refAreaLeft: '', refAreaRight: '' }));
    }
  };

  const resetZoom = () => {
    setZoomState({
      left: 'dataMin',
      right: 'dataMax',
      refAreaLeft: '',
      refAreaRight: '',
      top: 'auto',
      bottom: 'auto',
    });
  };

  // Generate dynamic gradient for trend-based coloring (Green for UP, Red for DOWN)
  const trendGradientStops = useMemo(() => {
    if (!currentHistory || currentHistory.length < 2) return null;
    const stops = [];
    for (let i = 1; i < currentHistory.length; i++) {
      const isUp = currentHistory[i].close >= currentHistory[i-1].close;
      const color = isUp ? '#81c784' : '#e57373'; // Muted Green : Muted Red
      const prevOffset = ((i - 1) / (currentHistory.length - 1)) * 100;
      const offset = (i / (currentHistory.length - 1)) * 100;
      
      stops.push(<stop key={`${i}-start`} offset={`${prevOffset}%`} stopColor={color} />);
      stops.push(<stop key={`${i}-end`} offset={`${offset}%`} stopColor={color} />);
    }
    return stops;
  }, [currentHistory]);

  const fetchAnalysis = async (ticker: string, silent = false) => {
    // Concurrency protection: don't fetch if already in progress for this ticker
    if (fetchingAnalysisRef.current.has(ticker)) return;
    
    const stock = stockData[ticker];
    if (!stock || !stock.longBusinessSummary) return;
    if (stock.sentiment !== undefined && stock.conciseSummary) return;

    try {
      fetchingAnalysisRef.current.add(ticker);
      if (!silent) setLoadingAI(prev => ({ ...prev, [ticker]: true }));
      
      let summary = stock.conciseSummary;
      let catalyst = stock.newsCatalyst;

      if (!summary) {
        // Only use expensive search grounding for active research (silent = false)
        const aiResponse = await summarizeBusiness(stock.longBusinessSummary, !silent);
        summary = aiResponse.summary;
        catalyst = aiResponse.newsCatalyst;
      }

      // Sentiment also respects search grounding preference
      const sentiment = stock.sentiment === undefined ? await analyzeSentiment(summary || stock.longBusinessSummary, !silent) : stock.sentiment;
      
      setStockData(prev => {
        const current = prev[ticker] || {};
        const { grade } = calculateResearchGrade(sentiment, current.rsi, current.spiciness);
        return {
          ...prev,
          [ticker]: { ...current, conciseSummary: summary, newsCatalyst: catalyst, sentiment, researchGrade: grade }
        };
      });
    } catch (error) {
      console.error("Analysis error for", ticker, ":", error);
      if (!silent) alert("Analysis failed. Please try again.");
    } finally {
      fetchingAnalysisRef.current.delete(ticker);
      if (!silent) setLoadingAI(prev => ({ ...prev, [ticker]: false }));
    }
  };

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
                      src={user.photoURL || ""} 
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
            {["LONG-TERM STOCKS", "UNDER $5", "EMERGENT SECTOR", "TECH STOCKS", "COOL & FUN STOCKS", "MAKE ME RICH"].map((cat) => (
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
                  onClick={() => setStep('instructions')}
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
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setStep('instructions')}>
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
              onClick={() => setStep('prompt')}
            >
              <Search size={14} /> New Scan
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 overflow-x-hidden">
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
                          NASD
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-1 bg-margin-red" />
                      <p className="text-2xl font-sans font-medium text-slate-500 uppercase tracking-widest">{currentStock?.longName || currentStock?.shortName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button 
                      variant={watchlist.includes(selectedTicker) ? "secondary" : "outline"}
                      className="h-14 px-8 border-2 border-slate-900 font-heading font-bold uppercase text-xs tracking-widest gap-3 bg-white hover:bg-slate-50"
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
                    { label: "Market Value", value: `$${currentStock?.regularMarketPrice?.toFixed(2) || "---"}`, color: "bg-white" },
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
                      <DoodleField density={3} opacity={0.1} seed={808 + i} />
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

                {/* Visualizer */}
                <div className="paper-card bg-white p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-4 w-4 doodle-border bg-trapper-lime rotate-45" />
                      <h3 className="font-heading text-sm font-bold uppercase tracking-widest">Market Analytics / 1Y</h3>
                    </div>
                    <div className="flex items-center gap-6">
                      {zoomState.left !== 'dataMin' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={resetZoom}
                          className="h-8 border-2 border-slate-900 font-heading text-[10px] font-bold uppercase bg-white"
                        >
                          Reset Zoom
                        </Button>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="h-[2px] w-8 bg-slate-900" />
                        <span className="font-sans text-xs font-bold text-slate-500 uppercase tracking-wider">Close Price</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-[480px] w-full relative select-none">
                    {historyError[selectedTicker || ""] ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center doodle-border bg-slate-50 p-10 text-center">
                        <AlertCircle size={40} className="text-rose-500 mb-4" />
                        <h4 className="font-heading text-lg font-bold uppercase tracking-widest mb-2">Data Stream Interrupted</h4>
                        <p className="font-sans text-sm font-medium text-slate-500 uppercase tracking-wider">
                          {historyError[selectedTicker || ""]}
                        </p>
                      </div>
                    ) : loadingChart[selectedTicker || ""] ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-[2px] z-20">
                          <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Loader2 size={24} className="animate-spin text-slate-400" />
                              <span className="font-heading text-xs font-bold uppercase tracking-widest text-slate-400">Loading Full Analytics...</span>
                            </div>
                            <Skeleton className="h-[380px] w-full rounded-none" />
                          </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart 
                          data={currentHistory}
                          onMouseDown={e => e && setZoomState(prev => ({ ...prev, refAreaLeft: e.activeLabel || '' }))}
                          onMouseMove={e => e && zoomState.refAreaLeft && setZoomState(prev => ({ ...prev, refAreaRight: e.activeLabel || '' }))}
                          onMouseUp={handleZoom}
                          onMouseLeave={() => setZoomState(prev => ({ ...prev, refAreaLeft: '', refAreaRight: '' }))}
                        >
                          <defs>
                            <linearGradient id="trendGradient" x1="0" y1="0" x2="1" y2="0">
                              {trendGradientStops}
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            hide={true}
                            domain={[zoomState.left, zoomState.right]}
                            type="category"
                          />
                          <YAxis 
                            yAxisId="left"
                            orientation="right"
                            domain={[zoomState.bottom, zoomState.top]}
                            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="left"
                            hide={true}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="paper-card bg-white p-4 shadow-xl border-2 border-slate-900 min-w-[180px]">
                                    <p className="font-heading text-[10px] font-bold text-slate-400 uppercase mb-1">{payload[0].payload.displayDate}</p>
                                    <div className="space-y-3">
                                      <div>
                                        <p className="font-heading text-2xl font-bold text-slate-900">${payload[0].value?.toFixed(2)}</p>
                                        <p className="font-sans text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Close Price</p>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                        <div>
                                          <p className="font-heading text-xs font-bold text-slate-900">{formatCompactNumber(currentStock?.marketCap || 0)}</p>
                                          <p className="font-sans text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Mkt Cap</p>
                                        </div>
                                        <div>
                                          <p className="font-heading text-[10px] font-bold text-slate-900 truncate max-w-[80px]">{currentStock?.industry || currentStock?.sector || "N/A"}</p>
                                          <p className="font-sans text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Industry</p>
                                        </div>
                                      </div>

                                      {payload[1] && (
                                        <div className="pt-2 border-t border-slate-100">
                                          <p className="font-mono text-[9px] font-bold text-slate-500">VOL: {(payload[1].value as number).toLocaleString()}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="close" 
                            stroke="url(#trendGradient)" 
                            strokeWidth={3}
                            fillOpacity={0.05} 
                            fill="#000000" 
                            isAnimationActive={false}
                          />
                          {trendLine && currentHistory.length > 5 && (
                            <Line
                              yAxisId="left"
                              type="monotone"
                              data={trendLine}
                              dataKey="trend"
                              stroke="#ff0000"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              isAnimationActive={false}
                            />
                          )}
                          <Bar
                            yAxisId="right"
                            dataKey="volume"
                            fill="#e2e8f0"
                            opacity={0.5}
                            isAnimationActive={false}
                          />
                          {zoomState.refAreaLeft && zoomState.refAreaRight && (
                            <ReferenceArea 
                              yAxisId="left"
                              x1={zoomState.refAreaLeft} 
                              x2={zoomState.refAreaRight} 
                              {...({ fill: "#a5d8ff", fillOpacity: 0.3 } as any)}
                            />
                          )}
                          <Brush 
                            dataKey="date" 
                            height={40} 
                            stroke="#0f172a" 
                            fill="#ffffff"
                            strokeWidth={2}
                            tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            className="font-heading text-[9px] font-bold"
                            travellerWidth={12}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="paper-card p-8 bg-white border-2 border-slate-900 relative mt-4">
                    <div className="absolute top-0 right-0 p-1 flex items-center gap-2">
                      {currentStock?.spiciness !== undefined && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black text-[9px] font-bold text-white uppercase tracking-tighter shadow-[-2px_2px_0px_0px_rgba(255,255,255,0.3)]">
                          <Flame size={10} className={cn(currentStock.spiciness >= 7 ? "text-orange-400 fill-orange-400" : "text-slate-500")} />
                          {currentStock.spiciness >= 7 ? "High Spiciness" : "Low Spiciness"}
                        </div>
                      )}
                      <div className="bg-gradient-to-br from-trapper-lime via-emerald-400 to-teal-500 text-black text-[10px] font-bold px-3 py-1 uppercase tracking-widest shadow-[-2px_2px_0px_0px_rgba(0,0,0,1)]">AI INSIGHTS</div>
                    </div>
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <HandDrawnDoodle type="crown" size={28} className="pencil-doodle" />
                            <h3 className="font-heading text-lg font-bold uppercase tracking-widest">EXECUTIVE SUMMARY</h3>
                          </div>
                          {currentStock?.researchGrade ? (
                            <div className="flex items-center gap-2">
                              <span className="font-sans text-[10px] font-bold text-slate-400">GRADE</span>
                              <div className={cn(
                                "w-12 h-12 rounded-full border-2 flex items-center justify-center font-heading text-xl font-extrabold shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all",
                                getGradeColor(currentStock.researchGrade)
                              )}>
                                {currentStock.researchGrade}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-sans text-[10px] font-bold text-slate-400">SCORING</span>
                              <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-dashed animate-pulse flex items-center justify-center">
                                <Loader2 size={16} className="animate-spin text-slate-300" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between border-b-2 border-dashed border-slate-200 pb-4">
                          <div className="flex flex-col">
                            <span className="font-heading text-2xl font-bold text-slate-900">{selectedTicker}</span>
                            <span className="font-sans text-xs font-bold text-slate-400 uppercase tracking-widest">{currentStock?.shortName || currentStock?.longName}</span>
                          </div>
                          <div className="flex items-center gap-6">
                            {currentStock?.sentiment !== undefined && (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">SENTIMENT</span>
                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-900/10">
                                  <div 
                                    className={cn("h-full", currentStock.sentiment >= 7 ? "bg-emerald-500" : currentStock.sentiment <= 4 ? "bg-rose-500" : "bg-amber-500")}
                                    style={{ width: `${(currentStock.sentiment / 10) * 100}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold uppercase">{currentStock.sentiment >= 7 ? "Bullish" : currentStock.sentiment <= 4 ? "Bearish" : "Neutral"}</span>
                              </div>
                            )}
                            {currentStock?.spiciness !== undefined && (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">VOLATILITY</span>
                                <div className="flex items-center gap-1">
                                  <Flame size={14} className={cn(currentStock.spiciness >= 7 ? "text-orange-500 fill-orange-500" : "text-slate-300")} />
                                  <span className="text-[10px] font-bold uppercase">{currentStock.spiciness >= 7 ? "Spicy" : "Mellow"}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 border border-emerald-500/30 bg-emerald-50 text-[9px] font-bold text-emerald-600 uppercase tracking-tighter rounded ml-auto">
                          <Globe size={10} className={cn(loadingAI[selectedTicker || ""] ? "animate-spin" : "animate-pulse")} />
                          {loadingAI[selectedTicker || ""] ? "Deep Researching..." : "Live Data Verified"}
                        </div>
                      </div>

                      {loadingAI[selectedTicker || ""] ? (
                        <div className="space-y-4 pt-2">
                          <Skeleton className="h-4 w-full bg-slate-100" />
                          <Skeleton className="h-4 w-5/6 bg-slate-100" />
                          <Skeleton className="h-4 w-4/6 bg-slate-100" />
                          <div className="flex items-center gap-2 pt-2">
                             <Loader2 size={12} className="animate-spin text-emerald-500" />
                             <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Grounding with live search...</span>
                          </div>
                        </div>
                      ) : currentStock?.conciseSummary ? (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-4"
                        >
                          <p className="font-sans text-lg font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">
                            {currentStock.conciseSummary.replace(/\*\*News:\*\* .*/i, '').trim()}
                          </p>
                        </motion.div>
                      ) : (
                        <div className="flex flex-col items-center py-8">
                          <p className="font-hand text-lg text-slate-500 mb-4 italic">Ready to analyze {selectedTicker} details...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="paper-card p-8 bg-white border-2 border-slate-900 relative mt-4">
                    <div className="absolute top-0 right-0 bg-gradient-to-br from-trapper-pink via-rose-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest shadow-[-2px_2px_0px_0px_rgba(0,0,0,1)]">NEWS</div>
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <HandDrawnDoodle type="eyeX" size={28} className="pencil-doodle" />
                        <h3 className="font-heading text-lg font-bold uppercase tracking-widest">NEWS</h3>
                      </div>
                      <div className="space-y-4">
                        {loadingAI[selectedTicker || ""] ? (
                          <div className="p-4 bg-slate-50 border-2 border-slate-200 border-dashed rounded mb-6">
                            <Skeleton className="h-4 w-3/4 bg-slate-200 mb-2" />
                            <Skeleton className="h-4 w-1/2 bg-slate-200" />
                          </div>
                        ) : currentStock?.newsCatalyst ? (
                          <div className="p-4 bg-trapper-blue/10 border-2 border-trapper-blue shadow-[4px_4px_0_0_#bbdefb] mb-6">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-trapper-blue text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest">AI Research Catalyst</span>
                            </div>
                            <p className="font-sans text-sm font-bold text-slate-900 leading-tight italic">
                              "{currentStock.newsCatalyst}"
                            </p>
                          </div>
                        ) : null}
                        
                        {currentStock?.news && currentStock?.news.length > 0 ? (
                          currentStock.news.slice(0, 5).map((item: any, i: number) => (
                            <div key={i} className="border-b border-dashed border-slate-100 pb-3 last:border-0">
                              <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-sans text-sm font-bold text-slate-900 hover:text-trapper-blue transition-colors block mb-1">
                                {item.title}
                              </a>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{item.publisher}</span>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-[10px] font-medium text-slate-400 uppercase">{new Date(item.providerPublishTime * 1000).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="font-hand text-lg text-slate-400 italic py-4">Scanning news wires for {selectedTicker}...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="paper-card p-8 bg-white border-2 border-slate-900 relative mt-4">
                    <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest shadow-[-2px_2px_0px_0px_rgba(255,255,255,0.2)]">RESEARCH NOTES</div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <HandDrawnDoodle type="star" size={28} className="pencil-doodle" />
                          <h3 className="font-heading text-lg font-bold uppercase tracking-widest">Personal Thesis</h3>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 border-2 border-slate-900 font-heading text-[10px] font-bold uppercase tracking-widest"
                          onClick={saveNote}
                          disabled={isSavingNote}
                        >
                          {isSavingNote ? <Loader2 size={12} className="animate-spin" /> : "Save Note"}
                        </Button>
                      </div>
                      <textarea 
                        className="w-full h-40 bg-paper/50 border-2 border-dashed border-slate-300 p-4 font-hand text-lg focus:outline-none focus:border-slate-900 transition-colors resize-none break-words"
                        placeholder="Write your research findings here... (e.g. 'Strong support at $140, looking for breakout')"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                <SPRLogo size={80} className="rotate-3" />
                <div className="space-y-2">
                  <h3 className="font-heading text-3xl font-bold tracking-tight">No Asset Selected</h3>
                  <p className="font-sans text-lg text-slate-400 font-medium">Select an instrument from your watchlist to begin analysis.</p>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* AI Recommendations Finder */}
          {tickers.length > 0 && (
            <section className="space-y-8 pt-16 border-t-2 border-slate-900/10 overflow-x-hidden">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-trapper-pink" />
                  <h3 className="font-heading text-lg font-bold uppercase tracking-widest">Discovery Results</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={loading}
                  className="h-8 font-heading text-[10px] font-bold uppercase tracking-widest gap-2 hover:bg-slate-100" 
                  onClick={() => handleSearch(undefined, undefined, true)}
                >
                  <Plus size={12} className={cn(loading && "animate-pulse")} /> Next 5
                </Button>
              </div>
              <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-6 relative min-h-[400px] transition-opacity duration-500 max-w-5xl mx-auto",
                loading && tickers.length > 0 ? "opacity-50 pointer-events-none" : "opacity-100"
              )}>
                <AnimatePresence mode="popLayout">
                  {tickers.map((t, idx) => {
                    const info = stockData[t];
                    const isActive = selectedTicker === t;
                    const absoluteIndex = discoveryPage * 5 + idx + 1;
                    return (
                      <motion.div
                        key={t}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ 
                          duration: 0.4,
                          delay: idx * 0.05,
                          ease: "easeOut"
                        }}
                      >
                        <div 
                          className={cn(
                            "group cursor-pointer p-6 paper-card transition-all relative overflow-hidden h-full break-words",
                            isActive ? "bg-trapper-blue text-black" : "bg-white hover:bg-slate-50"
                          )}
                          onClick={() => setSelectedTicker(t)}
                        >
                          <div className="flex items-center justify-between relative z-10 w-full">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-8 h-8 flex items-center justify-center font-heading font-bold text-sm border-2 border-slate-900",
                                isActive ? "bg-white/20" : "bg-slate-100"
                              )}>
                                {absoluteIndex}
                              </div>
                              
                              {info?.researchGrade && (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">Grade</span>
                                  <div className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full border-2 font-heading text-xs font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-colors",
                                    getGradeColor(info.researchGrade)
                                  )}>
                                    {info.researchGrade}
                                  </div>
                                </div>
                              )}
                              
                              <div className="font-heading text-2xl font-bold tracking-tight leading-none">{t}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-heading text-lg font-bold">${info?.regularMarketPrice?.toFixed(2) || "---"}</div>
                            </div>
                          </div>
                      </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            </section>
          )}

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