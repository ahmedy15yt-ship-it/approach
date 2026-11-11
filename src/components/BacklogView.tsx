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
      <div className="bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold mb-1.5 border border-rose-200">
            <Layers className="w-3.5 h-3.5" />
            <span>محرك تصفية المتراكم الذكي</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#1E2922]">
            لا تراكم بعد اليوم — خطة الإنقاذ وتوزيع الدروس
          </h2>
          <p className="text-xs text-[#6F7D72]">
            اختر الدروس المتأخرة والمدة المطلوبة، وسيقوم النظام بتوزيعها بالعدل لتعرف «نصيب النهاردة» بدقة
          </p>
        </div>

        <button
          onClick={handlePrintPlan}
          className="px-4 py-2.5 bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#2D5A43]/30 text-[#2D5A43] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 self-start md:self-center"
        >
          <Printer className="w-4 h-4" />
          <span>تحميل / طباعة جدول المتراكم (PDF)</span>
        </button>
      </div>

      {/* Crucial Box: نصيب النهاردة (Today's Backlog Quota) */}
      <div className="bg-gradient-to-r from-[#2D5A43] to-[#1F3D2E] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#1E2922] flex items-center justify-center font-black">
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
            <Check className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
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
                className="bg-white text-[#1E2922] p-3.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-emerald-50 transition-all shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <Circle className="w-5 h-5 text-gray-400 hover:text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-[#2D5A43] block">
                      {item.subjectName}
                    </span>
                    <span className="text-xs font-black">{item.lessonTitle}</span>
                  </div>
                </div>

                <span className="text-xs px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold shrink-0">
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
        <div className="md:col-span-2 bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-[#1E2922] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#2D5A43]" />
            <span>إضافة درس متراكم للخطة</span>
          </h3>

          <form onSubmit={handleAddSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#4B594E] mb-1">المادة</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedLessonTitle('');
                  }}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#D5CFC3] rounded-lg font-bold text-[#1E2922]"
                >
                  {curriculum.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4B594E] mb-1">
                  اختر من دروس المنهج
                </label>
                <select
                  value={selectedLessonTitle}
                  onChange={(e) => {
                    setSelectedLessonTitle(e.target.value);
                    setCustomLessonInput('');
                  }}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#D5CFC3] rounded-lg text-[#1E2922]"
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
              <label className="block text-[11px] font-bold text-[#4B594E] mb-1">
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
                className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#D5CFC3] rounded-lg focus:border-[#2D5A43] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#2D5A43] hover:bg-[#234734] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إدراج في جدول المتراكم</span>
            </button>
          </form>
        </div>

        {/* Duration Strategy Controls */}
        <div className="bg-[#FAF9F5] border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-[#1E2922]">توزيع المتراكم على مدة زمنية</h3>
          <p className="text-xs text-[#6F7D72]">
            في كم يوم تريد تصفية كل هذه الدروس بدون ضغط؟
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[3, 7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => handleAutoDistribute(days)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                  planDurationDays === days
                    ? 'bg-[#2D5A43] text-white border-[#2D5A43] shadow-xs'
                    : 'bg-white text-[#4B594E] border-[#D5CFC3] hover:border-[#2D5A43]'
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

          <div className="pt-2 border-t border-[#EAE6DF] text-xs text-[#5D6B60]">
            <span className="font-bold text-[#1E2922] block mb-1">إحصائية سريعة:</span>
            <span>إجمالي المتراكم: {backlogItems.length} درس</span>
            <br />
            <span>تم إنجازه: {completedCount} درس بنجاح ✓</span>
          </div>
        </div>
      </div>

      {/* Printable All Backlog Items Table */}
      <div className="bg-white rounded-2xl border border-[#2D5A43]/15 shadow-xs overflow-hidden printable-area">
        <div className="p-4 bg-[#F8F6F0] border-b border-[#EAE6DF] flex items-center justify-between">
          <span className="font-extrabold text-sm text-[#2D5A43]">
            جدول خطة تصفية المتراكم الشامل
          </span>
          <span className="text-xs text-[#6F7D72]">
            موزع على {planDurationDays} يوماً
          </span>
        </div>

        {backlogItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#7A8A7E]">
            لا يوجد دروس متراكمة حالياً! جدولك ناصع ومنتظم 🌟
          </div>
        ) : (
          <div className="divide-y divide-[#F0EDE6]">
            {backlogItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-[#FAF9F5] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggleBacklogItem(item.id)}
                    className="shrink-0"
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 hover:text-[#2D5A43]" />
                    )}
                  </button>
                  <div>
                    <span className="text-[10px] font-bold text-[#8C7A52] block">
                      {item.subjectName} • تاريخ الاستحقاق: {item.assignedDate}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        item.isCompleted ? 'line-through text-gray-400' : 'text-[#1E2922]'
                      }`}
                    >
                      {item.lessonTitle}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveBacklogItem(item.id)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
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
