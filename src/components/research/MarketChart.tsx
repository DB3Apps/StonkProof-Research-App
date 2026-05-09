import React from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { HistoryData } from "../../types";
import { motion } from "motion/react";
import { Loader2, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface MarketChartProps {
  data: HistoryData[];
  loading: boolean;
  error: string | null;
  ticker: string;
}

export function MarketChart({ data, loading, error, ticker }: MarketChartProps) {
  if (loading) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-white border-4 border-slate-900 rounded-lg shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-slate-900" size={32} />
          <span className="font-heading text-xs font-bold uppercase tracking-widest text-slate-900">Fetching Tape...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-white border-4 border-red-900 rounded-lg shadow-[8px_8px_0px_0px_rgba(153,27,27,1)]">
        <span className="font-heading text-xs font-bold uppercase tracking-widest text-red-900 px-4 text-center">{error}</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-white border-4 border-slate-900 rounded-lg shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
        <span className="font-heading text-xs font-bold uppercase tracking-widest text-slate-400">No chart data available</span>
      </div>
    );
  }

  // Format data for Recharts
  const formattedData = data.map(d => ({
    ...d,
    price: d.close || 0,
    displayDate: d.date ? new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
  })).filter(d => d.price > 0);

  const firstPrice = formattedData[0]?.price || 0;
  const lastPrice = formattedData[formattedData.length - 1]?.price || 0;
  const isUp = lastPrice >= firstPrice;
  const changePercent = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-1"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-900" />
          <span className="font-heading text-xs font-bold uppercase tracking-widest text-slate-900">30D PERFORMANCE</span>
        </div>
        <div className={`flex items-center gap-1 font-heading text-[10px] font-black px-2 py-0.5 border-2 border-slate-900 ${isUp ? 'bg-emerald-400' : 'bg-red-400'}`}>
          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {changePercent.toFixed(2)}%
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="displayDate" 
              hide={false} 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b', fontFamily: 'var(--font-heading)' }}
              minTickGap={20}
            />
            <YAxis 
              hide={true} 
              domain={['auto', 'auto']}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '4px solid #0f172a',
                borderRadius: '0px',
                boxShadow: '4px 4px 0px 0px #0f172a',
                fontFamily: 'var(--font-heading)',
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase'
              }}
              labelStyle={{ color: '#0f172a', marginBottom: '4px' }}
            />
            <Area 
              type="stepAfter" 
              dataKey="price" 
              stroke={isUp ? "#10b981" : "#ef4444"} 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
