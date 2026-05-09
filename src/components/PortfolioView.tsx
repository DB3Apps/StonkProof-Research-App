import React, { useMemo } from 'react';
import { Button } from './ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { StockInfo, HistoryData } from '../types';

interface PortfolioViewProps {
  watchlist: string[];
  stockData: Record<string, StockInfo>;
  historyData: Record<string, HistoryData[]>;
  userJoinedAt?: Date | null;
  onBack: () => void;
}

export const PortfolioView = ({ watchlist, stockData, historyData, userJoinedAt, onBack }: PortfolioViewProps) => {
  const { chartData, topGainers, bottomLosers, topSectors } = useMemo(() => {
    const dateMap = new Map<string, { date: string; displayDate: string; total: number; count: number }>();
    
    // Default to a 1 year cutoff just in case, but rely primarily on the data length which is 1 year.
    const cutoffDate = userJoinedAt || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    watchlist.forEach(ticker => {
      const hist = historyData[ticker];
      if (hist && hist.length > 0) {
        hist.forEach(point => {
          const pointDate = new Date(point.date);
          // Filter to start timeframe when user downloaded the app/signed in.
          if (pointDate >= cutoffDate) {
            const key = point.displayDate;
            if (!dateMap.has(key)) {
              dateMap.set(key, { date: point.date, displayDate: point.displayDate, total: 0, count: 0 });
            }
            const existing = dateMap.get(key)!;
            existing.total += point.close;
            existing.count += 1;
          }
        });
      }
    });

    let chartData = Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((entry, index) => ({
        name: entry.displayDate,
        value: parseFloat((entry.total / entry.count).toFixed(2)),
        idx: index
      }));
      
    if (chartData.length === 0) {
      chartData = [
        { name: 'Mon', value: 0, idx: 0 },
        { name: 'Tue', value: 0, idx: 1 },
      ];
    } else if (chartData.length === 1) {
      chartData = [
        { ...chartData[0], name: chartData[0].name + ' (Open)' },
        { ...chartData[0], name: chartData[0].name + ' (Close)' }
      ]
    }

    const performance = watchlist.map(ticker => {
      const stock = stockData[ticker];
      return {
        ticker,
        change: stock?.regularMarketChangePercent || 0,
        sector: stock?.sector || 'Unknown'
      };
    });

    performance.sort((a, b) => b.change - a.change);
    const topGainers = performance.filter(p => p.change > 0).slice(0, 2);
    const bottomLosers = performance.filter(p => p.change <= 0).reverse().slice(0, 2);

    const sectors = performance.reduce((acc, p) => {
      if (p.sector && p.sector !== 'Unknown') {
        acc[p.sector] = (acc[p.sector] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    let topSectorsKeys = Object.entries(sectors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(entry => entry[0]);

    if (topSectorsKeys.length === 0) topSectorsKeys = ["various sectors"];

    return { chartData, topGainers, bottomLosers, topSectors: topSectorsKeys };
  }, [watchlist, stockData, historyData]);

  return (
    <div className="p-8 space-y-6">
      <Button onClick={onBack} variant="outline" className="mb-4">← Back to Results</Button>
      <h1 className="text-4xl font-bold font-heading">Portfolio Performance</h1>
      
      <div className="h-[400px] sm:h-[500px] w-full bg-slate-50 border border-slate-200 p-2 sm:p-4 shrink-0 pb-10 overflow-hidden">
        <h3 className="font-heading font-bold mb-4 px-2">Your Total Growth</h3>
        <div className="w-full h-[300px] sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                label={{ 
                  value: 'Time', 
                  position: 'insideBottom', 
                  offset: -15, 
                  style: { fontSize: '10px', fill: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' } 
                }} 
                minTickGap={30}
              />
              <YAxis 
                tickFormatter={(val) => `$${val}`} 
                width={55} 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                domain={['auto', 'auto']}
                label={{ 
                  value: 'Unit of Measure', 
                  angle: -90, 
                  position: 'insideLeft', 
                  offset: -5,
                  style: { fontSize: '10px', fill: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' } 
                }} 
              />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#9be34b" strokeWidth={3} fill="#9be34b" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-green-50 border-2 border-green-200">
          <h2 className="text-xl font-bold text-green-900 font-heading">How You're Doing</h2>
          <p className="text-sm text-green-700 mt-2">
            {watchlist.length === 0 ? "You haven't added any stocks to your watchlist yet." : (
              <>
                {topGainers.length > 0 && (
                  <>You're seeing some great growth thanks to <span className="font-bold">{topGainers.map(g => g.ticker).join(' and ')}</span>. </>
                )}
                {bottomLosers.length > 0 && (
                  <>On the other hand, stocks like <span className="font-bold">{bottomLosers.map(l => l.ticker).join(' and ')}</span> are holding things back a bit. </>
                 )}
                 {topGainers.length === 0 && bottomLosers.length === 0 && "We don't have enough performance data yet. "}
                 It's completely normal to have some ups and downs!
              </>
            )}
          </p>
        </div>
        <div className="p-6 bg-slate-50 border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a]">
          <h2 className="text-xl font-bold text-slate-900 font-heading">Where Your Money Is</h2>
          <p className="text-sm text-slate-600 mt-2">
             {watchlist.length > 0 ? (
               <>You've got a lot of focus on <span className="font-bold text-slate-900">{topSectors.join(' and ')}</span> companies right now!</>
             ) : (
               "Your portfolio is currently empty."
             )}
          </p>
        </div>
      </div>
    </div>
  );
};
