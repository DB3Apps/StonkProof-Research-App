import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Area, 
  Line, 
  Bar, 
  ReferenceArea,
  Brush
} from 'recharts';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn, calculateLinearRegression } from "../../lib/utils";
import { StockInfo, HistoryData } from "../../types";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { DoodleField } from '../Doodles';

interface MarketAnalyticsProps {
  ticker: string;
  stock: StockInfo | null;
  history: HistoryData[];
  error: string | null;
  isLoading: boolean;
}

export const MarketAnalytics = React.memo(({ ticker, stock, history, error, isLoading }: MarketAnalyticsProps) => {
  const [zoomState, setZoomState] = useState({
    left: 'dataMin',
    right: 'dataMax',
    refAreaLeft: '',
    refAreaRight: '',
    top: 'auto' as any,
    bottom: 'auto' as any,
  });

  const resetZoom = useCallback(() => {
    setZoomState({
      left: 'dataMin',
      right: 'dataMax',
      refAreaLeft: '',
      refAreaRight: '',
      top: 'auto',
      bottom: 'auto',
    });
  }, []);

  const handleZoom = useCallback(() => {
    let { refAreaLeft, refAreaRight } = zoomState;

    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setZoomState(prev => ({ ...prev, refAreaLeft: '', refAreaRight: '' }));
      return;
    }

    if (refAreaLeft > refAreaRight) [refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];

    setZoomState(prev => ({
      ...prev,
      left: refAreaLeft,
      right: refAreaRight,
      refAreaLeft: '',
      refAreaRight: '',
      bottom: 'auto',
      top: 'auto',
    }));
  }, [zoomState]);

  const chartData = useMemo(() => {
    let dataToTrend = history;
    if (zoomState.left !== 'dataMin' || zoomState.right !== 'dataMax') {
       dataToTrend = history.filter(d => d.date >= zoomState.left && d.date <= zoomState.right);
    }
    
    if (dataToTrend.length < 5) return history;

    const points = dataToTrend.map((h, i) => ({ x: i, y: h.close }));
    const { m, b } = calculateLinearRegression(points);

    // Map trends only to points within dataToTrend range
    const trendMap = new Map();
    dataToTrend.forEach((p, i) => {
        trendMap.set(p.date, m * i + b);
    });

    return history.map(p => ({
        ...p,
        trend: trendMap.has(p.date) ? trendMap.get(p.date) : null
    }));
  }, [history, zoomState.left, zoomState.right]);

  const trendGradientStops = useMemo(() => {
    if (!history || history.length < 2) return null;
    const stops = [];
    for (let i = 1; i < history.length; i++) {
      const isUp = history[i].close >= history[i-1].close;
      const color = isUp ? '#81c784' : '#e57373';
      const prevOffset = ((i - 1) / (history.length - 1)) * 100;
      const offset = (i / (history.length - 1)) * 100;
      
      stops.push(<stop key={`${i}-start`} offset={`${prevOffset}%`} stopColor={color} />);
      stops.push(<stop key={`${i}-end`} offset={`${offset}%`} stopColor={color} />);
    }
    return stops;
  }, [history]);

  const formatCompactNumber = useCallback((number: number) => {
    if (!number) return "---";
    return Intl.NumberFormat('en-US', {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(number);
  }, []);

  if (error) {
    return (
      <div className="paper-card bg-white p-8 space-y-8">
        <div className="h-[480px] w-full relative flex flex-col items-center justify-center doodle-border bg-slate-50 p-10 text-center">
          <AlertCircle size={40} className="text-rose-500 mb-4" />
          <h4 className="font-heading text-lg font-bold uppercase tracking-widest mb-2">Data Stream Interrupted</h4>
          <p className="font-sans text-sm font-medium text-slate-500 uppercase tracking-wider">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-card bg-white p-8 space-y-8 relative overflow-hidden">
      <DoodleField density={4} opacity={0.05} seed={ticker.length} />
      <div className="flex items-center justify-between relative z-10">
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
      
      <div className="h-[480px] w-full relative select-none z-10">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-[2px] z-20">
              <div className="flex flex-col items-center gap-4 w-full px-4">
                <div className="flex items-center gap-2">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                  <span className="font-heading text-xs font-bold uppercase tracking-widest text-slate-400">Loading Full Analytics...</span>
                </div>
                <Skeleton className="h-[380px] w-full rounded-none bg-slate-100" />
              </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={chartData}
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
                domain={[
                  (dataMin: number) => zoomState.bottom === 'auto' ? Math.floor(dataMin * 0.95) : zoomState.bottom,
                  (dataMax: number) => zoomState.top === 'auto' ? Math.ceil(dataMax * 1.05) : zoomState.top
                ]}
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
                            <p className="font-heading text-2xl font-bold text-slate-900">${typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value}</p>
                            <p className="font-sans text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Close Price</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                            <div>
                              <p className="font-heading text-xs font-bold text-slate-900">{formatCompactNumber(stock?.marketCap || 0)}</p>
                              <p className="font-sans text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Mkt Cap</p>
                            </div>
                            <div>
                              <p className="font-heading text-[10px] font-bold text-slate-900 truncate max-w-[80px]">{stock?.industry || stock?.sector || "N/A"}</p>
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
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="trend"
                stroke="#ff0000"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />
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
  );
});
