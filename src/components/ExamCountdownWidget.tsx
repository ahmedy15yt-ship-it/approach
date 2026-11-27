import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Clock } from 'lucide-react';
import { ExamDateItem } from '../types';

function getUpcomingDefaultJuneDate(month: number, day: number): string {
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  if (candidate.getTime() < now.getTime() - 86400_000 * 7) {
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDefaultExamSchedule(): ExamDateItem[] {
  return [
    { id: 'ex-ar', subjectName: 'اللغة العربية', examDate: getUpcomingDefaultJuneDate(6, 21), notes: 'ورقة أولى' },
    { id: 'ex-fr', subjectName: 'اللغة الأجنبية الثانية', examDate: getUpcomingDefaultJuneDate(6, 24) },
    { id: 'ex-en', subjectName: 'اللغة الإنجليزية', examDate: getUpcomingDefaultJuneDate(6, 28) },
    { id: 'ex-phy', subjectName: 'الفيزياء', examDate: getUpcomingDefaultJuneDate(7, 2) },
    { id: 'ex-chem', subjectName: 'الكيمياء', examDate: getUpcomingDefaultJuneDate(7, 6) },
    { id: 'ex-bio', subjectName: 'الأحياء / الجيولوجيا', examDate: getUpcomingDefaultJuneDate(7, 10) },
  ];
}

function computeDaysRemaining(dateStr: string): number | null {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parsed.getTime() - todayStart.getTime()) / 86400_000);
}

interface ExamCountdownWidgetProps {
  accountPhone?: string;
}

export const ExamCountdownWidget: React.FC<ExamCountdownWidgetProps> = ({ accountPhone }) => {
  const storageKey = `nahj_exam_schedule_${accountPhone || 'default'}`;
  const mainTargetKey = `nahj_exam_main_date_${accountPhone || 'default'}`;

  const [mainExamDate, setMainExamDate] = useState<string>(() => {
    return localStorage.getItem(mainTargetKey) || getUpcomingDefaultJuneDate(6, 21);
  });

  const [exams, setExams] = useState<ExamDateItem[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // use defaults
    }
    return getDefaultExamSchedule();
  });

  const [newSubject, setNewSubject] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(getUpcomingDefaultJuneDate(7, 14));
  const [newNote, setNewNote] = useState<string>('');

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(exams));
  }, [exams, storageKey]);

  useEffect(() => {
    localStorage.setItem(mainTargetKey, mainExamDate);
  }, [mainExamDate, mainTargetKey]);

  const mainDaysLeft = computeDaysRemaining(mainExamDate);

  const handleUpdateDate = (id: string, examDate: string) => {
    setExams((prev) => prev.map((e) => (e.id === id ? { ...e, examDate } : e)));
  };

  const handleDeleteExam = (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDate) return;
    setExams((prev) => [
      ...prev,
      {
        id: `ex-${Date.now()}`,
        subjectName: newSubject.trim(),
        examDate: newDate,
        notes: newNote.trim() || undefined,
      },
    ]);
    setNewSubject('');
    setNewNote('');
  };

  const sortedExams = exams.slice().sort((a, b) => a.examDate.localeCompare(b.examDate));

  return (
    <div className="bg-white dark:bg-[#19191F] border-2 border-amber-200/80 dark:border-[#D4AF37]/35 rounded-2xl p-4 sm:p-5 space-y-4 transition-colors duration-200">
      {/* Top Countdown Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-[#D4AF37]/20">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#09090C] border border-[#D4AF37]/45 text-[#F3DFA2] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-zinc-950 dark:text-[#F3DFA2]">
              جدول مواعيد الامتحانات والعد التنازلي
            </h3>
            <p className="text-xs text-zinc-600 dark:text-[#B5AA92]">
              حدّد موعد امتحانك ليحسب لك الأيام المتبقية بدقة كل يوم.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-zinc-600 dark:text-[#B5AA92] flex items-center gap-2">
            <span>موعد بداية الامتحانات:</span>
            <input
              type="date"
              value={mainExamDate}
              onChange={(e) => setMainExamDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/35 text-xs font-black tabular-nums"
            />
          </label>

          <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-amber-300 dark:border-[#D4AF37]/45 flex items-center gap-2 tabular-nums">
            <Clock className="w-4 h-4 text-[#B58722] dark:text-[#D4AF37]" />
            <span className="text-xs sm:text-sm font-black text-[#9A7218] dark:text-[#F3DFA2]">
              {mainDaysLeft === null
                ? 'حدد التاريخ'
                : mainDaysLeft > 0
                ? `متبقي ${mainDaysLeft} يوم`
                : mainDaysLeft === 0
                ? 'اليوم بدء الامتحانات!'
                : `بدأ منذ ${Math.abs(mainDaysLeft)} يوم`}
            </span>
          </div>
        </div>
      </div>

      {/* Add Subject Date Row */}
      <form onSubmit={handleAddExam} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <input
          type="text"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder="اسم المادة أو الامتحان (مثال: الجيولوجيا)..."
          className="sm:col-span-4 p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-bold"
        />
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="sm:col-span-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-bold tabular-nums"
        />
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="ملاحظة سريعة (اختياري)..."
          className="sm:col-span-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-bold"
        />
        <button
          type="submit"
          disabled={!newSubject.trim() || !newDate}
          className="sm:col-span-2 py-2 px-3 btn-luxury-gold rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>أضف مادة</span>
        </button>
      </form>

      {/* Exam Dates Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-500 dark:text-[#B5AA92]">
              <th className="py-2 px-2.5 font-black">المادة</th>
              <th className="py-2 px-2.5 font-black">تاريخ الامتحان</th>
              <th className="py-2 px-2.5 font-black">المتبقي</th>
              <th className="py-2 px-2.5 font-black">الحالة</th>
              <th className="py-2 px-2.5 font-black text-center">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-[#D4AF37]/15">
            {sortedExams.map((item) => {
              const daysLeft = computeDaysRemaining(item.examDate);
              let statusText = 'مجدول';
              let statusClass = 'text-emerald-600 dark:text-emerald-400';
              if (daysLeft !== null) {
                if (daysLeft < 0) {
                  statusText = 'انتهى';
                  statusClass = 'text-zinc-400';
                } else if (daysLeft === 0) {
                  statusText = 'اليوم!';
                  statusClass = 'text-rose-500 font-black';
                } else if (daysLeft <= 14) {
                  statusText = 'مراجعة نهائية';
                  statusClass = 'text-rose-500 font-black';
                } else if (daysLeft <= 45) {
                  statusText = 'اقترب الموعد';
                  statusClass = 'text-amber-600 dark:text-[#F3DFA2] font-bold';
                }
              }

              return (
                <tr key={item.id} className="hover:bg-zinc-50/70 dark:hover:bg-[#0D0D10]/60">
                  <td className="py-2.5 px-2.5 font-black text-zinc-950 dark:text-[#F4EFE6]">
                    {item.subjectName}
                    {item.notes && (
                      <span className="block text-[10px] font-medium text-zinc-500 dark:text-[#B5AA92]">
                        {item.notes}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2.5">
                    <input
                      type="date"
                      value={item.examDate}
                      onChange={(e) => handleUpdateDate(item.id, e.target.value)}
                      className="px-2 py-1 rounded-lg bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/20 text-xs font-bold tabular-nums"
                    />
                  </td>
                  <td className="py-2.5 px-2.5 font-black tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">
                    {daysLeft === null
                      ? '—'
                      : daysLeft > 0
                      ? `متبقي ${daysLeft} يوم`
                      : daysLeft === 0
                      ? 'اليوم'
                      : `منذ ${Math.abs(daysLeft)} يوم`}
                  </td>
                  <td className={`py-2.5 px-2.5 ${statusClass}`}>{statusText}</td>
                  <td className="py-2.5 px-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteExam(item.id)}
                      aria-label="حذف الامتحان"
                      className="p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
