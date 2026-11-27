import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  CheckCircle2,
  Circle,
  Sparkles,
  Loader2,
  Award,
  AlertOctagon,
  BookOpen,
  PartyPopper,
} from 'lucide-react';
import { Subject, InteractiveQuestion, MistakeItem } from '../types';
import { playBellChime } from '../utils/voiceAlerts';

interface SolidifyLessonViewProps {
  curriculum: Subject[];
  accountPhone: string;
  onSolidifyCurriculumLesson: (subjectId: string, chapterId: string, lessonId: string) => void;
  onAwardBonusXp?: (amount: number) => void;
  onSaveMistake?: (mistake: Omit<MistakeItem, 'id' | 'reviewCount' | 'isResolved' | 'createdAt'>) => void;
}

export const SolidifyLessonView: React.FC<SolidifyLessonViewProps> = ({
  curriculum,
  accountPhone,
  onSolidifyCurriculumLesson,
  onAwardBonusXp,
  onSaveMistake,
}) => {
  const solidifiedKey = `nahj_solidified_lessons_${accountPhone}`;

  const [subjectId, setSubjectId] = useState<string>(curriculum[0]?.id || 'biology');
  const currentSubject = curriculum.find((s) => s.id === subjectId) || curriculum[0];
  const [chapterId, setChapterId] = useState<string>(currentSubject?.chapters[0]?.id || '');
  const currentChapter =
    currentSubject?.chapters.find((c) => c.id === chapterId) || currentSubject?.chapters[0];
  const [lessonId, setLessonId] = useState<string>(currentChapter?.lessons[0]?.id || '');
  const currentLesson =
    currentChapter?.lessons.find((l) => l.id === lessonId) || currentChapter?.lessons[0];

  const [solidifiedIds, setSolidifiedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(solidifiedKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(solidifiedKey, JSON.stringify(solidifiedIds));
  }, [solidifiedIds, solidifiedKey]);

  const [stage, setStage] = useState<'understand' | 'practice' | 'mastered'>('understand');
  const [checkedConcepts, setCheckedConcepts] = useState<Record<number, boolean>>({});
  const [questionsQueue, setQuestionsQueue] = useState<InteractiveQuestion[]>([]);
  const [qCursor, setQCursor] = useState<number>(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [masteryPoints, setMasteryPoints] = useState<number>(0); // 0 to 3 needed to lock 100%
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [savedWrongFlag, setSavedWrongFlag] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justCheckedIdx, setJustCheckedIdx] = useState<number | null>(null);
  const [stepPulseKey, setStepPulseKey] = useState<number>(0);

  const fireSolidifyCelebration = (level: 'concept' | 'step' | 'complete') => {
    try {
      const palette = ['#D4AF37', '#34D399', '#38BDF8', '#F59E0B', '#A855F7', '#FB7185'];
      if (level === 'concept') {
        confetti({
          particleCount: 28,
          spread: 55,
          origin: { y: 0.7 },
          colors: palette,
        });
      } else if (level === 'step') {
        confetti({
          particleCount: 45,
          spread: 70,
          origin: { y: 0.65 },
          colors: palette,
        });
      } else {
        playBellChime();
        confetti({
          particleCount: 95,
          spread: 85,
          origin: { y: 0.58 },
          colors: palette,
        });
        setTimeout(() => {
          confetti({
            particleCount: 55,
            angle: 60,
            spread: 60,
            origin: { x: 0.12, y: 0.65 },
            colors: palette,
          });
          confetti({
            particleCount: 55,
            angle: 120,
            spread: 60,
            origin: { x: 0.88, y: 0.65 },
            colors: palette,
          });
        }, 220);
      }
    } catch {
      // ignore confetti canvas fallback
    }
  };

  const chapterConcepts = [
    ...(currentChapter?.summary?.keyPoints || []),
    ...(currentChapter?.summary?.examTips || []),
  ].slice(0, 5);

  const fetchBatchQuestions = async (append = false) => {
    if (!currentLesson || !currentSubject || !currentChapter) return;
    setIsLoadingQuestions(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: currentSubject.name,
          chapter: currentChapter.title,
          lesson: currentLesson.title,
          questionType: 'mcq',
          difficulty: 'exam',
          count: 4,
          customNotes: 'ركّز على أسئلة تثبيت الدرس لكي لا ينساها الطالب بعد الحصة',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.questions)) {
        setErrorMsg(data.error || 'تعذر تجهيز أسئلة التثبيت.');
      } else {
        setQuestionsQueue((prev) => (append ? [...prev, ...data.questions] : data.questions));
        if (!append) {
          setQCursor(0);
          setSelectedOpt(null);
          setRevealed(false);
          setSavedWrongFlag(false);
        }
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم، حاول مرة أخرى.');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleStartPracticeStage = async () => {
    setStage('practice');
    setMasteryPoints(0);
    await fetchBatchQuestions(false);
  };

  const currentQuestion = questionsQueue[qCursor];
  const isChoiceCorrect =
    revealed &&
    currentQuestion &&
    selectedOpt !== null &&
    selectedOpt === (currentQuestion.correctAnswerIndex ?? 0);

  const handleConfirmAnswer = () => {
    if (selectedOpt === null || !currentQuestion) return;
    setRevealed(true);
    const correct = selectedOpt === (currentQuestion.correctAnswerIndex ?? 0);
    if (correct) {
      const nextScore = masteryPoints + 1;
      setMasteryPoints(nextScore);
      setStepPulseKey((k) => k + 1);
      if (nextScore >= 3 && currentLesson) {
        onSolidifyCurriculumLesson(currentSubject.id, currentChapter.id, currentLesson.id);
        setSolidifiedIds((prev) =>
          prev.includes(currentLesson.id) ? prev : [...prev, currentLesson.id]
        );
        if (onAwardBonusXp) onAwardBonusXp(40);
        fireSolidifyCelebration('complete');
      } else {
        fireSolidifyCelebration('step');
      }
    }
  };

  const handleNextQuestion = async () => {
    if (masteryPoints >= 3) {
      setStage('mastered');
      fireSolidifyCelebration('complete');
      return;
    }
    const nextIdx = qCursor + 1;
    setSelectedOpt(null);
    setRevealed(false);
    setSavedWrongFlag(false);
    if (nextIdx >= questionsQueue.length) {
      await fetchBatchQuestions(true);
    }
    setQCursor(nextIdx);
  };

  const handleSaveCurrentMistake = () => {
    if (!currentQuestion || !onSaveMistake || !currentLesson) return;
    onSaveMistake({
      subjectId: currentSubject.id,
      subjectName: currentSubject.name,
      lessonTitle: currentLesson.title,
      question: currentQuestion.question,
      wrongAnswer:
        selectedOpt !== null
          ? currentQuestion.options[selectedOpt] || 'اختيار خاطئ'
          : 'إجابة غير صحيحة',
      correctAnswer: currentQuestion.correctAnswerText,
      reasonOrRule: currentQuestion.explanation,
      sourceLabel: 'ثبت درسك',
    });
    setSavedWrongFlag(true);
  };

  const resetForLessonChange = (nextLessonId: string) => {
    setLessonId(nextLessonId);
    setStage('understand');
    setCheckedConcepts({});
    setQuestionsQueue([]);
    setMasteryPoints(0);
    setSelectedOpt(null);
    setRevealed(false);
  };

  const isAlreadySolidified = currentLesson ? solidifiedIds.includes(currentLesson.id) || currentLesson.isCompleted : false;
  const masteryPct = Math.min(100, Math.round((masteryPoints / 3) * 100));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Lesson Picker */}
      <div className="bg-white dark:bg-[#19191F] border border-amber-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-[#B58722] dark:text-[#D4AF37]" />
              <span>ثبّت درسك بعد الحصة</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92]">
              أخدت الحصة النهارده؟ راجع نقاط الفهم، ثم حُلَّ على الدرس لحد ما يثبت 100% ويتسجّل منجزاً في منهجك.
            </p>
          </div>
          <div className="bg-zinc-50 dark:bg-[#0D0D10] px-4 py-2 rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 text-center tabular-nums">
            <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">دروس مثبتة</span>
            <strong className="text-sm font-black text-emerald-500">{solidifiedIds.length}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={subjectId}
            onChange={(e) => {
              const sid = e.target.value;
              setSubjectId(sid);
              const sub = curriculum.find((s) => s.id === sid);
              const ch = sub?.chapters[0];
              setChapterId(ch?.id || '');
              resetForLessonChange(ch?.lessons[0]?.id || '');
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
              resetForLessonChange(ch?.lessons[0]?.id || '');
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
            value={lessonId}
            onChange={(e) => resetForLessonChange(e.target.value)}
            className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold"
          >
            {currentChapter?.lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} {l.isCompleted ? '✔' : ''}
              </option>
            ))}
          </select>
        </div>

        {isAlreadySolidified && stage === 'understand' && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>هذا الدرس منجز بالفعل في منهجك — يمكنك حله مرة أخرى لتأكيد التثبيت بنسبة 100%.</span>
          </div>
        )}
      </div>

      {/* Stage 1: Understand Core Lesson Points */}
      {stage === 'understand' && currentLesson && (
        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#D4AF37]" />
              <span>الخطوة 1: افهم ركائز الدرس «{currentLesson.title}»</span>
            </h2>
            <span className="text-xs font-bold text-zinc-500 dark:text-[#B5AA92]">علّم ما فهمته ثم انتقل للحل</span>
          </div>

          {currentChapter?.summary?.formulaOrNugget && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-[#0D0D10] border border-amber-200 dark:border-[#D4AF37]/25 text-xs sm:text-sm font-bold text-[#9A7218] dark:text-[#F3DFA2]">
              القانون / الخلاصة: {currentChapter.summary.formulaOrNugget}
            </div>
          )}

          <div className="space-y-2">
            {chapterConcepts.map((pt, idx) => {
              const checked = Boolean(checkedConcepts[idx]);
              const isJustPopped = justCheckedIdx === idx && checked;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const willBeChecked = !checkedConcepts[idx];
                    const nextMap = { ...checkedConcepts, [idx]: willBeChecked };
                    setCheckedConcepts(nextMap);
                    if (willBeChecked) {
                      setJustCheckedIdx(idx);
                      setTimeout(() => setJustCheckedIdx((cur) => (cur === idx ? null : cur)), 650);
                      const doneCount = chapterConcepts.filter((_, i) => nextMap[i]).length;
                      if (chapterConcepts.length > 0 && doneCount === chapterConcepts.length) {
                        fireSolidifyCelebration('concept');
                      }
                    }
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-right flex items-center gap-3 transition-all cursor-pointer ${
                    checked
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-zinc-950 dark:text-[#F4EFE6]'
                      : 'bg-zinc-50 dark:bg-[#0D0D10] border-zinc-200 dark:border-[#D4AF37]/20 text-zinc-800 dark:text-[#F4EFE6]'
                  }`}
                >
                  {checked ? (
                    <CheckCircle2
                      className={`w-5 h-5 text-emerald-500 shrink-0 ${
                        isJustPopped ? 'animate-celebrate-pop' : ''
                      }`}
                    />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-400 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm font-bold">{pt}</span>
                </button>
              );
            })}
          </div>

          {chapterConcepts.length > 0 &&
            chapterConcepts.every((_, idx) => Boolean(checkedConcepts[idx])) && (
              <div className="p-3 rounded-2xl bg-emerald-500/12 border border-emerald-500/35 text-xs font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
                <PartyPopper className="w-4 h-4 shrink-0 animate-celebrate-pop text-emerald-500" />
                <span>ممتاز! أتممت فهم كل نقاط الدرس — انطلق الآن لحل الأسئلة وتثبيت الدرس 100%.</span>
              </div>
            )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleStartPracticeStage}
              className="px-6 py-3 btn-luxury-gold rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>فهمت الأفكار — ابدأ حل الأسئلة للتثبيت</span>
            </button>
          </div>
        </div>
      )}

      {/* Stage 2: Adaptive Practice Until 100% Solidified */}
      {stage === 'practice' && (
        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-5">
          {/* Mastery Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-zinc-900 dark:text-[#F3DFA2]">
                مؤشر تثبيت الدرس (مطلوب 3 إجابات صحيحة متقنة)
              </span>
              <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{masteryPct}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-zinc-200 dark:bg-[#0D0D10] overflow-hidden border border-zinc-300 dark:border-[#D4AF37]/25">
              <div
                className="h-full bg-linear-to-r from-[#B58722] to-[#34D399] transition-all duration-300"
                style={{ width: `${masteryPct}%` }}
              />
            </div>
          </div>

          {errorMsg && <p className="text-xs font-bold text-rose-500">{errorMsg}</p>}

          {isLoadingQuestions && !currentQuestion ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs font-bold text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
              <span>جارٍ تحضير أسئلة التثبيت على الدرس...</span>
            </div>
          ) : currentQuestion ? (
            <div className="space-y-4">
              <h3 className="text-base font-black text-zinc-950 dark:text-[#F4EFE6] leading-relaxed">
                {currentQuestion.question}
              </h3>

              <div className="space-y-2">
                {currentQuestion.options.map((opt, idx) => {
                  const isCorrectIdx = idx === (currentQuestion.correctAnswerIndex ?? 0);
                  const isChosen = selectedOpt === idx;
                  let styleClass =
                    'bg-zinc-50 dark:bg-[#0D0D10] border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-900 dark:text-[#F4EFE6]';
                  if (revealed) {
                    if (isCorrectIdx) {
                      styleClass = 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-black';
                    } else if (isChosen) {
                      styleClass = 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 font-black';
                    }
                  } else if (isChosen) {
                    styleClass = 'bg-amber-50 dark:bg-[#09090C] border-[#D4AF37] text-[#9A7218] dark:text-[#F3DFA2] font-black';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={revealed}
                      onClick={() => setSelectedOpt(idx)}
                      className={`w-full p-3.5 rounded-2xl border text-right text-xs sm:text-sm transition-all cursor-pointer ${styleClass}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {!revealed ? (
                <button
                  type="button"
                  disabled={selectedOpt === null}
                  onClick={handleConfirmAnswer}
                  className="px-6 py-2.5 btn-luxury-gold rounded-xl text-xs font-black cursor-pointer disabled:opacity-50"
                >
                  تأكيد الإجابة
                </button>
              ) : (
                <div className="space-y-3 pt-2">
                  <div
                    key={stepPulseKey}
                    className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-1 ${
                      isChoiceCorrect
                        ? 'bg-emerald-500/10 border-emerald-500/35 animate-in fade-in duration-200'
                        : 'bg-rose-500/10 border-rose-500/35'
                    }`}
                  >
                    <strong className="flex items-center gap-2">
                      {isChoiceCorrect ? (
                        <>
                          <Sparkles className="w-4 h-4 text-emerald-500 animate-celebrate-pop shrink-0" />
                          <span>إجابة دقيقة! زاد تثبيتك للدرس ({masteryPct}%).</span>
                        </>
                      ) : (
                        <span>✕ ركّز في التعليل التالي — سنعرض لك سؤالاً آخر حتى يثبت الدرس تماماً:</span>
                      )}
                    </strong>
                    <p className="leading-relaxed text-zinc-800 dark:text-[#F4EFE6]">{currentQuestion.explanation}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {!isChoiceCorrect && onSaveMistake && (
                      <button
                        type="button"
                        disabled={savedWrongFlag}
                        onClick={handleSaveCurrentMistake}
                        className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-rose-400/40 text-xs font-bold text-rose-600 dark:text-rose-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <AlertOctagon className="w-4 h-4" />
                        <span>{savedWrongFlag ? 'حُفظت في غلطاتي ✔' : 'احفظ في غلطاتي'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      disabled={isLoadingQuestions}
                      className="px-5 py-2.5 btn-luxury-gold rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      {isLoadingQuestions && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{masteryPoints >= 3 ? 'إتمام التثبيت 100% 🎉' : 'السؤال التالي'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Stage 3: Solidified! */}
      {stage === 'mastered' && currentLesson && (
        <div className="relative overflow-hidden bg-white dark:bg-[#19191F] border-2 border-[#D4AF37]/60 rounded-3xl p-8 text-center space-y-4 shadow-xl animate-in fade-in duration-300">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/60 animate-celebrate-ring" />
            <span className="absolute inset-1 rounded-full bg-linear-to-br from-[#F6E2A6]/25 to-[#34D399]/20" />
            <div className="relative w-16 h-16 rounded-full bg-[#0D0D10] border-2 border-[#D4AF37] flex items-center justify-center shadow-lg animate-celebrate-pop">
              <Award className="w-9 h-9 text-[#D4AF37]" />
            </div>
            <Sparkles className="w-5 h-5 text-emerald-400 absolute -top-1 -right-1 animate-bounce" />
          </div>

          <h2 className="text-xl font-black text-zinc-950 dark:text-[#F3DFA2]">
            تم تثبيت درس «{currentLesson.title}» بنسبة 100% ✔
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92]">
            تم تسجيل الدرس كمكتمل في جدول منهجك وإضافة +40 XP مكافأة التثبيت المتقن!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => fireSolidifyCelebration('complete')}
              className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-[#0D0D10] border border-[#D4AF37]/40 text-xs font-black text-[#9A7218] dark:text-[#F3DFA2] flex items-center gap-1.5 cursor-pointer"
            >
              <PartyPopper className="w-4 h-4" />
              <span>احتفل بالإنجاز</span>
            </button>
            <button
              type="button"
              onClick={() => setStage('understand')}
              className="px-5 py-2.5 btn-luxury-gold rounded-xl text-xs font-black cursor-pointer"
            >
              ثبّت درساً آخر
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
