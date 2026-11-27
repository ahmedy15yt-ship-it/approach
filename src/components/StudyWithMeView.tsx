import React, { useState } from 'react';
import {
  ListChecks,
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  AlertOctagon,
  Award,
  Lightbulb,
} from 'lucide-react';
import { Subject, StudyWithMePart, StudyWithMeGrade, MistakeItem } from '../types';

interface StudyWithMeViewProps {
  curriculum: Subject[];
  onAwardBonusXp?: (amount: number) => void;
  onSaveMistake?: (mistake: Omit<MistakeItem, 'id' | 'reviewCount' | 'isResolved' | 'createdAt'>) => void;
}

export const StudyWithMeView: React.FC<StudyWithMeViewProps> = ({
  curriculum,
  onAwardBonusXp,
  onSaveMistake,
}) => {
  const [subjectId, setSubjectId] = useState<string>(curriculum[0]?.id || 'biology');
  const currentSubject = curriculum.find((s) => s.id === subjectId) || curriculum[0];
  const [chapterId, setChapterId] = useState<string>(currentSubject?.chapters[0]?.id || '');
  const currentChapter =
    currentSubject?.chapters.find((c) => c.id === chapterId) || currentSubject?.chapters[0];
  const [lessonTitle, setLessonTitle] = useState<string>(
    currentChapter?.lessons[0]?.title || ''
  );

  const [parts, setParts] = useState<StudyWithMePart[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [grades, setGrades] = useState<Record<number, StudyWithMeGrade>>({});
  const [showHint, setShowHint] = useState<boolean>(false);
  const [savedMistakesForPart, setSavedMistakesForPart] = useState<Record<number, boolean>>({});
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);

  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartSession = async () => {
    if (!lessonTitle || isLoadingSession) return;
    setIsLoadingSession(true);
    setErrorMsg(null);
    setParts([]);
    setGrades({});
    setAnswers({});
    setActiveIndex(0);
    setSessionCompleted(false);
    setSavedMistakesForPart({});
    setShowHint(false);

    try {
      const res = await fetch('/api/gemini/study-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: currentSubject?.name || 'الأحياء',
          chapter: currentChapter?.title || 'الفصل المحدد',
          lesson: lessonTitle,
          partsCount: 4,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'تعذر بدء الجلسة.');
      } else {
        setParts(data.parts || []);
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم، حاول مرة أخرى.');
    } finally {
      setIsLoadingSession(false);
    }
  };

  const activePart = parts[activeIndex];
  const activeGrade = grades[activeIndex];
  const activeAnswer = answers[activeIndex] || '';

  const handleSubmitPartAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePart || !activeAnswer.trim() || isGrading) return;
    setIsGrading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/gemini/grade-study-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: currentSubject?.name || '',
          lesson: lessonTitle,
          partTitle: activePart.title,
          explanation: activePart.explanation,
          question: activePart.question,
          expectedKeyPoints: activePart.expectedKeyPoints,
          studentAnswer: activeAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'تعذر تصحيح إجابتك.');
      } else {
        setGrades((prev) => ({ ...prev, [activeIndex]: data.grade }));
        if (data.grade.isCorrect && onAwardBonusXp) {
          onAwardBonusXp(10);
        }
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم، حاول مرة أخرى.');
    } finally {
      setIsGrading(false);
    }
  };

  const handleNextPart = () => {
    setShowHint(false);
    if (activeIndex + 1 < parts.length) {
      setActiveIndex((idx) => idx + 1);
    } else {
      setSessionCompleted(true);
      if (onAwardBonusXp) onAwardBonusXp(35);
    }
  };

  const handleSavePartMistake = () => {
    if (!activePart || !activeGrade || !onSaveMistake) return;
    onSaveMistake({
      subjectId: currentSubject?.id || 'general',
      subjectName: currentSubject?.name || 'عام',
      lessonTitle,
      question: activePart.question,
      wrongAnswer: activeAnswer,
      correctAnswer: activeGrade.modelAnswer,
      reasonOrRule: activeGrade.missedPoint || activePart.coreRule,
      sourceLabel: 'ذاكر معايا',
    });
    setSavedMistakesForPart((prev) => ({ ...prev, [activeIndex]: true }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header + Selector */}
      <div className="bg-white dark:bg-[#19191F] border border-amber-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2.5">
            <ListChecks className="w-6 h-6 text-[#B58722] dark:text-[#D4AF37]" />
            <span>جلسة «ذاكر معايا» جزء بجزء</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92]">
            نقسّم الدرس إلى أجزاء صغيرة: نفهم الجزء الأول ← سؤال سريع ← تصحيح فوري ثم نفتح الجزء التالي.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            value={subjectId}
            onChange={(e) => {
              const sid = e.target.value;
              setSubjectId(sid);
              const sub = curriculum.find((s) => s.id === sid);
              const ch = sub?.chapters[0];
              setChapterId(ch?.id || '');
              setLessonTitle(ch?.lessons[0]?.title || '');
            }}
            className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold"
          >
            {curriculum.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={chapterId}
            onChange={(e) => {
              const cid = e.target.value;
              setChapterId(cid);
              const ch = currentSubject?.chapters.find((c) => c.id === cid);
              setLessonTitle(ch?.lessons[0]?.title || '');
            }}
            className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold"
          >
            {currentSubject?.chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <select
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold"
          >
            {currentChapter?.lessons.map((l) => (
              <option key={l.id} value={l.title}>
                {l.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleStartSession}
            disabled={isLoadingSession || !lessonTitle}
            className="py-2.5 px-4 btn-luxury-gold rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoadingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>ابدأ جلسة المذاكرة</span>
          </button>
        </div>

        {errorMsg && <p className="text-xs font-bold text-rose-500">{errorMsg}</p>}
      </div>

      {/* Session Active View */}
      {parts.length > 0 && !sessionCompleted && activePart && (
        <div className="space-y-4">
          {/* Step Progress */}
          <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {parts.map((p, idx) => {
                const done = Boolean(grades[idx]);
                const isCurrent = idx === activeIndex;
                return (
                  <button
                    key={p.partNumber}
                    type="button"
                    disabled={!done && idx > activeIndex}
                    onClick={() => setActiveIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all tabular-nums ${
                      isCurrent
                        ? 'btn-luxury-gold text-[#09090B] border-transparent'
                        : done
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 cursor-pointer'
                        : 'bg-zinc-100 dark:bg-[#0D0D10] border-zinc-200 dark:border-[#D4AF37]/15 text-zinc-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    الجزء {p.partNumber}
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-zinc-500 dark:text-[#B5AA92] tabular-nums">
              الجزء {activeIndex + 1} من {parts.length}
            </span>
          </div>

          {/* Part Card */}
          <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">
                الجزء {activePart.partNumber} · {lessonTitle}
              </span>
              <h2 className="text-lg font-black text-zinc-950 dark:text-[#F3DFA2]">{activePart.title}</h2>
              <p className="text-sm leading-relaxed text-zinc-800 dark:text-[#F4EFE6] whitespace-pre-line">
                {activePart.explanation}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-[#0D0D10] border border-amber-200 dark:border-[#D4AF37]/25 text-xs sm:text-sm font-bold text-[#9A7218] dark:text-[#F3DFA2]">
              الخلاصة الذهبية: {activePart.coreRule}
            </div>

            {/* Question & Answer Form */}
            <form onSubmit={handleSubmitPartAnswer} className="space-y-3 pt-2 border-t border-zinc-200 dark:border-[#D4AF37]/20">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-black text-zinc-950 dark:text-[#E8CE88]">
                  سؤال الفهم: {activePart.question}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/25 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>تلميح</span>
                </button>
              </div>

              {showHint && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] text-xs text-zinc-600 dark:text-[#B5AA92]">
                  {activePart.hint}
                </div>
              )}

              <textarea
                rows={3}
                value={activeAnswer}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [activeIndex]: e.target.value }))}
                placeholder="اكتب فهمك وإجابتك هنا بأسلوبك لتصحيحها..."
                className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#D4AF37]"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isGrading || !activeAnswer.trim()}
                  className="px-5 py-2.5 btn-luxury-gold rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isGrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>صحّح إجابتي الآن</span>
                </button>
              </div>
            </form>

            {/* Grade Feedback */}
            {activeGrade && (
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  activeGrade.isCorrect
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-500/40'
                    : 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6]">
                    {activeGrade.isCorrect ? '✔ أحسنت! فهم سليم' : 'تحتاج تدقيق بسيط'}
                  </strong>
                  <span className="text-xs font-black tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">
                    الدرجة: {activeGrade.scorePercent}%
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-800 dark:text-[#F4EFE6]">
                  {activeGrade.feedback}
                </p>
                <div className="p-3 rounded-xl bg-white/80 dark:bg-[#0D0D10] text-xs space-y-1">
                  <strong className="text-[#9A7218] dark:text-[#E8CE88] block">الإجابة النموذجية:</strong>
                  <p className="text-zinc-800 dark:text-[#F4EFE6]">{activeGrade.modelAnswer}</p>
                  {activeGrade.missedPoint && (
                    <p className="text-rose-600 dark:text-rose-300 pt-1">
                      <strong>نقطة انتبه لها:</strong> {activeGrade.missedPoint}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {onSaveMistake && (
                    <button
                      type="button"
                      disabled={Boolean(savedMistakesForPart[activeIndex])}
                      onClick={handleSavePartMistake}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#0D0D10] border border-rose-400/40 text-xs font-bold text-rose-600 dark:text-rose-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>{savedMistakesForPart[activeIndex] ? 'تم الحفظ في غلطاتي ✔' : 'حفظ في كراسة غلطاتي'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleNextPart}
                    className="px-5 py-2.5 btn-luxury-gold rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{activeIndex + 1 < parts.length ? 'انتقل للجزء التالي' : 'إنهاء الجلسة (+35 XP)'}</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Session Completed */}
      {sessionCompleted && (
        <div className="bg-white dark:bg-[#19191F] border-2 border-[#D4AF37]/50 rounded-3xl p-8 text-center space-y-3">
          <Award className="w-12 h-12 mx-auto text-[#D4AF37]" />
          <h2 className="text-xl font-black text-zinc-950 dark:text-[#F3DFA2]">
            عاش يا بطل! أتممت جلسة «{lessonTitle}» جزءاً بجزء 🎯
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92]">
            تمت إضافة +35 XP لرصيدك. يمكنك الآن اختبار نفسك في قسم «ثبت درسك» أو التدرب على المقالي.
          </p>
          <button
            type="button"
            onClick={() => {
              setSessionCompleted(false);
              setParts([]);
            }}
            className="px-5 py-2.5 btn-luxury-gold rounded-xl text-xs font-black cursor-pointer"
          >
            بدء درس آخر
          </button>
        </div>
      )}
    </div>
  );
};
