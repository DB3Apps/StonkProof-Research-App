import React from "react";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Activity, Zap, Compass } from "lucide-react";
import { StockInfo } from "../../types";

interface MarketOverviewProps {
  indices: string[];
  stockData: Record<string, StockInfo>;
  onSelect: (ticker: string) => void;
}

export function MarketOverview({ indices, stockData, onSelect }: MarketOverviewProps) {
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <Compass size={18} className="text-slate-900" />
        <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-slate-900">Market Pulse / Live Indices</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {indices.map((ticker) => {
          const stock = stockData[ticker];
          const price = stock?.regularMarketPrice || stock?.currentPrice;
          const change = stock?.regularMarketChangePercent || 0;
          const isUp = change >= 0;

          return (
            <motion.div
              key={ticker}
              whileHover={{ scale: 1.02, rotate: -1 }}
              onClick={() => onSelect(ticker)}
              className="p-4 paper-card bg-white cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-8 h-8 opacity-5">
                 <Zap className={isUp ? "text-emerald-500" : "text-rose-500"} />
              </div>
              
              <div className="flex flex-col h-full justify-between">
                <div>
                  <p className="font-heading text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ticker}</p>
                  <p className="font-heading text-lg font-black text-slate-900">
                    {price ? `$${price.toFixed(2)}` : "---"}
                  </p>
                </div>
                
                <div className={`mt-2 flex items-center gap-1 font-heading text-[10px] font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                   {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                   {change ? `${change.toFixed(2)}%` : "0.00%"}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="pt-4 flex items-center justify-between border-t-2 border-slate-900/10">
         <div className="flex items-center gap-2">
            <Activity size={14} className="text-trapper-blue" />
            <span className="font-hand text-xs font-bold text-slate-500 italic">"The market is moving, ready to dive in?"</span>
         </div>
         <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-heading text-[8px] font-bold uppercase tracking-widest text-slate-400">DATA FEED: LIVE</span>
         </div>
      </div>
    </div>
  );
}
