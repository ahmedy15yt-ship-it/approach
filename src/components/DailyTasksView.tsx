import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  ListTodo,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CustomDailyTask, DailyTask, StudySession } from '../types';
import {
  getCurrentTaskCycleIndex,
  getTaskCycleRemainingMs,
} from '../data/tasks';

interface DailyTasksViewProps {
  accountPhone: string;
  systemTasks: DailyTask[];
  onToggleSystemTask: (taskId: string) => void;
  onAwardBonusXp?: (xp: number) => void;
  onStartFocusSession: (session: StudySession) => void;
  onOpenLeaderboard: () => void;
}

const TASK_CATEGORIES = [
  'المذاكرة والتحصيل',
  'حل الأسئلة والامتحانات',
  'مراجعة الأخطاء والتراكم',
  'اللغات والقرآن',
  'التركيز والصحة',
];

const QUICK_TASK_TEMPLATES: Array<{
  title: string;
  category: string;
  priority: CustomDailyTask['priority'];
  estimatedMinutes: number;
  xp: number;
}> = [
  {
    title: 'حل 30 سؤال فهم بنظام ثانوية حديثة على درس اليوم',
    category: 'حل الأسئلة والامتحانات',
    priority: 'high',
    estimatedMinutes: 45,
    xp: 40,
  },
  {
    title: 'مراجعة دفتر الأخطاء وتثبيت تريكات الدرس الصعبة',
    category: 'مراجعة الأخطاء والتراكم',
    priority: 'high',
    estimatedMinutes: 25,
    xp: 35,
  },
  {
    title: 'مراجعة ملخص PDF أو سماع شرح السبورة مع تدوين القوانين',
    category: 'المذاكرة والتحصيل',
    priority: 'medium',
    estimatedMinutes: 30,
    xp: 30,
  },
  {
    title: 'حفظ ومراجعة 25 كلمة + 15 جملة إنجليزي بالنطق',
    category: 'اللغات والقرآن',
    priority: 'normal',
    estimatedMinutes: 20,
    xp: 25,
  },
];

function formatCountdownMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const DailyTasksView: React.FC<DailyTasksViewProps> = ({
  accountPhone,
  systemTasks,
  onToggleSystemTask,
  onAwardBonusXp,
  onStartFocusSession,
  onOpenLeaderboard,
}) => {
  const cycleIndex = getCurrentTaskCycleIndex();
  const storageKey = `nahj_custom_daily_tasks_${accountPhone || 'guest'}_${cycleIndex}`;

  const [customTasks, setCustomTasks] = useState<CustomDailyTask[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  // Reload if account/cycle changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCustomTasks(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setCustomTasks([]);
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(customTasks));
    } catch {
      // ignore
    }
  }, [customTasks, storageKey]);

  // Countdown until next 4:00 AM Cairo reset
  const [remainingMs, setRemainingMs] = useState<number>(() => getTaskCycleRemainingMs());
  useEffect(() => {
    const t = window.setInterval(() => {
      setRemainingMs(getTaskCycleRemainingMs());
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  // Form & Filter State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>(TASK_CATEGORIES[0]);
  const [newPriority, setNewPriority] = useState<CustomDailyTask['priority']>('high');
  const [newDuration, setNewDuration] = useState<number>(25);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');

  const priorityXpMap: Record<CustomDailyTask['priority'], number> = {
    high: 40,
    medium: 30,
    normal: 25,
  };

  const handleAddCustomTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleaned = newTitle.trim();
    if (!cleaned) return;
    const item: CustomDailyTask = {
      id: `ct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: cleaned,
      category: newCategory,
      priority: newPriority,
      estimatedMinutes: newDuration,
      xp: priorityXpMap[newPriority],
      isDone: false,
      xpClaimed: false,
      cycleIndex,
      createdAt: new Date().toISOString(),
    };
    setCustomTasks((prev) => [item, ...prev]);
    setNewTitle('');
  };

  const handleAddTemplateTask = (tpl: (typeof QUICK_TASK_TEMPLATES)[number]) => {
    const exists = customTasks.some((t) => t.title === tpl.title);
    if (exists) return;
    const item: CustomDailyTask = {
      id: `ct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: tpl.title,
      category: tpl.category,
      priority: tpl.priority,
      estimatedMinutes: tpl.estimatedMinutes,
      xp: tpl.xp,
      isDone: false,
      xpClaimed: false,
      cycleIndex,
      createdAt: new Date().toISOString(),
    };
    setCustomTasks((prev) => [item, ...prev]);
  };

  const handleToggleCustomTask = (id: string) => {
    let awardedXp = 0;
    setCustomTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const nextDone = !task.isDone;
        if (nextDone && !task.xpClaimed) {
          awardedXp = task.xp;
          return { ...task, isDone: true, xpClaimed: true };
        }
        return { ...task, isDone: nextDone };
      })
    );
    if (awardedXp > 0) {
      onAwardBonusXp?.(awardedXp);
      confetti({ particleCount: 45, spread: 55, origin: { y: 0.72 } });
    }
  };

  const handleDeleteCustomTask = (id: string) => {
    setCustomTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClearCompletedCustom = () => {
    setCustomTasks((prev) => prev.filter((t) => !t.isDone));
  };

  const filteredCustomTasks = useMemo(() => {
    return customTasks.filter((t) => {
      if (statusFilter === 'pending') return !t.isDone;
      if (statusFilter === 'done') return t.isDone;
      return true;
    });
  }, [customTasks, statusFilter]);

  const systemDoneCount = systemTasks.filter((t) => t.isDone).length;
  const customDoneCount = customTasks.filter((t) => t.isDone).length;
  const totalCount = systemTasks.length + customTasks.length;
  const totalDoneCount = systemDoneCount + customDoneCount;
  const overallPercent = totalCount > 0 ? Math.round((totalDoneCount / totalCount) * 100) : 0;

  const priorityLabel = (p: CustomDailyTask['priority']) =>
    p === 'high' ? 'أولوية قصوى' : p === 'medium' ? 'مهمة اليوم' : 'روتينية';

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Page Header */}
      <header className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">
            <span>إدارة اليوم الدراسي</span>
            <span aria-hidden="true">·</span>
            <span>مهامك الخاصة + المهام الستة</span>
            <span aria-hidden="true">·</span>
            <span>تتجدد 4:00 ص بتوقيت مصر</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] [text-wrap:balance]">
            المهام اليومية وإنجاز الهدف اليومي
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92] max-w-2xl leading-relaxed">
            خطط ليومك بدقة؛ أضف مهامك الدراسية الخاصة أو شغّل مؤقت التركيز بومودورو لأي مهمة، وتابع إنجاز المهام الستة المتجددة يومياً لرفع نقاط تفوقك.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl px-4 py-2.5 text-center">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] block">
              تجدد دورة المهام خلال
            </span>
            <span
              className="text-base font-mono font-black text-[#9A7218] dark:text-[#F6E2A6] tabular-nums"
              dir="ltr"
            >
              {formatCountdownMs(remainingMs)}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-black text-zinc-800 dark:text-[#E8CE88] hover:border-[#D4AF37] flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Trophy className="w-4 h-4 text-[#D4AF37]" />
            <span>لوحة الأوائل</span>
          </button>
        </div>
      </header>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/28 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-[#B5AA92] block">
              الإنجاز الإجمالي اليوم
            </span>
            <span className="text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] tabular-nums">
              {totalDoneCount} / {totalCount}
            </span>
          </div>
          <div className="text-left">
            <span className="text-sm font-mono font-black text-[#9A7218] dark:text-[#E8CE88] tabular-nums">
              {overallPercent}%
            </span>
            <div className="w-24 h-2 bg-zinc-200 dark:bg-[#09090C] rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-gradient-to-l from-[#F6E2A6] via-[#D4AF37] to-[#B58722] transition-all duration-300"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/28 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-[#B5AA92] block">
              مهامك الشخصية
            </span>
            <span className="text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] tabular-nums">
              {customDoneCount} / {customTasks.length}
            </span>
          </div>
          <ListTodo className="w-6 h-6 text-[#D4AF37] shrink-0" />
        </div>

        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/28 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-[#B5AA92] block">
              المهام الستة المتجددة
            </span>
            <span className="text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] tabular-nums">
              {systemDoneCount} / {systemTasks.length}
            </span>
          </div>
          <Flame className="w-6 h-6 text-[#D4AF37] shrink-0" />
        </div>
      </div>

      {/* Main Workspace: Personal Tasks Creator & List + System 6 Tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left/Right Column 1: Add & Manage Personal Daily Tasks (7 cols) */}
        <section className="xl:col-span-7 bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-[#D4AF37]/20">
            <div>
              <h2 className="text-base font-black text-zinc-950 dark:text-[#F6E2A6]">
                قائمة مهامي اليومية المخصصة
              </h2>
              <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
                أضف أهدافك لهذا اليوم واحصل على نقاط إضافية عند إتمام كل مهمة أول مرة
              </p>
            </div>

            {customDoneCount > 0 && (
              <button
                type="button"
                onClick={handleClearCompletedCustom}
                className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-bold text-zinc-600 dark:text-[#B5AA92] hover:text-rose-500 cursor-pointer whitespace-nowrap"
              >
                مسح المنجز
              </button>
            )}
          </div>

          {/* Add Personal Task Form */}
          <form onSubmit={handleAddCustomTask} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="اكتب مهمة اليوم (مثال: مذاكرة فصل الحث الكهرومغناطيسي وحل 25 سؤالاً)..."
                className="grow px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 text-sm font-semibold text-zinc-950 dark:text-[#F4EFE6] outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="btn-luxury-gold px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة المهمة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-bold text-zinc-800 dark:text-[#F4EFE6] outline-none"
              >
                {TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={newPriority}
                onChange={(e) =>
                  setNewPriority(e.target.value as CustomDailyTask['priority'])
                }
                className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-bold text-zinc-800 dark:text-[#F4EFE6] outline-none"
              >
                <option value="high">أولوية قصوى (+40 نقطة)</option>
                <option value="medium">مهمة اليوم (+30 نقطة)</option>
                <option value="normal">روتينية (+25 نقطة)</option>
              </select>

              <select
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-bold text-zinc-800 dark:text-[#F4EFE6] outline-none"
              >
                <option value={15}>مدة تقديرية: 15 دقيقة</option>
                <option value={25}>مدة تقديرية: 25 دقيقة (بومودورو)</option>
                <option value={45}>مدة تقديرية: 45 دقيقة</option>
                <option value={60}>مدة تقديرية: 60 دقيقة</option>
              </select>
            </div>
          </form>

          {/* Filter Tabs + Quick Templates */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/20">
                {(
                  [
                    { id: 'all', label: `الكل (${customTasks.length})` },
                    {
                      id: 'pending',
                      label: `قيد التنفيذ (${customTasks.length - customDoneCount})`,
                    },
                    { id: 'done', label: `مكتملة (${customDoneCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === tab.id
                        ? 'btn-luxury-gold text-[#09090B] font-black'
                        : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 1-click Top Student Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>إضافة سريعة:</span>
              </span>
              {QUICK_TASK_TEMPLATES.map((tpl) => {
                const added = customTasks.some((t) => t.title === tpl.title);
                return (
                  <button
                    key={tpl.title}
                    type="button"
                    disabled={added}
                    onClick={() => handleAddTemplateTask(tpl)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-[11px] font-bold text-zinc-700 dark:text-[#E8CE88] hover:border-[#D4AF37] disabled:opacity-45 cursor-pointer"
                  >
                    + {tpl.title.slice(0, 34)}...
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personal Tasks List */}
          {filteredCustomTasks.length === 0 ? (
            <div className="rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-dashed border-zinc-300 dark:border-[#D4AF37]/30 p-8 text-center space-y-2">
              <ListTodo className="w-8 h-8 text-[#D4AF37] mx-auto" />
              <p className="text-sm font-black text-zinc-900 dark:text-[#F6E2A6]">
                {customTasks.length === 0
                  ? 'لم تضف مهامك الخاصة لهذا اليوم بعد'
                  : 'لا توجد مهام مطابقة للتصفية الحالية'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
                اكتب مهمتك بالأعلى أو اختر من القوالب السريعة لتنظيم يومك الدراسي.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredCustomTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    task.isDone
                      ? 'bg-amber-50/70 dark:bg-[#0E0E12] border-amber-300 dark:border-[#D4AF37]/45'
                      : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/22 hover:border-[#D4AF37]/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleCustomTask(task.id)}
                    className="flex items-start gap-3 text-right grow cursor-pointer"
                  >
                    {task.isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-[#B58722] dark:text-[#E8CE88] shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-400 dark:text-[#D4AF37]/45 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <span
                        className={`text-sm font-bold block leading-snug ${
                          task.isDone
                            ? 'line-through text-zinc-500 dark:text-[#B5AA92]'
                            : 'text-zinc-950 dark:text-[#F4EFE6]'
                        }`}
                      >
                        {task.title}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-zinc-500 dark:text-[#B5AA92]">
                        <span>{task.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{priorityLabel(task.priority)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{task.estimatedMinutes} دقيقة</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-bold text-[#9A7218] dark:text-[#E8CE88] tabular-nums">
                          +{task.xp} XP
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!task.isDone && (
                      <button
                        type="button"
                        onClick={() =>
                          onStartFocusSession({
                            id: task.id,
                            subjectId: 'custom-task',
                            subjectName: task.category,
                            lessonTitle: task.title,
                            startTime: 'الآن',
                            durationMinutes: task.estimatedMinutes,
                            isCompleted: false,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold text-zinc-800 dark:text-[#E8CE88] hover:border-[#D4AF37] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        title="تشغيل مؤقت بومودورو لهذه المهمة"
                      >
                        <Play className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>ابدأ بومودورو</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomTask(task.id)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="حذف المهمة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Column 2: System 6 Auto-Rotating Daily Tasks (5 cols) */}
        <section className="xl:col-span-5 bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-[#D4AF37]/20">
            <div>
              <h2 className="text-base font-black text-zinc-950 dark:text-[#F6E2A6]">
                مهام اليوم الستة التلقائية
              </h2>
              <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
                تتبدل يومياً الساعة 4:00 فجراً بتوقيت مصر لتنشيط تحصيلك
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#9A7218] dark:text-[#E8CE88] tabular-nums">
              <Clock className="w-4 h-4 text-[#D4AF37]" />
              <span>
                {systemDoneCount}/{systemTasks.length}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {systemTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onToggleSystemTask(task.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  task.isDone
                    ? 'bg-amber-50/80 dark:bg-[#0E0E12] border-amber-300 dark:border-[#D4AF37]/50'
                    : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {task.isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-[#B58722] dark:text-[#E8CE88] shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-400 dark:text-[#D4AF37]/40 shrink-0" />
                  )}
                  <span
                    className={`text-xs sm:text-sm font-bold leading-snug ${
                      task.isDone
                        ? 'line-through text-zinc-500 dark:text-[#B5AA92]'
                        : 'text-zinc-950 dark:text-[#F4EFE6]'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#9A7218] dark:text-[#E8CE88] shrink-0 tabular-nums">
                  +{task.xp} XP
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
