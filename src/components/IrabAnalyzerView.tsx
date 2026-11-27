import React, { useState, useEffect } from 'react';
import { SpellCheck, Sparkles, Loader2, History, RotateCcw } from 'lucide-react';
import { IrabAnalysis } from '../types';

const PRESET_SENTENCES = [
  'لا طالبَ علمٍ مهملٌ في دروسه',
  'أمعطٍ أبوك الفقيرَ حقَّه؟',
  'لولا العلمُ لهلك الناسُ في الجهلِ',
  'نعم خُلقاً الصدقُ والأمانةُ',
  'إنما المؤمنون إخوةٌ فأصلحوا بين أخويكم',
  'كم من كتابٍ قرأتَه فزادك وعياً',
];

interface SavedIrabRecord {
  id: string;
  sentence: string;
  analysis: IrabAnalysis;
  createdAt: string;
}

interface IrabAnalyzerViewProps {
  accountPhone: string;
  onAwardBonusXp?: (amount: number) => void;
}

export const IrabAnalyzerView: React.FC<IrabAnalyzerViewProps> = ({
  accountPhone,
  onAwardBonusXp,
}) => {
  const historyKey = `nahj_irab_history_${accountPhone}`;

  const [sentence, setSentence] = useState<string>(PRESET_SENTENCES[0]);
  const [focusWord, setFocusWord] = useState<string>('');
  const [analysis, setAnalysis] = useState<IrabAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [history, setHistory] = useState<SavedIrabRecord[]>(() => {
    try {
      const raw = localStorage.getItem(historyKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 15)));
  }, [history, historyKey]);

  const handleAnalyze = async (e?: React.FormEvent, customSentence?: string) => {
    if (e) e.preventDefault();
    const text = (customSentence ?? sentence).trim();
    if (!text || isAnalyzing) return;

    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/irab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: text,
          focusWord: focusWord.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'تعذر تحليل الجملة حالياً.');
      } else {
        setAnalysis(data.analysis);
        if (onAwardBonusXp) onAwardBonusXp(10);
        setHistory((prev) => [
          {
            id: `irab-${Date.now()}`,
            sentence: text,
            analysis: data.analysis,
            createdAt: new Date().toISOString(),
          },
          ...prev.filter((h) => h.sentence !== text),
        ]);
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم، حاول مرة أخرى.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header + Form */}
      <div className="bg-white dark:bg-[#19191F] border border-amber-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2.5">
            <SpellCheck className="w-6 h-6 text-[#B58722] dark:text-[#D4AF37]" />
            <span>الإعراب النحوي التفصيلي</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92]">
            اكتب أي جملة أو بيت شعر أو آية يعربها لك كلمة بكلمة مع علامة الإعراب والسبب والمستخرجات النحوية.
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5">
          {PRESET_SENTENCES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setSentence(preset);
                handleAnalyze(undefined, preset);
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37] text-xs font-bold text-zinc-800 dark:text-[#E8CE88] cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>

        <form onSubmit={handleAnalyze} className="space-y-3">
          <textarea
            rows={2}
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="اكتب الجملة العربية التي تريد إعرابها..."
            className="w-full p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-sm sm:text-base font-bold font-['Amiri',serif] focus:outline-none focus:border-[#D4AF37]"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={focusWord}
              onChange={(e) => setFocusWord(e.target.value)}
              placeholder="كلمة معينة تريد التركيز عليها (اختياري)..."
              className="grow p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !sentence.trim()}
              className="px-6 py-2.5 btn-luxury-gold rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>أعرب الجملة الآن</span>
            </button>
          </div>
        </form>

        {errorMsg && <p className="text-xs font-bold text-rose-500">{errorMsg}</p>}
      </div>

      {/* Analysis Result */}
      {analysis && (
        <div className="space-y-5">
          {/* Vocalized Banner */}
          <div className="bg-white dark:bg-[#19191F] border border-[#D4AF37]/40 rounded-3xl p-5 sm:p-6 space-y-2">
            <span className="text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">الضبط بالتشكيل:</span>
            <p className="text-xl sm:text-2xl font-bold font-['Amiri',serif] text-zinc-950 dark:text-[#F3DFA2] leading-loose">
              {analysis.vocalizedSentence}
            </p>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92]">{analysis.generalMeaning}</p>
          </div>

          {/* Word-by-Word Table */}
          <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 overflow-x-auto">
            <h2 className="text-sm font-black text-zinc-950 dark:text-[#F3DFA2] mb-3">
              جدول الإعراب التفصيلي كلمةً بكلمة
            </h2>
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-500 dark:text-[#B5AA92]">
                  <th className="py-2.5 px-3 font-black">الكلمة</th>
                  <th className="py-2.5 px-3 font-black">النوع</th>
                  <th className="py-2.5 px-3 font-black">الإعراب الكامل</th>
                  <th className="py-2.5 px-3 font-black">العلامة والسبب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#D4AF37]/15">
                {analysis.tokens.map((tok, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/40 dark:hover:bg-[#0D0D10]/70">
                    <td className="py-3 px-3 font-black text-[#9A7218] dark:text-[#F3DFA2] whitespace-nowrap">
                      {tok.word}
                    </td>
                    <td className="py-3 px-3 text-zinc-600 dark:text-[#B5AA92] whitespace-nowrap">{tok.pos}</td>
                    <td className="py-3 px-3 font-bold text-zinc-950 dark:text-[#F4EFE6]">{tok.irab}</td>
                    <td className="py-3 px-3 text-zinc-700 dark:text-[#D9D0BE]">{tok.signOrReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Clauses & High-School Grammar Extracts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-black text-zinc-950 dark:text-[#F3DFA2]">المحل الإعرابي للجمل</h3>
              {analysis.sentenceClauses.length === 0 ? (
                <p className="text-xs text-zinc-500">جملة بسيطة أو ليس بها جمل فرعية ذات محل.</p>
              ) : (
                <ul className="list-disc pr-4 space-y-1.5 text-xs sm:text-sm text-zinc-800 dark:text-[#F4EFE6]">
                  {analysis.sentenceClauses.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-black text-zinc-950 dark:text-[#F3DFA2]">مستخرجات وفنيات تالتة ثانوي</h3>
              {analysis.grammarExtracts.length === 0 ? (
                <p className="text-xs text-zinc-500">لا توجد قواعد شاذة إضافية في هذا التركيب.</p>
              ) : (
                <ul className="list-disc pr-4 space-y-1.5 text-xs sm:text-sm text-zinc-800 dark:text-[#F4EFE6]">
                  {analysis.grammarExtracts.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2">
              <History className="w-4 h-4 text-[#D4AF37]" />
              <span>سجل الجمل المعربة سابقاً</span>
            </h3>
            <button
              type="button"
              onClick={() => setHistory([])}
              className="text-xs font-bold text-zinc-500 hover:text-rose-500 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>مسح السجل</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSentence(item.sentence);
                  setAnalysis(item.analysis);
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/20 text-xs font-bold text-zinc-800 dark:text-[#F4EFE6] cursor-pointer"
              >
                {item.sentence}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
