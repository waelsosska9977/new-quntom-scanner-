import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

// Initialize Gemini API client with required User-Agent
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;

if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Health & Status check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(geminiApiKey && geminiApiKey.length > 5),
    timestamp: Date.now(),
  });
});

// Real-time AI Chatbot Endpoint powered by Gemini 3.8 Flash
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], currentSignals = [] } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!aiClient) {
      // Re-check env in case it was injected
      const runtimeKey = process.env.GEMINI_API_KEY;
      if (runtimeKey) {
        aiClient = new GoogleGenAI({
          apiKey: runtimeKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } else {
        return res.status(503).json({
          error: 'Gemini API Key is not configured on the server.',
          fallbackRequired: true,
        });
      }
    }

    // Build rich market context for the institutional AI
    const bullishSignals = currentSignals.filter((s: any) => s.direction === 'BUY');
    const bearishSignals = currentSignals.filter((s: any) => s.direction === 'SELL');

    const bullishSummary = bullishSignals
      .slice(0, 8)
      .map((s: any) => `${s.pair} (سعر: ${s.currentPrice}, قوة: ${s.score}%, PnL: ${s.pnlPercent}%)`)
      .join(' | ');

    const bearishSummary = bearishSignals
      .slice(0, 8)
      .map((s: any) => `${s.pair} (سعر: ${s.currentPrice}, قوة: ${s.score}%, PnL: ${s.pnlPercent}%)`)
      .join(' | ');

    const systemInstruction = `أنت "المحلل الكمي المؤسساتي بالذكاء الاصطناعي" لنظام التداول Crypto Sniper VIP.
أنت خبير محترف ومحنك في التداول عالي التردد (HFT)، والتحليل الكمي، وتدفق السيولة (Order Flow)، ودلتا الفوليوم (CVD Delta)، ومؤشرات الامتصاص المؤسساتي (Absorption)، ومستويات الدخول والأهداف (TP1-TP6)، ووقف الخسارة، وإدارة رأس المال.

البيانات اللحظية الحية لمسح السوق الآن:
- إجمالي الصفقات المرصودة: ${currentSignals.length} صفقة
- عملات في مسار صعودي قوي (شراء / Long): ${bullishSummary || 'جاري التحديث'}
- عملات في مسار هبوطي قوي (بيع / Short): ${bearishSummary || 'جاري التحديث'}
- رسوم التداول المطبقة: 0.06% مع انزلاق سعري 0.02%.

قواعد الإجابة:
1. تحدث باللغة العربية باحترافية وسلاسة، مع تنسيق أنيق ونقاط واضحة واستخدام إيموجي مميز.
2. لا تعطي إجابات مكررة أو محفوظة أو جامدة أبداً! جاوب بدقة وبشكل مخصص ومفصل ومباشر على سؤال المتداول.
3. إذا سأل المتداول عن عملة معينة، ابحث عنها في بيانات الصفقات واشرح مستويات الدخول والأهداف وإشارات الزخم.
4. إذا سأل عن أفضل عملة صعود أو هبوط، قدم أفضل التوصيات بالأرقام الدقيقة من الصفقات الحالية.
5. إذا سأل عن نصائح أو استراتيجيات تداول أو إدارة مخاطر أو كيفية التعامل مع السوق، قدم شروحات مؤسساتية عميقة وعملية.
6. اختم بنصيحة ذكية لإدارة المخاطر والالتزام بوقف الخسارة.`;

    // Map messages to Gemini contents format
    // Valid roles in @google/genai: 'user' | 'model'
    const contents = messages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content) }],
      }));

    if (contents.length === 0) {
      return res.status(400).json({ error: 'No valid user messages found' });
    }

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || 'عذراً، لم أتمكن من استخراج التحليل المطلوب حالياً.';
    return res.json({ reply: replyText });
  } catch (err: any) {
    console.error('Gemini Chat error:', err);
    return res.status(500).json({
      error: err.message || 'Error communicating with Gemini AI',
      fallbackRequired: true,
    });
  }
});

// Single Signal Deep Analysis Endpoint
app.post('/api/analyze-signal', async (req, res) => {
  try {
    const { signal, metrics } = req.body;
    if (!signal) {
      return res.status(400).json({ error: 'Signal is required' });
    }

    if (!aiClient) {
      const runtimeKey = process.env.GEMINI_API_KEY;
      if (runtimeKey) {
        aiClient = new GoogleGenAI({
          apiKey: runtimeKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });
      } else {
        return res.status(503).json({ error: 'Gemini API Key missing' });
      }
    }

    const prompt = `أنت خبير تحليل كمي مؤسساتي. حلل الصفقة التالية وأجب فقط بصيغة JSON نقية:
- الزوج: ${signal.pair}
- الاتجاه: ${signal.direction}
- سعر الدخول: ${signal.entryPrice}
- وقف الخسارة: ${signal.stopLoss}
- السعر الحالي: ${signal.currentPrice}
- RSI: ${metrics?.rsi}
- CVD Delta: ${metrics?.volumeDeltaPct}%
- مضاعف الفوليوم: ${metrics?.volumeRatio24h}x
- الامتصاص: ${metrics?.absorptionDetected ? 'مرصود' : 'طبيعي'}

الصيغة المطلوبة:
{
  "score": 85,
  "summary": "خلاصة مؤسساتية في سطرين",
  "deltaAnalysis": "تحليل دلتا الفوليوم",
  "absorption": "تحليل الامتصاص",
  "rsiVolume": "تحليل RSI والفوليوم",
  "riskReward": "تحليل العائد للمخاطرة",
  "keyLevelsNote": "المستويات الفنية الهامة"
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
      },
    });

    const text = response.text || '';
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    let parsed = null;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    return res.json({ thesis: parsed });
  } catch (err: any) {
    console.error('Gemini signal analysis error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Setup Vite in Dev or Static in Production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Crypto Sniper VIP Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
