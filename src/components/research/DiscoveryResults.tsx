import React from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Plus, ArrowUpDown, Scale } from 'lucide-react';
import { cn, getGradeColor } from "../../lib/utils";
import { StockInfo } from "../../types";
import { Button } from "../ui/button";

interface DiscoveryResultsProps {
  tickers: string[];
  displayedTickers: string[];
  stockData: Record<string, StockInfo>;
  failedTickers: Set<string>;
  stockErrors: Record<string, string | null>;
  selectedTicker: string | null;
  setSelectedTicker: (t: string) => void;
  loading: boolean;
  handleSearch: (e?: any, customQuery?: string, isLoadMore?: boolean) => void;
  discoveryPage: number;
  comparisonList: string[];
  onToggleComparison: (t: string) => void;
  onOpenComparison: () => void;
}

export const DiscoveryResults = React.memo(({
  tickers,
  displayedTickers,
  stockData,
  failedTickers,
  stockErrors,
  selectedTicker,
  setSelectedTicker,
  loading,
  handleSearch,
  discoveryPage,
  comparisonList,
  onToggleComparison,
  onOpenComparison
}: DiscoveryResultsProps) => {

  return (
    <section className="space-y-8 pt-16 border-t-2 border-slate-900/10 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 flex-shrink-0 rounded-full bg-trapper-pink" />
          <h3 className="font-heading text-base sm:text-lg font-bold uppercase tracking-widest truncate">Discovery Results</h3>
        </div>
        <div className="flex items-center gap-2 bg-white border-2 border-slate-900 p-1 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] self-start sm:self-auto w-full sm:w-auto overflow-x-auto">
          {comparisonList.length > 0 && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-8 font-heading text-[10px] font-bold uppercase tracking-widest gap-2 bg-[#9be34b] text-slate-900 border-r-2 border-slate-900 rounded-none whitespace-nowrap" 
              onClick={onOpenComparison}
            >
              <Scale size={12} /> Compare ({comparisonList.length})
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={loading}
            className="h-8 font-heading text-[10px] font-bold uppercase tracking-widest gap-1 sm:gap-2 hover:bg-slate-100 rounded-none flex-1 sm:flex-none whitespace-nowrap" 
            onClick={() => handleSearch(undefined, undefined, true)}
          >
            <Plus size={12} className={cn(loading && "animate-pulse")} /> Load More
          </Button>
        </div>
      </div>
      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-6 relative min-h-[200px] transition-opacity duration-500 max-w-5xl mx-auto px-4",
        loading && tickers.length > 0 ? "opacity-50 pointer-events-none" : "opacity-100"
      )}>
        <AnimatePresence mode="popLayout">
          {displayedTickers.map((t, idx) => {
            const info = stockData[t];
            const isActive = selectedTicker === t;
            const isComparing = comparisonList.includes(t);
            
            // Render card skeleton if data not ready
            const isDataReady = info?.shortName || info?.regularMarketPrice || info?.currentPrice;
            const hasFailed = failedTickers.has(t);
            
            if (hasFailed) {
              return (
                <motion.div key={t} layout className="h-32 w-full paper-card bg-red-50/50 border-2 border-red-200 p-4 shrink-0 flex flex-col justify-center opacity-70 filter grayscale">
                  <div className="font-mono text-xs text-red-400 mb-2">{t}</div>
                  <div className="text-red-600 font-bold font-heading">{stockErrors[t] || "Data unavailable"}</div>
                  <div className="text-[10px] text-red-400 mt-1">This symbol could not be fetched</div>
                </motion.div>
              );
            }

            if (!isDataReady) {
              return (
                <motion.div key={t} layout className="h-32 w-full paper-card bg-white animate-pulse border-2 border-slate-200 p-4">
                  <div className="font-mono text-xs text-slate-400 mb-2">{t}</div>
                  <div className="h-4 w-1/3 bg-slate-200 mb-4" />
                  <div className="h-2 w-1/2 bg-slate-100 mb-2" />
                  <div className="h-2 w-1/4 bg-slate-100" />
                </motion.div>
              );
            }

            return (
              <motion.div
                key={t}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ 
                  duration: 0.3,
                  delay: idx * 0.05,
                  ease: "easeOut"
                }}
              >
                <div 
                  className={cn(
                    "group cursor-pointer p-6 paper-card transition-all relative overflow-hidden h-full flex flex-col",
                    isActive ? "bg-slate-900 border-slate-900 text-white shadow-[8px_8px_0_0_#9be34b]" : "bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-900 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]"
                  )}
                  onClick={() => setSelectedTicker(t)}
                >
                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleComparison(t);
                      }}
                      className={cn(
                        "p-2 rounded-full border-2 border-slate-900 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all",
                        isComparing ? "bg-[#9be34b]" : "bg-white text-slate-900"
                      )}
                      title={isComparing ? "Remove from comparison" : "Add to comparison"}
                    >
                      <Scale size={14} className={cn(isComparing && "text-slate-900")} />
                    </button>
                  </div>

                  <div className="flex items-start justify-between relative z-10 w-full mb-4 gap-2">
                    <div className="text-xl font-heading font-extrabold tracking-tighter leading-none line-clamp-2 pr-2">{info?.shortName || info?.symbol}</div>
                    
                    <div className="flex gap-2 items-center flex-shrink-0">
                      {(info?.currentPrice || info?.regularMarketPrice) && (
                        <div className="flex flex-col items-end">
                          <div className="text-sm font-mono font-bold bg-slate-100/50 px-2 py-1 rounded">
                            {info.currency === 'USD' ? '$' : (info.currency || '')}
                            {(info?.currentPrice || info?.regularMarketPrice || 0).toFixed(2)}
                          </div>
                          {(info?.regularMarketChangePercent !== undefined) && (
                             <div className={cn(
                               "text-[8px] font-black font-heading mt-1 flex items-center pr-1",
                               info.regularMarketChangePercent >= 0 ? "text-emerald-500" : "text-rose-500"
                             )}>
                               {info.regularMarketChangePercent >= 0 ? "+" : ""}{info.regularMarketChangePercent.toFixed(2)}%
                             </div>
                          )}
                        </div>
                      )}
                      {info?.researchGrade && (
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full border-2 font-heading text-xs font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)]",
                          getGradeColor(info.researchGrade)
                        )}>
                          {info.researchGrade}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] font-sans font-medium text-slate-500 mb-4 line-clamp-2 italic">{info?.conciseSummary || info?.longBusinessSummary || 'No description available'}</div>

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-dashed border-slate-200/20">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold uppercase text-slate-400">Sentiment</span>
                      <span className="text-[7px] font-bold uppercase text-slate-300">RSI: {info?.rsi ? info.rsi.toFixed(1) : '---'}</span>
                    </div>
                    <div className="h-1.5 w-16 rounded-full overflow-hidden bg-slate-100">
                      <div 
                        className={cn("h-full", (info?.sentiment || 5) >= 7 ? "bg-emerald-500" : (info?.sentiment || 5) <= 4 ? "bg-rose-500" : "bg-amber-500")} 
                        style={{ width: `${((info?.sentiment || 5) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
});
