import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Sparkles,
  Calendar,
  Award,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { KhatmaPlanState, KhatmaPrayerKey } from '../types';
import { TOTAL_QURAN_PAGES, buildKhatmaSchedule } from '../utils/khatmaPlanner';

interface QuranKhatmaViewProps {
  accountPhone?: string;
  onAwardBonusXp?: (amount: number) => void;
}

const PRESET_PLANS = [
  { days: 10, title: 'ختمة الهمة العالية', desc: '3 أجزاء يومياً' },
  { days: 15, title: 'ختمة النصف شهر', desc: 'جزآن يومياً' },
  { days: 30, title: 'ختمة الشهر المتوازنة', desc: 'جزء واحد يومياً' },
  { days: 60, title: 'ختمة التدرج الهادئ', desc: 'نصف جزء يومياً' },
];

export const QuranKhatmaView: React.FC<QuranKhatmaViewProps> = ({
  accountPhone = 'guest',
  onAwardBonusXp,
}) => {
  const storageKey = `nahj_khatma_plan_${accountPhone}`;

  const [planState, setPlanState] = useState<KhatmaPlanState>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as KhatmaPlanState;
        if (parsed && typeof parsed.targetDays === 'number' && Array.isArray(parsed.completedSlotKeys)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return {
      targetDays: 30,
      startedAt: new Date().toISOString(),
      completedSlotKeys: [],
    };
  });

  const [customDaysInput, setCustomDaysInput] = useState<string>(String(planState.targetDays));
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(planState));
    } catch {
      // ignore
    }
  }, [planState, storageKey]);

  const schedule = useMemo(
    () => buildKhatmaSchedule(planState.targetDays, planState.completedSlotKeys),
    [planState.targetDays, planState.completedSlotKeys]
  );

  // Analytics across all 604 pages
  const analytics = useMemo(() => {
    const completedPageSet = new Set<number>();
    let completedPrayersCount = 0;
    const totalPrayersCount = schedule.length * 5;

    schedule.forEach((day) => {
      day.prayers.forEach((p) => {
        if (p.completed) {
          completedPrayersCount++;
          for (let pg = p.startPage; pg <= p.endPage; pg++) {
            completedPageSet.add(pg);
          }
        }
      });
    });

    const pagesRead = completedPageSet.size;
    const pct = Math.min(100, Math.round((pagesRead / TOTAL_QURAN_PAGES) * 100));
    const completedDaysCount = schedule.filter((d) => d.prayers.every((p) => p.completed)).length;

    return {
      pagesRead,
      pct,
      completedPrayersCount,
      totalPrayersCount,
      completedDaysCount,
    };
  }, [schedule]);

  const handleSelectPlanDays = (days: number) => {
    const clamped = Math.max(5, Math.min(120, Math.round(days)));
    setCustomDaysInput(String(clamped));
    setPlanState((prev) => ({
      ...prev,
      targetDays: clamped,
    }));
    setSelectedDayNum(1);
  };

  const handleToggleSlot = (dayNumber: number, prayerKey: KhatmaPrayerKey) => {
    const slotKey = `${dayNumber}:${prayerKey}`;
    const alreadyDone = planState.completedSlotKeys.includes(slotKey);

    setPlanState((prev) => {
      const nextSlots = alreadyDone
        ? prev.completedSlotKeys.filter((k) => k !== slotKey)
        : [...prev.completedSlotKeys, slotKey];
      return {
        ...prev,
        completedSlotKeys: nextSlots,
      };
    });

    if (!alreadyDone) {
      onAwardBonusXp?.(5);
      const dayObj = schedule.find((d) => d.dayNumber === dayNumber);
      const willFinishDay =
        dayObj && dayObj.prayers.filter((p) => p.prayerKey !== prayerKey).every((p) => p.completed);
      if (willFinishDay) {
        confetti({ particleCount: 45, spread: 60 });
      }
    }
  };

  const handleCompleteWholeDay = (dayNumber: number) => {
    const dayObj = schedule.find((d) => d.dayNumber === dayNumber);
    if (!dayObj) return;
    const allDone = dayObj.prayers.every((p) => p.completed);
    const dayKeys = dayObj.prayers.map((p) => `${dayNumber}:${p.prayerKey}`);

    setPlanState((prev) => {
      if (allDone) {
        return {
          ...prev,
          completedSlotKeys: prev.completedSlotKeys.filter((k) => !dayKeys.includes(k)),
        };
      }
      const merged = new Set([...prev.completedSlotKeys, ...dayKeys]);
      return {
        ...prev,
        completedSlotKeys: Array.from(merged),
      };
    });

    if (!allDone) {
      confetti({ particleCount: 55, spread: 70 });
      onAwardBonusXp?.(20);
    }
  };

  const activeDay = schedule.find((d) => d.dayNumber === selectedDayNum) || schedule[0];

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Hero Summary Card */}
      <section className="bg-gradient-to-l from-[#1C1B22] via-[#121217] to-[#08080A] border border-[#D4AF37]/45 rounded-3xl p-5 sm:p-7 text-[#F4EFE6] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-[#E8CE88]">
              <BookOpen className="w-4 h-4 text-[#D4AF37]" />
              <span>604 صفحة · 30 جزءاً · موزعة على الصلوات الخمس</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#F6E2A6]">
              خطة ختم القرآن الكريم اليومية
            </h1>
            <p className="text-xs sm:text-sm text-[#D8CEB8] max-w-2xl leading-relaxed">
              توزيع متوازن لصفحات المصحف الشريف بعد كل صلاة ليناسب وقت طالب الثانوية العامة ويبارك في يومه ومذاكرته.
            </p>
          </div>

          <div className="bg-[#09090C]/90 border border-[#D4AF37]/35 rounded-2xl px-5 py-3.5 text-center shrink-0">
            <span className="text-[11px] font-bold text-[#B5AA92] block">التقدم في الختمة</span>
            <span className="text-3xl font-black text-[#F6E2A6] tabular-nums" dir="ltr">
              {analytics.pct}%
            </span>
            <span className="text-xs font-bold text-[#E8CE88] block tabular-nums">
              {analytics.pagesRead} / {TOTAL_QURAN_PAGES} صفحة
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-3.5 bg-[#09090C] rounded-full overflow-hidden border border-[#D4AF37]/25">
            <div
              className="h-full bg-gradient-to-l from-[#F6E2A6] via-[#D4AF37] to-[#B58722] rounded-full transition-all duration-500"
              style={{ width: `${analytics.pct}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between text-xs font-bold text-[#D8CEB8]">
            <span>الأيام المكتملة: {analytics.completedDaysCount} من {schedule.length} يوم</span>
            <span>الأوراد المنجزة: {analytics.completedPrayersCount} من {analytics.totalPrayersCount} ورد</span>
          </div>
        </div>
      </section>

      {/* Plan Duration Selector */}
      <section className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-zinc-950 dark:text-[#F6E2A6] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#D4AF37]" />
              <span>اختر مدة الختمة المناسبة لجدولك</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
              يتم إعادة توزيع الـ 604 صفحة تلقائياً بعد الصلوات الخمس حسب عدد الأيام المختار.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={120}
              value={customDaysInput}
              onChange={(e) => setCustomDaysInput(e.target.value)}
              className="w-20 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 text-sm font-black text-center text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => handleSelectPlanDays(Number(customDaysInput) || 30)}
              className="px-4 py-2 btn-luxury-gold text-[#09090B] rounded-xl text-xs font-black cursor-pointer"
            >
              تخصيص (يوم)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_PLANS.map((preset) => {
            const isSelected = planState.targetDays === preset.days;
            return (
              <button
                key={preset.days}
                type="button"
                onClick={() => handleSelectPlanDays(preset.days)}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  isSelected
                    ? 'btn-luxury-gold text-[#09090B] border-[#F6E2A6]'
                    : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37] text-zinc-900 dark:text-[#F4EFE6]'
                }`}
              >
                <span className="text-sm font-black block">{preset.days} يوماً</span>
                <span className="text-xs font-bold block mt-0.5">{preset.title}</span>
                <span
                  className={`text-[11px] font-semibold block mt-0.5 ${
                    isSelected ? 'text-[#09090B]/80' : 'text-zinc-500 dark:text-[#B5AA92]'
                  }`}
                >
                  {preset.desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive Schedule: Day Grid + Active Day 5-Prayer Wird Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Days Selector Grid */}
        <section className="lg:col-span-5 bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-zinc-950 dark:text-[#F6E2A6]">
              أيام الخطة ({schedule.length} يوم)
            </h3>
            <button
              type="button"
              onClick={() =>
                setPlanState({
                  targetDays: planState.targetDays,
                  startedAt: new Date().toISOString(),
                  completedSlotKeys: [],
                })
              }
              className="text-[11px] font-bold text-zinc-500 hover:text-[#D4AF37] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ختمة جديدة</span>
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[420px] overflow-y-auto pr-1">
            {schedule.map((day) => {
              const dayDoneCount = day.prayers.filter((p) => p.completed).length;
              const isFullDay = dayDoneCount === 5;
              const isSelected = selectedDayNum === day.dayNumber;
              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => setSelectedDayNum(day.dayNumber)}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'btn-luxury-gold text-[#09090B] font-black'
                      : isFullDay
                      ? 'bg-emerald-50 dark:bg-emerald-950/35 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 text-zinc-800 dark:text-[#F4EFE6] hover:border-[#D4AF37]'
                  }`}
                >
                  <span className="text-xs block font-black">يوم {day.dayNumber}</span>
                  <span className="text-[10px] font-mono tabular-nums opacity-85 block">
                    {dayDoneCount}/5
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Active Day 5-Prayer Checklist */}
        {activeDay && (
          <section className="lg:col-span-7 bg-white dark:bg-[#19191F] border border-amber-200/80 dark:border-[#D4AF37]/35 rounded-3xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-[#D4AF37]/20">
              <div>
                <h3 className="text-lg font-black text-zinc-950 dark:text-[#F6E2A6]">
                  ورد اليوم {activeDay.dayNumber} — {activeDay.juzRangeLabel}
                </h3>
                <p className="text-xs font-bold text-zinc-500 dark:text-[#B5AA92] mt-0.5">
                  من صفحة {activeDay.startPage} إلى صفحة {activeDay.endPage} (المصحف الشريف)
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCompleteWholeDay(activeDay.dayNumber)}
                className="px-4 py-2 btn-luxury-gold text-[#09090B] rounded-xl text-xs font-black flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {activeDay.prayers.every((p) => p.completed)
                    ? 'إلغاء إتمام اليوم'
                    : 'تحديد ورد اليوم كاملاً (+20 XP)'}
                </span>
              </button>
            </div>

            <div className="space-y-3">
              {activeDay.prayers.map((wird) => (
                <button
                  key={wird.prayerKey}
                  type="button"
                  onClick={() => handleToggleSlot(activeDay.dayNumber, wird.prayerKey)}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all cursor-pointer text-right ${
                    wird.completed
                      ? 'bg-amber-50/70 dark:bg-[#101014] border-amber-300 dark:border-[#D4AF37]/60'
                      : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {wird.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-[#B58722] dark:text-[#F3DFA2] shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-zinc-400 dark:text-[#D4AF37]/40 shrink-0" />
                    )}
                    <div>
                      <span className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6] block">
                        الورد {wird.prayerLabel}
                      </span>
                      <span className="text-xs font-bold text-zinc-600 dark:text-[#B5AA92]">
                        من صفحة {wird.startPage} إلى صفحة {wird.endPage} ({wird.pagesCount} صفحة · الجزء {wird.juzStart})
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-black text-[#9A7218] dark:text-[#E8CE88] shrink-0 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    {wird.completed ? 'مكتمل ✓' : '+5 XP'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
