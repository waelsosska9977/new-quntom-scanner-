import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Send, 
  Compass,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { TradeSignal } from '../types';

interface MarketOverviewCardProps {
  signals: TradeSignal[];
  onSelectPair: (pair: string) => void;
  onOpenChat?: () => void;
  onBroadcastTelegram: () => void;
}

const MarketOverviewCardComponent: React.FC<MarketOverviewCardProps> = ({
  signals,
  onSelectPair,
  onBroadcastTelegram,
}) => {
  const bullishSignals = signals.filter((s) => s.direction === 'BUY');
  const bearishSignals = signals.filter((s) => s.direction === 'SELL');

  const total = signals.length || 1;
  const bullishPct = Math.round((bullishSignals.length / total) * 100);
  const bearishPct = 100 - bullishPct;

  return (
    <div 
      className="rounded-2xl bg-[#111827] border border-slate-800 p-5 sm:p-6 shadow-md"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sky-400">
            <Compass className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                رادار اتجاه السوق والسيولة الممسوحة (Market Radar)
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono-numbers">
                50 عملة ممسوحة
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              مقارنة بين عدد العملات في مسار الصعود (Long ↗) ومسار الهبوط (Short ↘)
            </p>
          </div>
        </div>

        {/* Quick Action Button */}
        <button
          type="button"
          onClick={onBroadcastTelegram}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 border border-sky-500/40 transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>بث الملخص لتيليجرام 🚀</span>
        </button>
      </div>

      {/* Market Momentum Bar */}
      <div className="my-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono-numbers">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>عملات الصعود: {bullishSignals.length} ({bullishPct}%)</span>
          </div>

          <span className="text-xs text-slate-300 font-sans">
            {bullishPct >= 50 ? '🟢 هيمنة قوى الشراء (Bullish Bias)' : '🔴 هيمنة قوى البيع (Bearish Bias)'}
          </span>

          <div className="flex items-center gap-1.5 text-rose-400 font-bold">
            <span>عملات الهبوط: {bearishSignals.length} ({bearishPct}%)</span>
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>

        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${bullishPct}%` }} 
          />
          <div 
            className="h-full bg-rose-500 transition-all duration-500" 
            style={{ width: `${bearishPct}%` }} 
          />
        </div>
      </div>

      {/* Two Column Grid: Bullish vs Bearish */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Bullish Coins */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-xs sm:text-sm text-slate-200">
                عملات الزخم الصاعد (شراء ↗)
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono-numbers font-medium">
              {bullishSignals.length} عملة
            </span>
          </div>

          {bullishSignals.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">لا توجد صفقات شراء مؤكدة حالياً</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {bullishSignals.map((sig) => (
                <button
                  key={sig.id}
                  type="button"
                  onClick={() => onSelectPair(sig.pair)}
                  className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-right transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors font-mono-numbers">
                      {sig.pair.replace('USDT', '')}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono-numbers">
                      {sig.score}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono-numbers text-slate-400">
                    <span>{sig.entryPrice}</span>
                    <span className="text-emerald-400 font-semibold">
                      {sig.pnlPercent >= 0 ? `+${sig.pnlPercent}%` : `${sig.pnlPercent}%`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bearish Coins */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-rose-500/10 text-rose-400">
                <TrendingDown className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-xs sm:text-sm text-slate-200">
                عملات الزخم الهابط (بيع ↘)
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono-numbers font-medium">
              {bearishSignals.length} عملة
            </span>
          </div>

          {bearishSignals.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">لا توجد صفقات بيع مؤكدة حالياً</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {bearishSignals.map((sig) => (
                <button
                  key={sig.id}
                  type="button"
                  onClick={() => onSelectPair(sig.pair)}
                  className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/40 text-right transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-black text-xs text-white group-hover:text-rose-400 transition-colors font-mono-numbers">
                      {sig.pair.replace('USDT', '')}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono-numbers">
                      {sig.score}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono-numbers text-slate-400">
                    <span>{sig.entryPrice}</span>
                    <span className="text-rose-400 font-semibold">
                      {sig.pnlPercent >= 0 ? `+${sig.pnlPercent}%` : `${sig.pnlPercent}%`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const MarketOverviewCard = React.memo(MarketOverviewCardComponent);
