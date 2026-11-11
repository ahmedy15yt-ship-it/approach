export interface Lesson {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
  isCustom?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  unitTitle?: string;
  lessons: Lesson[];
  summary: {
    title: string;
    keyPoints: string[];
    examTips: string[];
    formulaOrNugget?: string;
  };
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  weeklyTargetHours: number;
  chapters: Chapter[];
}

export interface StudySession {
  id: string;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  lessonTitle: string;
  startTime: string; // HH:mm
  durationMinutes: number;
  isCompleted: boolean;
  notes?: string;
  xpEarned?: number;
}

export interface DaySchedule {
  dayName: string; // السبت، الأحد...
  isSchoolDay: boolean;
  wakeUpTime: string;
  bedTime: string;
  sessions: StudySession[];
}

export interface BacklogItem {
  id: string;
  subjectId: string;
  subjectName: string;
  lessonTitle: string;
  assignedDate: string; // YYYY-MM-DD
  isCompleted: boolean;
  completedAt?: string;
}

export interface DailyTask {
  id: string;
  title: string;
  category: 'study' | 'water' | 'prayer' | 'exercise' | 'backlog' | 'mindset';
  xp: number;
  isDone: boolean;
  targetCount?: number;
  currentCount?: number;
}

export interface StudentProfile {
  name: string;
  codeMasked: string;
  streakDays: number;
  totalXp: number;
  rankTitle: string;
  governorate: string;
  dailyWaterCups: number;
  dailyWin?: string;
  weeklyHoursAllocation: Record<string, number>; // subjectId -> hours
  weightKg?: number;
  heightCm?: number;
  fitnessGoal?: 'maintain' | 'lose' | 'gain';
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  governorate: string;
  xp: number;
  streak: number;
  badge: string;
  isCurrentUser?: boolean;
}
