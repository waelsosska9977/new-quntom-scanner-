import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Gauge,
  Target,
  Compass
} from 'lucide-react';
import { AppConfig, CryptoPair, PairLiquidityInfo, Timeframe, TradeSignal } from './types';
import { fetchBinanceKlines, BinancePriceStream, fetchTop50LiquidityPairs, TOP_50_DEFAULT_PAIRS } from './services/binance';
import { generateQuantitativeSignal } from './services/quantEngine';
import { generateAiTradeAnalysis } from './services/aiAnalyst';
import { sendSignalToTelegram, sendTargetHitToTelegram } from './services/telegram';
import { VipSignalCard } from './components/VipSignalCard';
import { MarketOverviewCard } from './components/MarketOverviewCard';
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
  const [activePythonPair, setActivePythonPair] = useState<CryptoPair>('SOLUSDT');
  const [isBroadcastingAll, setIsBroadcastingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'signals' | 'radar' | 'quant'>('signals');
  const [telegramToast, setTelegramToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // 4. Performance & Pagination State (Ultra-Fast 50 Coins Display)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10); // Default 10 per page for ultra-lightweight rendering
  const [globalChartsEnabled, setGlobalChartsEnabled] = useState<boolean>(false);

  // 5. Engine & Live Connection State
  const [isScanning, setIsScanning] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(60);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastScannedTimestamp, setLastScannedTimestamp] = useState<number>(Date.now());

  const priceStreamRef = useRef<BinancePriceStream | null>(null);
  const dispatchedSignalsRef = useRef<Set<string>>(new Set());
  const hitTargetsDispatchedRef = useRef<Set<string>>(new Set());
  const pendingPricesRef = useRef<Map<string, number>>(new Map());

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

    // Parallel scanning in chunks of 15 for lightning-fast execution
    const chunkSize = 15;
    for (let i = 0; i < targetPairs.length; i += chunkSize) {
      const chunk = targetPairs.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async (pair, pairIdx) => {
        try {
          const klines = await fetchBinanceKlines(pair, selectedTimeframe, 60);
          const signal = generateQuantitativeSignal(pair, selectedTimeframe, klines);

          // If user configured CodeCraft key, asynchronously fetch enhanced AI thesis for top 2 signals only to prevent network bottlenecks
          if (config.codeCraftApiKey && config.codeCraftApiKey.trim().length > 0 && i === 0 && pairIdx < 2) {
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

  // Setup Binance Live WebSocket Price Stream (Only connects once or on pair set change)
  useEffect(() => {
    const handleLivePrice = (symbol: string, livePrice: number) => {
      setWsConnected(true);
      pendingPricesRef.current.set(symbol, livePrice);
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
  }, [liquidityPairs.length, scanBatchLimit]);

  // Throttled price flusher: runs once every 1000ms to update all signals in a single smooth batch
  // This keeps the JavaScript main thread idle and responsive for instant chat typing and zero page freezing
  useEffect(() => {
    const timer = setInterval(() => {
      if (pendingPricesRef.current.size === 0) return;

      const updates = new Map(pendingPricesRef.current);
      pendingPricesRef.current.clear();

      setSignals((prevSignals) => {
        let hasChanges = false;
        const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const updated = prevSignals.map((sig) => {
          const livePrice = updates.get(sig.pair);
          if (livePrice === undefined || Math.abs(livePrice - sig.currentPrice) < 0.000001) {
            return sig;
          }

          hasChanges = true;

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

          // Celebration chime and auto-send alert to Telegram if a target was just hit
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
        });

        return hasChanges ? updated : prevSignals;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [config.soundEnabled, config.autoSendTargetHit, config.telegramBotToken, config.telegramChatId]);

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
  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      if (selectedPair !== 'ALL' && s.pair !== selectedPair) return false;
      if (searchQuery.trim() && !s.pair.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
      if (directionFilter !== 'ALL' && s.direction !== directionFilter) return false;
      if (onlyHighConfidence && s.score < 80) return false;
      return true;
    });
  }, [signals, selectedPair, searchQuery, directionFilter, onlyHighConfidence]);

  // Reset page to 1 whenever any filter or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPair, searchQuery, directionFilter, onlyHighConfidence, scanBatchLimit, selectedTimeframe]);

  const totalFiltered = filteredSignals.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedSignals = useMemo(() => {
    if (pageSize >= 50) return filteredSignals;
    const start = (safePage - 1) * pageSize;
    return filteredSignals.slice(start, start + pageSize);
  }, [filteredSignals, safePage, pageSize]);

  const handleUpdateSignal = useCallback((updatedSignal: TradeSignal) => {
    setSignals((prev) => prev.map((s) => (s.id === updatedSignal.id ? updatedSignal : s)));
  }, []);

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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs border border-sky-500/40 transition-all disabled:opacity-50"
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono-numbers">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-slate-300 hidden sm:inline">
                {wsConnected ? 'Binance WS متصل' : 'جاري الاتصال...'}
              </span>
            </div>

            {/* Countdown / Auto Refresh */}
            {config.autoRefresh && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-mono-numbers">
                <Clock className="w-3.5 h-3.5" />
                <span>{secondsUntilRefresh}s</span>
              </div>
            )}

            {/* Manual Scan Button */}
            <button
              type="button"
              onClick={() => executeMarketScan()}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all disabled:opacity-50"
              title="إعادة المسح الآن"
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">مسح الآن</span>
            </button>

            {/* Vercel 1-Click Export Button */}
            <button
              type="button"
              onClick={() => setIsVercelExportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all"
              title="تصدير ونشر فوري على Vercel"
            >
              <Globe className="w-4 h-4 text-purple-400" />
              <span className="hidden md:inline">Vercel ⚡</span>
            </button>

            {/* APIs & Config Hub Button */}
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
              title="مركز إعدادات الـ APIs"
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              <span className="hidden md:inline">الإعدادات</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        {/* Navigation View Switcher (Tabs) */}
        <div className="flex items-center justify-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 max-w-2xl mx-auto shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('signals')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'signals'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>🎯 صفقات القنص ({filteredSignals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'radar'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>🧭 رادار السوق (50 عملة)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quant')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'quant'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>📊 المعايير وبايثون</span>
          </button>
        </div>

        {/* View Mode 2: Market Radar */}
        {activeTab === 'radar' && (
          <MarketOverviewCard
            signals={signals}
            onSelectPair={(pair) => {
              setSelectedPair(pair);
              setActiveTab('signals');
            }}
            onBroadcastTelegram={handleBroadcastAllSignals}
          />
        )}

        {/* View Mode 3: Institutional Quant & Code */}
        {activeTab === 'quant' && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-right">
              <span className="text-xs text-slate-400 block mb-1">الصفقات المقتنصة (Active Signals)</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white font-mono-numbers">{signals.length}</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold font-mono-numbers">LIVE</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono-numbers block mt-1">متابعة لحظية من بينانس</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-right">
              <span className="text-xs text-slate-400 block mb-1">حوض السيولة (Liquidity Pool)</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-emerald-400 font-mono-numbers">{scanBatchLimit} عملة</span>
                <span className="text-xs font-bold text-amber-400 font-mono-numbers">TOP 50</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono-numbers block mt-1">
                حجم 24س: {formatVolumeDollar(liquidityPairs.reduce((acc, p) => acc + (p.quoteVolume24h || 0), 0) || 18500000000)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-right">
              <span className="text-xs text-slate-400 block mb-1">رسوم التداول المطبقة</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-amber-400 font-mono-numbers">0.06%</span>
                <span className="text-xs text-amber-500 font-mono-numbers">+ 0.02% انزلاق</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono-numbers block mt-1">Walk-Forward 70/30</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-right">
              <span className="text-xs text-slate-400 block mb-1">مولد كود بايثون الكمي</span>
              <div className="flex items-center justify-between mt-1">
                <button
                  type="button"
                  onClick={() => openPythonModal(selectedPair === 'ALL' ? 'SOLUSDT' : selectedPair)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-bold transition-colors"
                >
                  <Terminal className="w-4 h-4" />
                  <span>عرض كود vectorbt</span>
                </button>
                <span className="text-xs text-slate-400 font-mono-numbers">Train/Test</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono-numbers block mt-1">جاهز للتشغيل الفوري</span>
            </div>
          </section>
        )}

        {/* View Mode 1 (Default): Signals List & Filter Bar */}
        {activeTab === 'signals' && (
          <div className="space-y-4">
            {/* Quick Glance Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">إجمالي الصفقات</span>
                  <span className="text-lg font-black text-white font-mono-numbers">{filteredSignals.length} صفقة</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Target className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">صفقات الشراء (BUY)</span>
                  <span className="text-lg font-black text-emerald-400 font-mono-numbers">
                    {signals.filter(s => s.direction === 'BUY').length} صعود ↗
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">صفقات البيع (SELL)</span>
                  <span className="text-lg font-black text-rose-400 font-mono-numbers">
                    {signals.filter(s => s.direction === 'SELL').length} هبوط ↘
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">الفريم ونطاق المسح</span>
                  <span className="text-lg font-black text-amber-300 font-mono-numbers">
                    {selectedTimeframe.toUpperCase()} • {scanBatchLimit} عملة
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Filter & Control Bar */}
            <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-3.5">
              {/* Top Filter Row: Search, Scan Batch, Timeframe, Direction */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن أي عملة (مثال: SOL, BTC, PEPE, SUI, XRP...)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pr-9 pl-8 text-xs font-mono-numbers text-white focus:outline-none focus:border-emerald-500 transition-colors"
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

                {/* Scan Batch Selector */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
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
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        scanBatchLimit === batch.value
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
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
                  <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-0.5 font-mono-numbers text-xs">
                    {(['1m', '5m', '15m', '1h', '4h'] as Timeframe[]).map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setSelectedTimeframe(tf)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          selectedTimeframe === tf
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tf.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Direction Filter */}
                  <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setDirectionFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        directionFilter === 'ALL'
                          ? 'bg-slate-800 text-white font-bold'
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
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
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
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold'
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
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                      onlyHighConfidence
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>VIP فقط (&gt;80%)</span>
                  </button>

                  {/* Speed Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setGlobalChartsEnabled(!globalChartsEnabled)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                      globalChartsEnabled
                        ? 'bg-slate-800 text-slate-200 border-slate-700'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    }`}
                    title="التحكم في سرعة وتحميل المخططات البيانية لتخفيف الموقع"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>{globalChartsEnabled ? 'الشارت: معروض' : '⚡ وضع السرعة (خفيف)'}</span>
                  </button>

                  {/* Page Size Selector */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs font-mono-numbers">
                    <span className="text-slate-400 text-[10px] px-1.5">عرض:</span>
                    {[10, 25, 50].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                          pageSize === size
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {size === 50 ? 'الكل 50' : size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Scrollable 50 Liquidity Coin Selector Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-semibold">
                    <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                    تصفية سريعة بالعملة (أفضل 50 عملة سيولة):
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono-numbers">
                    انقر على أي عملة لتصفية نتائجها
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setSelectedPair('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono-numbers whitespace-nowrap transition-all shrink-0 ${
                      selectedPair === 'ALL'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
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
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                            : 'bg-slate-950 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isSelected ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}>
                          #{coin.rank}
                        </span>
                        <span className="font-bold">{coin.symbol.replace('USDT', '')}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>
                          {formatVolumeDollar(coin.quoteVolume24h)}
                        </span>
                        <span className={`text-[10px] font-bold ${
                          coin.priceChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
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
            <section className="space-y-4">
              {filteredSignals.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-slate-950 border border-slate-800 text-slate-500">
                    <RadarIcon className="w-8 h-8 animate-radar text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">جاري مسح الأسواق واقتناص الإشارات المؤسساتية...</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    يتم فحص المؤشرات الكمية (EMA, RSI, Volume Delta, Absorption) وتطبيق قواعد التحقق الصارمة مع خصم 0.06% رسوم.
                  </p>
                  <button
                    type="button"
                    onClick={() => executeMarketScan()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>إعادة الفحص الآن</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top Pagination Bar */}
                  {totalFiltered > pageSize && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono-numbers text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>
                          عرض الصفقات <strong className="text-white">{(safePage - 1) * pageSize + 1}</strong> -{' '}
                          <strong className="text-white">{Math.min(safePage * pageSize, totalFiltered)}</strong> من إجمالي{' '}
                          <strong className="text-emerald-400">{totalFiltered}</strong> صفقة متاحة
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" dir="ltr">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span className="text-xs">السابق</span>
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              safePage === p
                                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {p}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <span className="text-xs">التالي</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Signals Cards Grid */}
                  <div className="grid grid-cols-1 gap-4">
                    {paginatedSignals.map((signal, index) => (
                      <VipSignalCard
                        key={signal.id}
                        signal={signal}
                        config={config}
                        onUpdateSignal={handleUpdateSignal}
                        defaultShowChart={globalChartsEnabled || (safePage === 1 && index === 0)}
                      />
                    ))}
                  </div>

                  {/* Bottom Pagination Bar */}
                  {totalFiltered > pageSize && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono-numbers text-xs">
                      <div className="text-slate-400">
                        الصفحة <strong className="text-white">{safePage}</strong> من <strong className="text-white">{totalPages}</strong>
                      </div>

                      <div className="flex items-center gap-1.5" dir="ltr">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage((p) => Math.max(1, p - 1));
                            window.scrollTo({ top: 350, behavior: 'smooth' });
                          }}
                          disabled={safePage <= 1}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span className="text-xs">الصفحة السابقة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage((p) => Math.min(totalPages, p + 1));
                            window.scrollTo({ top: 350, behavior: 'smooth' });
                          }}
                          disabled={safePage >= totalPages}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <span className="text-xs">الصفحة التالية</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
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

      {/* Modals */}
      <ApiConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
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
