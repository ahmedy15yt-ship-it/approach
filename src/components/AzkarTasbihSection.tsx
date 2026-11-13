import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  Bed,
  Check,
  RotateCcw,
  BookOpen,
  Volume2,
  VolumeX,
  Copy,
  CheckCircle2,
  Trophy,
  Flame,
  Award,
  HeartHandshake,
} from 'lucide-react';
import { DHIKR_ITEMS, TASBIH_PRESETS, DhikrItem, TasbihPreset } from '../data/azkar';

interface AzkarTasbihSectionProps {
  onAwardXp?: (amount: number) => void;
}

export const AzkarTasbihSection: React.FC<AzkarTasbihSectionProps> = ({ onAwardXp }) => {
  const [activeCategory, setActiveCategory] = useState<
    'morning' | 'evening' | 'sleep' | 'prayer' | 'study' | 'tasbih'
  >('morning');

  // Track counts per dhikr item (starts at item.count and decrements to 0)
  const [dhikrProgress, setDhikrProgress] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('nahj_dhikr_progress');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    const initial: Record<string, number> = {};
    DHIKR_ITEMS.forEach((d) => {
      initial[d.id] = d.count;
    });
    return initial;
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Digital Tasbih state
  const [selectedPreset, setSelectedPreset] = useState<TasbihPreset>(TASBIH_PRESETS[0]);
  const [tasbihCount, setTasbihCount] = useState<number>(() => {
    const saved = localStorage.getItem('nahj_tasbih_current_count');
    return saved ? Number(saved) : 0;
  });
  const [lifetimeTasbih, setLifetimeTasbih] = useState<number>(() => {
    const saved = localStorage.getItem('nahj_tasbih_lifetime');
    return saved ? Number(saved) : 0;
  });
  const [tasbihSound, setTasbihSound] = useState<boolean>(() => {
    return localStorage.getItem('nahj_tasbih_sound') !== 'false';
  });
  const [justCompletedTarget, setJustCompletedTarget] = useState<boolean>(false);

  // Save dhikr progress
  useEffect(() => {
    localStorage.setItem('nahj_dhikr_progress', JSON.stringify(dhikrProgress));
  }, [dhikrProgress]);

  // Save tasbih
  useEffect(() => {
    localStorage.setItem('nahj_tasbih_current_count', String(tasbihCount));
  }, [tasbihCount]);

  useEffect(() => {
    localStorage.setItem('nahj_tasbih_lifetime', String(lifetimeTasbih));
  }, [lifetimeTasbih]);

  useEffect(() => {
    localStorage.setItem('nahj_tasbih_sound', String(tasbihSound));
  }, [tasbihSound]);

  // Subtle audio click chime for Tasbih / Dhikr
  const playClickTick = () => {
    if (!tasbihSound) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      // ignore
    }
  };

  // Celebration chime when target reached
  const playTargetChime = () => {
    if (!tasbihSound) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });
    } catch (e) {
      // ignore
    }
  };

  // Handle single Dhikr click count down
  const handleDhikrClick = (id: string, initialCount: number) => {
    const current = dhikrProgress[id] ?? initialCount;
    if (current <= 0) return;

    playClickTick();
    const next = current - 1;
    setDhikrProgress((prev) => ({ ...prev, [id]: next }));

    if (next === 0) {
      // Completed this dhikr item
      if (onAwardXp) onAwardXp(10);
      playTargetChime();
    }
  };

  // Reset single Dhikr item
  const handleResetDhikr = (id: string, initialCount: number) => {
    setDhikrProgress((prev) => ({ ...prev, [id]: initialCount }));
  };

  // Reset all Dhikr items in current category
  const handleResetCategory = () => {
    const items = DHIKR_ITEMS.filter((d) => d.category === activeCategory);
    setDhikrProgress((prev) => {
      const copy = { ...prev };
      items.forEach((item) => {
        copy[item.id] = item.count;
      });
      return copy;
    });
  };

  // Copy Dhikr text
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Tasbih click
  const handleTasbihIncrement = () => {
    playClickTick();
    const nextCount = tasbihCount + 1;
    setTasbihCount(nextCount);
    setLifetimeTasbih((prev) => prev + 1);

    if (nextCount === selectedPreset.target) {
      setJustCompletedTarget(true);
      playTargetChime();
      if (onAwardXp) onAwardXp(25);
      setTimeout(() => setJustCompletedTarget(false), 4500);
    }
  };

  const handleResetTasbih = () => {
    setTasbihCount(0);
    setJustCompletedTarget(false);
  };

  // Category counts and progress calculations
  const currentCategoryItems = DHIKR_ITEMS.filter((d) => d.category === activeCategory);
  const completedCategoryCount = currentCategoryItems.filter(
    (d) => (dhikrProgress[d.id] ?? d.count) === 0
  ).length;
  const categoryPercentage =
    currentCategoryItems.length > 0
      ? Math.round((completedCategoryCount / currentCategoryItems.length) * 100)
      : 0;

  const CATEGORIES = [
    { id: 'morning', label: 'أذكار الصباح', icon: Sun, color: 'text-amber-500' },
    { id: 'evening', label: 'أذكار المساء', icon: Moon, color: 'text-red-500' },
    { id: 'sleep', label: 'أذكار النوم والاستيقاظ', icon: Bed, color: 'text-zinc-400' },
    { id: 'prayer', label: 'أذكار بعد الصلاة', icon: HeartHandshake, color: 'text-emerald-500' },
    { id: 'study', label: 'أذكار المذاكرة والتفوق', icon: BookOpen, color: 'text-amber-600' },
    { id: 'tasbih', label: 'المسبحة الإلكترونية', icon: Sparkles, color: 'text-red-500', isSpecial: true },
  ];

  return (
    <div className="bg-white dark:bg-[#121215] border border-red-200/70 dark:border-red-900/40 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 transition-colors duration-200 font-['Cairo',sans-serif]">
      {/* 1) Top Header & Section Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">📿</span>
            <h2 className="font-extrabold text-lg sm:text-xl text-zinc-900 dark:text-white">
              حصن المسلم وأذكار المذاكرة والتسبيح
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-black border border-amber-200 dark:border-amber-900/40">
              أجر مضاعف وسكينة 🌟
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            أذكار الصباح والمساء، أدعية تيسير الفهم وتثبيت الحفظ في الامتحانات، والمسبحة الرقمية الذكية
          </p>
        </div>

        {/* Global Sound and Reset Header Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setTasbihSound(!tasbihSound)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              tasbihSound
                ? 'bg-red-50 dark:bg-red-950/50 text-[#DC2626] dark:text-red-300 border-red-200 dark:border-red-800'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700'
            }`}
            title="تفعيل أو كتم نقرات التسبيح الصوتية"
          >
            {tasbihSound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{tasbihSound ? 'صوت التسبيح مفعل' : 'صوت صامت'}</span>
          </button>

          {activeCategory !== 'tasbih' && (
            <button
              onClick={handleResetCategory}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/70 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-500 dark:text-zinc-300 hover:text-rose-600 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              title="إعادة ضبط عداد أذكار هذا القسم"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط القسم</span>
            </button>
          )}
        </div>
      </div>

      {/* 2) Categories Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[#DC2626] text-white shadow-md ring-2 ring-[#DC2626]/20'
                  : 'bg-zinc-50 dark:bg-[#09090B] hover:bg-red-50/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : cat.color}`} />
              <span>{cat.label}</span>
              {cat.isSpecial && (
                <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-zinc-950 text-[10px] font-black">
                  📿 مسبحة
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3) Main View: Either Digital Tasbih or Dhikr Cards */}
      {activeCategory === 'tasbih' ? (
        /* =================== DIGITAL TASBIH COMPONENT =================== */
        <div className="space-y-6">
          {/* Preset Selector Chips */}
          <div className="space-y-2">
            <span className="text-xs font-black text-zinc-600 dark:text-zinc-400 block">
              اختر الذكر للتسبيح:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {TASBIH_PRESETS.map((preset) => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset);
                      setTasbihCount(0);
                      setJustCompletedTarget(false);
                    }}
                    className={`p-3 rounded-2xl text-right transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-red-50 dark:bg-red-950/50 border-[#DC2626] dark:border-red-500 shadow-xs ring-1 ring-[#DC2626]'
                        : 'bg-zinc-50 dark:bg-[#09090B] border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        الهدف: {preset.target}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#DC2626] dark:text-red-400" />}
                    </div>
                    <p className="font-extrabold text-xs text-zinc-900 dark:text-white line-clamp-1">
                      {preset.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Big Interactive Tasbih Counter Circle */}
          <div className="bg-radial from-red-50/50 via-white to-white dark:from-red-950/20 dark:via-[#121215] dark:to-[#121215] border-2 border-[#DC2626]/20 dark:border-red-900/40 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Target Completion Banner */}
            {justCompletedTarget && (
              <div className="absolute top-4 inset-x-4 sm:inset-x-12 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 animate-bounce">
                <Trophy className="w-5 h-5 text-amber-300" />
                <span className="text-xs sm:text-sm font-black">
                  ما شاء الله! أتممت تسبيح {selectedPreset.target} بنجاح وتقبل الله طاعتك 🌟 (+25 نقطة إنجاز)
                </span>
              </div>
            )}

            {/* Selected Dhikr Title & Virtue */}
            <div className="max-w-md mx-auto mb-6">
              <h3 className="font-extrabold text-xl sm:text-2xl text-[#DC2626] dark:text-red-400 leading-snug">
                {selectedPreset.text}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                {selectedPreset.virtue}
              </p>
            </div>

            {/* Giant Circular Touch-Friendly Button */}
            <div className="relative my-2">
              <button
                onClick={handleTasbihIncrement}
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-b from-[#DC2626] via-[#991B1B] to-[#09090B] hover:from-[#EF4444] hover:to-[#7F1D1D] active:scale-95 text-white shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-transform duration-100 ring-8 ring-[#DC2626]/20 select-none"
              >
                <span className="text-4xl sm:text-5xl font-black font-mono tracking-wider drop-shadow-sm">
                  {tasbihCount}
                </span>
                <span className="text-[11px] font-bold text-amber-300 mt-1 opacity-90">
                  من {selectedPreset.target}
                </span>
                <span className="text-[10px] text-white/75 mt-2 px-3 py-0.5 rounded-full bg-white/10">
                  اضغط للتسبيح 👆
                </span>
              </button>

              {/* Progress Ring Marker */}
              <div className="absolute -bottom-3 inset-x-0 flex justify-center">
                <span className="px-3 py-1 rounded-full bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 shadow-xs text-[11px] font-mono font-bold text-[#DC2626] dark:text-red-400">
                  {Math.min(100, Math.round((tasbihCount / selectedPreset.target) * 100))}% من الهدف
                </span>
              </div>
            </div>

            {/* Bottom Actions: Reset, Lifetime Counter */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 w-full max-w-lg">
              <button
                onClick={handleResetTasbih}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تصفير العداد الحالي</span>
              </button>

              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>إجمالي تسبيحاتك على نَهج:</span>
                <span className="font-mono font-black text-sm">{lifetimeTasbih.toLocaleString('ar-EG')}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =================== DHIKR CARDS VIEW =================== */
        <div className="space-y-5">
          {/* Progress Header Banner */}
          <div className="bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#DC2626] dark:text-red-300 flex items-center justify-center font-bold text-sm">
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-zinc-900 dark:text-white block">
                  تقدم أذكار {CATEGORIES.find((c) => c.id === activeCategory)?.label}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold">
                  أنجزت {completedCategoryCount} من {currentCategoryItems.length} أذكار
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3 w-full sm:w-56">
              <div className="grow h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#DC2626] to-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${categoryPercentage}%` }}
                />
              </div>
              <span className="text-xs font-mono font-black text-[#DC2626] dark:text-red-400 shrink-0">
                {categoryPercentage}%
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="space-y-3.5">
            {currentCategoryItems.map((item, index) => {
              const currentRemaining = dhikrProgress[item.id] ?? item.count;
              const isDone = currentRemaining === 0;

              return (
                <div
                  key={item.id}
                  className={`border-2 rounded-2xl p-4 sm:p-5 transition-all relative ${
                    isDone
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                      : 'bg-white dark:bg-[#09090B]/70 border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950/60 text-[#DC2626] dark:text-red-300 font-mono font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      {item.reference && (
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">
                          • {item.reference}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyText(item.id, item.text)}
                        className="p-1.5 text-zinc-400 hover:text-[#DC2626] dark:hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                        title="نسخ الذكر"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-[#DC2626] dark:text-red-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isDone && (
                        <button
                          onClick={() => handleResetDhikr(item.id, item.count)}
                          className="p-1.5 text-zinc-400 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                          title="إعادة قراءة الذكر"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dhikr Body Text */}
                  <p className="text-sm sm:text-base text-zinc-900 dark:text-white font-medium leading-relaxed my-2 select-text">
                    {item.text}
                  </p>

                  {/* Virtue Note */}
                  {item.virtue && (
                    <div className="mt-2.5 p-2 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-amber-900 dark:text-amber-300 leading-normal font-bold">
                        {item.virtue}
                      </span>
                    </div>
                  )}

                  {/* Interactive Decrement Counter Action Button */}
                  <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                      التكرار المطلوب: <strong className="text-zinc-900 dark:text-white">{item.count} مرات</strong>
                    </span>

                    <button
                      onClick={() => handleDhikrClick(item.id, item.count)}
                      disabled={isDone}
                      className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                        isDone
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 text-white'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>تم الذكر بنجاح ✨</span>
                        </>
                      ) : (
                        <>
                          <span>اضغط عند القراءة</span>
                          <span className="px-2 py-0.5 rounded-lg bg-white/20 font-mono text-xs font-extrabold">
                            {currentRemaining}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
