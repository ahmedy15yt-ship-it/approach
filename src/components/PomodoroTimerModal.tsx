import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
  Minimize2,
  BookOpen,
  Bell,
  BellRing,
  MonitorCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  isNotificationSupported,
  isNotificationsEnabled,
  requestNotificationPermission,
  notifyPomodoroCompleted,
} from '../services/notificationService';
import { useWakeLock } from '../utils/useWakeLock';

interface PomodoroTimerModalProps {
  sessionTitle: string;
  subjectName: string;
  initialDurationMinutes?: number;
  onClose: () => void;
  onComplete: (durationMinutes: number) => void;
}

export const PomodoroTimerModal: React.FC<PomodoroTimerModalProps> = ({
  sessionTitle,
  subjectName,
  initialDurationMinutes = 25,
  onClose,
  onComplete,
}) => {
  const safeInitialMins = Math.max(1, initialDurationMinutes || 25);
  const [totalSeconds, setTotalSeconds] = useState(safeInitialMins * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(safeInitialMins * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasNotifPermission, setHasNotifPermission] = useState(() => isNotificationsEnabled());

  // Ref to store exact target timestamp to guarantee zero drift even when tab is sleeping/minimized
  const endTimeRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string>(document.title);

  // Prevent screen sleep while Pomodoro countdown is running
  const { isSupported: isWakeLockSupported, isWakeLocked } = useWakeLock(isActive);

  // Play audio chime synthesized via Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5); // A5
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.9);
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  };

  // Timestamp-based background timing loop
  useEffect(() => {
    let interval: any = null;

    if (isActive) {
      // Set end timestamp based on current remaining seconds
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + remainingSeconds * 1000;
      }

      interval = setInterval(() => {
        if (!endTimeRef.current) return;
        const now = Date.now();
        const diff = Math.max(0, Math.round((endTimeRef.current - now) / 1000));
        setRemainingSeconds(diff);

        // Update document title for background visibility
        const mins = Math.floor(diff / 60);
        const s = diff % 60;
        const timeStr = `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        document.title = `(${timeStr}) نَهج — ${sessionTitle || subjectName}`;

        if (diff === 0) {
          setIsActive(false);
          endTimeRef.current = null;
          playChime();
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.6 },
          });

          // Trigger background Push / System Notification
          notifyPomodoroCompleted(
            sessionTitle || 'جلسة المذاكرة',
            subjectName || 'تالتة ثانوي',
            Math.round(totalSeconds / 60)
          );

          if (mode === 'focus') {
            onComplete(Math.round(totalSeconds / 60));
          }
        }
      }, 500); // Check every 500ms for smooth synchronization
    } else {
      endTimeRef.current = null;
      document.title = originalTitleRef.current;
    }

    // Handle tab visibility change: recalculate immediately when tab wakes up
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && endTimeRef.current) {
        const diff = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
        setRemainingSeconds(diff);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.title = originalTitleRef.current;
    };
  }, [isActive, mode, totalSeconds, sessionTitle, subjectName]);

  const toggleTimer = async () => {
    if (!isActive) {
      // Auto prompt notification permission if not yet decided
      if (isNotificationSupported() && Notification.permission === 'default') {
        const granted = await requestNotificationPermission();
        setHasNotifPermission(granted);
      }
      endTimeRef.current = Date.now() + remainingSeconds * 1000;
      setIsActive(true);
    } else {
      endTimeRef.current = null;
      setIsActive(false);
    }
  };

  const resetTimer = (mins: number) => {
    setIsActive(false);
    endTimeRef.current = null;
    setTotalSeconds(mins * 60);
    setRemainingSeconds(mins * 60);
    document.title = originalTitleRef.current;
  };

  const handleFinishEarly = () => {
    setIsActive(false);
    endTimeRef.current = null;
    confetti({ particleCount: 50, spread: 60 });
    const elapsedMinutes = Math.max(1, Math.round((totalSeconds - remainingSeconds) / 60));
    onComplete(elapsedMinutes);
    onClose();
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setHasNotifPermission(granted);
    if (granted) {
      confetti({ particleCount: 30, spread: 50 });
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

  // -------------------------------------------------------------------------
  // Render: Minimized Floating Widget Mode (Allows browsing while timing)
  // -------------------------------------------------------------------------
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 lg:bottom-6 left-6 z-50 bg-[#08080A] text-[#F4EFE6] p-3.5 rounded-2xl shadow-2xl border border-[#D4AF37]/70 flex items-center gap-3 backdrop-blur-md font-['Cairo',sans-serif] animate-in fade-in slide-in-from-bottom-3 duration-300">
        <button
          onClick={toggleTimer}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            isActive ? 'bg-[#F4EFE6] text-[#09090B]' : 'btn-luxury-gold'
          }`}
          title={isActive ? 'إيقاف مؤقت' : 'استئناف'}
        >
          {isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg font-black tracking-wider text-[#F3DFA2] tabular-nums" dir="ltr">
              {formatTime(remainingSeconds)}
            </span>
            <span className="text-[10px] text-[#B5AA92]">
              {mode === 'focus' ? '• تركيز' : '• راحة'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#F4EFE6]/90 truncate max-w-[130px] block leading-tight">
            {sessionTitle || subjectName}
          </span>
          {isActive && (
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <MonitorCheck className="w-3 h-3 shrink-0" />
              <span>الشاشة لن تفصل</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 pr-1 border-r border-[#D4AF37]/25">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-2 hover:bg-[#D4AF37]/15 rounded-xl text-[#E8CE88]/80 hover:text-[#F6E2A6] transition-colors cursor-pointer"
            title="تكبير المؤقت"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500/20 text-[#B5AA92] hover:text-red-400 rounded-xl transition-colors cursor-pointer"
            title="إغلاق المؤقت"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Full Modal View
  // -------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/45 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative font-['Cairo',sans-serif] p-6 text-center animate-in zoom-in-95 duration-200 transition-colors">
        {/* Top Actions: Close & Minimize */}
        <div className="absolute top-4 left-4 flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 text-zinc-500 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#E8CE88] rounded-xl hover:bg-black/5 dark:hover:bg-[#D4AF37]/10 transition-colors cursor-pointer"
            title="تصغير المؤقت والاستمرار في تصفح التطبيق"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 dark:text-[#B5AA92] hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ambient indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-[#09090C] text-[#9A7218] dark:text-[#E8CE88] rounded-full text-xs font-bold mb-3 border border-amber-200 dark:border-[#D4AF37]/35">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{subjectName || 'جلسة استذكار'}</span>
        </div>

        <h3 className="text-base font-extrabold text-zinc-950 dark:text-[#F4EFE6] mb-1 leading-snug px-6">
          {sessionTitle || 'تركيز عميق بدون مقاطعة'}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-[#B5AA92] mb-3">
          {mode === 'focus'
            ? 'يعمل المؤقت في الخلفية وتبقى الشاشة مضاءة تلقائياً طوال الجلسة'
            : 'استراحة مستحقة: اشرب ماء وتمدد بهدوء'}
        </p>

        {isActive && (
          <div className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
            <MonitorCheck className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isWakeLocked || isWakeLockSupported
                ? 'الشاشة لن تفصل أثناء تشغيل المؤقت ✓'
                : 'وضع الحفاظ على التركيز نشط أثناء المؤقت ✓'}
            </span>
          </div>
        )}

        {/* Notification Status Banner */}
        {isNotificationSupported() && !hasNotifPermission && (
          <div className="mb-4 p-2.5 bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl flex items-center justify-between text-xs text-zinc-800 dark:text-[#F4EFE6] text-right">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#9A7218] dark:text-[#E8CE88] shrink-0" />
              <span>فعل التنبيهات ليخبرك النظام فور انتهاء الجلسة</span>
            </div>
            <button
              onClick={handleEnableNotifications}
              className="px-2.5 py-1 btn-luxury-gold rounded-lg font-black text-[11px] transition-all shrink-0 mr-2 cursor-pointer"
            >
              تفعيل
            </button>
          </div>
        )}

        {/* Circular Progress & Clock Display */}
        <div className="relative w-52 h-52 mx-auto mb-5 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="104"
              cy="104"
              r="90"
              className="stroke-zinc-200 dark:stroke-[#09090C]"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="104"
              cy="104"
              r="90"
              stroke={mode === 'focus' ? '#D4AF37' : '#94A3B8'}
              strokeWidth="9"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={2 * Math.PI * 90 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className="font-mono text-4xl sm:text-5xl font-black text-zinc-950 dark:text-[#F3DFA2] tracking-wider tabular-nums" dir="ltr">
              {formatTime(remainingSeconds)}
            </span>
            <span className="text-xs font-bold text-zinc-500 dark:text-[#B5AA92] mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#D4AF37] animate-ping' : 'bg-zinc-500'}`} />
              <span>{isActive ? 'الجلسة جارية بالخلفية' : 'متوقف مؤقتاً'}</span>
            </span>
          </div>
        </div>

        {/* Mode Selector Presets */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
          {safeInitialMins !== 25 && safeInitialMins !== 45 && (
            <button
              onClick={() => {
                setMode('focus');
                resetTimer(safeInitialMins);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'focus' && totalSeconds === safeInitialMins * 60
                  ? 'btn-luxury-gold shadow-xs'
                  : 'bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-[#E8CE88] border border-zinc-200 dark:border-[#D4AF37]/25'
              }`}
            >
              {safeInitialMins} دقيقة (مجدولة)
            </button>
          )}
          <button
            onClick={() => {
              setMode('focus');
              resetTimer(25);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'focus' && totalSeconds === 25 * 60
                ? 'btn-luxury-gold shadow-xs'
                : 'bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-[#E8CE88] border border-zinc-200 dark:border-[#D4AF37]/25'
            }`}
          >
            25 دقيقة (بومودورو)
          </button>
          <button
            onClick={() => {
              setMode('focus');
              resetTimer(45);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'focus' && totalSeconds === 45 * 60
                ? 'btn-luxury-gold shadow-xs'
                : 'bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-[#E8CE88] border border-zinc-200 dark:border-[#D4AF37]/25'
            }`}
          >
            45 دقيقة (جلسة عميقة)
          </button>
          <button
            onClick={() => {
              setMode('break');
              resetTimer(5);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'break'
                ? 'bg-[#08080A] text-[#F6E2A6] shadow-xs border border-[#D4AF37]/60'
                : 'bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-[#E8CE88] border border-zinc-200 dark:border-[#D4AF37]/25'
            }`}
          >
            5 دقائق راحة
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <button
            onClick={() => resetTimer(totalSeconds / 60)}
            title="إعادة ضبط"
            className="p-3 bg-zinc-50 dark:bg-[#09090C] hover:bg-zinc-100 dark:hover:bg-[#141418] text-zinc-700 dark:text-[#E8CE88] rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={toggleTimer}
            className={`px-8 py-3.5 rounded-2xl font-black text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              isActive
                ? 'bg-[#08080A] hover:bg-black text-[#F6E2A6] border border-[#D4AF37]/60'
                : 'btn-luxury-gold'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>إيقاف مؤقت</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>{remainingSeconds === totalSeconds ? 'ابدأ الجلسة' : 'استئناف'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'كتم التنبيه' : 'تشغيل التنبيه'}
            className="p-3 bg-zinc-50 dark:bg-[#09090C] hover:bg-zinc-100 dark:hover:bg-[#141418] text-zinc-700 dark:text-[#E8CE88] rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 transition-all cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>
        </div>

        {/* Action Buttons: Finish Early or Minimize */}
        <div className="space-y-2">
          <button
            onClick={handleFinishEarly}
            className="w-full py-2.5 px-4 bg-amber-50 dark:bg-[#09090C] hover:bg-amber-100 dark:hover:bg-[#141418] text-[#9A7218] dark:text-[#E8CE88] font-bold text-xs rounded-xl border border-amber-200 dark:border-[#D4AF37]/35 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 text-[#9A7218] dark:text-[#E8CE88]" />
            <span>إنهاء وحفظ الجلسة في إحصائيات المذاكرة (+XP)</span>
          </button>

          <button
            onClick={() => setIsMinimized(true)}
            className="w-full py-2 px-3 text-zinc-500 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#E8CE88] font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>تصغير المؤقت وتصفح المنهج والجدول أثناء عمله</span>
          </button>
        </div>
      </div>
    </div>
  );
};
