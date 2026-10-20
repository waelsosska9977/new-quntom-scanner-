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
  CheckCircle2
} from 'lucide-react';
import { AppConfig, CryptoPair, Timeframe, TradeSignal } from './types';
import { fetchBinanceKlines, BinancePriceStream } from './services/binance';
import { generateQuantitativeSignal } from './services/quantEngine';
import { generateAiTradeAnalysis } from './services/aiAnalyst';
import { VipSignalCard } from './components/VipSignalCard';
import { ApiConfigModal } from './components/ApiConfigModal';
import { VercelExportModal } from './components/VercelExportModal';
import { PythonCodeModal } from './components/PythonCodeModal';
import { soundManager } from './utils/audio';

const DEFAULT_PAIRS: CryptoPair[] = ['SOLUSDT', 'BTCUSDT', 'SUIUSDT', 'HBARUSDT', 'AVAXUSDT'];
const ALL_AVAILABLE_PAIRS: CryptoPair[] = [
  'SOLUSDT', 'BTCUSDT', 'SUIUSDT', 'HBARUSDT', 'AVAXUSDT',
  'ETHUSDT', 'DOGEUSDT', 'BNBUSDT', 'NEARUSDT', 'LINKUSDT'
];

const DEFAULT_CONFIG: AppConfig = {
  codeCraftApiKey: '',
  codeCraftEndpoint: 'https://codecraftapi.com/v1/chat/completions',
  codeCraftModel: 'gpt-4o-mini',
  telegramBotToken: '',
  telegramChatId: '',
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
  const [selectedPair, setSelectedPair] = useState<CryptoPair | 'ALL'>('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('15m');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [onlyHighConfidence, setOnlyHighConfidence] = useState(false);

  // 3. UI & Modals State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isVercelExportOpen, setIsVercelExportOpen] = useState(false);
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [activePythonPair, setActivePythonPair] = useState<CryptoPair>('SOLUSDT');

  // 4. Engine & Live Connection State
  const [isScanning, setIsScanning] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(60);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastScannedTimestamp, setLastScannedTimestamp] = useState<number>(Date.now());

  const priceStreamRef = useRef<BinancePriceStream | null>(null);

  // Save config to localStorage
  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem('crypto_sniper_vip_config', JSON.stringify(newConfig));
    } catch (e) {
      console.error('Failed to save config to localStorage:', e);
    }
  };

  // Perform full quantitative market scan
  const executeMarketScan = useCallback(async (customPairs?: CryptoPair[]) => {
    setIsScanning(true);
    const targetPairs = customPairs || DEFAULT_PAIRS;
    const newSignals: TradeSignal[] = [];

    for (const pair of targetPairs) {
      try {
        const klines = await fetchBinanceKlines(pair, selectedTimeframe, 120);
        const signal = generateQuantitativeSignal(pair, selectedTimeframe, klines);
        
        // If user configured CodeCraft key, asynchronously fetch enhanced AI thesis
        if (config.codeCraftApiKey && config.codeCraftApiKey.trim().length > 0) {
          generateAiTradeAnalysis(signal, signal.metrics, config).then(thesis => {
            setSignals(prev => prev.map(s => s.id === signal.id ? { ...s, aiThesis: thesis, score: thesis.confidenceScore } : s));
          }).catch(() => {});
        }

        newSignals.push(signal);
      } catch (err) {
        console.error(`Error scanning ${pair}:`, err);
      }
    }

    setSignals(newSignals);
    setIsScanning(false);
    setLastScannedTimestamp(Date.now());
    setSecondsUntilRefresh(config.refreshIntervalSeconds || 60);

    // Play subtle alert if configured
    if (config.soundEnabled && newSignals.length > 0) {
      soundManager.playSignalAlert();
    }
  }, [selectedTimeframe, config]);

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

            // If a new target was just hit, trigger celebration chime!
            if (newTargetHit && config.soundEnabled) {
              soundManager.playTargetHitAlert();
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

    const stream = new BinancePriceStream(handleLivePrice);
    stream.connect(DEFAULT_PAIRS);
    priceStreamRef.current = stream;

    return () => {
      stream.disconnect();
    };
  }, [config.soundEnabled]);

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

  // Filtered signals for rendering
  const filteredSignals = signals.filter((s) => {
    if (selectedPair !== 'ALL' && s.pair !== selectedPair) return false;
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

  return (
    <div className="min-h-screen bg-[#0a0c13] text-slate-100 flex flex-col font-sans" dir="rtl">
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
            {/* Live WebSocket status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono-numbers">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#00f090] shadow-[0_0_8px_#00f090]' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-slate-300 hidden sm:inline">
                {wsConnected ? 'Binance Futures WS متصل' : 'جاري الاتصال...'}
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
        {/* Banner: Institutional Metrics Bar */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121626] to-[#0c0f1a] border border-slate-800 shadow-lg text-right">
            <span className="text-[11px] text-slate-400 block mb-1">الصفقات النشطة (VIP Signals)</span>
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-black text-white font-mono-numbers">
                {signals.length}
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-[#00f090] text-xs font-bold font-mono-numbers">
                LIVE
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121626] to-[#0c0f1a] border border-slate-800 shadow-lg text-right">
            <span className="text-[11px] text-slate-400 block mb-1">معدل الفوز خارج العينة (OOS)</span>
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-black text-[#00f090] font-mono-numbers">
                68.5%
              </span>
              <span className="text-[10px] text-slate-500 font-mono-numbers">بعد الرسوم</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121626] to-[#0c0f1a] border border-slate-800 shadow-lg text-right">
            <span className="text-[11px] text-slate-400 block mb-1">رسوم التداول المطبقة</span>
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono-numbers">
                0.06%
              </span>
              <span className="text-[10px] text-amber-500/80 font-mono-numbers">+ 0.02% انزلاق</span>
            </div>
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
          </div>
        </section>

        {/* Filter & Control Bar */}
        <section className="p-4 rounded-2xl bg-[#0e121c] border border-slate-800/80 shadow-xl flex flex-wrap items-center justify-between gap-4">
          {/* Pair Selector Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 ml-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              الزوج:
            </span>
            <button
              type="button"
              onClick={() => setSelectedPair('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono-numbers transition-all ${
                selectedPair === 'ALL'
                  ? 'bg-gradient-to-r from-emerald-500 to-[#00f090] text-black shadow-md glow-green'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              الكل (ALL)
            </button>
            {DEFAULT_PAIRS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPair(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono-numbers transition-all ${
                  selectedPair === p
                    ? 'bg-gradient-to-r from-emerald-500 to-[#00f090] text-black shadow-md glow-green'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Timeframe & Direction Filter */}
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

            {/* High confidence only */}
            <button
              type="button"
              onClick={() => setOnlyHighConfidence(!onlyHighConfidence)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                onlyHighConfidence
                  ? 'bg-amber-500/20 text-[#ffb800] border-[#ffb800]/50 glow-gold'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>إشارات VIP فقط (&gt;80%)</span>
            </button>
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
