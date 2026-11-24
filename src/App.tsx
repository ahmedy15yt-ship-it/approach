import React, { useState, useEffect, useRef } from 'react';
import {

  LayoutDashboard,
  Calendar,
  BookOpen,
  Layers,
  Utensils,
  Dumbbell,
  Brain,
  Compass,
  Trophy,
  TrendingUp,
  Bot,
  Menu,
  X,
  Sparkles,
  Swords,
  User,
  FileQuestion,
  BookOpenCheck,
  Languages,
  Globe,
  HeartHandshake,
  Calculator,
  BookMarked,
  Presentation,
  CheckSquare,
} from 'lucide-react';

import {
  Subject,
  StudySession,
  BacklogItem,
  DailyTask,
  StudentProfile,
  LeaderboardUser,
  DailyStudyHoursLog,
  FriendChallenge,
  StreakHistoryEntry,
  AccountSession,
  StudentActivitySnapshot,
} from './types';
import { INITIAL_CURRICULUM } from './data/curriculum';
import {
  EGYPT_GOVERNORATES,
  calculatePrayerTimes,
} from './data/prayer';
import {
  INITIAL_LEADERBOARD,
  getCurrentTaskCycleIndex,
  getTasksForCycle,
} from './data/tasks';

import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ScheduleView } from './components/ScheduleView';
import { CurriculumView } from './components/CurriculumView';
import { BacklogView } from './components/BacklogView';
import { NutritionView } from './components/NutritionView';
import { ExercisesView } from './components/ExercisesView';
import { MindsetView } from './components/MindsetView';
import { QuranPrayerSection } from './components/QuranPrayerSection';
import { TasksLeaderboardView } from './components/TasksLeaderboardView';
import { AnalyticsView } from './components/AnalyticsView';
import { AITutorView } from './components/AITutorView';
import { FriendsChallengeView } from './components/FriendsChallengeView';
import { ProfileView } from './components/ProfileView';
import { QuestionGeneratorView } from './components/QuestionGeneratorView';
import { LessonSummarizerView } from './components/LessonSummarizerView';
import { VocabularyVaultView } from './components/VocabularyVaultView';
import { TranslatorView } from './components/TranslatorView';
import { CompanionView } from './components/CompanionView';
import { CalculatorView } from './components/CalculatorView';
import { QuranKhatmaView } from './components/QuranKhatmaView';
import { WhiteboardExplainerView } from './components/WhiteboardExplainerView';
import { DailyTasksView } from './components/DailyTasksView';
import { PhoneLoginPage } from './components/PhoneLoginPage';
import { PomodoroTimerModal } from './components/PomodoroTimerModal';
import { isVerifiedPhone } from './utils/verifiedAccounts';
import { isNotificationsEnabled, notifyPrayerTime } from './services/notificationService';
import { announcePrayer, announceTask, playBellChime } from './utils/voiceAlerts';
import { playAdhan, isAutoAdhanEnabled } from './utils/adhanPlayer';
import {
  encodeChallengeShareCode,
  decodeChallengeShareCode,
} from './utils/challengeCodes';
import {
  getLocalDateKey,
  loadStreakHistory,
} from './utils/streakHistory';
import { upsertChallengeTodayHistory } from './utils/challengeCharts';
import {
  getActiveAccountSession,
  setActiveAccountSession,
  loadLocalAccountSnapshot,
  saveLocalAccountSnapshot,
  syncAccountSnapshotToServer,
  extractLegacyGuestSnapshotParts,
  markLegacyGuestMigrated,
  maskPhoneNumber,
} from './utils/accountStorage';

export default function App() {
  const [telegramSupportUrl, setTelegramSupportUrl] = useState('https://t.me/Y_lI11');

  // Dark Luxury Mode State (Defaults to Dark Luxury "الفخامة المظلمة")
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedV2 = localStorage.getItem('nahj_theme_v2');
    if (savedV2) return savedV2 === 'dark';
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nahj_theme_v2', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nahj_theme_v2', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.telegramSupportUrl) setTelegramSupportUrl(data.telegramSupportUrl);
      })
      .catch(() => {});
  }, []);

  const [accountSession, setAccountSession] = useState<AccountSession | null>(() =>
    getActiveAccountSession()
  );

  const handleLoginSuccess = ({
    session,
    snapshot,
    isNewAccount,
    importGuestData,
  }: {
    session: AccountSession;
    snapshot: StudentActivitySnapshot | null;
    isNewAccount: boolean;
    importGuestData: boolean;
  }) => {
    if (!snapshot && isNewAccount && importGuestData) {
      const legacy = extractLegacyGuestSnapshotParts();
      const todayStr = new Date().toISOString().split('T')[0];
      const currentCycle = getCurrentTaskCycleIndex();
      const migratedSnapshot: StudentActivitySnapshot = {
        username: session.username,
        phone: session.phone,
        normalizedPhone: session.normalizedPhone,
        profile: {
          name: session.username,
          codeMasked: maskPhoneNumber(session.phone),
          streakDays: legacy.profile?.streakDays ?? 0,
          totalXp: legacy.profile?.totalXp ?? 0,
          rankTitle: legacy.profile?.rankTitle || 'طبيب المستقبل 🩺',
          governorate: legacy.profile?.governorate || 'القاهرة',
          dailyWaterCups: legacy.profile?.dailyWaterCups ?? 0,
          dailyWin:
            legacy.profile?.dailyWin ||
            'أنهيت فصل الدعامة في النبات وحليت 40 سؤالاً بدون أي خطأ!',
          weightKg: legacy.profile?.weightKg || 68,
          heightCm: legacy.profile?.heightCm || 172,
          weeklyHoursAllocation: legacy.profile?.weeklyHoursAllocation || {
            biology: 6,
            chemistry: 5,
            physics: 5,
            geology: 4,
            arabic: 5,
            english: 4,
            'second-language': 3,
          },
        },
        curriculum: Array.isArray(legacy.curriculum) ? legacy.curriculum : INITIAL_CURRICULUM,
        backlogItems: Array.isArray(legacy.backlogItems) ? legacy.backlogItems : [],
        dailyTasks:
          Array.isArray(legacy.dailyTasks) && legacy.taskCycleIndex === currentCycle
            ? legacy.dailyTasks
            : getTasksForCycle(currentCycle),
        taskCycleIndex: currentCycle,
        todayStudyLog: legacy.todayStudyLog || {
          date: todayStr,
          hours: 0,
          sessionsCount: 0,
          dailyGoalHours: 8,
          updatedAt: new Date().toISOString(),
        },
        friendChallenges: Array.isArray(legacy.friendChallenges) ? legacy.friendChallenges : [],
        streakHistory: legacy.streakHistory || {},
        streakLastTickMs: legacy.streakLastTickMs || Date.now(),
        updatedAt: new Date().toISOString(),
      };
      saveLocalAccountSnapshot(migratedSnapshot);
      syncAccountSnapshotToServer(migratedSnapshot);
      markLegacyGuestMigrated();
    } else if (!snapshot) {
      markLegacyGuestMigrated();
    }

    setActiveAccountSession(session);
    setAccountSession(session);
  };

  const handleLogout = () => {
    setActiveAccountSession(null);
    setAccountSession(null);
  };

  if (!accountSession) {
    return (
      <PhoneLoginPage
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <AuthenticatedApp
      key={accountSession.normalizedPhone}
      accountSession={accountSession}
      onUpdateSession={(updated) => {
        setActiveAccountSession(updated);
        setAccountSession(updated);
      }}
      onLogout={handleLogout}
      isDarkMode={isDarkMode}
      onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      telegramSupportUrl={telegramSupportUrl}
    />
  );
}

interface AuthenticatedAppProps {
  accountSession: AccountSession;
  onUpdateSession: (session: AccountSession) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  telegramSupportUrl: string;
}

function AuthenticatedApp({
  accountSession,
  onUpdateSession,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
  telegramSupportUrl,
}: AuthenticatedAppProps) {
  const initialAccountSnapshot = useRef<StudentActivitySnapshot | null>(
    loadLocalAccountSnapshot(accountSession.normalizedPhone)
  ).current;

  const [lastSyncedAt, setLastSyncedAt] = useState<string>(
    accountSession.lastSyncedAt || initialAccountSnapshot?.updatedAt || new Date().toISOString()
  );

  // Voice alerts state
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('nahj_voice_alerts') !== 'false';
  });

  const handleToggleVoiceAlerts = () => {
    setVoiceAlertsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('nahj_voice_alerts', next ? 'true' : 'false');
      if (next) {
        playBellChime();
      }
      return next;
    });
  };

  // Navigation state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Curriculum State (Scoped to logged-in phone account)
  const [curriculum, setCurriculum] = useState<Subject[]>(() => {
    if (initialAccountSnapshot?.curriculum) return initialAccountSnapshot.curriculum;
    return INITIAL_CURRICULUM;
  });

  // Backlog items state
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>(() => {
    if (initialAccountSnapshot?.backlogItems && initialAccountSnapshot.backlogItems.length > 0) {
      return initialAccountSnapshot.backlogItems;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'bl-1',
        subjectId: 'physics',
        subjectName: 'الفيزياء',
        lessonTitle: 'قوانين كيرشوف وحل الدوائر المعقدة',
        assignedDate: todayStr,
        isCompleted: false,
      },
      {
        id: 'bl-2',
        subjectId: 'biology',
        subjectName: 'الأحياء',
        lessonTitle: 'التنسيق الهرموني والغدة الدرقية وجارات الدرقية',
        assignedDate: todayStr,
        isCompleted: false,
      },
      {
        id: 'bl-3',
        subjectId: 'chemistry',
        subjectName: 'الكيمياء',
        lessonTitle: 'تفاعلات الحديد وتحويلات الأكاسيد',
        assignedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        isCompleted: false,
      },
    ];
  });

  // Daily Tasks state (Rotates automatically every 13 hours)
  const [taskCycleIndex, setTaskCycleIndex] = useState<number>(() => getCurrentTaskCycleIndex());
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(() => {
    const currentCycle = getCurrentTaskCycleIndex();
    if (
      initialAccountSnapshot &&
      initialAccountSnapshot.taskCycleIndex === currentCycle &&
      Array.isArray(initialAccountSnapshot.dailyTasks) &&
      initialAccountSnapshot.dailyTasks.length === 6
    ) {
      return initialAccountSnapshot.dailyTasks;
    }
    return getTasksForCycle(currentCycle);
  });

  // Student Profile state (Scoped to logged-in phone & username)
  const isAccountVerified = Boolean(
    accountSession.isVerified || isVerifiedPhone(accountSession.normalizedPhone)
  );
  const [profile, setProfile] = useState<StudentProfile>(() => {
    const p = initialAccountSnapshot?.profile;
    return {
      name: p?.name || accountSession.username,
      codeMasked: maskPhoneNumber(accountSession.phone),
      streakDays: p?.streakDays ?? 0,
      totalXp: p?.totalXp ?? 0,
      rankTitle: p?.rankTitle || 'طبيب المستقبل 🩺',
      governorate: p?.governorate || 'القاهرة',
      dailyWaterCups: p?.dailyWaterCups ?? 0,
      dailyWin:
        p?.dailyWin || 'أنهيت فصل الدعامة في النبات وحليت 40 سؤالاً بدون أي خطأ!',
      weightKg: p?.weightKg || 68,
      heightCm: p?.heightCm || 172,
      isVerified: Boolean(p?.isVerified) || isAccountVerified,
      weeklyHoursAllocation: p?.weeklyHoursAllocation || {
        biology: 6,
        chemistry: 5,
        physics: 5,
        geology: 4,
        arabic: 5,
        english: 4,
        'second-language': 3,
      },
    };
  });

  const STREAK_INTERVAL_MS = 24 * 60 * 60 * 1000;
  const [streakLastTickMs, setStreakLastTickMs] = useState<number>(() => {
    if (initialAccountSnapshot?.streakLastTickMs && initialAccountSnapshot.streakLastTickMs > 0) {
      return initialAccountSnapshot.streakLastTickMs;
    }
    return Date.now();
  });

  useEffect(() => {
    const checkStreak24h = () => {
      const now = Date.now();
      const elapsed = now - streakLastTickMs;
      if (elapsed >= STREAK_INTERVAL_MS) {
        const completedCycles = Math.floor(elapsed / STREAK_INTERVAL_MS);
        const nextTick = streakLastTickMs + completedCycles * STREAK_INTERVAL_MS;
        setStreakLastTickMs(nextTick);
        setProfile((prev) => ({
          ...prev,
          streakDays: (prev.streakDays || 0) + completedCycles,
        }));
        const todayKey = getLocalDateKey();
        setStreakHistory((prev) => {
          const existing = prev[todayKey];
          return {
            ...prev,
            [todayKey]: {
              date: todayKey,
              status: existing?.status === 'freeze' ? 'freeze' : 'completed',
              studyHours: existing?.studyHours || 0,
              tasksCompleted: existing?.tasksCompleted || 0,
              xpEarned: existing?.xpEarned || 0,
              note: existing?.note || 'تحديث تلقائي بعد إتمام دورة الـ 24 ساعة',
              updatedAt: new Date().toISOString(),
            },
          };
        });
        if (voiceAlertsEnabled) {
          announceTask(`تمت إضافة ${completedCycles} يوم جديد لسلسلة الالتزام كل 24 ساعة!`);
        }
      }
    };

    checkStreak24h();
    const interval = setInterval(checkStreak24h, 30000);
    return () => clearInterval(interval);
  }, [streakLastTickMs, voiceAlertsEnabled]);

  const handleUpdateStudentMetrics = (weight: number, height: number) => {
    setProfile((prev) => ({ ...prev, weightKg: weight, heightCm: height }));
    localStorage.setItem('nahj_student_weight', String(weight));
    localStorage.setItem('nahj_student_height', String(height));
  };

  const handleAwardBonusXp = (amount: number) => {
    setProfile((prev) => ({
      ...prev,
      totalXp: prev.totalXp + amount,
    }));
  };

  // Daily Study Hours Log (Persisted in localStorage under nahj_study_hours_log)
  const getTodayIso = () => new Date().toISOString().split('T')[0];

  const [todayStudyLog, setTodayStudyLog] = useState<DailyStudyHoursLog>(() => {
    const today = new Date().toISOString().split('T')[0];
    const savedLog = initialAccountSnapshot?.todayStudyLog;
    if (savedLog) {
      if (savedLog.date === today) {
        return {
          date: today,
          hours: Number(savedLog.hours) || 0,
          sessionsCount: Number(savedLog.sessionsCount) || 0,
          dailyGoalHours: Number(savedLog.dailyGoalHours) || 8,
          updatedAt: savedLog.updatedAt || new Date().toISOString(),
        };
      }
      return {
        date: today,
        hours: 0,
        sessionsCount: 0,
        dailyGoalHours: Number(savedLog.dailyGoalHours) || 8,
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      date: today,
      hours: 0,
      sessionsCount: 0,
      dailyGoalHours: 8,
      updatedAt: new Date().toISOString(),
    };
  });

  // Friends Study Challenges (Scoped to logged-in account)
  const [friendChallenges, setFriendChallenges] = useState<FriendChallenge[]>(() => {
    if (initialAccountSnapshot?.friendChallenges) {
      return initialAccountSnapshot.friendChallenges;
    }
    const seedId = 'ch-starter-1';
    const seedCreated = new Date().toISOString();
    return [
      {
        id: seedId,
        title: 'ماراثون 6 ساعات فيزياء وكيمياء ⚡',
        friendName: 'عمر شريف',
        targetHours: 6,
        myHours: 0,
        friendHours: 2.5,
        status: 'active',
        rewardXp: 80,
        rewardClaimed: false,
        sessionDurationMinutes: 50,
        sessionStartedAt: null,
        sessionCompletedCount: 0,
        shareCode: encodeChallengeShareCode({
          v: 1,
          id: seedId,
          title: 'ماراثون 6 ساعات فيزياء وكيمياء ⚡',
          challengerName: accountSession.username.split(' ')[0] || 'طالب نَهج',
          targetHours: 6,
          challengerHours: 0,
          sessionDurationMinutes: 50,
          sessionStartedAt: null,
          createdAt: seedCreated,
        }),
        createdAt: seedCreated,
        updatedAt: seedCreated,
      },
    ];
  });

  // Streak History Calendar state (Scoped to logged-in account)
  const [streakHistory, setStreakHistory] = useState<Record<string, StreakHistoryEntry>>(() => {
    if (initialAccountSnapshot?.streakHistory && Object.keys(initialAccountSnapshot.streakHistory).length > 0) {
      return initialAccountSnapshot.streakHistory;
    }
    return loadStreakHistory(
      profile.streakDays,
      todayStudyLog.hours,
      dailyTasks.filter((t) => t.isDone).length
    );
  });

  // Build current full activity snapshot for immediate & server persistence
  const buildCurrentSnapshot = (): StudentActivitySnapshot => ({
    username: profile.name || accountSession.username,
    phone: accountSession.phone,
    normalizedPhone: accountSession.normalizedPhone,
    profile,
    curriculum,
    backlogItems,
    dailyTasks,
    taskCycleIndex,
    todayStudyLog,
    friendChallenges,
    streakHistory,
    streakLastTickMs,
    updatedAt: new Date().toISOString(),
  });

  // Persist account activity snapshot locally on every change and sync to server
  useEffect(() => {
    const snapshot = buildCurrentSnapshot();
    saveLocalAccountSnapshot(snapshot);
    setLastSyncedAt(snapshot.updatedAt);

    const timer = setTimeout(() => {
      syncAccountSnapshotToServer(snapshot);
    }, 800);
    return () => clearTimeout(timer);
  }, [
    profile,
    curriculum,
    backlogItems,
    dailyTasks,
    taskCycleIndex,
    todayStudyLog,
    friendChallenges,
    streakHistory,
    streakLastTickMs,
  ]);

  const handleFlushAndLogout = async () => {
    const snapshot = buildCurrentSnapshot();
    saveLocalAccountSnapshot(snapshot);
    await syncAccountSnapshotToServer(snapshot);
    onLogout();
  };

  const recordTodayAchievement = (patch: {
    studyHours?: number;
    tasksDelta?: number;
    xpDelta?: number;
  }) => {
    const todayKey = getLocalDateKey();
    setStreakHistory((prev) => {
      const existing = prev[todayKey];
      const nextHours =
        patch.studyHours !== undefined ? patch.studyHours : existing?.studyHours || 0;
      const nextTasks = Math.max(
        0,
        (existing?.tasksCompleted || 0) + (patch.tasksDelta || 0)
      );
      const nextXp = Math.max(0, (existing?.xpEarned || 0) + (patch.xpDelta || 0));
      return {
        ...prev,
        [todayKey]: {
          date: todayKey,
          status: existing?.status === 'freeze' ? 'freeze' : 'completed',
          studyHours: Number(nextHours.toFixed(2)),
          tasksCompleted: nextTasks,
          xpEarned: nextXp,
          note: existing?.note,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const handleUpsertStreakDay = (
    dateKey: string,
    patch: {
      status: 'completed' | 'freeze' | 'missed';
      studyHours?: number;
      note?: string;
    }
  ) => {
    setStreakHistory((prev) => {
      if (patch.status === 'missed') {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      }
      const existing = prev[dateKey];
      return {
        ...prev,
        [dateKey]: {
          date: dateKey,
          status: patch.status,
          studyHours:
            patch.studyHours !== undefined ? patch.studyHours : existing?.studyHours || 0,
          tasksCompleted: existing?.tasksCompleted || 0,
          xpEarned: existing?.xpEarned || 0,
          note: patch.note !== undefined ? patch.note : existing?.note,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const syncMyHoursAcrossChallenges = (deltaHours: number, sessionIncrement = 0) => {
    const today = getTodayIso();
    const baseHours = todayStudyLog.date === today ? todayStudyLog.hours : 0;
    const computedNextHours = Math.max(
      0,
      Math.min(24, Number((baseHours + deltaHours).toFixed(2)))
    );

    setTodayStudyLog((prev) => {
      const prevBaseHours = prev.date === today ? prev.hours : 0;
      const baseSessions = prev.date === today ? prev.sessionsCount : 0;
      const nextHours = Math.max(
        0,
        Math.min(24, Number((prevBaseHours + deltaHours).toFixed(2)))
      );
      return {
        date: today,
        hours: nextHours,
        sessionsCount: baseSessions + sessionIncrement,
        dailyGoalHours: prev.dailyGoalHours || 8,
        updatedAt: new Date().toISOString(),
      };
    });

    if (deltaHours > 0) {
      recordTodayAchievement({ studyHours: computedNextHours });
    }

    if (deltaHours !== 0) {
      const todayKey = getLocalDateKey();
      setFriendChallenges((prev) =>
        prev.map((ch) => {
          if (ch.status !== 'active') return ch;
          const updatedHours = Math.max(
            0,
            Math.min(24, Number((ch.myHours + deltaHours).toFixed(2)))
          );
          return {
            ...ch,
            myHours: updatedHours,
            dailyHistory: upsertChallengeTodayHistory(
              ch.dailyHistory,
              updatedHours,
              ch.friendHours,
              todayKey
            ),
            shareCode: encodeChallengeShareCode({
              v: 1,
              id: ch.id,
              title: ch.title,
              challengerName: profile.name.split(' ')[0] || 'طالب نَهج',
              targetHours: ch.targetHours,
              challengerHours: updatedHours,
              sessionDurationMinutes: ch.sessionDurationMinutes || 50,
              sessionStartedAt: ch.sessionStartedAt || null,
              createdAt: ch.createdAt,
            }),
            updatedAt: new Date().toISOString(),
          };
        })
      );
    }
  };

  const handleSetExactStudyHours = (exactHours: number) => {
    const today = getTodayIso();
    const clamped = Math.max(0, Math.min(24, Number(exactHours.toFixed(2))));
    const prevHours = todayStudyLog.date === today ? todayStudyLog.hours : 0;
    const delta = Number((clamped - prevHours).toFixed(2));
    syncMyHoursAcrossChallenges(delta, 0);
  };

  const handleLogStudyMinutes = (minutes: number) => {
    const safeMinutes = Math.max(1, minutes);
    const deltaHours = Number((safeMinutes / 60).toFixed(2));
    syncMyHoursAcrossChallenges(deltaHours, 1);
  };

  const handleCreateChallenge = (input: {
    title: string;
    friendName: string;
    targetHours: number;
    friendInitialHours?: number;
    sessionDurationMinutes?: number;
    startSessionNow?: boolean;
  }): FriendChallenge => {
    const id = `ch-${Date.now()}`;
    const now = new Date().toISOString();
    const myInitial = Number(todayStudyLog.hours.toFixed(2));
    const durationMins = input.sessionDurationMinutes || 50;
    const startedAt = input.startSessionNow ? now : null;
    const shareCode = encodeChallengeShareCode({
      v: 1,
      id,
      title: input.title,
      challengerName: profile.name.split(' ')[0] || 'طالب نَهج',
      targetHours: input.targetHours,
      challengerHours: myInitial,
      sessionDurationMinutes: durationMins,
      sessionStartedAt: startedAt,
      createdAt: now,
    });
    const friendInitial = Math.max(0, Number(input.friendInitialHours) || 0);
    const created: FriendChallenge = {
      id,
      title: input.title,
      friendName: input.friendName,
      targetHours: input.targetHours,
      myHours: myInitial,
      friendHours: friendInitial,
      dailyHistory: upsertChallengeTodayHistory(
        undefined,
        myInitial,
        friendInitial,
        getLocalDateKey()
      ),
      status: 'active',
      rewardXp: 80,
      rewardClaimed: false,
      shareCode,
      sessionDurationMinutes: durationMins,
      sessionStartedAt: startedAt,
      sessionCompletedCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    setFriendChallenges((prev) => [created, ...prev]);

    fetch('/api/challenges/room/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId: id,
        title: input.title,
        participantName: profile.name.split(' ')[0] || 'طالب نَهج',
        participantHours: myInitial,
        sessionDurationMinutes: durationMins,
        sessionStartedAt: startedAt,
      }),
    }).catch(() => {});

    return created;
  };

  const handleImportChallengeCode = (rawCode: string) => {
    const decoded = decodeChallengeShareCode(rawCode);
    if (!decoded) {
      return {
        ok: false,
        message: 'تعذر قراءة الكود؛ تأكد من لصق كود NAHJ-CH:... كاملاً.',
      };
    }

    const existing = friendChallenges.find(
      (c) =>
        c.id === decoded.id ||
        (c.title === decoded.title && c.friendName === decoded.challengerName)
    );

    if (existing) {
      const nextDuration =
        decoded.sessionDurationMinutes || existing.sessionDurationMinutes || 50;
      const nextStartedAt = decoded.sessionStartedAt ?? existing.sessionStartedAt ?? null;
      const todayKey = getLocalDateKey();
      setFriendChallenges((prev) =>
        prev.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                friendHours: decoded.challengerHours,
                dailyHistory: upsertChallengeTodayHistory(
                  c.dailyHistory,
                  c.myHours,
                  decoded.challengerHours,
                  todayKey
                ),
                sessionDurationMinutes: nextDuration,
                sessionStartedAt: nextStartedAt,
                shareCode: encodeChallengeShareCode({
                  v: 1,
                  id: c.id,
                  title: c.title,
                  challengerName: profile.name.split(' ')[0] || 'طالب نَهج',
                  targetHours: c.targetHours,
                  challengerHours: c.myHours,
                  sessionDurationMinutes: nextDuration,
                  sessionStartedAt: nextStartedAt,
                  createdAt: c.createdAt,
                }),
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
      return {
        ok: true,
        challengeId: existing.id,
        message: `تم تحديث تقدم ${existing.friendName} إلى ${decoded.challengerHours.toFixed(1)} ساعة ومزامنة مؤقت الجلسة في تحدي «${existing.title}»!`,
      };
    }

    const now = new Date().toISOString();
    const myHoursNow = Number(todayStudyLog.hours.toFixed(2));
    const durationMins = decoded.sessionDurationMinutes || 50;
    const startedAt = decoded.sessionStartedAt || null;
    const newCh: FriendChallenge = {
      id: decoded.id,
      title: decoded.title,
      friendName: decoded.challengerName,
      targetHours: decoded.targetHours,
      myHours: myHoursNow,
      friendHours: decoded.challengerHours,
      dailyHistory: upsertChallengeTodayHistory(
        undefined,
        myHoursNow,
        decoded.challengerHours,
        getLocalDateKey()
      ),
      status: 'active',
      rewardXp: 80,
      rewardClaimed: false,
      sessionDurationMinutes: durationMins,
      sessionStartedAt: startedAt,
      sessionCompletedCount: 0,
      shareCode: encodeChallengeShareCode({
        v: 1,
        id: decoded.id,
        title: decoded.title,
        challengerName: profile.name.split(' ')[0] || 'طالب نَهج',
        targetHours: decoded.targetHours,
        challengerHours: myHoursNow,
        sessionDurationMinutes: durationMins,
        sessionStartedAt: startedAt,
        createdAt: decoded.createdAt,
      }),
      createdAt: now,
      updatedAt: now,
    };
    setFriendChallenges((prev) => [newCh, ...prev]);

    fetch('/api/challenges/room/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId: decoded.id,
        title: decoded.title,
        participantName: profile.name.split(' ')[0] || 'طالب نَهج',
        participantHours: myHoursNow,
        sessionDurationMinutes: durationMins,
        sessionStartedAt: startedAt,
      }),
    }).catch(() => {});

    return {
      ok: true,
      challengeId: decoded.id,
      message: startedAt
        ? `تم الانضمام لجلسة «${decoded.title}» ضد ${decoded.challengerName} ومزامنة المؤقت المباشر!`
        : `تم الانضمام لتحدي «${decoded.title}» ضد ${decoded.challengerName}! اضغط «دخول الجلسة» لبدء المؤقت.`,
    };
  };

  const handleStartOrUpdateChallengeSession = (
    challengeId: string,
    options?: {
      durationMinutes?: number;
      startNow?: boolean;
      reset?: boolean;
      syncStartedAt?: string | null;
    }
  ) => {
    const nowIso = new Date().toISOString();
    setFriendChallenges((prev) =>
      prev.map((ch) => {
        if (ch.id !== challengeId) return ch;
        const nextDuration = options?.durationMinutes || ch.sessionDurationMinutes || 50;
        let nextStartedAt = ch.sessionStartedAt || null;
        if (options?.reset) {
          nextStartedAt = null;
        } else if (options?.syncStartedAt !== undefined) {
          nextStartedAt = options.syncStartedAt;
        } else if (options?.startNow && !nextStartedAt) {
          nextStartedAt = nowIso;
        }

        const updatedShareCode = encodeChallengeShareCode({
          v: 1,
          id: ch.id,
          title: ch.title,
          challengerName: profile.name.split(' ')[0] || 'طالب نَهج',
          targetHours: ch.targetHours,
          challengerHours: ch.myHours,
          sessionDurationMinutes: nextDuration,
          sessionStartedAt: nextStartedAt,
          createdAt: ch.createdAt,
        });

        fetch('/api/challenges/room/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: ch.id,
            title: ch.title,
            participantName: profile.name.split(' ')[0] || 'طالب نَهج',
            participantHours: ch.myHours,
            sessionDurationMinutes: nextDuration,
            sessionStartedAt: nextStartedAt,
            resetSession: Boolean(options?.reset),
          }),
        }).catch(() => {});

        return {
          ...ch,
          sessionDurationMinutes: nextDuration,
          sessionStartedAt: nextStartedAt,
          shareCode: updatedShareCode,
          updatedAt: nowIso,
        };
      })
    );
  };

  const handleCompleteChallengeSession = (challengeId: string, elapsedMinutes: number) => {
    const safeMinutes = Math.max(1, elapsedMinutes);
    handleLogStudyMinutes(safeMinutes);
    handleAwardBonusXp(25);
    recordTodayAchievement({ xpDelta: 25 });
    const nowIso = new Date().toISOString();
    setFriendChallenges((prev) =>
      prev.map((ch) => {
        if (ch.id !== challengeId) return ch;
        const nextCompletedCount = (ch.sessionCompletedCount || 0) + 1;
        return {
          ...ch,
          sessionStartedAt: null,
          sessionCompletedCount: nextCompletedCount,
          shareCode: encodeChallengeShareCode({
            v: 1,
            id: ch.id,
            title: ch.title,
            challengerName: profile.name.split(' ')[0] || 'طالب نَهج',
            targetHours: ch.targetHours,
            challengerHours: ch.myHours,
            sessionDurationMinutes: ch.sessionDurationMinutes || 50,
            sessionStartedAt: null,
            createdAt: ch.createdAt,
          }),
          updatedAt: nowIso,
        };
      })
    );
  };

  const handleUpdateFriendHours = (challengeId: string, deltaHours: number) => {
    const todayKey = getLocalDateKey();
    setFriendChallenges((prev) =>
      prev.map((ch) => {
        if (ch.id !== challengeId) return ch;
        const nextFriendHours = Math.max(
          0,
          Math.min(24, Number((ch.friendHours + deltaHours).toFixed(2)))
        );
        return {
          ...ch,
          friendHours: nextFriendHours,
          dailyHistory: upsertChallengeTodayHistory(
            ch.dailyHistory,
            ch.myHours,
            nextFriendHours,
            todayKey
          ),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleClaimChallengeReward = (challengeId: string) => {
    const target = friendChallenges.find((c) => c.id === challengeId);
    if (!target || target.rewardClaimed) return;
    handleAwardBonusXp(target.rewardXp);
    setFriendChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? {
              ...c,
              rewardClaimed: true,
              status: c.myHours >= c.friendHours ? 'won' : 'completed',
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const handleDeleteChallenge = (challengeId: string) => {
    setFriendChallenges((prev) => prev.filter((c) => c.id !== challengeId));
  };

  // Active Focus Session (Pomodoro Modal)
  const [activeFocusSession, setActiveFocusSession] = useState<StudySession | null>(null);

  // Prefilled parameters for AI Tutor & Lesson Summarizer from other screens
  const [tutorSubject, setTutorSubject] = useState<string>('الأحياء');
  const [tutorPrompt, setTutorPrompt] = useState<string>('');
  const [summarySelection, setSummarySelection] = useState<{
    subjectName?: string;
    chapterTitle?: string;
    lessonTitle?: string;
  } | null>(null);

  // Automatic daily 4:00 AM Egypt Time task rotation check every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const latestCycle = getCurrentTaskCycleIndex();
      if (latestCycle !== taskCycleIndex) {
        const rotatedTasks = getTasksForCycle(latestCycle);
        setTaskCycleIndex(latestCycle);
        setDailyTasks(rotatedTasks);
        if (voiceAlertsEnabled) {
          announceTask('تجددت مهامك الستة تلقائياً للساعة الرابعة صباحاً بتوقيت مصر!');
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [taskCycleIndex, voiceAlertsEnabled]);

  // Compute Prayers for current governorate
  const currentGov =
    EGYPT_GOVERNORATES.find((g) => g.name.includes(profile.governorate)) ||
    EGYPT_GOVERNORATES[0];
  const prayers = calculatePrayerTimes(new Date(), currentGov);

  // Background Push Notification & Adhan / Voice Alert Scheduler for prayers
  const lastPlayedPrayerKeyRef = useRef<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      const nowMs = Date.now();
      prayers.forEach((p) => {
        if (p.timestamp && Math.abs(p.timestamp.getTime() - nowMs) < 30000) {
          const prayerTriggerKey = `${p.key}-${new Date().toDateString()}`;
          if (lastPlayedPrayerKeyRef.current !== prayerTriggerKey) {
            lastPlayedPrayerKeyRef.current = prayerTriggerKey;

            // Trigger real Adhan if enabled by student
            if (isAutoAdhanEnabled()) {
              playAdhan();
            } else if (voiceAlertsEnabled) {
              announcePrayer(p.name);
            }

            if (isNotificationsEnabled()) {
              notifyPrayerTime(p.name);
            }
          }
        }
      });
    }, 20000);

    return () => clearInterval(interval);
  }, [prayers, voiceAlertsEnabled]);


  const handleToggleLesson = (subjectId: string, chapterId: string, lessonId: string) => {
    setCurriculum((prev) =>
      prev.map((subj) => {
        if (subj.id !== subjectId) return subj;
        return {
          ...subj,
          chapters: subj.chapters.map((ch) => {
            if (ch.id !== chapterId) return ch;
            return {
              ...ch,
              lessons: ch.lessons.map((les) => {
                if (les.id !== lessonId) return les;
                const nextDone = !les.isCompleted;
                if (nextDone) {
                  setProfile((p) => ({ ...p, totalXp: p.totalXp + 20 }));
                  recordTodayAchievement({ xpDelta: 20 });
                } else {
                  setProfile((p) => ({ ...p, totalXp: Math.max(0, p.totalXp - 20) }));
                }
                return { ...les, isCompleted: nextDone };
              }),
            };
          }),
        };
      })
    );
  };

  const handleAddCustomLesson = (subjectId: string, chapterId: string, title: string) => {
    setCurriculum((prev) =>
      prev.map((subj) => {
        if (subj.id !== subjectId) return subj;
        return {
          ...subj,
          chapters: subj.chapters.map((ch) => {
            if (ch.id !== chapterId) return ch;
            return {
              ...ch,
              lessons: [
                ...ch.lessons,
                { id: `custom-${Date.now()}`, title, isCompleted: false, isCustom: true },
              ],
            };
          }),
        };
      })
    );
  };

  const handleToggleTask = (taskId: string) => {
    setDailyTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextDone = !t.isDone;
        if (nextDone) {
          setProfile((p) => ({ ...p, totalXp: p.totalXp + t.xp }));
          recordTodayAchievement({ tasksDelta: 1, xpDelta: t.xp });
          if (voiceAlertsEnabled) {
            announceTask(`إنجاز مهمة ${t.title} وزيادة ${t.xp} نقطة`);
          }
        } else {
          setProfile((p) => ({ ...p, totalXp: Math.max(0, p.totalXp - t.xp) }));
        }
        return { ...t, isDone: nextDone };
      })
    );
  };

  const handleAddBacklog = (item: Omit<BacklogItem, 'id' | 'isCompleted'>) => {
    const newItem: BacklogItem = {
      ...item,
      id: `bl-${Date.now()}`,
      isCompleted: false,
    };
    setBacklogItems((prev) => [newItem, ...prev]);
  };

  const handleToggleBacklog = (id: string) => {
    setBacklogItems((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const nextDone = !b.isCompleted;
        if (nextDone) {
          setProfile((p) => ({ ...p, totalXp: p.totalXp + 30 }));
        }
        return { ...b, isCompleted: nextDone };
      })
    );
  };

  const handleRemoveBacklog = (id: string) => {
    setBacklogItems((prev) => prev.filter((b) => b.id !== id));
  };

  const handleUpdateWeeklyHours = (subjectId: string, hours: number) => {
    setProfile((prev) => ({
      ...prev,
      weeklyHoursAllocation: {
        ...prev.weeklyHoursAllocation,
        [subjectId]: hours,
      },
    }));
  };

  const handleOpenTutorFromConcept = (subject: string, prompt: string) => {
    setTutorSubject(subject);
    setTutorPrompt(prompt);
    setActiveTab('tutor');
  };

  const handleOpenSummarizerFromCurriculum = (
    subjectName: string,
    chapterTitle: string,
    lessonTitle?: string
  ) => {
    setSummarySelection({ subjectName, chapterTitle, lessonTitle });
    setActiveTab('lesson-summarizer');
  };

  // Next study session calculation
  const nextStudySession: StudySession = {
    id: 'next-1',
    subjectId: 'biology',
    subjectName: 'الأحياء',
    lessonTitle: 'الباب الأول: الدعامة الفسيولوجية والتركيبية في النبات والحركة',
    startTime: '4:00 م',
    durationMinutes: 45,
    isCompleted: false,
  };

  // Navigation Items
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'schedule', label: 'الجدول', icon: Calendar },
    { id: 'daily-tasks', label: 'المهام اليومية', icon: CheckSquare },
    { id: 'curriculum', label: 'المنهج والكبسولات', icon: BookOpen },
    { id: 'lesson-summarizer', label: 'ملخصات PDF', icon: BookOpenCheck },
    { id: 'whiteboard', label: 'سبورة الشرح', icon: Presentation },
    { id: 'english-vault', label: 'القاموس والجمل', icon: Languages },
    { id: 'translator', label: 'المترجم', icon: Globe },
    { id: 'calculator', label: 'الآلة الحاسبة', icon: Calculator },
    { id: 'question-builder', label: 'مُنشئ الأسئلة', icon: FileQuestion },
    { id: 'backlog', label: 'المتراكم', icon: Layers },
    { id: 'tutor', label: 'أستاذ نَهج', icon: Bot, highlight: true },
    { id: 'companion', label: 'رفيقي والمستخدمون', icon: HeartHandshake },
    { id: 'khatma', label: 'خطة ختم القرآن', icon: BookMarked },
    { id: 'quran', label: 'القرآن والأذكار والصلاة', icon: Compass },
    { id: 'nutrition', label: 'الأكل والصحة', icon: Utensils },
    { id: 'exercises', label: 'التمارين', icon: Dumbbell },
    { id: 'mindset', label: 'النفسية والتفكير', icon: Brain },
    { id: 'tasks', label: 'المهام والأوائل', icon: Trophy },
    { id: 'challenges', label: 'تحدي الأصدقاء', icon: Swords },
    { id: 'analytics', label: 'المتابعة والتقييم', icon: TrendingUp },
    { id: 'profile', label: 'الملف الشخصي', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F6F3EC] dark:bg-[#0D0D10] text-[#141417] dark:text-[#F4EFE6] flex flex-col font-['Cairo',sans-serif] transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        profile={profile}
        telegramSupportUrl={telegramSupportUrl}
        onUpdateName={(newName) => {
          setProfile((p) => ({ ...p, name: newName }));
          onUpdateSession({ ...accountSession, username: newName });
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
        accountPhone={accountSession.phone}
        onLogout={handleFlushAndLogout}
      />

      {/* Main Layout: Comfortable Dark Gray Sidebar on Desktop + Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full grow flex gap-6">
        {/* Desktop Sidebar (Comfortable Dark Gray Panel with Champagne Frames & Metallic Gold CTA) */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-2">
          <div className="bg-white dark:bg-[#19191F] border border-amber-200/70 dark:border-[#D4AF37]/28 rounded-3xl p-3 shadow-sm sticky top-24 space-y-1 transition-colors duration-200">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isCurrent = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                    isCurrent
                      ? 'btn-luxury-gold text-[#09090B] font-black'
                      : 'text-zinc-700 dark:text-[#E8CE88]/85 hover:bg-amber-50/70 dark:hover:bg-[#101014] hover:text-[#9A7218] dark:hover:text-[#F6E2A6] border border-transparent dark:hover:border-[#D4AF37]/25'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>

                  {item.highlight && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isCurrent
                        ? 'bg-[#09090B] text-[#F6E2A6]'
                        : 'bg-[#09090B] text-[#E8CE88] border border-[#D4AF37]/40'
                    }`}>
                      خبير
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content Area */}
        <main className="grow min-w-0 pb-20 lg:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              profile={profile}
              tasks={dailyTasks}
              onToggleTask={handleToggleTask}
              prayers={prayers}
              nextSession={nextStudySession}
              onStartSession={(s) => setActiveFocusSession(s)}
              onNavigateTab={setActiveTab}
              curriculum={curriculum}
              onAwardBonusXp={handleAwardBonusXp}
              voiceAlertsEnabled={voiceAlertsEnabled}
              onToggleVoiceAlerts={handleToggleVoiceAlerts}
              onOpenTutor={handleOpenTutorFromConcept}
              todayStudyHours={todayStudyLog.hours}
              dailyGoalHours={todayStudyLog.dailyGoalHours}
              activeChallengesCount={friendChallenges.filter((c) => c.status === 'active').length}
              onQuickAddStudyHours={(delta) => syncMyHoursAcrossChallenges(delta, 0)}
              onLogStudyMinutes={handleLogStudyMinutes}
              nextStreakAtMs={streakLastTickMs + STREAK_INTERVAL_MS}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleView
              curriculum={curriculum}
              prayers={prayers}
              onStartSession={(s) => setActiveFocusSession(s)}
              weeklyHours={profile.weeklyHoursAllocation}
              onUpdateWeeklyHours={handleUpdateWeeklyHours}
            />
          )}

          {activeTab === 'daily-tasks' && (
            <DailyTasksView
              accountPhone={accountSession.normalizedPhone}
              systemTasks={dailyTasks}
              onToggleSystemTask={handleToggleTask}
              onAwardBonusXp={handleAwardBonusXp}
              onStartFocusSession={(s) => setActiveFocusSession(s)}
              onOpenLeaderboard={() => setActiveTab('tasks')}
            />
          )}

          {activeTab === 'curriculum' && (
            <CurriculumView
              curriculum={curriculum}
              onToggleLesson={handleToggleLesson}
              onAddCustomLesson={handleAddCustomLesson}
              onAskTutor={handleOpenTutorFromConcept}
              onOpenSummarizer={handleOpenSummarizerFromCurriculum}
            />
          )}

          {activeTab === 'lesson-summarizer' && (
            <LessonSummarizerView
              curriculum={curriculum}
              accountPhone={accountSession.normalizedPhone}
              initialSelection={summarySelection}
              onAwardBonusXp={handleAwardBonusXp}
              onAskTutor={handleOpenTutorFromConcept}
              onPracticeQuestions={() => setActiveTab('question-builder')}
            />
          )}

          {activeTab === 'english-vault' && (
            <VocabularyVaultView
              accountPhone={accountSession.normalizedPhone}
              onAwardBonusXp={handleAwardBonusXp}
            />
          )}

          {activeTab === 'translator' && (
            <TranslatorView
              accountPhone={accountSession.normalizedPhone}
              onAwardBonusXp={handleAwardBonusXp}
            />
          )}

          {activeTab === 'calculator' && <CalculatorView />}

          {activeTab === 'whiteboard' && (
            <WhiteboardExplainerView
              curriculum={curriculum}
              onAwardBonusXp={handleAwardBonusXp}
            />
          )}

          {activeTab === 'companion' && (
            <CompanionView
              studentName={profile.name}
              accountPhone={accountSession.normalizedPhone}
              isStudentVerified={isAccountVerified}
              onAwardBonusXp={handleAwardBonusXp}
            />
          )}

          {activeTab === 'khatma' && (
            <QuranKhatmaView
              accountPhone={accountSession.normalizedPhone}
              onAwardBonusXp={handleAwardBonusXp}
            />
          )}

          {activeTab === 'backlog' && (
            <BacklogView
              curriculum={curriculum}
              backlogItems={backlogItems}
              onAddBacklogItem={handleAddBacklog}
              onToggleBacklogItem={handleToggleBacklog}
              onRemoveBacklogItem={handleRemoveBacklog}
            />
          )}

          {activeTab === 'tutor' && (
            <AITutorView
              curriculum={curriculum}
              initialSubject={tutorSubject}
              initialPrompt={tutorPrompt}
            />
          )}

          {activeTab === 'question-builder' && (
            <QuestionGeneratorView
              curriculum={curriculum}
              studentName={profile.name}
              accountPhone={accountSession.normalizedPhone}
              onAwardBonusXp={handleAwardBonusXp}
              onAskTutor={handleOpenTutorFromConcept}
            />
          )}

          {activeTab === 'quran' && (
            <QuranPrayerSection
              currentGovernorate={profile.governorate}
              onUpdateGovernorate={(gov) => setProfile((p) => ({ ...p, governorate: gov }))}
              onAwardBonusXp={handleAwardBonusXp}
              accountPhone={accountSession.normalizedPhone}
            />
          )}


          {activeTab === 'nutrition' && (
            <NutritionView
              waterCups={profile.dailyWaterCups}
              onUpdateWaterCups={(cups) => setProfile((p) => ({ ...p, dailyWaterCups: cups }))}
              weightKg={profile.weightKg || 68}
              heightCm={profile.heightCm || 172}
              onUpdateMetrics={handleUpdateStudentMetrics}
            />
          )}

          {activeTab === 'exercises' && (
            <ExercisesView
              initialWeight={profile.weightKg || 68}
              initialHeight={profile.heightCm || 172}
              onUpdateMetrics={handleUpdateStudentMetrics}
            />
          )}

          {activeTab === 'mindset' && (
            <MindsetView
              dailyWin={profile.dailyWin}
              onSaveDailyWin={(win) => setProfile((p) => ({ ...p, dailyWin: win }))}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksLeaderboardView
              tasks={dailyTasks}
              onToggleTask={handleToggleTask}
              leaderboard={INITIAL_LEADERBOARD}
              studentXp={profile.totalXp}
              streakDays={profile.streakDays}
              nextStreakAtMs={streakLastTickMs + STREAK_INTERVAL_MS}
              isCurrentUserVerified={isAccountVerified}
            />
          )}

          {activeTab === 'challenges' && (
            <FriendsChallengeView
              studentName={profile.name}
              isStudentVerified={isAccountVerified}
              studyLog={todayStudyLog}
              challenges={friendChallenges}
              streakHistory={streakHistory}
              onAdjustTodayHours={(delta) => syncMyHoursAcrossChallenges(delta, 0)}
              onSetTodayHours={handleSetExactStudyHours}
              onUpdateDailyGoal={(goal) =>
                setTodayStudyLog((prev) => ({
                  ...prev,
                  dailyGoalHours: goal,
                  updatedAt: new Date().toISOString(),
                }))
              }
              onCreateChallenge={handleCreateChallenge}
              onImportChallengeCode={handleImportChallengeCode}
              onUpdateFriendHours={handleUpdateFriendHours}
              onClaimChallengeReward={handleClaimChallengeReward}
              onDeleteChallenge={handleDeleteChallenge}
              onStartOrUpdateSession={handleStartOrUpdateChallengeSession}
              onCompleteChallengeSession={handleCompleteChallengeSession}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              curriculum={curriculum}
              weeklyHours={profile.weeklyHoursAllocation}
              streakDays={profile.streakDays}
              totalXp={profile.totalXp}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              profile={profile}
              streakHistory={streakHistory}
              todayStudyHours={todayStudyLog.hours}
              dailyGoalHours={todayStudyLog.dailyGoalHours}
              completedLessonsCount={curriculum.reduce(
                (acc, s) =>
                  acc + s.chapters.reduce((cAcc, c) => cAcc + c.lessons.filter((l) => l.isCompleted).length, 0),
                0
              )}
              totalLessonsCount={curriculum.reduce(
                (acc, s) => acc + s.chapters.reduce((cAcc, c) => cAcc + c.lessons.length, 0),
                0
              )}
              nextStreakAtMs={streakLastTickMs + STREAK_INTERVAL_MS}
              onUpdateName={(name) => {
                setProfile((p) => ({ ...p, name }));
                onUpdateSession({ ...accountSession, username: name });
              }}
              onUpdateRankTitle={(rankTitle) => setProfile((p) => ({ ...p, rankTitle }))}
              onUpdateGovernorate={(gov) => setProfile((p) => ({ ...p, governorate: gov }))}
              onUpdateDailyGoal={(goalHours) =>
                setTodayStudyLog((prev) => ({
                  ...prev,
                  dailyGoalHours: goalHours,
                  updatedAt: new Date().toISOString(),
                }))
              }
              onUpsertStreakDay={handleUpsertStreakDay}
              accountPhone={accountSession.phone}
              lastSyncedAt={lastSyncedAt}
              onLogout={handleFlushAndLogout}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F6F3EC]/95 dark:bg-[#0A0A0D]/95 backdrop-blur-md border-t border-amber-200/70 dark:border-[#D4AF37]/30 py-1.5 px-3 flex items-center justify-around transition-colors duration-200">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isCurrent = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
                isCurrent
                  ? 'text-[#B28622] dark:text-[#F6E2A6] font-black'
                  : 'text-zinc-600 dark:text-zinc-400 font-medium'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}

        {/* More Menu Modal Trigger for remaining items on mobile */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-zinc-600 dark:text-zinc-400 font-medium"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">المزيد</span>
        </button>
      </nav>

      {/* Mobile More Sheet Modal */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end">
          <div className="bg-white dark:bg-[#19191F] w-full rounded-t-3xl p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto border-t border-amber-200/70 dark:border-[#D4AF37]/35">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#D4AF37]/20">
              <span className="font-extrabold text-sm text-zinc-950 dark:text-[#E8CE88]">باقي أقسام نَهج</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-zinc-500 dark:text-[#E8CE88] hover:bg-zinc-100 dark:hover:bg-[#101014]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isCurrent = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-3 ${
                      isCurrent
                        ? 'btn-luxury-gold text-[#09090B] font-black'
                        : 'bg-zinc-50 dark:bg-[#0D0D10] text-zinc-950 dark:text-[#E8CE88] border-zinc-200 dark:border-[#D4AF37]/25'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pomodoro Focus Timer Modal */}
      {activeFocusSession && (
        <PomodoroTimerModal
          sessionTitle={activeFocusSession.lessonTitle}
          subjectName={activeFocusSession.subjectName}
          initialDurationMinutes={activeFocusSession.durationMinutes || 25}
          onClose={() => setActiveFocusSession(null)}
          onComplete={(elapsedMins) => {
            setProfile((p) => ({ ...p, totalXp: p.totalXp + 25 }));
            handleLogStudyMinutes(elapsedMins);
            recordTodayAchievement({ xpDelta: 25 });
            setActiveFocusSession(null);
          }}
        />
      )}
    </div>
  );
}
