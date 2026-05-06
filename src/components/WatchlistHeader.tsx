import * as React from "react";
import { Star, ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { StockInfo, AppStep } from "../types";

interface WatchlistHeaderProps {
  watchlist: string[];
  stockData: Record<string, StockInfo>;
  stockErrors: Record<string, string | null>;
  selectedTicker: string | null;
  manualTicker: string;
  setManualTicker: (val: string) => void;
  handleManualAdd: (e: React.FormEvent) => void;
  isWatchlistExpanded: boolean;
  setIsWatchlistExpanded: (val: boolean) => void;
  removeFromWatchlist: (ticker: string) => void;
  setSelectedTicker: (ticker: string) => void;
  setStep: (step: AppStep) => void;
}

export const WatchlistHeader = ({
  watchlist,
  stockData,
  stockErrors,
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
        <div 
          className={cn(
            "h-14 trapper-keeper-gradient border-2 border-slate-900 sketch-shadow flex items-center px-4 cursor-pointer hover:brightness-110 transition-all relative overflow-hidden",
            isWatchlistExpanded && "ring-2 ring-slate-900 ring-offset-2"
          )}
          onClick={() => setIsWatchlistExpanded(!isWatchlistExpanded)}
        >
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-black/20 flex flex-col justify-around py-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-white/40 mx-auto border border-black/10" />
            ))}
          </div>
          <div className="flex items-center gap-3 pl-6 w-full">
            <Star size={14} className={cn("transition-colors", isWatchlistExpanded ? "text-white" : "text-white/60")} />
            <span className="font-heading text-xs font-bold text-white uppercase tracking-widest flex-1">Watchlist</span>
            <div className="bg-white text-black font-marker text-[10px] px-2 py-0.5 rotate-[-5deg] shadow-sm">
              {watchlist.length}
            </div>
            {isWatchlistExpanded ? <ChevronUp size={12} className="text-white/60" /> : <ChevronDown size={12} className="text-white/60" />}
          </div>
        </div>

        <div className="h-14 trapper-keeper-gradient border-2 border-slate-900 sketch-shadow flex items-center px-4 relative overflow-hidden">
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
                            <span className={cn("font-sans text-[10px] font-bold mt-1 uppercase tracking-wider", isActive ? "text-slate-600" : "text-slate-400")}>
                              {info?.shortName || "Syncing..."}
                            </span>
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
                        <div className="flex justify-between items-end">
                          <span className="font-heading text-lg font-bold">${info?.regularMarketPrice?.toFixed(2) || "---"}</span>
                          <div className="sticker bg-trapper-pink text-white text-[8px] px-2 py-0.5">ACTIVE</div>
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
