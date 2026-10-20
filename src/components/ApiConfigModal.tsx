import React, { useState } from 'react';
import { 
  Key, 
  Send, 
  Bot, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Sliders, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  ShieldCheck,
  X
} from 'lucide-react';
import { AppConfig } from '../types';
import { testCodeCraftConnection } from '../services/aiAnalyst';
import { testTelegramMessage } from '../services/telegram';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<AppConfig>({ ...config });
  const [showCodeCraftKey, setShowCodeCraftKey] = useState(false);
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  
  // Test states
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestAi = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    const res = await testCodeCraftConnection(
      formData.codeCraftApiKey,
      formData.codeCraftEndpoint,
      formData.codeCraftModel
    );
    setAiTestResult(res);
    setTestingAi(false);
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramTestResult(null);
    const res = await testTelegramMessage(
      formData.telegramBotToken,
      formData.telegramChatId
    );
    setTelegramTestResult(res);
    setTestingTelegram(false);
  };

  const handleSave = () => {
    onSaveConfig(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-[#0e121c] border border-slate-800 rounded-[20px] p-6 shadow-2xl glow-card my-8 text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">مركز الإعدادات والربط السحابي (APIs Hub)</h2>
              <p className="text-xs text-slate-400 mt-0.5">تكوين مفاتيح الذكاء الاصطناعي وبوت تيليجرام والمعايير الكمية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Section 1: CodeCraft API */}
          <div className="p-4 rounded-xl bg-[#131826] border border-slate-800/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00f090]" />
                <span className="font-semibold text-sm text-slate-200">مزود الذكاء الاصطناعي (CodeCraft API / GPT-4o-mini)</span>
              </div>
              <span className="text-[11px] font-mono-numbers px-2 py-0.5 rounded bg-emerald-900/30 text-[#00f090] border border-[#00f090]/20">
                gpt-4o-mini
              </span>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">مفتاح CodeCraft API Key:</label>
              <div className="relative">
                <input
                  type={showCodeCraftKey ? 'text' : 'password'}
                  value={formData.codeCraftApiKey}
                  onChange={(e) => setFormData({ ...formData, codeCraftApiKey: e.target.value })}
                  placeholder="أدخل مفتاحك هنا (مثل sk-cc-...)"
                  className="w-full bg-[#0a0c13] border border-slate-800 rounded-lg py-2.5 pr-3 pl-20 text-xs font-mono-numbers text-white focus:outline-none focus:border-[#00f090]/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCodeCraftKey(!showCodeCraftKey)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showCodeCraftKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">نقطة النهاية (Endpoint):</label>
                <input
                  type="text"
                  value={formData.codeCraftEndpoint}
                  onChange={(e) => setFormData({ ...formData, codeCraftEndpoint: e.target.value })}
                  className="w-full bg-[#0a0c13] border border-slate-800 rounded-lg p-2 text-xs font-mono-numbers text-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">اسم النموذج (Model):</label>
                <input
                  type="text"
                  value={formData.codeCraftModel}
                  onChange={(e) => setFormData({ ...formData, codeCraftModel: e.target.value })}
                  className="w-full bg-[#0a0c13] border border-slate-800 rounded-lg p-2 text-xs font-mono-numbers text-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestAi}
                disabled={testingAi}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#00f090]/10 hover:bg-[#00f090]/20 text-[#00f090] border border-[#00f090]/30 transition-all disabled:opacity-50"
              >
                {testingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                <span>اختبار الاتصال بالذكاء الاصطناعي (Test AI)</span>
              </button>

              {aiTestResult && (
                <div className={`flex items-center gap-1.5 text-xs ${aiTestResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {aiTestResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span className="truncate max-w-[280px]">{aiTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Telegram Notifications */}
          <div className="p-4 rounded-xl bg-[#131826] border border-slate-800/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#38bdf8]" />
                <span className="font-semibold text-sm text-slate-200">إشعارات تيليجرام الفورية (Telegram Alerts)</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-sky-950/40 text-[#38bdf8] border border-[#38bdf8]/20 font-mono-numbers">
                Bot API
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">رمز البوت (Telegram Bot Token):</label>
                <div className="relative">
                  <input
                    type={showTelegramToken ? 'text' : 'password'}
                    value={formData.telegramBotToken}
                    onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                    placeholder="123456789:ABCdefGHI..."
                    className="w-full bg-[#0a0c13] border border-slate-800 rounded-lg py-2.5 pr-3 pl-10 text-xs font-mono-numbers text-white focus:outline-none focus:border-[#38bdf8]/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTelegramToken(!showTelegramToken)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    {showTelegramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">معرف المحادثة (Telegram Chat ID):</label>
                <input
                  type="text"
                  value={formData.telegramChatId}
                  onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                  placeholder="-100... أو معرّف الحساب"
                  className="w-full bg-[#0a0c13] border border-slate-800 rounded-lg py-2.5 px-3 text-xs font-mono-numbers text-white focus:outline-none focus:border-[#38bdf8]/60"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testingTelegram}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 transition-all disabled:opacity-50"
              >
                {testingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>إرسال رسالة تجريبية (Test Telegram)</span>
              </button>

              {telegramTestResult && (
                <div className={`flex items-center gap-1.5 text-xs ${telegramTestResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {telegramTestResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span className="truncate max-w-[280px]">{telegramTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Quantitative Rules & Risk Controls */}
          <div className="p-4 rounded-xl bg-[#131826] border border-slate-800/70 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#ffb800]" />
              <span className="font-semibold text-sm text-slate-200">الضوابط الكمية الصارمة (Quantitative Rules)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#0a0c13] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">رسوم التداول الإلزامية:</span>
                <span className="text-emerald-400 font-mono-numbers font-bold text-sm">0.06%</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Taker / Maker Roundtrip</span>
              </div>
              <div className="bg-[#0a0c13] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">الانزلاق السعري المحسوب:</span>
                <span className="text-amber-400 font-mono-numbers font-bold text-sm">0.02%</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Slippage Tolerance</span>
              </div>
              <div className="bg-[#0a0c13] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">تقسيم العينة (Train/Test):</span>
                <span className="text-purple-400 font-mono-numbers font-bold text-sm">70% / 30%</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">In-Sample vs Out-of-Sample</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/60 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoRefresh}
                  onChange={(e) => setFormData({ ...formData, autoRefresh: e.target.checked })}
                  className="rounded border-slate-700 text-[#00f090] focus:ring-0 bg-[#0a0c13]"
                />
                <span className="text-slate-300">تحديث تلقائي للمسح كل 60 ثانية</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.soundEnabled}
                  onChange={(e) => setFormData({ ...formData, soundEnabled: e.target.checked })}
                  className="rounded border-slate-700 text-[#00f090] focus:ring-0 bg-[#0a0c13]"
                />
                <span className="text-slate-300 flex items-center gap-1.5">
                  {formData.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#00f090]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                  تنبيهات صوتية فورية عند تحقيق الأهداف
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-xl text-xs font-bold text-black bg-[#00f090] hover:bg-[#00f090]/90 transition-all glow-green shadow-lg"
          >
            حفظ الإعدادات في المتصفح
          </button>
        </div>
      </div>
    </div>
  );
};
