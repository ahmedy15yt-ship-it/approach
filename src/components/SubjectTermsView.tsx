import React, { useState, useEffect } from 'react';
import {
  BookA,
  Search,
  Sparkles,
  CheckCircle2,
  Circle,
  RotateCw,
  Plus,
  Loader2,
  Layers,
} from 'lucide-react';
import { CURRICULUM_SUBJECT_TERMS } from '../data/subjectTerms';
import { Subject, SubjectTermItem } from '../types';

interface SubjectTermsViewProps {
  curriculum: Subject[];
  accountPhone: string;
  onAwardBonusXp?: (amount: number) => void;
}

export const SubjectTermsView: React.FC<SubjectTermsViewProps> = ({
  curriculum,
  accountPhone,
  onAwardBonusXp,
}) => {
  const masteredKey = `nahj_terms_mastered_${accountPhone}`;
  const customTermsKey = `nahj_terms_custom_${accountPhone}`;

  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'flashcards'>('list');
  const [flashIndex, setFlashIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const [masteredIds, setMasteredIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(masteredKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [customTerms, setCustomTerms] = useState<SubjectTermItem[]>(() => {
    try {
      const raw = localStorage.getItem(customTermsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // AI Custom Term Explainer state
  const [queryTerm, setQueryTerm] = useState<string>('');
  const [querySubjectId, setQuerySubjectId] = useState<string>(curriculum[0]?.id || 'biology');
  const [aiExplainResult, setAiExplainResult] = useState<{
    term: string;
    subjectId: string;
    subjectName: string;
    definition: string;
    examDifference: string;
    example: string;
  } | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(masteredKey, JSON.stringify(masteredIds));
  }, [masteredIds, masteredKey]);

  useEffect(() => {
    localStorage.setItem(customTermsKey, JSON.stringify(customTerms));
  }, [customTerms, customTermsKey]);

  const allTerms = [...customTerms, ...CURRICULUM_SUBJECT_TERMS];
  const filteredTerms = allTerms.filter((t) => {
    if (selectedSubject !== 'all' && t.subjectId !== selectedSubject) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      t.term.toLowerCase().includes(q) ||
      t.definition.toLowerCase().includes(q) ||
      t.chapterTitle.toLowerCase().includes(q)
    );
  });

  const toggleMastered = (id: string) => {
    setMasteredIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (onAwardBonusXp) onAwardBonusXp(5);
      return [...prev, id];
    });
  };

  const handleExplainTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = queryTerm.trim();
    if (!clean || isExplaining) return;

    const sub = curriculum.find((s) => s.id === querySubjectId);
    setIsExplaining(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/gemini/term-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: clean,
          subjectName: sub?.name || 'منهج الثانوية العامة',
          chapterTitle: sub?.chapters[0]?.title || 'الفصل الدراسي',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'تعذر شرح المصطلح الآن.');
      } else {
        setAiExplainResult({
          term: clean,
          subjectId: querySubjectId,
          subjectName: sub?.name || 'منهج الثانوية العامة',
          definition: data.result.definition,
          examDifference: data.result.examDifference,
          example: data.result.example,
        });
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم، حاول مرة أخرى.');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSaveCustomTerm = () => {
    if (!aiExplainResult) return;
    const newItem: SubjectTermItem = {
      id: `custom-term-${Date.now()}`,
      subjectId: aiExplainResult.subjectId,
      subjectName: aiExplainResult.subjectName,
      chapterTitle: 'مصطلح مضاف بواسطتك',
      term: aiExplainResult.term,
      definition: aiExplainResult.definition,
      examDifference: aiExplainResult.examDifference,
      example: aiExplainResult.example,
      isCustom: true,
    };
    setCustomTerms((prev) => [newItem, ...prev]);
    if (onAwardBonusXp) onAwardBonusXp(10);
    setAiExplainResult(null);
    setQueryTerm('');
  };

  const activeCard = filteredTerms[flashIndex % Math.max(1, filteredTerms.length)];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-[#19191F] border border-amber-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2.5">
            <BookA className="w-6 h-6 text-[#B58722] dark:text-[#D4AF37]" />
            <span>مصطلحات المادة ومعانيها</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92]">
            موسوعة مصطلحات الثانوية العامة بدقة كتاب الوزارة — تعريف واضح · الفرق الامتحاني · مثال تطبيقي.
          </p>
        </div>

        <div className="flex items-center gap-3 tabular-nums">
          <div className="bg-zinc-50 dark:bg-[#0D0D10] px-4 py-2 rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 text-center">
            <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">المتقنة</span>
            <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {masteredIds.length} / {allTerms.length}
            </strong>
          </div>
          <div className="flex rounded-xl bg-zinc-100 dark:bg-[#0D0D10] p-1 border border-zinc-200 dark:border-[#D4AF37]/25">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                viewMode === 'list' ? 'btn-luxury-gold text-[#09090B]' : 'text-zinc-600 dark:text-[#B5AA92]'
              }`}
            >
              قائمة
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('flashcards');
                setIsFlipped(false);
                setFlashIndex(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                viewMode === 'flashcards' ? 'btn-luxury-gold text-[#09090B]' : 'text-zinc-600 dark:text-[#B5AA92]'
              }`}
            >
              بطاقات حفظ
            </button>
          </div>
        </div>
      </div>

      {/* AI Instant Term Lookup */}
      <form
        onSubmit={handleExplainTerm}
        className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 space-y-3"
      >
        <h2 className="text-sm font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <span>ابحث أو استفسر عن معنى أي مصطلح جديد في المنهج</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <select
            value={querySubjectId}
            onChange={(e) => setQuerySubjectId(e.target.value)}
            className="sm:col-span-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold"
          >
            {curriculum.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={queryTerm}
            onChange={(e) => setQueryTerm(e.target.value)}
            placeholder="اكتب المصطلح (مثال: ظاهرة التأثير الكهروضوئي، التمييز الملفوظ، قاعدة هوند)..."
            className="sm:col-span-6 p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold focus:outline-none focus:border-[#D4AF37]"
          />
          <button
            type="submit"
            disabled={isExplaining || !queryTerm.trim()}
            className="sm:col-span-3 py-2.5 px-4 btn-luxury-gold rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isExplaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>اشرح المصطلح</span>
          </button>
        </div>

        {errorMsg && <p className="text-xs font-bold text-rose-500">{errorMsg}</p>}

        {aiExplainResult && (
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#0D0D10] border border-[#D4AF37]/40 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm font-black text-[#9A7218] dark:text-[#F3DFA2]">
                {aiExplainResult.term} · {aiExplainResult.subjectName}
              </strong>
              <button
                type="button"
                onClick={handleSaveCustomTerm}
                className="px-3 py-1.5 btn-luxury-gold rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>أضف لموسوعتي</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-zinc-900 dark:text-[#F4EFE6]">
              <strong>المعنى والتعريف:</strong> {aiExplainResult.definition}
            </p>
            <p className="text-xs leading-relaxed text-amber-800 dark:text-[#E8CE88]">
              <strong>انتبه في الامتحان:</strong> {aiExplainResult.examDifference}
            </p>
            <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
              <strong>مثال تطبيقي:</strong> {aiExplainResult.example}
            </p>
          </div>
        )}
      </form>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedSubject('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
              selectedSubject === 'all'
                ? 'btn-luxury-gold text-[#09090B] border-transparent font-black'
                : 'bg-white dark:bg-[#19191F] border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-700 dark:text-[#B5AA92]'
            }`}
          >
            كل المواد
          </button>
          {curriculum.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSubject(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                selectedSubject === s.id
                  ? 'btn-luxury-gold text-[#09090B] border-transparent font-black'
                  : 'bg-white dark:bg-[#19191F] border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-700 dark:text-[#B5AA92]'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث داخل المصطلحات..."
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>

      {/* Flashcard Mode */}
      {viewMode === 'flashcards' ? (
        activeCard ? (
          <div className="max-w-2xl mx-auto space-y-4">
            <div
              onClick={() => setIsFlipped((f) => !f)}
              className="bg-white dark:bg-[#19191F] border-2 border-[#D4AF37]/45 rounded-3xl p-7 sm:p-9 min-h-[260px] flex flex-col justify-between cursor-pointer hover:border-[#D4AF37] transition-all"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#B5AA92]">
                <span>
                  {activeCard.subjectName} · {activeCard.chapterTitle}
                </span>
                <span className="tabular-nums font-bold">
                  {(flashIndex % filteredTerms.length) + 1} / {filteredTerms.length}
                </span>
              </div>

              {!isFlipped ? (
                <div className="text-center space-y-3 py-6">
                  <span className="text-[11px] font-bold text-[#B58722] dark:text-[#E8CE88]">اضغط لكشف المعنى والفرق الامتحاني</span>
                  <h3 className="text-2xl font-black text-zinc-950 dark:text-[#F3DFA2]">{activeCard.term}</h3>
                </div>
              ) : (
                <div className="space-y-3 py-2 text-right">
                  <h4 className="text-base font-black text-[#9A7218] dark:text-[#F3DFA2]">{activeCard.term}</h4>
                  <p className="text-sm leading-relaxed text-zinc-900 dark:text-[#F4EFE6]">{activeCard.definition}</p>
                  <p className="text-xs leading-relaxed text-amber-700 dark:text-[#E8CE88]">
                    <strong>الفرق الامتحاني:</strong> {activeCard.examDifference}
                  </p>
                  <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
                    <strong>مثال:</strong> {activeCard.example}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#B58722] dark:text-[#E8CE88]">
                <RotateCw className="w-3.5 h-3.5" />
                <span>{isFlipped ? 'عرض المصطلح فقط' : 'اقلب البطاقة'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsFlipped(false);
                  setFlashIndex((i) => (i - 1 + filteredTerms.length) % filteredTerms.length);
                }}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold cursor-pointer"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => toggleMastered(activeCard.id)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-black text-emerald-700 dark:text-emerald-300 cursor-pointer"
              >
                {masteredIds.includes(activeCard.id) ? '✔ تم الفهم والحفظ' : 'تحديد كمفهوم (+5 XP)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFlipped(false);
                  setFlashIndex((i) => (i + 1) % filteredTerms.length);
                }}
                className="px-4 py-2.5 btn-luxury-gold rounded-xl text-xs font-black cursor-pointer"
              >
                التالي
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs font-bold text-zinc-500">لا توجد مصطلحات مطابقة للبحث.</div>
        )
      ) : (
        /* List Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTerms.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-8 text-center text-xs text-zinc-500">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
              لا توجد مصطلحات مطابقة لبحثك. جرّب البحث بالذكاء الاصطناعي في الأعلى!
            </div>
          ) : (
            filteredTerms.map((item) => {
              const isMastered = masteredIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-[#19191F] border rounded-2xl p-5 space-y-2.5 transition-all ${
                    isMastered ? 'border-emerald-500/40' : 'border-zinc-200 dark:border-[#D4AF37]/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] block">
                        {item.subjectName} · {item.chapterTitle}
                      </span>
                      <h3 className="text-base font-black text-zinc-950 dark:text-[#F3DFA2]">{item.term}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMastered(item.id)}
                      className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 ${
                        isMastered
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-zinc-50 dark:bg-[#0D0D10] border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-600 dark:text-[#B5AA92]'
                      }`}
                    >
                      {isMastered ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      <span>{isMastered ? 'مفهوم' : 'أتقنته'}</span>
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm leading-relaxed text-zinc-800 dark:text-[#F4EFE6]">
                    {item.definition}
                  </p>

                  <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-[#0D0D10] border border-amber-200/70 dark:border-[#D4AF37]/20 text-xs text-amber-900 dark:text-[#E8CE88]">
                    <strong>الفرق الامتحاني:</strong> {item.examDifference}
                  </div>

                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                    <strong>مثال:</strong> {item.example}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
