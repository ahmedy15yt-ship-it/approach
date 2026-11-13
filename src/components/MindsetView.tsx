import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  BookMarked,
  Smile,
  ShieldCheck,
  Check,
  Heart,
  Target,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MINDSET_STRATEGIES, DAILY_AFFIRMATIONS } from '../data/mindset';

interface MindsetViewProps {
  dailyWin?: string;
  onSaveDailyWin: (winText: string) => void;
}

export const MindsetView: React.FC<MindsetViewProps> = ({
  dailyWin = '',
  onSaveDailyWin,
}) => {
  const [winInput, setWinInput] = useState(dailyWin);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeStrategyIndex, setActiveStrategyIndex] = useState(0);

  // Future letter state
  const [futureLetter, setFutureLetter] = useState(
    () => localStorage.getItem('nahj_future_letter') || ''
  );
  const [savedLetterSuccess, setSavedLetterSuccess] = useState(false);

  const handleSaveWin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!winInput.trim()) return;
    onSaveDailyWin(winInput.trim());
    setSavedSuccess(true);
    confetti({ particleCount: 50, spread: 50 });
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveLetter = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('nahj_future_letter', futureLetter);
    setSavedLetterSuccess(true);
    setTimeout(() => setSavedLetterSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white dark:bg-[#121215] border border-red-200/70 dark:border-red-900/40 rounded-2xl p-5 shadow-xs transition-colors">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/60 text-[#DC2626] dark:text-red-300 rounded-full text-xs font-bold mb-1.5 border border-red-200 dark:border-red-900/50">
          <Brain className="w-3.5 h-3.5" />
          <span>علم النفس العصبي وإدارة التوتر لطالب الثانوية</span>
        </div>
        <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">
          الهدوء النفسي والثقة تصنع الفارق بين الأول والمتعثر
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          الامتحان معركة نفسية قبل أن يكون معركة حفظ. هنا أسلحتك لهزيمة القلق والتسويف والمقارنات الهدامة.
        </p>
      </div>

      {/* Daily Win Journal Box (دفتر الإنجاز اليومي) */}
      <div className="bg-gradient-to-r from-[#DC2626] via-[#991B1B] to-[#09090B] text-white rounded-3xl p-6 sm:p-7 shadow-md">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <BookMarked className="w-5 h-5 text-amber-300" />
            <h3 className="text-base font-extrabold">دفتر الإنجاز اليومي (Daily Win Journal)</h3>
          </div>
          <p className="text-xs text-white/80 leading-relaxed mb-4">
            مهما كان يومك صعباً، اكتب هنا حاجة واحدة نجحت فيها اليوم (حليت 10 مسائل، فهمت جزئية صعبة، صليت في وقتها، قاومت الموبايل). الدماغ يتعلم بالانتصارات الصغيرة!
          </p>

          <form onSubmit={handleSaveWin} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={winInput}
                onChange={(e) => setWinInput(e.target.value)}
                placeholder="اكتب إنجازك اليومي الصغير هنا..."
                className="w-full px-4 py-3 bg-black/30 backdrop-blur-md border border-white/25 rounded-xl text-xs text-white placeholder:text-white/55 focus:outline-none focus:border-amber-300 font-bold"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="py-2.5 px-5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>توثيق الإنجاز في سجلي اليومي</span>
              </button>
              {savedSuccess && (
                <span className="text-xs text-emerald-300 font-bold flex items-center gap-1 animate-in fade-in">
                  <span>تم التوثيق بنجاح يا بطل! 🌟</span>
                </span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Practical Anxiety & Mindset Strategies */}
      <div className="bg-white dark:bg-[#121215] border border-red-200/70 dark:border-red-900/40 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
        <div>
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
            استراتيجيات عملية مجربة للقلق والتوتر والتسويف
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            طبق هذه الأساليب الذهنية فور شعورك بالضغط أو الخوف من الامتحان
          </p>
        </div>

        {/* Strategy Selector Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MINDSET_STRATEGIES.map((st, i) => (
            <button
              key={st.id}
              onClick={() => setActiveStrategyIndex(i)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border cursor-pointer ${
                activeStrategyIndex === i
                  ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                  : 'bg-zinc-50 dark:bg-[#09090B] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-[#DC2626]/40'
              }`}
            >
              {st.title.split('(')[0]}
            </button>
          ))}
        </div>

        {/* Strategy Details Card */}
        {MINDSET_STRATEGIES[activeStrategyIndex] && (
          <div className="bg-zinc-50 dark:bg-[#09090B] border border-red-200/70 dark:border-red-900/40 rounded-2xl p-5 space-y-4">
            <div>
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/50 inline-block mb-1">
                المشكلة: {MINDSET_STRATEGIES[activeStrategyIndex].problemSolved}
              </span>
              <h4 className="font-black text-base text-zinc-900 dark:text-white">
                {MINDSET_STRATEGIES[activeStrategyIndex].title}
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                {MINDSET_STRATEGIES[activeStrategyIndex].shortDesc}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[#DC2626] dark:text-red-400 block">خطوات التنفيذ فوراً:</span>
              <ul className="space-y-2">
                {MINDSET_STRATEGIES[activeStrategyIndex].steps.map((step, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed bg-white dark:bg-[#121215] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#DC2626]/10 dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 font-bold flex items-center justify-center shrink-0 text-xs">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <blockquote className="border-r-4 border-[#C59B27] pr-3 italic text-xs text-amber-800 dark:text-amber-300 font-bold">
              {MINDSET_STRATEGIES[activeStrategyIndex].quote}
            </blockquote>
          </div>
        )}
      </div>

      {/* Letter to My Future Self on Result Day (رسالة لنفسي يوم النتيجة) */}
      <div className="bg-white dark:bg-[#121215] border border-red-200/70 dark:border-red-900/40 rounded-2xl p-5 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
            رسالة لنفسي التي ستُقرأ يوم ظهور النتيجة (صورة الهدف وكلية الأحلام)
          </h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          اكتب هنا الكلية التي تسعى إليها، لماذا تستحق أن تتعب الآن، ورسالة فخر توجهها لنفسك عندما يظهر مجموعك في الصيف القادم.
        </p>

        <form onSubmit={handleSaveLetter} className="space-y-3">
          <textarea
            rows={4}
            value={futureLetter}
            onChange={(e) => setFutureLetter(e.target.value)}
            placeholder="اكتب هنا: يا دكتور المستقبل... أنا بتعب النهاردة ومستحمل عشان اللحظة اللي هنفرح فيها أهلنا وندخل كلية..."
            className="w-full p-3.5 bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:border-[#DC2626] focus:outline-none font-medium leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="py-2 px-4 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>حفظ رسالة الهدف</span>
            </button>
            {savedLetterSuccess && (
              <span className="text-xs text-[#DC2626] dark:text-red-400 font-bold">
                تم حفظ رسالتك وستظل محفوظة لتتذكرها دائماً ✨
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
