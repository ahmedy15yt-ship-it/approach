import React, { useState, useEffect } from 'react';
import {
  Clock,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
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
} from 'lucide-react';
import { StudentProfile, DailyTask, StudySession, Subject } from '../types';
import { PrayerTime, getNextPrayer } from '../data/prayer';
import { SURAH_LIST, getSurahAudioUrl, RECITERS } from '../data/quran';

interface DashboardViewProps {
  profile: StudentProfile;
  tasks: DailyTask[];
  onToggleTask: (taskId: string) => void;
  prayers: PrayerTime[];
  nextSession: StudySession;
  onStartSession: (session: StudySession) => void;
  onNavigateTab: (tab: string) => void;
  curriculum: Subject[];
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
}) => {
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

  const completedTasksCount = tasks.filter((t) => t.isDone).length;
  const tasksPercent = Math.round((completedTasksCount / tasks.length) * 100);

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Hero Welcome & Day Statement */}
      <div className="bg-gradient-to-r from-[#2D5A43] via-[#244A37] to-[#1E3B2C] text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
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

      {/* Top 2 Crucial Cards: Next Prayer + Next Study Session */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Prayer Countdown Card */}
        <div className="bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#2D5A43]/10 text-[#2D5A43] flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#7A8A7E] block">الصلاة القادمة ({profile.governorate})</span>
                <h3 className="text-lg font-black text-[#1E2922]">
                  صلاة {nextPrayerInfo.nextPrayer.name} ({nextPrayerInfo.nextPrayer.time})
                </h3>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('quran')}
              className="text-xs text-[#2D5A43] hover:underline font-bold flex items-center gap-1"
            >
              <span>المواقيت والمصحف</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 p-3 bg-[#F8F6F0] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#7A8A7E] block">الوقت المتبقي حتى الأذان:</span>
              <span className="font-mono text-base font-extrabold text-[#2D5A43]" dir="ltr">
                {nextPrayerInfo.remainingFormatted}
              </span>
            </div>
            <span className="text-xs px-2.5 py-1 bg-[#2D5A43]/10 text-[#2D5A43] rounded-lg font-bold">
              حيّ على الفلاح
            </span>
          </div>
        </div>

        {/* Next Study Session Card */}
        <div className="bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#7A8A7E] block">جلسة المذاكرة التالية المبرمجة</span>
                <h3 className="text-lg font-black text-[#1E2922]">
                  {nextSession.subjectName}
                </h3>
              </div>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 bg-[#FAF8F5] border border-[#DDD6C9] rounded-md font-bold text-[#4B594E]">
              {nextSession.durationMinutes} دقيقة
            </span>
          </div>

          <p className="text-xs text-[#4B594E] my-3 bg-[#FAF9F5] p-2.5 rounded-lg border border-[#EDE8DE] font-medium">
            📖 <strong>الموضوع:</strong> {nextSession.lessonTitle}
          </p>

          <button
            onClick={() => onStartSession(nextSession)}
            className="w-full py-2.5 px-4 bg-[#2D5A43] hover:bg-[#234734] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>ابدأ جلسة التركيز الآن (بومودورو 25 دقيقة)</span>
          </button>
        </div>
      </div>

      {/* Mini Quran Audio Bar */}
      <div className="bg-[#FAF8F5] border border-[#2D5A43]/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={toggleQuranPlay}
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              isPlayingQuran
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-[#2D5A43] text-white hover:bg-[#234734]'
            }`}
          >
            {isPlayingQuran ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-[-1px]" />
            )}
          </button>
          <div>
            <span className="text-[11px] text-[#78887C] font-semibold block">
              مشغل القرآن الهادئ في الخلفية أثناء المذاكرة
            </span>
            <span className="text-xs font-bold text-[#1E2922]">
              {isPlayingQuran ? 'جاري الاستماع الآن • سكينة وطمأنينة' : 'اضغط للاستماع لسورة تطمئن قلبك'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSurah}
            onChange={handleSurahChange}
            className="bg-white border border-[#D5CFC3] rounded-lg px-3 py-1.5 text-xs font-bold text-[#2D5A43] focus:outline-none focus:border-[#2D5A43]"
          >
            {SURAH_LIST.map((s) => (
              <option key={s.number} value={s.number}>
                سورة {s.name} ({s.revelationType})
              </option>
            ))}
          </select>

          <button
            onClick={() => onNavigateTab('quran')}
            className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#D5CFC3] rounded-lg text-xs font-bold text-[#4B594E] transition-colors"
          >
            فهرس المصحف
          </button>
        </div>
      </div>

      {/* Daily Tasks Overview */}
      <div className="bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#1E2922]">مهام اليوم الستة</h2>
            <p className="text-xs text-[#7A8A7E]">تتجدد كل 20 ساعة تلقائياً وتمنحك نقاط المتفوقين</p>
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-[#2D5A43] block">
              {completedTasksCount} من {tasks.length} منجز
            </span>
            <div className="w-24 h-2 bg-[#EFECE6] rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[#2D5A43] transition-all duration-300"
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
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                  : 'bg-[#FAF9F6] border-[#E8E4DC] hover:border-[#2D5A43]/30 text-[#1E2922]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {task.isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 shrink-0" />
                )}
                <span
                  className={`text-xs font-bold leading-snug ${
                    task.isDone ? 'line-through text-emerald-700/80' : ''
                  }`}
                >
                  {task.title}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-white border border-[#E0D9CC] text-[#8C7A52] shrink-0">
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
          className="bg-white p-4 rounded-2xl border border-rose-200/80 hover:border-rose-400 shadow-2xs hover:shadow-xs transition-all text-right group"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-[#1E2922] mb-0.5">إدارة المتراكم</h4>
          <p className="text-[10px] text-[#7A8A7E]">توزيع الدروس المتأخرة بالعدل</p>
        </button>

        <button
          onClick={() => onNavigateTab('schedule')}
          className="bg-white p-4 rounded-2xl border border-blue-200/80 hover:border-blue-400 shadow-2xs hover:shadow-xs transition-all text-right group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-[#1E2922] mb-0.5">صمّم جدولك</h4>
          <p className="text-[10px] text-[#7A8A7E]">تخصيص الساعات والأيام</p>
        </button>

        <button
          onClick={() => onNavigateTab('curriculum')}
          className="bg-white p-4 rounded-2xl border border-amber-200/80 hover:border-amber-400 shadow-2xs hover:shadow-xs transition-all text-right group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-[#1E2922] mb-0.5">كبسولات المنهج</h4>
          <p className="text-[10px] text-[#7A8A7E]">ملخصات ومفاتيح الامتحان</p>
        </button>

        <button
          onClick={() => onNavigateTab('tutor')}
          className="bg-white p-4 rounded-2xl border border-emerald-200/80 hover:border-emerald-400 shadow-2xs hover:shadow-xs transition-all text-right group relative overflow-hidden"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-xs text-[#1E2922] mb-0.5 flex items-center gap-1">
            <span>أستاذ نَهج الذكي</span>
            <span className="text-[9px] px-1 py-0.2 bg-emerald-600 text-white rounded">مجاني</span>
          </h4>
          <p className="text-[10px] text-[#7A8A7E]">شرح، أسئلة، ودعم فوري</p>
        </button>
      </div>

      {/* Life Balance Indicators (الهدف: طالب صحيح ومتوازن يذاكر أضعاف طالب مرهق) */}
      <div className="bg-[#FAF9F5] border border-[#2D5A43]/15 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-xs text-[#1E2922] flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#2D5A43]" />
            <span>مؤشرات الاتزان اليومي (نظام نَهج للحياة المتوازنة)</span>
          </h3>
          <span className="text-[11px] text-[#7A8A7E]">طالب متوازن = استيعاب مضاعف</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <div className="bg-white p-2.5 rounded-xl border border-[#E8E4DC] text-center">
            <span className="text-[10px] text-[#7A8A7E] block">النوم الصحي</span>
            <span className="font-bold text-xs text-[#2D5A43]">7 ساعات عميقة</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-[#E8E4DC] text-center">
            <span className="text-[10px] text-[#7A8A7E] block">الماء</span>
            <span className="font-bold text-xs text-blue-600">8 أكواب اليوم</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-[#E8E4DC] text-center">
            <span className="text-[10px] text-[#7A8A7E] block">التمارين</span>
            <span className="font-bold text-xs text-amber-600">7 دقائق تنشيط</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-[#E8E4DC] text-center">
            <span className="text-[10px] text-[#7A8A7E] block">الصلوات</span>
            <span className="font-bold text-xs text-emerald-600">في مواقيتها</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-[#E8E4DC] text-center">
            <span className="text-[10px] text-[#7A8A7E] block">النفسية</span>
            <span className="font-bold text-xs text-purple-600">هدوء وثقة</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-[#E8E4DC] text-center">
            <span className="text-[10px] text-[#7A8A7E] block">المذاكرة</span>
            <span className="font-bold text-xs text-[#2D5A43]">مركزة بدون شتات</span>
          </div>
        </div>
      </div>
    </div>
  );
};
