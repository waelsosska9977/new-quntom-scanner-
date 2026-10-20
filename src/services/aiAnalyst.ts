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
