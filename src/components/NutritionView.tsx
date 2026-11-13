import React, { useState, useRef } from 'react';
import {
  Utensils,
  Droplet,
  Sparkles,
  AlertTriangle,
  Heart,
  CheckCircle2,
  Clock,
  Plus,
  Minus,
  Scale,
  Ruler,
  Coins,
  Flame,
  Coffee,
  Check,
  ChevronLeft,
  Camera,
  Upload,
  Image as ImageIcon,
  Loader2,
  X,
  FileQuestion,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  EGYPTIAN_DIET_PLANS,
  CHEAP_EGYPTIAN_SUPERFOODS,
  FOOD_COMPARISON,
  EgyptianDietPlan,
} from '../data/nutrition';

interface NutritionViewProps {
  waterCups: number;
  onUpdateWaterCups: (newCount: number) => void;
  weightKg?: number;
  heightCm?: number;
  onUpdateMetrics?: (weight: number, height: number) => void;
}

export const NutritionView: React.FC<NutritionViewProps> = ({
  waterCups,
  onUpdateWaterCups,
  weightKg = 68,
  heightCm = 172,
  onUpdateMetrics,
}) => {
  const [weight, setWeight] = useState<number>(() => {
    const saved = localStorage.getItem('nahj_student_weight');
    return saved ? Number(saved) : weightKg;
  });

  const [height, setHeight] = useState<number>(() => {
    const saved = localStorage.getItem('nahj_student_height');
    return saved ? Number(saved) : heightCm;
  });

  // Smart Meal Inspector State
  const [mealImageBase64, setMealImageBase64] = useState<string | null>(null);
  const [mealImageMime, setMealImageMime] = useState<string>('image/jpeg');
  const [mealDescription, setMealDescription] = useState<string>('');
  const [isAnalyzingMeal, setIsAnalyzingMeal] = useState<boolean>(false);
  const [mealAnalysisResult, setMealAnalysisResult] = useState<any | null>(null);
  const [mealAnalysisError, setMealAnalysisError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Calculate BMI and Weight Category
  const heightInMeters = height > 0 ? height / 100 : 1.72;
  const bmi = Number((weight / (heightInMeters * heightInMeters)).toFixed(1));

  let autoCategoryKey: 'overweight' | 'balanced' | 'underweight' = 'balanced';
  let categoryLabel = 'وزن مثالي ومعتدل';
  let categoryBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';

  if (bmi < 18.5) {
    autoCategoryKey = 'underweight';
    categoryLabel = 'نحافة وضعف وزن';
    categoryBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
  } else if (bmi >= 25) {
    autoCategoryKey = 'overweight';
    categoryLabel = 'زيادة في الوزن';
    categoryBadgeColor = 'bg-orange-100 text-orange-800 border-orange-300';
  }

  // Active Plan view (can be overridden by user tab click)
  const [activePlanKey, setActivePlanKey] = useState<'overweight' | 'balanced' | 'underweight'>(autoCategoryKey);

  // Sync active plan if category changes due to slider
  const handleUpdateWeight = (newW: number) => {
    setWeight(newW);
    localStorage.setItem('nahj_student_weight', String(newW));
    if (onUpdateMetrics) onUpdateMetrics(newW, height);

    // auto select appropriate plan
    const hM = height / 100;
    const newBmi = Number((newW / (hM * hM)).toFixed(1));
    if (newBmi >= 25) setActivePlanKey('overweight');
    else if (newBmi < 18.5) setActivePlanKey('underweight');
    else setActivePlanKey('balanced');
  };

  const handleUpdateHeight = (newH: number) => {
    setHeight(newH);
    localStorage.setItem('nahj_student_height', String(newH));
    if (onUpdateMetrics) onUpdateMetrics(weight, newH);

    const hM = newH / 100;
    const newBmi = Number((weight / (hM * hM)).toFixed(1));
    if (newBmi >= 25) setActivePlanKey('overweight');
    else if (newBmi < 18.5) setActivePlanKey('underweight');
    else setActivePlanKey('balanced');
  };

  // Calculated Personalized Needs
  const recommendedProteinGrams = Math.round(weight * 1.4); // 1.4g per kg for young student
  const recommendedWaterLiters = (weight * 0.035).toFixed(1); // 35ml/kg
  const dynamicTargetCups = Math.max(8, Math.round((weight * 35) / 250)); // 250ml per cup

  const activePlan: EgyptianDietPlan = EGYPTIAN_DIET_PLANS[activePlanKey];

  const handleAddWater = () => {
    const next = waterCups + 1;
    onUpdateWaterCups(next);
    if (next === dynamicTargetCups) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  const handleMinusWater = () => {
    if (waterCups > 0) {
      onUpdateWaterCups(waterCups - 1);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      setMealAnalysisError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 12 ميجابايت.');
      return;
    }

    setMealImageMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64Content = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
      setMealImageBase64(base64Content);
      setMealAnalysisError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setMealImageBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInspectMeal = async () => {
    if (!mealDescription.trim() && !mealImageBase64) {
      setMealAnalysisError('يرجى التقاط صورة للأكلة أو كتابة وصف لمكوناتها أولاً.');
      return;
    }

    setIsAnalyzingMeal(true);
    setMealAnalysisError(null);

    try {
      const res = await fetch('/api/gemini/inspect-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: mealImageBase64,
          mimeType: mealImageMime,
          description: mealDescription,
          studentWeight: weight,
          studentHeight: height,
          bmi,
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const errMsg =
          data?.error ||
          data?.message ||
          (res.status === 413
            ? 'حجم صورة الوجبة كبير جداً، يرجى اختيار صورة أصغر.'
            : `تعذر تحليل الوجبة من الخادم (كود ${res.status}).`);
        setMealAnalysisError(errMsg);
        return;
      }

      if (data && (data.analysis || data.verdict)) {
        setMealAnalysisResult(data);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } else {
        setMealAnalysisError(data?.error || 'تعذر فحص الوجبة في الوقت الحالي، يرجى إعادة المحاولة.');
      }
    } catch (err: any) {
      setMealAnalysisError(
        err?.message && typeof err.message === 'string'
          ? `تعذر الاتصال بالخادم: ${err.message}`
          : 'حدث خطأ في الاتصال بالخادم، يرجى التحقق من الاتصال والمحاولة ثانية.'
      );
    } finally {
      setIsAnalyzingMeal(false);
    }
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-red-900/40 rounded-2xl p-5 shadow-xs transition-colors">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/50 text-[#DC2626] dark:text-red-400 rounded-full text-xs font-bold mb-1.5 border border-red-200/70 dark:border-red-900/40">
          <Utensils className="w-3.5 h-3.5" />
          <span>تغذية طالب تالتة ثانوي بالأكل المصري الاقتصادي</span>
        </div>
        <h2 className="text-xl font-extrabold text-zinc-950 dark:text-white">
          نظام غذائي مصري مخصص حسب وزنك (رخيص ومتاح في كل بيت)
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          مش محتاج أكل غالي ولا مكملات مستوردة. الفول البلدي، البيض، الجبنة القريش، البليلة، والسمك البلطي فيهم كل ما يحتاجه مخك لسرعة الحفظ وحل أصعب المسائل بدون صداع أو هبوط.
        </p>
      </div>

      {/* Personal Weight & Height Profile Card */}
      <div className="bg-white dark:bg-[#121215] border-2 border-red-200/80 dark:border-red-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#DC2626] dark:text-red-400 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">
                تحديد الوزن والطول لحساب احتياجك الدقيق من الطعام والماء
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                يتم تفصيل الوجبات والسعرات وكمية البروتين والماء آلياً حسب بياناتك الشخصية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className={`px-3 py-1 rounded-full text-xs font-black border ${categoryBadgeColor}`}>
              مؤشر الكتلة: {bmi} ({categoryLabel})
            </span>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Weight Slider */}
          <div className="bg-zinc-50 dark:bg-[#09090B] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-[#DC2626] dark:text-red-400" />
                <span>وزنك الحالي:</span>
              </label>
              <span className="font-black font-mono text-base text-[#DC2626] dark:text-red-400" dir="ltr">
                {weight} كجم
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="130"
              value={weight}
              onChange={(e) => handleUpdateWeight(Number(e.target.value))}
              className="w-full accent-[#DC2626] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono" dir="ltr">
              <span>40 kg</span>
              <span>85 kg</span>
              <span>130 kg</span>
            </div>
          </div>

          {/* Height Slider */}
          <div className="bg-zinc-50 dark:bg-[#09090B] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-[#DC2626] dark:text-red-400" />
                <span>طولك الحالي:</span>
              </label>
              <span className="font-black font-mono text-base text-[#DC2626] dark:text-red-400" dir="ltr">
                {height} سم
              </span>
            </div>
            <input
              type="range"
              min="140"
              max="205"
              value={height}
              onChange={(e) => handleUpdateHeight(Number(e.target.value))}
              className="w-full accent-[#DC2626] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono" dir="ltr">
              <span>140 cm</span>
              <span>172 cm</span>
              <span>205 cm</span>
            </div>
          </div>
        </div>

        {/* Nutritional Blueprint for this Weight */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-red-50/70 dark:bg-red-950/35 border border-red-200 dark:border-red-900/50 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-red-800 dark:text-red-300 font-bold block mb-1">البروتين اليومي</span>
            <span className="font-mono text-xl font-black text-[#DC2626] dark:text-red-400" dir="ltr">
              {recommendedProteinGrams} جم
            </span>
            <span className="text-[10px] text-red-700 dark:text-red-300/80 block mt-0.5">لترميم خلايا المخ</span>
          </div>

          <div className="bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-zinc-800 dark:text-zinc-300 font-bold block mb-1">احتياج الماء الصافي</span>
            <span className="font-mono text-xl font-black text-zinc-950 dark:text-white" dir="ltr">
              {recommendedWaterLiters} لتر
            </span>
            <span className="text-[10px] text-zinc-600 dark:text-zinc-400 block mt-0.5">({dynamicTargetCups} أكواب يومياً)</span>
          </div>

          <div className="bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold block mb-1">السعرات المقترحة</span>
            <span className="font-mono text-base font-black text-amber-900 dark:text-amber-300">
              {activePlan.dailyCaloriesTarget.split(' ')[0]}
            </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-300/80 block mt-0.5">طاقة ثابتة بلا خمول</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-bold block mb-1">التكلفة اليومية</span>
            <span className="font-mono text-base font-black text-zinc-950 dark:text-white">
              25 - 40 جنيه
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">أوفر 70% من الديليفري</span>
          </div>
        </div>
      </div>

      {/* Smart Meal Inspector (فحص أكل البيت بالصور والمواصفات وملاءمته للجسم) */}
      <div className="bg-gradient-to-br from-red-50/60 via-white to-zinc-100/60 dark:from-[#121215] dark:via-[#18181B] dark:to-[#09090B] border-2 border-[#DC2626]/30 dark:border-red-900/50 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-red-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#DC2626] text-white flex items-center justify-center font-bold shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-black text-[#DC2626] dark:text-red-400 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>فاحص الوجبات بالذكاء الاصطناعي (كاميرا + مواصفات)</span>
              </div>
              <h3 className="font-black text-base text-zinc-950 dark:text-white">
                هل وجبتك المنزلية مناسبة لوزنك وتركيزك اليوم؟
              </h3>
            </div>
          </div>

          <div className="text-left bg-white dark:bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/50">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">بيانات جسمك المعتمدة للفحص:</span>
            <span className="text-xs font-black text-[#DC2626] dark:text-red-400">
              {weight} كجم • {height} سم • مؤشر {bmi}
            </span>
          </div>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
          لو طبخت أو عملت أكل لنفسك في البيت، التقط له صورة واكتب مواصفاته ومكوناته، وسيقوم الذكاء الاصطناعي بفحص الأكلة وحساب سعراتها وبروتينها، وإخبارك بدقة هل هي مناسبة لوزنك وهل تمنحك طاقة للمذاكرة أم تسبب لك الخمول والنعاس!
        </p>

        {/* Upload & Description Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Image Uploader & Preview (5 cols) */}
          <div className="md:col-span-5 flex flex-col">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />

            {mealImageBase64 ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#DC2626] bg-black/5 aspect-4/3 flex items-center justify-center group">
                <img
                  src={`data:${mealImageMime};base64,${mealImageBase64}`}
                  alt="الوجبة"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-2 left-2 p-1.5 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-all cursor-pointer"
                  title="حذف الصورة"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/75 backdrop-blur-xs text-white rounded-lg text-[10px] font-bold">
                  ✓ تم تحميل صورة الوجبة
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-red-300 dark:border-red-900/60 hover:border-[#DC2626] dark:hover:border-red-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all bg-white/80 dark:bg-zinc-900/50 aspect-4/3 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#DC2626] dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-zinc-950 dark:text-white block">
                    اضغط لالتقاط أو اختيار صورة الوجبة
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                    (PNG, JPG حتى 12 ميجابايت)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#DC2626] dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900/50 mt-1">
                  📸 صور طبقك الآن
                </span>
              </div>
            )}
          </div>

          {/* Description Textarea & Action (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                مواصفات الأكلة ومكوناتها (اكتب ما صنعته بالتفصيل):
              </label>
              <textarea
                value={mealDescription}
                onChange={(e) => setMealDescription(e.target.value)}
                rows={4}
                placeholder="مثال: جهزت طبق مكون من ربع فرخة مسلوقة، و5 ملاعق أرز أبيض، وطبق سلطة خضراء برشة ليمون، ومعاهم كوب ماء..."
                className="w-full text-xs p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#DC2626] leading-relaxed resize-none"
              />
            </div>

            {/* Quick Suggestions Chips */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 block">
                أمثلة شائعة يمكنك اختيارها بضغطة زر:
              </span>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {[
                  'طبق فول بلدي بزيت حار مع 2 بيضة مسلوقة ورغيف بلدي',
                  'علبة تونة مصفاة مع سلطة طماطم وخيار وبصل ورغيف سن',
                  'جبنة قريش بزيت زيتون ونعناع مع شرائح خيار وربع رغيف',
                  'طبق مكرونة بالصلصة مع قطعة بانيه محمرة في زيت غزير',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMealDescription(sample)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-[#DC2626] dark:hover:border-red-400 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    + {sample.slice(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isAnalyzingMeal || (!mealDescription.trim() && !mealImageBase64)}
              onClick={handleInspectMeal}
              className={`w-full py-3 px-4 rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isAnalyzingMeal || (!mealDescription.trim() && !mealImageBase64)
                  ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white active:scale-98'
              }`}
            >
              {isAnalyzingMeal ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري فحص الوجبة بالذكاء الاصطناعي ومطابقتها مع جسمك...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>افحص ملاءمة الوجبة لجسمي الآن 🩺</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {mealAnalysisError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{mealAnalysisError}</span>
          </div>
        )}

        {/* Analysis Results Display */}
        {mealAnalysisResult && (
          <div className="mt-4 pt-4 border-t border-red-100 dark:border-zinc-800 space-y-4 animate-in fade-in duration-300">
            {/* Verdict Banner */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                mealAnalysisResult.isSuitable
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    mealAnalysisResult.isSuitable
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {mealAnalysisResult.isSuitable ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                    نتيجة الفحص الغذائي المعتمد
                  </span>
                  <h4 className="text-sm font-black">
                    {mealAnalysisResult.verdict ||
                      (mealAnalysisResult.isSuitable
                        ? 'وجبة متوافقة وممتازة لطاقة وتركيز جسمك'
                        : 'وجبة تحتاج لتعديل حتى لا تسبب خمولاً')}
                  </h4>
                </div>
              </div>

              {/* Macro Estimates */}
              <div className="flex flex-wrap gap-2 text-xs font-mono font-bold self-end sm:self-center">
                {mealAnalysisResult.caloriesEstimate && (
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 border border-current">
                    🔥 {mealAnalysisResult.caloriesEstimate}
                  </span>
                )}
                {mealAnalysisResult.proteinGrams && (
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 border border-current">
                    🥩 بروتين: {mealAnalysisResult.proteinGrams}
                  </span>
                )}
                {mealAnalysisResult.carbsGrams && (
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 border border-current">
                    🌾 كارب: {mealAnalysisResult.carbsGrams}
                  </span>
                )}
              </div>
            </div>

            {/* Scientific Analysis */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
              <div>
                <span className="text-[11px] font-black text-[#DC2626] dark:text-red-400 block mb-1">
                  🔬 التقييم العلمي لأثر هذه الوجبة على جسمك واستيعابك:
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed font-medium">
                  {mealAnalysisResult.analysis}
                </p>
              </div>

              {/* Actionable recommendations */}
              {mealAnalysisResult.recommendations && mealAnalysisResult.recommendations.length > 0 && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-white block mb-1.5">
                    💡 نصائح وتعديلات مقترحة لتحسين الوجبة:
                  </span>
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {mealAnalysisResult.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#DC2626] dark:text-red-400 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Thanaweya Tip */}
              {mealAnalysisResult.thanaweyaTip && (
                <div className="bg-red-50/70 dark:bg-red-950/35 p-3 rounded-xl border border-red-200 dark:border-red-900/50 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-900 dark:text-red-200 font-bold leading-relaxed">
                    🎓 <strong>نصيحة ثانوية عامة:</strong> {mealAnalysisResult.thanaweyaTip}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Plan Selector Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-[#DC2626] dark:text-red-400" />
            <span>اختر خطة التغذية المصرية الملائمة لوزنك وهدفك:</span>
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            تم تحديد النظام الملائم لوزنك ({weight} كجم) تلقائياً
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['overweight', 'balanced', 'underweight'] as const).map((key) => {
            const plan = EGYPTIAN_DIET_PLANS[key];
            const isSelected = activePlanKey === key;
            const isRecommended = autoCategoryKey === key;

            return (
              <button
                key={key}
                onClick={() => setActivePlanKey(key)}
                className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-[#121215] border-[#DC2626] dark:border-red-500 shadow-md ring-2 ring-[#DC2626]/20 dark:ring-red-500/30'
                    : 'bg-zinc-50 dark:bg-[#09090B] border-zinc-200 dark:border-zinc-800 hover:border-red-400/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-red-50 dark:bg-red-950/50 text-[#DC2626] dark:text-red-400'
                      }`}
                    >
                      {plan.bmiRange}
                    </span>
                    {isRecommended && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-400 text-black font-black rounded-full">
                        ★ متوافق مع وزنك
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs text-zinc-950 dark:text-white mb-1">
                    {plan.categoryTitle}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                    {plan.targetGoal}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#8C7A52] dark:text-amber-400">{plan.badge}</span>
                  <span className="text-xs font-bold text-[#DC2626] dark:text-red-400">
                    {isSelected ? '✓ معروض الآن' : 'عرض الخطة ←'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Diet Plan Breakdown */}
      <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-[#121215] dark:to-[#09090B] border-2 border-red-200/80 dark:border-red-900/40 rounded-3xl p-6 shadow-sm space-y-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#DC2626] text-white rounded-full text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{activePlan.badge}</span>
            </div>
            <h3 className="text-lg font-black text-zinc-950 dark:text-white">{activePlan.categoryTitle}</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 max-w-2xl">{activePlan.targetGoal}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#121215] border border-red-200 dark:border-red-900/40 font-bold text-[#DC2626] dark:text-red-400">
              🔥 السعرات: {activePlan.dailyCaloriesTarget}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#121215] border border-red-200 dark:border-red-900/40 font-bold text-[#DC2626] dark:text-red-400">
              🥩 البروتين: {activePlan.dailyProteinTarget}
            </span>
          </div>
        </div>

        {/* Golden Rule Callout */}
        <div className="bg-red-50/70 dark:bg-red-950/35 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-zinc-950 dark:text-zinc-200">
            <strong className="font-extrabold text-[#DC2626] dark:text-red-400 block mb-0.5">
              القاعدة الذهبية لطالب الثانوية في هذه الخطة:
            </strong>
            {activePlan.goldenRule}
          </div>
        </div>

        {/* 5 Daily Meals Timeline */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-sm text-zinc-950 dark:text-white">
            جدول الوجبات الـ 5 الموزعة على مدار يوم المذاكرة:
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePlan.meals.map((meal, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs hover:border-red-400/50 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-red-50 dark:bg-red-950/50 text-[#DC2626] dark:text-red-400">
                      {meal.mealTime}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{meal.prepTime}</span>
                    </span>
                  </div>

                  <h5 className="font-black text-sm text-zinc-950 dark:text-white mb-1.5 leading-snug">
                    {meal.dish}
                  </h5>

                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed mb-2 font-medium">
                    🛒 <strong>المكونات:</strong> {meal.items}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-zinc-50 dark:bg-[#09090B] rounded-xl p-3 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-[#DC2626] dark:text-red-400 block mb-0.5">
                      🔬 مفعولها على تركيزك بالثانوية:
                    </span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{meal.whyThisMeal}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{meal.estimatedCost}</span>
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500 font-medium">مكونات متوفرة في مصر</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cheap Egyptian Superfoods Catalog */}
      <div className="bg-white dark:bg-[#121215] rounded-3xl border border-zinc-200 dark:border-red-900/40 shadow-xs p-6 space-y-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-[11px] font-extrabold mb-1.5">
            <Coins className="w-3.5 h-3.5" />
            <span>قائمة التسوق الأسبوعية الاقتصادية</span>
          </div>
          <h3 className="font-extrabold text-base text-zinc-950 dark:text-white">
            «السوبر فود» المصري الشعبي: بدائل خارقة للمخ بتكلفة جنيهات معدودة
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            أكلات شعبية مصرية تتفوق علمياً على المنتجات والمكملات المستوردة بأسعار في متناول أي طالب:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {CHEAP_EGYPTIAN_SUPERFOODS.map((food, i) => (
            <div
              key={i}
              className="bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-red-400/50 transition-all space-y-2.5"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    {food.priceEstimate}
                  </span>
                  <span className="text-[10px] text-[#DC2626] dark:text-red-400 font-bold">بديل مصري ممتاز</span>
                </div>
                <h4 className="font-black text-xs text-zinc-950 dark:text-white mb-1">{food.name}</h4>
                <p className="text-[11px] text-[#DC2626] dark:text-red-400 font-bold mb-1.5">{food.nutrient}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{food.benefit}</p>
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400">
                🍳 <strong>طريقة التحضير:</strong> {food.howToPrep}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Water Tracker */}
      <div className="bg-gradient-to-r from-[#DC2626] via-[#991B1B] to-[#09090B] text-white rounded-3xl p-6 shadow-md relative overflow-hidden border border-red-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Droplet className="w-6 h-6 fill-current text-red-200" />
              <h3 className="font-extrabold text-lg">عدّاد الماء اليومي لخلايا المخ</h3>
            </div>
            <p className="text-xs text-red-100 max-w-md">
              نقص الماء بنسبة 2% فقط يقلل التركيز وسرعة الاسترجاع بنسبة 14% ويسبب الصداع المكتبي. هدفك اليومي حسب وزنك ({weight} كجم) هو {dynamicTargetCups} أكواب ({recommendedWaterLiters} لتر).
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/35 backdrop-blur-md p-3 rounded-2xl border border-white/20 self-start sm:self-center">
            <button
              onClick={handleMinusWater}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="text-center px-3">
              <span className="font-mono text-3xl font-black block leading-none" dir="ltr">
                {waterCups} / {dynamicTargetCups}
              </span>
              <span className="text-[11px] text-red-200 font-bold">أكواب اليوم</span>
            </div>

            <button
              onClick={handleAddWater}
              className="w-9 h-9 rounded-xl bg-white text-[#DC2626] hover:bg-red-50 flex items-center justify-center font-bold text-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Glasses visual icons */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-5 pt-4 border-t border-white/20">
          {Array.from({ length: dynamicTargetCups }).map((_, i) => (
            <div
              key={i}
              onClick={() => onUpdateWaterCups(i + 1)}
              className={`cursor-pointer transition-transform hover:scale-110 flex flex-col items-center gap-1 ${
                i < waterCups ? 'text-white' : 'text-white/30'
              }`}
            >
              <Droplet
                className={`w-6 h-6 ${
                  i < waterCups ? 'fill-current text-red-200' : 'stroke-current'
                }`}
              />
              <span className="text-[10px] font-mono font-bold">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Good vs Bad Foods Comparison Table */}
      <div className="bg-white dark:bg-[#121215] rounded-3xl border border-zinc-200 dark:border-red-900/40 shadow-xs p-6 space-y-4 transition-colors">
        <div>
          <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">
            دليل المقارنة: أكلات تعزز استيعابك vs أكلات تسبب الضباب والخمول
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            احرص على القائمة الخضراء وابتعد تماماً عن القائمة الحمراء خصوصاً في أيام الامتحانات والمراجعات الكبرى
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FOOD_COMPARISON.map((food, idx) => {
            const isGood = food.type === 'good';
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  isGood
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900/50'
                    : 'bg-rose-50/50 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/50'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    isGood
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {isGood ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>

                <div>
                  <h4 className="font-extrabold text-xs text-zinc-950 dark:text-white mb-0.5">{food.name}</h4>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed mb-1">{food.impact}</p>
                  <span
                    className={`text-[11px] font-bold block ${
                      isGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    💡 النصيحة: {food.advice}
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
