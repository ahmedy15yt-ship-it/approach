import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  FileDown,
  Sparkles,
  Loader2,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  BookMarked,
  Sigma,
  ShieldAlert,
  GraduationCap,
  Trash2,
  History,
  Bot,
  Eye,
  EyeOff,
  Compass,
  Check,
  Copy,
} from 'lucide-react';
import { LessonMasterSummary, Subject } from '../types';
import { downloadLessonSummaryPdf } from '../utils/pdfExporter';

interface LessonSummarizerViewProps {
  curriculum: Subject[];
  accountPhone: string;
  initialSelection?: {
    subjectName?: string;
    chapterTitle?: string;
    lessonTitle?: string;
  } | null;
  onAwardBonusXp?: (xp: number) => void;
  onAskTutor?: (subject: string, prompt: string) => void;
  onPracticeQuestions?: (subject: string, chapter: string, lesson: string) => void;
}

type ReaderTab = 'concepts' | 'formulas-traps' | 'solved-questions';

const STORAGE_KEY_PREFIX = 'nahj_lesson_summaries_v1_';

export const LessonSummarizerView: React.FC<LessonSummarizerViewProps> = ({
  curriculum,
  accountPhone,
  initialSelection,
  onAwardBonusXp,
  onAskTutor,
  onPracticeQuestions,
}) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${accountPhone || 'guest'}`;

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    curriculum[0]?.id || 'biology'
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    curriculum[0]?.chapters[0]?.id || ''
  );
  const [selectedLessonTitle, setSelectedLessonTitle] = useState<string>(
    curriculum[0]?.chapters[0]?.lessons[0]?.title || ''
  );

  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [customChapter, setCustomChapter] = useState('');
  const [customLesson, setCustomLesson] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  const [detailLevel, setDetailLevel] = useState<'comprehensive' | 'exam-sprint'>('comprehensive');
  const [teachingStyle, setTeachingStyle] = useState<'storyteller' | 'academic'>('storyteller');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [readerTab, setReaderTab] = useState<ReaderTab>('concepts');
  const [revealedQuickCheck, setRevealedQuickCheck] = useState<Record<number, boolean>>({});
  const [revealedSteps, setRevealedSteps] = useState<Record<number, boolean>>({});

  const [savedSummaries, setSavedSummaries] = useState<LessonMasterSummary[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore malformed storage
    }
    return [];
  });

  const [activeSummary, setActiveSummary] = useState<LessonMasterSummary | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed[0]) return parsed[0];
      }
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedSummaries.slice(0, 12)));
    } catch {
      // ignore storage quota
    }
  }, [savedSummaries, storageKey]);

  // Pre-fill selection when navigated from Curriculum capsules
  useEffect(() => {
    if (!initialSelection?.subjectName) return;
    const matchedSubject = curriculum.find(
      (s) => s.name.trim() === initialSelection.subjectName?.trim()
    );
    if (matchedSubject) {
      setUseCustomTopic(false);
      setSelectedSubjectId(matchedSubject.id);
      const matchedChapter =
        matchedSubject.chapters.find((c) =>
          c.title.includes(initialSelection.chapterTitle || '')
        ) || matchedSubject.chapters[0];
      if (matchedChapter) {
        setSelectedChapterId(matchedChapter.id);
        if (initialSelection.lessonTitle) {
          const matchedLesson = matchedChapter.lessons.find((l) =>
            l.title.includes(initialSelection.lessonTitle || '')
          );
          if (matchedLesson) {
            setSelectedLessonTitle(matchedLesson.title);
          } else {
            setSelectedLessonTitle(initialSelection.lessonTitle);
          }
        } else {
          setSelectedLessonTitle(matchedChapter.lessons[0]?.title || '');
        }
      }
    }
  }, [initialSelection, curriculum]);

  const currentSubject = useMemo(
    () => curriculum.find((s) => s.id === selectedSubjectId) || curriculum[0],
    [curriculum, selectedSubjectId]
  );

  const currentChapter = useMemo(
    () =>
      currentSubject?.chapters.find((c) => c.id === selectedChapterId) ||
      currentSubject?.chapters[0],
    [currentSubject, selectedChapterId]
  );

  useEffect(() => {
    if (!currentSubject) return;
    const hasChapter = currentSubject.chapters.some((c) => c.id === selectedChapterId);
    if (!hasChapter) {
      const firstCh = currentSubject.chapters[0];
      setSelectedChapterId(firstCh?.id || '');
      setSelectedLessonTitle(firstCh?.lessons[0]?.title || '');
    }
  }, [currentSubject, selectedChapterId]);

  useEffect(() => {
    if (!currentChapter) return;
    const hasLesson = currentChapter.lessons.some((l) => l.title === selectedLessonTitle);
    if (!hasLesson && currentChapter.lessons[0]) {
      setSelectedLessonTitle(currentChapter.lessons[0].title);
    }
  }, [currentChapter, selectedLessonTitle]);

  const resolvedSubject = useCustomTopic
    ? customSubject.trim()
    : currentSubject?.name || '';
  const resolvedChapter = useCustomTopic
    ? customChapter.trim() || 'موضوع مخصص'
    : currentChapter?.title || '';
  const resolvedLesson = useCustomTopic
    ? customLesson.trim()
    : selectedLessonTitle;

  const handleGenerateSummary = async () => {
    if (!resolvedSubject || !resolvedLesson) {
      setErrorMsg('يرجى تحديد المادة والدرس (أو كتابة عنوان الدرس المخصص) أولاً.');
      return;
    }

    setErrorMsg(null);
    setPdfFeedback(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/gemini/summarize-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: resolvedSubject,
          chapter: resolvedChapter,
          lesson: resolvedLesson,
          detailLevel,
          teachingStyle,
          customNotes: customNotes.trim(),
          contextPoints: !useCustomTopic ? currentChapter?.summary?.keyPoints || [] : [],
          examTips: !useCustomTopic ? currentChapter?.summary?.examTips || [] : [],
          formulaOrNugget: !useCustomTopic ? currentChapter?.summary?.formulaOrNugget || '' : '',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.summary) {
        throw new Error(data.error || 'تعذر توليد ملخص الدرس حالياً.');
      }

      const generated: LessonMasterSummary = data.summary;
      setActiveSummary(generated);
      setSavedSummaries((prev) => [
        generated,
        ...prev.filter((item) => item.id !== generated.id),
      ].slice(0, 12));
      setReaderTab('concepts');
      setRevealedQuickCheck({});
      setRevealedSteps({});
      onAwardBonusXp?.(25);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء الاتصال بخادم التلخيص.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async (summaryToExport: LessonMasterSummary | null = activeSummary) => {
    if (!summaryToExport) return;
    setIsDownloadingPdf(true);
    setPdfFeedback(null);
    try {
      const { fileName, pageCount } = await downloadLessonSummaryPdf(summaryToExport);
      setPdfFeedback(`تم تحميل مذكرة «${fileName}» (${pageCount} صفحات A4 جاهزة للطباعة والمذاكرة)`);
    } catch {
      setErrorMsg('تعذر إنشاء ملف الـ PDF على هذا المتصفح، جرب المحاولة مجدداً.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDeleteSaved = (id: string) => {
    setSavedSummaries((prev) => prev.filter((item) => item.id !== id));
    if (activeSummary?.id === id) {
      setActiveSummary(null);
    }
  };

  const handleCopySummaryText = async (summary: LessonMasterSummary) => {
    const lines = [
      `📘 ${summary.subject} — ${summary.lesson}`,
      `الفكرة المحورية: ${summary.bigIdea}`,
      '',
      ...summary.conceptSections.map(
        (s, i) => `${i + 1}. ${s.title}\n${s.deepExplanation}\nمثال: ${s.realLifeExample}`
      ),
      '',
      '⚡ تريكات الامتحان:',
      ...summary.examTraps.map((t) => `- الفخ: ${t.trap}\n  الصواب: ${t.truth}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Section Header */}
      <header className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">
            <span>الصف الثالث الثانوي (علمي علوم)</span>
            <span aria-hidden="true">·</span>
            <span>مذكرة المستر بالذكاء الاصطناعي</span>
            <span aria-hidden="true">·</span>
            <span>شرح بالفهم + PDF</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] [text-wrap:balance]">
            مُـلخّص المنهج ومذكرات الفهم (PDF)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92] max-w-2xl leading-relaxed">
            اختر أي مادة وفصل ودرس ليقدّم لك المستر الخبير تحليلاً عميقاً وربطاً تراكمياً بين الأبواب مع القوانين، التريكات الخفية، والأسئلة المحلولة بالاستبعاد والبرهان — مع تحميله كملف PDF منسق للمراجعة.
          </p>
        </div>

        {activeSummary && (
          <div className="shrink-0">
            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={() => handleDownloadPdf(activeSummary)}
              className="btn-luxury-gold px-5 py-3 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>تحميل التلخيص PDF الآن</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Two-Zone Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Control & Lesson Selection Panel */}
        <aside className="xl:col-span-4 space-y-5">
          <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-[#D4AF37]/20">
              <div className="flex items-center gap-2 text-sm font-black text-zinc-950 dark:text-[#F6E2A6]">
                <GraduationCap className="w-4 h-4 text-[#9A7218] dark:text-[#D4AF37]" />
                <h2>إعداد مذكرة الدرس</h2>
              </div>

              <button
                type="button"
                onClick={() => setUseCustomTopic((v) => !v)}
                className="text-[11px] font-bold text-[#9A7218] dark:text-[#E8CE88] hover:underline cursor-pointer whitespace-nowrap"
              >
                {useCustomTopic ? 'اختيار من المنهج' : 'إدخال درس مخصص'}
              </button>
            </div>

            {!useCustomTopic ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-[#E8CE88] block">
                    المادة الدراسية
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                  >
                    {curriculum.map((subj) => (
                      <option key={subj.id} value={subj.id}>
                        {subj.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-[#E8CE88] block">
                    الفصل / الوحدة
                  </label>
                  <select
                    value={currentChapter?.id || ''}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                  >
                    {(currentSubject?.chapters || []).map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-[#E8CE88] block">
                    الدرس المطلوب تلخيصه وشرحه
                  </label>
                  <select
                    value={selectedLessonTitle}
                    onChange={(e) => setSelectedLessonTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                  >
                    {(currentChapter?.lessons || []).map((les) => (
                      <option key={les.id} value={les.title}>
                        {les.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-[#E8CE88] block">
                    اسم المادة
                  </label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="مثال: الفيزياء / الكيمياء العضوية / الأحياء"
                    className="w-full px-3.5 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] placeholder:text-zinc-400 dark:placeholder:text-[#7E7664] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-[#E8CE88] block">
                    اسم الفصل أو الباب
                  </label>
                  <input
                    type="text"
                    value={customChapter}
                    onChange={(e) => setCustomChapter(e.target.value)}
                    placeholder="مثال: الباب الأول - العناصر الانتقالية"
                    className="w-full px-3.5 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] placeholder:text-zinc-400 dark:placeholder:text-[#7E7664] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-[#E8CE88] block">
                    عنوان الدرس المخصص
                  </label>
                  <input
                    type="text"
                    value={customLesson}
                    onChange={(e) => setCustomLesson(e.target.value)}
                    placeholder="اكتب عنوان الدرس كاملاً..."
                    className="w-full px-3.5 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] placeholder:text-zinc-400 dark:placeholder:text-[#7E7664] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            )}

            {/* Explanation Style Segmented Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-zinc-700 dark:text-[#E8CE88] block">
                حجم التلخيص ومستوى التفصيل
              </span>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/20">
                <button
                  type="button"
                  onClick={() => setDetailLevel('comprehensive')}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                    detailLevel === 'comprehensive'
                      ? 'btn-luxury-gold'
                      : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
                  }`}
                >
                  شرح كامل بالفهم
                </button>
                <button
                  type="button"
                  onClick={() => setDetailLevel('exam-sprint')}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                    detailLevel === 'exam-sprint'
                      ? 'btn-luxury-gold'
                      : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
                  }`}
                >
                  مراجعة ليلة الامتحان
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-zinc-700 dark:text-[#E8CE88] block">
                أسلوب المستر في الشرح
              </span>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/20">
                <button
                  type="button"
                  onClick={() => setTeachingStyle('storyteller')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                    teachingStyle === 'storyteller'
                      ? 'btn-luxury-gold'
                      : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
                  }`}
                >
                  مبسّط وقصة وتشبيه
                </button>
                <button
                  type="button"
                  onClick={() => setTeachingStyle('academic')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                    teachingStyle === 'academic'
                      ? 'btn-luxury-gold'
                      : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
                  }`}
                >
                  أكاديمي صياغة كتاب
                </button>
              </div>
            </div>

            {/* Optional student notes or focus points */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-[#E8CE88] block">
                نقطة أو جزئية تريد التركيز عليها (اختياري)
              </label>
              <textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="مثال: ركز على مسائل كيرشوف، أو اشرح الفرق بين الإجهاد والشد العضلي..."
                className="w-full px-3.5 py-2 text-xs font-medium bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] placeholder:text-zinc-400 dark:placeholder:text-[#7E7664] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateSummary}
              className="w-full py-3 px-4 rounded-2xl btn-luxury-gold font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>المستر يجهّز الشرح ومذكرة الـ PDF...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>اشرح الدرس ولخّصه بالأسئلة (+25 XP)</span>
                </>
              )}
            </button>
          </div>

          {/* Saved Lesson Summaries Archive */}
          {savedSummaries.length > 0 && (
            <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-zinc-950 dark:text-[#F6E2A6]">
                <History className="w-4 h-4 text-[#9A7218] dark:text-[#D4AF37]" />
                <span>مذكراتي المحفوظة ({savedSummaries.length})</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {savedSummaries.map((item) => {
                  const isCurrent = activeSummary?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-colors flex items-start justify-between gap-2 ${
                        isCurrent
                          ? 'bg-amber-50/70 dark:bg-[#D4AF37]/15 border-[#D4AF37]/70'
                          : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37]/60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSummary(item);
                          setReaderTab('concepts');
                          setPdfFeedback(null);
                        }}
                        className="text-right min-w-0 grow cursor-pointer"
                      >
                        <div className="text-xs font-black text-zinc-950 dark:text-[#F4EFE6] truncate">
                          {item.lesson}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-[#B5AA92] mt-0.5 truncate">
                          {item.subject} · {item.solvedQuestions.length} أسئلة محلولة
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title="تحميل PDF"
                          onClick={() => handleDownloadPdf(item)}
                          className="p-1.5 rounded-lg text-[#9A7218] dark:text-[#E8CE88] hover:bg-amber-100 dark:hover:bg-[#19191F] cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="حذف المذكرة"
                          onClick={() => handleDeleteSaved(item.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Master Lesson Reader Stage */}
        <section className="xl:col-span-8 space-y-5">
          {!activeSummary ? (
            <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/40 text-[#9A7218] dark:text-[#E8CE88] mx-auto flex items-center justify-center">
                <BookOpenCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-xl mx-auto">
                <h2 className="text-lg sm:text-xl font-black text-zinc-950 dark:text-[#F6E2A6]">
                  مذكّرتك الشاملة للدرس جاهزة في ثوانٍ
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92] leading-relaxed">
                  حدد المادة والدرس من اللوحة الجانبية واضغط «اشرح الدرس ولخّصه بالأسئلة». ستحصل على شرح كامل من الصفر بأسلوب المستر، تريكات النظام الحديث، أسئلة محلولة بالخطوات، وملف <strong>PDF</strong> جاهز للتحميل والمذاكرة دون إنترنت.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Warnings / Feedback */}
              {activeSummary.warning && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/35 text-xs font-bold text-amber-900 dark:text-[#E8CE88] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                  <span>{activeSummary.warning}</span>
                </div>
              )}

              {pdfFeedback && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{pdfFeedback}</span>
                </div>
              )}

              {/* Active Lesson Summary Hero Card */}
              <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-100 dark:border-[#D4AF37]/20 pb-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">
                      <span>{activeSummary.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeSummary.chapter}</span>
                      {activeSummary.providerLabel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{activeSummary.providerLabel}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] [text-wrap:balance]">
                      {activeSummary.lesson}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isDownloadingPdf}
                      onClick={() => handleDownloadPdf(activeSummary)}
                      className="btn-luxury-gold px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
                    >
                      {isDownloadingPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5" />
                      )}
                      <span>تحميل المذكرة PDF</span>
                    </button>

                    {onPracticeQuestions && (
                      <button
                        type="button"
                        onClick={() =>
                          onPracticeQuestions(
                            activeSummary.subject,
                            activeSummary.chapter,
                            activeSummary.lesson
                          )
                        }
                        className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] text-xs font-bold text-zinc-800 dark:text-[#F3DFA2] hover:border-[#D4AF37] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>امتحن نفسك على الدرس</span>
                      </button>
                    )}

                    {onAskTutor && (
                      <button
                        type="button"
                        onClick={() =>
                          onAskTutor(
                            activeSummary.subject,
                            `أريد مناقشة وتعمق إضافي في درس "${activeSummary.lesson}" (${activeSummary.chapter}).`
                          )
                        }
                        className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] text-xs font-bold text-zinc-800 dark:text-[#E8CE88] hover:border-[#D4AF37] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>ناقش المستر</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopySummaryText(activeSummary)}
                      className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] text-xs font-bold text-zinc-700 dark:text-[#E8CE88] hover:border-[#D4AF37] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSummary ? 'تم النسخ' : 'نسخ المذكرة'}</span>
                    </button>
                  </div>
                </div>

                {/* Teacher Intro & Core Big Idea */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-[#09090C] border border-amber-200/80 dark:border-[#D4AF37]/30 space-y-1.5">
                    <div className="text-xs font-black text-[#9A7218] dark:text-[#E8CE88] flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      <span>كلمة المستر قبل ما تبدأ</span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-800 dark:text-[#F4EFE6] leading-relaxed">
                      {activeSummary.teacherIntro}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 space-y-1.5">
                    <div className="text-xs font-black text-[#9A7218] dark:text-[#E8CE88] flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4" />
                      <span>الفكرة المحورية للدرس</span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-800 dark:text-[#F4EFE6] leading-relaxed">
                      {activeSummary.bigIdea}
                    </p>
                  </div>
                </div>

                {/* Sub-navigation Tabs inside Reader */}
                <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25">
                  <button
                    type="button"
                    onClick={() => setReaderTab('concepts')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      readerTab === 'concepts'
                        ? 'btn-luxury-gold'
                        : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
                    }`}
                  >
                    <BookMarked className="w-3.5 h-3.5" />
                    <span>الشرح بالفهم ({activeSummary.conceptSections.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReaderTab('formulas-traps')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      readerTab === 'formulas-traps'
                        ? 'btn-luxury-gold'
                        : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
                    }`}
                  >
                    <Sigma className="w-3.5 h-3.5" />
                    <span>
                      القوانين والتركات ({activeSummary.formulasAndRules.length + activeSummary.examTraps.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReaderTab('solved-questions')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      readerTab === 'solved-questions'
                        ? 'btn-luxury-gold'
                        : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>
                      الأسئلة المحلولة واختبر نفسك ({activeSummary.solvedQuestions.length})
                    </span>
                  </button>
                </div>
              </div>

              {/* TAB 1: Deep Concept Explanations */}
              {readerTab === 'concepts' && (
                <div className="space-y-4">
                  {activeSummary.conceptSections.map((sec, idx) => (
                    <article
                      key={idx}
                      className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-[#D4AF37]/20 pb-3">
                        <h3 className="text-base sm:text-lg font-black text-zinc-950 dark:text-[#F6E2A6] leading-snug">
                          {idx + 1}. {sec.title}
                        </h3>
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-800 dark:text-[#F4EFE6] leading-loose whitespace-pre-line">
                        {sec.deepExplanation}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/20 space-y-1">
                          <div className="text-[11px] font-black text-[#9A7218] dark:text-[#E8CE88]">
                            لماذا نفهم هذه النقطة؟
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-[#B5AA92] leading-relaxed">
                            {sec.whyItMatters}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-[#09090C] border border-amber-200/70 dark:border-[#D4AF37]/30 space-y-1">
                          <div className="text-[11px] font-black text-[#9A7218] dark:text-[#F3DFA2]">
                            مثال واقعي وتطبيق ملموس
                          </div>
                          <p className="text-xs text-zinc-800 dark:text-[#F4EFE6] leading-relaxed">
                            {sec.realLifeExample}
                          </p>
                        </div>
                      </div>

                      {sec.keyTakeaways.length > 0 && (
                        <div className="pt-2 space-y-1.5">
                          <div className="text-xs font-black text-zinc-900 dark:text-[#E8CE88]">
                            خلاصة الفهم السريع:
                          </div>
                          <ul className="space-y-1.5">
                            {sec.keyTakeaways.map((pt, pIdx) => (
                              <li
                                key={pIdx}
                                className="flex items-start gap-2 text-xs text-zinc-700 dark:text-[#F4EFE6] leading-relaxed"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#9A7218] dark:text-[#D4AF37] shrink-0 mt-0.5" />
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {/* TAB 2: Formulas, Rules & Exam Traps */}
              {readerTab === 'formulas-traps' && (
                <div className="space-y-5">
                  {activeSummary.formulasAndRules.length > 0 && (
                    <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 text-sm sm:text-base font-black text-zinc-950 dark:text-[#F6E2A6]">
                        <Sigma className="w-4 h-4 text-[#9A7218] dark:text-[#D4AF37]" />
                        <h3>القوانين والعلاقات الأساسية في الدرس</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {activeSummary.formulasAndRules.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 space-y-2"
                          >
                            <div className="text-xs font-black text-[#9A7218] dark:text-[#E8CE88]">
                              {item.label}
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs sm:text-sm font-mono font-bold text-zinc-950 dark:text-[#F6E2A6] text-center">
                              {item.expression}
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-[#B5AA92] leading-relaxed">
                              <span className="font-bold text-zinc-900 dark:text-[#F4EFE6]">متى نستخدمها؟ </span>
                              {item.whenToUse}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSummary.examTraps.length > 0 && (
                    <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 text-sm sm:text-base font-black text-zinc-950 dark:text-[#F6E2A6]">
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                        <h3>تريكات المستر ومصائد النظام الحديث</h3>
                      </div>

                      <div className="space-y-3">
                        {activeSummary.examTraps.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 space-y-2.5"
                          >
                            <div className="text-xs font-bold text-red-700 dark:text-red-300 flex items-start gap-2">
                              <span className="shrink-0 font-black">✖ الفخ الشائع:</span>
                              <span>{item.trap}</span>
                            </div>
                            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-start gap-2 pt-2 border-t border-zinc-200 dark:border-[#D4AF37]/15">
                              <span className="shrink-0 font-black">✔ الفهم الصحيح:</span>
                              <span>{item.truth}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Solved Master Questions & Quick Self-Check */}
              {readerTab === 'solved-questions' && (
                <div className="space-y-5">
                  <div className="space-y-4">
                    {activeSummary.solvedQuestions.map((q, idx) => {
                      const hideSteps = revealedSteps[idx] === false;
                      return (
                        <article
                          key={idx}
                          className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 shadow-xs space-y-3.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-[#D4AF37]/20 pb-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">
                              <span className="tabular-nums font-black">سؤال محلول {idx + 1}</span>
                              <span aria-hidden="true">·</span>
                              <span>{q.questionType}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setRevealedSteps((prev) => ({
                                  ...prev,
                                  [idx]: prev[idx] === false ? true : false,
                                }))
                              }
                              className="text-[11px] font-bold text-zinc-600 dark:text-[#B5AA92] hover:text-[#9A7218] dark:hover:text-[#E8CE88] flex items-center gap-1 cursor-pointer"
                            >
                              {hideSteps ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>{hideSteps ? 'إظهار الحل والخطوات' : 'إخفاء الحل للتدريب'}</span>
                            </button>
                          </div>

                          <h3 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-[#F6E2A6] leading-relaxed">
                            {q.question}
                          </h3>

                          {!hideSteps && (
                            <div className="space-y-3">
                              {q.steps.length > 0 && (
                                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/20 space-y-1.5">
                                  <div className="text-xs font-black text-[#9A7218] dark:text-[#E8CE88]">
                                    طريقة التفكير والحل خطوة بخطوة:
                                  </div>
                                  <ol className="space-y-1 text-xs text-zinc-700 dark:text-[#F4EFE6] leading-relaxed list-decimal list-inside">
                                    {q.steps.map((step, sIdx) => (
                                      <li key={sIdx}>{step}</li>
                                    ))}
                                  </ol>
                                </div>
                              )}

                              <div className="p-3.5 rounded-2xl bg-emerald-50/75 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                                <div className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                                  ✔ الإجابة النموذجية: {q.answer}
                                </div>
                                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                  <strong className="text-[#9A7218] dark:text-[#E8CE88]">ملاحظة المستر: </strong>
                                  {q.teacherNote}
                                </p>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  {/* Quick Self-Check Flash Questions */}
                  {activeSummary.quickCheckQuestions.length > 0 && (
                    <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                      <h3 className="text-sm sm:text-base font-black text-zinc-950 dark:text-[#F6E2A6]">
                        اختبر فهمك السريع قبل تحميل المذكرة
                      </h3>

                      <div className="space-y-3">
                        {activeSummary.quickCheckQuestions.map((qc, qIdx) => {
                          const isShown = Boolean(revealedQuickCheck[qIdx]);
                          return (
                            <div
                              key={qIdx}
                              className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-[#F4EFE6] leading-relaxed">
                                  {qIdx + 1}. {qc.question}
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedQuickCheck((prev) => ({
                                      ...prev,
                                      [qIdx]: !prev[qIdx],
                                    }))
                                  }
                                  className="px-3 py-1 rounded-xl btn-luxury-gold text-[11px] font-black shrink-0 cursor-pointer whitespace-nowrap"
                                >
                                  {isShown ? 'إخفاء الإجابة' : 'اعرض الإجابة'}
                                </button>
                              </div>

                              {isShown && (
                                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs space-y-1">
                                  <div className="font-black text-emerald-800 dark:text-emerald-300">
                                    ✔ {qc.answer}
                                  </div>
                                  <p className="text-zinc-700 dark:text-zinc-300">{qc.explanation}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
