import React, { useState } from 'react';
import { Terminal, Copy, Check, X, FileCode, Download } from 'lucide-react';
import { CryptoPair, Timeframe } from '../types';
import { generateVectorizedPythonScript } from '../utils/pythonExporter';
import { downloadFile } from '../utils/vercelPackage';

interface PythonCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pair: CryptoPair;
  timeframe: Timeframe;
}

export const PythonCodeModal: React.FC<PythonCodeModalProps> = ({
  isOpen,
  onClose,
  pair,
  timeframe,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const code = generateVectorizedPythonScript(pair, timeframe);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadFile(`quant_strategy_${pair.toLowerCase()}_${timeframe}.py`, code);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl bg-[#0e121c] border border-slate-800 rounded-[20px] p-6 shadow-2xl glow-card my-8 text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[#00f090]">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                كود بايثون الكمي المؤسساتي (Vectorized Strategy Script)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                مبني على vectorbt, pandas, numpy مع خصم رسوم 0.06% وتقسيم Train/Test لمنع الـ Overfitting
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

        {/* Content */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              الاستراتيجية المطبقة لـ: <strong className="text-white font-mono-numbers">{pair} ({timeframe})</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل ملف .py</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f090]/15 hover:bg-[#00f090]/25 text-[#00f090] border border-[#00f090]/30 transition-colors font-bold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ الكود بالكامل'}</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-black/60 border border-slate-800/90 text-slate-300 text-xs font-mono-numbers max-h-[55vh] overflow-y-auto text-left" dir="ltr">
            {code}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
