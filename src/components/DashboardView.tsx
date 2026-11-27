import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Flame,
  Award,
  CheckCircle2,
  Circle,
  ArrowRight,
  TrendingUp,
  Droplet,
  HeartHandshake,
  Dumbbell,
  Compass,
  FileText,
  Calendar,
  Layers,
  Bot,
  ChevronLeft,
  Bell,
  BellRing,
  Star,
  Timer,
  Check,
  Send,
  AlertTriangle,
  Loader2,
  Swords,
  Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudentProfile, DailyTask, StudySession, Subject } from '../types';
import { PrayerTime, getNextPrayer } from '../data/prayer';
import { SURAH_LIST, getSurahAudioUrl, RECITERS } from '../data/quran';
import {
  isNotificationSupported,
  isNotificationsEnabled,
  requestNotificationPermission,
  sendNotification,
} from '../services/notificationService';
import { playBellChime, announceSessionComplete } from '../utils/voiceAlerts';
import { streamTutorReply } from '../utils/tutorStreamClient';
import { VerifiedBadge } from './VerifiedBadge';
import { ExamCountdownWidget } from './ExamCountdownWidget';

interface DashboardViewProps {
  profile: StudentProfile;
  tasks: DailyTask[];
  onToggleTask: (taskId: string) => void;
  prayers: PrayerTime[];
  nextSession: StudySession;
  onStartSession: (session: StudySession) => void;
  onNavigateTab: (tab: string) => void;
  curriculum: Subject[];
  onAwardBonusXp?: (amount: number) => void;
  voiceAlertsEnabled?: boolean;
  onToggleVoiceAlerts?: () => void;
  onOpenTutor?: (subject: string, prompt: string) => void;
  todayStudyHours?: number;
  dailyGoalHours?: number;
  activeChallengesCount?: number;
  onQuickAddStudyHours?: (deltaHours: number) => void;
  onLogStudyMinutes?: (minutes: number) => void;
  nextStreakAtMs?: number;
  accountPhone?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  tasks,
  onToggleTask,
  prayers,
  nextSession,
  onStartSession,
  onNavigateTab,
  curriculum,
  onAwardBonusXp,
  voiceAlertsEnabled = true,
  onToggleVoiceAlerts,
  onOpenTutor,
  todayStudyHours = 0,
  dailyGoalHours = 8,
  activeChallengesCount = 0,
  onQuickAddStudyHours,
  onLogStudyMinutes,
  nextStreakAtMs,
  accountPhone,
}) => {
  // Embedded Pomodoro Timer State
  const [pomoPresetMinutes, setPomoPresetMinutes] = useState<number>(25);
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState<number>(25 * 60);
  const [isPomoRunning, setIsPomoRunning] = useState<boolean>(false);
  const [pomoSubject, setPomoSubject] = useState<string>(nextSession.subjectName);
  const [pomoLesson, setPomoLesson] = useState<string>(nextSession.lessonTitle);

  // Rating Modal State
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [focusTag, setFocusTag] = useState<string>('تركيز عميق وفهم مستوعب 🧠');
  const [ratingNotes, setRatingNotes] = useState<string>('');
  const [awardedXpMessage, setAwardedXpMessage] = useState<string | null>(null);

  // Quick Home-Study AI Assistant State (uses fast SSE /api/gemini/tutor-stream)
  const [homeStudySubject, setHomeStudySubject] = useState<string>(nextSession.subjectName || 'الأحياء');
  const [homeStudyDeepMode, setHomeStudyDeepMode] = useState<'fast' | 'deep'>('deep');
  const [homeStudyQuestion, setHomeStudyQuestion] = useState<string>('');
  const [homeStudyReply, setHomeStudyReply] = useState<string | null>(null);
  const [homeStudyWarning, setHomeStudyWarning] = useState<string | null>(null);
  const [homeStudyError, setHomeStudyError] = useState<string | null>(null);
  const [isHomeStudyLoading, setIsHomeStudyLoading] = useState<boolean>(false);
  const [lastHomeStudyPrompt, setLastHomeStudyPrompt] = useState<string | null>(null);

  const handleAskHomeStudyAI = async (customPrompt?: string) => {
    const query = (customPrompt ?? homeStudyQuestion).trim();
    if (!query || isHomeStudyLoading) return;

    setIsHomeStudyLoading(true);
    setHomeStudyError(null);
    setHomeStudyWarning(null);
    setHomeStudyReply(null);
    setLastHomeStudyPrompt(query);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 36000);

    try {
      const result = await streamTutorReply({
        message: query,
        subject: homeStudySubject,
        context: `المذاكرة المنزلية — ${pomoLesson}`,
        tutorMode: 'explain',
        deepMode: homeStudyDeepMode,
        signal: controller.signal,
        onChunk: (accumulated) => {
          setHomeStudyReply(accumulated);
        },
      });

      setHomeStudyReply(result.reply);
      if (result.warning) {
        setHomeStudyWarning(result.warning);
      }
      if (!customPrompt) {
        setHomeStudyQuestion('');
      }
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      setHomeStudyError(
        isTimeout
          ? 'استغرق الرد وقتاً أطول من المعتاد؛ اضغط «إعادة المحاولة» للإرسال الفوري.'
          : err?.message && typeof err.message === 'string'
          ? err.message
          : 'حدث خطأ في الاتصال بالخادم، يرجى المحاولة مرة أخرى.'
      );
    } finally {
      clearTimeout(timeoutId);
      setIsHomeStudyLoading(false);
    }
  };

  // Timer Tick Effect
  useEffect(() => {
    let interval: any = null;
    if (isPomoRunning && pomoSecondsLeft > 0) {
      interval = setInterval(() => {
        setPomoSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsPomoRunning(false);
            // Bell chime & voice alert upon completion
            playBellChime();
            announceSessionComplete(pomoSubject);
            setShowRatingModal(true);
            return pomoPresetMinutes * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPomoRunning, pomoSecondsLeft, pomoPresetMinutes, pomoSubject]);

  const handleSelectPreset = (minutes: number) => {
    setPomoPresetMinutes(minutes);
    setPomoSecondsLeft(minutes * 60);
    setIsPomoRunning(false);
  };

  const handleTogglePomo = () => {
    if (!isPomoRunning && pomoSecondsLeft === 0) {
      setPomoSecondsLeft(pomoPresetMinutes * 60);
    }
    setIsPomoRunning((prev) => !prev);
  };

  const handleResetPomo = () => {
    setIsPomoRunning(false);
    setPomoSecondsLeft(pomoPresetMinutes * 60);
  };

  const handleCompletePomoEarly = () => {
    setIsPomoRunning(false);
    playBellChime();
    announceSessionComplete(pomoSubject);
    setShowRatingModal(true);
  };

  const handleSubmitRating = () => {
    const earnedXp = ratingStars >= 4 ? 45 : 30;
    if (onAwardBonusXp) {
      onAwardBonusXp(earnedXp);
    }
    if (onLogStudyMinutes) {
      const elapsedMins = Math.max(
        1,
        Math.round((pomoPresetMinutes * 60 - pomoSecondsLeft) / 60) || pomoPresetMinutes
      );
      onLogStudyMinutes(elapsedMins);
    }
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
    setAwardedXpMessage(`أحسنت يا بطل! تم إضافة +${earnedXp} XP إلى رصيدك 🏆`);
    setTimeout(() => {
      setShowRatingModal(false);
      setAwardedXpMessage(null);
      setPomoSecondsLeft(pomoPresetMinutes * 60);
    }, 1800);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 24-hour Streak countdown
  const [streakRemainingSec, setStreakRemainingSec] = useState<number>(() =>
    nextStreakAtMs ? Math.max(0, Math.floor((nextStreakAtMs - Date.now()) / 1000)) : 0
  );

  useEffect(() => {
    if (!nextStreakAtMs) return;
    const updateStreakTimer = () => {
      setStreakRemainingSec(Math.max(0, Math.floor((nextStreakAtMs - Date.now()) / 1000)));
    };
    updateStreakTimer();
    const timer = setInterval(updateStreakTimer, 1000);
    return () => clearInterval(timer);
  }, [nextStreakAtMs]);

  const formatCountdownHms = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Prayer Countdown
  const [nextPrayerInfo, setNextPrayerInfo] = useState<{
    nextPrayer: PrayerTime;
    remainingFormatted: string;
  }>({
    nextPrayer: prayers[0],
    remainingFormatted: '...',
  });

  // Mini Quran Player State
  const [isPlayingQuran, setIsPlayingQuran] = useState(false);
  const [selectedSurah, setSelectedSurah] = useState(94); // Default Surah Ash-Sharh
  const [selectedReciter, setSelectedReciter] = useState('alafasy');
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const info = getNextPrayer(prayers);
      setNextPrayerInfo({
        nextPrayer: info.nextPrayer,
        remainingFormatted: info.remainingFormatted,
      });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [prayers]);

  // Handle mini Quran audio
  const toggleQuranPlay = () => {
    if (!audioElement) {
      const url = getSurahAudioUrl(selectedSurah, selectedReciter);
      const audio = new Audio(url);
      audio.onended = () => setIsPlayingQuran(false);
      audio.play().catch((e) => console.log('Audio autoplay prevented:', e));
      setAudioElement(audio);
      setIsPlayingQuran(true);
    } else {
      if (isPlayingQuran) {
        audioElement.pause();
        setIsPlayingQuran(false);
      } else {
        audioElement.play().catch((e) => console.log('Audio play error:', e));
        setIsPlayingQuran(true);
      }
    }
  };

  const handleSurahChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSurah = Number(e.target.value);
    setSelectedSurah(newSurah);
    if (audioElement) {
      audioElement.pause();
      const url = getSurahAudioUrl(newSurah, selectedReciter);
      const audio = new Audio(url);
      audio.onended = () => setIsPlayingQuran(false);
      audio.play().catch((e) => console.log(e));
      setAudioElement(audio);
      setIsPlayingQuran(true);
    }
  };

  const [isNotifGranted, setIsNotifGranted] = useState(() => isNotificationsEnabled());

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setIsNotifGranted(granted);
    if (granted) {
      sendNotification('🔔 تم تفعيل تنبيهات نَهج بنجاح!', {
        body: 'سيتولى نَهج تذكيرك بجلسات المذاكرة والصلوات حتى عند إغلاق التطبيق أو تصغيره.',
      });
    }
  };

  const completedTasksCount = tasks.filter((t) => t.isDone).length;
  const tasksPercent = Math.round((completedTasksCount / tasks.length) * 100);

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Hero Welcome & Day Statement */}
      <div className="bg-gradient-to-l from-[#1E1E26] via-[#121217] to-[#08080A] text-[#F4EFE6] rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden border border-[#D4AF37]/45">
        <div className="absolute top-0 left-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#08080A]/85 backdrop-blur-md rounded-full text-xs font-bold text-[#E8CE88] border border-[#D4AF37]/35">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>اليوم يصنع المستقبل • تالتة ثانوي علمي علوم</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#F6E2A6] flex items-center gap-2 flex-wrap">
              <span>صباح الهمة والإصرار، يا {profile.name.split(' ')[0]} 🩺</span>
              {profile.isVerified && <VerifiedBadge size="md" />}
            </h1>
            <p className="text-sm text-[#E5DEC9] max-w-xl leading-relaxed">
              «أفضل نسخة منك لا تُولد فجأة يوم النتيجة، بل تُصنع دقيقة بدقيقة اليوم: بركعتين، بصفحة أحياء، بمسألة كيمياء، وبنوم هادئ.»
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#09090C]/90 p-3 rounded-2xl backdrop-blur-md border border-[#D4AF37]/35">
            <button
              type="button"
              onClick={() => onNavigateTab('profile')}
              className="text-center px-3 border-l border-[#D4AF37]/25 hover:bg-white/5 rounded-xl py-1 transition-colors cursor-pointer"
              title="عرض تقويم وسجل الاستمرارية في الملف الشخصي"
            >
              <span className="text-[11px] text-[#B5AA92] block">سلسلة الأيام (كل 24 س)</span>
              <span className="text-xl font-black text-[#F3DFA2] tabular-nums">{profile.streakDays} يوم</span>
              {nextStreakAtMs && (
                <span className="text-[10px] font-mono text-[#D8CEB8] block mt-0.5 tabular-nums" dir="ltr">
                  +1 بعد {formatCountdownHms(streakRemainingSec)}
                </span>
              )}
              <span className="text-[10px] text-[#E8CE88] font-bold block mt-0.5 underline underline-offset-2">
                سجل الإنجازات
              </span>
            </button>
            <div className="text-center px-3">
              <span className="text-[11px] text-[#B5AA92] block">مجموع النقاط</span>
              <span className="text-xl font-black text-[#F4EFE6] tabular-nums">{profile.totalXp} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hadith & Quranic Inspiration for Students + Attribution Card */}
      <div className="bg-gradient-to-r from-amber-50/60 via-white to-amber-50/60 dark:from-[#09090C] dark:via-[#19191F] dark:to-[#09090C] border-2 border-[#C59B27]/40 dark:border-[#D4AF37]/40 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden text-center transition-colors duration-200">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#D4AF37]/8 rounded-full blur-2xl pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#D4AF37]/15 dark:bg-[#09090C] text-[#8C7A52] dark:text-[#E8CE88] border border-[#D4AF37]/30 rounded-full text-xs font-black mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#B58722] dark:text-[#D4AF37]" />
          <span>بشارة نبوية شريفة لطلاب العلم وثانوية عامة</span>
        </div>

        {/* Hadith Sharif */}
        <p className="font-['Amiri',serif] text-base sm:text-xl font-bold text-zinc-950 dark:text-[#F4EFE6] leading-relaxed max-w-3xl mx-auto mb-2">
          «مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا، سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ، وَإِنَّ الْمَلَائِكَةَ لَتَضَعُ أَجْنِحَتَهَا رِضًا لِطَالِبِ الْعِلْمِ»
        </p>

        {/* Quranic Verse */}
        <p className="text-xs sm:text-sm font-bold text-[#8C7A52] dark:text-[#E8CE88] mb-3">
          — حديث شريف (رواه مسلم) • ﴿ يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ﴾
        </p>

        {/* Ahmed Yehia Attribution Banner */}
        <div className="pt-3 border-t border-[#C59B27]/25 dark:border-[#D4AF37]/25 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs font-bold">
          <span className="text-zinc-800 dark:text-[#D8CEB8] flex items-center gap-1">
            <span>تم صنعه بواسطة</span>
            <strong className="text-[#9A7218] dark:text-[#F3DFA2] font-black text-sm">أحمد يحيى</strong>
          </span>
          <span className="hidden sm:inline text-zinc-300 dark:text-[#D4AF37]/40">•</span>
          <span className="text-[#8C7A52] dark:text-[#E8CE88] font-black bg-amber-50 dark:bg-[#09090C] px-3 py-1 rounded-full border border-amber-200 dark:border-[#D4AF37]/35">
            ادعُ له بالتوفيق والنجاح 🤲🤍
          </span>
        </div>
      </div>

      {/* Voice & Push Alert Controls Bar */}
      <div className="bg-white dark:bg-[#19191F] border border-amber-200/80 dark:border-[#D4AF37]/30 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/35 text-[#9A7218] dark:text-[#E8CE88] flex items-center justify-center shrink-0">
            {voiceAlertsEnabled ? <Volume2 className="w-4 h-4 text-[#B58722] dark:text-[#E8CE88]" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
          </div>
          <div>
            <span className="text-xs font-bold text-zinc-950 dark:text-[#F4EFE6] block">
              التنبيهات الصوتية المخصصة للأذان والمهام
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-[#B5AA92]">
              {voiceAlertsEnabled
                ? 'مفعلة — يتم نطق اسم الصلاة أو المهمة بصوت عربي واضح عند موعدها'
                : 'معطلة — يمكنك تفعيلها لنطق التنبيهات صوتياً'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleVoiceAlerts && (
            <button
              onClick={onToggleVoiceAlerts}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                voiceAlertsEnabled
                  ? 'bg-amber-50 dark:bg-[#09090C] text-[#9A7218] dark:text-[#E8CE88] border border-amber-300 dark:border-[#D4AF37]/45'
                  : 'bg-zinc-100 dark:bg-[#101014] text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700'
              }`}
            >
              {voiceAlertsEnabled ? 'مفعلة 🔊' : 'تفعيل التنبيه الصوتي 🔇'}
            </button>
          )}

          {isNotificationSupported() && !isNotifGranted && (
            <button
              onClick={handleEnableNotifications}
              className="px-3 py-1.5 btn-luxury-gold rounded-xl text-xs font-black transition-all cursor-pointer"
            >
              تنبيهات الخلفية 🔔
            </button>
          )}
        </div>
      </div>

      {/* Top 2 Crucial Cards: Next Prayer + Embedded Pomodoro Focus Timer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Prayer Countdown Card */}
        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between transition-colors duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-amber-200/80 dark:border-[#D4AF37]/35 text-[#B58722] dark:text-[#E8CE88] flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-500 dark:text-[#B5AA92] block">الصلاة القادمة ({profile.governorate})</span>
                <h3 className="text-lg font-black text-zinc-950 dark:text-[#F4EFE6]">
                  صلاة {nextPrayerInfo.nextPrayer.name} ({nextPrayerInfo.nextPrayer.time})
                </h3>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('quran')}
              className="text-xs text-[#9A7218] dark:text-[#E8CE88] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>المواقيت والمصحف</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 p-3 bg-zinc-50 dark:bg-[#09090C] rounded-xl flex items-center justify-between border border-zinc-200/80 dark:border-[#D4AF37]/25">
            <div>
              <span className="text-[11px] text-zinc-500 dark:text-[#B5AA92] block">الوقت المتبقي حتى الأذان:</span>
              <span className="font-mono text-base font-extrabold text-[#9A7218] dark:text-[#F3DFA2] tabular-nums" dir="ltr">
                {nextPrayerInfo.remainingFormatted}
              </span>
            </div>
            <span className="text-xs px-2.5 py-1 bg-amber-50 dark:bg-[#19191F] text-[#9A7218] dark:text-[#E8CE88] rounded-lg font-bold border border-amber-200/80 dark:border-[#D4AF37]/35">
              حيّ على الفلاح
            </span>
          </div>
        </div>

        {/* Embedded Interactive Pomodoro Focus Timer Card */}
        <div className="bg-white dark:bg-[#19191F] border-2 border-[#D4AF37]/40 dark:border-[#D4AF37]/45 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${
                  isPomoRunning
                    ? 'btn-luxury-gold animate-pulse'
                    : 'bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/35 text-[#B58722] dark:text-[#E8CE88]'
                }`}>
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-[#9A7218] dark:text-[#E8CE88] block">مؤقت بومودورو المدمج</span>
                    {isPomoRunning && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-emerald-600 text-white font-black rounded-full animate-pulse">
                        جلسة جارية
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6] truncate max-w-[200px]">
                    {pomoSubject}: {pomoLesson}
                  </h3>
                </div>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-[#09090C] p-1 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25">
                {[25, 45, 15].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSelectPreset(m)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer tabular-nums ${
                      pomoPresetMinutes === m
                        ? 'btn-luxury-gold'
                        : 'text-zinc-600 dark:text-[#B5AA92] hover:text-black dark:hover:text-[#F3DFA2]'
                    }`}
                  >
                    {m} د
                  </button>
                ))}
              </div>
            </div>

            {/* Countdown Display & Controls */}
            <div className="bg-zinc-50 dark:bg-[#09090C] p-3.5 rounded-xl border border-amber-200/70 dark:border-[#D4AF37]/30 flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-[#B5AA92] block">
                  {isPomoRunning ? 'الوقت المتبقي حتى جرس النهاية:' : 'اضغط زر البدء للانطلاق بتركيز تام'}
                </span>
                <span className="font-mono text-2xl font-black text-[#9A7218] dark:text-[#F3DFA2] tracking-wider tabular-nums" dir="ltr">
                  {formatTime(pomoSecondsLeft)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePomo}
                  className={`px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    isPomoRunning
                      ? 'bg-[#262630] hover:bg-[#323240] text-[#F3DFA2] border border-[#D4AF37]/50'
                      : 'btn-luxury-gold'
                  }`}
                >
                  {isPomoRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>إيقاف مؤقت</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>ابدأ المذاكرة بضغطة زر</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetPomo}
                  title="إعادة ضبط"
                  className="p-2 rounded-xl bg-white dark:bg-[#19191F] text-zinc-500 dark:text-[#E8CE88] hover:text-zinc-950 dark:hover:text-[#F3DFA2] border border-zinc-200 dark:border-[#D4AF37]/30 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-zinc-500 dark:text-[#B5AA92]">
              🔔 يرن جرس تلقائي عند انتهاء الجلسة + تقييم ونقاط
            </span>
            {isPomoRunning && (
              <button
                onClick={handleCompletePomoEarly}
                className="text-[#9A7218] dark:text-[#E8CE88] font-extrabold hover:underline cursor-pointer"
              >
                أنهيت الجلسة مبكراً ←
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Home-Study AI Helper Section (Server-side Gemini API with Safe Error Handling) */}
      <div className="bg-white dark:bg-[#19191F] border-2 border-amber-200/80 dark:border-[#D4AF37]/35 rounded-2xl p-5 shadow-xs space-y-4 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#09090C] border border-[#D4AF37]/45 text-[#E8CE88] flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-5 h-5 text-[#F3DFA2]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6] flex items-center gap-2">
                <span>مساعد المذاكرة المنزلية الفوري (أستاذ نَهج)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-[#09090C] text-[#9A7218] dark:text-[#E8CE88] border border-amber-200 dark:border-[#D4AF37]/35 font-black">
                  معلم خبير
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92]">
                اسأل أي سؤال وسيصلك شرح عميق منظم مع مثال واقعي ملموس وتركات الامتحان
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-[#09090C] p-1 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25">
              <button
                type="button"
                onClick={() => setHomeStudyDeepMode('fast')}
                className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                  homeStudyDeepMode === 'fast'
                    ? 'btn-luxury-gold'
                    : 'text-zinc-600 dark:text-[#B5AA92]'
                }`}
              >
                ⚡ مركز
              </button>
              <button
                type="button"
                onClick={() => setHomeStudyDeepMode('deep')}
                className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                  homeStudyDeepMode === 'deep'
                    ? 'btn-luxury-gold'
                    : 'text-zinc-600 dark:text-[#B5AA92]'
                }`}
              >
                🔬 معلم خبير وأمثلة
              </button>
            </div>

            <select
              value={homeStudySubject}
              onChange={(e) => {
                setHomeStudySubject(e.target.value);
                setPomoSubject(e.target.value);
              }}
              className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-900 dark:text-[#E8CE88] focus:outline-none focus:border-[#D4AF37]"
            >
              {(curriculum.length > 0
                ? curriculum.map((s) => s.name)
                : ['الأحياء', 'الكيمياء', 'الفيزياء', 'الجيولوجيا', 'اللغة العربية', 'اللغة الإنجليزية']
              ).map((subjName) => (
                <option key={subjName} value={subjName}>
                  {subjName}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onStartSession(nextSession)}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-[#09090C] hover:bg-amber-50 dark:hover:bg-[#101014] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-xl text-[11px] font-bold text-zinc-700 dark:text-[#E8CE88] transition-colors cursor-pointer"
            >
              مؤقت موسّع
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskHomeStudyAI();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={homeStudyQuestion}
            onChange={(e) => setHomeStudyQuestion(e.target.value)}
            placeholder={`اكتب سؤالك في مادة ${homeStudySubject} وسيشرحه لك المعلم الخبير بأمثلة واقعية...`}
            className="grow bg-zinc-50 dark:bg-[#09090C] border-2 border-zinc-200 dark:border-[#D4AF37]/30 focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs font-medium text-zinc-950 dark:text-[#F4EFE6] placeholder:text-zinc-400 dark:placeholder:text-[#8E8570] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!homeStudyQuestion.trim() || isHomeStudyLoading}
            className="px-5 py-2.5 btn-luxury-gold disabled:opacity-40 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            {isHomeStudyLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الشرح...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>اسأل المعلم الخبير</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Home-Study Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isHomeStudyLoading}
            onClick={() => handleAskHomeStudyAI(`اشرحلي أهم تركات ${homeStudySubject} في النظام الحديث بعمق ومع أمثلة واقعية واضحة.`)}
            className="px-3 py-1 bg-zinc-50 dark:bg-[#09090C] hover:bg-amber-50 dark:hover:bg-[#101014] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-lg text-[11px] font-bold text-zinc-700 dark:text-[#E8CE88] cursor-pointer disabled:opacity-50"
          >
            ⚡ أهم تركات {homeStudySubject} بأمثلة
          </button>
          <button
            type="button"
            disabled={isHomeStudyLoading}
            onClick={() => handleAskHomeStudyAI(`اديني سؤال امتحان صعب في ${homeStudySubject} واختبرني فيه مع شرح الفكرة.`)}
            className="px-3 py-1 bg-zinc-50 dark:bg-[#09090C] hover:bg-amber-50 dark:hover:bg-[#101014] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-lg text-[11px] font-bold text-zinc-700 dark:text-[#E8CE88] cursor-pointer disabled:opacity-50"
          >
            🎯 تحدي سؤال امتحان
          </button>
        </div>

        {/* Clear Actionable Error Display */}
        {homeStudyError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-red-900 dark:text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{homeStudyError}</span>
            </div>
            {lastHomeStudyPrompt && (
              <button
                type="button"
                onClick={() => handleAskHomeStudyAI(lastHomeStudyPrompt)}
                className="px-3 py-1.5 btn-luxury-gold rounded-lg text-[11px] font-black flex items-center gap-1 self-end sm:self-center cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة المحاولة</span>
              </button>
            )}
          </div>
        )}

        {/* AI Reply Display */}
        {homeStudyReply && (
          <div className="p-4 bg-zinc-50 dark:bg-[#09090C] border border-amber-200/80 dark:border-[#D4AF37]/35 rounded-2xl space-y-3">
            {homeStudyWarning && (
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-[#D4AF37]/40 rounded-lg text-[11px] font-bold text-amber-900 dark:text-[#E8CE88]">
                ℹ️ {homeStudyWarning}
              </div>
            )}
            <div className="text-xs sm:text-sm text-zinc-900 dark:text-[#F4EFE6] whitespace-pre-wrap leading-relaxed">
              {homeStudyReply}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-[#D4AF37]/20">
              <button
                type="button"
                onClick={() => setHomeStudyReply(null)}
                className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] hover:text-zinc-900 dark:hover:text-[#F3DFA2] cursor-pointer"
              >
                إخفاء الرد
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenTutor) {
                    onOpenTutor(homeStudySubject, lastHomeStudyPrompt || '');
                  } else {
                    onNavigateTab('tutor');
                  }
                }}
                className="text-xs font-black text-[#9A7218] dark:text-[#E8CE88] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>متابعة الحوار في أستاذ نَهج</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mini Quran Audio Bar */}
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs transition-colors duration-200">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={toggleQuranPlay}
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer btn-luxury-gold"
          >
            {isPlayingQuran ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-[-1px]" />
            )}
          </button>
          <div>
            <span className="text-[11px] text-zinc-500 dark:text-[#B5AA92] font-semibold block">
              مشغل القرآن الهادئ في الخلفية أثناء المذاكرة
            </span>
            <span className="text-xs font-bold text-zinc-950 dark:text-[#F4EFE6]">
              {isPlayingQuran ? 'جاري الاستماع الآن • سكينة وطمأنينة' : 'اضغط للاستماع لسورة تطمئن قلبك'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSurah}
            onChange={handleSurahChange}
            className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-lg px-3 py-1.5 text-xs font-bold text-[#9A7218] dark:text-[#E8CE88] focus:outline-none focus:border-[#D4AF37]"
          >
            {SURAH_LIST.map((s) => (
              <option key={s.number} value={s.number}>
                سورة {s.name} ({s.revelationType})
              </option>
            ))}
          </select>

          <button
            onClick={() => onNavigateTab('quran')}
            className="px-3 py-1.5 bg-zinc-50 dark:bg-[#09090C] hover:bg-zinc-100 dark:hover:bg-[#101014] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-lg text-xs font-bold text-zinc-700 dark:text-[#E8CE88] transition-colors cursor-pointer"
          >
            فهرس المصحف
          </button>
        </div>
      </div>

      {/* Daily Tasks Overview */}
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-2xl p-5 shadow-xs transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-zinc-950 dark:text-[#E8CE88]">مهام اليوم الستة</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-[#09090C] text-[#9A7218] dark:text-[#E8CE88] border border-amber-200 dark:border-[#D4AF37]/35 font-black">
                تتجدد يومياً 4:00 ص بتوقيت مصر
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">تتغير المهام الستة تلقائياً كل يوم الساعة 4:00 صباحاً بتوقيت مصر وتمنحك نقاط المتفوقين</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('daily-tasks')}
              className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/30 text-[11px] font-black text-[#9A7218] dark:text-[#E8CE88] hover:border-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            >
              إضافة مهامك اليومية ←
            </button>
            <div className="text-left">
              <span className="text-xs font-bold text-[#9A7218] dark:text-[#E8CE88] block tabular-nums">
                {completedTasksCount} من {tasks.length} منجز
              </span>
              <div className="w-24 h-2 bg-zinc-200 dark:bg-[#09090C] rounded-full overflow-hidden mt-1 border border-transparent dark:border-[#D4AF37]/20">
                <div
                  className="h-full bg-gradient-to-l from-[#F6E2A6] via-[#D4AF37] to-[#B58722] transition-all duration-300"
                  style={{ width: `${tasksPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onToggleTask(task.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                task.isDone
                  ? 'bg-amber-50/80 dark:bg-[#0E0E12] border-amber-300 dark:border-[#D4AF37]/50 text-amber-950 dark:text-[#F3DFA2] shadow-2xs'
                  : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37]/60 text-zinc-950 dark:text-[#F4EFE6]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {task.isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-[#B58722] dark:text-[#E8CE88] shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-zinc-400 dark:text-[#D4AF37]/40 shrink-0" />
                )}
                <span
                  className={`text-xs font-bold leading-snug ${
                    task.isDone ? 'line-through text-[#8C7A52] dark:text-[#B5AA92]' : ''
                  }`}
                >
                  {task.title}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 text-[#8C7A52] dark:text-[#E8CE88] shrink-0 tabular-nums">
                +{task.xp} XP
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Friends Study Challenge & Daily Hours Quick Card */}
      <div className="bg-gradient-to-l from-amber-50/70 via-white to-amber-50/40 dark:from-[#19191F] dark:via-[#141419] dark:to-[#09090C] border-2 border-amber-200/80 dark:border-[#D4AF37]/35 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#09090C] border border-[#D4AF37]/45 text-[#E8CE88] flex items-center justify-center shrink-0 shadow-xs">
            <Swords className="w-5 h-5 text-[#F3DFA2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6]">
                تحدي الأصدقاء وساعات المذاكرة اليوم
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-[#09090C] text-[#9A7218] dark:text-[#E8CE88] font-black border border-amber-200 dark:border-[#D4AF37]/35 tabular-nums">
                {activeChallengesCount} تحدي نشط
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-[#B5AA92]">
              أنجزت اليوم <strong className="text-[#9A7218] dark:text-[#F3DFA2] tabular-nums">{todayStudyHours.toFixed(1)}</strong> من أصل <strong className="tabular-nums">{dailyGoalHours} ساعات</strong> — شارك رقمك وتحدَّ زملاءك!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onQuickAddStudyHours && (
            <>
              <button
                type="button"
                onClick={() => onQuickAddStudyHours(0.5)}
                className="px-3 py-1.5 bg-white dark:bg-[#09090C] hover:bg-amber-50 dark:hover:bg-[#101014] border border-amber-200 dark:border-[#D4AF37]/35 rounded-xl text-xs font-black text-[#9A7218] dark:text-[#E8CE88] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>0.5 س</span>
              </button>
              <button
                type="button"
                onClick={() => onQuickAddStudyHours(1)}
                className="px-3 py-1.5 bg-white dark:bg-[#09090C] hover:bg-amber-50 dark:hover:bg-[#101014] border border-amber-200 dark:border-[#D4AF37]/35 rounded-xl text-xs font-black text-[#9A7218] dark:text-[#E8CE88] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>1 س</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onNavigateTab('challenges')}
            className="px-4 py-2 btn-luxury-gold rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <span>ساحة التحديات</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Exam Dates Countdown Table */}
      <ExamCountdownWidget accountPhone={accountPhone} />

      {/* Quick Launchpad to Core Sections */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('backlog')}
          className="bg-white dark:bg-[#19191F] p-4 rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37] shadow-2xs hover:shadow-xs transition-all text-right group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/30 text-[#B58722] dark:text-[#E8CE88] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-zinc-950 dark:text-[#E8CE88] mb-0.5">إدارة المتراكم</h4>
          <p className="text-[10px] text-zinc-500 dark:text-[#B5AA92]">توزيع الدروس المتأخرة بالعدل</p>
        </button>

        <button
          onClick={() => onNavigateTab('schedule')}
          className="bg-white dark:bg-[#19191F] p-4 rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37] shadow-2xs hover:shadow-xs transition-all text-right group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/30 text-[#B58722] dark:text-[#E8CE88] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-zinc-950 dark:text-[#E8CE88] mb-0.5">صمّم جدولك</h4>
          <p className="text-[10px] text-zinc-500 dark:text-[#B5AA92]">تخصيص الساعات والأيام</p>
        </button>

        <button
          onClick={() => onNavigateTab('curriculum')}
          className="bg-white dark:bg-[#19191F] p-4 rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37] shadow-2xs hover:shadow-xs transition-all text-right group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/30 text-[#B58722] dark:text-[#E8CE88] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-zinc-950 dark:text-[#E8CE88] mb-0.5">كبسولات المنهج</h4>
          <p className="text-[10px] text-zinc-500 dark:text-[#B5AA92]">ملخصات ومفاتيح الامتحان</p>
        </button>

        <button
          onClick={() => onNavigateTab('tutor')}
          className="bg-white dark:bg-[#19191F] p-4 rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37] shadow-2xs hover:shadow-xs transition-all text-right group relative overflow-hidden cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/30 text-[#B58722] dark:text-[#E8CE88] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-zinc-950 dark:text-[#E8CE88] mb-0.5 flex items-center gap-1">
            <span>أستاذ نَهج الخبير</span>
            <span className="text-[9px] px-1.5 py-0.2 btn-luxury-gold rounded-full font-bold">ذكي</span>
          </h4>
          <p className="text-[10px] text-zinc-500 dark:text-[#B5AA92]">شرح عميق، أمثلة، ودعم فوري</p>
        </button>
      </div>

      {/* Life Balance Indicators (الهدف: طالب صحيح ومتوازن يذاكر أضعاف طالب مرهق) */}
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-2xl p-4 sm:p-5 transition-colors duration-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-xs text-zinc-950 dark:text-[#E8CE88] flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#B58722] dark:text-[#D4AF37]" />
            <span>مؤشرات الاتزان اليومي (نظام نَهج للحياة المتوازنة)</span>
          </h3>
          <span className="text-[11px] text-zinc-500 dark:text-[#B5AA92]">طالب متوازن = استيعاب مضاعف</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <div className="bg-zinc-50 dark:bg-[#09090C] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 text-center">
            <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">النوم الصحي</span>
            <span className="font-bold text-xs text-[#9A7218] dark:text-[#F3DFA2]">7 ساعات عميقة</span>
          </div>
          <div className="bg-zinc-50 dark:bg-[#09090C] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 text-center">
            <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">الماء</span>
            <span className="font-bold text-xs text-zinc-900 dark:text-[#F4EFE6]">8 أكواب اليوم</span>
          </div>
          <div className="bg-zinc-50 dark:bg-[#09090C] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 text-center">
            <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">التمارين</span>
            <span className="font-bold text-xs text-[#9A7218] dark:text-[#E8CE88]">7 دقائق تنشيط</span>
          </div>
          <div className="bg-zinc-50 dark:bg-[#09090C] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 text-center">
            <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">الصلوات</span>
            <span className="font-bold text-xs text-[#9A7218] dark:text-[#F3DFA2]">في مواقيتها</span>
          </div>
          <div className="bg-zinc-50 dark:bg-[#09090C] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 text-center">
            <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">النفسية</span>
            <span className="font-bold text-xs text-zinc-900 dark:text-[#F4EFE6]">هدوء وثقة</span>
          </div>
          <div className="bg-zinc-50 dark:bg-[#09090C] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 text-center">
            <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">المذاكرة</span>
            <span className="font-bold text-xs text-[#9A7218] dark:text-[#E8CE88]">مركزة بدون شتات</span>
          </div>
        </div>
      </div>

      {/* Footer Attribution & Prayer */}
      <footer className="text-center py-6 border-t border-zinc-200 dark:border-[#D4AF37]/30 mt-8 space-y-2">
        <p className="text-xs sm:text-sm font-extrabold text-zinc-950 dark:text-[#F4EFE6] flex flex-wrap items-center justify-center gap-1.5">
          <span>تم صنعه بكل إخلاص بواسطة</span>
          <span className="text-[#9A7218] dark:text-[#F3DFA2] font-black text-sm underline underline-offset-4 decoration-[#D4AF37]">أحمد يحيى</span>
          <span className="text-[#B58722] dark:text-[#E8CE88] font-black">— ادعُ له بالتوفيق والنجاح 🤍</span>
        </p>
        <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92] max-w-lg mx-auto leading-relaxed">
          «اللهم بارك فيمن بنى وساهم ودعا، واجعل التوفيق والدرجات العلا نصيب طلاب الثانوية العامة جميعاً»
        </p>
      </footer>

      {/* Session Rating Popup Modal (Triggered on Pomodoro end or early finish) */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#19191F] border-2 border-[#D4AF37]/50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-right">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-[#09090C] border border-[#D4AF37]/40 text-amber-600 dark:text-[#F3DFA2] flex items-center justify-center text-2xl shadow-inner">
                🔔
              </div>
              <h3 className="text-lg font-black text-zinc-950 dark:text-[#E8CE88]">
                ما شاء الله! انتهت جلسة المذاكرة 🎯
              </h3>
              <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
                «رن جرس النهاية بنجاح» — قيّم مستوى استيعابك لتسجيل نقاط الإنجاز وزيادة مستواك!
              </p>
            </div>

            {/* Stars rating */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-[#E8CE88] block text-center">
                كيف كان مستوى تركيزك وفهمك للدرس؟
              </label>
              <div className="flex items-center justify-center gap-2" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className="p-1 hover:scale-125 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= ratingStars
                          ? 'fill-[#D4AF37] text-[#D4AF37]'
                          : 'text-zinc-300 dark:text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-center text-xs font-extrabold text-[#9A7218] dark:text-[#F3DFA2]">
                {ratingStars === 5 && '🌟 تركيز أسطوري واستيعاب كامل (+45 XP)'}
                {ratingStars === 4 && '✨ فهمت الأفكار الأساسية وحللت تدريبات (+45 XP)'}
                {ratingStars === 3 && '👍 جيد ولكن هناك أفكار تحتاج مراجعة (+30 XP)'}
                {ratingStars <= 2 && '⚡ تشتت قليل، سأعيد التركيز في الجلسة القادمة (+30 XP)'}
              </div>
            </div>

            {/* Quick tags */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-600 dark:text-[#B5AA92] block">
                طبيعة ما أنجزته في هذه الجلسة:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  'فهم عميق واستيعاب 🧠',
                  'حل مسائل وتدريبات 📝',
                  'حفظ وتثبيت قوانين ⚡',
                  'تصفية نقاط صعبة 🎯',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setFocusTag(tag)}
                    className={`p-2 rounded-xl border text-right font-bold transition-all cursor-pointer ${
                      focusTag === tag
                        ? 'bg-amber-50 dark:bg-[#09090C] border-[#D4AF37] text-[#9A7218] dark:text-[#F3DFA2]'
                        : 'bg-zinc-50 dark:bg-[#0E0E12] border-zinc-200 dark:border-[#D4AF37]/20 text-zinc-600 dark:text-[#B5AA92]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional notes */}
            <div>
              <input
                type="text"
                value={ratingNotes}
                onChange={(e) => setRatingNotes(e.target.value)}
                placeholder="ملاحظة سريعة للدرس (اختياري)..."
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {awardedXpMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-center text-xs font-black text-emerald-800 dark:text-emerald-300">
                {awardedXpMessage}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSubmitRating}
                className="grow py-2.5 px-4 btn-luxury-gold font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>حفظ التقييم واستلام النقاط (+{ratingStars >= 4 ? 45 : 30} XP)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                className="py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#09090C] dark:hover:bg-[#101014] text-zinc-600 dark:text-[#B5AA92] border border-transparent dark:border-[#D4AF37]/25 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                تخطي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
