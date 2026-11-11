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
  let categoryColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let recommendedRoutineFilter: 'الجميع' | 'الوزن الزائد' | 'النحافة والوزن المعتدل' = 'الجميع';

  if (bmi < 18.5) {
    weightCategory = 'نحافة';
    categoryColor = 'text-amber-700 bg-amber-50 border-amber-200';
    recommendedRoutineFilter = 'النحافة والوزن المعتدل';
  } else if (bmi >= 18.5 && bmi < 25) {
    weightCategory = 'وزن مثالي';
    categoryColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    recommendedRoutineFilter = 'النحافة والوزن المعتدل';
  } else if (bmi >= 25 && bmi < 30) {
    weightCategory = 'زيادة وزن';
    categoryColor = 'text-orange-700 bg-orange-50 border-orange-200';
    recommendedRoutineFilter = 'الوزن الزائد';
  } else {
    weightCategory = 'سمنة خفيفة';
    categoryColor = 'text-rose-700 bg-rose-50 border-rose-200';
    recommendedRoutineFilter = 'الوزن الزائد';
  }

  const [selectedExercise, setSelectedExercise] = useState<Exercise>(QUICK_ROUTINE[0]);
  const [secondsLeft, setSecondsLeft] = useState(QUICK_ROUTINE[0].durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

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

  const selectExercise = (ex: Exercise) => {
    setIsRunning(false);
    setSelectedExercise(ex);
    setSecondsLeft(ex.durationSeconds);
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
      <div className="bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2D5A43]/10 text-[#2D5A43] rounded-full text-xs font-bold mb-1.5">
          <Dumbbell className="w-3.5 h-3.5" />
          <span>تمارين مكتبية ومنزلية بالفيديو والشرح التوضيحي</span>
        </div>
        <h2 className="text-xl font-extrabold text-[#1E2922]">
          دم بيوصل للمخ + حماية فقرات الظهر وتفصيل حسب وزنك
        </h2>
        <p className="text-xs text-[#6F7D72]">
          فيديوهات يوتيوب توضيحية مع شرح كتابي خطوة بخطوة، ونظام تمارين ملائم لوزنك وطولك لحماية مفاصلك وتنشيط ذهنك.
        </p>
      </div>

      {/* Weight & Height Personalization Card */}
      <div className="bg-white border-2 border-[#2D5A43]/20 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EDE6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D5A43]/10 text-[#2D5A43] flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1E2922]">
                تحديد الوزن والطول لملاءمة التمارين والنظام الغذائي
              </h3>
              <p className="text-xs text-[#7A8A7E]">
                التمارين والنظام الغذائي يتغيران تلقائياً بحسب بياناتك للحفاظ على طاقتك وسلامة ركبتك
              </p>
            </div>
          </div>

          {/* BMI Badge */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className={`px-3 py-1 rounded-full text-xs font-black border ${categoryColor}`}>
              مؤشر الكتلة: {bmi} ({weightCategory})
            </span>
          </div>
        </div>

        {/* Input sliders for Weight and Height */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
          {/* Weight */}
          <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E8E4DC] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#4B594E] flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-[#2D5A43]" />
                <span>وزنك الحالي:</span>
              </label>
              <span className="font-black font-mono text-base text-[#2D5A43]" dir="ltr">
                {weight} كجم
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="130"
              value={weight}
              onChange={(e) => handleSaveMetrics(Number(e.target.value), height)}
              className="w-full accent-[#2D5A43] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono" dir="ltr">
              <span>40 kg</span>
              <span>85 kg</span>
              <span>130 kg</span>
            </div>
          </div>

          {/* Height */}
          <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E8E4DC] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#4B594E] flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-[#2D5A43]" />
                <span>طولك الحالي:</span>
              </label>
              <span className="font-black font-mono text-base text-[#2D5A43]" dir="ltr">
                {height} سم
              </span>
            </div>
            <input
              type="range"
              min="140"
              max="205"
              value={height}
              onChange={(e) => handleSaveMetrics(weight, Number(e.target.value))}
              className="w-full accent-[#2D5A43] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono" dir="ltr">
              <span>140 cm</span>
              <span>172 cm</span>
              <span>205 cm</span>
            </div>
          </div>
        </div>

        {/* Personalized Coach Guidance Message based on Weight */}
        <div className="bg-[#F0F5F2] border border-[#2D5A43]/20 rounded-2xl p-4 text-xs text-[#2C3B30] flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="block font-bold text-sm text-[#2D5A43] mb-0.5">
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
      <div className="bg-gradient-to-r from-[#2D5A43] via-[#244A37] to-[#1E3B2C] text-white rounded-3xl p-6 sm:p-8 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left/Main Column: Instructions & YouTube Video Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-white/20 text-[#EAB308]">
                {selectedExercise.category}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-black/20 text-white/90">
                الملائمة: {selectedExercise.suitableForWeight}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white">
              {selectedExercise.name}
            </h3>

            <p className="text-xs text-white/85 leading-relaxed font-medium">
              {selectedExercise.benefit}
            </p>

            {/* Embedded YouTube Player */}
            <div className="rounded-2xl overflow-hidden border-2 border-white/20 shadow-md bg-black/40 aspect-video relative">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${selectedExercise.youtubeId}?rel=0&modestbranding=1`}
                title={selectedExercise.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-amber-300" />
                <span>فيديو توضيحي مباشر للحركة الصحيحة</span>
              </span>
              <a
                href={`https://www.youtube.com/watch?v=${selectedExercise.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-300 flex items-center gap-1 underline text-[11px]"
              >
                <span>مشاهدة على تطبيق يوتيوب</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Step-by-Step Written Guide */}
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-xs space-y-2 border border-white/10">
              <span className="text-xs font-bold text-amber-300 block">
                الشرح الكتابي وخطوات الأداء الصحيح ({selectedExercise.repsOrHold}):
              </span>
              <ul className="space-y-2">
                {selectedExercise.instructions.map((ins, i) => (
                  <li key={i} className="text-xs text-white/95 flex items-start gap-2.5 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-black font-black flex items-center justify-center shrink-0 text-[10px]">
                      {i + 1}
                    </span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-white/80">
                🎯 <strong>العضلات المستهدفة:</strong> {selectedExercise.targetMuscles}
              </div>
            </div>
          </div>

          {/* Right Column: Timer Clock */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 sm:p-8 bg-white/10 rounded-3xl backdrop-blur-md border border-white/15 text-center">
            <span className="text-xs text-amber-300 font-bold mb-2">
              مؤقت الجلسة التفاعلي
            </span>
            <span className="font-mono text-6xl sm:text-7xl font-black mb-4 tracking-wider text-white" dir="ltr">
              {formatTimer(secondsLeft)}
            </span>
            <span className="text-xs text-white/75 mb-6">
              {isRunning ? '● التمرين قيد التشغيل — ركز في أنفاسك' : 'متوقف مؤقتاً'}
            </span>

            <div className="flex items-center gap-3 w-full justify-center">
              <button
                onClick={resetTimer}
                className="p-3.5 bg-white/15 hover:bg-white/25 rounded-2xl text-white transition-colors"
                title="إعادة ضبط المؤقت"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={toggleTimer}
                className={`grow py-3.5 px-6 rounded-2xl font-black text-sm text-[#1E2922] transition-all shadow-md flex items-center justify-center gap-2 ${
                  isRunning ? 'bg-amber-400 hover:bg-amber-300' : 'bg-white hover:bg-white/90'
                }`}
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
          <h3 className="font-extrabold text-sm text-[#1E2922]">
            قائمة التمارين المتوافقة مع وزنك ({weight} كجم) والهدف الحالي:
          </h3>
          <span className="text-xs text-[#7A8A7E]">اختر أي تمرين لمشاهدة الفيديو والخطوات</span>
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
                    ? 'bg-white border-[#2D5A43] shadow-md ring-2 ring-[#2D5A43]/20'
                    : 'bg-[#FAF9F6] border-[#E8E4DC] hover:border-[#2D5A43]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#2D5A43]/10 text-[#2D5A43]">
                      {ex.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#8C7A52]" dir="ltr">
                      {ex.durationSeconds} ثانية
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-[#1E2922] mb-1">{ex.name}</h4>
                  <p className="text-[11px] text-[#5D6B60] leading-relaxed line-clamp-2">
                    {ex.benefit}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#EDE8DE] flex items-center justify-between">
                  <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    <span>فيديو يوتيوب</span>
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      isCurrent ? 'text-[#2D5A43]' : 'text-gray-400'
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
