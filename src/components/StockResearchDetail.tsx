import React from 'react';
import { Button } from './ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

interface StockResearchDetailProps {
  ticker: string;
  onBack: () => void;
}

export const StockResearchDetail = ({ ticker, onBack }: StockResearchDetailProps) => {
  // Mock data for comparison and performance based on ticker
  const getTickerData = (ticker: string) => {
    const tickerToSector: Record<string, string> = {
      PLTR: "Technology", SNOW: "Technology", CRWD: "Technology",
      KO: "Consumer Defensive", JNJ: "Consumer Defensive", PG: "Consumer Defensive",
      NEE: "Energy & Utilities", ENPH: "Energy & Utilities", FSLR: "Energy & Utilities"
    };
    
    const tickerBasePrices: Record<string, number> = {
      PLTR: 25, SNOW: 160, CRWD: 320,
      KO: 60, JNJ: 155, PG: 165,
      NEE: 70, ENPH: 120, FSLR: 190
    };

    const sector = tickerToSector[ticker] || "General Market";
    const basePrice = tickerBasePrices[ticker] || 100;
    
    // Sector base multipliers to represent trend relative to base price
    const sectorTrends = {
      "Technology": [1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.42, 1.45, 1.47],
      "Consumer Defensive": [1.0, 1.02, 1.04, 1.06, 1.08, 1.1, 1.12, 1.14, 1.16, 1.18, 1.2, 1.22],
      "Energy & Utilities": [1.0, 1.03, 1.06, 1.09, 1.12, 1.15, 1.18, 1.21, 1.24, 1.27, 1.3, 1.33],
      "General Market": Array(12).fill(1).map((_, i) => 1 + (i * 0.02))
    }[sector]!;

    // Create varied performance data based on ticker for 12 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const performanceData = months.map((month, i) => {
      const sectorVal = basePrice * sectorTrends[i];
      // Add some ticker-specific variance
      const stockVal = sectorVal * (1 + (Math.sin(i + ticker.length) * 0.1) + (i * 0.01));
      
      return {
        name: month,
        stock: Number(stockVal.toFixed(2)),
        sector: Number(sectorVal.toFixed(2))
      };
    });

    const details: Record<string, { summary: string, pros: string[], cons: string[] }> = {
      PLTR: { 
        summary: "Palantir is a leader in data analytics platforms, serving both government and commercial sectors. Its strong focus on AI integration suggests long-term growth potential in an increasingly data-driven economy.",
        pros: ["Dominant in government AI", "Expanding commercial footprint"],
        cons: ["High stock-based compensation", "Volatility in government contract timing"]
      },
      SNOW: {
        summary: "Snowflake's cloud data platform offers unparalleled scalability, making it essential for enterprises managing massive datasets. Its consumption-based pricing model aligns well with continued cloud adoption.",
        pros: ["Scalable architecture", "Strong enterprise adoption"],
        cons: ["High valuation multiple", "Sensitive to enterprise IT budget cuts"]
      },
      CRWD: {                
        summary: "CrowdStrike is a powerhouse in cloud-native endpoint protection. With cybersecurity threats rising, its AI-driven platform remains critical for business continuity, making it a compelling candidate for long-term growth.",
        pros: ["Market leader in endpoint security", "High retention rates"],
        cons: ["Intense competitive landscape", "Requires constant innovation to stay ahead"]
      },
      KO: {
        summary: "Coca-Cola is a timeless dividend staple. Its unrivaled distribution network and global brand equity provide consistent cash flow, making it a defensive pillar for income-focused investors during market volatility.",
        pros: ["Defensive moat", "Steady dividend payer"],
        cons: ["Low growth potential", "Exposure to fluctuating raw material costs"]
      },
      JNJ: {
        summary: "Johnson & Johnson remains a leader in the healthcare sector, backed by its diversified portfolio across pharmaceuticals and medical devices. Its long history of steady dividend growth attracts resilient, conservative capital.",
        pros: ["Well-diversified revenue", "Strong balance sheet"],
        cons: ["Ongoing litigation risks", "Challenges in patent cliffs for key drugs"]
      },
      PG: {
        summary: "Procter & Gamble is a consumer goods giant with a resilient portfolio of essential household brands. Its ability to pass on costs and maintain steady margins makes it a reliable performer in any economy.",
        pros: ["Pricing power", "Strong dividend history"],
        cons: ["Slow top-line growth", "Competition from private-label brands"]
      },
      NEE: {
        summary: "NextEra Energy is a top-tier player in renewable energy infrastructure. As the global energy transition accelerates, its utility-scale wind and solar projects position it for sustainable, long-term infrastructure-backed growth.",
        pros: ["Leader in renewables", "Stable regulated utility base"],
        cons: ["Interest rate sensitivity", "Regulatory and permitting delays"]
      },
      ENPH: {
        summary: "Enphase Energy is essential to the solar ecosystem, providing high-efficiency microinverters and energy management for homes. Its focus on solar adoption makes it a direct play on decentralized energy trends.",
        pros: ["Technological leader in microinverters", "Growth in energy storage"],
        cons: ["High dependence on solar installation trends", "Supply chain risks"]
      },
      FSLR: {
        summary: "First Solar manufactures sophisticated thin-film PV modules, positioning it to benefit significantly from domestic manufacturing incentives and the growing demand for utility-scale solar projects across the U.S.",
        pros: ["Benefits from IRA incentives", "Strong balance sheet"],
        cons: ["High capital intensity", "Pricing pressure in solar modules"]
      },
    };

    const detail = details[ticker] || {
      summary: `${ticker} is a key player in its sector with compelling growth potential, backed by strong fundamentals and market positioning.`,
      pros: ["Standard fundamentals"],
      cons: ["Market-wide risks"]
    };

    return { performanceData, ...detail };
  };

  const { performanceData, summary, pros, cons } = getTickerData(ticker);

  return (
    <div className="p-8 space-y-6">
      <Button onClick={onBack} variant="outline" className="mb-4">← Back to Lists</Button>
      <h1 className="text-4xl font-bold font-heading">Research Analysis: {ticker}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-50 border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] p-3 sm:p-6 overflow-hidden">
           <h2 className="text-xl font-bold font-heading mb-4 px-2">{ticker} vs Sector Avg</h2>
           <div className="h-[300px] sm:h-[450px] w-full mt-4 -ml-2 sm:ml-0">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={performanceData} margin={{ top: 20, right: 10, bottom: 20, left: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                 <XAxis 
                   dataKey="name" 
                   interval="preserveStartEnd" 
                   tick={{ fontSize: 10 }}
                 />
                 <YAxis 
                   tickFormatter={(value) => `$${value}`} 
                   tick={{ fontSize: 10 }}
                   width={40}
                 />
                 <Tooltip 
                   formatter={(value: number) => [`$${value}`, 'Price']}
                   contentStyle={{ border: '2px solid #0f172a', borderRadius: '0px' }}
                 />
                 <Legend verticalAlign="top" height={36} />
                 <Line type="monotone" dataKey="stock" stroke="#22c55e" strokeWidth={3} name={ticker} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                 <Line type="monotone" dataKey="sector" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" name="Sector Avg" dot={false} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-6">
            <h2 className="text-xl font-bold font-heading mb-4">Why {ticker}?</h2>
            <p className="text-slate-700 leading-relaxed">
              {summary}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-green-700">Pros</h4>
                <ul className="text-sm list-disc pl-4">
                  {pros.map(p => <li key={p}>{p}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-red-700">Cons</h4>
                <ul className="text-sm list-disc pl-4">
                  {cons.map(c => <li key={c}>{c}</li>)}
                </ul>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};
