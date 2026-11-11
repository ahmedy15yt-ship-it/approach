import React, { useState } from 'react';
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

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header Banner */}
      <div className="bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2D5A43]/10 text-[#2D5A43] rounded-full text-xs font-bold mb-1.5">
          <Utensils className="w-3.5 h-3.5" />
          <span>تغذية طالب تالتة ثانوي بالأكل المصري الاقتصادي</span>
        </div>
        <h2 className="text-xl font-extrabold text-[#1E2922]">
          نظام غذائي مصري مخصص حسب وزنك (رخيص ومتاح في كل بيت)
        </h2>
        <p className="text-xs text-[#6F7D72] leading-relaxed">
          مش محتاج أكل غالي ولا مكملات مستوردة. الفول البلدي، البيض، الجبنة القريش، البليلة، والسمك البلطي فيهم كل ما يحتاجه مخك لسرعة الحفظ وحل أصعب المسائل بدون صداع أو هبوط.
        </p>
      </div>

      {/* Personal Weight & Height Profile Card */}
      <div className="bg-white border-2 border-[#2D5A43]/20 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EDE6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D5A43]/10 text-[#2D5A43] flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1E2922]">
                تحديد الوزن والطول لحساب احتياجك الدقيق من الطعام والماء
              </h3>
              <p className="text-xs text-[#7A8A7E]">
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
              onChange={(e) => handleUpdateWeight(Number(e.target.value))}
              className="w-full accent-[#2D5A43] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono" dir="ltr">
              <span>40 kg</span>
              <span>85 kg</span>
              <span>130 kg</span>
            </div>
          </div>

          {/* Height Slider */}
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
              onChange={(e) => handleUpdateHeight(Number(e.target.value))}
              className="w-full accent-[#2D5A43] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono" dir="ltr">
              <span>140 cm</span>
              <span>172 cm</span>
              <span>205 cm</span>
            </div>
          </div>
        </div>

        {/* Nutritional Blueprint for this Weight */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-emerald-800 font-bold block mb-1">البروتين اليومي</span>
            <span className="font-mono text-xl font-black text-emerald-900" dir="ltr">
              {recommendedProteinGrams} جم
            </span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">لترميم خلايا المخ</span>
          </div>

          <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-sky-800 font-bold block mb-1">احتياج الماء الصافي</span>
            <span className="font-mono text-xl font-black text-sky-900" dir="ltr">
              {recommendedWaterLiters} لتر
            </span>
            <span className="text-[10px] text-sky-700 block mt-0.5">({dynamicTargetCups} أكواب يومياً)</span>
          </div>

          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-amber-800 font-bold block mb-1">السعرات المقترحة</span>
            <span className="font-mono text-base font-black text-amber-900">
              {activePlan.dailyCaloriesTarget.split(' ')[0]}
            </span>
            <span className="text-[10px] text-amber-700 block mt-0.5">طاقة ثابتة بلا خمول</span>
          </div>

          <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-purple-800 font-bold block mb-1">التكلفة اليومية</span>
            <span className="font-mono text-base font-black text-purple-900">
              25 - 40 جنيه
            </span>
            <span className="text-[10px] text-purple-700 block mt-0.5">أوفر 70% من الديليفري</span>
          </div>
        </div>
      </div>

      {/* Plan Selector Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-[#1E2922] flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-[#2D5A43]" />
            <span>اختر خطة التغذية المصرية الملائمة لوزنك وهدفك:</span>
          </h3>
          <span className="text-xs text-[#7A8A7E]">
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
                className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-[#2D5A43] shadow-md ring-2 ring-[#2D5A43]/20'
                    : 'bg-[#FAF9F6] border-[#E8E4DC] hover:border-[#2D5A43]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? 'bg-[#2D5A43] text-white'
                          : 'bg-[#2D5A43]/10 text-[#2D5A43]'
                      }`}
                    >
                      {plan.bmiRange}
                    </span>
                    {isRecommended && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-400 text-[#1E2922] font-black rounded-full">
                        ★ متوافق مع وزنك
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs text-[#1E2922] mb-1">
                    {plan.categoryTitle}
                  </h4>
                  <p className="text-[11px] text-[#6F7D72] leading-relaxed line-clamp-2">
                    {plan.targetGoal}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#EDE8DE] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#8C7A52]">{plan.badge}</span>
                  <span className="text-xs font-bold text-[#2D5A43]">
                    {isSelected ? '✓ معروض الآن' : 'عرض الخطة ←'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Diet Plan Breakdown */}
      <div className="bg-gradient-to-br from-[#FAF9F5] to-white border-2 border-[#2D5A43]/25 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#EAE6DF]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2D5A43] text-white rounded-full text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{activePlan.badge}</span>
            </div>
            <h3 className="text-lg font-black text-[#1E2922]">{activePlan.categoryTitle}</h3>
            <p className="text-xs text-[#5D6B60] mt-1 max-w-2xl">{activePlan.targetGoal}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-white border border-[#2D5A43]/20 font-bold text-[#2D5A43]">
              🔥 السعرات: {activePlan.dailyCaloriesTarget}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white border border-[#2D5A43]/20 font-bold text-[#2D5A43]">
              🥩 البروتين: {activePlan.dailyProteinTarget}
            </span>
          </div>
        </div>

        {/* Golden Rule Callout */}
        <div className="bg-[#2D5A43]/10 border border-[#2D5A43]/20 rounded-2xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-[#1E2922]">
            <strong className="font-extrabold text-[#2D5A43] block mb-0.5">
              القاعدة الذهبية لطالب الثانوية في هذه الخطة:
            </strong>
            {activePlan.goldenRule}
          </div>
        </div>

        {/* 5 Daily Meals Timeline */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-sm text-[#1E2922]">
            جدول الوجبات الـ 5 الموزعة على مدار يوم المذاكرة:
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePlan.meals.map((meal, index) => (
              <div
                key={index}
                className="bg-white border border-[#E8E4DC] rounded-2xl p-4 shadow-2xs hover:border-[#2D5A43]/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#2D5A43]/10 text-[#2D5A43]">
                      {meal.mealTime}
                    </span>
                    <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{meal.prepTime}</span>
                    </span>
                  </div>

                  <h5 className="font-black text-sm text-[#1E2922] mb-1.5 leading-snug">
                    {meal.dish}
                  </h5>

                  <p className="text-xs text-[#4B594E] leading-relaxed mb-2 font-medium">
                    🛒 <strong>المكونات:</strong> {meal.items}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-[#F8F7F2] rounded-xl p-3 border border-[#EAE6DE]">
                    <span className="text-[10px] font-bold text-[#2D5A43] block mb-0.5">
                      🔬 مفعولها على تركيزك بالثانوية:
                    </span>
                    <p className="text-xs text-[#334237] leading-relaxed">{meal.whyThisMeal}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{meal.estimatedCost}</span>
                    </span>
                    <span className="text-gray-400 font-medium">مكونات متوفرة في مصر</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cheap Egyptian Superfoods Catalog */}
      <div className="bg-white rounded-3xl border border-[#2D5A43]/15 shadow-xs p-6 space-y-4">
        <div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-extrabold mb-1.5">
            <Coins className="w-3.5 h-3.5" />
            <span>قائمة التسوق الأسبوعية الاقتصادية</span>
          </div>
          <h3 className="font-extrabold text-base text-[#1E2922]">
            «السوبر فود» المصري الشعبي: بدائل خارقة للمخ بتكلفة جنيهات معدودة
          </h3>
          <p className="text-xs text-[#6F7D72]">
            أكلات شعبية مصرية تتفوق علمياً على المنتجات والمكملات المستوردة بأسعار في متناول أي طالب:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {CHEAP_EGYPTIAN_SUPERFOODS.map((food, i) => (
            <div
              key={i}
              className="bg-[#FAF9F5] border border-[#E8E4DC] rounded-2xl p-4 flex flex-col justify-between hover:border-[#2D5A43]/40 transition-all space-y-2.5"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800">
                    {food.priceEstimate}
                  </span>
                  <span className="text-[10px] text-[#2D5A43] font-bold">بديل مصري ممتاز</span>
                </div>
                <h4 className="font-black text-xs text-[#1E2922] mb-1">{food.name}</h4>
                <p className="text-[11px] text-[#2D5A43] font-bold mb-1.5">{food.nutrient}</p>
                <p className="text-xs text-[#526055] leading-relaxed">{food.benefit}</p>
              </div>

              <div className="pt-2 border-t border-[#EAE6DF] text-[11px] text-[#7A8A7E]">
                🍳 <strong>طريقة التحضير:</strong> {food.howToPrep}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Water Tracker */}
      <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Droplet className="w-6 h-6 fill-current text-sky-200" />
              <h3 className="font-extrabold text-lg">عدّاد الماء اليومي لخلايا المخ</h3>
            </div>
            <p className="text-xs text-sky-100 max-w-md">
              نقص الماء بنسبة 2% فقط يقلل التركيز وسرعة الاسترجاع بنسبة 14% ويسبب الصداع المكتبي. هدفك اليومي حسب وزنك ({weight} كجم) هو {dynamicTargetCups} أكواب ({recommendedWaterLiters} لتر).
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md p-3 rounded-2xl border border-white/20 self-start sm:self-center">
            <button
              onClick={handleMinusWater}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="text-center px-3">
              <span className="font-mono text-3xl font-black block leading-none" dir="ltr">
                {waterCups} / {dynamicTargetCups}
              </span>
              <span className="text-[11px] text-sky-200 font-bold">أكواب اليوم</span>
            </div>

            <button
              onClick={handleAddWater}
              className="w-9 h-9 rounded-xl bg-white text-blue-700 hover:bg-sky-50 flex items-center justify-center font-bold text-lg shadow-sm transition-colors cursor-pointer"
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
                  i < waterCups ? 'fill-current text-sky-200' : 'stroke-current'
                }`}
              />
              <span className="text-[10px] font-mono font-bold">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Good vs Bad Foods Comparison Table */}
      <div className="bg-white rounded-3xl border border-[#2D5A43]/15 shadow-xs p-6 space-y-4">
        <div>
          <h3 className="font-extrabold text-sm text-[#1E2922]">
            دليل المقارنة: أكلات تعزز استيعابك vs أكلات تسبب الضباب والخمول
          </h3>
          <p className="text-xs text-[#6F7D72]">
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
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-rose-50/50 border-rose-200'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    isGood ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isGood ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>

                <div>
                  <h4 className="font-extrabold text-xs text-[#1E2922] mb-0.5">{food.name}</h4>
                  <p className="text-xs text-[#4B594E] leading-relaxed mb-1">{food.impact}</p>
                  <span
                    className={`text-[11px] font-bold block ${
                      isGood ? 'text-emerald-700' : 'text-rose-700'
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
