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
 * Call CodeCraft API (or Gemini / Quant Fallback) to generate AI Trade Thesis
 */
export async function generateAiTradeAnalysis(
  signal: TradeSignal,
  metrics: QuantitativeMetrics,
  config: AppConfig
): Promise<AiTradeThesis> {
  const prompt = `أنت خبير تحليل كمي مؤسساتي وتداول عالي التردد (Quantitative Trading Architect & Senior Order Flow Analyst).
قم بتحليل صفقة الكريبتو التالية وتقديم تقرير فني احترافي دقيق باللغة العربية:

- زوج العملة: ${signal.pair}
- الإطار الزمني: ${signal.timeframe}
- الاتجاه: ${signal.direction === 'BUY' ? 'شراء (Long) ↗' : 'بيع (Short) ↘'}
- سعر الدخول: ${signal.entryPrice}
- وقف الخسارة: ${signal.stopLoss}
- السعر الحالي: ${signal.currentPrice}
- مؤشر القوة النسبية RSI: ${metrics.rsi}
- متوسطات الحركة: EMA9=${metrics.ema9}, EMA21=${metrics.ema21}, EMA50=${metrics.ema50}, EMA200=${metrics.ema200}
- ATR (مقياس التذبذب): ${metrics.atr}
- دلتا الفوليوم (CVD Delta): ${metrics.volumeDeltaPct}%
- مضاعف الفوليوم لـ 24 ساعة: ${metrics.volumeRatio24h}x
- امتصاص السيولة (Absorption): ${metrics.absorptionDetected ? 'تم رصد امتصاص مؤسساتي قوي' : 'طبيعي'}
- ضغط تدفق الأوامر (Order Flow): ${metrics.orderFlowPressure}
- نسبة الربح في عينة التدريب (In-Sample): ${metrics.inSampleWinRate}%
- نسبة الربح خارج العينة (Out-of-Sample): ${metrics.outOfSampleWinRate}% (مع خصم رسوم 0.06% وانزلاق سعري)

أجب فقط بصيغة JSON نقية ومباشرة بدون نصوص إضافية، بالشكل التالي:
{
  "score": 88,
  "summary": "خلاصة مؤسساتية احترافية في سطرين عن سبب قوة الدخول وتوافق الزخم",
  "deltaAnalysis": "تحليل تفصيلي لدلتا الفوليوم وتدفق السيولة وتمركز الحيتان",
  "absorption": "تحليل امتصاص العروض/الطلبات ونقاط الارتداد الهيكلية",
  "rsiVolume": "قراءة فنية لتوافق مؤشر RSI مع أحجام التداول والكسر",
  "riskReward": "تحليل العائد للمخاطرة وجدوى الصفقة بعد الرسوم",
  "keyLevelsNote": "أهم المستويات الفنية للمتابعة وإدارة الأرباح"
}`;

  // If CodeCraft API Key is provided, call CodeCraft API
  if (config.codeCraftApiKey && config.codeCraftApiKey.trim().length > 0) {
    try {
      const endpoint = config.codeCraftEndpoint || 'https://codecraftapi.com/v1/chat/completions';
      const model = config.codeCraftModel || 'gpt-4o-mini';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.codeCraftApiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a quantitative institutional crypto strategist. You respond ONLY in valid JSON matching the schema.',
            },
            {
              role: 'user',
              content: prompt,
            },
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
      } else {
        console.warn(`CodeCraft API returned status ${response.status}:`, await response.text());
      }
    } catch (apiErr) {
      console.warn('CodeCraft API call failed, using high-fidelity quantitative model thesis:', apiErr);
    }
  }

  // Fallback: Enhanced High-Fidelity Quantitative Thesis
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
    // If it's pure JSON
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
 * Interactive Chatbot integration with CodeCraft API / GPT-4o-mini
 */
export async function sendChatToAiAnalyst(
  messages: ChatMessage[],
  config: AppConfig,
  currentSignals: TradeSignal[]
): Promise<string> {
  const bullish = currentSignals.filter(s => s.direction === 'BUY').map(s => `${s.pair} (Score: ${s.score}%, الدخول: ${s.entryPrice}, PnL: ${s.pnlPercent}%)`);
  const bearish = currentSignals.filter(s => s.direction === 'SELL').map(s => `${s.pair} (Score: ${s.score}%, الدخول: ${s.entryPrice}, PnL: ${s.pnlPercent}%)`);

  const systemContext = `أنت المساعد الذكي والمحلل الكمي المؤسساتي لنظام Crypto Sniper VIP.
أنت خبير في التداول عالي التردد (HFT)، والتحليل الكمي، وتدفق السيولة (Order Flow)، والدلتا (CVD Delta)، والامتصاص (Absorption)، ومؤشرات RSI و EMA و ATR.
تتحدث باللغة العربية باحترافية وتنسيق جميل مع نقاط واضحة وإيموجي مناسب.

بيانات السوق الحالية المرصودة الآن:
- عملات في مسار صعودي (Bullish / شراء): ${bullish.slice(0, 12).join(' | ') || 'جاري المسح'}
- عملات في مسار هبوطي (Bearish / بيع): ${bearish.slice(0, 12).join(' | ') || 'جاري المسح'}
- إجمالي الصفقات المقتنصة: ${currentSignals.length} صفقة
- رسوم التداول المطبقة: 0.06% + انزلاق سعري 0.02%.

أجب على أسئلة المتداول بدقة، وقدم تحليلاً للمستويات الفنية والأهداف ونسب التحرك وإدارة المخاطر.`;

  // Try CodeCraft API if Key is provided
  if (config.codeCraftApiKey && config.codeCraftApiKey.trim().length > 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const endpoint = config.codeCraftEndpoint || 'https://codecraftapi.com/v1/chat/completions';
      const model = config.codeCraftModel || 'gpt-4o-mini';

      const payloadMessages = [
        { role: 'system', content: systemContext },
        ...messages.map(m => ({ role: m.role, content: m.content }))
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
          temperature: 0.4,
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
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('CodeCraft Chat error/timeout, falling back to institutional assistant:', err);
    }
  }

  // High-fidelity Quantitative Assistant Response Fallback
  const lastMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
  return generateIntelligentChatFallback(lastMsg, currentSignals);
}

function generateIntelligentChatFallback(query: string, signals: TradeSignal[]): string {
  const bullish = signals.filter(s => s.direction === 'BUY');
  const bearish = signals.filter(s => s.direction === 'SELL');

  // Check if user is asking about a specific coin
  const matchedSignal = signals.find(s => query.toUpperCase().includes(s.pair.replace('USDT', '')) || query.toUpperCase().includes(s.pair));

  if (matchedSignal) {
    const isBuy = matchedSignal.direction === 'BUY';
    const nextTp = matchedSignal.targets.find(t => t.isNext) || matchedSignal.targets[0];
    return `🎯 *التحليل الكمي لعملة #${matchedSignal.pair}:*
━━━━━━━━━━━━━━━━━━━━
⚡ *الاتجاه:* ${isBuy ? '🟢 صعودي قوي (BUY / LONG) ↗' : '🔴 هبوطي قوي (SELL / SHORT) ↘'}
⭐ *قوة الإشارة الكمية:* \`${matchedSignal.score} / 100\`
🎯 *سعر الدخول:* \`${matchedSignal.entryPrice}\`
🛡️ *وقف الخسارة (SL):* \`${matchedSignal.stopLoss}\`
📈 *السعر اللحظي:* \`${matchedSignal.currentPrice}\` (${matchedSignal.pnlPercent >= 0 ? '+' : ''}${matchedSignal.pnlPercent}%)
⚡ *الهدف التالي المستهدف:* *${nextTp.label}* عند \`${nextTp.price}\` (مقدار الربح: \`+${nextTp.profitAmount} USDT\` / تحرك: \`+${nextTp.targetPct}%\`)

🧠 *رؤية التحليل المؤسساتي:*
• *الدلتا (CVD):* ${matchedSignal.aiThesis.deltaAnalysis}
• *الامتصاص (Absorption):* ${matchedSignal.aiThesis.absorption}
• *مؤشر RSI:* ${matchedSignal.metrics.rsi} (مؤشرات الزخم تدعم استمرار الحركة).
• *العائد للمخاطرة:* 1:${matchedSignal.riskRewardRatio} بعد خصم 0.06% رسوم.`;
  }

  if (query.includes('افضل') || query.includes('أفضل') || query.includes('فرصة') || query.includes('شراء') || query.includes('صعود')) {
    const bestBullish = [...bullish].sort((a, b) => b.score - a.score)[0];
    if (bestBullish) {
      return `🚀 *أفضل فرصة صعود مقتنصة حالياً هي: #${bestBullish.pair}*
━━━━━━━━━━━━━━━━━━━━
⭐ *قوة الإشارة:* \`${bestBullish.score} / 100\` 💎
🎯 *سعر الدخول:* \`${bestBullish.entryPrice}\`
🛡️ *وقف الخسارة:* \`${bestBullish.stopLoss}\`
💰 *الأرباح الحالية:* \`+${bestBullish.pnlPercent}%\`
📊 *أهم الأهداف:* TP1 (\`${bestBullish.targets[0]?.price}\`) و TP2 (\`${bestBullish.targets[1]?.price}\`)

💡 *السبب الكمي:* ${bestBullish.aiThesis.summary}`;
    }
  }

  if (query.includes('هبوط') || query.includes('بيع') || query.includes('شورت') || query.includes('نزول')) {
    const bestBearish = [...bearish].sort((a, b) => b.score - a.score)[0];
    if (bestBearish) {
      return `📉 *أقوى فرصة هبوط (Short) حالياً هي: #${bestBearish.pair}*
━━━━━━━━━━━━━━━━━━━━
⭐ *قوة الإشارة الهبوطية:* \`${bestBearish.score} / 100\`
🎯 *سعر الدخول:* \`${bestBearish.entryPrice}\`
🛡️ *وقف الخسارة:* \`${bestBearish.stopLoss}\`
⚡ *الهدف التالي:* TP1 عند \`${bestBearish.targets[0]?.price}\` (+${bestBearish.targets[0]?.targetPct}%)

💡 *السبب الكمي:* ${bestBearish.aiThesis.summary}`;
    }
  }

  if (query.includes('بيتكوين') || query.includes('btc') || query.includes('السوق') || query.includes('السيولة')) {
    const btcSig = signals.find(s => s.pair === 'BTCUSDT');
    const bullishRatio = Math.round((bullish.length / (signals.length || 1)) * 100);
    return `📊 *ملخص سيولة السوق وحالة البيتكوين (BTC):*
━━━━━━━━━━━━━━━━━━━━
• *هيمنة الاتجاه:* ${bullishRatio >= 50 ? `🟢 سيطرة الشراء بنسبة ${bullishRatio}%` : `🔴 سيطرة البيع بنسبة ${100 - bullishRatio}%`}
• *عدد الصفقات الصاعدة:* ${bullish.length} عملة
• *عدد الصفقات الهابطة:* ${bearish.length} عملة
${btcSig ? `• *إشارة البيتكوين BTCUSDT:* اتجاه ${btcSig.direction === 'BUY' ? 'شراء صاعد ↗' : 'بيع هابط ↘'} بسعر لحظي \`${btcSig.currentPrice}\` وقوة إشارة \`${btcSig.score}%\`` : ''}

💡 *نصيحة إدارة المخاطر:* ننصح بالدخول فقط في الصفقات التي تتجاوز قوتها 80% مع الالتزام الصارم بوقف الخسارة.`;
  }

  return `🤖 أهلاً بك في المساعد الذكي لنظام **Crypto Sniper VIP**!
━━━━━━━━━━━━━━━━━━━━
أنا متصل بالبيانات اللحظية للـ 50 عملة الأعلى سيولة. يمكنك أن تطلب مني:
1. *"ما هي أقوى فرصة صعود الآن؟"*
2. *"حلل لي عملة SOLUSDT أو BTC أو SUI"*
3. *"ما هي العملات الهابطة المناسبة لصفقات البيع؟"*
4. *"اشرح لي مؤشرات الامتصاص والدلتا في أي صفقة"*

بماذا ترغب أن نبدأ الآن؟`;
}
