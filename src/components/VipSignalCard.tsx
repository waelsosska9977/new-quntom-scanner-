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
  Clock, 
  Flame, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Loader2,
  Copy,
  Check,
  Circle,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight
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
  const [copied, setCopied] = useState(false);

  const isBuy = signal.direction === 'BUY';
  const hitTargets = signal.targets.filter(t => t.hit).length;
  const totalTargets = signal.targets.length || 6;
  const progressRatio = Math.round((hitTargets / totalTargets) * 100);

  // 1-Click Copy Signal Details to Clipboard for traders
  const handleCopySignal = () => {
    const directionArabic = isBuy ? 'شراء ↗ (LONG)' : 'بيع ↘ (SHORT)';
    const targetsText = signal.targets
      .map(t => `${t.label}: ${t.price} (+${t.targetPct}%) ${t.hit ? '✔ (تم)' : ''}`)
      .join('\n');

    const copyText = `🎯 توصية VIP: ${signal.pair}
الاتجاه: ${directionArabic}
الفريم: ${signal.timeframe.toUpperCase()}
قوة الإشارة: ${signal.score}/100

سعر الدخول: ${signal.entryPrice}
وقف الخسارة: ${signal.stopLoss} (${isBuy ? `-${(((signal.entryPrice - signal.stopLoss) / signal.entryPrice) * 100).toFixed(1)}%` : `+${(((signal.stopLoss - signal.entryPrice) / signal.entryPrice) * 100).toFixed(1)}%`})

الأهداف:
${targetsText}

نسبة R:R: 1:${signal.riskRewardRatio}`;

    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

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
      className="rounded-2xl bg-[#111827] border border-slate-800 p-5 sm:p-6 transition-all duration-200 hover:border-slate-700 shadow-md relative"
      dir="rtl"
    >
      {/* 1. Header Row: High Clarity, Scannable at a Glance */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        {/* Left: Direction + Pair Name + Timeframe */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Direction Tag */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm ${
              isBuy
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            {isBuy ? <ArrowUpRight className="w-4 h-4 stroke-[2.5]" /> : <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />}
            <span>{isBuy ? 'صفقة شراء ↗ BUY' : 'صفقة بيع ↘ SELL'}</span>
          </div>

          {/* Timeframe Tag */}
          <span className="font-mono-numbers text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60">
            {signal.timeframe.toUpperCase()}
          </span>

          {/* Pair Name */}
          <div className="flex items-center gap-2 mr-1">
            <h3 className="text-xl sm:text-2xl font-black text-white font-mono-numbers tracking-tight">
              {signal.pair}
            </h3>
          </div>
        </div>

        {/* Right: Live Price & Signal Score */}
        <div className="flex items-center gap-3">
          {/* Live Price Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-400">السعر المباشر:</span>
            <span className="font-mono-numbers font-bold text-white text-xs sm:text-sm">
              {signal.currentPrice}
            </span>
            <span
              className={`font-mono-numbers text-xs font-bold ${
                signal.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {signal.pnlPercent >= 0 ? `+${signal.pnlPercent}%` : `${signal.pnlPercent}%`}
            </span>
          </div>

          {/* Signal Score Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono-numbers">{signal.score}/100</span>
          </div>
        </div>
      </div>

      {/* 2. Core Trade Plan: 3 Clear Pillars (Entry, Stop Loss, Risk:Reward) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-4">
        {/* Entry Price */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">سعر الدخول المقترح</span>
              <span className="text-base sm:text-lg font-black text-white font-mono-numbers tracking-tight">
                {signal.entryPrice}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono-numbers">USDT</span>
        </div>

        {/* Stop Loss (SL) */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">وقف الخسارة (SL)</span>
              <span className="text-base sm:text-lg font-black text-rose-400 font-mono-numbers tracking-tight">
                {signal.stopLoss}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono-numbers font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
            {isBuy 
              ? `-${(((signal.entryPrice - signal.stopLoss) / signal.entryPrice) * 100).toFixed(1)}%` 
              : `+${(((signal.stopLoss - signal.entryPrice) / signal.entryPrice) * 100).toFixed(1)}%`}
          </span>
        </div>

        {/* Risk / Reward & Targets Count */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">نسبة العائد إلى المخاطرة (R:R)</span>
              <span className="text-base sm:text-lg font-black text-amber-300 font-mono-numbers">
                1 : {signal.riskRewardRatio}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono-numbers text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
            {hitTargets}/{totalTargets} أهداف
          </span>
        </div>
      </div>

      {/* 3. Progress Bar toward full Targets */}
      <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-400">تقدم الصفقة:</span>
            <span className="font-bold text-white font-mono-numbers">
              {hitTargets} من {totalTargets} أهداف تحققت ({progressRatio}%)
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono-numbers text-xs">
            <span className="text-slate-400">الربح اللحظي:</span>
            <span className={`font-bold ${signal.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {signal.pnlPercent >= 0 ? `+${signal.pnlPoints} نقطة (+${signal.pnlPercent}%)` : `${signal.pnlPoints} نقطة (${signal.pnlPercent}%)`}
            </span>
          </div>
        </div>

        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isBuy ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(hitTargets > 0 ? progressRatio : 4, 4))}%` }}
          />
        </div>
      </div>

      {/* 4. Real-time Chart (Optional, Toggleable) */}
      {showChart && (
        <div className="mb-4">
          <SignalChart signal={signal} />
        </div>
      )}

      {/* 5. Targets Grid (TP1 - TP6): Clean, Organized, Intuitive */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            أهداف جني الأرباح (Take Profit Targets):
          </span>
          <button
            type="button"
            onClick={() => setShowChart(!showChart)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
            <span>{showChart ? 'إخفاء الشارت' : 'عرض الشارت'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {signal.targets.map((target) => {
            const profitStr = target.profitAmount !== undefined 
              ? `+${target.profitAmount}` 
              : `+${Math.abs(target.price - signal.entryPrice).toFixed(4)}`;

            if (target.hit) {
              // 1. Hit Target: Clean soft green card
              return (
                <div
                  key={target.id}
                  className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-right transition-all"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 mb-1">
                    <span>{target.label}</span>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="font-mono-numbers text-xs font-bold text-white">
                    {target.price}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono-numbers text-emerald-300 font-semibold mt-1">
                    <span>{profitStr}</span>
                    <span>+{target.targetPct}%</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium mt-1">
                    تم تحقيقه ✔
                  </div>
                </div>
              );
            }

            if (target.isNext) {
              // 2. Next Active Target: Highlighted in soft blue/purple
              return (
                <div
                  key={target.id}
                  className="p-2.5 rounded-xl bg-sky-500/10 border-2 border-sky-400/60 text-right transition-all"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-300 mb-1">
                    <span>{target.label}</span>
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  </div>
                  <div className="font-mono-numbers text-xs font-bold text-white">
                    {target.price}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono-numbers text-sky-300 font-bold mt-1">
                    <span>{profitStr}</span>
                    <span>+{target.targetPct}%</span>
                  </div>
                  <div className="text-[10px] text-sky-400 font-bold mt-1">
                    الهدف القادم 🎯
                  </div>
                </div>
              );
            }

            // 3. Pending Targets: Clean slate muted
            return (
              <div
                key={target.id}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-right text-slate-400 transition-all"
              >
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
                  <span>{target.label}</span>
                  <Circle className="w-2.5 h-2.5 text-slate-600" />
                </div>
                <div className="font-mono-numbers text-xs font-semibold text-slate-200">
                  {target.price}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono-numbers text-slate-400 mt-1">
                  <span>{profitStr}</span>
                  <span className="text-slate-300">+{target.targetPct}%</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  قيد المراقبة
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Collapsible Institutional AI Thesis */}
      <div className="mb-4 rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
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
          className="w-full px-4 py-2.5 bg-slate-900/90 flex items-center justify-between text-right border-b border-slate-800/80 hover:bg-slate-850 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BrainCircuit className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                تحليل الذكاء الاصطناعي والمؤشرات الكمية (AI Analysis)
              </span>
              <span className="text-[10px] text-slate-400">
                تقييم السيولة، الامتصاص، RSI والـ CVD
              </span>
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
              className="p-1 rounded text-slate-400 hover:text-emerald-400 transition-colors"
              title="إعادة فحص الذكاء الاصطناعي"
            >
              {isRefreshingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5" />}
            </button>
            {isAiExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {isAiExpanded && (
          <div className="p-4 space-y-3 text-xs leading-relaxed">
            {/* Summary */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200">
              <span className="font-bold text-emerald-400 block mb-1">الخلاصة الفنية:</span>
              <p>{signal.aiThesis.summary}</p>
            </div>

            {/* Grid of 4 Elements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="font-bold block mb-1 text-[11px] text-sky-400">
                  📊 تحليل دلتا الفوليوم (CVD Delta):
                </span>
                <p className="text-slate-300 text-[11px]">{signal.aiThesis.deltaAnalysis}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="font-bold block mb-1 text-[11px] text-purple-400">
                  🧲 امتصاص السيولة (Absorption):
                </span>
                <p className="text-slate-300 text-[11px]">{signal.aiThesis.absorption}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="font-bold block mb-1 text-[11px] text-amber-400">
                  ⚡ مؤشر RSI وتناغم الزخم:
                </span>
                <p className="text-slate-300 text-[11px]">{signal.aiThesis.rsiVolume}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="font-bold block mb-1 text-[11px] text-emerald-400">
                  ⚖️ معادلة العائد للمخاطرة (R:R):
                </span>
                <p className="text-slate-300 text-[11px]">{signal.aiThesis.riskReward}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono-numbers">
              <div className="flex items-center gap-3">
                <span>In-Sample Win Rate: <strong className="text-emerald-400">{signal.metrics.inSampleWinRate}%</strong></span>
                <span>Out-of-Sample: <strong className="text-purple-400">{signal.metrics.outOfSampleWinRate}%</strong></span>
              </div>
              <span className="text-[10px] text-slate-400">خصم رسوم 0.06% + انزلاق 0.02% مطبقة آلياً</span>
            </div>
          </div>
        )}
      </div>

      {/* 7. Action Row: Quick Copy + 1-Click Telegram Send */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>توقيت الإشارة: {new Date(signal.timestamp).toLocaleTimeString('ar-EG')}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Signal Button */}
          <button
            type="button"
            onClick={handleCopySignal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="نسخ تفاصيل الصفقة للتداول في بينانس أو بايبيت"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'تم النسخ ✔' : 'نسخ الصفقة'}</span>
          </button>

          {/* Telegram Status feedback */}
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

          {/* 1-Click Telegram Send */}
          <button
            type="button"
            onClick={handleSendTelegram}
            disabled={isSendingTelegram}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 border border-sky-500/40 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSendingTelegram ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>إرسال للتلجرام 🚀</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const VipSignalCard = React.memo(VipSignalCardComponent);
