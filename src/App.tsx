import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, 
  Sliders, 
  Globe, 
  Terminal, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Sparkles, 
  Radio, 
  Send,
  Loader2,
  CheckCircle2,
  Bot,
  BellRing,
  AlertTriangle,
  X,
  Search,
  Coins,
  BarChart2,
  MessageSquare
} from 'lucide-react';
import { AppConfig, CryptoPair, PairLiquidityInfo, Timeframe, TradeSignal } from './types';
import { fetchBinanceKlines, BinancePriceStream, fetchTop50LiquidityPairs, TOP_50_DEFAULT_PAIRS } from './services/binance';
import { generateQuantitativeSignal } from './services/quantEngine';
import { generateAiTradeAnalysis } from './services/aiAnalyst';
import { sendSignalToTelegram, sendTargetHitToTelegram } from './services/telegram';
import { VipSignalCard } from './components/VipSignalCard';
import { MarketOverviewCard } from './components/MarketOverviewCard';
import { AiChatbotModal } from './components/AiChatbotModal';
import { ApiConfigModal } from './components/ApiConfigModal';
import { VercelExportModal } from './components/VercelExportModal';
import { PythonCodeModal } from './components/PythonCodeModal';
import { soundManager } from './utils/audio';

function formatVolumeDollar(vol: number): string {
  if (vol >= 1000000000) return `$${(vol / 1000000000).toFixed(2)}B`;
  if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
  return `$${vol.toLocaleString()}`;
}

const DEFAULT_CONFIG: AppConfig = {
  codeCraftApiKey: '',
  codeCraftEndpoint: 'https://codecraftapi.com/v1/chat/completions',
  codeCraftModel: 'gpt-4o-mini',
  telegramBotToken: '',
  telegramChatId: '',
  autoSendTelegram: true,
  autoSendTargetHit: true,
  geminiApiKey: '',
  autoRefresh: true,
  refreshIntervalSeconds: 60,
  soundEnabled: true,
  enforceFeeSlippage: true,
  transactionFeePct: 0.06,
  slippagePct: 0.02,
  trainTestSplitRatio: 0.70,
};

export default function App() {
  // 1. Persistent Configuration
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem('crypto_sniper_vip_config');
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_CONFIG;
  });

  // 2. State & Filters
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [liquidityPairs, setLiquidityPairs] = useState<PairLiquidityInfo[]>([]);
  const [scanBatchLimit, setScanBatchLimit] = useState<number>(50); // Default Top 50 by Liquidity!
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPair, setSelectedPair] = useState<CryptoPair | 'ALL'>('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('15m');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [onlyHighConfidence, setOnlyHighConfidence] = useState(false);

  // 3. UI & Modals State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isVercelExportOpen, setIsVercelExportOpen] = useState(false);
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activePythonPair, setActivePythonPair] = useState<CryptoPair>('SOLUSDT');
  const [isBroadcastingAll, setIsBroadcastingAll] = useState(false);
  const [telegramToast, setTelegramToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // 4. Engine & Live Connection State
  const [isScanning, setIsScanning] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(60);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastScannedTimestamp, setLastScannedTimestamp] = useState<number>(Date.now());

  const priceStreamRef = useRef<BinancePriceStream | null>(null);
  const dispatchedSignalsRef = useRef<Set<string>>(new Set());
  const hitTargetsDispatchedRef = useRef<Set<string>>(new Set());

  // Fetch real Top 50 Liquidity coins from Binance on mount
  useEffect(() => {
    fetchTop50LiquidityPairs().then((pairs) => {
      setLiquidityPairs(pairs);
    });
  }, []);

  // Save config to localStorage
  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem('crypto_sniper_vip_config', JSON.stringify(newConfig));
    } catch (e) {
      console.error('Failed to save config to localStorage:', e);
    }

    // If Telegram credentials are newly provided and auto-send is enabled, broadcast current active signals immediately
    if (newConfig.autoSendTelegram && newConfig.telegramBotToken && newConfig.telegramChatId && signals.length > 0) {
      signals.forEach((sig) => {
        const sigKey = `${sig.pair}_${sig.direction}_${sig.timeframe}_${Math.floor(sig.timestamp / (15 * 60 * 1000))}`;
        if (!dispatchedSignalsRef.current.has(sigKey)) {
          dispatchedSignalsRef.current.add(sigKey);
          sendSignalToTelegram(sig, newConfig.telegramBotToken, newConfig.telegramChatId).then(res => {
            if (res.success) {
              setTelegramToast({
                message: `🚀 تم إرسال صفقة ${sig.pair} تلقائياً للبوت مع مقادير التيك بروفت ونسبة التحرك!`,
                type: 'success',
              });
              setTimeout(() => setTelegramToast(null), 6000);
            }
          });
        }
      });
    }
  };

  // Perform full quantitative market scan across Top Liquidity coins
  const executeMarketScan = useCallback(async (customPairs?: string[]) => {
    setIsScanning(true);
    let targetPairs = customPairs;
    if (!targetPairs || targetPairs.length === 0) {
      if (liquidityPairs.length > 0) {
        targetPairs = liquidityPairs.slice(0, scanBatchLimit).map(p => p.symbol);
      } else {
        targetPairs = TOP_50_DEFAULT_PAIRS.slice(0, scanBatchLimit);
      }
    }

    const newSignals: TradeSignal[] = [];

    // Parallel scanning in chunks of 10 for lightning-fast execution
    const chunkSize = 10;
    for (let i = 0; i < targetPairs.length; i += chunkSize) {
      const chunk = targetPairs.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async (pair) => {
        try {
          const klines = await fetchBinanceKlines(pair, selectedTimeframe, 120);
          const signal = generateQuantitativeSignal(pair, selectedTimeframe, klines);

          // If user configured CodeCraft key, asynchronously fetch enhanced AI thesis
          if (config.codeCraftApiKey && config.codeCraftApiKey.trim().length > 0) {
            generateAiTradeAnalysis(signal, signal.metrics, config).then(thesis => {
              setSignals(prev => prev.map(s => s.id === signal.id ? { ...s, aiThesis: thesis, score: thesis.confidenceScore } : s));
            }).catch(() => {});
          }

          return signal;
        } catch (err) {
          console.error(`Error scanning ${pair}:`, err);
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      for (const s of chunkResults) {
        if (s) newSignals.push(s);
      }
    }

    setSignals(newSignals);
    setIsScanning(false);
    setLastScannedTimestamp(Date.now());
    setSecondsUntilRefresh(config.refreshIntervalSeconds || 60);

    // Auto-dispatch signals to Telegram upon appearance:
    if (config.autoSendTelegram && config.telegramBotToken && config.telegramChatId) {
      newSignals.forEach((sig) => {
        const sigKey = `${sig.pair}_${sig.direction}_${sig.timeframe}_${Math.floor(sig.timestamp / (15 * 60 * 1000))}`;
        if (!dispatchedSignalsRef.current.has(sigKey)) {
          dispatchedSignalsRef.current.add(sigKey);
          sendSignalToTelegram(sig, config.telegramBotToken, config.telegramChatId)
            .then((res) => {
              if (res.success) {
                setTelegramToast({
                  message: `🚀 تم إرسال صفقة ${sig.pair} (${sig.direction === 'BUY' ? 'شراء ↗' : 'بيع ↘'}) تلقائياً للبوت مع مقدار التيك بروفت ونسبة التحرك!`,
                  type: 'success',
                });
                setTimeout(() => setTelegramToast(null), 6000);
              }
            })
            .catch((err) => console.error('Telegram auto-dispatch error:', err));
        }
      });
    }

    // Play subtle alert if configured
    if (config.soundEnabled && newSignals.length > 0) {
      soundManager.playSignalAlert();
    }
  }, [selectedTimeframe, config, liquidityPairs, scanBatchLimit]);

  // Initial scan on mount or when timeframe changes
  useEffect(() => {
    executeMarketScan();
  }, [executeMarketScan]);

  // Setup Binance Live WebSocket Price Stream
  useEffect(() => {
    const handleLivePrice = (symbol: string, livePrice: number) => {
      setWsConnected(true);
      setSignals((prevSignals) => {
        return prevSignals.map((sig) => {
          if (sig.pair === symbol) {
            // Recalculate PnL
            let pnlPercent = 0;
            let pnlPoints = 0;
            if (sig.direction === 'BUY') {
              pnlPercent = ((livePrice - sig.entryPrice) / sig.entryPrice) * 100;
              pnlPoints = livePrice - sig.entryPrice;
            } else {
              pnlPercent = ((sig.entryPrice - livePrice) / sig.entryPrice) * 100;
              pnlPoints = sig.entryPrice - livePrice;
            }

            // Check Targets
            let newTargetHit = false;
            const updatedTargets = sig.targets.map((t) => {
              let hit = t.hit;
              if (!hit) {
                if (sig.direction === 'BUY' && livePrice >= t.price) {
                  hit = true;
                  newTargetHit = true;
                } else if (sig.direction === 'SELL' && livePrice <= t.price) {
                  hit = true;
                  newTargetHit = true;
                }
              }
              return { ...t, hit };
            });

            // If a new target was just hit, trigger celebration chime and auto-send alert to Telegram!
            if (newTargetHit) {
              if (config.soundEnabled) {
                soundManager.playTargetHitAlert();
              }

              if (config.autoSendTargetHit && config.telegramBotToken && config.telegramChatId) {
                const justHit = updatedTargets.find(t => t.hit && !hitTargetsDispatchedRef.current.has(`${sig.id}_TP${t.id}`));
                if (justHit) {
                  hitTargetsDispatchedRef.current.add(`${sig.id}_TP${justHit.id}`);
                  sendTargetHitToTelegram(sig, justHit, config.telegramBotToken, config.telegramChatId)
                    .then(res => {
                      if (res.success) {
                        setTelegramToast({
                          message: `🎯 تم إرسال إشعار تحقيق الهدف ${justHit.label} لزوج ${sig.pair} إلى تيليجرام تلقائياً!`,
                          type: 'success',
                        });
                        setTimeout(() => setTelegramToast(null), 5000);
                      }
                    })
                    .catch(e => console.error('Telegram target hit dispatch error:', e));
                }
              }
            }

            // Recalculate next target
            const nextIdx = updatedTargets.findIndex((t) => !t.hit);
            const targetsWithNext = updatedTargets.map((t, idx) => ({
              ...t,
              isNext: idx === nextIdx,
            }));

            // Update live price history for chart
            const history = sig.priceHistory ? [...sig.priceHistory] : [];
            const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            const lastEntry = history[history.length - 1];
            if (!lastEntry || Math.abs(lastEntry.price - livePrice) > 0.00001) {
              if (history.length >= 35) history.shift();
              history.push({ time: nowTime, price: livePrice });
            }

            return {
              ...sig,
              currentPrice: livePrice,
              pnlPercent: Number(pnlPercent.toFixed(2)),
              pnlPoints: Number(pnlPoints.toFixed(4)),
              targets: targetsWithNext,
              priceHistory: history,
            };
          }
          return sig;
        });
      });
    };

    const activeSymbols = liquidityPairs.length > 0 
      ? liquidityPairs.slice(0, scanBatchLimit).map(p => p.symbol)
      : TOP_50_DEFAULT_PAIRS.slice(0, scanBatchLimit);

    const stream = new BinancePriceStream(handleLivePrice);
    stream.connect(activeSymbols);
    priceStreamRef.current = stream;

    return () => {
      stream.disconnect();
    };
  }, [config.soundEnabled, liquidityPairs, scanBatchLimit]);

  // Dynamically update WebSocket stream when signals or active coins change
  useEffect(() => {
    if (priceStreamRef.current) {
      const activeSymbols = signals.length > 0
        ? Array.from(new Set(signals.map(s => s.pair)))
        : (liquidityPairs.length > 0 ? liquidityPairs.slice(0, scanBatchLimit).map(p => p.symbol) : TOP_50_DEFAULT_PAIRS.slice(0, scanBatchLimit));

      if (activeSymbols.length > 0) {
        priceStreamRef.current.updateSymbols(activeSymbols);
      }
    }
  }, [signals, liquidityPairs, scanBatchLimit]);

  // Auto-refresh 60s countdown timer
  useEffect(() => {
    if (!config.autoRefresh) return;

    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          executeMarketScan();
          return config.refreshIntervalSeconds || 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshIntervalSeconds, executeMarketScan]);

  // Filtered signals for rendering with search and pair filters
  const filteredSignals = signals.filter((s) => {
    if (selectedPair !== 'ALL' && s.pair !== selectedPair) return false;
    if (searchQuery.trim() && !s.pair.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
    if (directionFilter !== 'ALL' && s.direction !== directionFilter) return false;
    if (onlyHighConfidence && s.score < 80) return false;
    return true;
  });

  const handleUpdateSignal = (updatedSignal: TradeSignal) => {
    setSignals((prev) => prev.map((s) => (s.id === updatedSignal.id ? updatedSignal : s)));
  };

  // Open Python code modal for a given pair
  const openPythonModal = (pair: CryptoPair) => {
    setActivePythonPair(pair);
    setIsPythonModalOpen(true);
  };

  // Broadcast all currently visible signals to Telegram
  const handleBroadcastAllSignals = async () => {
    if (!config.telegramBotToken || !config.telegramChatId) {
      setTelegramToast({
        message: 'يرجى إدخال Bot Token و Chat ID أولاً في شاشة الإعدادات لتفعيل البث التلقائي!',
        type: 'error',
      });
      setIsConfigOpen(true);
      return;
    }

    setIsBroadcastingAll(true);
    let sentCount = 0;
    for (const sig of filteredSignals) {
      try {
        const res = await sendSignalToTelegram(sig, config.telegramBotToken, config.telegramChatId);
        if (res.success) sentCount++;
      } catch (e) {
        console.error(e);
      }
    }
    setIsBroadcastingAll(false);

    setTelegramToast({
      message: `🚀 تم بنجاح بث ${sentCount} صفقة VIP إلى تيليجرام متضمنة مقادير التيك بروفت ونسب التحرك!`,
      type: 'success',
    });
    setTimeout(() => setTelegramToast(null), 6000);
  };

  return (
    <div className="min-h-screen bg-[#0a0c13] text-slate-100 flex flex-col font-sans relative" dir="rtl">
      {/* Floating Telegram Toast Notification Banner */}
      {telegramToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl" dir="rtl">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 ${
            telegramToast.type === 'error'
              ? 'bg-rose-950/95 text-rose-200 border-rose-600/50 glow-red'
              : 'bg-[#0d1424]/95 text-sky-200 border-sky-500/50 glow-purple backdrop-blur-md'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-500/20 text-[#38bdf8]">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <p className="text-xs sm:text-sm font-bold leading-snug">{telegramToast.message}</p>
            </div>
            <button
              onClick={() => setTelegramToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0c101a]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3.5">
            <div className="relative p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 via-[#00f090] to-purple-600 shadow-lg shadow-[#00f090]/25">
              <Zap className="w-5 h-5 text-black stroke-[2.5]" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#00f090] animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-wide font-mono-numbers">
                  CRYPTO SNIPER VIP
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#ffb800] border border-[#ffb800]/40">
                  INSTITUTIONAL QUANT
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                نظام القنص والمسح الكمي المتقدم لصفقات الكريبتو بالذكاء الاصطناعي
              </p>
            </div>
          </div>

          {/* Quick Stats & Live Stream Indicator */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Telegram Auto-Send Indicator */}
            {config.telegramBotToken && config.telegramChatId ? (
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/50 border border-sky-500/30 text-xs font-mono-numbers text-sky-300"
                title="البث التلقائي مفعل لتيليجرام"
              >
                <span className={`w-2 h-2 rounded-full ${config.autoSendTelegram ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : 'bg-slate-500'}`} />
                <span className="hidden lg:inline">{config.autoSendTelegram ? 'البث التلقائي: نشط 🤖' : 'البث التلقائي: معطل'}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfigOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-mono-numbers text-amber-300 transition-all"
                title="اضغط لضبط بوت تيليجرام وتفعيل البث التلقائي"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="hidden md:inline">ربط بوت تيليجرام ⚠️</span>
              </button>
            )}

            {/* Broadcast All Active Signals Button */}
            <button
              type="button"
              onClick={handleBroadcastAllSignals}
              disabled={isBroadcastingAll || filteredSignals.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50"
              title="بث كل الصفقات النشطة الآن إلى تيليجرام"
            >
              {isBroadcastingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">بث للتلجرام 🚀</span>
            </button>

            {/* Live WebSocket status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono-numbers">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#00f090] shadow-[0_0_8px_#00f090]' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-slate-300 hidden sm:inline">
                {wsConnected ? 'Binance WS متصل' : 'جاري الاتصال...'}
              </span>
            </div>

            {/* Countdown / Auto Refresh */}
            {config.autoRefresh && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00f090]/10 border border-[#00f090]/30 text-[#00f090] text-xs font-mono-numbers">
                <Clock className="w-3.5 h-3.5" />
                <span>{secondsUntilRefresh}s</span>
              </div>
            )}

            {/* Manual Scan Button */}
            <button
              type="button"
              onClick={() => executeMarketScan()}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00f090] hover:bg-[#00f090]/90 text-black font-bold text-xs shadow-lg glow-green transition-all disabled:opacity-50"
              title="إعادة المسح الآن"
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">مسح الآن</span>
            </button>

            {/* AI Chatbot Header Button */}
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-[#00f090]/25 to-purple-500/20 hover:from-emerald-500/30 hover:to-purple-500/30 text-[#00f090] border border-[#00f090]/40 text-xs font-bold transition-all glow-green shadow-sm"
              title="فتح شات الذكاء الاصطناعي المؤسساتي"
            >
              <MessageSquare className="w-4 h-4 text-[#00f090]" />
              <span className="hidden sm:inline">شات الذكاء الاصطناعي 💬</span>
            </button>

            {/* Vercel 1-Click Export Button */}
            <button
              type="button"
              onClick={() => setIsVercelExportOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all glow-purple"
              title="تصدير ونشر فوري على Vercel"
            >
              <Globe className="w-4 h-4 text-purple-400" />
              <span className="hidden md:inline">نشر على Vercel ⚡</span>
            </button>

            {/* APIs & Config Hub Button */}
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all"
              title="مركز إعدادات الـ APIs"
            >
              <Sliders className="w-4 h-4 text-slate-300" />
              <span className="hidden md:inline">الإعدادات</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* 1. Top VIP Card: Available Trades Radar (Bullish ↗ vs Bearish ↘) */}
        <MarketOverviewCard
          signals={signals}
          onSelectPair={(pair) => {
            setSelectedPair(pair);
          }}
          onOpenChat={() => setIsChatOpen(true)}
          onBroadcastTelegram={handleBroadcastAllSignals}
        />

        {/* Banner: Institutional Metrics Bar */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121626] to-[#0c0f1a] border border-slate-800 shadow-lg text-right">
            <span className="text-[11px] text-slate-400 block mb-1">الصفقات المقتنصة (VIP Signals)</span>
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-black text-white font-mono-numbers">
                {signals.length}
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-[#00f090] text-xs font-bold font-mono-numbers">
                LIVE
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono-numbers block mt-1">
              متابعة مباشرة لحظية
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121626] to-[#0c0f1a] border border-slate-800 shadow-lg text-right">
            <span className="text-[11px] text-slate-400 block mb-1">نطاق مسح السيولة (Liquidity Pool)</span>
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-black text-[#00f090] font-mono-numbers">
                {scanBatchLimit} عملة 🏆
              </span>
              <span className="text-[10px] font-bold text-amber-400 font-mono-numbers">
                TOP 50
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono-numbers block mt-1">
              حجم 24س: {formatVolumeDollar(liquidityPairs.reduce((acc, p) => acc + (p.quoteVolume24h || 0), 0) || 18500000000)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121626] to-[#0c0f1a] border border-slate-800 shadow-lg text-right">
            <span className="text-[11px] text-slate-400 block mb-1">رسوم التداول المطبقة</span>
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono-numbers">
                0.06%
              </span>
              <span className="text-[10px] text-amber-500/80 font-mono-numbers">+ 0.02% انزلاق</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono-numbers block mt-1">
              Walk-Forward 70/30
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121626] to-[#0c0f1a] border border-slate-800 shadow-lg text-right">
            <span className="text-[11px] text-slate-400 block mb-1">مولد كود بايثون الكمي</span>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => openPythonModal(selectedPair === 'ALL' ? 'SOLUSDT' : selectedPair)}
                className="flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
              >
                <Terminal className="w-4 h-4" />
                <span>عرض كود vectorbt</span>
              </button>
              <span className="text-[10px] text-slate-500 font-mono-numbers">Train/Test</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono-numbers block mt-1">
              جاهز للتشغيل الفوري
            </span>
          </div>
        </section>

        {/* Filter & Control Bar */}
        <section className="p-4 rounded-2xl bg-[#0e121c] border border-slate-800/80 shadow-xl space-y-4">
          {/* Top Filter Row: Search, Scan Batch, Timeframe, Direction */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن أي عملة (مثال: SOL, BTC, PEPE, SUI, XRP...)"
                className="w-full bg-[#0a0c13] border border-slate-800 rounded-xl py-2 pr-9 pl-8 text-xs font-mono-numbers text-white focus:outline-none focus:border-[#00f090]/60 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scan Batch Selector: Top 10, 25, or 50 Coins */}
            <div className="flex items-center gap-1.5 bg-[#0a0c13] border border-slate-800 rounded-xl p-1 text-xs">
              <span className="text-slate-400 text-[11px] px-2 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                نطاق المسح:
              </span>
              {[
                { label: 'أفضل 50 عملة 🏆', value: 50 },
                { label: 'أفضل 25 عملة', value: 25 },
                { label: 'أفضل 10 عملات', value: 10 },
              ].map((batch) => (
                <button
                  key={batch.value}
                  type="button"
                  onClick={() => {
                    setScanBatchLimit(batch.value);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    scanBatchLimit === batch.value
                      ? 'bg-amber-500/20 text-[#ffb800] border border-[#ffb800]/40 glow-gold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {batch.label}
                </button>
              ))}
            </div>

            {/* Timeframe & Direction Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Timeframes */}
              <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 font-mono-numbers text-xs">
                {(['1m', '5m', '15m', '1h', '4h'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      selectedTimeframe === tf
                        ? 'bg-purple-600 text-white shadow-sm glow-purple'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Direction Filter */}
              <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDirectionFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    directionFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setDirectionFilter('BUY')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    directionFilter === 'BUY'
                      ? 'bg-[#00f090]/20 text-[#00f090] border border-[#00f090]/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  شراء ↗
                </button>
                <button
                  type="button"
                  onClick={() => setDirectionFilter('SELL')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    directionFilter === 'SELL'
                      ? 'bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  بيع ↘
                </button>
              </div>

              {/* VIP only filter */}
              <button
                type="button"
                onClick={() => setOnlyHighConfidence(!onlyHighConfidence)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                  onlyHighConfidence
                    ? 'bg-amber-500/20 text-[#ffb800] border-[#ffb800]/50 glow-gold'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-300'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>إشارات VIP فقط (&gt;80%)</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Scrollable 50 Liquidity Coin Selector Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-semibold">
                <BarChart2 className="w-3.5 h-3.5 text-[#00f090]" />
                أفضل 50 عملة من حيث السيولة وحجم التداول (مرتبة تنازلياً حسب الـ Volume):
              </span>
              <span className="text-[10px] text-slate-500 font-mono-numbers">
                انقر على أي عملة لتصفية نتائجها المباشرة
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedPair('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono-numbers whitespace-nowrap transition-all shrink-0 ${
                  selectedPair === 'ALL'
                    ? 'bg-gradient-to-r from-emerald-500 to-[#00f090] text-black shadow-md glow-green'
                    : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                الكل (عرض كافة الصفقات)
              </button>

              {(liquidityPairs.length > 0 ? liquidityPairs.slice(0, scanBatchLimit) : TOP_50_DEFAULT_PAIRS.slice(0, scanBatchLimit).map((sym, idx) => ({
                symbol: sym,
                quoteVolume24h: (50 - idx) * 110000000 + 45000000,
                priceChangePercent: 2.1,
                lastPrice: 100,
                rank: idx + 1,
              }))).map((coin) => {
                const isSelected = selectedPair === coin.symbol;
                return (
                  <button
                    key={coin.symbol}
                    type="button"
                    onClick={() => setSelectedPair(coin.symbol)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono-numbers whitespace-nowrap transition-all shrink-0 border ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500 to-[#00f090] text-black font-bold border-transparent glow-green shadow-lg'
                        : 'bg-[#0b0e17] hover:bg-[#121626] text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      #{coin.rank}
                    </span>
                    <span className="font-bold">{coin.symbol.replace('USDT', '')}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-black/80 font-bold' : 'text-slate-400'}`}>
                      {formatVolumeDollar(coin.quoteVolume24h)}
                    </span>
                    <span className={`text-[10px] font-bold ${
                      coin.priceChangePercent >= 0 
                        ? (isSelected ? 'text-black' : 'text-[#00f090]') 
                        : (isSelected ? 'text-black' : 'text-[#ff3366]')
                    }`}>
                      {coin.priceChangePercent >= 0 ? `+${coin.priceChangePercent}%` : `${coin.priceChangePercent}%`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Signals List */}
        <section className="space-y-6">
          {filteredSignals.length === 0 ? (
            <div className="p-12 text-center rounded-[20px] bg-[#0c101a] border border-slate-800/80 space-y-4">
              <div className="inline-flex p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
                <RadarIcon className="w-8 h-8 animate-radar text-[#00f090]" />
              </div>
              <h3 className="text-lg font-bold text-white">جاري مسح الأسواق واقتناص الإشارات المؤسساتية...</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                يتم فحص المؤشرات الكمية (EMA, RSI, Volume Delta, Absorption) وتطبيق قواعد التحقق الصارمة مع خصم 0.06% رسوم.
              </p>
              <button
                type="button"
                onClick={() => executeMarketScan()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00f090] text-black font-bold text-xs shadow-lg glow-green"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة الفحص الآن</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredSignals.map((signal) => (
                <VipSignalCard
                  key={signal.id}
                  signal={signal}
                  config={config}
                  onUpdateSignal={handleUpdateSignal}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/70 py-6 px-4 text-center text-xs text-slate-500 bg-[#07090e]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00f090]" />
            <span className="text-slate-400 font-mono-numbers">Crypto Sniper VIP Engine v2.5</span>
            <span>—</span>
            <span>جاهز للنشر بنقرة واحدة على Vercel</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono-numbers">
            <span>Mandated Fees: 0.06%</span>
            <span>•</span>
            <span>Walk-Forward Split: 70/30</span>
            <span>•</span>
            <span>Vectorized Quant Engine</span>
          </div>
        </div>
      </footer>

      {/* Floating AI Chatbot Action Button (Bottom Left) */}
      <button
        type="button"
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#00f090] to-emerald-400 text-black font-black text-xs shadow-2xl shadow-[#00f090]/40 hover:scale-105 active:scale-95 transition-all glow-green cursor-pointer"
        title="المحلل الذكي - اضغط للتحدث مع الذكاء الاصطناعي"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-black" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
        </div>
        <span className="font-bold">المحلل الذكي (AI Chat)</span>
      </button>

      {/* Modals */}
      <ApiConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
      />

      <AiChatbotModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        config={config}
        signals={signals}
        onSelectPair={(pair) => {
          setSelectedPair(pair);
          setIsChatOpen(false);
        }}
      />

      <VercelExportModal
        isOpen={isVercelExportOpen}
        onClose={() => setIsVercelExportOpen(false)}
      />

      <PythonCodeModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
        pair={activePythonPair}
        timeframe={selectedTimeframe}
      />
    </div>
  );
}

function RadarIcon(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <line x1="12" y1="12" x2="19" y2="5" />
    </svg>
  );
}
