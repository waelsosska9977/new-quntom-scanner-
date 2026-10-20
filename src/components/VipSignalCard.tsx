import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldAlert, 
  Award, 
  Send, 
  BrainCircuit, 
  CheckCircle, 
  Radio, 
  Clock, 
  Flame, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Layers, 
  Loader2,
  Percent,
  Check,
  Circle,
  BarChart3
} from 'lucide-react';
import { AppConfig, TradeSignal } from '../types';
import { sendSignalToTelegram } from '../services/telegram';
import { generateAiTradeAnalysis } from '../services/aiAnalyst';
import { soundManager } from '../utils/audio';
import { SignalChart } from './SignalChart';

interface VipSignalCardProps {
  signal: TradeSignal;
  config: AppConfig;
  onUpdateSignal: (updatedSignal: TradeSignal) => void;
  defaultShowChart?: boolean;
}

const VipSignalCardComponent: React.FC<VipSignalCardProps> = ({
  signal,
  config,
  onUpdateSignal,
  defaultShowChart = false,
}) => {
  const [isAiExpanded, setIsAiExpanded] = useState(false);
  const [showChart, setShowChart] = useState(defaultShowChart);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{ success?: boolean; text?: string } | null>(null);
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);

  const isBuy = signal.direction === 'BUY';
  const hitTargets = signal.targets.filter(t => t.hit).length;
  const totalTargets = signal.targets.length || 6;
  const progressRatio = (hitTargets / totalTargets) * 100;

  // Handle Telegram 1-click send
  const handleSendTelegram = async () => {
    setIsSendingTelegram(true);
    setTelegramStatus(null);
    const res = await sendSignalToTelegram(
      signal,
      config.telegramBotToken,
      config.telegramChatId
    );
    setTelegramStatus({ success: res.success, text: res.message });
    setIsSendingTelegram(false);

    if (res.success && config.soundEnabled) {
      soundManager.playSignalAlert();
    }

    setTimeout(() => {
      setTelegramStatus(null);
    }, 4500);
  };

  // Re-run AI analysis on demand
  const handleRegenerateAi = async () => {
    setIsRefreshingAi(true);
    const newThesis = await generateAiTradeAnalysis(signal, signal.metrics, config);
    onUpdateSignal({
      ...signal,
      aiThesis: newThesis,
      score: newThesis.confidenceScore,
    });
    setIsRefreshingAi(false);
  };

  return (
    <div 
      className="relative rounded-[18px] bg-gradient-to-b from-[#111624] via-[#0d101a] to-[#0a0c13] border border-slate-800/80 p-5 sm:p-6 transition-all duration-300 hover:border-slate-700/80 shadow-2xl glow-card group overflow-hidden"
      dir="rtl"
    >
      {/* Decorative ambient neon backlight */}
      <div 
        className={`absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-20 transition-opacity ${
          isBuy ? 'bg-[#00f090]' : 'bg-[#ff3366]'
        }`} 
      />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-15 bg-purple-600" />

      {/* 1. Header Row */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
        <div className="flex items-center gap-3">
          {/* Direction Badge */}
          <div
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm tracking-wide ${
              isBuy
                ? 'bg-[#00f090]/15 text-[#00f090] border border-[#00f090]/40 glow-green'
                : 'bg-[#ff3366]/15 text-[#ff3366] border border-[#ff3366]/40 glow-red'
            }`}
          >
            {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isBuy ? 'شراء ↗ BUY' : 'بيع ↘ SELL'}</span>
          </div>

          {/* Timeframe Tag */}
          <span className="font-mono-numbers text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60">
            {signal.timeframe.toUpperCase()}
          </span>

          {/* Pair Name */}
          <div className="flex items-center gap-2">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-wider font-mono-numbers">
              {signal.pair}
            </h3>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
        </div>

        {/* VIP Premium Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 text-[#ffb800] border border-[#ffb800]/40 glow-gold text-xs font-bold shadow-lg">
            <Award className="w-4 h-4 text-[#ffb800]" />
            <span className="tracking-wider">VIP PREMIUM 🏆</span>
          </div>
        </div>
      </div>

      {/* 2. Metrics Row (Triple Metric: Entry, Stop Loss, Signal Score) */}
      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {/* Entry Price */}
        <div className="p-3.5 rounded-xl bg-[#0b0e17] border border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-[#00f090] border border-[#00f090]/20">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">سعر الدخول (Entry)</span>
              <span className="text-base sm:text-lg font-black text-white font-mono-numbers tracking-tight">
                {signal.entryPrice}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono-numbers">USDT</span>
        </div>

        {/* Stop Loss (SL) */}
        <div className="p-3.5 rounded-xl bg-[#0b0e17] border border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-[#ff3366] border border-[#ff3366]/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">وقف الخسارة (SL)</span>
              <span className="text-base sm:text-lg font-black text-[#ff3366] font-mono-numbers tracking-tight">
                {signal.stopLoss}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-rose-500/70 font-mono-numbers">
            {isBuy ? `-${(((signal.entryPrice - signal.stopLoss) / signal.entryPrice) * 100).toFixed(1)}%` : `+${(((signal.stopLoss - signal.entryPrice) / signal.entryPrice) * 100).toFixed(1)}%`}
          </span>
        </div>

        {/* Signal Score */}
        <div className="p-3.5 rounded-xl bg-[#0b0e17] border border-[#ffb800]/20 flex items-center justify-between glow-gold/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-[#ffb800] border border-[#ffb800]/30">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">قوة الإشارة (Score)</span>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-[#ffb800] font-mono-numbers">
                  {signal.score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </span>
              </div>
            </div>
          </div>
          {/* Glowing indicator dots */}
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#00f090]" />
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#ffb800]" />
            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#a855f7]" />
          </div>
        </div>
      </div>

      {/* 3. Real-time Progress & Profit Bar */}
      <div className="relative p-3.5 rounded-xl bg-[#0b0e17]/80 border border-slate-800/80 mb-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">السعر اللحظي (Live):</span>
            <span className="font-mono-numbers font-bold text-white text-sm">
              {signal.currentPrice}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* PnL Counter */}
            <div
              className={`flex items-center gap-1 font-mono-numbers font-bold text-xs sm:text-sm ${
                signal.pnlPercent >= 0 ? 'text-[#00f090]' : 'text-[#ff3366]'
              }`}
            >
              <span>{signal.pnlPercent >= 0 ? `+${signal.pnlPoints} نقطة` : `${signal.pnlPoints} نقطة`}</span>
              <span>/</span>
              <span>{signal.pnlPercent >= 0 ? `+${signal.pnlPercent}%` : `${signal.pnlPercent}%`}</span>
            </div>

            {/* Target Ratio */}
            <div className="flex items-center gap-1 font-mono-numbers font-semibold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
              <span className="text-xs">الأهداف المحققة:</span>
              <span className="text-[#00f090] font-bold">{hitTargets}</span>
              <span className="text-slate-500">/</span>
              <span>{totalTargets}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Neon Progress Bar */}
        <div className="relative w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-[#00f090] to-purple-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(0,240,144,0.6)]"
            style={{ width: `${Math.min(100, Math.max(5, progressRatio))}%` }}
          />
        </div>
      </div>

      {/* 4. Real-time Line Chart (Recharts) */}
      {showChart && <SignalChart signal={signal} />}

      {/* 5. Interactive TP Targets Grid (6 Progressive Targets TP1 - TP6) */}
      <div className="relative mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#00f090]" />
              شبكة الأهداف التفاعلية (TP Targets Grid):
            </span>
            <button
              type="button"
              onClick={() => setShowChart(!showChart)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                showChart
                  ? 'bg-purple-950/40 text-purple-300 border-purple-500/40 glow-purple'
                  : 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3 h-3 text-purple-400" />
              <span>{showChart ? 'إخفاء المخطط' : 'عرض المخطط البياني'}</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500 font-mono-numbers">
            R:R Ratio 1:{signal.riskRewardRatio}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {signal.targets.map((target) => {
            const profitStr = target.profitAmount !== undefined ? `+${target.profitAmount}` : `+${Math.abs(target.price - signal.entryPrice).toFixed(4)}`;

            if (target.hit) {
              // 1. Hit Target: Dark neon green card + checkmark + price + "تم تحقيقه"
              return (
                <div
                  key={target.id}
                  className="p-2.5 rounded-xl bg-[#00f090]/10 border border-[#00f090]/40 text-right glow-green/40 transition-all"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#00f090] mb-1">
                    <span>{target.label}</span>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="font-mono-numbers text-xs font-bold text-white tracking-tight">
                    {target.price}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono-numbers text-emerald-400 font-semibold mt-0.5">
                    <span>{profitStr}</span>
                    <span>+{target.targetPct}%</span>
                  </div>
                  <div className="text-[9px] text-[#00f090] font-medium mt-0.5">
                    تم تحقيقه ✔
                  </div>
                </div>
              );
            }

            if (target.isNext) {
              // 2. Next Active Target: Glowing pulsing neon purple border + price + "الهدف التالي"
              return (
                <div
                  key={target.id}
                  className="p-2.5 rounded-xl bg-purple-950/30 border-2 border-[#a855f7] text-right glow-purple animate-pulse-subtle transition-all"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 mb-1">
                    <span>{target.label}</span>
                    <span className="w-2 h-2 rounded-full bg-[#a855f7] animate-ping" />
                  </div>
                  <div className="font-mono-numbers text-xs font-bold text-white tracking-tight">
                    {target.price}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono-numbers text-purple-300 font-bold mt-0.5">
                    <span>{profitStr}</span>
                    <span>+{target.targetPct}%</span>
                  </div>
                  <div className="text-[9px] text-purple-300 font-bold mt-0.5">
                    الهدف التالي ⚡
                  </div>
                </div>
              );
            }

            // 3. Pending Targets: Translucent gray + circle + price + "بانتظار الوصول"
            return (
              <div
                key={target.id}
                className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60 text-right text-slate-400 transition-all opacity-75 hover:opacity-100"
              >
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
                  <span>{target.label}</span>
                  <Circle className="w-3 h-3 text-slate-500" />
                </div>
                <div className="font-mono-numbers text-xs font-bold text-slate-300 tracking-tight">
                  {target.price}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono-numbers text-slate-400 mt-0.5">
                  <span>{profitStr}</span>
                  <span className="text-slate-300 font-medium">+{target.targetPct}%</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  بانتظار الوصول ○
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Institutional AI Trade Thesis Box */}
      <div className="relative mb-4 rounded-xl bg-[#0c101a] border border-slate-800/90 overflow-hidden">
        <div
          onClick={() => setIsAiExpanded(!isAiExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsAiExpanded(!isAiExpanded);
            }
          }}
          role="button"
          tabIndex={0}
          className="w-full px-4 py-3 bg-gradient-to-r from-slate-900/90 via-[#101422] to-slate-900/90 flex items-center justify-between text-right border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-[#00f090] border border-[#00f090]/30">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">صندوق تحليل الذكاء الاصطناعي (AI Trade Thesis)</span>
              <span className="text-[10px] text-slate-400">تقييم الدلتا، الامتصاص، مؤشر RSI وتدفق السيولة المؤسساتي</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRegenerateAi();
              }}
              disabled={isRefreshingAi}
              className="p-1 rounded text-slate-400 hover:text-[#00f090] transition-colors"
              title="إعادة توليد التحليل"
            >
              {isRefreshingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f090]" /> : <Sparkles className="w-3.5 h-3.5" />}
            </button>
            {isAiExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {isAiExpanded && (
          <div className="p-4 space-y-3 text-xs leading-relaxed">
            {/* Summary */}
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-200">
              <span className="font-bold text-emerald-400 block mb-1">الخلاصة الفنية:</span>
              <p>{signal.aiThesis.summary}</p>
            </div>

            {/* Grid of 4 Core Elements: Delta, Absorption, RSI & Volume, Risk:Reward */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg bg-[#07090f] border border-slate-800">
                <span className="font-bold text-slate-300 block mb-1 text-[11px] text-sky-400">
                  📊 تحليل دلتا الفوليوم (CVD Delta):
                </span>
                <p className="text-slate-400 text-[11px]">{signal.aiThesis.deltaAnalysis}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#07090f] border border-slate-800">
                <span className="font-bold text-slate-300 block mb-1 text-[11px] text-purple-400">
                  🧲 امتصاص السيولة (Order Flow Absorption):
                </span>
                <p className="text-slate-400 text-[11px]">{signal.aiThesis.absorption}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#07090f] border border-slate-800">
                <span className="font-bold text-slate-300 block mb-1 text-[11px] text-amber-400">
                  ⚡ مؤشر RSI وتناغم الزخم:
                </span>
                <p className="text-slate-400 text-[11px]">{signal.aiThesis.rsiVolume}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#07090f] border border-slate-800">
                <span className="font-bold text-slate-300 block mb-1 text-[11px] text-emerald-400">
                  ⚖️ معادلة العائد إلى المخاطرة (R:R):
                </span>
                <p className="text-slate-400 text-[11px]">{signal.aiThesis.riskReward}</p>
              </div>
            </div>

            {/* Backtest & Quantitative Verification Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono-numbers">
              <div className="flex items-center gap-3">
                <span>In-Sample Win Rate: <strong className="text-emerald-400">{signal.metrics.inSampleWinRate}%</strong></span>
                <span>Out-of-Sample: <strong className="text-purple-400">{signal.metrics.outOfSampleWinRate}%</strong></span>
              </div>
              <span className="text-[10px] text-slate-500">رسوم 0.06% + انزلاق 0.02% مطبقة آلياً</span>
            </div>
          </div>
        )}
      </div>

      {/* 6. Action Row: Instant 1-Click Telegram Dispatch & Status */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>توقيت الإشارة: {new Date(signal.timestamp).toLocaleTimeString('ar-EG')}</span>
        </div>

        <div className="flex items-center gap-2">
          {telegramStatus && (
            <span
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                telegramStatus.success
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                  : 'bg-rose-950/40 text-rose-400 border-rose-800/50'
              }`}
            >
              {telegramStatus.text}
            </span>
          )}

          <button
            type="button"
            onClick={handleSendTelegram}
            disabled={isSendingTelegram}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSendingTelegram ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>إرسال فوري إلى Telegram 🚀</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const VipSignalCard = React.memo(VipSignalCardComponent);

