import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  FileCode, 
  Sparkles, 
  X, 
  Globe, 
  FolderGit2, 
  Terminal
} from 'lucide-react';
import { VERCEL_JSON_CONTENT, downloadFile } from '../utils/vercelPackage';
import { generateStandaloneHtml } from '../utils/standaloneHtml';

interface VercelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VercelExportModal: React.FC<VercelExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedVercelJson, setCopiedVercelJson] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  if (!isOpen) return null;

  const handleCopyVercelJson = () => {
    navigator.clipboard.writeText(VERCEL_JSON_CONTENT);
    setCopiedVercelJson(true);
    setTimeout(() => setCopiedVercelJson(false), 2000);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(generateStandaloneHtml());
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleDownloadAll = () => {
    downloadFile('vercel.json', VERCEL_JSON_CONTENT);
    setTimeout(() => {
      downloadFile('index.html', generateStandaloneHtml());
    }, 400);
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
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                حزمة النشر الفوري بنقرة واحدة على Vercel ⚡
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                جاهز للنشر كـ Static Site فائق السرعة أو عبر استيراد مستودع GitHub
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5 max-h-[70vh] overflow-y-auto pr-1 text-xs">
          {/* Quick Guide */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/20 via-blue-950/20 to-emerald-950/20 border border-slate-800 space-y-2">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00f090]" />
              طريقة نشر المشروع على Vercel خلال دقيقة واحدة:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pr-1 leading-relaxed">
              <li>أنشئ مجلداً على جهازك (مثلاً باسم <code className="text-[#00f090] font-mono-numbers">crypto-sniper-vip</code>).</li>
              <li>قم بتحميل ملفي <code className="text-white font-mono-numbers">index.html</code> و <code className="text-white font-mono-numbers">vercel.json</code> وضعهما داخله.</li>
              <li>ارفع المجلد إلى حسابك في <strong>GitHub</strong>.</li>
              <li>افتح موقع <strong>Vercel</strong>، واضغط <strong>Add New &gt; Project</strong>، واختر المستودع واضغط <strong>Deploy</strong>.</li>
              <li>سيعطيك Vercel فوراً رابطاً مجانياً ومحمياً بـ HTTPS يفتح معك على الموبايل والكمبيوتر في أي وقت!</li>
            </ol>
          </div>

          {/* Action: Download Files */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadAll}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-black bg-[#00f090] hover:bg-[#00f090]/90 transition-all glow-green shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>تحميل ملفات Vercel الكاملة (index.html + vercel.json)</span>
            </button>
          </div>

          {/* vercel.json preview */}
          <div className="p-3.5 rounded-xl bg-[#0a0c13] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-numbers text-slate-300 font-bold flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-[#ffb800]" />
                vercel.json (تم إنشاؤه مسبقاً في جذر المشروع)
              </span>
              <button
                type="button"
                onClick={handleCopyVercelJson}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copiedVercelJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedVercelJson ? 'تم النسخ!' : 'نسخ الكود'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-black/50 text-[11px] font-mono-numbers text-slate-300 overflow-x-auto text-left" dir="ltr">
              {VERCEL_JSON_CONTENT}
            </pre>
          </div>

          {/* Deploy options info */}
          <div className="p-3.5 rounded-xl bg-[#131826] border border-slate-800/80 space-y-2">
            <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-sky-400" />
              أو النشر عبر Vercel CLI في سطر أوامر واحد:
            </h5>
            <div className="p-2.5 rounded bg-[#0a0c13] border border-slate-800 font-mono-numbers text-sky-400 text-left select-all" dir="ltr">
              npx vercel --prod
            </div>
            <p className="text-[11px] text-slate-400">
              الملف <code className="text-white">vercel.json</code> موجود بالفعل داخل جذر هذا التطبيق، مما يجعل أي رفع لـ GitHub متوافقاً 100% بدون أي إعدادات إضافية.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
