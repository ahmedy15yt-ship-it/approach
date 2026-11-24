import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Flame,
  Trophy,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Check,
  Shield,
  XCircle,
  Clock,
  Award,
  MapPin,
  BookOpen,
  CheckCircle2,
  Edit3,
  Save,
  Grid3X3,
  Phone,
  LogOut,
} from 'lucide-react';
import { StudentProfile, StreakHistoryEntry } from '../types';
import { EGYPT_GOVERNORATES } from '../data/prayer';
import {
  getLocalDateKey,
  addDaysToDateKey,
  computeStreakAnalytics,
  getIntensityLevel,
  formatArabicFullDate,
  formatArabicMonthYear,
} from '../utils/streakHistory';
import { VerifiedBadge } from './VerifiedBadge';
import { isVerifiedPhone } from '../utils/verifiedAccounts';

interface ProfileViewProps {
  profile: StudentProfile;
  streakHistory: Record<string, StreakHistoryEntry>;
  todayStudyHours: number;
  dailyGoalHours: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  nextStreakAtMs?: number;
  onUpdateName: (name: string) => void;
  onUpdateRankTitle: (rankTitle: string) => void;
  onUpdateGovernorate: (governorate: string) => void;
  onUpdateDailyGoal: (goalHours: number) => void;
  onUpsertStreakDay: (
    dateKey: string,
    patch: {
      status: 'completed' | 'freeze' | 'missed';
      studyHours?: number;
      note?: string;
    }
  ) => void;
  accountPhone?: string;
  lastSyncedAt?: string;
  onLogout?: () => void;
}

const ARABIC_WEEKDAYS_SAT_FIRST = [
  'السبت',
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
];

const RANK_SUGGESTIONS = [
  'طبيب المستقبل 🩺',
  'دكتور امتياز قريباً',
  'بطل تالتة ثانوي علمي علوم',
  'حامل حلم كلية الطب',
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  streakHistory,
  todayStudyHours,
  dailyGoalHours,
  completedLessonsCount,
  totalLessonsCount,
  nextStreakAtMs,
  onUpdateName,
  onUpdateRankTitle,
  onUpdateGovernorate,
  onUpdateDailyGoal,
  onUpsertStreakDay,
  accountPhone,
  lastSyncedAt,
  onLogout,
}) => {
  const todayKey = getLocalDateKey();
  const todayDateObj = new Date();

  // Calendar view state
  const [calendarMode, setCalendarMode] = useState<'month' | 'heatmap'>('month');
  const [viewYear, setViewYear] = useState<number>(todayDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(todayDateObj.getMonth()); // 0-indexed
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  // Selected day edit controls
  const selectedEntry = streakHistory[selectedDateKey];
  const [noteInput, setNoteInput] = useState<string>(selectedEntry?.note || '');
  const [hoursInput, setHoursInput] = useState<string>(
    selectedEntry?.studyHours ? String(selectedEntry.studyHours) : ''
  );
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Profile editor state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [rankDraft, setRankDraft] = useState(profile.rankTitle);

  // 24h Streak countdown
  const [streakRemainingSec, setStreakRemainingSec] = useState<number>(() =>
    nextStreakAtMs ? Math.max(0, Math.floor((nextStreakAtMs - Date.now()) / 1000)) : 0
  );

  useEffect(() => {
    if (!nextStreakAtMs) return;
    const tick = () => {
      setStreakRemainingSec(Math.max(0, Math.floor((nextStreakAtMs - Date.now()) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [nextStreakAtMs]);

  useEffect(() => {
    const entry = streakHistory[selectedDateKey];
    setNoteInput(entry?.note || '');
    setHoursInput(
      entry?.studyHours !== undefined && entry.studyHours > 0 ? String(entry.studyHours) : ''
    );
    setSaveFeedback(null);
  }, [selectedDateKey, streakHistory]);

  const analytics = useMemo(
    () => computeStreakAnalytics(streakHistory, profile.streakDays),
    [streakHistory, profile.streakDays]
  );

  // Monthly Calendar Cells (Saturday-first grid)
  const monthGrid = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1, 12, 0, 0);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0, 12, 0, 0).getDate();
    // JS getDay(): Sun=0..Sat=6 -> Sat=0, Sun=1, ..., Fri=6
    const startOffset = (firstDayOfMonth.getDay() + 1) % 7;

    const cells: Array<{
      dateKey: string | null;
      dayNumber: number | null;
      isFuture: boolean;
    }> = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateKey: null, dayNumber: null, isFuture: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateKey = `${viewYear}-${mm}-${dd}`;
      cells.push({
        dateKey,
        dayNumber: d,
        isFuture: dateKey > todayKey,
      });
    }

    // Pad trailing cells to complete the last row cleanly
    while (cells.length % 7 !== 0) {
      cells.push({ dateKey: null, dayNumber: null, isFuture: false });
    }

    return cells;
  }, [viewYear, viewMonth, todayKey]);

  // Month summary stats
  const monthSummary = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
    const isCurrentMonth =
      viewYear === todayDateObj.getFullYear() && viewMonth === todayDateObj.getMonth();
    const totalDaysElapsed = isCurrentMonth
      ? todayDateObj.getDate()
      : new Date(viewYear, viewMonth + 1, 0).getDate();

    const entriesInMonth = Object.values(streakHistory).filter(
      (e) => e.date.startsWith(prefix) && e.date <= todayKey
    );
    const completedCount = entriesInMonth.filter((e) => e.status === 'completed').length;
    const freezeCount = entriesInMonth.filter((e) => e.status === 'freeze').length;
    const hoursSum = entriesInMonth.reduce((sum, e) => sum + (e.studyHours || 0), 0);
    const consistencyPct =
      totalDaysElapsed > 0 ? Math.min(100, Math.round((completedCount / totalDaysElapsed) * 100)) : 0;

    return {
      completedCount,
      freezeCount,
      hoursSum: Number(hoursSum.toFixed(1)),
      consistencyPct,
      totalDaysElapsed,
    };
  }, [streakHistory, viewYear, viewMonth, todayKey]);

  // 12-week (84-day) heatmap columns grouped by week (Sat -> Fri)
  const heatmapWeeks = useMemo(() => {
    const today = new Date();
    const todaySatIdx = (today.getDay() + 1) % 7; // 0 for Saturday
    // Start 11 full weeks + current week back on Saturday
    const totalDaysBack = 11 * 7 + todaySatIdx;
    const startKey = addDaysToDateKey(todayKey, -totalDaysBack);

    const weeks: Array<Array<{ dateKey: string; isFuture: boolean }>> = [];
    for (let w = 0; w < 12; w++) {
      const col: Array<{ dateKey: string; isFuture: boolean }> = [];
      for (let d = 0; d < 7; d++) {
        const key = addDaysToDateKey(startKey, w * 7 + d);
        col.push({ dateKey: key, isFuture: key > todayKey });
      }
      weeks.push(col);
    }
    return weeks;
  }, [todayKey]);

  // Recent achievement dates timeline (latest 10 active entries)
  const recentAchievements = useMemo(() => {
    return Object.values(streakHistory)
      .filter((e) => e.status === 'completed' || e.status === 'freeze')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [streakHistory]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const isAtCurrentMonth =
      viewYear === todayDateObj.getFullYear() && viewMonth === todayDateObj.getMonth();
    if (isAtCurrentMonth) return;

    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    setViewYear(todayDateObj.getFullYear());
    setViewMonth(todayDateObj.getMonth());
    setSelectedDateKey(todayKey);
  };

  const handleSaveProfileDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameDraft.trim()) onUpdateName(nameDraft.trim());
    if (rankDraft.trim()) onUpdateRankTitle(rankDraft.trim());
    setIsEditingProfile(false);
  };

  const handleSetDayStatus = (status: 'completed' | 'freeze' | 'missed') => {
    if (selectedDateKey > todayKey) return;
    const parsedHours = hoursInput.trim() !== '' ? Math.max(0, Math.min(24, Number(hoursInput))) : undefined;
    onUpsertStreakDay(selectedDateKey, {
      status,
      studyHours: Number.isNaN(parsedHours as number) ? undefined : parsedHours,
      note: noteInput.trim() || undefined,
    });
    setSaveFeedback(
      status === 'completed'
        ? 'تم توثيق يوم الالتزام وحفظه في سجلك.'
        : status === 'freeze'
        ? 'تم تسجيل يوم إجازة حماية السلسلة.'
        : 'تم مسح تسجيل هذا اليوم.'
    );
  };

  const handleSaveDayDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDateKey > todayKey) return;
    const currentStatus =
      selectedEntry?.status && selectedEntry.status !== 'missed'
        ? selectedEntry.status
        : 'completed';
    const parsedHours =
      hoursInput.trim() !== '' ? Math.max(0, Math.min(24, Number(hoursInput))) : selectedEntry?.studyHours || 0;
    onUpsertStreakDay(selectedDateKey, {
      status: currentStatus,
      studyHours: Number.isNaN(parsedHours) ? 0 : parsedHours,
      note: noteInput.trim(),
    });
    setSaveFeedback('تم حفظ الملاحظة وساعات المذاكرة لهذا التاريخ.');
  };

  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isAtCurrentMonth =
    viewYear === todayDateObj.getFullYear() && viewMonth === todayDateObj.getMonth();

  const todayEntry = streakHistory[todayKey];
  const isTodayCompleted = todayEntry?.status === 'completed';

  const curriculumProgressPct =
    totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Section 1: Student Profile Header & Controls */}
      <section className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl btn-luxury-gold flex items-center justify-center shrink-0 text-2xl font-black shadow-sm">
              {profile.name.trim().charAt(0) || 'ن'}
            </div>

            <div className="space-y-1.5 min-w-0">
              {isEditingProfile ? (
                <form onSubmit={handleSaveProfileDetails} className="space-y-2.5 max-w-md">
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="اسم الطالب"
                      className="px-3 py-1.5 text-sm font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <input
                      type="text"
                      value={rankDraft}
                      onChange={(e) => setRankDraft(e.target.value)}
                      placeholder="اللقب التحفيزي"
                      className="px-3 py-1.5 text-sm font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {RANK_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRankDraft(s)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-zinc-100 dark:bg-[#09090C] border border-transparent dark:border-[#D4AF37]/20 text-zinc-700 dark:text-[#B5AA92] hover:bg-amber-50 dark:hover:bg-[#1E1E26] hover:text-[#9A7218] dark:hover:text-[#F6E2A6] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-1.5 btn-luxury-gold rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>حفظ التعديلات</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNameDraft(profile.name);
                        setRankDraft(profile.rankTitle);
                        setIsEditingProfile(false);
                      }}
                      className="px-3 py-1.5 bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-700 dark:text-[#B5AA92] rounded-xl text-xs font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] flex items-center gap-2">
                      <span>{profile.name}</span>
                      {(profile.isVerified || isVerifiedPhone(accountPhone)) && (
                        <VerifiedBadge size="md" showLabel />
                      )}
                    </h1>
                    <button
                      onClick={() => {
                        setNameDraft(profile.name);
                        setRankDraft(profile.rankTitle);
                        setIsEditingProfile(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-zinc-600 dark:text-[#E8CE88] hover:text-[#9A7218] dark:hover:text-[#F6E2A6] bg-zinc-100 dark:bg-[#09090C] border border-transparent dark:border-[#D4AF37]/25 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل البيانات</span>
                    </button>
                  </div>

                  {/* Clean unboxed metadata per design constitution */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-zinc-500 dark:text-[#B5AA92]">
                    <span className="text-[#9A7218] dark:text-[#E8CE88] font-bold">{profile.rankTitle}</span>
                    {accountPhone && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums" dir="ltr">
                          <Phone className="w-3 h-3 text-[#D4AF37]" />
                          {accountPhone}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>تالتة ثانوي علمي علوم</span>
                    <span aria-hidden="true">·</span>
                    <span>إنجاز المنهج: <span className="tabular-nums font-bold text-zinc-800 dark:text-[#F4EFE6]">{curriculumProgressPct}%</span></span>
                    {profile.weightKg && profile.heightCm && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">الوزن {profile.weightKg} كجم / الطول {profile.heightCm} سم</span>
                      </>
                    )}
                    {lastSyncedAt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          النشاط محفوظ{' '}
                          <span className="tabular-nums">
                            {new Date(lastSyncedAt).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Governorate, Daily Study Goal & Logout controls */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="profile-gov-select"
                className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>المحافظة (لمواقيت الصلاة)</span>
              </label>
              <select
                id="profile-gov-select"
                value={profile.governorate}
                onChange={(e) => onUpdateGovernorate(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-xl text-zinc-900 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37] cursor-pointer"
              >
                {EGYPT_GOVERNORATES.map((g) => (
                  <option key={g.id} value={g.name.split(' ')[0]}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="profile-goal-select"
                className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>هدف الساعات اليومي</span>
              </label>
              <select
                id="profile-goal-select"
                value={dailyGoalHours}
                onChange={(e) => onUpdateDailyGoal(Number(e.target.value))}
                className="px-3 py-2 text-xs font-bold bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-xl text-zinc-900 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37] cursor-pointer tabular-nums"
              >
                {[4, 5, 6, 7, 8, 9, 10, 12].map((h) => (
                  <option key={h} value={h}>
                    {h} ساعات يومياً
                  </option>
                ))}
              </select>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] hover:border-[#D4AF37] text-xs font-bold text-zinc-800 dark:text-[#E8CE88] hover:text-[#9A7218] dark:hover:text-[#F6E2A6] transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: 4-Column Tabular KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-[#B5AA92] mb-1.5">
            <span>السلسلة الحالية</span>
            <Flame className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] tabular-nums">
            {profile.streakDays} يوم
          </div>
          {nextStreakAtMs && (
            <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92] mt-1 font-mono tabular-nums" dir="ltr">
              +1 بعد {formatCountdown(streakRemainingSec)}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-[#B5AA92] mb-1.5">
            <span>أطول سلسلة إنجاز</span>
            <Trophy className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] tabular-nums">
            {analytics.longestStreak} يوم
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92] mt-1">
            أقصى تتابع متواصل مسجل
          </p>
        </div>

        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-[#B5AA92] mb-1.5">
            <span>إجمالي أيام الالتزام</span>
            <CalendarIcon className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] tabular-nums">
            {analytics.totalCompletedDays} يوم
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92] mt-1 tabular-nums">
            {analytics.freezeDaysCount > 0
              ? `إضافة إلى ${analytics.freezeDaysCount} يوم حماية`
              : `اليوم: ${todayStudyHours.toFixed(1)} من ${dailyGoalHours} ساعات`}
          </p>
        </div>

        <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-[#B5AA92] mb-1.5">
            <span>مجموع النقاط</span>
            <Award className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-black text-zinc-950 dark:text-[#F6E2A6] tabular-nums">
            {profile.totalXp.toLocaleString('en-US')} XP
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92] mt-1 tabular-nums">
            دروس منتهية: {completedLessonsCount} / {totalLessonsCount}
          </p>
        </div>
      </section>

      {/* Section 3: Visual Streak History Calendar + Selected Day Inspector */}
      <section className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-5">
        {/* Section Header + Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-[#D4AF37]/20">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-zinc-950 dark:text-[#F6E2A6] flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#D4AF37]" />
              <span>تقويم تواريخ الإنجازات السابقة (Streak History)</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-[#B5AA92] mt-0.5">
              استعرض كل يوم حافظت فيه على استمراريتك، واضغط على أي يوم لمراجعة ساعاته أو توثيق إنجازك.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented Mode Control */}
            <div className="inline-flex items-center gap-1 p-1 bg-zinc-100 dark:bg-[#09090C] rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25">
              <button
                type="button"
                onClick={() => setCalendarMode('month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  calendarMode === 'month'
                    ? 'btn-luxury-gold shadow-xs'
                    : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>التقويم الشهري</span>
              </button>
              <button
                type="button"
                onClick={() => setCalendarMode('heatmap')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  calendarMode === 'heatmap'
                    ? 'btn-luxury-gold shadow-xs'
                    : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>خريطة 12 أسبوعاً</span>
              </button>
            </div>

            {!isTodayCompleted && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDateKey(todayKey);
                  onUpsertStreakDay(todayKey, {
                    status: 'completed',
                    studyHours: todayStudyHours,
                    note: 'توثيق يوم الالتزام في نَهج',
                  });
                }}
                className="px-3.5 py-2 btn-luxury-gold text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>توثيق إنجاز اليوم</span>
              </button>
            )}
          </div>
        </div>

        {/* Main 12-Col Grid: Visual Calendar + Selected Date Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Calendar / Heatmap Panel */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {calendarMode === 'month' ? (
              <>
                {/* Month Navigation & Stats */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      aria-label="الشهر السابق"
                      className="p-2 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-[#E8CE88] hover:border-[#D4AF37] hover:text-[#9A7218] dark:hover:text-[#F6E2A6] transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <h3 className="text-base font-black text-zinc-950 dark:text-[#F6E2A6] min-w-[130px] text-center">
                      {formatArabicMonthYear(viewYear, viewMonth)}
                    </h3>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      disabled={isAtCurrentMonth}
                      aria-label="الشهر التالي"
                      className="p-2 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-[#E8CE88] hover:border-[#D4AF37] hover:text-[#9A7218] dark:hover:text-[#F6E2A6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleJumpToday}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-[#E8CE88] hover:border-[#D4AF37] hover:text-[#9A7218] dark:hover:text-[#F6E2A6] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      اليوم
                    </button>
                  </div>

                  {/* Clean unboxed monthly summary */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-[#B5AA92] tabular-nums">
                    <span>
                      التزام الشهر:{' '}
                      <strong className="text-zinc-900 dark:text-[#F4EFE6]">
                        {monthSummary.completedCount} / {monthSummary.totalDaysElapsed} يوم
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      نسبة الاستمرارية:{' '}
                      <strong className="text-[#9A7218] dark:text-[#F6E2A6]">
                        {monthSummary.consistencyPct}%
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
                  {ARABIC_WEEKDAYS_SAT_FIRST.map((dayName) => (
                    <div
                      key={dayName}
                      className="py-1.5 text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92]"
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Month Day Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {monthGrid.map((cell, idx) => {
                    if (!cell.dateKey || cell.dayNumber === null) {
                      return <div key={`empty-${idx}`} className="min-h-[54px] sm:min-h-[62px]" />;
                    }

                    const entry = streakHistory[cell.dateKey];
                    const level = getIntensityLevel(entry);
                    const isSelected = selectedDateKey === cell.dateKey;
                    const isToday = cell.dateKey === todayKey;
                    const isCompleted = entry?.status === 'completed';
                    const isFreeze = entry?.status === 'freeze';

                    let cellSurface =
                      'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 text-zinc-700 dark:text-[#B5AA92] hover:border-[#D4AF37]';

                    if (cell.isFuture) {
                      cellSurface =
                        'bg-zinc-50/40 dark:bg-[#09090C]/40 border-zinc-200/50 dark:border-[#D4AF37]/10 text-zinc-400 dark:text-[#B5AA92]/40 cursor-not-allowed';
                    } else if (isFreeze) {
                      cellSurface =
                        'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200';
                    } else if (isCompleted) {
                      if (level >= 3) {
                        cellSurface =
                          'bg-gradient-to-br from-[#F6E2A6] to-[#B58722] border-[#F6E2A6]/60 text-[#09090B] shadow-xs';
                      } else if (level === 2) {
                        cellSurface =
                          'bg-amber-200 dark:bg-[#D4AF37]/35 border-amber-400 dark:border-[#D4AF37]/60 text-amber-950 dark:text-[#F6E2A6]';
                      } else {
                        cellSurface =
                          'bg-amber-100/80 dark:bg-[#D4AF37]/15 border-amber-300 dark:border-[#D4AF37]/35 text-amber-950 dark:text-[#F3DFA2]';
                      }
                    }

                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        disabled={cell.isFuture}
                        onClick={() => setSelectedDateKey(cell.dateKey!)}
                        title={
                          cell.isFuture
                            ? 'تاريخ مستقبلي'
                            : `${formatArabicFullDate(cell.dateKey)}${
                                isCompleted
                                  ? ' — يوم التزام مكتمل'
                                  : isFreeze
                                  ? ' — إجازة حماية السلسلة'
                                  : ' — غير مسجل'
                              }`
                        }
                        className={`min-h-[54px] sm:min-h-[62px] rounded-xl border p-1.5 flex flex-col items-center justify-between transition-all cursor-pointer relative ${cellSurface} ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-[#D4AF37] dark:ring-offset-[#19191F]'
                            : isToday
                            ? 'ring-1 ring-[#D4AF37]'
                            : ''
                        }`}
                      >
                        <div className="w-full flex items-center justify-between text-[11px] font-extrabold tabular-nums">
                          <span>{cell.dayNumber}</span>
                          {isCompleted && <Check className="w-3 h-3 shrink-0" />}
                          {isFreeze && <Shield className="w-3 h-3 shrink-0" />}
                        </div>

                        <div className="text-[10px] font-bold tabular-nums leading-none">
                          {entry && entry.studyHours > 0 ? (
                            <span>{entry.studyHours}س</span>
                          ) : isToday ? (
                            <span>اليوم</span>
                          ) : isCompleted ? (
                            <span>التزام</span>
                          ) : isFreeze ? (
                            <span>حماية</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* 12-Week Consistency Heatmap */
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-[#F6E2A6]">
                    خريطة الاستمرارية خلال آخر 12 أسبوعاً (84 يوماً)
                  </h3>
                  <span className="text-xs text-zinc-500 dark:text-[#B5AA92]">
                    اضغط على أي مربع لعرض تفاصيل اليوم وتعديله
                  </span>
                </div>

                <div className="overflow-x-auto pb-2">
                  <div className="inline-flex gap-2 min-w-full justify-between">
                    {/* Weekday labels column */}
                    <div className="grid grid-rows-7 gap-1.5 text-[10px] font-bold text-zinc-500 dark:text-[#B5AA92] py-0.5 shrink-0">
                      {ARABIC_WEEKDAYS_SAT_FIRST.map((wDay) => (
                        <span key={wDay} className="h-7 flex items-center">
                          {wDay}
                        </span>
                      ))}
                    </div>

                    {/* 12 Week Columns */}
                    <div className="grid grid-cols-12 gap-1.5 grow">
                      {heatmapWeeks.map((week, wIdx) => (
                        <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                          {week.map((day) => {
                            const entry = streakHistory[day.dateKey];
                            const level = getIntensityLevel(entry);
                            const isSelected = selectedDateKey === day.dateKey;
                            const isFreeze = entry?.status === 'freeze';

                            let boxCls =
                              'bg-zinc-100 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20';
                            if (day.isFuture) {
                              boxCls =
                                'bg-zinc-50/40 dark:bg-[#09090C]/30 border-zinc-200/40 dark:border-[#D4AF37]/10 opacity-40 cursor-not-allowed';
                            } else if (isFreeze) {
                              boxCls =
                                'bg-amber-200 dark:bg-amber-900/60 border-amber-400 dark:border-amber-700';
                            } else if (level === 4) {
                              boxCls = 'bg-gradient-to-br from-[#F6E2A6] to-[#B58722] border-[#F6E2A6]/60 text-[#09090B]';
                            } else if (level === 3) {
                              boxCls = 'bg-[#D4AF37]/80 border-[#B58722] text-[#09090B]';
                            } else if (level === 2) {
                              boxCls = 'bg-amber-200 dark:bg-[#D4AF37]/35 border-amber-400 dark:border-[#D4AF37]/50 text-amber-950 dark:text-[#F6E2A6]';
                            } else if (level === 1) {
                              boxCls = 'bg-amber-100/80 dark:bg-[#D4AF37]/15 border-amber-300 dark:border-[#D4AF37]/30 text-amber-950 dark:text-[#F3DFA2]';
                            }

                            return (
                              <button
                                key={day.dateKey}
                                type="button"
                                disabled={day.isFuture}
                                onClick={() => setSelectedDateKey(day.dateKey)}
                                title={`${formatArabicFullDate(day.dateKey)}${
                                  entry?.status === 'completed'
                                    ? ` — التزام (${entry.studyHours || 0} ساعة)`
                                    : entry?.status === 'freeze'
                                    ? ' — يوم حماية'
                                    : ''
                                }`}
                                className={`h-7 w-full min-w-[24px] rounded-md border transition-all cursor-pointer flex items-center justify-center ${boxCls} ${
                                  isSelected
                                    ? 'ring-2 ring-[#D4AF37] ring-offset-1 dark:ring-offset-[#19191F]'
                                    : ''
                                }`}
                              >
                                {entry?.status === 'completed' && level >= 3 && (
                                  <Check className="w-3 h-3 text-[#09090B]" />
                                )}
                                {isFreeze && <Shield className="w-3 h-3 text-amber-800 dark:text-amber-200" />}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Accessible Legend (Color + Icon + Text) */}
            <div className="pt-3 border-t border-zinc-200 dark:border-[#D4AF37]/20 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold text-zinc-600 dark:text-[#B5AA92]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-zinc-100 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/25 inline-block" />
                <span>بدون تسجيل</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-amber-100/80 dark:bg-[#D4AF37]/15 border border-amber-300 dark:border-[#D4AF37]/35 inline-flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-[#9A7218] dark:text-[#F3DFA2]" />
                </span>
                <span>التزام أساسي</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-gradient-to-br from-[#F6E2A6] to-[#B58722] border border-[#F6E2A6]/60 inline-flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-[#09090B]" />
                </span>
                <span>إنجاز عالٍ (مذاكرة مكثفة)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 inline-flex items-center justify-center">
                  <Shield className="w-2.5 h-2.5 text-amber-700 dark:text-amber-300" />
                </span>
                <span>يوم حماية السلسلة</span>
              </span>
            </div>
          </div>

          {/* Selected Date Inspector & Check-In Panel */}
          <aside className="lg:col-span-5 xl:col-span-4 bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="pb-3 border-b border-zinc-200 dark:border-[#D4AF37]/20">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] block">
                تفاصيل التاريخ المحدد
              </span>
              <h3 className="text-base font-black text-zinc-950 dark:text-[#F6E2A6] mt-0.5">
                {formatArabicFullDate(selectedDateKey)}
              </h3>
              <div className="mt-1.5 flex items-center gap-2 text-xs font-bold">
                {selectedEntry?.status === 'completed' ? (
                  <span className="text-[#9A7218] dark:text-[#E8CE88] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                    <span>يوم استمرارية مكتمل</span>
                  </span>
                ) : selectedEntry?.status === 'freeze' ? (
                  <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>يوم حماية السلسلة (إجازة)</span>
                  </span>
                ) : (
                  <span className="text-zinc-500 dark:text-[#B5AA92] flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    <span>لم يُسجّل نشاط لهذا اليوم بعد</span>
                  </span>
                )}
              </div>
            </div>

            {/* Day Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-[#B5AA92] block">
                  ساعات المذاكرة
                </span>
                <span className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6] tabular-nums">
                  {(selectedEntry?.studyHours || 0).toFixed(1)} س
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-[#B5AA92] block">
                  مهام منجزة
                </span>
                <span className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6] tabular-nums">
                  {selectedEntry?.tasksCompleted || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-[#B5AA92] block">
                  النقاط المكتسبة
                </span>
                <span className="text-sm font-black text-[#9A7218] dark:text-[#F6E2A6] tabular-nums">
                  +{selectedEntry?.xpEarned || 0}
                </span>
              </div>
            </div>

            {/* Quick Status Actions */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-700 dark:text-[#F4EFE6] block">
                حالة هذا اليوم:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetDayStatus('completed')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    selectedEntry?.status === 'completed'
                      ? 'btn-luxury-gold border-[#F6E2A6]/60'
                      : 'bg-white dark:bg-[#19191F] text-zinc-700 dark:text-[#F4EFE6] border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37]'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>التزام</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDayStatus('freeze')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    selectedEntry?.status === 'freeze'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white dark:bg-[#19191F] text-zinc-700 dark:text-[#F4EFE6] border-zinc-200 dark:border-[#D4AF37]/25 hover:border-amber-500'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>حماية</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDayStatus('missed')}
                  className="py-2 px-2 rounded-xl text-[11px] font-bold border bg-white dark:bg-[#19191F] text-zinc-600 dark:text-[#B5AA92] border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37]/50 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>مسح</span>
                </button>
              </div>
            </div>

            {/* Study Hours + Achievement Note Form */}
            <form onSubmit={handleSaveDayDetails} className="space-y-3 pt-1">
              <div>
                <label
                  htmlFor="day-hours-input"
                  className="text-[11px] font-bold text-zinc-600 dark:text-[#B5AA92] block mb-1"
                >
                  ساعات المذاكرة المسجلة في هذا اليوم
                </label>
                <input
                  id="day-hours-input"
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                  placeholder="مثال: 6"
                  className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37] tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="day-note-input"
                  className="text-[11px] font-bold text-zinc-600 dark:text-[#B5AA92] block mb-1"
                >
                  ملخص إنجاز هذا اليوم (اختياري)
                </label>
                <textarea
                  id="day-note-input"
                  rows={2}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="مثال: خلصت باب الدعامة والحركة وحليت 50 سؤال..."
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-xl text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 btn-luxury-gold text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ تفاصيل اليوم</span>
              </button>

              {saveFeedback && (
                <p className="text-[11px] font-bold text-[#9A7218] dark:text-[#E8CE88] text-center">
                  {saveFeedback}
                </p>
              )}
            </form>
          </aside>
        </div>
      </section>

      {/* Section 4: Recent Achievement Dates Log */}
      <section className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-[#D4AF37]/20">
          <div>
            <h3 className="text-base font-black text-zinc-950 dark:text-[#F6E2A6]">
              سجل تواريخ الإنجازات الأخيرة
            </h3>
            <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
              أحدث الأيام الموثقة في مسيرتك نحو التفوق في الثانوية العامة
            </p>
          </div>
          <span className="text-xs font-bold text-zinc-500 dark:text-[#B5AA92] tabular-nums">
            {recentAchievements.length} سجل حديث
          </span>
        </div>

        {recentAchievements.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm font-bold text-zinc-700 dark:text-[#F4EFE6]">
              لم يتم توثيق أي تواريخ استمرارية بعد.
            </p>
            <p className="text-xs text-zinc-500 dark:text-[#B5AA92] max-w-md mx-auto">
              عند إتمام مهامك اليومية أو جلسات المذاكرة، يُسجّل تاريخ اليوم تلقائياً هنا، ويمكنك توثيق يومك الأول مباشرة.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedDateKey(todayKey);
                onUpsertStreakDay(todayKey, {
                  status: 'completed',
                  studyHours: todayStudyHours,
                  note: 'بداية سلسلة الالتزام في نَهج',
                });
              }}
              className="px-4 py-2 btn-luxury-gold text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>توثيق إنجاز اليوم الأول</span>
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-[#D4AF37]/20">
            {recentAchievements.map((entry) => (
              <li
                key={entry.date}
                onClick={() => setSelectedDateKey(entry.date)}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-[#09090C] px-2 rounded-xl transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      entry.status === 'freeze'
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                        : 'bg-amber-50 dark:bg-[#09090C] border border-amber-200/70 dark:border-[#D4AF37]/30 text-[#9A7218] dark:text-[#D4AF37]'
                    }`}
                  >
                    {entry.status === 'freeze' ? (
                      <Shield className="w-4 h-4" />
                    ) : (
                      <Flame className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-zinc-950 dark:text-[#F4EFE6]">
                      {formatArabicFullDate(entry.date)}
                    </div>
                    {entry.note && (
                      <p className="text-xs text-zinc-600 dark:text-[#B5AA92] mt-0.5">
                        {entry.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-[#B5AA92] tabular-nums shrink-0 pr-11 sm:pr-0">
                  <span>{entry.status === 'freeze' ? 'حماية السلسلة' : 'التزام نشط'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {entry.studyHours} س
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{entry.tasksCompleted} مهام</span>
                  {entry.xpEarned > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#9A7218] dark:text-[#F6E2A6]">+{entry.xpEarned} XP</span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
