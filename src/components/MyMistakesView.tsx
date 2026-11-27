import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  Trash2,
  Loader2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { MistakeItem, Subject } from '../types';
import { loadMistakes, saveMistakes } from '../utils/mistakesStorage';

interface MyMistakesViewProps {
  curriculum: Subject[];
  accountPhone: string;
  onAwardBonusXp?: (amount: number) => void;
  externalMistakeBump?: number;
}

export const MyMistakesView: React.FC<MyMistakesViewProps> = ({
  curriculum,
  accountPhone,
  onAwardBonusXp,
  externalMistakeBump = 0,
}) => {
  const [mistakes, setMistakes] = useState<MistakeItem[]>(() => loadMistakes(accountPhone));
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'unresolved' | 'resolved' | 'all'>('unresolved');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Manual entry form
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newSubjectId, setNewSubjectId] = useState<string>(curriculum[0]?.id || 'physics');
  const [newLesson, setNewLesson] = useState<string>('');
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [newWrong, setNewWrong] = useState<string>('');
  const [newCorrect, setNewCorrect] = useState<string>('');
  const [newRule, setNewRule] = useState<string>('');

  // AI explainer per item
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingExplainId, setLoadingExplainId] = useState<string | null>(null);

  // Quick drill mode
  const [drillMode, setDrillMode] = useState<boolean>(false);
  const [drillIndex, setDrillIndex] = useState<number>(0);
  const [drillReveal, setDrillReveal] = useState<boolean>(false);

  useEffect(() => {
    setMistakes(loadMistakes(accountPhone));
  }, [accountPhone, externalMistakeBump]);

  const updateMistakes = (updater: (prev: MistakeItem[]) => MistakeItem[]) => {
    setMistakes((prev) => {
      const next = updater(prev);
      saveMistakes(accountPhone, next);
      return next;
    });
  };

  const handleAddMistake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newCorrect.trim()) return;
    const sub = curriculum.find((s) => s.id === newSubjectId);
    const created: MistakeItem = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subjectId: newSubjectId,
      subjectName: sub?.name || 'منهج الثانوية',
      lessonTitle: newLesson.trim() || 'مراجعة عامة',
      question: newQuestion.trim(),
      wrongAnswer: newWrong.trim() || 'إجابة غير دقيقة',
      correctAnswer: newCorrect.trim(),
      reasonOrRule: newRule.trim() || 'راجع الشرط والقاعدة الأساسية للسؤال.',
      sourceLabel: 'إضافة يدوية',
      reviewCount: 0,
      isResolved: false,
      createdAt: new Date().toISOString(),
    };
    updateMistakes((prev) => [created, ...prev]);
    setNewLesson('');
    setNewQuestion('');
    setNewWrong('');
    setNewCorrect('');
    setNewRule('');
    setShowAddForm(false);
  };

  const handleToggleResolved = (id: string) => {
    updateMistakes((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const nextResolved = !m.isResolved;
        if (nextResolved && onAwardBonusXp) onAwardBonusXp(15);
        return {
          ...m,
          isResolved: nextResolved,
          reviewCount: m.reviewCount + 1,
          resolvedAt: nextResolved ? new Date().toISOString() : undefined,
        };
      })
    );
  };

  const handleDelete = (id: string) => {
    updateMistakes((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAskAiRootCause = async (item: MistakeItem) => {
    if (loadingExplainId) return;
    setLoadingExplainId(item.id);
    try {
      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: item.subjectName,
          message: `الطالب أخطأ في هذا السؤال:\nالسؤال: ${item.question}\nإجابة الطالب الخاطئة: ${item.wrongAnswer}\nالإجابة الصحيحة: ${item.correctAnswer}\nاشرح لي لماذا وقع هذا الخطأ وكيف أثبت القاعدة الذهبية حتى لا أكرره في الامتحان أبداً.`,
          tutorMode: 'explain',
          deepMode: 'deep',
        }),
      });
      const data = await res.json();
      setAiExplanations((prev) => ({
        ...prev,
        [item.id]: data.reply || 'راجع القاعدة الأساسية واربطها بشرط السؤال.',
      }));
    } catch {
      setAiExplanations((prev) => ({
        ...prev,
        [item.id]: 'تعذر جلب الشرح الآن، حاول مرة أخرى.',
      }));
    } finally {
      setLoadingExplainId(null);
    }
  };

  const unresolvedList = mistakes.filter((m) => !m.isResolved);
  const filtered = mistakes.filter((m) => {
    if (filterSubject !== 'all' && m.subjectId !== filterSubject) return false;
    if (statusFilter === 'unresolved' && m.isResolved) return false;
    if (statusFilter === 'resolved' && !m.isResolved) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      m.question.toLowerCase().includes(q) ||
      m.lessonTitle.toLowerCase().includes(q) ||
      m.reasonOrRule.toLowerCase().includes(q)
    );
  });

  const activeDrillItem = unresolvedList[drillIndex % Math.max(1, unresolvedList.length)];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-[#19191F] border border-amber-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2.5">
            <AlertOctagon className="w-6 h-6 text-[#B58722] dark:text-[#D4AF37]" />
            <span>كراسة غلطاتي</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92]">
            كل غلطة تحلّها وتفهم سببها اليوم هي درجة مضمونة في امتحان آخر السنة — صفِّ غلطاتك أولاً بأول!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
          <div className="bg-zinc-50 dark:bg-[#0D0D10] px-3.5 py-2 rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 text-center">
            <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">متبقية للتصفية</span>
            <strong className="text-sm font-black text-rose-500">{unresolvedList.length}</strong>
          </div>
          <div className="bg-zinc-50 dark:bg-[#0D0D10] px-3.5 py-2 rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 text-center">
            <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">تم إتقانها</span>
            <strong className="text-sm font-black text-emerald-500">
              {mistakes.length - unresolvedList.length}
            </strong>
          </div>
          {unresolvedList.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setDrillMode((d) => !d);
                setDrillIndex(0);
                setDrillReveal(false);
              }}
              className="px-4 py-2.5 btn-luxury-gold rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              {drillMode ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{drillMode ? 'عرض القائمة' : 'اختبار تصفية غلطاتي'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddForm((s) => !s)}
            className="px-4 py-2.5 bg-zinc-100 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>سجّل غلطة جديدة</span>
          </button>
        </div>
      </div>

      {/* Add Mistake Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddMistake}
          className="bg-white dark:bg-[#19191F] border border-[#D4AF37]/40 rounded-3xl p-5 space-y-3"
        >
          <h2 className="text-sm font-black text-zinc-950 dark:text-[#F3DFA2]">إضافة سؤال أخطأت فيه</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={newSubjectId}
              onChange={(e) => setNewSubjectId(e.target.value)}
              className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold"
            >
              {curriculum.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newLesson}
              onChange={(e) => setNewLesson(e.target.value)}
              placeholder="اسم الدرس أو الفصل..."
              className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold"
            />
          </div>
          <textarea
            rows={2}
            required
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="نص السؤال الذي أخطأت فيه..."
            className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-medium"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newWrong}
              onChange={(e) => setNewWrong(e.target.value)}
              placeholder="إجابتي الخاطئة (ماذا اخترت؟)"
              className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-medium"
            />
            <input
              type="text"
              required
              value={newCorrect}
              onChange={(e) => setNewCorrect(e.target.value)}
              placeholder="الإجابة الصحيحة..."
              className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-medium"
            />
          </div>
          <input
            type="text"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            placeholder="لماذا كانت هذه الإجابة الصحيحة؟ (القاعدة أو التريكة)..."
            className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-medium"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-[#0D0D10] text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button type="submit" className="px-5 py-2 btn-luxury-gold rounded-xl text-xs font-black cursor-pointer">
              حفظ في كراسة غلطاتي
            </button>
          </div>
        </form>
      )}

      {/* Drill Mode */}
      {drillMode && activeDrillItem ? (
        <div className="max-w-2xl mx-auto bg-white dark:bg-[#19191F] border-2 border-[#D4AF37]/45 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#B5AA92]">
            <span>
              {activeDrillItem.subjectName} · {activeDrillItem.lessonTitle}
            </span>
            <span className="tabular-nums font-bold">
              {(drillIndex % unresolvedList.length) + 1} / {unresolvedList.length}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-zinc-950 dark:text-[#F4EFE6] leading-relaxed">
            {activeDrillItem.question}
          </h3>

          {!drillReveal ? (
            <button
              type="button"
              onClick={() => setDrillReveal(true)}
              className="w-full py-3 btn-luxury-gold rounded-xl text-xs font-black cursor-pointer"
            >
              اختبرت نفسي في ذهني — أظهر الإجابة والقاعدة
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-xs space-y-1">
                <strong className="text-emerald-700 dark:text-emerald-300 block">الإجابة الصحيحة:</strong>
                <p className="text-zinc-900 dark:text-[#F4EFE6] font-bold">{activeDrillItem.correctAnswer}</p>
                <p className="text-zinc-600 dark:text-[#B5AA92] pt-1">{activeDrillItem.reasonOrRule}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-between">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleResolved(activeDrillItem.id);
                    setDrillReveal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  أتقنتها! تصفير الخطأ (+15 XP)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrillReveal(false);
                    setDrillIndex((i) => i + 1);
                  }}
                  className="px-4 py-2 btn-luxury-gold rounded-xl text-xs font-black cursor-pointer"
                >
                  السؤال التالي
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(['unresolved', 'resolved', 'all'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    statusFilter === st
                      ? 'btn-luxury-gold text-[#09090B] border-transparent font-black'
                      : 'bg-white dark:bg-[#19191F] border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-700 dark:text-[#B5AA92]'
                  }`}
                >
                  {st === 'unresolved' ? 'متبقية للتصفية' : st === 'resolved' ? 'تم إتقانها' : 'الكل'}
                </button>
              ))}
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-bold"
              >
                <option value="all">كل المواد</option>
                {curriculum.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في غلطاتك..."
                className="w-full pr-9 pl-3 py-2 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-3xl p-10 text-center space-y-2">
              <AlertOctagon className="w-10 h-10 mx-auto text-[#D4AF37]/50" />
              <h3 className="text-sm font-black text-zinc-900 dark:text-[#F3DFA2]">
                لا توجد أخطاء مسجلة في هذا التصنيف حالياً
              </h3>
              <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
                أي خطأ تقع فيه أثناء «ذاكر معايا» أو «تدرب على المقالي» أو «ثبت درسك» يمكنك حفظه هنا بضغطة زر.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-[#19191F] border rounded-2xl p-5 space-y-3 ${
                    item.isResolved ? 'border-emerald-500/35 opacity-85' : 'border-zinc-200 dark:border-[#D4AF37]/25'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-[#9A7218] dark:text-[#E8CE88]">
                        {item.subjectName} · {item.lessonTitle}
                        {item.sourceLabel ? ` · ${item.sourceLabel}` : ''}
                      </span>
                      <h3 className="text-sm sm:text-base font-black text-zinc-950 dark:text-[#F4EFE6]">
                        {item.question}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleResolved(item.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1 cursor-pointer ${
                          item.isResolved
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-zinc-50 dark:bg-[#0D0D10] border-zinc-200 dark:border-[#D4AF37]/30 text-zinc-700 dark:text-[#F3DFA2]'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{item.isResolved ? 'تم التصفير ✔' : 'تصفير الخطأ (+15 XP)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label="حذف"
                        className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25">
                      <strong className="text-rose-600 dark:text-rose-300 block mb-0.5">خطئي السابق:</strong>
                      <span className="text-zinc-800 dark:text-[#F4EFE6]">{item.wrongAnswer}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <strong className="text-emerald-600 dark:text-emerald-300 block mb-0.5">الإجابة الصحيحة:</strong>
                      <span className="text-zinc-800 dark:text-[#F4EFE6] font-bold">{item.correctAnswer}</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-[#B5AA92]">
                    <strong className="text-[#9A7218] dark:text-[#E8CE88]">القاعدة/التريكة:</strong> {item.reasonOrRule}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={loadingExplainId === item.id}
                      onClick={() => handleAskAiRootCause(item)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold text-[#9A7218] dark:text-[#E8CE88] flex items-center gap-1.5 cursor-pointer"
                    >
                      {loadingExplainId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>اشرح لي سبب الخطأ وثبّت القاعدة</span>
                    </button>
                  </div>

                  {aiExplanations[item.id] && (
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-[#D4AF37]/30 text-xs leading-relaxed whitespace-pre-wrap text-zinc-900 dark:text-[#F4EFE6]">
                      {aiExplanations[item.id]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
