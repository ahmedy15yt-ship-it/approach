import React, { useState, useEffect, useMemo } from 'react';
import {
  FileQuestion,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Eye,
  EyeOff,
  RotateCcw,
  Copy,
  Check,
  Loader2,
  BookOpen,
  ListChecks,
  HelpCircle,
  SlidersHorizontal,
  Trash2,
  History,
  Bot,
  Award,
  AlertTriangle,
  PenLine,
  Layers,
  Swords,
  KeyRound,
  Trophy,
  Timer,
  Shuffle,
  Share2,
  RefreshCw,
  MonitorCheck,
  AlertOctagon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Subject,
  InteractiveQuestion,
  GeneratedQuestionSet,
  QuestionTypeFilter,
  QuestionDifficultyFilter,
  QuizChallengeRoom,
  MistakeItem,
} from '../types';
import {
  encodeQuizChallengeCode,
  decodeQuizChallengeCode,
  extractShortQuizRoomCode,
  buildQuizChallengeShareMessage,
  formatMinutesSeconds,
} from '../utils/challengeCodes';
import { useWakeLock } from '../utils/useWakeLock';

interface QuestionGeneratorViewProps {
  curriculum: Subject[];
  studentName?: string;
  accountPhone?: string;
  onAwardBonusXp?: (xp: number, reason?: string) => void;
  onAskTutor?: (subjectName: string, promptText: string) => void;
  onSaveMistake?: (mistake: Omit<MistakeItem, 'id' | 'reviewCount' | 'isResolved' | 'createdAt'>) => void;
}

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د'];

export const QuestionGeneratorView: React.FC<QuestionGeneratorViewProps> = ({
  curriculum,
  studentName = 'بطل نَهج',
  accountPhone,
  onAwardBonusXp,
  onAskTutor,
  onSaveMistake,
}) => {
  const [savedMistakeIds, setSavedMistakeIds] = useState<Record<string, boolean>>({});
  const storageKey = useMemo(
    () => `nahj_question_sets_${accountPhone || 'default'}`,
    [accountPhone]
  );
  const duelStorageKey = useMemo(
    () => `nahj_quiz_duels_${accountPhone || 'default'}`,
    [accountPhone]
  );

  // Top-level section tab: Solo Generator vs Friends Quiz Duel
  const [sectionTab, setSectionTab] = useState<'solo' | 'duel'>('solo');

  // Input Mode: pick from built-in curriculum or custom manual input
  const [inputMode, setInputMode] = useState<'curriculum' | 'custom'>('curriculum');

  // Curriculum Cascading Selectors
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    curriculum[0]?.id || 'biology'
  );
  const selectedSubject = useMemo(
    () => curriculum.find((s) => s.id === selectedSubjectId) || curriculum[0],
    [curriculum, selectedSubjectId]
  );

  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    curriculum[0]?.chapters[0]?.id || ''
  );
  const selectedChapter = useMemo(() => {
    if (!selectedSubject) return undefined;
    return (
      selectedSubject.chapters.find((c) => c.id === selectedChapterId) ||
      selectedSubject.chapters[0]
    );
  }, [selectedSubject, selectedChapterId]);

  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    curriculum[0]?.chapters[0]?.lessons[0]?.id || ''
  );
  const selectedLesson = useMemo(() => {
    if (!selectedChapter) return undefined;
    return (
      selectedChapter.lessons.find((l) => l.id === selectedLessonId) ||
      selectedChapter.lessons[0]
    );
  }, [selectedChapter, selectedLessonId]);

  useEffect(() => {
    if (!selectedSubject) return;
    const chapterExists = selectedSubject.chapters.some((c) => c.id === selectedChapterId);
    const nextChapter = chapterExists
      ? selectedSubject.chapters.find((c) => c.id === selectedChapterId)
      : selectedSubject.chapters[0];
    if (nextChapter && nextChapter.id !== selectedChapterId) {
      setSelectedChapterId(nextChapter.id);
    }
    if (nextChapter) {
      const lessonExists = nextChapter.lessons.some((l) => l.id === selectedLessonId);
      if (!lessonExists && nextChapter.lessons[0]) {
        setSelectedLessonId(nextChapter.lessons[0].id);
      }
    }
  }, [selectedSubject, selectedChapterId, selectedLessonId]);

  // Custom Input Fields
  const [customSubject, setCustomSubject] = useState('الأحياء');
  const [customChapter, setCustomChapter] = useState('التنسيق الهرموني');
  const [customLesson, setCustomLesson] = useState('الغدة الدرقية والباراثورمون');

  // Generation Configuration
  const [questionType, setQuestionType] = useState<QuestionTypeFilter>('mixed');
  const [difficulty, setDifficulty] = useState<QuestionDifficultyFilter>('balanced');
  const [questionCount, setQuestionCount] = useState<number>(6);
  const [focusNotes, setFocusNotes] = useState<string>('');

  // Generation & Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSets, setSavedSets] = useState<GeneratedQuestionSet[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [activeSet, setActiveSet] = useState<GeneratedQuestionSet | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedSets(Array.isArray(parsed) ? parsed : []);
      setActiveSet(Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null);
    } catch {
      setSavedSets([]);
      setActiveSet(null);
    }
  }, [storageKey]);

  const persistSets = (sets: GeneratedQuestionSet[]) => {
    setSavedSets(sets);
    try {
      localStorage.setItem(storageKey, JSON.stringify(sets.slice(0, 15)));
    } catch {
      // ignore quota
    }
  };

  // Interactive Quiz State (Solo)
  const [viewMode, setViewMode] = useState<'interactive' | 'answer_key'>('interactive');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [writtenAnswers, setWrittenAnswers] = useState<Record<string, string>>({});
  const [selfGradedShort, setSelfGradedShort] = useState<Record<string, boolean>>({});
  const [revealedQuestions, setRevealedQuestions] = useState<Record<string, boolean>>({});
  const [visibleHints, setVisibleHints] = useState<Record<string, boolean>>({});
  const [revealAllAnswers, setRevealAllAnswers] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Friends Quiz Challenge (Duel by Code) State
  const [duelRoomsHistory, setDuelRoomsHistory] = useState<QuizChallengeRoom[]>(() => {
    try {
      const raw = localStorage.getItem(duelStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [activeDuelRoom, setActiveDuelRoom] = useState<QuizChallengeRoom | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [duelError, setDuelError] = useState<string | null>(null);
  const [isCreatingDuel, setIsCreatingDuel] = useState(false);
  const [isJoiningDuel, setIsJoiningDuel] = useState(false);
  const [isSubmittingDuel, setIsSubmittingDuel] = useState(false);
  const [duelStartMs, setDuelStartMs] = useState<number>(Date.now());
  const [duelElapsedSeconds, setDuelElapsedSeconds] = useState<number>(0);
  const [duelAnswers, setDuelAnswers] = useState<Record<string, number>>({});
  const [duelShortAnswers, setDuelShortAnswers] = useState<Record<string, string>>({});
  const [duelSubmitted, setDuelSubmitted] = useState<boolean>(false);
  const [duelCopiedKey, setDuelCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(duelStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setDuelRoomsHistory(Array.isArray(parsed) ? parsed : []);
    } catch {
      setDuelRoomsHistory([]);
    }
  }, [duelStorageKey]);

  const persistDuelHistory = (rooms: QuizChallengeRoom[]) => {
    setDuelRoomsHistory(rooms);
    try {
      localStorage.setItem(duelStorageKey, JSON.stringify(rooms.slice(0, 12)));
    } catch {
      // ignore
    }
  };

  const isDuelTimerRunning = Boolean(
    activeDuelRoom && !duelSubmitted && sectionTab === 'duel'
  );
  useWakeLock(isDuelTimerRunning);

  // Stopwatch ticker while taking an active unsubmitted duel
  useEffect(() => {
    if (!activeDuelRoom || duelSubmitted || sectionTab !== 'duel') return;
    const id = setInterval(() => {
      setDuelElapsedSeconds(Math.max(0, Math.floor((Date.now() - duelStartMs) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [activeDuelRoom?.code, duelSubmitted, duelStartMs, sectionTab]);

  // Live polling leaderboard every 5 seconds while viewing an active duel room
  useEffect(() => {
    if (!activeDuelRoom?.code || sectionTab !== 'duel') return;
    let cancelled = false;

    const refreshRoom = async () => {
      try {
        const res = await fetch(
          `/api/quiz-challenge/room/${encodeURIComponent(activeDuelRoom.code)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.success && data.room) {
          setActiveDuelRoom(data.room);
          setDuelRoomsHistory((prev) => {
            const next = [data.room, ...prev.filter((r) => r.code !== data.room.code)].slice(0, 12);
            try {
              localStorage.setItem(duelStorageKey, JSON.stringify(next));
            } catch {
              // ignore
            }
            return next;
          });
        }
      } catch {
        // ignore network hiccup
      }
    };

    const timer = setInterval(refreshRoom, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeDuelRoom?.code, sectionTab, duelStorageKey]);

  const resetInteractionState = () => {
    setSelectedOptions({});
    setWrittenAnswers({});
    setSelfGradedShort({});
    setRevealedQuestions({});
    setVisibleHints({});
    setRevealAllAnswers(false);
  };

  const resolvedSubject =
    inputMode === 'curriculum' ? selectedSubject?.name || '' : customSubject.trim();
  const resolvedChapter =
    inputMode === 'curriculum' ? selectedChapter?.title || '' : customChapter.trim();
  const resolvedLesson =
    inputMode === 'curriculum' ? selectedLesson?.title || '' : customLesson.trim();

  // Collect previously seen stems for this subject/lesson so questions differ EVERY time
  const collectSeenStems = (targetSubject: string, targetLesson: string): string[] => {
    const stems: string[] = [];
    if (activeSet && activeSet.lesson === targetLesson) {
      activeSet.questions.forEach((q) => stems.push(q.question));
    }
    for (const s of savedSets) {
      if (s.subject === targetSubject || s.lesson === targetLesson) {
        s.questions.forEach((q) => {
          if (stems.length < 24 && !stems.includes(q.question)) {
            stems.push(q.question);
          }
        });
      }
    }
    return stems;
  };

  const fetchFreshQuestions = async (opts: {
    subject: string;
    chapter: string;
    lesson: string;
    count: number;
    qType: QuestionTypeFilter;
    diff: QuestionDifficultyFilter;
    notes?: string;
  }) => {
    const contextPoints =
      inputMode === 'curriculum' && selectedChapter?.summary?.keyPoints
        ? selectedChapter.summary.keyPoints
        : [];
    const excludeQuestions = collectSeenStems(opts.subject, opts.lesson);
    const variationSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const response = await fetch('/api/gemini/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: opts.subject,
        chapter: opts.chapter || 'الوحدة المحددة',
        lesson: opts.lesson,
        count: opts.count,
        questionType: opts.qType,
        difficulty: opts.diff,
        focusNotes: opts.notes || '',
        excludeQuestions,
        variationSeed,
        contextPoints,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success || !Array.isArray(data.questions)) {
      throw new Error(data.error || 'تعذر توليد الأسئلة من الخادم.');
    }
    return data as {
      questions: InteractiveQuestion[];
      source: 'gemini' | 'fallback';
      providerLabel?: string;
      warning?: string;
    };
  };

  const handleGenerateQuestions = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!resolvedSubject || !resolvedLesson) {
      setErrorMsg('يرجى تحديد المادة والدرس أولاً لتوليد الأسئلة بدقة.');
      return;
    }

    setIsGenerating(true);
    try {
      const data = await fetchFreshQuestions({
        subject: resolvedSubject,
        chapter: resolvedChapter,
        lesson: resolvedLesson,
        count: questionCount,
        qType: questionType,
        diff: difficulty,
        notes: focusNotes.trim(),
      });

      const newSet: GeneratedQuestionSet = {
        id: `qset-${Date.now()}`,
        subject: resolvedSubject,
        chapter: resolvedChapter || 'عام',
        lesson: resolvedLesson,
        questionTypeFilter: questionType,
        difficultyFilter: difficulty,
        questions: data.questions,
        source: data.source === 'gemini' ? 'gemini' : 'fallback',
        providerLabel: data.providerLabel,
        warning: data.warning,
        createdAt: new Date().toISOString(),
        scoreTotal: data.questions.length,
        scoreCorrect: 0,
        xpAwarded: false,
      };

      resetInteractionState();
      setActiveSet(newSet);
      const updated = [newSet, ...savedSets.filter((s) => s.id !== newSet.id)].slice(0, 15);
      persistSets(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء الاتصال بخادم توليد الأسئلة، حاول مرة أخرى.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Create a Duel Challenge Room from given questions (or generate fresh ones first)
  const createDuelRoomWithQuestions = async (meta: {
    subject: string;
    chapter: string;
    lesson: string;
    questions: InteractiveQuestion[];
  }) => {
    setDuelError(null);
    setIsCreatingDuel(true);
    try {
      const tempCode = `NHJ-Q${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const createdAt = new Date().toISOString();
      const baseShareCode = encodeQuizChallengeCode({
        v: 1,
        code: tempCode,
        title: `تحدي ${meta.lesson}`,
        subject: meta.subject,
        chapter: meta.chapter,
        lesson: meta.lesson,
        creatorName: studentName,
        questions: meta.questions,
        createdAt,
      });

      let finalRoom: QuizChallengeRoom = {
        code: tempCode,
        title: `تحدي ${meta.lesson}`,
        subject: meta.subject,
        chapter: meta.chapter,
        lesson: meta.lesson,
        creatorName: studentName,
        questions: meta.questions,
        participants: [],
        shareCode: baseShareCode,
        createdAt,
        updatedAt: createdAt,
      };

      try {
        const res = await fetch('/api/quiz-challenge/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: finalRoom.title,
            subject: finalRoom.subject,
            chapter: finalRoom.chapter,
            lesson: finalRoom.lesson,
            creatorName: studentName,
            questions: meta.questions,
            shareCode: baseShareCode,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.room) {
          const updatedShare = encodeQuizChallengeCode({
            v: 1,
            code: data.room.code,
            title: data.room.title,
            subject: data.room.subject,
            chapter: data.room.chapter,
            lesson: data.room.lesson,
            creatorName: data.room.creatorName,
            questions: data.room.questions,
            createdAt: data.room.createdAt,
          });
          finalRoom = { ...data.room, shareCode: updatedShare };
        }
      } catch {
        // Portable NAHJ-QZ share code still works even offline
      }

      setActiveDuelRoom(finalRoom);
      setDuelAnswers({});
      setDuelShortAnswers({});
      setDuelSubmitted(false);
      setDuelElapsedSeconds(0);
      setDuelStartMs(Date.now());
      setSectionTab('duel');
      persistDuelHistory([
        finalRoom,
        ...duelRoomsHistory.filter((r) => r.code !== finalRoom.code),
      ]);
    } catch (err: any) {
      setDuelError(err?.message || 'تعذر إنشاء غرفة التحدي حالياً.');
    } finally {
      setIsCreatingDuel(false);
    }
  };

  const handleGenerateAndCreateDuel = async () => {
    if (!resolvedSubject || !resolvedLesson) {
      setDuelError('يرجى تحديد المادة والدرس من القائمة أولاً لإنشاء تحدي أصدقاء.');
      return;
    }
    setDuelError(null);
    setIsCreatingDuel(true);
    try {
      const duelType = questionType === 'short_answer' ? 'mixed' : questionType;
      const data = await fetchFreshQuestions({
        subject: resolvedSubject,
        chapter: resolvedChapter,
        lesson: resolvedLesson,
        count: Math.min(10, questionCount),
        qType: duelType,
        diff: difficulty,
        notes: focusNotes.trim(),
      });
      await createDuelRoomWithQuestions({
        subject: resolvedSubject,
        chapter: resolvedChapter || 'عام',
        lesson: resolvedLesson,
        questions: data.questions,
      });
    } catch (err: any) {
      setDuelError(err?.message || 'تعذر توليد أسئلة التحدي.');
      setIsCreatingDuel(false);
    }
  };

  const handleJoinDuelByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuelError(null);
    const trimmed = joinCodeInput.trim();
    if (!trimmed) {
      setDuelError('يرجى إدخال كود التحدي الذي أرسله صديقك.');
      return;
    }

    setIsJoiningDuel(true);
    try {
      // 1) Try full portable NAHJ-QZ:... invite code first
      const decodedPortable = decodeQuizChallengeCode(trimmed);
      if (decodedPortable) {
        let liveRoom: QuizChallengeRoom = {
          code: decodedPortable.code,
          title: decodedPortable.title,
          subject: decodedPortable.subject,
          chapter: decodedPortable.chapter,
          lesson: decodedPortable.lesson,
          creatorName: decodedPortable.creatorName,
          questions: decodedPortable.questions,
          participants: [],
          shareCode: trimmed.match(/NAHJ-QZ:[A-Za-z0-9+/=]+/)?.[0] || trimmed,
          createdAt: decodedPortable.createdAt,
          updatedAt: new Date().toISOString(),
        };

        // Check if live room updates exist on server too
        try {
          const res = await fetch(
            `/api/quiz-challenge/room/${encodeURIComponent(decodedPortable.code)}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.room) {
              liveRoom = { ...data.room, shareCode: liveRoom.shareCode };
            }
          }
        } catch {
          // ignore
        }

        setActiveDuelRoom(liveRoom);
        setDuelAnswers({});
        setDuelShortAnswers({});
        setDuelSubmitted(false);
        setDuelElapsedSeconds(0);
        setDuelStartMs(Date.now());
        setJoinCodeInput('');
        persistDuelHistory([
          liveRoom,
          ...duelRoomsHistory.filter((r) => r.code !== liveRoom.code),
        ]);
        return;
      }

      // 2) Try short room code lookup on server (e.g., NHJ-Q7M4)
      const shortCode = extractShortQuizRoomCode(trimmed) || trimmed.toUpperCase();
      const res = await fetch(`/api/quiz-challenge/room/${encodeURIComponent(shortCode)}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.room) {
        throw new Error(
          data.message || 'كود التحدي غير موجود — اطلب من صديقك نسخ الكود السريع أو الدعوة الكاملة.'
        );
      }

      setActiveDuelRoom(data.room);
      setDuelAnswers({});
      setDuelShortAnswers({});
      setDuelSubmitted(false);
      setDuelElapsedSeconds(0);
      setDuelStartMs(Date.now());
      setJoinCodeInput('');
      persistDuelHistory([
        data.room,
        ...duelRoomsHistory.filter((r) => r.code !== data.room.code),
      ]);
    } catch (err: any) {
      setDuelError(err?.message || 'تعذر الدخول إلى غرفة التحدي بهذا الكود.');
    } finally {
      setIsJoiningDuel(false);
    }
  };

  const handleSubmitDuelResult = async () => {
    if (!activeDuelRoom || duelSubmitted) return;
    setIsSubmittingDuel(true);
    setDuelError(null);

    const finalSeconds = Math.max(1, Math.floor((Date.now() - duelStartMs) / 1000));
    let correctCount = 0;
    const totalQ = activeDuelRoom.questions.length;

    for (const q of activeDuelRoom.questions) {
      if (q.type === 'short_answer') {
        const userTxt = (duelShortAnswers[q.id] || '').trim();
        if (userTxt.length >= 6) {
          correctCount++;
        }
      } else if (duelAnswers[q.id] === q.correctAnswerIndex) {
        correctCount++;
      }
    }

    const accuracy = Math.round((correctCount / Math.max(1, totalQ)) * 100);
    const localParticipant = {
      name: studentName,
      scoreCorrect: correctCount,
      totalQuestions: totalQ,
      accuracy,
      timeSeconds: finalSeconds,
      submittedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/quiz-challenge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeDuelRoom.code,
          participantName: studentName,
          scoreCorrect: correctCount,
          totalQuestions: totalQ,
          timeSeconds: finalSeconds,
          fallbackRoom: activeDuelRoom,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.room) {
        setActiveDuelRoom(data.room);
        persistDuelHistory([
          data.room,
          ...duelRoomsHistory.filter((r) => r.code !== data.room.code),
        ]);
      } else {
        throw new Error('local-only');
      }
    } catch {
      const mergedParticipants = [
        ...activeDuelRoom.participants.filter((p) => p.name !== studentName),
        localParticipant,
      ].sort((a, b) =>
        b.scoreCorrect !== a.scoreCorrect
          ? b.scoreCorrect - a.scoreCorrect
          : a.timeSeconds - b.timeSeconds
      );
      const updatedRoom = {
        ...activeDuelRoom,
        participants: mergedParticipants,
        updatedAt: new Date().toISOString(),
      };
      setActiveDuelRoom(updatedRoom);
      persistDuelHistory([
        updatedRoom,
        ...duelRoomsHistory.filter((r) => r.code !== updatedRoom.code),
      ]);
    } finally {
      setDuelSubmitted(true);
      setIsSubmittingDuel(false);
      onAwardBonusXp?.(35, `مشاركة في تحدي الأسئلة: ${activeDuelRoom.lesson}`);
      if (accuracy >= 60) {
        confetti({ particleCount: 60, spread: 65, origin: { y: 0.7 } });
      }
    }
  };

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setDuelCopiedKey(key);
      setTimeout(() => setDuelCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleSelectOption = (q: InteractiveQuestion, optionIndex: number) => {
    if (!activeSet) return;
    setSelectedOptions((prev) => ({ ...prev, [q.id]: optionIndex }));
    setRevealedQuestions((prev) => ({ ...prev, [q.id]: true }));
  };

  const handleCheckShortAnswer = (qId: string, isCorrect?: boolean) => {
    setRevealedQuestions((prev) => ({ ...prev, [qId]: true }));
    if (typeof isCorrect === 'boolean') {
      setSelfGradedShort((prev) => ({ ...prev, [qId]: isCorrect }));
    }
  };

  // Compute live quiz progress and score
  const quizStats = useMemo(() => {
    if (!activeSet) {
      return { total: 0, answered: 0, correct: 0, accuracy: 0, isComplete: false };
    }
    const questions = activeSet.questions;
    let answered = 0;
    let correct = 0;

    for (const q of questions) {
      if (q.type === 'short_answer') {
        if (typeof selfGradedShort[q.id] === 'boolean') {
          answered++;
          if (selfGradedShort[q.id]) correct++;
        } else if (revealedQuestions[q.id]) {
          answered++;
        }
      } else {
        const picked = selectedOptions[q.id];
        if (typeof picked === 'number') {
          answered++;
          if (picked === q.correctAnswerIndex) correct++;
        }
      }
    }

    const total = questions.length;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const isComplete = total > 0 && answered === total;
    return { total, answered, correct, accuracy, isComplete };
  }, [activeSet, selectedOptions, selfGradedShort, revealedQuestions]);

  // Award XP once when completing all questions in a set
  useEffect(() => {
    if (!activeSet || !quizStats.isComplete || activeSet.xpAwarded) return;
    const xpReward = Math.max(15, quizStats.correct * 5 + 10);
    const updatedSet: GeneratedQuestionSet = {
      ...activeSet,
      scoreCorrect: quizStats.correct,
      scoreTotal: quizStats.total,
      xpAwarded: true,
    };
    setActiveSet(updatedSet);
    const nextSaved = savedSets.map((s) => (s.id === updatedSet.id ? updatedSet : s));
    persistSets(nextSaved);

    if (onAwardBonusXp) {
      onAwardBonusXp(xpReward, `إتمام أسئلة درس: ${activeSet.lesson}`);
    }
    if (quizStats.accuracy >= 70) {
      confetti({ particleCount: 55, spread: 60, origin: { y: 0.7 } });
    }
  }, [quizStats.isComplete, quizStats.correct, quizStats.total, quizStats.accuracy]);

  const handleCopyAllQuestions = async () => {
    if (!activeSet) return;
    const lines: string[] = [
      `اختبار تفاعلي: ${activeSet.subject} — ${activeSet.chapter} — ${activeSet.lesson}`,
      '='.repeat(40),
      '',
    ];
    activeSet.questions.forEach((q, idx) => {
      lines.push(`${idx + 1}. (${q.difficulty}) ${q.question}`);
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt, oIdx) => {
          const prefix = q.type === 'true_false' ? '-' : `${OPTION_LETTERS[oIdx] || oIdx + 1})`;
          lines.push(`   ${prefix} ${opt}`);
        });
      }
      lines.push(`   ✔ الإجابة الصحيحة: ${q.correctAnswerText}`);
      lines.push(`   💡 التفسير: ${q.explanation}`);
      lines.push('');
    });

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedId('all');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDeleteSavedSet = (id: string) => {
    const next = savedSets.filter((s) => s.id !== id);
    persistSets(next);
    if (activeSet?.id === id) {
      setActiveSet(next[0] || null);
      resetInteractionState();
    }
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Page Header + Solo vs Duel Mode Tabs */}
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/35 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">
              <FileQuestion className="w-4 h-4 shrink-0" />
              <span>مُنشئ المحتوى التعليمي التفاعلي</span>
              <span aria-hidden="true">·</span>
              <span>أسئلة متجددة في كل محاولة + تحدي أصدقاء بكود</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] leading-snug">
              مُنشئ الأسئلة التفاعلية وتحدي الأصدقاء
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92] max-w-3xl leading-relaxed">
              حدّد المادة والفصل والدرس للحصول على أسئلة سريعة ومختلفة في كل مرة مع الإجابات الصحيحة، أو أنشئ غرفة تحدي بكود وأرسله لصديقك للتنافس على نفس الأسئلة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex p-1 bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl">
              <button
                type="button"
                onClick={() => setSectionTab('solo')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  sectionTab === 'solo'
                    ? 'btn-luxury-gold shadow-2xs'
                    : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F4EFE6]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>توليد الأسئلة</span>
              </button>
              <button
                type="button"
                onClick={() => setSectionTab('duel')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  sectionTab === 'duel'
                    ? 'btn-luxury-gold shadow-2xs'
                    : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F4EFE6]'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>تحدي الأسئلة مع الأصدقاء</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION TAB 1: SOLO QUESTION GENERATOR */}
      {sectionTab === 'solo' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Control Deck (Right in RTL) */}
          <aside className="xl:col-span-4 space-y-5">
            <form
              onSubmit={handleGenerateQuestions}
              className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#D4AF37]/20 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#9A7218] dark:text-[#E8CE88]" />
                  <h2 className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6]">
                    إعداد الدرس والأسئلة
                  </h2>
                </div>

                <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-[#09090C] rounded-lg border border-zinc-200 dark:border-[#D4AF37]/25">
                  <button
                    type="button"
                    onClick={() => setInputMode('curriculum')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      inputMode === 'curriculum'
                        ? 'bg-white dark:bg-[#19191F] text-[#9A7218] dark:text-[#E8CE88] shadow-2xs border border-transparent dark:border-[#D4AF37]/30'
                        : 'text-zinc-500 dark:text-[#B5AA92]'
                    }`}
                  >
                    من المنهج
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('custom')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      inputMode === 'custom'
                        ? 'bg-white dark:bg-[#19191F] text-[#9A7218] dark:text-[#E8CE88] shadow-2xs border border-transparent dark:border-[#D4AF37]/30'
                        : 'text-zinc-500 dark:text-[#B5AA92]'
                    }`}
                  >
                    إدخال حر
                  </button>
                </div>
              </div>

              {inputMode === 'curriculum' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-[#E8CE88] mb-1.5">
                      1. المادة الدراسية
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                    >
                      {curriculum.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                          {subj.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-[#E8CE88] mb-1.5">
                      2. الباب / الفصل
                    </label>
                    <select
                      value={selectedChapter?.id || ''}
                      onChange={(e) => setSelectedChapterId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                    >
                      {selectedSubject?.chapters.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-[#E8CE88] mb-1.5">
                      3. الدرس المطلوب
                    </label>
                    <select
                      value={selectedLesson?.id || ''}
                      onChange={(e) => setSelectedLessonId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                    >
                      {selectedChapter?.lessons.map((les) => (
                        <option key={les.id} value={les.id}>
                          {les.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-[#E8CE88] mb-1">
                      1. المادة الدراسية
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="مثال: الكيمياء، الفيزياء، الرياضيات، التاريخ..."
                      className="w-full px-3.5 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-[#E8CE88] mb-1">
                      2. الفصل / الوحدة
                    </label>
                    <input
                      type="text"
                      value={customChapter}
                      onChange={(e) => setCustomChapter(e.target.value)}
                      placeholder="مثال: الفصل الثاني - التأثير المغناطيسي للتيار"
                      className="w-full px-3.5 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-[#E8CE88] mb-1">
                      3. الدرس المحدد
                    </label>
                    <input
                      type="text"
                      value={customLesson}
                      onChange={(e) => setCustomLesson(e.target.value)}
                      placeholder="مثال: القوة المغناطيسية وعزم الازدواج"
                      className="w-full px-3.5 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Question Type Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-[#E8CE88] mb-1.5">
                  نوع الأسئلة التفاعلية
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'mixed' as const, label: 'متنوع (موصى به)' },
                    { id: 'mcq' as const, label: 'اختيار من متعدد' },
                    { id: 'true_false' as const, label: 'صواب وخطأ' },
                    { id: 'short_answer' as const, label: 'مقالي واستنتاج' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setQuestionType(opt.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                        questionType === opt.id
                          ? 'bg-amber-50 dark:bg-[#D4AF37]/15 border-[#D4AF37] text-[#9A7218] dark:text-[#F6E2A6]'
                          : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 text-zinc-700 dark:text-[#B5AA92] hover:border-[#D4AF37]/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty & Count */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-[#E8CE88] mb-1.5">
                    مستوى الصعوبة
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as QuestionDifficultyFilter)}
                    className="w-full px-3 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="balanced">متدرج شامل</option>
                    <option value="basic">تأسيسي (فهم أولي)</option>
                    <option value="exam">مستوى امتحان</option>
                    <option value="advanced">تحدي وتركات عليا</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-[#E8CE88] mb-1.5">
                    عدد الأسئلة
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37] tabular-nums"
                  >
                    {[4, 6, 8, 10, 12].map((num) => (
                      <option key={num} value={num}>
                        {num} أسئلة
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-[#E8CE88] mb-1.5">
                  توجيهات إضافية (اختياري)
                </label>
                <input
                  type="text"
                  value={focusNotes}
                  onChange={(e) => setFocusNotes(e.target.value)}
                  placeholder="مثال: ركز على المسائل البيانية والتحويلات أو المقارنات..."
                  className="w-full px-3.5 py-2 text-xs font-medium bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3 px-4 rounded-2xl btn-luxury-gold disabled:opacity-60 font-black text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ التوليد السريع لأسئلة جديدة...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>توليد أسئلة جديدة الآن</span>
                  </>
                )}
              </button>
            </form>

            {/* Previously Generated Sets History */}
            {savedSets.length > 0 && (
              <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-zinc-900 dark:text-[#F4EFE6]">
                    <History className="w-4 h-4 text-[#9A7218] dark:text-[#E8CE88]" />
                    <span>الاختبارات المولّدة مؤخراً ({savedSets.length})</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pl-1">
                  {savedSets.map((setItem) => {
                    const isCurrent = activeSet?.id === setItem.id;
                    return (
                      <div
                        key={setItem.id}
                        className={`p-3 rounded-2xl border transition-colors flex items-start justify-between gap-2 ${
                          isCurrent
                            ? 'bg-amber-50/80 dark:bg-[#D4AF37]/15 border-[#D4AF37]/70'
                            : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37]/45'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSet(setItem);
                            resetInteractionState();
                          }}
                          className="text-right grow min-w-0 cursor-pointer"
                        >
                          <div className="text-xs font-black text-zinc-950 dark:text-[#F4EFE6] truncate">
                            {setItem.lesson}
                          </div>
                          <div className="text-[11px] font-semibold text-zinc-500 dark:text-[#B5AA92] mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{setItem.subject}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{setItem.questions.length} أسئلة</span>
                            {setItem.xpAwarded && typeof setItem.scoreCorrect === 'number' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-600 dark:text-emerald-400 tabular-nums font-bold">
                                  النتيجة {setItem.scoreCorrect}/{setItem.scoreTotal}
                                </span>
                              </>
                            )}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSavedSet(setItem.id)}
                          title="حذف هذه المجموعة"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-100/60 dark:hover:bg-red-950/60 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          {/* Interactive Stage (Left in RTL) */}
          <section className="xl:col-span-8 space-y-5">
            {!activeSet ? (
              <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/40 text-[#9A7218] dark:text-[#E8CE88] mx-auto flex items-center justify-center">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div className="space-y-2 max-w-lg mx-auto">
                  <h3 className="text-lg sm:text-xl font-black text-zinc-950 dark:text-[#F6E2A6]">
                    جاهز لتصميم اختبارك التفاعلي المتجدد
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92] leading-relaxed">
                    اختر <strong>المادة والفصل والدرس</strong> واضغط <strong>«توليد أسئلة جديدة الآن»</strong>. في كل مرة تطلب اختباراً جديداً ستظهر لك أسئلة وصياغات مختلفة تماماً عن المرات السابقة.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-right pt-2">
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 space-y-1">
                    <Shuffle className="w-4 h-4 text-[#9A7218] dark:text-[#E8CE88]" />
                    <div className="text-xs font-black text-zinc-950 dark:text-[#F4EFE6]">
                      مختلفة في كل محاولة
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92]">
                      يستبعد الأسئلة السابقة تلقائياً ويغيّر زاوية الطرح والترتيب.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 space-y-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-xs font-black text-zinc-950 dark:text-[#F4EFE6]">
                      تصحيح وإجابات نموذجية
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92]">
                      كشف فوري للإجابة الصحيحة مع التفسير العلمي.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 space-y-1">
                    <Swords className="w-4 h-4 text-[#9A7218] dark:text-[#E8CE88]" />
                    <div className="text-xs font-black text-zinc-950 dark:text-[#F4EFE6]">
                      تحدي أصدقاء بكود
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92]">
                      حوّل أي اختبار لغرفة تحدي وشارك الكود مع زملائك.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Active Quiz Header & Scoreboard */}
                <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-500 dark:text-[#B5AA92]">
                        <span className="text-[#9A7218] dark:text-[#E8CE88] font-black">
                          {activeSet.subject}
                        </span>
                        <span aria-hidden="true">/</span>
                        <span className="truncate max-w-xs">{activeSet.chapter}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {activeSet.providerLabel
                            ? `تم التوليد بواسطة ${activeSet.providerLabel}`
                            : activeSet.source === 'gemini'
                            ? 'تم التوليد بواسطة Gemini'
                            : 'محرك التوليد التعليمي السريع'}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-zinc-950 dark:text-[#F6E2A6]">
                        {activeSet.lesson}
                      </h2>
                    </div>

                    <div className="inline-flex p-1 bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewMode('interactive')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                          viewMode === 'interactive'
                            ? 'btn-luxury-gold shadow-2xs'
                            : 'text-zinc-600 dark:text-[#B5AA92]'
                        }`}
                      >
                        التدريب التفاعلي
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('answer_key')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                          viewMode === 'answer_key'
                            ? 'btn-luxury-gold shadow-2xs'
                            : 'text-zinc-600 dark:text-[#B5AA92]'
                        }`}
                      >
                        الأسئلة والإجابات
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleGenerateQuestions()}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-[#D4AF37]/50 text-[#9A7218] dark:text-[#E8CE88] hover:bg-amber-100/80 dark:hover:bg-[#D4AF37]/15 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>اختبار جديد بأسئلة مختلفة</span>
                    </button>

                    <button
                      type="button"
                      disabled={isCreatingDuel}
                      onClick={() =>
                        createDuelRoomWithQuestions({
                          subject: activeSet.subject,
                          chapter: activeSet.chapter,
                          lesson: activeSet.lesson,
                          questions: activeSet.questions,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl btn-luxury-gold text-xs font-black flex items-center gap-1.5 transition-opacity cursor-pointer whitespace-nowrap disabled:opacity-60"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>تحدي صديق بهذه الأسئلة بكود</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRevealAllAnswers((prev) => !prev)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 bg-zinc-50 dark:bg-[#09090C] text-xs font-bold text-zinc-800 dark:text-[#E8CE88] hover:border-[#D4AF37] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {revealAllAnswers ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>إخفاء الإجابات</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>كشف الإجابات</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyAllQuestions}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 bg-zinc-50 dark:bg-[#09090C] text-xs font-bold text-zinc-800 dark:text-[#E8CE88] hover:border-[#D4AF37] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {copiedId === 'all' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ بالإجابات</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={resetInteractionState}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 bg-zinc-50 dark:bg-[#09090C] text-xs font-bold text-zinc-800 dark:text-[#E8CE88] hover:border-[#D4AF37] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة المحاولة</span>
                    </button>
                  </div>

                  {activeSet.warning && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-800/60 text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{activeSet.warning}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateQuestions()}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 cursor-pointer shrink-0"
                      >
                        توليد آخر
                      </button>
                    </div>
                  )}

                  {/* Progress Bar & Live Metrics */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-[#D4AF37]/20 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <div className="flex items-center gap-3 text-zinc-700 dark:text-[#B5AA92] tabular-nums">
                        <span>
                          تم حل: <strong className="dark:text-[#F4EFE6]">{quizStats.answered}</strong> / {quizStats.total}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 dark:text-emerald-400">
                          صحيح: <strong>{quizStats.correct}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#9A7218] dark:text-[#E8CE88]">
                          الدقة: <strong>{quizStats.accuracy}%</strong>
                        </span>
                      </div>

                      {quizStats.isComplete && (
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          <span>اكتمل التدريب بنجاح!</span>
                        </span>
                      )}
                    </div>

                    <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-[#09090C] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-[#F6E2A6] via-[#D4AF37] to-[#B58722] transition-all duration-300"
                        style={{
                          width: `${
                            quizStats.total > 0
                              ? Math.round((quizStats.answered / quizStats.total) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  {activeSet.questions.map((q, index) => {
                    const pickedIdx = selectedOptions[q.id];
                    const isRevealed =
                      viewMode === 'answer_key' ||
                      revealAllAnswers ||
                      Boolean(revealedQuestions[q.id]);
                    const hasPicked = typeof pickedIdx === 'number';
                    const isCorrect =
                      q.type === 'short_answer'
                        ? selfGradedShort[q.id] === true
                        : hasPicked && pickedIdx === q.correctAnswerIndex;
                    const isWrong =
                      q.type === 'short_answer'
                        ? selfGradedShort[q.id] === false
                        : hasPicked && pickedIdx !== q.correctAnswerIndex;

                    const typeText =
                      q.type === 'mcq'
                        ? 'اختيار من متعدد'
                        : q.type === 'true_false'
                        ? 'صواب وخطأ'
                        : 'سؤال مقالي قصير';

                    return (
                      <article
                        key={q.id}
                        className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 shadow-xs space-y-4 transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-[#D4AF37]/20 pb-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-[#B5AA92]">
                            <span className="text-[#9A7218] dark:text-[#E8CE88] font-black tabular-nums">
                              السؤال {index + 1}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{typeText}</span>
                            <span aria-hidden="true">·</span>
                            <span>المستوى: {q.difficulty}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isCorrect && (
                              <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>إجابة صحيحة</span>
                              </span>
                            )}
                            {isWrong && (
                              <span className="inline-flex items-center gap-1 text-xs font-black text-red-600 dark:text-red-400">
                                <XCircle className="w-4 h-4" />
                                <span>راجع الإجابة الصحيحة</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-[#F6E2A6] leading-relaxed">
                          {q.question}
                        </h3>

                        {q.type === 'short_answer' ? (
                          <div className="space-y-3">
                            {viewMode === 'interactive' && (
                              <div className="space-y-2">
                                <textarea
                                  rows={2}
                                  value={writtenAnswers[q.id] || ''}
                                  onChange={(e) =>
                                    setWrittenAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="اكتب إجابتك هنا ثم اضغط «تحقق وقارن بالإجابة الصحيحة»..."
                                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl text-zinc-950 dark:text-[#F4EFE6] placeholder:text-zinc-400 dark:placeholder:text-[#7E7664] focus:outline-none focus:border-[#D4AF37]"
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCheckShortAnswer(q.id)}
                                    className="px-3.5 py-1.5 rounded-xl btn-luxury-gold text-xs font-black flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <PenLine className="w-3.5 h-3.5" />
                                    <span>تحقق واعرض الإجابة النموذجية</span>
                                  </button>

                                  {isRevealed && typeof selfGradedShort[q.id] !== 'boolean' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleCheckShortAnswer(q.id, true)}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>إجابتي صحيحة</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCheckShortAnswer(q.id, false)}
                                        className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-[#09090C] border border-transparent dark:border-[#D4AF37]/25 hover:bg-zinc-300 dark:hover:border-[#D4AF37]/50 text-zinc-900 dark:text-[#B5AA92] text-xs font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Layers className="w-3.5 h-3.5" />
                                        <span>تحتاج مراجعة</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = pickedIdx === optIdx;
                              const isOptionCorrect = optIdx === q.correctAnswerIndex;

                              let optionStyles =
                                'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-900 dark:text-[#F4EFE6] hover:border-[#D4AF37]/75';

                              if (isRevealed) {
                                if (isOptionCorrect) {
                                  optionStyles =
                                    'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200';
                                } else if (isSelected && !isOptionCorrect) {
                                  optionStyles =
                                    'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-200';
                                }
                              } else if (isSelected) {
                                optionStyles =
                                  'bg-amber-50 dark:bg-[#D4AF37]/15 border-[#D4AF37] text-[#9A7218] dark:text-[#F6E2A6]';
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => handleSelectOption(q, optIdx)}
                                  className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2.5 cursor-pointer ${optionStyles}`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-6 h-6 rounded-lg bg-white dark:bg-[#19191F] border border-zinc-300 dark:border-[#D4AF37]/30 text-[11px] font-black text-zinc-900 dark:text-[#E8CE88] flex items-center justify-center shrink-0">
                                      {q.type === 'true_false'
                                        ? optIdx === 0
                                          ? '✓'
                                          : '✕'
                                        : OPTION_LETTERS[optIdx] || optIdx + 1}
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold leading-snug">
                                      {opt}
                                    </span>
                                  </div>

                                  {isRevealed && isOptionCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  )}
                                  {isRevealed && isSelected && !isOptionCorrect && (
                                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {q.hint && (
                              <button
                                type="button"
                                onClick={() =>
                                  setVisibleHints((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                                }
                                className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/35 text-amber-800 dark:text-[#E8CE88] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>{visibleHints[q.id] ? 'إخفاء التلميح' : 'تلميح'}</span>
                              </button>
                            )}

                            {!isRevealed && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedQuestions((prev) => ({ ...prev, [q.id]: true }))
                                }
                                className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-700 dark:text-[#F4EFE6] text-[11px] font-bold flex items-center gap-1 hover:border-[#D4AF37] cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>إظهار الإجابة الصحيحة</span>
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {isRevealed && onSaveMistake && (
                              <button
                                type="button"
                                disabled={Boolean(savedMistakeIds[q.id])}
                                onClick={() => {
                                  const pickedOpt =
                                    pickedIdx !== undefined && q.options[pickedIdx]
                                      ? q.options[pickedIdx]
                                      : 'إجابة غير دقيقة';
                                  onSaveMistake({
                                    subjectId: selectedSubject?.id || 'general',
                                    subjectName: activeSet.subject,
                                    lessonTitle: activeSet.lesson,
                                    question: q.question,
                                    wrongAnswer: pickedOpt,
                                    correctAnswer: q.correctAnswerText,
                                    reasonOrRule: q.explanation,
                                    sourceLabel: 'مُنشئ الأسئلة',
                                  });
                                  setSavedMistakeIds((prev) => ({ ...prev, [q.id]: true }));
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/35 text-[11px] font-bold text-rose-600 dark:text-rose-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <AlertOctagon className="w-3.5 h-3.5" />
                                <span>{savedMistakeIds[q.id] ? 'حُفظ في غلطاتي ✔' : 'احفظ في غلطاتي'}</span>
                              </button>
                            )}

                            {onAskTutor && (
                              <button
                                type="button"
                                onClick={() =>
                                  onAskTutor(
                                    activeSet.subject,
                                    `اشرح لي بعمق هذا السؤال من درس "${activeSet.lesson}" (${activeSet.chapter}):\n${q.question}\nالإجابة الصحيحة هي: ${q.correctAnswerText}`
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#9A7218] dark:text-[#E8CE88] hover:bg-amber-50 dark:hover:bg-[#D4AF37]/15 flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Bot className="w-3.5 h-3.5" />
                                <span>اسأل أستاذ نَهج لشرح أعمق</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {visibleHints[q.id] && q.hint && (
                          <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/35 text-xs font-semibold text-amber-950 dark:text-[#E8CE88] flex items-start gap-2">
                            <HelpCircle className="w-4 h-4 text-amber-600 dark:text-[#D4AF37] shrink-0 mt-0.5" />
                            <span>{q.hint}</span>
                          </div>
                        )}

                        {isRevealed && (
                          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                            <div className="flex items-start gap-2 text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="ml-1">الإجابة الصحيحة:</span>
                                <span className="text-zinc-950 dark:text-white">
                                  {q.correctAnswerText}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                              <Lightbulb className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                              <p>{q.explanation}</p>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      ) : (
        /* SECTION TAB 2: FRIENDS QUIZ CHALLENGE BY CODE */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left/Right Duel Setup & Join Controls */}
          <aside className="xl:col-span-4 space-y-5">
            {/* Join Friend Challenge by Code */}
            <form
              onSubmit={handleJoinDuelByCode}
              className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center gap-2 text-sm font-black text-zinc-950 dark:text-[#F6E2A6]">
                <KeyRound className="w-4 h-4 text-[#9A7218] dark:text-[#D4AF37]" />
                <h2>دخول تحدي بكود من صديقك</h2>
              </div>
              <p className="text-xs text-zinc-600 dark:text-[#B5AA92] leading-relaxed">
                أدخل كود الغرفة القصير (مثل <span className="font-mono font-bold text-[#9A7218] dark:text-[#E8CE88]">NHJ-Q482</span>) أو كود الدعوة الكامل لتحصل فوراً على نفس الأسئلة وتنافس صديقك في النتيجة والسرعة.
              </p>

              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="الصق كود الغرفة أو NAHJ-QZ..."
                className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl text-zinc-950 dark:text-[#F6E2A6] placeholder:text-zinc-400 dark:placeholder:text-[#7E7664] focus:outline-none focus:border-[#D4AF37]"
                dir="ltr"
              />

              <button
                type="submit"
                disabled={isJoiningDuel}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 dark:bg-[#09090C] border border-transparent dark:border-[#D4AF37]/40 text-white dark:text-[#F3DFA2] hover:opacity-90 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-opacity disabled:opacity-60"
              >
                {isJoiningDuel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Swords className="w-4 h-4" />
                )}
                <span>دخول التحدي الآن</span>
              </button>
            </form>

            {/* Quick Create New Duel */}
            <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-sm font-black text-zinc-950 dark:text-[#F6E2A6]">
                <Sparkles className="w-4 h-4 text-[#9A7218] dark:text-[#D4AF37]" />
                <h2>إنشاء غرفة تحدي أسئلة جديدة</h2>
              </div>

              <div className="text-xs text-zinc-600 dark:text-[#B5AA92] space-y-1 bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-3">
                <div>
                  <span className="font-bold text-zinc-900 dark:text-[#E8CE88]">المادة:</span> {resolvedSubject || 'غير محددة'}
                </div>
                <div className="truncate">
                  <span className="font-bold text-zinc-900 dark:text-[#E8CE88]">الدرس:</span> {resolvedLesson || 'غير محدد'}
                </div>
                <div className="tabular-nums">
                  <span className="font-bold text-zinc-900 dark:text-[#E8CE88]">عدد أسئلة التحدي:</span> {Math.min(10, questionCount)} أسئلة
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSectionTab('solo')}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 bg-transparent dark:bg-[#09090C] text-xs font-bold text-zinc-700 dark:text-[#F4EFE6] hover:border-[#D4AF37] cursor-pointer whitespace-nowrap"
                >
                  تغيير الدرس
                </button>
                <button
                  type="button"
                  disabled={isCreatingDuel}
                  onClick={handleGenerateAndCreateDuel}
                  className="grow py-2.5 px-4 rounded-xl btn-luxury-gold font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isCreatingDuel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Swords className="w-4 h-4" />
                  )}
                  <span>توليد تحدي وإصدار كود</span>
                </button>
              </div>
            </div>

            {duelError && (
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{duelError}</span>
              </div>
            )}

            {/* Recent Duel Rooms History */}
            {duelRoomsHistory.length > 0 && (
              <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-4 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-zinc-900 dark:text-[#F6E2A6]">
                  <History className="w-4 h-4 text-[#9A7218] dark:text-[#D4AF37]" />
                  <span>غرف التحدي الأخيرة ({duelRoomsHistory.length})</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {duelRoomsHistory.map((room) => (
                    <button
                      key={room.code}
                      type="button"
                      onClick={() => {
                        setActiveDuelRoom(room);
                        const me = room.participants.find((p) => p.name === studentName);
                        setDuelSubmitted(Boolean(me));
                        setDuelAnswers({});
                        setDuelShortAnswers({});
                        setDuelStartMs(Date.now());
                        setDuelElapsedSeconds(0);
                      }}
                      className={`w-full text-right p-3 rounded-2xl border transition-colors cursor-pointer ${
                        activeDuelRoom?.code === room.code
                          ? 'bg-amber-50/80 dark:bg-[#D4AF37]/15 border-[#D4AF37]/70'
                          : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-zinc-950 dark:text-[#F4EFE6] truncate">
                          {room.lesson}
                        </span>
                        <span className="text-[11px] font-mono font-black text-[#9A7218] dark:text-[#F3DFA2] shrink-0">
                          {room.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-[#B5AA92] mt-0.5 tabular-nums">
                        {room.subject} · {room.participants.length} متسابقين
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Active Duel Arena */}
          <section className="xl:col-span-8 space-y-5">
            {!activeDuelRoom ? (
              <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/40 text-[#9A7218] dark:text-[#E8CE88] mx-auto flex items-center justify-center">
                  <Swords className="w-8 h-8" />
                </div>
                <div className="space-y-2 max-w-lg mx-auto">
                  <h3 className="text-lg sm:text-xl font-black text-zinc-950 dark:text-[#F6E2A6]">
                    نافس أصدقاءك على نفس الأسئلة بكود موحد
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92] leading-relaxed">
                    أنشئ غرفة تحدي أسئلة الآن لتحصل على <strong>كود مشاركة فوري</strong>، أو أدخل كوداً أرسله لك زميلك لتخوضا نفس الاختبار ويظهر ترتيبكما حسب الدقة والسرعة.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Room Code Banner & Leaderboard */}
                <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">
                        <span>غرفة التحدي: {activeDuelRoom.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeDuelRoom.subject}</span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-zinc-950 dark:text-[#F6E2A6] mt-0.5">
                        {activeDuelRoom.lesson}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-mono font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-1.5 tabular-nums">
                        <Timer className="w-3.5 h-3.5 text-[#9A7218] dark:text-[#D4AF37]" />
                        <span>{formatMinutesSeconds(duelElapsedSeconds)}</span>
                        {!duelSubmitted && (
                          <span
                            title="الشاشة لن تفصل أثناء التحدي"
                            className="inline-flex items-center gap-1 text-[10px] font-['Cairo',sans-serif] font-bold text-emerald-600 dark:text-emerald-400 border-r border-zinc-300 dark:border-[#D4AF37]/25 pr-1.5 mr-0.5"
                          >
                            <MonitorCheck className="w-3 h-3" />
                            <span>الشاشة نشطة</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyText(activeDuelRoom.code, 'short')}
                        className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 bg-zinc-50 dark:bg-[#09090C] text-xs font-bold text-zinc-800 dark:text-[#F4EFE6] hover:border-[#D4AF37] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {duelCopiedKey === 'short' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>نسخ كود الغرفة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            buildQuizChallengeShareMessage(activeDuelRoom, studentName),
                            'invite'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl btn-luxury-gold text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {duelCopiedKey === 'invite' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                        <span>مشاركة دعوة مع الكود</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Leaderboard */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-[#D4AF37]/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black text-zinc-900 dark:text-[#F6E2A6]">
                        <Trophy className="w-4 h-4 text-[#D4AF37]" />
                        <span>ترتيب المتنافسين ({activeDuelRoom.participants.length})</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const r = await fetch(
                              `/api/quiz-challenge/room/${encodeURIComponent(activeDuelRoom.code)}`
                            );
                            const d = await r.json();
                            if (r.ok && d.success && d.room) setActiveDuelRoom(d.room);
                          } catch {
                            // ignore
                          }
                        }}
                        className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] hover:text-[#9A7218] dark:hover:text-[#E8CE88] flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>تحديث</span>
                      </button>
                    </div>

                    {activeDuelRoom.participants.length === 0 ? (
                      <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
                        لم يسلم أحد نتيجته بعد — ابدأ حل الأسئلة الآن وسجّل أول نتيجة في الصدارة!
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {activeDuelRoom.participants.map((p, idx) => (
                          <div
                            key={`${p.name}-${idx}`}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                              p.name === studentName
                                ? 'bg-amber-50/70 dark:bg-[#D4AF37]/15 border-[#D4AF37]/60 font-black'
                                : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 font-bold'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-[#19191F] border border-transparent dark:border-[#D4AF37]/25 text-zinc-900 dark:text-[#E8CE88] flex items-center justify-center font-black tabular-nums shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate text-zinc-950 dark:text-[#F4EFE6]">
                                {p.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 tabular-nums shrink-0 text-zinc-700 dark:text-[#B5AA92]">
                              <span className="text-emerald-700 dark:text-emerald-400 font-black">
                                {p.scoreCorrect} / {p.totalQuestions}
                              </span>
                              <span>{p.accuracy}%</span>
                              <span className="font-mono">{p.timeSeconds}ث</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Duel Questions */}
                <div className="space-y-4">
                  {activeDuelRoom.questions.map((q, index) => {
                    const pickedIdx = duelAnswers[q.id];
                    const isOptionPhase = q.type !== 'short_answer' && q.options.length > 0;

                    return (
                      <article
                        key={q.id}
                        className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-[#B5AA92]">
                          <span className="text-[#9A7218] dark:text-[#E8CE88] font-black tabular-nums">
                            سؤال التحدي {index + 1} / {activeDuelRoom.questions.length}
                          </span>
                          <span>المستوى: {q.difficulty}</span>
                        </div>

                        <h3 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-[#F6E2A6] leading-relaxed">
                          {q.question}
                        </h3>

                        {isOptionPhase ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = pickedIdx === optIdx;
                              const isOptionCorrect = optIdx === q.correctAnswerIndex;

                              let styles =
                                'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-900 dark:text-[#F4EFE6] hover:border-[#D4AF37]/75';

                              if (duelSubmitted) {
                                if (isOptionCorrect) {
                                  styles =
                                    'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200';
                                } else if (isSelected && !isOptionCorrect) {
                                  styles =
                                    'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-200';
                                }
                              } else if (isSelected) {
                                styles =
                                  'bg-amber-50 dark:bg-[#D4AF37]/15 border-[#D4AF37] text-[#9A7218] dark:text-[#F6E2A6]';
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={duelSubmitted}
                                  onClick={() =>
                                    setDuelAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                                  }
                                  className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer disabled:cursor-default ${styles}`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-6 h-6 rounded-lg bg-white dark:bg-[#19191F] border border-zinc-300 dark:border-[#D4AF37]/30 text-[11px] font-black text-zinc-900 dark:text-[#E8CE88] flex items-center justify-center shrink-0">
                                      {q.type === 'true_false'
                                        ? optIdx === 0
                                          ? '✓'
                                          : '✕'
                                        : OPTION_LETTERS[optIdx] || optIdx + 1}
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold">{opt}</span>
                                  </div>
                                  {duelSubmitted && isOptionCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  )}
                                  {duelSubmitted && isSelected && !isOptionCorrect && (
                                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <textarea
                            rows={2}
                            disabled={duelSubmitted}
                            value={duelShortAnswers[q.id] || ''}
                            onChange={(e) =>
                              setDuelShortAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            placeholder="اكتب إجابتك قبل تسليم التحدي..."
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl text-zinc-950 dark:text-[#F4EFE6] placeholder:text-zinc-400 dark:placeholder:text-[#7E7664] focus:outline-none focus:border-[#D4AF37]"
                          />
                        )}

                        {duelSubmitted && (
                          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5 text-xs">
                            <div className="font-black text-emerald-900 dark:text-emerald-300">
                              ✔ الإجابة الصحيحة: {q.correctAnswerText}
                            </div>
                            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {!duelSubmitted && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={isSubmittingDuel}
                        onClick={handleSubmitDuelResult}
                        className="px-6 py-3 rounded-2xl btn-luxury-gold font-black text-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {isSubmittingDuel ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>إنهاء وتسليم نتيجتي في التحدي (+35 XP)</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
