import React, { useState } from 'react';
import {
  Layers,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  AlertCircle,
  FileDown,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Subject, BacklogItem } from '../types';

interface BacklogViewProps {
  curriculum: Subject[];
  backlogItems: BacklogItem[];
  onAddBacklogItem: (item: Omit<BacklogItem, 'id' | 'isCompleted'>) => void;
  onToggleBacklogItem: (id: string) => void;
  onRemoveBacklogItem: (id: string) => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  curriculum,
  backlogItems,
  onAddBacklogItem,
  onToggleBacklogItem,
  onRemoveBacklogItem,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState(curriculum[0].id);
  const [selectedLessonTitle, setSelectedLessonTitle] = useState('');
  const [customLessonInput, setCustomLessonInput] = useState('');
  const [planDurationDays, setPlanDurationDays] = useState(7); // 3, 7, 14, 30 days

  // Today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const currentSubject =
    curriculum.find((s) => s.id === selectedSubjectId) || curriculum[0];
  const subjectLessons = currentSubject.chapters.flatMap((c) => c.lessons);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const titleToUse = customLessonInput.trim() || selectedLessonTitle;
    if (!titleToUse) return;

    // Distribute among upcoming days
    const targetDate = new Date();
    // Round-robin or place into tomorrow / today
    const dayOffset = backlogItems.length % planDurationDays;
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const assignedDate = targetDate.toISOString().split('T')[0];

    onAddBacklogItem({
      subjectId: currentSubject.id,
      subjectName: currentSubject.name,
      lessonTitle: titleToUse,
      assignedDate,
    });

    setCustomLessonInput('');
    setSelectedLessonTitle('');
  };

  const handleAutoDistribute = (daysCount: number) => {
    setPlanDurationDays(daysCount);
    // Redistribute existing incomplete backlog items across the selected number of days
    const incomplete = backlogItems.filter((b) => !b.isCompleted);
    incomplete.forEach((item, index) => {
      const d = new Date();
      d.setDate(d.getDate() + (index % daysCount));
      item.assignedDate = d.toISOString().split('T')[0];
    });
  };

  const handleCompleteTodayLesson = (id: string) => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 },
    });
    onToggleBacklogItem(id);
  };

  // Filter today's backlog quota ("نصيب النهاردة")
  const todayBacklogQuota = backlogItems.filter(
    (b) => b.assignedDate === todayStr && !b.isCompleted
  );

  const completedCount = backlogItems.filter((b) => b.isCompleted).length;

  const handlePrintPlan = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white dark:bg-[#121215] border border-red-200/70 dark:border-red-900/40 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-bold mb-1.5 border border-rose-200 dark:border-rose-900/50">
            <Layers className="w-3.5 h-3.5" />
            <span>محرك تصفية المتراكم الذكي</span>
          </div>
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">
            لا تراكم بعد اليوم — خطة الإنقاذ وتوزيع الدروس
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            اختر الدروس المتأخرة والمدة المطلوبة، وسيقوم النظام بتوزيعها بالعدل لتعرف «نصيب النهاردة» بدقة
          </p>
        </div>

        <button
          onClick={handlePrintPlan}
          className="px-4 py-2.5 bg-zinc-50 dark:bg-[#09090B] hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-[#DC2626] dark:text-red-400 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 self-start md:self-center cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>تحميل / طباعة جدول المتراكم (PDF)</span>
        </button>
      </div>

      {/* Crucial Box: نصيب النهاردة (Today's Backlog Quota) */}
      <div className="bg-gradient-to-r from-[#DC2626] via-[#991B1B] to-[#09090B] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-zinc-950 flex items-center justify-center font-black">
              ★
            </div>
            <div>
              <h3 className="font-extrabold text-base">نصيب النهاردة من المتراكم</h3>
              <p className="text-xs text-white/80">
                دروس اليوم المحددة بالاسم — علّم على الدرس الذي تخلصه ليختفي فوراً!
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 bg-white/10 rounded-full font-bold">
            {todayBacklogQuota.length} دروس مطلوبة اليوم
          </span>
        </div>

        {todayBacklogQuota.length === 0 ? (
          <div className="bg-white/10 rounded-2xl p-6 text-center backdrop-blur-xs">
            <Check className="w-8 h-8 text-amber-300 mx-auto mb-2" />
            <p className="font-bold text-sm">عظيم يا بطل! أنهيت كل نصيب اليوم من المتراكم 🎉</p>
            <p className="text-xs text-white/70 mt-1">
              أنت متقدم وفق الخطة، يمكنك إضافة متراكم جديد من الأسفل أو أخذ قسط من الراحة.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayBacklogQuota.map((item) => (
              <div
                key={item.id}
                onClick={() => handleCompleteTodayLesson(item.id)}
                className="bg-white dark:bg-[#09090B] text-zinc-900 dark:text-white p-3.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-red-50/70 dark:hover:bg-red-950/40 transition-all shadow-xs border border-transparent dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <Circle className="w-5 h-5 text-zinc-400 hover:text-[#DC2626] dark:hover:text-red-400 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-[#DC2626] dark:text-red-400 block">
                      {item.subjectName}
                    </span>
                    <span className="text-xs font-black">{item.lessonTitle}</span>
                  </div>
                </div>

                <span className="text-xs px-3 py-1 bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-200 rounded-lg font-bold shrink-0">
                  تم الانتهاء منه ✓
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Backlog & Duration Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Form to Select Lessons */}
        <div className="md:col-span-2 bg-white dark:bg-[#121215] border border-red-200/70 dark:border-red-900/40 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#DC2626] dark:text-red-400" />
            <span>إضافة درس متراكم للخطة</span>
          </h3>

          <form onSubmit={handleAddSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1">المادة</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedLessonTitle('');
                  }}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-lg font-bold text-zinc-900 dark:text-white focus:border-[#DC2626] focus:outline-none"
                >
                  {curriculum.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1">
                  اختر من دروس المنهج
                </label>
                <select
                  value={selectedLessonTitle}
                  onChange={(e) => {
                    setSelectedLessonTitle(e.target.value);
                    setCustomLessonInput('');
                  }}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:border-[#DC2626] focus:outline-none"
                >
                  <option value="">-- اضغط لاختيار درس من منهج {currentSubject.name} --</option>
                  {subjectLessons.map((l) => (
                    <option key={l.id} value={l.title}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1">
                أو اكتب موضوعاً مخصصاً / مذكرة متأخرة
              </label>
              <input
                type="text"
                value={customLessonInput}
                onChange={(e) => {
                  setCustomLessonInput(e.target.value);
                  setSelectedLessonTitle('');
                }}
                placeholder="مثال: مذكرة التكاثر في الإنسان - مستر محمد - 30 صفحة"
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:border-[#DC2626] dark:focus:border-red-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إدراج في جدول المتراكم</span>
            </button>
          </form>
        </div>

        {/* Duration Strategy Controls */}
        <div className="bg-zinc-50 dark:bg-[#121215] border border-red-200/70 dark:border-red-900/40 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">توزيع المتراكم على مدة زمنية</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            في كم يوم تريد تصفية كل هذه الدروس بدون ضغط؟
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[3, 7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => handleAutoDistribute(days)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  planDurationDays === days
                    ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                    : 'bg-white dark:bg-[#09090B] text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-[#DC2626] dark:hover:border-red-400'
                }`}
              >
                {days === 3
                  ? '3 أيام (طوارئ)'
                  : days === 7
                  ? '7 أيام (أسبوع)'
                  : days === 14
                  ? '14 يوم (أسبوعين)'
                  : '30 يوم (شهر كامل)'}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-bold text-zinc-900 dark:text-white block mb-1">إحصائية سريعة:</span>
            <span>إجمالي المتراكم: {backlogItems.length} درس</span>
            <br />
            <span>تم إنجازه: {completedCount} درس بنجاح ✓</span>
          </div>
        </div>
      </div>

      {/* Printable All Backlog Items Table */}
      <div className="bg-white dark:bg-[#121215] rounded-2xl border border-red-200/70 dark:border-red-900/40 shadow-xs overflow-hidden printable-area transition-colors">
        <div className="p-4 bg-zinc-50 dark:bg-[#09090B] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="font-extrabold text-sm text-[#DC2626] dark:text-red-400">
            جدول خطة تصفية المتراكم الشامل
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            موزع على {planDurationDays} يوماً
          </span>
        </div>

        {backlogItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            لا يوجد دروس متراكمة حالياً! جدولك ناصع ومنتظم 🌟
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {backlogItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-[#09090B]/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggleBacklogItem(item.id)}
                    className="shrink-0 cursor-pointer"
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#DC2626] dark:text-red-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-400 hover:text-[#DC2626] dark:hover:text-red-400" />
                    )}
                  </button>
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block">
                      {item.subjectName} • تاريخ الاستحقاق: {item.assignedDate}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        item.isCompleted ? 'line-through text-zinc-400 dark:text-zinc-600' : 'text-zinc-900 dark:text-white'
                      }`}
                    >
                      {item.lessonTitle}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveBacklogItem(item.id)}
                  className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                  title="حذف من الخطة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
