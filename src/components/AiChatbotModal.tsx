import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  Loader2, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Compass, 
  BrainCircuit,
  MessageSquare
} from 'lucide-react';
import { AppConfig, TradeSignal } from '../types';
import { ChatMessage, sendChatToAiAnalyst } from '../services/aiAnalyst';

interface AiChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  signals: TradeSignal[];
  onSelectPair?: (pair: string) => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-msg',
    role: 'assistant',
    content: `👋 مرحباً بك! أنا **المحلل الكمي المؤسساتي بالذكاء الاصطناعي** لمنصة **Crypto Sniper VIP**.

تم ربطي مباشرة بنموذج **GPT-4o-mini عبر CodeCraft API** ومحرك المسح اللحظي لأقوى 50 عملة سيولة. 
يمكنك سؤالي عن:
• ما هي أفضل عملة للشراء أو البيع الآن؟
• تحليل مستويات الدخول والأهداف (TP1-TP6) لأي عملة مثل SOL أو BTC أو SUI.
• قراءة الدلتا (CVD) وظواهر امتصاص السيولة (Absorption).

بماذا تود أن نبدأ تحليلك اليوم؟`,
    timestamp: Date.now(),
  },
];

const SUGGESTED_PROMPTS = [
  'ما هي أفضل فرصة صعود (شراء) حالياً؟ 🚀',
  'ما هو اتجاه البيتكوين BTC والسيولة العامة؟ 📊',
  'حلل لي صفقة عملة SOLUSDT بالتفصيل 🎯',
  'ما هي أقوى عملة هابطة مناسبة للبيع (Short)؟ 📉',
];

export const AiChatbotModal: React.FC<AiChatbotModalProps> = ({
  isOpen,
  onClose,
  config,
  signals,
  onSelectPair,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_sniper_chat_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_MESSAGES;
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages]);

  // Save chat to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('crypto_sniper_chat_history', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const aiReply = await sendChatToAiAnalyst(newMessages, config, signals);
      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: Date.now(),
      };
      setMessages([...newMessages, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ تعذر إتمام الطلب: ${err.message || 'خطأ في الاتصال بالخادم'}. تأكد من صحة مفتاح CodeCraft API.`,
        timestamp: Date.now(),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages(INITIAL_MESSAGES);
    try {
      localStorage.removeItem('crypto_sniper_chat_history');
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden">
      <div 
        className="relative w-full max-w-2xl h-[85vh] max-h-[750px] bg-[#0c101c] border border-slate-800 rounded-[22px] flex flex-col shadow-2xl glow-card text-right overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-gradient-to-r from-[#111728] via-[#0d1220] to-[#111728]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#00f090]/20 to-purple-500/20 text-[#00f090] border border-[#00f090]/30 shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">المحلل الكمي للذكاء الاصطناعي (AI Quant Chatbot)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-[#00f090] border border-[#00f090]/30 font-mono-numbers">
                  {config.codeCraftModel || 'gpt-4o-mini'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                مرتبط بـ CodeCraft API وبيانات الـ 50 عملة لحظياً
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
              title="مسح سجل المحادثة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-[#00f090]/30 text-[#00f090] flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-tr-none shadow-lg'
                      : 'bg-[#121727] border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#00f090]" />
              <span>جاري التحليل واستدعاء نموذج الذكاء الاصطناعي...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Chips */}
        <div className="px-4 py-2 border-t border-slate-800/60 bg-[#090c14]/70">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 whitespace-nowrap transition-all shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-[#0a0d16] border-t border-slate-800 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="اكتب استفسارك هنا (مثال: ما هو هدف عملة SUI؟ أو ما أفضل فرصة؟)..."
            className="flex-1 bg-[#0f1422] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-[#00f090]/60 transition-colors"
            autoComplete="off"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-[#00f090] hover:bg-[#00f090]/90 text-black font-bold transition-all disabled:opacity-40 glow-green cursor-pointer shrink-0"
            title="إرسال"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
