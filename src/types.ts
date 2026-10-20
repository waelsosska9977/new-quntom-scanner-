export type CryptoPair = string;

export interface PairLiquidityInfo {
  symbol: string;
  quoteVolume24h: number; // in USDT ($)
  priceChangePercent: number;
  lastPrice: number;
  rank: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TargetLevel {
  id: number;
  label: string; // TP1, TP2, ...
  price: number;
  targetPct: number; // نسبة التحرك %
  profitAmount: number; // مقدار التيك بروفت (بالنقاط/الدولار)
  hit: boolean;
  isNext: boolean;
  hitTime?: number;
}

export interface QuantitativeMetrics {
  rsi: number;
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  atr: number;
  volumeDeltaPct: number; // + is buy delta, - is sell delta
  volumeRatio24h: number;
  absorptionDetected: boolean;
  orderFlowPressure: 'HIGH_BUY' | 'MODERATE_BUY' | 'NEUTRAL' | 'MODERATE_SELL' | 'HIGH_SELL';
  trendStrength: number; // 0 - 100
  // Train/Test Split Verification
  inSampleWinRate: number; // 70% split
  inSampleProfitFactor: number;
  outOfSampleWinRate: number; // 30% split
  outOfSampleProfitFactor: number;
  netReturnAfterFees: number; // 0.06% fees + slippage enforced
  maxDrawdownPct: number;
}

export interface AiTradeThesis {
  summary: string;
  deltaAnalysis: string;
  absorption: string;
  rsiVolume: string;
  riskReward: string;
  confidenceScore: number; // 0 - 100
  keyLevelsNote: string;
}

export interface TradeSignal {
  id: string;
  pair: CryptoPair;
  timeframe: Timeframe;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  riskRewardRatio: number;
  score: number; // 0 - 100
  pnlPercent: number;
  pnlPoints: number;
  targets: TargetLevel[];
  metrics: QuantitativeMetrics;
  aiThesis: AiTradeThesis;
  timestamp: number;
  status: 'ACTIVE' | 'HIT_TP' | 'STOPPED';
  highestPriceReached?: number;
  lowestPriceReached?: number;
  priceHistory: { time: string; price: number }[];
}

export interface AppConfig {
  codeCraftApiKey: string;
  codeCraftEndpoint: string;
  codeCraftModel: string;
  telegramBotToken: string;
  telegramChatId: string;
  autoSendTelegram: boolean; // إرسال تلقائي للإشارات فور ظهورها
  autoSendTargetHit: boolean; // إرسال تلقائي عند تحقيق أهداف الربح
  geminiApiKey: string;
  autoRefresh: boolean;
  refreshIntervalSeconds: number;
  soundEnabled: boolean;
  enforceFeeSlippage: boolean;
  transactionFeePct: number; // default 0.06%
  slippagePct: number; // default 0.02%
  trainTestSplitRatio: number; // default 0.70
}
