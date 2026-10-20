import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Flame, 
  MessageSquare, 
  Send, 
  Target, 
  ShieldCheck,
  CheckCircle2,
  Compass
} from 'lucide-react';
import { TradeSignal } from '../types';

interface MarketOverviewCardProps {
  signals: TradeSignal[];
  onSelectPair: (pair: string) => void;
  onOpenChat: () => void;
  onBroadcastTelegram: () => void;
}

const MarketOverviewCardComponent: React.FC<MarketOverviewCardProps> = ({
  signals,
  onSelectPair,
  onOpenChat,
  onBroadcastTelegram,
}) => {
  const bullishSignals = signals.filter((s) => s.direction === 'BUY');
  const bearishSignals = signals.filter((s) => s.direction === 'SELL');

  const total = signals.length || 1;
  const bullishPct = Math.round((bullishSignals.length / total) * 100);
  const bearishPct = 100 - bullishPct;

  return (
    <div 
      className="relative rounded-[22px] bg-gradient-to-br from-[#121727] via-[#0d111d] to-[#0a0c13] border border-slate-800 p-5 sm:p-6 shadow-2xl glow-card overflow-hidden"
      dir="rtl"
    >
      {/* Decorative ambient glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#00f090]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#00f090]/20 to-purple-500/20 border border-[#00f090]/40 text-[#00f090] shadow-lg glow-green">
            <Compass className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                رادار الصفقات اللحظية المتاحة حالياً (Market Radar Matrix)
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00f090] border border-[#00f090]/30 font-bold font-mono-numbers">
                LIVE 50 COINS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              تصنيف فوري لجميع العملات الممسوحة بين مسار الصعود (Long ↗) ومسار الهبوط (Short ↘)
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenChat}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-[#00f090] to-emerald-400 hover:from-[#00f090]/90 hover:to-emerald-300 transition-all glow-green shadow-lg"
          >
            <MessageSquare className="w-4 h-4 text-black" />
            <span>شات الذكاء الاصطناعي 💬</span>
          </button>

          <button
            type="button"
            onClick={onBroadcastTelegram}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 border border-sky-400/30 transition-all shadow-md shadow-sky-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">بث لتيليجرام</span>
          </button>
        </div>
      </div>

      {/* Market Momentum Bar */}
      <div className="my-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono-numbers">
          <div className="flex items-center gap-1.5 text-[#00f090] font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>عملات الصعود: {bullishSignals.length} ({bullishPct}%)</span>
          </div>

          <span className="text-[11px] text-slate-400 font-sans">
            {bullishPct >= 50 ? '🟢 هيمنة واضحة لقوى الشراء المؤسساتي' : '🔴 هيمنة واضحة لقوى البيع والتصريف'}
          </span>

          <div className="flex items-center gap-1.5 text-[#ff3366] font-bold">
            <span>عملات الهبوط: {bearishSignals.length} ({bearishPct}%)</span>
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-[#00f090] transition-all duration-700 shadow-[0_0_10px_rgba(0,240,144,0.5)]" 
            style={{ width: `${bullishPct}%` }} 
          />
          <div 
            className="h-full bg-gradient-to-r from-rose-500 to-[#ff3366] transition-all duration-700 shadow-[0_0_10px_rgba(255,51,102,0.5)]" 
            style={{ width: `${bearishPct}%` }} 
          />
        </div>
      </div>

      {/* Two Column Cards Grid: Bullish (صعود) vs Bearish (هبوط) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* 1. Bullish Coins Column (عملات الصعود ↗) */}
        <div className="p-4 rounded-xl bg-[#090c14]/90 border border-[#00f090]/25 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#00f090]/15 text-[#00f090] border border-[#00f090]/30">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                عملات الزخم الصاعد (شراء / Long ↗)
              </h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#00f090]/15 text-[#00f090] border border-[#00f090]/40 font-mono-numbers font-bold">
              {bullishSignals.length} فرصة متاحة
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
                  className="p-2.5 rounded-xl bg-[#0e1320] hover:bg-[#131b2e] border border-slate-800 hover:border-[#00f090]/50 text-right transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-black text-xs text-white group-hover:text-[#00f090] transition-colors font-mono-numbers">
                      {sig.pair.replace('USDT', '')}
                    </span>
                    <span className="text-[10px] font-bold text-amber-400 font-mono-numbers">
                      {sig.score}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono-numbers text-slate-400">
                    <span>دخول: {sig.entryPrice}</span>
                    <span className="text-[#00f090] font-bold">
                      {sig.pnlPercent >= 0 ? `+${sig.pnlPercent}%` : `${sig.pnlPercent}%`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Bearish Coins Column (عملات الهبوط ↘) */}
        <div className="p-4 rounded-xl bg-[#090c14]/90 border border-[#ff3366]/25 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#ff3366]/15 text-[#ff3366] border border-[#ff3366]/30">
                <TrendingDown className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                عملات الزخم الهابط (بيع / Short ↘)
              </h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ff3366]/15 text-[#ff3366] border border-[#ff3366]/40 font-mono-numbers font-bold">
              {bearishSignals.length} فرصة متاحة
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
                  className="p-2.5 rounded-xl bg-[#0e1320] hover:bg-[#131b2e] border border-slate-800 hover:border-[#ff3366]/50 text-right transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-black text-xs text-white group-hover:text-[#ff3366] transition-colors font-mono-numbers">
                      {sig.pair.replace('USDT', '')}
                    </span>
                    <span className="text-[10px] font-bold text-amber-400 font-mono-numbers">
                      {sig.score}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono-numbers text-slate-400">
                    <span>دخول: {sig.entryPrice}</span>
                    <span className="text-[#ff3366] font-bold">
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

