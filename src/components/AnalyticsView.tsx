import React from 'react';
import {
  TrendingUp,
  Clock,
  PieChart,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
} from 'lucide-react';
import { Subject } from '../types';

interface AnalyticsViewProps {
  curriculum: Subject[];
  weeklyHours: Record<string, number>;
  streakDays: number;
  totalXp: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  curriculum,
  weeklyHours,
  streakDays,
  totalXp,
}) => {
  // Weekly study minutes simulated/recorded data
  const weekDays = [
    { day: 'السبت', minutes: 310, date: '11/04' },
    { day: 'الأحد', minutes: 280, date: '11/05' },
    { day: 'الاثنين', minutes: 340, date: '11/06' },
    { day: 'الثلاثاء', minutes: 260, date: '11/07' },
    { day: 'الأربعاء', minutes: 320, date: '11/08' },
    { day: 'الخميس', minutes: 390, date: '11/09' },
    { day: 'الجمعة', minutes: 220, date: '11/10' },
  ];

  const totalMinutes = weekDays.reduce((acc, curr) => acc + curr.minutes, 0);
  const totalHoursWeek = (totalMinutes / 60).toFixed(1);
  const maxMinutesDay = Math.max(...weekDays.map((d) => d.minutes));

  // Honest evaluation calculation
  const isProgressingWell = Number(totalHoursWeek) >= 30;

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-2xl p-5 shadow-xs transition-colors">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-[#09090C] text-[#9A7218] dark:text-[#E8CE88] rounded-full text-xs font-bold mb-1.5 border border-amber-200 dark:border-[#D4AF37]/35">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>المتابعة الأسبوعية والشهرية الدقيقة</span>
        </div>
        <h2 className="text-xl font-extrabold text-zinc-900 dark:text-[#F6E2A6]">
          المرآة الحقيقية: هل أنا بتحسن ولا بلف في مكاني؟
        </h2>
        <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
          الأرقام لا تجامل: تفاصيل دقائق المذاكرة، توزيع الساعات على المواد، ومعدل الاتزان الحياتي
        </p>
      </div>

      {/* Honest Assessment Box */}
      <div
        className={`rounded-3xl p-6 border shadow-sm transition-colors ${
          isProgressingWell
            ? 'bg-emerald-50/70 dark:bg-[#19191F] border-emerald-200 dark:border-[#D4AF37]/40 text-emerald-950 dark:text-[#F4EFE6]'
            : 'bg-amber-50/70 dark:bg-[#19191F] border-amber-200 dark:border-[#D4AF37]/45 text-amber-950 dark:text-[#F4EFE6]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isProgressingWell
                ? 'btn-luxury-gold shadow-sm'
                : 'bg-amber-600 text-white'
            }`}
          >
            {isProgressingWell ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-black text-base mb-1 dark:text-[#F6E2A6]">
              {isProgressingWell
                ? 'تقييم الأسبوع: أنت تتقدم بخطوات واثقة وممتازة! 🚀'
                : 'تقييم الأسبوع: في مكانك مع بعض التشتت، محتاجين نرفع التركيز! ⚡'}
            </h3>
            <p className="text-xs leading-relaxed opacity-90 max-w-2xl font-medium dark:text-[#B5AA92]">
              سجلت هذا الأسبوع <strong className="dark:text-[#F3DFA2]">{totalHoursWeek} ساعة استذكار فعالة</strong> عبر جلسات مركزة.
              {isProgressingWell
                ? ' استمرارك على هذا المعدل يضمن إنهاء المنهج وحل 3 نماذج شاملة قبل شهر المراجعة النهائية بأريحية تامة.'
                : ' حاول تقليل فترات استخدام الهاتف بين الجلسات، واستغل أوقات البكور بعد صلاة الفجر لتعويض الساعات المتبقية.'}
            </p>
          </div>
        </div>
      </div>

      {/* Bar Chart: Daily Study Minutes this Week */}
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#D4AF37]/20 flex-wrap gap-2">
          <div>
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-[#F6E2A6]">
              دقائق المذاكرة اليومية خلال الأسبوع الحالي
            </h3>
            <span className="text-xs text-zinc-500 dark:text-[#B5AA92]">
              إجمالي الأسبوع: {totalHoursWeek} ساعة ({totalMinutes} دقيقة)
            </span>
          </div>
          <span className="text-xs font-mono font-bold tabular-nums text-[#9A7218] dark:text-[#E8CE88] bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/30 px-3 py-1 rounded-full">
            متوسط يومي: {(totalMinutes / 7 / 60).toFixed(1)} س/يوم
          </span>
        </div>

        {/* Visual Columns Chart */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 h-56 pt-8 pb-2 items-end">
          {weekDays.map((d, i) => {
            const heightPercent = Math.round((d.minutes / maxMinutesDay) * 100);
            return (
              <div key={i} className="flex flex-col items-center h-full justify-end group">
                <span className="text-[10px] font-mono font-bold tabular-nums text-zinc-700 dark:text-[#E8CE88] mb-1 opacity-80 group-hover:opacity-100">
                  {Math.round(d.minutes / 60)}س
                </span>
                <div className="w-full bg-zinc-200 dark:bg-[#09090C] border border-transparent dark:border-[#D4AF37]/20 rounded-xl overflow-hidden h-full max-h-[140px] flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-[#B58722] via-[#DFBC5B] to-[#F6E2A6] group-hover:brightness-110 rounded-xl transition-all duration-500 shadow-2xs"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-[#F4EFE6] mt-2 block">{d.day}</span>
                <span className="text-[9px] text-zinc-500 dark:text-[#B5AA92] font-mono tabular-nums">{d.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject Hours Allocation & Progress Breakdown */}
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
        <h3 className="font-extrabold text-sm text-zinc-900 dark:text-[#F6E2A6]">
          توزيع وقت المذاكرة على المواد العلمية (نسبة التركيز)
        </h3>

        <div className="space-y-3">
          {curriculum.map((subj) => {
            const target = weeklyHours[subj.id] ?? subj.weeklyTargetHours;
            // Simulated actual logged hours
            const actual = Math.min(target, Math.round(target * 0.85));
            const pct = Math.round((actual / target) * 100);

            return (
              <div key={subj.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-zinc-900 dark:text-[#F4EFE6] flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: subj.color }}
                    />
                    <span>{subj.name}</span>
                  </span>
                  <span className="text-zinc-500 dark:text-[#B5AA92] font-mono tabular-nums">
                    {actual} من {target} ساعات أسبوعياً ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-200 dark:bg-[#09090C] rounded-full overflow-hidden border border-transparent dark:border-[#D4AF37]/15">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: subj.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
