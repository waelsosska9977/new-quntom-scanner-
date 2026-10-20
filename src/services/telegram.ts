import { TradeSignal } from '../types';

/**
 * Telegram Bot Notification Service
 */

export async function testTelegramMessage(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
  if (!botToken || !chatId) {
    return { success: false, message: 'يرجى إدخال كل من Bot Token و Chat ID أولاً' };
  }

  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();

  const text = `⚡ *Crypto Sniper VIP - اختبار الاتصال* ⚡
━━━━━━━━━━━━━━━━━━
✅ تم التحقق من ربط بوت تيليجرام بنجاح!
🤖 النظام جاهز لبث صفقات VIP والتحليلات الكمية اللحظية مباشرة إلى قناتك/مجموعتك.
⏰ التوقيت: ${new Date().toLocaleTimeString('ar-EG')}`;

  try {
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, message: 'تم إرسال رسالة الاختبار بنجاح إلى تيليجرام! تفقد المحادثة الآن.' };
    } else {
      return { success: false, message: `فشل الإرسال: ${data.description || 'خطأ غير معروف'}` };
    }
  } catch (err: any) {
    return { success: false, message: `خطأ أثناء الاتصال بتيليجرام: ${err.message || 'Network Error'}` };
  }
}

/**
 * Format and dispatch an institutional VIP Signal directly to Telegram
 */
export async function sendSignalToTelegram(
  signal: TradeSignal,
  botToken: string,
  chatId: string
): Promise<{ success: boolean; message: string }> {
  if (!botToken || !chatId) {
    return { success: false, message: 'يرجى تهيئة مفتاح Bot Token و Chat ID في الإعدادات أولاً' };
  }

  const isBuy = signal.direction === 'BUY';
  const dirBadge = isBuy ? '🟢 *شراء قوي (BUY / LONG) ↗*' : '🔴 *بيع قوي (SELL / SHORT) ↘*';
  const hitTargetsCount = signal.targets.filter(t => t.hit).length;
  
  // Format Targets nicely
  const targetsText = signal.targets.map(t => {
    let icon = '⚪';
    let statusText = '';
    if (t.hit) {
      icon = '✅';
      statusText = '_(تم تحقيقه)_';
    } else if (t.isNext) {
      icon = '🎯';
      statusText = '*[الهدف النشط القادم]*';
    } else {
      icon = '▫️';
      statusText = '_(معلق)_';
    }
    return `${icon} *${t.label}:* \`${t.price}\` (+${t.targetPct}%) ${statusText}`;
  }).join('\n');

  const pnlDisplay = signal.pnlPercent >= 0 
    ? `+${signal.pnlPercent}% (ربح +${signal.pnlPoints} نقطة)` 
    : `${signal.pnlPercent}% (تراجع ${signal.pnlPoints} نقطة)`;

  const message = `🏆 *إشارة قناص VIP مؤسساتية - إشعار جديد* 🏆
━━━━━━━━━━━━━━━━━━━━
📌 *الزوج:* #${signal.pair} | *الفريم:* ${signal.timeframe.toUpperCase()}
⚡ *الاتجاه:* ${dirBadge}
⭐ *قوة الإشارة (Score):* \`${signal.score} / 100\` 💎

🎯 *سعر الدخول:* \`${signal.entryPrice}\`
🛡️ *وقف الخسارة (SL):* \`${signal.stopLoss}\`
📈 *السعر اللحظي:* \`${signal.currentPrice}\`
💰 *الأرباح اللحظية:* \`${pnlDisplay}\`
📊 *نسبة الأهداف المحققة:* \`${hitTargetsCount} / 6\`

🎯 *شبكة الأهداف التفاعلية (TP Targets):*
${targetsText}

━━━━━━━━━━━━━━━━━━━━
🧠 *تقرير الذكاء الاصطناعي والتحليل الكمي:*
▫️ *الملخص:* ${signal.aiThesis.summary}
▫️ *تحليل الدلتا (CVD):* ${signal.aiThesis.deltaAnalysis}
▫️ *امتصاص السيولة (Absorption):* ${signal.aiThesis.absorption}
▫️ *مؤشر RSI والفوليوم:* ${signal.aiThesis.rsiVolume}
▫️ *العائد للمخاطرة:* ${signal.aiThesis.riskReward}

⚙️ *مقاييس الخوارزمية (Train/Test Backtest):*
• Win Rate (In-Sample): \`${signal.metrics.inSampleWinRate}%\`
• Win Rate (Out-of-Sample): \`${signal.metrics.outOfSampleWinRate}%\`
• رسوم التداول المطبقة: \`0.06% + انزلاق سعري\`

🚀 _Crypto Sniper VIP - Automated Quantitative System_`;

  try {
    const url = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, message: `تم إرسال بطاقة صفقة ${signal.pair} إلى تيليجرام بنجاح!` };
    } else {
      return { success: false, message: `فشل الإرسال إلى تيليجرام: ${data.description || 'رمز خطأ'}` };
    }
  } catch (err: any) {
    return { success: false, message: `تعذر الاتصال بـ Telegram API: ${err.message}` };
  }
}
