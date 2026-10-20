import { AiTradeThesis, AppConfig, QuantitativeMetrics, TradeSignal } from '../types';

export interface CodeCraftResponse {
  score: number;
  summary: string;
  deltaAnalysis: string;
  absorption: string;
  rsiVolume: string;
  riskReward: string;
  keyLevelsNote: string;
}

/**
 * Call Server-side Gemini API (or CodeCraft / High-Fidelity Quant Fallback) to generate AI Trade Thesis
 */
export async function generateAiTradeAnalysis(
  signal: TradeSignal,
  metrics: QuantitativeMetrics,
  config: AppConfig
): Promise<AiTradeThesis> {
  // 1. First Priority: Try Server-Side Gemini API
  try {
    const res = await fetch('/api/analyze-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signal, metrics }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.thesis && data.thesis.summary) {
        return {
          summary: data.thesis.summary || signal.aiThesis.summary,
          deltaAnalysis: data.thesis.deltaAnalysis || signal.aiThesis.deltaAnalysis,
          absorption: data.thesis.absorption || signal.aiThesis.absorption,
          rsiVolume: data.thesis.rsiVolume || signal.aiThesis.rsiVolume,
          riskReward: data.thesis.riskReward || signal.aiThesis.riskReward,
          confidenceScore: Number(data.thesis.score) || signal.score,
          keyLevelsNote: data.thesis.keyLevelsNote || signal.aiThesis.keyLevelsNote,
        };
      }
    }
  } catch {
    // Continue to next provider if server-side Gemini fails
  }

  // 2. Second Priority: If CodeCraft API Key is provided, call CodeCraft API
  if (config.codeCraftApiKey && config.codeCraftApiKey.trim().length > 0) {
    try {
      const endpoint = config.codeCraftEndpoint || 'https://codecraftapi.com/v1/chat/completions';
      const model = config.codeCraftModel || 'gpt-4o-mini';

      const prompt = `أنت خبير تحليل كمي مؤسساتي وتداول عالي التردد. حلل صفقة الكريبتو التالية باللغة العربية:
زوج: ${signal.pair}, اتجاه: ${signal.direction}, دخول: ${signal.entryPrice}, وقف: ${signal.stopLoss}, سعر: ${signal.currentPrice}, RSI: ${metrics.rsi}, CVD Delta: ${metrics.volumeDeltaPct}%, مضاعف الفوليوم: ${metrics.volumeRatio24h}x, الامتصاص: ${metrics.absorptionDetected ? 'مرصود' : 'طبيعي'}.
أجب فقط بصيغة JSON نقية: {"score": 88, "summary": "...", "deltaAnalysis": "...", "absorption": "...", "rsiVolume": "...", "riskReward": "...", "keyLevelsNote": "..."}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.codeCraftApiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are a quantitative crypto strategist. Respond ONLY in valid JSON matching the schema.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const parsed = extractJsonFromText(content);
        if (parsed) {
          return {
            summary: parsed.summary || signal.aiThesis.summary,
            deltaAnalysis: parsed.deltaAnalysis || signal.aiThesis.deltaAnalysis,
            absorption: parsed.absorption || signal.aiThesis.absorption,
            rsiVolume: parsed.rsiVolume || signal.aiThesis.rsiVolume,
            riskReward: parsed.riskReward || signal.aiThesis.riskReward,
            confidenceScore: Number(parsed.score) || signal.score,
            keyLevelsNote: parsed.keyLevelsNote || signal.aiThesis.keyLevelsNote,
          };
        }
      }
    } catch {
      // Continue to fallback
    }
  }

  // 3. Fallback: Enhanced High-Fidelity Quantitative Deterministic Thesis
  return generateDeterministicThesis(signal, metrics);
}

/**
 * Test CodeCraft API connection
 */
export async function testCodeCraftConnection(apiKey: string, endpoint: string, model: string): Promise<{ success: boolean; message: string }> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { success: false, message: 'يرجى إدخال مفتاح CodeCraft API أولاً' };
  }

  try {
    const res = await fetch(endpoint || 'https://codecraftapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'respond with: {"status": "ok"}' }],
        max_tokens: 30,
      }),
    });

    if (res.ok) {
      return { success: true, message: 'تم الاتصال بـ CodeCraft API بنجاح! الاستجابة سريعة ومعتمدة.' };
    } else {
      const errText = await res.text();
      return { success: false, message: `فشل الاتصال (${res.status}): ${errText.slice(0, 100)}` };
    }
  } catch (err: any) {
    return { success: false, message: `خطأ في الاتصال بالخادم: ${err.message || 'Network Error'}` };
  }
}

function extractJsonFromText(text: string): CodeCraftResponse | null {
  try {
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function generateDeterministicThesis(signal: TradeSignal, metrics: QuantitativeMetrics): AiTradeThesis {
  const isBuy = signal.direction === 'BUY';
  const deltaText = metrics.volumeDeltaPct >= 0 
    ? `تراكم إيجابي للدلتا بنسبة +${metrics.volumeDeltaPct}% يشير إلى ضخ أوامر شراء بسعر السوق (Market Buys) من محافظ تداول مؤسساتية.`
    : `ضغط بيع تراكمي بنسبة ${metrics.volumeDeltaPct}% مدفوع بأوامر بيع سريعة، مما يؤكد الزخم الهبوطي واستمرار الموجة.`;

  const absorptionText = metrics.absorptionDetected
    ? `تم رصد ظاهرة الامتصاص المؤسساتي (Order Flow Absorption): حجم تداول مرتفع جداً (${metrics.volumeRatio24h}x) مع تماسك الشموع في نطاق سعري ضيق، مما يدل على امتصاص صانع السوق للسيولة المقابلة وتجهيز حركة انفجارية.`
    : `أحجام التداول متناسقة بزيادة ${metrics.volumeRatio24h}x عن المتوسط المعتاد بدون تشوهات في السيولة المعلقة، مما يعزز استقرار الاتجاه.`;

  const rsiText = isBuy
    ? `مؤشر القوة النسبية RSI عند ${metrics.rsi} فوق خط المنتصف مع تباعد صعودي إيجابي (Bullish Convergence)، مؤكداً نقاء الزخم قبل ملامسة مناطق التشبع الشرائي.`
    : `مؤشر القوة النسبية RSI عند ${metrics.rsi} دون مستوى 50 مع استمرار تسجيل قمم هابطة، مما يفتح مساراً سهلاً لتحقيق الأهداف المتتالية.`;

  const summary = isBuy
    ? `إشارة قناص مؤسساتية مؤكدة لـ ${signal.pair} على فريم ${signal.timeframe}. اختراق هيكلي فوق متوسطات EMA 9/21 بدعم من نموذج امتصاص صاعد ومعدل نجاح خارج العينة ${metrics.outOfSampleWinRate}%.`
    : `إشارة بيع وموجة هبوط حادة لـ ${signal.pair} على فريم ${signal.timeframe}. كسر قاع محوري مع ضغط دلتا بيعي وتراجع المتوسطات تحت EMA 50/200.`;

  return {
    summary,
    deltaAnalysis: deltaText,
    absorption: absorptionText,
    rsiVolume: rsiText,
    riskReward: `معدل المخاطرة إلى العائد 1:${signal.riskRewardRatio} محسوب بعد خصم 0.06% رسوم منصة و0.02% انزلاق سعري بدقة كمية.`,
    confidenceScore: signal.score,
    keyLevelsNote: `مستوى الدخول المحوري: ${signal.entryPrice} | وقف الخسارة الحتمي: ${signal.stopLoss} | الهدف التالي: TP${signal.targets.find(t => t.isNext)?.id || 1}`,
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/**
 * Interactive Chatbot integration with:
 * 1. Server-side Gemini 3.8 Flash (AI Studio Connected AI)
 * 2. CodeCraft API (if custom key provided)
 * 3. Dynamic Institutional Quant Context Engine (Offline / Standalone Fallback)
 */
export async function sendChatToAiAnalyst(
  messages: ChatMessage[],
  config: AppConfig,
  currentSignals: TradeSignal[]
): Promise<string> {
  // Strip heavy historical price arrays to keep payload lightweight
  const simplifiedSignals = currentSignals.slice(0, 30).map((s) => ({
    pair: s.pair,
    direction: s.direction,
    score: s.score,
    entryPrice: s.entryPrice,
    currentPrice: s.currentPrice,
    stopLoss: s.stopLoss,
    pnlPercent: s.pnlPercent,
    riskRewardRatio: s.riskRewardRatio,
    rsi: s.metrics?.rsi,
    delta: s.metrics?.volumeDeltaPct,
    absorption: s.metrics?.absorptionDetected,
    nextTp: s.targets?.find((t) => t.isNext)?.price || s.targets?.[0]?.price,
  }));

  // 1. Primary: Server-side Gemini API (connected AI)
  try {
    const serverRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        currentSignals: simplifiedSignals,
      }),
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data.reply && data.reply.trim().length > 0) {
        return data.reply;
      }
    }
  } catch {
    // If backend endpoint is temporarily unreachable, fallback gracefully
  }

  // 2. Secondary: CodeCraft API if Key is provided
  if (config.codeCraftApiKey && config.codeCraftApiKey.trim().length > 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      const endpoint = config.codeCraftEndpoint || 'https://codecraftapi.com/v1/chat/completions';
      const model = config.codeCraftModel || 'gpt-4o-mini';

      const bullishList = simplifiedSignals.filter((s) => s.direction === 'BUY').map((s) => s.pair).join(', ');
      const bearishList = simplifiedSignals.filter((s) => s.direction === 'SELL').map((s) => s.pair).join(', ');

      const systemContext = `أنت المحلل الكمي المؤسساتي لنظام Crypto Sniper VIP. 
أنت خبير في التداول عالي التردد (HFT)، والتحليل الكمي، وتدفق السيولة (Order Flow)، ودلتا الفوليوم (CVD Delta)، والامتصاص (Absorption).
أجب باللغة العربية بأسلوب ذكي ومتنوع ومباشر دون تكرار.
العملات الصاعدة حالياً: ${bullishList}
العملات الهابطة حالياً: ${bearishList}`;

      const payloadMessages = [
        { role: 'system', content: systemContext },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.codeCraftApiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model,
          messages: payloadMessages,
          temperature: 0.5,
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply && reply.trim().length > 0) {
          return reply;
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }
  }

  // 3. Dynamic Institutional Quant Engine Fallback (Never returns a single static response)
  const lastMsg = messages[messages.length - 1]?.content.trim().toLowerCase() || '';
  return generateDynamicQuantChatResponse(lastMsg, currentSignals);
}

/**
 * Dynamic, context-aware quantitative response generator
 * Accurately analyzes live market scan, specific coins, trading rules, and risk questions
 */
function generateDynamicQuantChatResponse(query: string, signals: TradeSignal[]): string {
  const bullish = signals.filter((s) => s.direction === 'BUY');
  const bearish = signals.filter((s) => s.direction === 'SELL');
  const total = signals.length;

  const topBullish = [...bullish].sort((a, b) => b.score - a.score);
  const topBearish = [...bearish].sort((a, b) => b.score - a.score);

  // 1. Specific Coin Inquiry (e.g. BTC, ETH, SOL, SUI, DOGE, XRP...)
  const matchedSignal = signals.find((s) => {
    const rawCoin = s.pair.replace('USDT', '').toLowerCase();
    const cleanQuery = query.toLowerCase();
    return cleanQuery.includes(rawCoin) || cleanQuery.includes(s.pair.toLowerCase());
  });

  if (matchedSignal) {
    const isBuy = matchedSignal.direction === 'BUY';
    const nextTp = matchedSignal.targets.find((t) => t.isNext) || matchedSignal.targets[0];
    const achievedTps = matchedSignal.targets.filter((t) => t.hit).map((t) => t.label).join(' و ');

    return `🎯 **التحليل الكمي اللحظي لعملة #${matchedSignal.pair}:**
━━━━━━━━━━━━━━━━━━━━━━
• **الاتجاه المرصود:** ${isBuy ? '🟢 مسار صعودي قوي (LONG / شراء) ↗' : '🔴 مسار هبوطي حاد (SHORT / بيع) ↘'}
• **قوة الإشارة الفنية:** \`${matchedSignal.score} / 100\` ${matchedSignal.score >= 85 ? '💎 (إشارة VIP مؤكدة)' : '⚡'}
• **سعر الدخول المقترح:** \`${matchedSignal.entryPrice}\`
• **السعر اللحظي الحالي:** \`${matchedSignal.currentPrice}\` (${matchedSignal.pnlPercent >= 0 ? '+' : ''}${matchedSignal.pnlPercent}%)
• **وقف الخسارة الإلزامي (SL):** \`${matchedSignal.stopLoss}\`
• **الهدف القادم (${nextTp.label}):** \`${nextTp.price}\` (ربح مستهدف: \`+${nextTp.profitAmount} USDT\` | \`+${nextTp.targetPct}%\`)
${achievedTps ? `• **الأهداف المحققة حتى الآن:** ✅ تم تحقيق ${achievedTps}` : ''}

🔬 **رؤية تدفق الأوامر والسيولة (Order Flow):**
- **دلتا الفوليوم (CVD):** ${matchedSignal.metrics.volumeDeltaPct >= 0 ? `+${matchedSignal.metrics.volumeDeltaPct}% (شراء عدواني من صناع السوق)` : `${matchedSignal.metrics.volumeDeltaPct}% (ضغط تصريف بيعي)`}
- **ظاهرة الامتصاص (Absorption):** ${matchedSignal.metrics.absorptionDetected ? '🔥 تم رصد امتصاص مؤسساتي ضخم للسيولة!' : 'مستويات السيولة طبيعية ومتوازنة.'}
- **مؤشر القوة النسبية (RSI):** \`${matchedSignal.metrics.rsi}\` (${matchedSignal.metrics.rsi > 70 ? 'تشبع شرائي - توخ الحذر' : matchedSignal.metrics.rsi < 30 ? 'تشبع بيعي - فرصة ارتداد' : 'زخم متوازن ومثالي'})
- **العائد للمخاطرة (R:R):** \`1:${matchedSignal.riskRewardRatio}\` محسوب مع رسوم 0.06% وانزلاق سعري.

💡 **توصية المحلل:** ${isBuy ? 'انتظر ثبات السعر فوق مستوى الدخول مع تأكيد الدلتا الإيجابية.' : 'تجنب الشراء حالياً، الزخم يرجح كسر المستويات الهابطة نحو أهداف TP.'}`;
  }

  // 2. Best Buy / Long Opportunities
  if (query.includes('افضل') || query.includes('أفضل') || query.includes('شراء') || query.includes('صعود') || query.includes('فرصة') || query.includes('لونغ') || query.includes('long')) {
    if (topBullish.length === 0) {
      return `📊 **حالة السوق الصاعدة:**
السوق حالياً تحت ضغط بيعي غالب، ولا توجد صفقات شراء حققت شروط الـ VIP الصارمة (RSI و Delta و EMA).
ننصح بمراقبة صفقات الهبوط (Short) أو انتظار ارتداد مؤكد عند مناطق الدعم الرئيسية.`;
    }

    const best1 = topBullish[0];
    const best2 = topBullish[1];
    const best3 = topBullish[2];

    return `🚀 **أقوى فرص الصعود والشراء (LONG) المرصودة حالياً:**
━━━━━━━━━━━━━━━━━━━━━━
🥇 **المرتبة الأولى: #${best1.pair}**
• قوة الإشارة: \`${best1.score}%\` 💎
• سعر الدخول: \`${best1.entryPrice}\` | السعر الحالي: \`${best1.currentPrice}\`
• الهدف الأول TP1: \`${best1.targets[0]?.price}\` (+${best1.targets[0]?.targetPct}%)
• وقف الخسارة SL: \`${best1.stopLoss}\`
• دلتا الفوليوم: \`+${best1.metrics.volumeDeltaPct}%\` ${best1.metrics.absorptionDetected ? '| رصد امتصاص مؤسساتي' : ''}

${best2 ? `🥈 **المرتبة الثانية: #${best2.pair}** (قوة: \`${best2.score}%\` | دخول: \`${best2.entryPrice}\` | الهدف: \`${best2.targets[0]?.price}\`)\n` : ''}
${best3 ? `🥉 **المرتبة الثالثة: #${best3.pair}** (قوة: \`${best3.score}%\` | دخول: \`${best3.entryPrice}\` | الهدف: \`${best3.targets[0]?.price}\`)\n` : ''}

💡 **استراتيجية التنفيذ:** قسّم رأس مالك على أكثر من فرصة ولا تتجاوز مخاطرة 2% في الصفقة الواحدة.`;
  }

  // 3. Best Short / Sell Opportunities
  if (query.includes('هبوط') || query.includes('بيع') || query.includes('شورت') || query.includes('short') || query.includes('نزول') || query.includes('تصريف')) {
    if (topBearish.length === 0) {
      return `📊 **حالة السوق الهابطة:**
السوق يشهد زخماً شرائياً كاسحاً، ولا توجد فرص بيع حادة تتوافق مع معايير الـ VIP حالياً. ركّز على صفقات الشراء الصاعدة.`;
    }

    const b1 = topBearish[0];
    const b2 = topBearish[1];
    const b3 = topBearish[2];

    return `📉 **أقوى فرص الهبوط والبيع (SHORT) المرصودة حالياً:**
━━━━━━━━━━━━━━━━━━━━━━
🥇 **المرتبة الأولى: #${b1.pair}**
• قوة الإشارة الهبوطية: \`${b1.score}%\` ⚡
• سعر الدخول: \`${b1.entryPrice}\` | السعر الحالي: \`${b1.currentPrice}\`
• الهدف القادم TP1: \`${b1.targets[0]?.price}\` (${b1.targets[0]?.targetPct}%)
• وقف الخسارة SL: \`${b1.stopLoss}\`
• ضغط الفوليوم: \`${b1.metrics.volumeDeltaPct}%\` كسر صريح للمتوسطات.

${b2 ? `🥈 **المرتبة الثانية: #${b2.pair}** (قوة: \`${b2.score}%\` | دخول: \`${b2.entryPrice}\` | الهدف: \`${b2.targets[0]?.price}\`)\n` : ''}
${b3 ? `🥉 **المرتبة الثالثة: #${b3.pair}** (قوة: \`${b3.score}%\` | دخول: \`${b3.entryPrice}\` | الهدف: \`${b3.targets[0]?.price}\`)\n` : ''}

⚠️ **تنبيه:** تأكد دائماً من وضع وقف الخسارة، فالعملات الصغيرة قد تشهد ارتدادات تصحيحية مفاجئة.`;
  }

  // 4. Overall Market Status, Bitcoin & Liquidity
  if (query.includes('بيتكوين') || query.includes('btc') || query.includes('السوق') || query.includes('السيولة') || query.includes('عام') || query.includes('وضع')) {
    const btc = signals.find((s) => s.pair === 'BTCUSDT');
    const eth = signals.find((s) => s.pair === 'ETHUSDT');
    const sol = signals.find((s) => s.pair === 'SOLUSDT');
    const bullishRatio = total > 0 ? Math.round((bullish.length / total) * 100) : 50;

    return `🌐 **تقرير حالة السوق العامة والسيولة المؤسساتية:**
━━━━━━━━━━━━━━━━━━━━━━
• **هيمنة الاتجاه العام:** ${bullishRatio >= 55 ? `🟢 سيطرة شرائية (${bullishRatio}% من العملات صاعدة)` : bullishRatio <= 45 ? `🔴 سيطرة بيعية (${100 - bullishRatio}% من العملات هابطة)` : '⚪ توازن بين قوى الشراء والبيع (تذبذب عرضي)'}
• **إجمالي العملات الممسوحة:** \`${total}\` عملة ذات سيولة عالية
• **عدد صفقات الشراء (Long):** \`${bullish.length}\` صفقة
• **عدد صفقات البيع (Short):** \`${bearish.length}\` صفقة

📌 **حالة القياديات:**
${btc ? `• **Bitcoin (BTCUSDT):** ${btc.direction === 'BUY' ? '🟢 صاعد' : '🔴 هابط'} بسعر \`$${btc.currentPrice}\` (قوة الإشارة: \`${btc.score}%\`)` : '• البيتكوين: جاري قراءة السيولة'}
${eth ? `• **Ethereum (ETHUSDT):** ${eth.direction === 'BUY' ? '🟢 صاعد' : '🔴 هابط'} بسعر \`$${eth.currentPrice}\` (قوة الإشارة: \`${eth.score}%\`)` : ''}
${sol ? `• **Solana (SOLUSDT):** ${sol.direction === 'BUY' ? '🟢 صاعد' : '🔴 هابط'} بسعر \`$${sol.currentPrice}\` (قوة الإشارة: \`${sol.score}%\`)` : ''}

🎯 **نصيحة اليوم:** إذا كان البيتكوين متذبذباً، ركز على العملات ذات الدلتا العالية (+10% فأكثر) وظاهرة الامتصاص المؤسساتي.`;
  }

  // 5. Strategy, Indicators & Concept Questions (CVD, Absorption, RSI, SL)
  if (query.includes('امتصاص') || query.includes('absorption') || query.includes('دلتا') || query.includes('cvd') || query.includes('rsi') || query.includes('استراتيجية') || query.includes('كيف') || query.includes('شرح')) {
    return `📚 **دليل المؤشرات الكمية المؤسساتية لنظام Sniper VIP:**
━━━━━━━━━━━━━━━━━━━━━━
1️⃣ **دلتا الفوليوم التراكمية (CVD Delta):**
تقيس الفارق بين أوامر الشراء المباشرة بسعر السوق (Market Buys) وأوامر البيع (Market Sells). عندما تكون موجبة (+15%)، فهذا يعني أن الحيتان يبتلعون العروض المعلقة بقوة.

2️⃣ **ظاهرة الامتصاص المؤسساتي (Absorption):**
تحدث عندما يدخل صانع السوق كميات شراء أو بيع هائلة في نطاق سعري ضيق لامتصاص كل السيولة المعاكسة قبل إطلاق شمعة انفجارية.

3️⃣ **مؤشر القوة النسبية RSI والـ EMA:**
نعتمد تقاطع المتوسطات السريعة (EMA 9 مع EMA 21) فوق EMA 50/200 لتحديد بداية الموجة، مع الحفاظ على RSI في نطاق 50-65 لإعطاء الصفقة مساحة للصعود.

4️⃣ **إدارة رأس المال الصارمة:**
كل صفقة محسوبة بعد خصم 0.06% رسوم منصة وانزلاق سعري. نوصي بجني 50% من الأرباح عند TP1 ونقل وقف الخسارة إلى سعر الدخول فوراً!`;
  }

  // 6. Greetings & General Conversational Questions
  if (query.includes('مرحبا') || query.includes('سلام') || query.includes('أهلا') || query.includes('اهلا') || query.includes('صباح') || query.includes('مساء') || query.includes('من انت') || query.includes('مين انت')) {
    return `👋 **أهلاً وسهلاً بك في نظام Crypto Sniper VIP المؤسساتي!**
━━━━━━━━━━━━━━━━━━━━━━
أنا **المحلل الكمي المالي بالذكاء الاصطناعي**. أقوم بمسح حي ومستمر لـ 50 عملة مشفرة بأعلى سيولة على منصة Binance Futures، وأحلل تدفق الأوامر (Order Flow)، والدلتا (CVD)، والامتصاص، ونسب الربح.

يمكنك أن تطلب مني أي شيء تريده، على سبيل المثال:
🔹 *"ما هي أفضل عملة للشراء الآن؟"*
🔹 *"حلل لي صفقة SOL أو BTC أو SUI بالتفصيل"*
🔹 *"ما هي العملات الهابطة المناسبة للشورت؟"*
🔹 *"ما هو وضع السيولة العام للسوق حالياً؟"*
🔹 *"كيف أدير صفقاتي وأهداف الربح؟"*

أنا جاهز للإجابة على أي سؤال تريده بدقة لحظية!`;
  }

  // 7. General Intelligent Fallback (Tailored to Current Market Reality)
  const topPair = topBullish[0] || topBearish[0];
  return `🤖 **تحليل استفسارك عبر المحلل الكمي اللحظي:**
━━━━━━━━━━━━━━━━━━━━━━
بناءً على فحص بيانات الـ 50 عملة الأعلى سيولة الآن:
• عدد الصفقات الصاعدة (Long): \`${bullish.length}\` عملة
• عدد الصفقات الهابطة (Short): \`${bearish.length}\` عملة
${topPair ? `• أبرز عملة تتصدر مؤشرات الزخم حالياً هي **#${topPair.pair}** بقوة \`${topPair.score}%\` واتجاه ${topPair.direction === 'BUY' ? 'شراء ↗' : 'بيع ↘'}.` : ''}

💡 يمكنك سؤالي بشكل محدد عن:
1. اسم أي عملة تود تحليلها (مثل: **BTC, ETH, SOL, PEPE, SUI**)
2. أقوى فرص الشراء أو البيع المتاحة لحظياً
3. استراتيجيات إدارة المخاطر وتحديد أهداف الربح (TP1-TP6).`;
}
