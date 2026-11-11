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
      <div className="bg-white border border-[#1E40AF]/15 rounded-2xl p-5 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1E40AF]/10 text-[#1E40AF] rounded-full text-xs font-bold mb-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>المتابعة الأسبوعية والشهرية الدقيقة</span>
        </div>
        <h2 className="text-xl font-extrabold text-[#0F172A]">
          المرآة الحقيقية: هل أنا بتحسن ولا بلف في مكاني؟
        </h2>
        <p className="text-xs text-[#64748B]">
          الأرقام لا تجامل: تفاصيل دقائق المذاكرة، توزيع الساعات على المواد، ومعدل الاتزان الحياتي
        </p>
      </div>

      {/* Honest Assessment Box */}
      <div
        className={`rounded-3xl p-6 border shadow-sm ${
          isProgressingWell
            ? 'bg-blue-50/80 border-blue-200 text-blue-950'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isProgressingWell
                ? 'bg-[#1E40AF] text-white'
                : 'bg-amber-600 text-white'
            }`}
          >
            {isProgressingWell ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-black text-base mb-1">
              {isProgressingWell
                ? 'تقييم الأسبوع: أنت تتقدم بخطوات واثقة وممتازة! 🚀'
                : 'تقييم الأسبوع: في مكانك مع بعض التشتت، محتاجين نرفع التركيز! ⚡'}
            </h3>
            <p className="text-xs leading-relaxed opacity-90 max-w-2xl font-medium">
              سجلت هذا الأسبوع <strong>{totalHoursWeek} ساعة استذكار فعالة</strong> عبر جلسات مركزة.
              {isProgressingWell
                ? ' استمرارك على هذا المعدل يضمن إنهاء المنهج وحل 3 نماذج شاملة قبل شهر المراجعة النهائية بأريحية تامة.'
                : ' حاول تقليل فترات استخدام الهاتف بين الجلسات، واستغل أوقات البكور بعد صلاة الفجر لتعويض الساعات المتبقية.'}
            </p>
          </div>
        </div>
      </div>

      {/* Bar Chart: Daily Study Minutes this Week */}
      <div className="bg-white border border-[#1E40AF]/15 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div>
            <h3 className="font-extrabold text-sm text-[#0F172A]">
              دقائق المذاكرة اليومية خلال الأسبوع الحالي
            </h3>
            <span className="text-xs text-[#64748B]">
              إجمالي الأسبوع: {totalHoursWeek} ساعة ({totalMinutes} دقيقة)
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-[#1E40AF] bg-[#1E40AF]/10 px-3 py-1 rounded-full">
            متوسط يومي: {(totalMinutes / 7 / 60).toFixed(1)} س/يوم
          </span>
        </div>

        {/* Visual Columns Chart */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 h-56 pt-8 pb-2 items-end">
          {weekDays.map((d, i) => {
            const heightPercent = Math.round((d.minutes / maxMinutesDay) * 100);
            return (
              <div key={i} className="flex flex-col items-center h-full justify-end group">
                <span className="text-[10px] font-mono font-bold text-[#334155] mb-1 opacity-80 group-hover:opacity-100">
                  {Math.round(d.minutes / 60)}س
                </span>
                <div className="w-full bg-[#E2E8F0] rounded-xl overflow-hidden h-full max-h-[140px] flex items-end">
                  <div
                    className="w-full bg-[#1E40AF] group-hover:bg-[#C59B27] rounded-xl transition-all duration-500 shadow-2xs"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-[#0F172A] mt-2 block">{d.day}</span>
                <span className="text-[9px] text-[#8A988D] font-mono">{d.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject Hours Allocation & Progress Breakdown */}
      <div className="bg-white border border-[#1E40AF]/15 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-sm text-[#0F172A]">
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
                  <span className="text-[#0F172A] flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: subj.color }}
                    />
                    <span>{subj.name}</span>
                  </span>
                  <span className="text-[#64748B] font-mono">
                    {actual} من {target} ساعات أسبوعياً ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
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
