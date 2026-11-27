import React, { useState, useEffect } from 'react';
import {
  PenTool,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertOctagon,
  Lightbulb,
  BookOpen,
} from 'lucide-react';
import { Subject, EssayQuestionItem, EssayGradeResult, MistakeItem } from '../types';

const ESSAY_TYPES = [
  'علل / فسر علمياً',
  'ماذا يحدث إذا',
  'قارن واستنتج',
  'أثبت / مسألة مقالية بخطوات',
  'تعبير / Essay (عربي أو لغات)',
];

interface ArchivedEssayAttempt {
  id: string;
  subject: string;
  lesson: string;
  question: string;
  score: number;
  maxScore: number;
  createdAt: string;
}

interface EssayPracticeViewProps {
  curriculum: Subject[];
  accountPhone: string;
  onAwardBonusXp?: (amount: number) => void;
  onSaveMistake?: (mistake: Omit<MistakeItem, 'id' | 'reviewCount' | 'isResolved' | 'createdAt'>) => void;
}

export const EssayPracticeView: React.FC<EssayPracticeViewProps> = ({
  curriculum,
  accountPhone,
  onAwardBonusXp,
  onSaveMistake,
}) => {
  const archiveKey = `nahj_essay_archive_${accountPhone}`;

  const [subjectId, setSubjectId] = useState<string>(curriculum[0]?.id || 'biology');
  const currentSubject = curriculum.find((s) => s.id === subjectId) || curriculum[0];
  const [chapterId, setChapterId] = useState<string>(currentSubject?.chapters[0]?.id || '');
  const currentChapter =
    currentSubject?.chapters.find((c) => c.id === chapterId) || currentSubject?.chapters[0];
  const [lessonTitle, setLessonTitle] = useState<string>(
    currentChapter?.lessons[0]?.title || ''
  );
  const [questionType, setQuestionType] = useState<string>(ESSAY_TYPES[0]);

  const [currentItem, setCurrentItem] = useState<EssayQuestionItem | null>(null);
  const [studentAnswer, setStudentAnswer] = useState<string>('');
  const [gradeResult, setGradeResult] = useState<EssayGradeResult | null>(null);
  const [showRubricHint, setShowRubricHint] = useState<boolean>(false);
  const [savedToMistakes, setSavedToMistakes] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [archive, setArchive] = useState<ArchivedEssayAttempt[]>(() => {
    try {
      const raw = localStorage.getItem(archiveKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(archiveKey, JSON.stringify(archive.slice(0, 20)));
  }, [archive, archiveKey]);

  const handleGenerateEssay = async () => {
    if (!lessonTitle || isGenerating) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setGradeResult(null);
    setStudentAnswer('');
    setSavedToMistakes(false);
    setShowRubricHint(false);

    try {
      const res = await fetch('/api/gemini/essay-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: currentSubject?.name || 'الأحياء',
          chapter: currentChapter?.title || 'الفصل المحدد',
          lesson: lessonTitle,
          questionType,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'تعذر توليد السؤال المقالي.');
      } else {
        setCurrentItem(data.questionItem);
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم، حاول مرة أخرى.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGradeEssay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem || !studentAnswer.trim() || isGrading) return;
    setIsGrading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/gemini/essay-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: currentItem.subject,
          lesson: currentItem.lesson,
          question: currentItem.question,
          rubricPoints: currentItem.rubricPoints,
          sampleAnswer: currentItem.sampleAnswer,
          studentAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'تعذر تصحيح إجابتك.');
      } else {
        const g: EssayGradeResult = data.grade;
        setGradeResult(g);
        if (onAwardBonusXp) {
          onAwardBonusXp(g.score >= g.maxScore ? 25 : 15);
        }
        setArchive((prev) => [
          {
            id: `ea-${Date.now()}`,
            subject: currentItem.subject,
            lesson: currentItem.lesson,
            question: currentItem.question,
            score: g.score,
            maxScore: g.maxScore,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم، حاول مرة أخرى.');
    } finally {
      setIsGrading(false);
    }
  };

  const handleSaveMissingToMistakes = () => {
    if (!currentItem || !gradeResult || !onSaveMistake) return;
    onSaveMistake({
      subjectId: currentSubject?.id || 'general',
      subjectName: currentItem.subject,
      lessonTitle: currentItem.lesson,
      question: currentItem.question,
      wrongAnswer: studentAnswer,
      correctAnswer: gradeResult.modelAnswer,
      reasonOrRule: gradeResult.missingPoints.join(' · ') || gradeResult.teacherAdvice,
      sourceLabel: 'تدرب على المقالي',
    });
    setSavedToMistakes(true);
  };

  const wordCount = studentAnswer.trim() ? studentAnswer.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header + Generator Controls */}
      <div className="bg-white dark:bg-[#19191F] border border-amber-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2.5">
            <PenTool className="w-6 h-6 text-[#B58722] dark:text-[#D4AF37]" />
            <span>تدرب على المقالي في المنهج</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92]">
            درّب يدك على أسئلة المقالي بالنظام الجديد مع تصحيح دقيق حسب عناصر نموذج الوزارة.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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

          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold"
          >
            {ESSAY_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleGenerateEssay}
            disabled={isGenerating || !lessonTitle}
            className="py-2.5 px-4 btn-luxury-gold rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>هات سؤال مقالي</span>
          </button>
        </div>

        {errorMsg && <p className="text-xs font-bold text-rose-500">{errorMsg}</p>}
      </div>

      {/* Active Essay Workspace */}
      {currentItem && (
        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">
                {currentItem.subject} · {currentItem.lesson} · {currentItem.questionType}
              </span>
              <h2 className="text-base sm:text-lg font-black text-zinc-950 dark:text-[#F4EFE6] leading-relaxed">
                {currentItem.question}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowRubricHint((h) => !h)}
              className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{showRubricHint ? 'إخفاء التلميح' : 'توجيه قبل الكتابة'}</span>
            </button>
          </div>

          {showRubricHint && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-[#0D0D10] border border-amber-200 dark:border-[#D4AF37]/25 text-xs space-y-1.5">
              <p className="font-bold text-[#9A7218] dark:text-[#F3DFA2]">توجيه المصحح: {currentItem.hint}</p>
              <p className="text-zinc-600 dark:text-[#B5AA92]">
                تُقيّم إجابتك على {currentItem.rubricPoints.length} عناصر أساسية واضحة.
              </p>
            </div>
          )}

          <form onSubmit={handleGradeEssay} className="space-y-3">
            <textarea
              rows={5}
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="اكتب إجابتك المقالية كاملة ومنظمة بنقاط واضحة..."
              className="w-full p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs sm:text-sm leading-relaxed focus:outline-none focus:border-[#D4AF37]"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-zinc-500 dark:text-[#B5AA92] tabular-nums">
                عدد الكلمات: {wordCount} كلمة
              </span>
              <button
                type="submit"
                disabled={isGrading || !studentAnswer.trim()}
                className="px-5 py-2.5 btn-luxury-gold rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isGrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>صحّح إجابتي بنموذج الوزارة</span>
              </button>
            </div>
          </form>

          {gradeResult && (
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-[#0D0D10] border border-[#D4AF37]/35 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-black text-zinc-950 dark:text-[#F3DFA2]">
                  تقييم المصحح الآلي
                </h3>
                <span className="text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  الدرجة: {gradeResult.score} / {gradeResult.maxScore}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                  <strong className="text-emerald-700 dark:text-emerald-300 block">نقاط القوة في إجابتك:</strong>
                  <ul className="list-disc pr-4 space-y-1 text-zinc-800 dark:text-[#F4EFE6]">
                    {gradeResult.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
                  <strong className="text-rose-700 dark:text-rose-300 block">نقاط ناقصة تحتاج إضافتها:</strong>
                  {gradeResult.missingPoints.length === 0 ? (
                    <p className="text-emerald-600 dark:text-emerald-300 font-bold">إجابتك شملت كافة العناصر!</p>
                  ) : (
                    <ul className="list-disc pr-4 space-y-1 text-zinc-800 dark:text-[#F4EFE6]">
                      {gradeResult.missingPoints.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 space-y-1 text-xs sm:text-sm">
                <strong className="text-[#9A7218] dark:text-[#E8CE88] block">الإجابة النموذجية الكاملة:</strong>
                <p className="leading-relaxed text-zinc-900 dark:text-[#F4EFE6]">{gradeResult.modelAnswer}</p>
                <p className="text-xs text-zinc-500 dark:text-[#B5AA92] pt-1">
                  نصيحة المصحح: {gradeResult.teacherAdvice}
                </p>
              </div>

              {onSaveMistake && (
                <button
                  type="button"
                  disabled={savedToMistakes}
                  onClick={handleSaveMissingToMistakes}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-[#19191F] border border-rose-400/40 text-xs font-bold text-rose-600 dark:text-rose-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>{savedToMistakes ? 'تم حفظ السؤال في غلطاتي ✔' : 'احفظ النقطة الناقصة في غلطاتي'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Archive */}
      {archive.length > 0 && (
        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-3xl p-5 space-y-3">
          <h3 className="text-sm font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#D4AF37]" />
            <span>سجل تدريباتك المقالية السابقة</span>
          </h3>
          <div className="space-y-2">
            {archive.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/20 text-xs"
              >
                <div className="min-w-0">
                  <strong className="block truncate text-zinc-900 dark:text-[#F4EFE6]">{item.question}</strong>
                  <span className="text-[11px] text-zinc-500 dark:text-[#B5AA92]">
                    {item.subject} · {item.lesson}
                  </span>
                </div>
                <span className="font-black tabular-nums text-[#9A7218] dark:text-[#F3DFA2] shrink-0">
                  {item.score}/{item.maxScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
