import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Heart,
  Eye,
  Wind,
  CheckCircle,
  Video,
  ExternalLink,
  Scale,
  Ruler,
  ChevronRight,
  Flame,
  Activity,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QUICK_ROUTINE, Exercise } from '../data/exercises';

interface ExercisesViewProps {
  initialWeight?: number;
  initialHeight?: number;
  onUpdateMetrics?: (weight: number, height: number) => void;
}

export const ExercisesView: React.FC<ExercisesViewProps> = ({
  initialWeight = 68,
  initialHeight = 172,
  onUpdateMetrics,
}) => {
  const [weight, setWeight] = useState<number>(() => {
    const saved = localStorage.getItem('nahj_student_weight');
    return saved ? Number(saved) : initialWeight;
  });

  const [height, setHeight] = useState<number>(() => {
    const saved = localStorage.getItem('nahj_student_height');
    return saved ? Number(saved) : initialHeight;
  });

  useEffect(() => {
    if (initialWeight && initialWeight !== weight) {
      setWeight(initialWeight);
    }
  }, [initialWeight]);

  useEffect(() => {
    if (initialHeight && initialHeight !== height) {
      setHeight(initialHeight);
    }
  }, [initialHeight]);

  // Calculate BMI and Weight Category
  const heightInMeters = height > 0 ? height / 100 : 1.72;
  const bmi = Number((weight / (heightInMeters * heightInMeters)).toFixed(1));

  let weightCategory: 'نحافة' | 'وزن مثالي' | 'زيادة وزن' | 'سمنة خفيفة' = 'وزن مثالي';
  let categoryColor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/50';
  let recommendedRoutineFilter: 'الجميع' | 'الوزن الزائد' | 'النحافة والوزن المعتدل' = 'الجميع';

  if (bmi < 18.5) {
    weightCategory = 'نحافة';
    categoryColor = 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/50';
    recommendedRoutineFilter = 'النحافة والوزن المعتدل';
  } else if (bmi >= 18.5 && bmi < 25) {
    weightCategory = 'وزن مثالي';
    categoryColor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/50';
    recommendedRoutineFilter = 'النحافة والوزن المعتدل';
  } else if (bmi >= 25 && bmi < 30) {
    weightCategory = 'زيادة وزن';
    categoryColor = 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-900/50';
    recommendedRoutineFilter = 'الوزن الزائد';
  } else {
    weightCategory = 'سمنة خفيفة';
    categoryColor = 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/50';
    recommendedRoutineFilter = 'الوزن الزائد';
  }

  const [selectedExercise, setSelectedExercise] = useState<Exercise>(QUICK_ROUTINE[0]);
  const [secondsLeft, setSecondsLeft] = useState(QUICK_ROUTINE[0].durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [playerMode, setPlayerMode] = useState<'youtube' | 'guided'>('youtube');
  const [isVideoStarted, setIsVideoStarted] = useState(true);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    let timer: any = null;
    if (isRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      confetti({ particleCount: 60, spread: 60 });
    }
    return () => clearInterval(timer);
  }, [isRunning, secondsLeft]);

  // Cycle active step indicator during guided visual playback or active timer
  useEffect(() => {
    const stepCount = Math.max(1, selectedExercise.instructions.length);
    const elapsed = selectedExercise.durationSeconds - secondsLeft;
    const stepDuration = Math.max(5, Math.floor(selectedExercise.durationSeconds / stepCount));
    if (isRunning) {
      setActiveStepIndex(Math.min(stepCount - 1, Math.floor(elapsed / stepDuration)));
    }
  }, [secondsLeft, isRunning, selectedExercise]);

  const selectExercise = (ex: Exercise) => {
    setIsRunning(false);
    setSelectedExercise(ex);
    setSecondsLeft(ex.durationSeconds);
    setActiveStepIndex(0);
    setIsVideoStarted(true);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(selectedExercise.durationSeconds);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSaveMetrics = (newW: number, newH: number) => {
    setWeight(newW);
    setHeight(newH);
    localStorage.setItem('nahj_student_weight', String(newW));
    localStorage.setItem('nahj_student_height', String(newH));
    if (onUpdateMetrics) onUpdateMetrics(newW, newH);
  };

  // Filter exercises matching category or all
  const filteredExercises = QUICK_ROUTINE.filter(
    (ex) => ex.suitableForWeight === 'الجميع' || ex.suitableForWeight === recommendedRoutineFilter
  );

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-2xl p-5 shadow-xs transition-colors">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-[#09090C] text-[#9A7218] dark:text-[#E8CE88] rounded-full text-xs font-bold mb-1.5 border border-amber-200 dark:border-[#D4AF37]/35">
          <Dumbbell className="w-3.5 h-3.5" />
          <span>تمارين مكتبية ومنزلية بالفيديو والشرح التوضيحي</span>
        </div>
        <h2 className="text-xl font-extrabold text-zinc-900 dark:text-[#F6E2A6]">
          دم بيوصل للمخ + حماية فقرات الظهر وتفصيل حسب وزنك
        </h2>
        <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
          فيديوهات يوتيوب توضيحية مع شرح كتابي خطوة بخطوة، ونظام تمارين ملائم لوزنك وطولك لحماية مفاصلك وتنشيط ذهنك.
        </p>
      </div>

      {/* Weight & Height Personalization Card */}
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-[#D4AF37]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-[#09090C] border border-amber-300 dark:border-[#D4AF37]/35 text-[#9A7218] dark:text-[#F3DFA2] flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-[#F6E2A6]">
                تحديد الوزن والطول لملاءمة التمارين والنظام الغذائي
              </h3>
              <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
                التمارين والنظام الغذائي يتغيران تلقائياً بحسب بياناتك للحفاظ على طاقتك وسلامة ركبتك
              </p>
            </div>
          </div>

          {/* BMI Badge */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className={`px-3 py-1 rounded-full text-xs font-black border tabular-nums ${categoryColor}`}>
              مؤشر الكتلة: {bmi} ({weightCategory})
            </span>
          </div>
        </div>

        {/* Input sliders for Weight and Height */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
          {/* Weight */}
          <div className="bg-zinc-50 dark:bg-[#09090C] p-4 rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-[#B5AA92] flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-[#D4AF37]" />
                <span>وزنك الحالي:</span>
              </label>
              <span className="font-black font-mono text-base tabular-nums text-[#9A7218] dark:text-[#F6E2A6]" dir="ltr">
                {weight} كجم
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="130"
              value={weight}
              onChange={(e) => handleSaveMetrics(Number(e.target.value), height)}
              className="w-full accent-[#D4AF37] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 dark:text-[#B5AA92]/70 font-mono tabular-nums" dir="ltr">
              <span>40 kg</span>
              <span>85 kg</span>
              <span>130 kg</span>
            </div>
          </div>

          {/* Height */}
          <div className="bg-zinc-50 dark:bg-[#09090C] p-4 rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-[#B5AA92] flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-[#D4AF37]" />
                <span>طولك الحالي:</span>
              </label>
              <span className="font-black font-mono text-base tabular-nums text-[#9A7218] dark:text-[#F6E2A6]" dir="ltr">
                {height} سم
              </span>
            </div>
            <input
              type="range"
              min="140"
              max="205"
              value={height}
              onChange={(e) => handleSaveMetrics(weight, Number(e.target.value))}
              className="w-full accent-[#D4AF37] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 dark:text-[#B5AA92]/70 font-mono tabular-nums" dir="ltr">
              <span>140 cm</span>
              <span>172 cm</span>
              <span>205 cm</span>
            </div>
          </div>
        </div>

        {/* Personalized Coach Guidance Message based on Weight */}
        <div className="bg-amber-50/70 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/30 rounded-2xl p-4 text-xs text-zinc-800 dark:text-[#F4EFE6] flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="block font-bold text-sm text-[#9A7218] dark:text-[#F6E2A6] mb-0.5">
              توجيه الكابتن الرياضي المخصص لوزنك ({weight} كجم):
            </strong>
            {bmi >= 25 ? (
              <span>
                نظراً لأن مؤشر كتلتك يشير إلى ({weightCategory})، تم تفعيل تمارين <strong>خفيفة الشدة بدون قفز أو صدمات على الركبة (Low-Impact)</strong> لضمان حرق السعرات وتدفق الدم النقي للمخ دون أي آلام في المفاصل أثناء الجلوس على المكتب.
              </span>
            ) : bmi < 18.5 ? (
              <span>
                نظراً لأن مؤشر كتلتك يشير إلى ({weightCategory})، تم ضبط التمارين لتركز على <strong>تنشيط الدورة الدموية السريعة وتمارين الإطالة والتنفس</strong> لزيادة فتح الشهية وتدفق الأكسجين وتجنب الهبوط والدوخة أثناء المذاكرة.
              </span>
            ) : (
              <span>
                وزنك مثالي ومتناسق مع طولك! تم ضبط الجدول ليجمع بين <strong>تمارين تنشيط الفص الجبهي للدماغ وقرفصاء الكرسي وإطالات الرقبة والظهر</strong> للحفاظ على النشاط البدني الكامل طوال اليوم.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Active Exercise Stage: Video Tutorial + Written Guidance + Timer */}
      <div className="bg-gradient-to-l from-[#1E1E26] via-[#121217] to-[#08080A] text-[#F4EFE6] rounded-3xl p-6 sm:p-8 shadow-lg border border-[#D4AF37]/45">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left/Main Column: Instructions & YouTube Video Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#08080A] border border-[#D4AF37]/40 text-[#F6E2A6]">
                {selectedExercise.category}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#08080A] border border-[#D4AF37]/25 text-[#B5AA92]">
                الملائمة: {selectedExercise.suitableForWeight}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#F6E2A6]">
              {selectedExercise.name}
            </h3>

            <p className="text-xs text-[#B5AA92] leading-relaxed font-medium">
              {selectedExercise.benefit}
            </p>

            {/* Video Player Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 bg-[#08080A] p-1 rounded-xl border border-[#D4AF37]/25">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerMode('youtube');
                    setIsVideoStarted(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    playerMode === 'youtube'
                      ? 'btn-luxury-gold shadow-xs'
                      : 'text-[#B5AA92] hover:text-[#F3DFA2]'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>فيديو يوتيوب المباشر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerMode('guided')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    playerMode === 'guided'
                      ? 'btn-luxury-gold shadow-xs'
                      : 'text-[#B5AA92] hover:text-[#F3DFA2]'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>المدرب التفاعلي (بدون نت)</span>
                </button>
              </div>

              <a
                href={`https://www.youtube.com/watch?v=${selectedExercise.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#F6E2A6] flex items-center gap-1 underline text-[11px] text-[#E8CE88]"
              >
                <span>فتح على يوتيوب</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Embedded YouTube Player OR Interactive Motion Guide */}
            <div className="rounded-2xl overflow-hidden border-2 border-[#D4AF37]/35 shadow-md bg-[#08080A] aspect-video relative">
              {playerMode === 'youtube' ? (
                isVideoStarted ? (
                  <iframe
                    key={`${selectedExercise.id}-${selectedExercise.youtubeId}`}
                    src={`https://www.youtube.com/embed/${selectedExercise.youtubeId}?rel=0&playsinline=1&modestbranding=1`}
                    title={selectedExercise.name}
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsVideoStarted(true)}
                    className="w-full h-full relative group cursor-pointer flex items-center justify-center bg-black"
                  >
                    <img
                      src={`https://i.ytimg.com/vi/${selectedExercise.youtubeId}/hqdefault.jpg`}
                      alt={selectedExercise.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <span className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                      <span className="btn-luxury-gold w-16 h-16 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <Play className="w-7 h-7 fill-current translate-x-[-1px]" />
                      </span>
                      <span className="text-xs font-black bg-[#08080A]/90 border border-[#D4AF37]/40 px-3 py-1 rounded-full text-[#F6E2A6]">
                        اضغط لتشغيل فيديو التمرين
                      </span>
                    </span>
                  </button>
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#08080A] via-[#141419] to-[#08080A] p-5 flex flex-col justify-between text-right">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#19191F] border border-[#D4AF37]/40 text-[#F3DFA2] text-[11px] font-black flex items-center gap-1.5">
                      <Activity className={`w-3.5 h-3.5 text-[#D4AF37] ${isRunning ? 'animate-pulse' : ''}`} />
                      <span>الخطوة {activeStepIndex + 1} من {selectedExercise.instructions.length}</span>
                    </span>
                    <span className="font-mono text-sm font-black tabular-nums text-[#F6E2A6]" dir="ltr">
                      {formatTimer(secondsLeft)}
                    </span>
                  </div>

                  <div className="my-auto py-3 space-y-3 text-center">
                    <div className={`w-16 h-16 mx-auto rounded-2xl border-2 border-[#D4AF37]/60 bg-[#19191F] flex items-center justify-center ${isRunning ? 'animate-bounce' : ''}`}>
                      <Dumbbell className="w-8 h-8 text-[#F6E2A6]" />
                    </div>
                    <p className="text-sm sm:text-base font-black text-[#F4EFE6] leading-relaxed max-w-lg mx-auto">
                      {selectedExercise.instructions[activeStepIndex] || selectedExercise.instructions[0]}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#D4AF37]/20">
                    <div className="flex items-center gap-1.5">
                      {selectedExercise.instructions.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveStepIndex(idx)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            idx === activeStepIndex ? 'w-7 bg-[#D4AF37]' : 'w-2 bg-white/25 hover:bg-[#D4AF37]/60'
                          }`}
                          title={`الخطوة ${idx + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={toggleTimer}
                      className="btn-luxury-gold px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>{isRunning ? 'إيقاف' : 'تشغيل التوجيه'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-[#B5AA92]">
              <span className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-[#D4AF37]" />
                <span>
                  {playerMode === 'youtube'
                    ? 'اضغط تشغيل داخل المشغل أو جرّب «المدرب التفاعلي» في أي وقت'
                    : 'المدرب التفاعلي يوجّهك خطوة بخطوة مع المؤقت'}
                </span>
              </span>
            </div>

            {/* Step-by-Step Written Guide */}
            <div className="bg-[#08080A] rounded-2xl p-4 space-y-2 border border-[#D4AF37]/25">
              <span className="text-xs font-bold text-[#F3DFA2] block">
                الشرح الكتابي وخطوات الأداء الصحيح ({selectedExercise.repsOrHold}):
              </span>
              <ul className="space-y-2">
                {selectedExercise.instructions.map((ins, i) => (
                  <li key={i} className="text-xs text-[#F4EFE6] flex items-start gap-2.5 leading-relaxed">
                    <span className="btn-luxury-gold w-5 h-5 rounded-full font-black flex items-center justify-center shrink-0 text-[10px]">
                      {i + 1}
                    </span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 pt-2 border-t border-[#D4AF37]/20 text-[11px] text-[#B5AA92]">
                🎯 <strong className="text-[#E8CE88]">العضلات المستهدفة:</strong> {selectedExercise.targetMuscles}
              </div>
            </div>
          </div>

          {/* Right Column: Timer Clock */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 sm:p-8 bg-[#08080A] rounded-3xl border border-[#D4AF37]/35 text-center">
            <span className="text-xs text-[#E8CE88] font-bold mb-2">
              مؤقت الجلسة التفاعلي
            </span>
            <span className="font-mono text-6xl sm:text-7xl font-black mb-4 tracking-wider tabular-nums text-[#F6E2A6]" dir="ltr">
              {formatTimer(secondsLeft)}
            </span>
            <span className="text-xs text-[#B5AA92] mb-6">
              {isRunning ? '● التمرين قيد التشغيل — ركز في أنفاسك' : 'متوقف مؤقتاً'}
            </span>

            <div className="flex items-center gap-3 w-full justify-center">
              <button
                onClick={resetTimer}
                className="p-3.5 bg-[#19191F] hover:bg-[#23232C] border border-[#D4AF37]/30 rounded-2xl text-[#E8CE88] transition-colors cursor-pointer"
                title="إعادة ضبط المؤقت"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={toggleTimer}
                className="btn-luxury-gold grow py-3.5 px-6 rounded-2xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" />
                    <span>إيقاف مؤقت</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>{secondsLeft === selectedExercise.durationSeconds ? 'ابدأ التمرين الآن' : 'استئناف'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Routine Cards Selection matching user's weight */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-[#F6E2A6]">
            قائمة التمارين المتوافقة مع وزنك ({weight} كجم) والهدف الحالي:
          </h3>
          <span className="text-xs text-zinc-500 dark:text-[#B5AA92]">اختر أي تمرين لمشاهدة الفيديو والخطوات</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredExercises.map((ex) => {
            const isCurrent = ex.id === selectedExercise.id;
            return (
              <div
                key={ex.id}
                onClick={() => selectExercise(ex)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-white dark:bg-[#19191F] border-[#D4AF37] shadow-md ring-2 ring-[#D4AF37]/25'
                    : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37]/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 dark:bg-[#19191F] border border-amber-200 dark:border-[#D4AF37]/30 text-[#9A7218] dark:text-[#E8CE88]">
                      {ex.category}
                    </span>
                    <span className="text-xs font-mono font-bold tabular-nums text-[#9A7218] dark:text-[#F3DFA2]" dir="ltr">
                      {ex.durationSeconds} ثانية
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-zinc-900 dark:text-[#F6E2A6] mb-1">{ex.name}</h4>
                  <p className="text-[11px] text-zinc-600 dark:text-[#B5AA92] leading-relaxed line-clamp-2">
                    {ex.benefit}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-[#D4AF37]/15 flex items-center justify-between">
                  <span className="text-[10px] text-[#9A7218] dark:text-[#E8CE88] font-bold flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    <span>فيديو يوتيوب</span>
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      isCurrent ? 'text-[#9A7218] dark:text-[#F6E2A6]' : 'text-zinc-400 dark:text-[#B5AA92]/70'
                    }`}
                  >
                    {isCurrent ? '● المختار حالياً' : 'اختيار ←'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
