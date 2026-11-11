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
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PomodoroTimerModalProps {
  sessionTitle: string;
  subjectName: string;
  onClose: () => void;
  onComplete: (durationMinutes: number) => void;
}

export const PomodoroTimerModal: React.FC<PomodoroTimerModalProps> = ({
  sessionTitle,
  subjectName,
  onClose,
  onComplete,
}) => {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ambientAudio, setAmbientAudio] = useState<'none' | 'whitenoise' | 'quran'>('none');

  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => prev - 1);
      }, 1000);
    } else if (remainingSeconds === 0 && isActive) {
      setIsActive(false);
      playChime();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      if (mode === 'focus') {
        onComplete(Math.round(totalSeconds / 60));
      }
    }
    return () => clearInterval(interval);
  }, [isActive, remainingSeconds, mode, totalSeconds]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = (mins: number) => {
    setIsActive(false);
    setTotalSeconds(mins * 60);
    setRemainingSeconds(mins * 60);
  };

  const handleFinishEarly = () => {
    setIsActive(false);
    confetti({ particleCount: 50, spread: 60 });
    const elapsedMinutes = Math.max(1, Math.round((totalSeconds - remainingSeconds) / 60));
    onComplete(elapsedMinutes);
    onClose();
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#1E2922]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FAF8F5] border border-[#2D5A43]/20 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative font-['Cairo',sans-serif] p-6 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-[#6F7D72] hover:text-[#1E2922] rounded-full hover:bg-black/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ambient indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2D5A43]/10 text-[#2D5A43] rounded-full text-xs font-bold mb-4">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{subjectName || 'جلسة استذكار'}</span>
        </div>

        <h3 className="text-base font-extrabold text-[#1E2922] mb-1 leading-snug">
          {sessionTitle || 'تركيز عميق بدون مقاطعة'}
        </h3>
        <p className="text-xs text-[#6F7D72] mb-6">
          {mode === 'focus' ? 'اغلق أي إشعارات خارجية، مخك الآن في حالة استيعاب قصوى' : 'استراحة مستحقة: اشرب ماء وتمدد'}
        </p>

        {/* Circular Progress & Clock Display */}
        <div className="relative w-56 h-56 mx-auto mb-6 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="112"
              cy="112"
              r="96"
              stroke="#E6E0D3"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="112"
              cy="112"
              r="96"
              stroke={mode === 'focus' ? '#2D5A43' : '#10B981'}
              strokeWidth="9"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 96}
              strokeDashoffset={2 * Math.PI * 96 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className="font-mono text-4xl sm:text-5xl font-black text-[#1E2922] tracking-wider" dir="ltr">
              {formatTime(remainingSeconds)}
            </span>
            <span className="text-xs font-bold text-[#8C7A52] mt-1">
              {isActive ? '● الجلسة جارية' : 'متوقف مؤقتاً'}
            </span>
          </div>
        </div>

        {/* Mode Selector Presets */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => {
              setMode('focus');
              resetTimer(25);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'focus' && totalSeconds === 25 * 60
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'bg-white text-[#4A5D4E] border border-[#DDD6C9]'
            }`}
          >
            25 دقيقة (بومودورو)
          </button>
          <button
            onClick={() => {
              setMode('focus');
              resetTimer(45);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'focus' && totalSeconds === 45 * 60
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'bg-white text-[#4A5D4E] border border-[#DDD6C9]'
            }`}
          >
            45 دقيقة (جلسة عميقة)
          </button>
          <button
            onClick={() => {
              setMode('break');
              resetTimer(5);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'break'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-[#4A5D4E] border border-[#DDD6C9]'
            }`}
          >
            5 دقائق راحة
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => resetTimer(totalSeconds / 60)}
            title="إعادة ضبط"
            className="p-3 bg-white hover:bg-gray-100 text-[#4A5D4E] rounded-2xl border border-[#DDD6C9] transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={toggleTimer}
            className={`px-8 py-3.5 rounded-2xl font-black text-sm text-white shadow-md transition-all flex items-center gap-2 ${
              isActive ? 'bg-[#C59B27] hover:bg-[#B28920]' : 'bg-[#2D5A43] hover:bg-[#234734]'
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
            className="p-3 bg-white hover:bg-gray-100 text-[#4A5D4E] rounded-2xl border border-[#DDD6C9] transition-all"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
          </button>
        </div>

        {/* Finish Early & Log XP */}
        <button
          onClick={handleFinishEarly}
          className="w-full py-2.5 px-4 bg-[#EAF2ED] hover:bg-[#DCE9E1] text-[#2D5A43] font-bold text-xs rounded-xl border border-[#2D5A43]/20 transition-all flex items-center justify-center gap-1.5"
        >
          <CheckCircle className="w-4 h-4 text-[#2D5A43]" />
          <span>إنهاء وحفظ الجلسة في إحصائيات المذاكرة (+XP)</span>
        </button>
      </div>
    </div>
  );
};
