import { StreakHistoryEntry } from '../types';

export const STREAK_HISTORY_STORAGE_KEY = 'nahj_streak_history';

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const date = parseLocalDateKey(dateKey);
  date.setDate(date.getDate() + deltaDays);
  return getLocalDateKey(date);
}

export function loadStreakHistory(
  currentStreakDays: number,
  todayStudyHours = 0,
  todayCompletedTasks = 0
): Record<string, StreakHistoryEntry> {
  let map: Record<string, StreakHistoryEntry> = {};

  try {
    const raw = localStorage.getItem(STREAK_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        map = parsed;
      }
    }
  } catch {
    map = {};
  }

  const todayKey = getLocalDateKey();
  const nowIso = new Date().toISOString();

  // Backfill consecutive trailing days if the student already accumulated streakDays
  if (currentStreakDays > 0) {
    const completedCount = Object.values(map).filter((e) => e.status === 'completed').length;
    if (completedCount === 0) {
      const daysToSeed = Math.min(currentStreakDays, 90);
      for (let i = 0; i < daysToSeed; i++) {
        const key = addDaysToDateKey(todayKey, -i);
        if (!map[key]) {
          map[key] = {
            date: key,
            status: 'completed',
            studyHours: i === 0 ? todayStudyHours : 0,
            tasksCompleted: i === 0 ? todayCompletedTasks : 0,
            xpEarned: 0,
            note: i === 0 ? 'يوم استمرارية نشط' : 'يوم التزام مسجل في السلسلة',
            updatedAt: nowIso,
          };
        }
      }
    }
  }

  // Sync today's live metrics if student already studied or completed tasks today
  if (todayStudyHours > 0 || todayCompletedTasks > 0) {
    const existing = map[todayKey];
    map[todayKey] = {
      date: todayKey,
      status: existing?.status === 'freeze' ? 'freeze' : 'completed',
      studyHours: Math.max(existing?.studyHours || 0, todayStudyHours),
      tasksCompleted: Math.max(existing?.tasksCompleted || 0, todayCompletedTasks),
      xpEarned: existing?.xpEarned || 0,
      note: existing?.note || 'نشاط دراسي موثق تلقائياً',
      updatedAt: nowIso,
    };
  }

  return map;
}

export function saveStreakHistory(history: Record<string, StreakHistoryEntry>): void {
  try {
    localStorage.setItem(STREAK_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore quota errors
  }
}

export function getIntensityLevel(entry?: StreakHistoryEntry): 0 | 1 | 2 | 3 | 4 {
  if (!entry || entry.status === 'missed') return 0;
  if (entry.status === 'freeze') return 1;

  const score =
    (entry.studyHours || 0) * 1.2 +
    (entry.tasksCompleted || 0) * 0.8 +
    (entry.xpEarned || 0) / 40;

  if (score >= 6) return 4;
  if (score >= 3) return 3;
  if (score >= 1) return 2;
  return 1;
}

export interface StreakAnalytics {
  totalCompletedDays: number;
  freezeDaysCount: number;
  longestStreak: number;
  currentActiveStreak: number;
}

export function computeStreakAnalytics(
  history: Record<string, StreakHistoryEntry>,
  baseStreakDays: number
): StreakAnalytics {
  const entries = Object.values(history);
  const completedDates = entries
    .filter((e) => e.status === 'completed')
    .map((e) => e.date)
    .sort();

  const freezeDaysCount = entries.filter((e) => e.status === 'freeze').length;

  // Calculate longest consecutive run across completed or freeze days
  const activeDatesSet = new Set(
    entries
      .filter((e) => e.status === 'completed' || e.status === 'freeze')
      .map((e) => e.date)
  );

  const sortedActive = Array.from(activeDatesSet).sort();
  let longestRun = 0;
  let running = 0;
  let prevKey: string | null = null;

  for (const key of sortedActive) {
    if (prevKey && addDaysToDateKey(prevKey, 1) === key) {
      running += 1;
    } else {
      running = 1;
    }
    if (running > longestRun) longestRun = running;
    prevKey = key;
  }

  // Calculate current streak ending at today or yesterday
  const todayKey = getLocalDateKey();
  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  let cursor = activeDatesSet.has(todayKey)
    ? todayKey
    : activeDatesSet.has(yesterdayKey)
    ? yesterdayKey
    : null;

  let currentRun = 0;
  while (cursor && activeDatesSet.has(cursor)) {
    currentRun += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  return {
    totalCompletedDays: completedDates.length,
    freezeDaysCount,
    longestStreak: Math.max(longestRun, baseStreakDays),
    currentActiveStreak: Math.max(currentRun, baseStreakDays),
  };
}

export function formatArabicFullDate(dateKey: string): string {
  const date = parseLocalDateKey(dateKey);
  return date.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatArabicMonthYear(year: number, monthIndex: number): string {
  const date = new Date(year, monthIndex, 1, 12, 0, 0);
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
  });
}
