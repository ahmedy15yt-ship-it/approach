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
      <div className="bg-gradient-to-r from-[#1E40AF] via-[#1D4ED8] to-[#172554] text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-[#EAB308]">
              <Sparkles className="w-3.5 h-3.5 text-[#EAB308]" />
              <span>اليوم يصنع المستقبل • تالتة ثانوي علمي علوم</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              صباح الهمة والإصرار، يا {profile.name.split(' ')[0]} 🩺
            </h1>
            <p className="text-sm text-white/85 max-w-xl leading-relaxed">
              «أفضل نسخة منك لا تُولد فجأة يوم النتيجة، بل تُصنع دقيقة بدقيقة اليوم: بركعتين، بصفحة أحياء، بمسألة كيمياء، وبنوم هادئ.»
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="text-center px-3 border-l border-white/20">
              <span className="text-[11px] text-white/70 block">سلسلة الأيام</span>
              <span className="text-xl font-black text-amber-300">{profile.streakDays} يوم</span>
            </div>
            <div className="text-center px-3">
              <span className="text-[11px] text-white/70 block">مجموع النقاط</span>
              <span className="text-xl font-black text-white">{profile.totalXp} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hadith & Quranic Inspiration for Students + Attribution Card */}
      <div className="bg-gradient-to-r from-[#F0F7FF] via-white to-[#F0F7FF] dark:from-[#0E1A38] dark:via-[#132247] dark:to-[#0E1A38] border-2 border-[#C59B27]/30 dark:border-[#C59B27]/40 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden text-center transition-colors duration-200">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C59B27]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#1E40AF]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#C59B27]/15 dark:bg-[#C59B27]/25 text-[#8C7A52] dark:text-amber-300 rounded-full text-xs font-black mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#C59B27] dark:text-amber-400" />
          <span>بشارة نبوية شريفة لطلاب العلم وثانوية عامة</span>
        </div>

        {/* Hadith Sharif */}
        <p className="font-['Amiri',serif] text-base sm:text-xl font-bold text-[#0F172A] dark:text-[#F1F5F9] leading-relaxed max-w-3xl mx-auto mb-2">
          «مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا، سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ، وَإِنَّ الْمَلَائِكَةَ لَتَضَعُ أَجْنِحَتَهَا رِضًا لِطَالِبِ الْعِلْمِ»
        </p>

        {/* Quranic Verse */}
        <p className="text-xs sm:text-sm font-bold text-[#8C7A52] dark:text-amber-300/90 mb-3">
          — حديث شريف (رواه مسلم) • ﴿ يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ﴾
        </p>

        {/* Ahmed Yehia Attribution Banner */}
        <div className="pt-3 border-t border-[#C59B27]/20 dark:border-[#C59B27]/30 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs font-bold">
          <span className="text-[#1E40AF] dark:text-blue-400 flex items-center gap-1">
            <span>تم صنعه بواسطة</span>
            <strong className="text-[#C59B27] dark:text-amber-400 font-black text-sm">أحمد يحيى</strong>
          </span>
          <span className="hidden sm:inline text-gray-300 dark:text-slate-600">•</span>
          <span className="text-[#8C7A52] dark:text-amber-300 font-black bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/40">
            ادعُ له بالتوفيق والنجاح 🤲🤍
          </span>
        </div>
      </div>

      {/* Voice & Push Alert Controls Bar */}
      <div className="bg-gradient-to-r from-blue-50/80 via-white to-blue-50/80 dark:from-blue-950/40 dark:via-[#111C38] dark:to-blue-950/40 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1E40AF]/10 dark:bg-blue-900/40 text-[#1E40AF] dark:text-blue-300 flex items-center justify-center shrink-0">
            {voiceAlertsEnabled ? <Volume2 className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </div>
          <div>
            <span className="text-xs font-bold text-[#0F172A] dark:text-white block">
              التنبيهات الصوتية المخصصة للأذان والمهام
            </span>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400">
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
                  ? 'bg-blue-100 dark:bg-blue-900/60 text-[#1E40AF] dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
              }`}
            >
              {voiceAlertsEnabled ? 'مفعلة 🔊' : 'تفعيل التنبيه الصوتي 🔇'}
            </button>
          )}

          {isNotificationSupported() && !isNotifGranted && (
            <button
              onClick={handleEnableNotifications}
              className="px-3 py-1.5 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-black transition-all cursor-pointer"
            >
              تنبيهات الخلفية 🔔
            </button>
          )}
        </div>
      </div>

      {/* Top 2 Crucial Cards: Next Prayer + Embedded Pomodoro Focus Timer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Prayer Countdown Card */}
        <div className="bg-white dark:bg-[#111C38] border border-[#1E40AF]/15 dark:border-blue-900/40 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between transition-colors duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#1E40AF]/10 dark:bg-blue-950/50 text-[#1E40AF] dark:text-blue-300 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#64748B] dark:text-slate-400 block">الصلاة القادمة ({profile.governorate})</span>
                <h3 className="text-lg font-black text-[#0F172A] dark:text-white">
                  صلاة {nextPrayerInfo.nextPrayer.name} ({nextPrayerInfo.nextPrayer.time})
                </h3>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('quran')}
              className="text-xs text-[#1E40AF] dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
            >
              <span>المواقيت والمصحف</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 p-3 bg-[#F8FAFC] dark:bg-[#0B132B]/70 rounded-xl flex items-center justify-between border border-transparent dark:border-slate-800">
            <div>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400 block">الوقت المتبقي حتى الأذان:</span>
              <span className="font-mono text-base font-extrabold text-[#1E40AF] dark:text-blue-400" dir="ltr">
                {nextPrayerInfo.remainingFormatted}
              </span>
            </div>
            <span className="text-xs px-2.5 py-1 bg-[#1E40AF]/10 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 rounded-lg font-bold">
              حيّ على الفلاح
            </span>
          </div>
        </div>

        {/* Embedded Interactive Pomodoro Focus Timer Card */}
        <div className="bg-white dark:bg-[#111C38] border-2 border-[#1E40AF]/30 dark:border-blue-800/60 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${
                  isPomoRunning
                    ? 'bg-amber-500 text-white animate-pulse shadow-md'
                    : 'bg-[#1E40AF]/10 dark:bg-blue-950/50 text-[#1E40AF] dark:text-blue-300'
                }`}>
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-[#1E40AF] dark:text-blue-400 block">مؤقت بومودورو المدمج</span>
                    {isPomoRunning && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500 text-white font-black rounded-full animate-pulse">
                        جلسة جارية
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-[#0F172A] dark:text-white truncate max-w-[200px]">
                    {pomoSubject}: {pomoLesson}
                  </h3>
                </div>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                {[25, 45, 15].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSelectPreset(m)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      pomoPresetMinutes === m
                        ? 'bg-[#1E40AF] text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {m} د
                  </button>
                ))}
              </div>
            </div>

            {/* Countdown Display & Controls */}
            <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-[#0B132B] dark:to-blue-950/30 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 block">
                  {isPomoRunning ? 'الوقت المتبقي حتى جرس النهاية:' : 'اضغط زر البدء للانطلاق بتركيز تام'}
                </span>
                <span className="font-mono text-2xl font-black text-[#1E40AF] dark:text-blue-400 tracking-wider" dir="ltr">
                  {formatTime(pomoSecondsLeft)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePomo}
                  className={`px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    isPomoRunning
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-[#1E40AF] hover:bg-[#1D4ED8] text-white'
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
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">
              🔔 يرن جرس تلقائي عند انتهاء الجلسة + تقييم ونقاط
            </span>
            {isPomoRunning && (
              <button
                onClick={handleCompletePomoEarly}
                className="text-[#1E40AF] dark:text-blue-400 font-extrabold hover:underline cursor-pointer"
              >
                أنهيت الجلسة مبكراً ←
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mini Quran Audio Bar */}
      <div className="bg-[#F8FAFC] dark:bg-[#111C38] border border-[#1E40AF]/20 dark:border-blue-900/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs transition-colors duration-200">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={toggleQuranPlay}
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
              isPlayingQuran
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-[#1E40AF] text-white hover:bg-[#1D4ED8]'
            }`}
          >
            {isPlayingQuran ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-[-1px]" />
            )}
          </button>
          <div>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold block">
              مشغل القرآن الهادئ في الخلفية أثناء المذاكرة
            </span>
            <span className="text-xs font-bold text-[#0F172A] dark:text-white">
              {isPlayingQuran ? 'جاري الاستماع الآن • سكينة وطمأنينة' : 'اضغط للاستماع لسورة تطمئن قلبك'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSurah}
            onChange={handleSurahChange}
            className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-[#1E40AF] dark:text-blue-300 focus:outline-none focus:border-[#1E40AF]"
          >
            {SURAH_LIST.map((s) => (
              <option key={s.number} value={s.number}>
                سورة {s.name} ({s.revelationType})
              </option>
            ))}
          </select>

          <button
            onClick={() => onNavigateTab('quran')}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-xs font-bold text-[#334155] dark:text-slate-300 transition-colors cursor-pointer"
          >
            فهرس المصحف
          </button>
        </div>
      </div>

      {/* Daily Tasks Overview */}
      <div className="bg-white dark:bg-[#111C38] border border-[#1E40AF]/15 dark:border-blue-900/40 rounded-2xl p-5 shadow-xs transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#0F172A] dark:text-white">مهام اليوم الستة</h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400">تتجدد كل 20 ساعة تلقائياً وتمنحك نقاط المتفوقين</p>
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-[#1E40AF] dark:text-blue-400 block">
              {completedTasksCount} من {tasks.length} منجز
            </span>
            <div className="w-24 h-2 bg-[#EFECE6] dark:bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[#1E40AF] dark:bg-blue-500 transition-all duration-300"
                style={{ width: `${tasksPercent}%` }}
              />
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
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50 text-blue-950 dark:text-blue-200 shadow-2xs'
                  : 'bg-[#F8FAFC] dark:bg-[#0B132B]/60 border-[#E2E8F0] dark:border-slate-800 hover:border-[#1E40AF]/30 dark:hover:border-blue-500/40 text-[#0F172A] dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {task.isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-[#1E40AF] dark:text-blue-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 dark:text-slate-500 shrink-0" />
                )}
                <span
                  className={`text-xs font-bold leading-snug ${
                    task.isDone ? 'line-through text-blue-800/70 dark:text-blue-400/70' : ''
                  }`}
                >
                  {task.title}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-white dark:bg-slate-900 border border-[#E0D9CC] dark:border-slate-700 text-[#8C7A52] dark:text-amber-300 shrink-0">
                +{task.xp} XP
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Launchpad to Core Sections */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('backlog')}
          className="bg-white dark:bg-[#111C38] p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-500 shadow-2xs hover:shadow-xs transition-all text-right group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-[#0F172A] dark:text-white mb-0.5">إدارة المتراكم</h4>
          <p className="text-[10px] text-[#64748B] dark:text-slate-400">توزيع الدروس المتأخرة بالعدل</p>
        </button>

        <button
          onClick={() => onNavigateTab('schedule')}
          className="bg-white dark:bg-[#111C38] p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 hover:border-blue-400 dark:hover:border-blue-500 shadow-2xs hover:shadow-xs transition-all text-right group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-[#0F172A] dark:text-white mb-0.5">صمّم جدولك</h4>
          <p className="text-[10px] text-[#64748B] dark:text-slate-400">تخصيص الساعات والأيام</p>
        </button>

        <button
          onClick={() => onNavigateTab('curriculum')}
          className="bg-white dark:bg-[#111C38] p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-500 shadow-2xs hover:shadow-xs transition-all text-right group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-[#0F172A] dark:text-white mb-0.5">كبسولات المنهج</h4>
          <p className="text-[10px] text-[#64748B] dark:text-slate-400">ملخصات ومفاتيح الامتحان</p>
        </button>

        <button
          onClick={() => onNavigateTab('tutor')}
          className="bg-white dark:bg-[#111C38] p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 hover:border-blue-500 dark:hover:border-blue-400 shadow-2xs hover:shadow-xs transition-all text-right group relative overflow-hidden cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#1E40AF] dark:text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-[#0F172A] dark:text-white mb-0.5 flex items-center gap-1">
            <span>أستاذ نَهج الذكي</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-[#1E40AF] text-white rounded-full font-bold">مجاني</span>
          </h4>
          <p className="text-[10px] text-[#64748B] dark:text-slate-400">شرح، أسئلة، ودعم فوري</p>
        </button>
      </div>

      {/* Life Balance Indicators (الهدف: طالب صحيح ومتوازن يذاكر أضعاف طالب مرهق) */}
      <div className="bg-[#F8FAFC] dark:bg-[#111C38] border border-[#1E40AF]/15 dark:border-blue-900/40 rounded-2xl p-4 sm:p-5 transition-colors duration-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-xs text-[#0F172A] dark:text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
            <span>مؤشرات الاتزان اليومي (نظام نَهج للحياة المتوازنة)</span>
          </h3>
          <span className="text-[11px] text-[#64748B] dark:text-slate-400">طالب متوازن = استيعاب مضاعف</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <div className="bg-white dark:bg-[#0B132B]/80 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 text-center">
            <span className="text-[10px] text-[#64748B] dark:text-slate-400 block">النوم الصحي</span>
            <span className="font-bold text-xs text-[#1E40AF] dark:text-blue-400">7 ساعات عميقة</span>
          </div>
          <div className="bg-white dark:bg-[#0B132B]/80 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 text-center">
            <span className="text-[10px] text-[#64748B] dark:text-slate-400 block">الماء</span>
            <span className="font-bold text-xs text-blue-600 dark:text-blue-400">8 أكواب اليوم</span>
          </div>
          <div className="bg-white dark:bg-[#0B132B]/80 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 text-center">
            <span className="text-[10px] text-[#64748B] dark:text-slate-400 block">التمارين</span>
            <span className="font-bold text-xs text-amber-600 dark:text-amber-400">7 دقائق تنشيط</span>
          </div>
          <div className="bg-white dark:bg-[#0B132B]/80 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 text-center">
            <span className="text-[10px] text-[#64748B] dark:text-slate-400 block">الصلوات</span>
            <span className="font-bold text-xs text-[#1E40AF] dark:text-blue-400">في مواقيتها</span>
          </div>
          <div className="bg-white dark:bg-[#0B132B]/80 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 text-center">
            <span className="text-[10px] text-[#64748B] dark:text-slate-400 block">النفسية</span>
            <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">هدوء وثقة</span>
          </div>
          <div className="bg-white dark:bg-[#0B132B]/80 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 text-center">
            <span className="text-[10px] text-[#64748B] dark:text-slate-400 block">المذاكرة</span>
            <span className="font-bold text-xs text-[#1E40AF] dark:text-blue-400">مركزة بدون شتات</span>
          </div>
        </div>
      </div>

      {/* Footer Attribution & Prayer */}
      <footer className="text-center py-6 border-t border-[#1E40AF]/15 dark:border-blue-900/40 mt-8 space-y-2">
        <p className="text-xs sm:text-sm font-extrabold text-[#0F172A] dark:text-white flex flex-wrap items-center justify-center gap-1.5">
          <span>تم صنعه بكل إخلاص بواسطة</span>
          <span className="text-[#1E40AF] dark:text-blue-400 font-black text-sm underline underline-offset-4 decoration-[#C59B27]">أحمد يحيى</span>
          <span className="text-[#C59B27] dark:text-amber-400 font-black">— ادعُ له بالتوفيق والنجاح 🤍</span>
        </p>
        <p className="text-[11px] text-[#64748B] dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          «اللهم بارك فيمن بنى وساهم ودعا، واجعل التوفيق والدرجات العلا نصيب طلاب الثانوية العامة جميعاً»
        </p>
      </footer>

      {/* Session Rating Popup Modal (Triggered on Pomodoro end or early finish) */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111C38] border-2 border-[#1E40AF]/30 dark:border-blue-800/60 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-right">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shadow-inner">
                🔔
              </div>
              <h3 className="text-lg font-black text-[#0F172A] dark:text-white">
                ما شاء الله! انتهت جلسة المذاكرة 🎯
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-300">
                «رن جرس النهاية بنجاح» — قيّم مستوى استيعابك لتسجيل نقاط الإنجاز وزيادة مستواك!
              </p>
            </div>

            {/* Stars rating */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block text-center">
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
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-center text-xs font-extrabold text-amber-600 dark:text-amber-400">
                {ratingStars === 5 && '🌟 تركيز أسطوري واستيعاب كامل (+45 XP)'}
                {ratingStars === 4 && '✨ فهمت الأفكار الأساسية وحللت تدريبات (+45 XP)'}
                {ratingStars === 3 && '👍 جيد ولكن هناك أفكار تحتاج مراجعة (+30 XP)'}
                {ratingStars <= 2 && '⚡ تشتت قليل، سأعيد التركيز في الجلسة القادمة (+30 XP)'}
              </div>
            </div>

            {/* Quick tags */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
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
                        ? 'bg-blue-50 dark:bg-blue-900/40 border-[#1E40AF] text-[#1E40AF] dark:text-blue-300'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#1E40AF]"
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
                className="grow py-2.5 px-4 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>حفظ التقييم واستلام النقاط (+{ratingStars >= 4 ? 45 : 30} XP)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
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
