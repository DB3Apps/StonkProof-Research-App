import React from 'react';
import { motion } from "motion/react";
import { Loader2, Flame, Globe, Crown } from 'lucide-react';
import { cn, getGradeColor } from "../../lib/utils";
import { StockInfo } from "../../types";
import { Skeleton } from "../ui/skeleton";
import { HandDrawnDoodle } from '../Doodles';

interface AIInsightsProps {
  ticker: string;
  stock: StockInfo | null;
  isLoadingAI: boolean;
}

export const AIInsights = React.memo(({ ticker, stock, isLoadingAI }: AIInsightsProps) => {
  if (!stock) return null;

  return (
    <div className="paper-card p-8 bg-white border-2 border-slate-900 relative mt-4 overflow-hidden">
      <div className="absolute top-0 right-0 p-1 flex items-center gap-2">
        {stock.spiciness !== undefined && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black text-[9px] font-bold text-white uppercase tracking-tighter shadow-[-2px_2px_0px_0px_rgba(255,255,255,0.3)]">
            <Flame size={10} className={cn(stock.spiciness >= 7 ? "text-orange-400 fill-orange-400" : "text-slate-500")} />
            {stock.spiciness >= 7 ? "High Spiciness" : "Low Spiciness"}
          </div>
        )}
        <div className="bg-gradient-to-br from-trapper-lime via-emerald-400 to-teal-500 text-black text-[10px] font-bold px-3 py-1 uppercase tracking-widest shadow-[-2px_2px_0px_0px_rgba(0,0,0,1)]">AI INSIGHTS</div>
      </div>
      
      <div className="space-y-6 relative z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HandDrawnDoodle type="crown" size={28} className="pencil-doodle" />
              <h3 className="font-heading text-lg font-bold uppercase tracking-widest pointer-events-none">EXECUTIVE SUMMARY</h3>
            </div>
            {stock.researchGrade ? (
              <div className="flex items-center gap-2">
                <span className="font-sans text-[10px] font-bold text-slate-400">GRADE</span>
                <div className={cn(
                  "w-12 h-12 rounded-full border-2 flex items-center justify-center font-heading text-xl font-extrabold shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all",
                  getGradeColor(stock.researchGrade)
                )}>
                  {stock.researchGrade}
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
              <span className="font-heading text-2xl font-bold text-slate-900">{ticker}</span>
              <span className="font-sans text-xs font-bold text-slate-400 uppercase tracking-widest">{stock.shortName || stock.longName}</span>
            </div>
            <div className="flex items-center gap-6">
              {stock.sentiment !== undefined && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">SENTIMENT</span>
                  <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-900/10">
                    <div 
                      className={cn("h-full", stock.sentiment >= 7 ? "bg-emerald-500" : stock.sentiment <= 4 ? "bg-rose-500" : "bg-amber-500")}
                      style={{ width: `${(stock.sentiment / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase">{stock.sentiment >= 7 ? "Bullish" : stock.sentiment <= 4 ? "Bearish" : "Neutral"}</span>
                </div>
              )}
              {stock.spiciness !== undefined && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">VOLATILITY</span>
                  <div className="flex items-center gap-1">
                    <Flame size={14} className={cn(stock.spiciness >= 7 ? "text-orange-500 fill-orange-500" : "text-slate-300")} />
                    <span className="text-[10px] font-bold uppercase">{stock.spiciness >= 7 ? "Spicy" : "Mellow"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2 py-0.5 border border-emerald-500/30 bg-emerald-50 text-[9px] font-bold text-emerald-600 uppercase tracking-tighter rounded ml-auto">
            <Globe size={10} className={cn(isLoadingAI ? "animate-spin" : "animate-pulse")} />
            {isLoadingAI ? "Deep Researching..." : "Live Data Verified"}
          </div>
        </div>

        {isLoadingAI && !stock.conciseSummary ? (
          <div className="space-y-4 pt-2">
            <Skeleton className="h-4 w-full bg-slate-100" />
            <Skeleton className="h-4 w-5/6 bg-slate-100" />
            <Skeleton className="h-4 w-4/6 bg-slate-100" />
            <div className="flex items-center gap-2 pt-2">
               <Loader2 size={12} className="animate-spin text-emerald-500" />
               <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Grounding with live search...</span>
            </div>
          </div>
        ) : stock.conciseSummary ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <p className="font-sans text-lg font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">
              {stock.conciseSummary}
            </p>
            {isLoadingAI && (
               <div className="flex items-center gap-2 pt-2">
                 <Loader2 size={12} className="animate-spin text-emerald-500" />
                 <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest italic opacity-60">Receiving live updates...</span>
               </div>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center py-8">
            <p className="font-hand text-lg text-slate-500 mb-4 italic">Ready to analyze {ticker} details...</p>
          </div>
        )}
      </div>
    </div>
  );
});
