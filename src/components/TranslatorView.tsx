import React, { useState, useEffect } from 'react';
import {
  Languages,
  ArrowLeftRight,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Trash2,
  History,
  BookOpen,
  Loader2,
  X,
} from 'lucide-react';
import {
  TranslationHistoryItem,
  TranslationLanguageCode,
  TranslationResult,
} from '../types';
import {
  TRANSLATION_LANGUAGES,
  getLanguageMeta,
  speakMultilingualText,
} from '../utils/translatorFallback';

interface TranslatorViewProps {
  accountPhone?: string;
  onAwardBonusXp?: (amount: number) => void;
}

const QUICK_THANAWEYA_PHRASES: Array<{
  label: string;
  sourceLang: TranslationLanguageCode;
  targetLang: TranslationLanguageCode;
  text: string;
}> = [
  {
    label: 'بحث علمي (ترجمة وزارية)',
    sourceLang: 'ar',
    targetLang: 'en',
    text: 'يلعب البحث العلمي دوراً محورياً في تطوير الرعاية الصحية ومستقبل الأمم.',
  },
  {
    label: 'إدارة الوقت',
    sourceLang: 'en',
    targetLang: 'ar',
    text: 'Students must manage their time wisely to balance studying and rest.',
  },
  {
    label: 'حكمة يومية',
    sourceLang: 'en',
    targetLang: 'ar',
    text: 'Success is the sum of small efforts repeated day in and day out.',
  },
  {
    label: 'جملة فرنسية',
    sourceLang: 'fr',
    targetLang: 'ar',
    text: 'La persévérance et le travail quotidien mènent toujours à la réussite.',
  },
];

export const TranslatorView: React.FC<TranslatorViewProps> = ({
  accountPhone = 'guest',
  onAwardBonusXp,
}) => {
  const historyStorageKey = `nahj_translator_history_${accountPhone}`;

  const [sourceLang, setSourceLang] = useState<TranslationLanguageCode>('en');
  const [targetLang, setTargetLang] = useState<TranslationLanguageCode>('ar');
  const [inputText, setInputText] = useState<string>('');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<boolean>(false);

  const [history, setHistory] = useState<TranslationHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(historyStorageKey);
      return raw ? (JSON.parse(raw) as TranslationHistoryItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(historyStorageKey, JSON.stringify(history.slice(0, 20)));
    } catch {
      // ignore storage quota errors
    }
  }, [history, historyStorageKey]);

  const handleSwapLanguages = () => {
    const prevSource = sourceLang;
    const prevTarget = targetLang;
    setSourceLang(prevTarget);
    setTargetLang(prevSource);
    if (result?.translatedText) {
      setInputText(result.translatedText);
      setResult(null);
    }
  };

  const runTranslate = async (
    overrideText?: string,
    overrideSrc?: TranslationLanguageCode,
    overrideTgt?: TranslationLanguageCode
  ) => {
    const textToTranslate = (overrideText ?? inputText).trim();
    const src = overrideSrc ?? sourceLang;
    const tgt = overrideTgt ?? targetLang;

    if (!textToTranslate) {
      setErrorMsg('اكتب كلمة أو جملة أو فقرة أولاً ثم اضغط ترجمة.');
      return;
    }

    if (src === tgt) {
      setErrorMsg('اختر لغتين مختلفتين للترجمة.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToTranslate,
          sourceLang: src,
          targetLang: tgt,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.result) {
        throw new Error(data.error || 'تعذر إتمام الترجمة حالياً');
      }

      const translated: TranslationResult = data.result;
      setResult(translated);

      const item: TranslationHistoryItem = {
        ...translated,
        id: `tr-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setHistory((prev) => [
        item,
        ...prev.filter((h) => h.sourceText !== item.sourceText || h.targetLang !== item.targetLang),
      ].slice(0, 20));

      onAwardBonusXp?.(3);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء الاتصال بخدمة الترجمة.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.translatedText) return;
    navigator.clipboard.writeText(result.translatedText).then(() => {
      setCopiedTarget(true);
      setTimeout(() => setCopiedTarget(false), 1800);
    });
  };

  const sourceMeta = getLanguageMeta(sourceLang);
  const targetMeta = getLanguageMeta(targetLang);

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header Banner */}
      <header className="bg-white dark:bg-[#19191F] border border-amber-200/70 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl btn-luxury-gold flex items-center justify-center shrink-0">
            <Languages className="w-6 h-6 text-[#09090B]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F6E2A6]">
              مترجم نَهج الذكي متعدد اللغات
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92]">
              ترجمة فورية دقيقة مع النطق الصوتي، النطق المكتوب بالعربية، الملاحظات النحوية، وأمثلة الثانوية العامة
            </p>
          </div>
        </div>

        <div className="text-xs font-bold text-zinc-500 dark:text-[#E8CE88]">
          6 لغات مدعومة · +3 XP لكل ترجمة
        </div>
      </header>

      {/* Main Translator Workspace */}
      <section className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-5">
        {/* Language Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] block">
              من اللغة
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value as TranslationLanguageCode)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 text-sm font-extrabold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
            >
              {TRANSLATION_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.labelAr}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwapLanguages}
            title="تبديل اللغتين"
            className="mt-4 sm:mt-5 w-10 h-10 mx-auto rounded-xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/35 text-[#9A7218] dark:text-[#F3DFA2] hover:border-[#D4AF37] flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] block">
              إلى اللغة
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as TranslationLanguageCode)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 text-sm font-extrabold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
            >
              {TRANSLATION_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.labelAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-side Input & Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Source Textarea */}
          <div className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-4 flex flex-col justify-between min-h-[210px]">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200/70 dark:border-[#D4AF37]/15 mb-2">
              <span className="text-xs font-extrabold text-zinc-700 dark:text-[#E8CE88]">
                النص الأصلي ({sourceMeta.labelAr})
              </span>
              <div className="flex items-center gap-1.5">
                {inputText.trim() && (
                  <>
                    <button
                      type="button"
                      onClick={() => speakMultilingualText(inputText, sourceLang)}
                      title="نطق النص الأصلي"
                      className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-[#19191F] text-zinc-600 dark:text-[#E8CE88] cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInputText('');
                        setResult(null);
                      }}
                      title="مسح النص"
                      className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-[#19191F] text-zinc-500 dark:text-[#B5AA92] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <textarea
              dir={sourceMeta.direction}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  runTranslate();
                }
              }}
              placeholder="اكتب أي كلمة، جملة، أو فقرة ترجمة للثانوية العامة..."
              className="w-full grow bg-transparent text-sm sm:text-base font-bold text-zinc-950 dark:text-[#F4EFE6] placeholder:text-zinc-400 dark:placeholder:text-[#B5AA92]/60 focus:outline-none resize-none leading-relaxed"
              rows={5}
            />

            <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-400">
              <span>{inputText.length} حرف</span>
              <span>Ctrl + Enter للترجمة الفورية</span>
            </div>
          </div>

          {/* Target Output Box */}
          <div className="bg-zinc-50 dark:bg-[#09090C] border border-amber-300/70 dark:border-[#D4AF37]/40 rounded-2xl p-4 flex flex-col justify-between min-h-[210px]">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200/70 dark:border-[#D4AF37]/15 mb-2">
              <span className="text-xs font-extrabold text-[#9A7218] dark:text-[#F3DFA2]">
                الترجمة ({targetMeta.labelAr})
              </span>
              {result?.translatedText && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => speakMultilingualText(result.translatedText, targetLang)}
                    title="استماع للنطق"
                    className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-[#19191F] text-[#9A7218] dark:text-[#F3DFA2] cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="نسخ الترجمة"
                    className="px-2 py-1 rounded-lg bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 text-[11px] font-bold text-zinc-700 dark:text-[#E8CE88] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedTarget ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTarget ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="grow flex flex-col items-center justify-center gap-2 text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>جاري ضبط الصياغة والمعنى الدقيق...</span>
              </div>
            ) : result ? (
              <div className="grow space-y-3">
                <p
                  dir={targetMeta.direction}
                  className="text-base sm:text-lg font-black text-zinc-950 dark:text-[#F6E2A6] leading-relaxed"
                >
                  {result.translatedText}
                </p>
                {result.phoneticPronunciation && (
                  <p className="text-xs font-bold text-zinc-600 dark:text-[#E8CE88]/90 bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/20 rounded-xl px-3 py-2">
                    النطق التقريبي: {result.phoneticPronunciation}
                  </p>
                )}
              </div>
            ) : (
              <div className="grow flex items-center justify-center text-xs font-semibold text-zinc-400 dark:text-[#B5AA92]/70 text-center px-4">
                ستظهر هنا الترجمة الدقيقة مع النطق الصوتي والملاحظة النحوية.
              </div>
            )}

            {result?.providerLabel && (
              <div className="pt-2 text-[10px] font-bold text-zinc-400 dark:text-[#B5AA92]">
                المصدر: {result.providerLabel}
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/35 border border-red-200 dark:border-red-800/60 text-xs font-bold text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Action & Quick Phrases */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold text-zinc-500 dark:text-[#B5AA92]">
              نماذج سريعة:
            </span>
            {QUICK_THANAWEYA_PHRASES.map((phrase) => (
              <button
                key={phrase.label}
                type="button"
                onClick={() => {
                  setSourceLang(phrase.sourceLang);
                  setTargetLang(phrase.targetLang);
                  setInputText(phrase.text);
                  runTranslate(phrase.text, phrase.sourceLang, phrase.targetLang);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37] text-[11px] font-bold text-zinc-800 dark:text-[#E8CE88] cursor-pointer transition-colors"
              >
                {phrase.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => runTranslate()}
            disabled={isLoading || !inputText.trim()}
            className="px-6 py-3 btn-luxury-gold text-[#09090B] rounded-2xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? 'جاري الترجمة...' : 'ترجم الآن'}</span>
          </button>
        </div>

        {/* Grammar Note & Examples */}
        {result && (result.grammarNote || result.usageExamples.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-[#D4AF37]/20">
            {result.grammarNote && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 space-y-1.5">
                <span className="text-xs font-black text-[#9A7218] dark:text-[#F3DFA2] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  ملاحظة نحوية وسياقية
                </span>
                <p className="text-xs text-zinc-700 dark:text-[#F4EFE6] leading-relaxed">
                  {result.grammarNote}
                </p>
              </div>
            )}

            {result.usageExamples.length > 0 && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 space-y-2">
                <span className="text-xs font-black text-[#9A7218] dark:text-[#F3DFA2] block">
                  مثال في سياق جملة
                </span>
                {result.usageExamples.map((ex, i) => (
                  <div key={i} className="text-xs space-y-0.5">
                    <p dir="auto" className="font-bold text-zinc-900 dark:text-[#F4EFE6]">
                      {ex.source}
                    </p>
                    <p dir="auto" className="font-medium text-zinc-600 dark:text-[#B5AA92]">
                      {ex.target}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Saved History */}
      {history.length > 0 && (
        <section className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-zinc-900 dark:text-[#F6E2A6] flex items-center gap-2">
              <History className="w-4 h-4 text-[#D4AF37]" />
              <span>سجل ترجماتك الأخيرة ({history.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => setHistory([])}
              className="text-xs font-bold text-zinc-500 hover:text-red-500 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح السجل</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {history.slice(0, 8).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSourceLang(item.sourceLang);
                  setTargetLang(item.targetLang);
                  setInputText(item.sourceText);
                  setResult(item);
                }}
                className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37] transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 dark:text-[#B5AA92]">
                  <span>
                    {getLanguageMeta(item.sourceLang).labelAr} ← {getLanguageMeta(item.targetLang).labelAr}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakMultilingualText(item.translatedText, item.targetLang);
                    }}
                    className="p-1 text-[#D4AF37] hover:bg-white dark:hover:bg-[#19191F] rounded"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p dir="auto" className="text-xs font-bold text-zinc-900 dark:text-[#F4EFE6] line-clamp-1">
                  {item.sourceText}
                </p>
                <p dir="auto" className="text-xs font-extrabold text-[#9A7218] dark:text-[#E8CE88] line-clamp-1">
                  {item.translatedText}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
