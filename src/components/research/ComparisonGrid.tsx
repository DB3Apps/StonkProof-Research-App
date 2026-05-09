import React from 'react';
import { motion } from "motion/react";
import { X, ArrowRight, BarChart3, TrendingUp, Zap, Info } from 'lucide-react';
import { cn, getGradeColor } from "../../lib/utils";
import { StockInfo } from "../../types";
import { Button } from "../ui/button";

interface ComparisonGridProps {
  comparisonList: string[];
  stockData: Record<string, StockInfo>;
  onRemove: (ticker: string) => void;
  onClose: () => void;
  onSelect: (ticker: string) => void;
}

export const ComparisonGrid = ({
  comparisonList,
  stockData,
  onRemove,
  onClose,
  onSelect
}: ComparisonGridProps) => {
  if (comparisonList.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-900/90 backdrop-blur-sm"
    >
      <div className="bg-white w-full max-w-6xl h-[95vh] sm:h-[90vh] border-4 border-slate-900 flex flex-col shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:shadow-[16px_16px_0_0_rgba(0,0,0,1)] relative overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-4 sm:p-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 bg-trapper-pink hidden sm:block">
              <ArrowRight size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-heading text-lg sm:text-2xl font-black uppercase tracking-tighter leading-tight">Asset Matrix</h2>
              <p className="text-slate-400 font-mono text-[10px] sm:text-xs tracking-tight">Head-to-head analysis ({comparisonList.length})</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="hover:bg-white/10 p-2 transition-colors rounded-full"
            aria-label="Close Comparison"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-[#f8fafc] custom-scrollbar relative">
          <table className="w-full text-left border-collapse min-w-[max-content]">
            <tbody>
              {/* Tickers / Actions Row */}
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="p-3 sm:p-4 font-heading text-[10px] sm:text-xs font-bold uppercase text-slate-500 sticky left-0 bg-slate-100 z-20 border-r border-slate-300 w-24 sm:w-40 align-middle">
                  Asset
                </th>
                {comparisonList.map(t => (
                  <td key={t} className="p-3 sm:p-4 min-w-[140px] sm:min-w-[200px] border-r border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="font-heading font-black text-slate-900 text-lg sm:text-xl">{t}</span>
                      <button 
                        onClick={() => onRemove(t)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Long Name */}
              <tr className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200 group-hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-slate-400 shrink-0" />
                    <span className="hidden sm:inline">Long Name</span>
                    <span className="sm:hidden">Name</span>
                  </div>
                </th>
                {comparisonList.map(t => (
                  <td key={t} className="p-3 sm:p-4 text-xs sm:text-sm font-medium border-r border-slate-100">
                    {stockData[t]?.longName || stockData[t]?.shortName || t}
                  </td>
                ))}
              </tr>

              {/* Grade */}
              <tr className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200 group-hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-slate-400 shrink-0" />
                    <span>Grade</span>
                  </div>
                </th>
                {comparisonList.map(t => (
                  <td key={t} className="p-3 sm:p-4 border-r border-slate-100">
                    <div className={cn(
                      "inline-flex px-2 py-1 sm:px-3 text-[10px] sm:text-xs rounded font-heading font-bold shadow-sm",
                      getGradeColor(stockData[t]?.researchGrade || "---")
                    )}>
                      {stockData[t]?.researchGrade || "---"}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Price */}
              <tr className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200 group-hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-slate-400 shrink-0" />
                    <span>Price</span>
                  </div>
                </th>
                {comparisonList.map(t => (
                  <td key={t} className="p-3 sm:p-4 text-sm sm:text-base font-mono font-bold border-r border-slate-100">
                    ${(stockData[t]?.regularMarketPrice || stockData[t]?.currentPrice || 0).toFixed(2)}
                  </td>
                ))}
              </tr>

              {/* Change */}
              <tr className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200 group-hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-slate-400 shrink-0" />
                    <span>24H Delta</span>
                  </div>
                </th>
                {comparisonList.map(t => {
                  const change = stockData[t]?.regularMarketChangePercent || 0;
                  return (
                    <td key={t} className={cn(
                      "p-3 sm:p-4 text-sm sm:text-base font-mono font-bold border-r border-slate-100",
                      change >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                    </td>
                  );
                })}
              </tr>

              {/* Sentiment */}
              <tr className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200 group-hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-slate-400 shrink-0" />
                    <span>Sentiment</span>
                  </div>
                </th>
                {comparisonList.map(t => {
                  const sentiment = stockData[t]?.sentiment || 5;
                  return (
                    <td key={t} className="p-3 sm:p-4 border-r border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <div className="w-full sm:flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                          <div 
                            className={cn("h-full", sentiment >= 7 ? "bg-emerald-500" : sentiment <= 4 ? "bg-rose-500" : "bg-amber-500")}
                            style={{ width: `${(sentiment / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500">{sentiment}/10</span>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* RSI */}
              <tr className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200 group-hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">RSI (14D)</span>
                    <span className="sm:hidden">RSI</span>
                  </div>
                </th>
                {comparisonList.map(t => (
                  <td key={t} className="p-3 sm:p-4 text-xs sm:text-sm font-mono border-r border-slate-100">
                    {stockData[t]?.rsi?.toFixed(2) || "---"}
                  </td>
                ))}
              </tr>

              {/* Market Cap */}
              <tr className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200 group-hover:bg-slate-50">
                  Market Cap
                </th>
                {comparisonList.map(t => (
                  <td key={t} className="p-3 sm:p-4 text-xs sm:text-sm border-r border-slate-100 text-slate-700">
                    {stockData[t]?.marketCap ? `$${(stockData[t]!.marketCap! / 1e9).toFixed(2)}B` : "---"}
                  </td>
                ))}
              </tr>
              
              {/* Actions */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200 group-hover:bg-slate-50">
                  Action
                </th>
                {comparisonList.map(t => (
                  <td key={t} className="p-3 sm:p-4 border-r border-slate-100">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full sm:w-auto font-heading text-[10px] sm:text-xs font-bold uppercase border-slate-900 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all py-1 h-8 sm:h-9"
                      onClick={() => {
                        onSelect(t);
                        onClose();
                      }}
                    >
                      View Details
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t-2 border-slate-900 bg-white flex justify-end shrink-0">
          <Button 
            className="w-full sm:w-auto bg-slate-900 text-white font-heading font-black uppercase tracking-widest h-12 sm:h-14 px-8 sm:px-10 shadow-[4px_4px_0_0_#9be34b] text-xs sm:text-sm"
            onClick={onClose}
          >
            Close Matrix
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

