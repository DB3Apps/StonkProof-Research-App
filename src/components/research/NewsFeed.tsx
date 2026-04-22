import React from 'react';
import { cn } from "../../lib/utils";
import { StockInfo } from "../../types";
import { Skeleton } from "../ui/skeleton";
import { HandDrawnDoodle } from '../Doodles';

interface NewsFeedProps {
  stock: StockInfo | null;
  isLoadingAI: boolean;
}

export const NewsFeed = React.memo(({ stock, isLoadingAI }: NewsFeedProps) => {
  if (!stock) return null;

  return (
    <div className="paper-card p-8 bg-white border-2 border-slate-900 relative mt-4 overflow-hidden">
      <div className="absolute top-0 right-0 bg-gradient-to-br from-trapper-pink via-rose-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest shadow-[-2px_2px_0px_0px_rgba(0,0,0,1)]">NEWS</div>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <HandDrawnDoodle type="eyeX" size={28} className="pencil-doodle" />
          <h3 className="font-heading text-lg font-bold uppercase tracking-widest">NEWS CATALYSTS</h3>
        </div>
        <div className="space-y-4">
          {isLoadingAI && !stock.newsCatalyst ? (
            <div className="p-4 bg-slate-50 border-2 border-slate-200 border-dashed rounded mb-6">
              <Skeleton className="h-4 w-3/4 bg-slate-200 mb-2" />
              <Skeleton className="h-4 w-1/2 bg-slate-200" />
            </div>
          ) : stock.newsCatalyst ? (
            <div className={cn(
              "p-4 border-2 shadow-[4px_4px_0_0_#bbdefb] mb-6 transition-colors",
              isLoadingAI ? "bg-slate-50 border-slate-400 opacity-70" : "bg-trapper-blue/10 border-trapper-blue"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest text-white",
                  isLoadingAI ? "bg-slate-400" : "bg-trapper-blue"
                )}>
                  {isLoadingAI ? "Research in Progress..." : "AI Research Catalyst"}
                </span>
              </div>
              <p className="font-sans text-sm font-bold text-slate-900 leading-tight italic">
                "{stock.newsCatalyst}"
              </p>
            </div>
          ) : null}
          
          {stock.news && stock.news.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {stock.news.slice(0, 8).map((item: any, i: number) => (
                <div key={i} className="border-b border-dashed border-slate-100 pb-3 last:border-0 group">
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="font-sans text-sm font-bold text-slate-900 group-hover:text-trapper-blue transition-colors block mb-1"
                  >
                    {item.title}
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.publisher}</span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">
                      {item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toLocaleDateString() : 'RECENT'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-hand text-lg text-slate-400 italic py-4">Scanning news wires for {stock.symbol}...</p>
          )}
        </div>
      </div>
    </div>
  );
});
