import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { TradeSignal } from '../types';

interface SignalChartProps {
  signal: TradeSignal;
}

export const SignalChart: React.FC<SignalChartProps> = ({ signal }) => {
  const isBuy = signal.direction === 'BUY';
  const lineColor = isBuy ? '#00f090' : '#ff3366';
  const gradientId = `chart-gradient-${signal.id.replace(/[^a-zA-Z0-9]/g, '-')}`;

  // Prepare chart data ensuring live currentPrice is always the latest tick
  const chartData = useMemo(() => {
    const history = signal.priceHistory && signal.priceHistory.length > 0 
      ? [...signal.priceHistory] 
      : [{ time: 'الآن', price: signal.entryPrice }];

    // Ensure the last element matches the current live price
    const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const lastItem = history[history.length - 1];
    
    if (lastItem && Math.abs(lastItem.price - signal.currentPrice) > 0.000001) {
      history.push({ time: nowTime, price: signal.currentPrice });
    }

    return history;
  }, [signal.priceHistory, signal.currentPrice, signal.entryPrice]);

  // Compute min/max for domain to keep all targets and current price neatly in frame
  const { yDomain, nextTarget } = useMemo(() => {
    const prices = chartData.map(d => d.price);
    const targetPrices = signal.targets.map(t => t.price);
    const allKeyPrices = [...prices, signal.entryPrice, signal.stopLoss, ...targetPrices];

    const minPrice = Math.min(...allKeyPrices);
    const maxPrice = Math.max(...allKeyPrices);
    const padding = (maxPrice - minPrice) * 0.08 || minPrice * 0.01;

    const nextT = signal.targets.find(t => t.isNext) || signal.targets[0];

    return {
      yDomain: [
        Number((minPrice - padding).toFixed(4)),
        Number((maxPrice + padding).toFixed(4))
      ] as [number, number],
      nextTarget: nextT,
    };
  }, [chartData, signal.entryPrice, signal.stopLoss, signal.targets]);

  return (
    <div className="relative w-full rounded-xl bg-[#090c14]/90 border border-slate-800/90 p-3.5 my-3.5 glow-card" dir="ltr">
      {/* Chart Top Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1 text-[11px]" dir="rtl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00f090] animate-ping" />
          <span className="font-bold text-slate-200">
            تطور السعر اللحظي مقابل أهداف الـ TP ووقف الخسارة
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 font-mono-numbers text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-0.5 bg-[#38bdf8] inline-block" />
            <span>الدخول ({signal.entryPrice})</span>
          </div>

          <div className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-0.5 bg-[#ff3366] inline-block" />
            <span>SL ({signal.stopLoss})</span>
          </div>

          {nextTarget && (
            <div className="flex items-center gap-1.5 text-purple-300 font-bold">
              <span className="w-2.5 h-0.5 bg-[#a855f7] inline-block" />
              <span>{nextTarget.label} النشط ({nextTarget.price})</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-0.5 bg-[#00f090] inline-block" />
            <span>السعر اللحظي ({signal.currentPrice})</span>
          </div>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="w-full h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1a2236" vertical={false} />

            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
            />

            <YAxis 
              domain={yDomain} 
              stroke="#64748b" 
              orientation="right"
              tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              tickFormatter={(v: number) => {
                if (v >= 1000) return v.toFixed(1);
                if (v >= 10) return v.toFixed(2);
                return v.toFixed(4);
              }}
            />

            <Tooltip content={<CustomTooltip signal={signal} />} />

            {/* Entry Reference Line */}
            <ReferenceLine 
              y={signal.entryPrice} 
              stroke="#38bdf8" 
              strokeDasharray="4 4" 
              strokeWidth={1.5}
              label={{
                value: `ENTRY: ${signal.entryPrice}`,
                fill: '#38bdf8',
                fontSize: 9,
                position: 'insideLeft',
                fontFamily: 'JetBrains Mono',
              }}
            />

            {/* Stop Loss (SL) Reference Line */}
            <ReferenceLine 
              y={signal.stopLoss} 
              stroke="#ff3366" 
              strokeDasharray="3 3" 
              strokeWidth={1.5}
              label={{
                value: `SL: ${signal.stopLoss}`,
                fill: '#ff3366',
                fontSize: 9,
                position: 'insideLeft',
                fontFamily: 'JetBrains Mono',
              }}
            />

            {/* Targets TP1 to TP6 Reference Lines */}
            {signal.targets.map((tp) => (
              <ReferenceLine 
                key={tp.id} 
                y={tp.price} 
                stroke={tp.hit ? '#00f090' : tp.isNext ? '#a855f7' : '#475569'} 
                strokeDasharray={tp.isNext ? '5 2' : '2 4'} 
                strokeWidth={tp.isNext ? 2 : 1}
                label={{
                  value: `${tp.label}: ${tp.price} ${tp.hit ? '✔' : tp.isNext ? '⚡' : ''}`,
                  fill: tp.hit ? '#00f090' : tp.isNext ? '#c084fc' : '#64748b',
                  fontSize: 9,
                  position: 'insideRight',
                  fontFamily: 'JetBrains Mono',
                }}
              />
            ))}

            {/* Live Price Area */}
            <Area
              type="monotone"
              dataKey="price"
              stroke={lineColor}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              dot={{ r: 2, fill: lineColor }}
              activeDot={{ r: 5, fill: '#ffffff', stroke: lineColor, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  signal: TradeSignal;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, signal }) => {
  if (active && payload && payload.length) {
    const price = payload[0].value;
    const diffFromEntry = price - signal.entryPrice;
    const pctFromEntry = ((diffFromEntry / signal.entryPrice) * 100).toFixed(2);
    const isProfit = signal.direction === 'BUY' ? diffFromEntry >= 0 : diffFromEntry <= 0;

    return (
      <div className="rounded-xl bg-[#0b0e17] border border-slate-700/80 p-2.5 shadow-2xl text-right font-mono-numbers text-xs glow-card" dir="rtl">
        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 pb-1 border-b border-slate-800">
          <span>التوقيت: {label}</span>
          <span className="text-white font-bold">{signal.pair}</span>
        </div>
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">السعر:</span>
            <span className="text-white font-black text-sm">{price}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">الفارق عن الدخول:</span>
            <span className={`font-bold ${isProfit ? 'text-[#00f090]' : 'text-[#ff3366]'}`}>
              {diffFromEntry >= 0 ? `+${diffFromEntry.toFixed(4)}` : diffFromEntry.toFixed(4)} ({pctFromEntry}%)
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
