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
} from './types';
import { INITIAL_CURRICULUM } from './data/curriculum';
import {
  EGYPT_GOVERNORATES,
  calculatePrayerTimes,
  PrayerTime,
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
import { PomodoroTimerModal } from './components/PomodoroTimerModal';
import { isNotificationsEnabled, notifyPrayerTime } from './services/notificationService';
import { announcePrayer, announceTask, playBellChime } from './utils/voiceAlerts';
import { playAdhan, isAutoAdhanEnabled } from './utils/adhanPlayer';
import {
  encodeChallengeShareCode,
  decodeChallengeShareCode,
} from './utils/challengeCodes';

export default function App() {

  const [telegramSupportUrl, setTelegramSupportUrl] = useState('https://t.me/Y_lI11');

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('nahj_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nahj_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nahj_theme', 'light');
    }
  }, [isDarkMode]);

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

  // Curriculum State
  const [curriculum, setCurriculum] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('nahj_curriculum');
    return saved ? JSON.parse(saved) : INITIAL_CURRICULUM;
  });

  // Backlog items state
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>(() => {
    const saved = localStorage.getItem('nahj_backlog');
    if (saved) return JSON.parse(saved);
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
    const savedCycle = Number(localStorage.getItem('nahj_tasks_cycle'));
    const saved = localStorage.getItem('nahj_tasks');
    if (saved && !Number.isNaN(savedCycle) && savedCycle === currentCycle) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) {
          return parsed;
        }
      } catch {
        // fallback to fresh cycle tasks
      }
    }
    const freshTasks = getTasksForCycle(currentCycle);
    localStorage.setItem('nahj_tasks_cycle', String(currentCycle));
    localStorage.setItem('nahj_tasks', JSON.stringify(freshTasks));
    return freshTasks;
  });

  // Student Profile state - XP starts at 0 for every student, increments progressively
  const [profile, setProfile] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem('nahj_profile');
    const savedWeight = localStorage.getItem('nahj_student_weight');
    const savedHeight = localStorage.getItem('nahj_student_height');
    const parsed = saved ? JSON.parse(saved) : null;
    return {
      name: parsed?.name || 'طالب نَهج المجتهد 🩺',
      codeMasked: 'مفتوح للجميع',
      streakDays: (parsed?.streakDays !== undefined && parsed?.streakDays !== 18) ? parsed.streakDays : 0,
      totalXp: (parsed?.totalXp !== undefined && parsed?.totalXp !== 2450) ? parsed.totalXp : 0,
      rankTitle: parsed?.rankTitle || 'طبيب المستقبل 🩺',
      governorate: parsed?.governorate || 'القاهرة',
      dailyWaterCups: parsed?.dailyWaterCups ?? 0,
      dailyWin: parsed?.dailyWin || 'أنهيت فصل الدعامة في النبات وحليت 40 سؤالاً بدون أي خطأ!',
      weightKg: parsed?.weightKg || (savedWeight ? Number(savedWeight) : 68),
      heightCm: parsed?.heightCm || (savedHeight ? Number(savedHeight) : 172),
      weeklyHoursAllocation: parsed?.weeklyHoursAllocation || {
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
    const savedTick = Number(localStorage.getItem('nahj_streak_last_tick_ms'));
    if (savedTick && !Number.isNaN(savedTick) && savedTick > 0) {
      return savedTick;
    }
    const now = Date.now();
    localStorage.setItem('nahj_streak_last_tick_ms', String(now));
    return now;
  });

  useEffect(() => {
    const checkStreak24h = () => {
      const now = Date.now();
      const elapsed = now - streakLastTickMs;
      if (elapsed >= STREAK_INTERVAL_MS) {
        const completedCycles = Math.floor(elapsed / STREAK_INTERVAL_MS);
        const nextTick = streakLastTickMs + completedCycles * STREAK_INTERVAL_MS;
        setStreakLastTickMs(nextTick);
        localStorage.setItem('nahj_streak_last_tick_ms', String(nextTick));
        setProfile((prev) => ({
          ...prev,
          streakDays: (prev.streakDays || 0) + completedCycles,
        }));
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
    try {
      const saved = localStorage.getItem('nahj_study_hours_log');
      if (saved) {
        const parsed = JSON.parse(saved) as DailyStudyHoursLog;
        if (parsed && parsed.date === today) {
          return {
            date: today,
            hours: Number(parsed.hours) || 0,
            sessionsCount: Number(parsed.sessionsCount) || 0,
            dailyGoalHours: Number(parsed.dailyGoalHours) || 8,
            updatedAt: parsed.updatedAt || new Date().toISOString(),
          };
        }
        if (parsed && parsed.dailyGoalHours) {
          return {
            date: today,
            hours: 0,
            sessionsCount: 0,
            dailyGoalHours: Number(parsed.dailyGoalHours) || 8,
            updatedAt: new Date().toISOString(),
          };
        }
      }
    } catch {
      // ignore malformed storage
    }
    return {
      date: today,
      hours: 0,
      sessionsCount: 0,
      dailyGoalHours: 8,
      updatedAt: new Date().toISOString(),
    };
  });

  // Friends Study Challenges (Persisted in localStorage under nahj_friend_challenges)
  const [friendChallenges, setFriendChallenges] = useState<FriendChallenge[]>(() => {
    try {
      const saved = localStorage.getItem('nahj_friend_challenges');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore malformed storage
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
        shareCode: encodeChallengeShareCode({
          v: 1,
          id: seedId,
          title: 'ماراثون 6 ساعات فيزياء وكيمياء ⚡',
          challengerName: 'طالب نَهج',
          targetHours: 6,
          challengerHours: 0,
          createdAt: seedCreated,
        }),
        createdAt: seedCreated,
        updatedAt: seedCreated,
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('nahj_study_hours_log', JSON.stringify(todayStudyLog));
  }, [todayStudyLog]);

  useEffect(() => {
    localStorage.setItem('nahj_friend_challenges', JSON.stringify(friendChallenges));
  }, [friendChallenges]);

  const syncMyHoursAcrossChallenges = (deltaHours: number, sessionIncrement = 0) => {
    const today = getTodayIso();
    setTodayStudyLog((prev) => {
      const baseHours = prev.date === today ? prev.hours : 0;
      const baseSessions = prev.date === today ? prev.sessionsCount : 0;
      const nextHours = Math.max(0, Math.min(24, Number((baseHours + deltaHours).toFixed(2))));
      return {
        date: today,
        hours: nextHours,
        sessionsCount: baseSessions + sessionIncrement,
        dailyGoalHours: prev.dailyGoalHours || 8,
        updatedAt: new Date().toISOString(),
      };
    });

    if (deltaHours !== 0) {
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
            shareCode: encodeChallengeShareCode({
              v: 1,
              id: ch.id,
              title: ch.title,
              challengerName: profile.name.split(' ')[0] || 'طالب نَهج',
              targetHours: ch.targetHours,
              challengerHours: updatedHours,
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
  }): FriendChallenge => {
    const id = `ch-${Date.now()}`;
    const now = new Date().toISOString();
    const myInitial = Number(todayStudyLog.hours.toFixed(2));
    const shareCode = encodeChallengeShareCode({
      v: 1,
      id,
      title: input.title,
      challengerName: profile.name.split(' ')[0] || 'طالب نَهج',
      targetHours: input.targetHours,
      challengerHours: myInitial,
      createdAt: now,
    });
    const created: FriendChallenge = {
      id,
      title: input.title,
      friendName: input.friendName,
      targetHours: input.targetHours,
      myHours: myInitial,
      friendHours: Math.max(0, Number(input.friendInitialHours) || 0),
      status: 'active',
      rewardXp: 80,
      rewardClaimed: false,
      shareCode,
      createdAt: now,
      updatedAt: now,
    };
    setFriendChallenges((prev) => [created, ...prev]);
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
      setFriendChallenges((prev) =>
        prev.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                friendHours: decoded.challengerHours,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
      return {
        ok: true,
        message: `تم تحديث تقدم ${existing.friendName} إلى ${decoded.challengerHours.toFixed(1)} ساعة في تحدي «${existing.title}»!`,
      };
    }

    const now = new Date().toISOString();
    const myHoursNow = Number(todayStudyLog.hours.toFixed(2));
    const newCh: FriendChallenge = {
      id: decoded.id,
      title: decoded.title,
      friendName: decoded.challengerName,
      targetHours: decoded.targetHours,
      myHours: myHoursNow,
      friendHours: decoded.challengerHours,
      status: 'active',
      rewardXp: 80,
      rewardClaimed: false,
      shareCode: encodeChallengeShareCode({
        v: 1,
        id: decoded.id,
        title: decoded.title,
        challengerName: profile.name.split(' ')[0] || 'طالب نَهج',
        targetHours: decoded.targetHours,
        challengerHours: myHoursNow,
        createdAt: decoded.createdAt,
      }),
      createdAt: now,
      updatedAt: now,
    };
    setFriendChallenges((prev) => [newCh, ...prev]);
    return {
      ok: true,
      message: `تم الانضمام لتحدي «${decoded.title}» ضد ${decoded.challengerName}! شارك كودك معه الآن.`,
    };
  };

  const handleUpdateFriendHours = (challengeId: string, deltaHours: number) => {
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

  // Prefilled parameters for AI Tutor from other screens
  const [tutorSubject, setTutorSubject] = useState<string>('الأحياء');
  const [tutorPrompt, setTutorPrompt] = useState<string>('');

  // Save to LocalStorage on updates
  useEffect(() => {
    localStorage.setItem('nahj_curriculum', JSON.stringify(curriculum));
  }, [curriculum]);

  useEffect(() => {
    localStorage.setItem('nahj_backlog', JSON.stringify(backlogItems));
  }, [backlogItems]);

  useEffect(() => {
    localStorage.setItem('nahj_tasks', JSON.stringify(dailyTasks));
    localStorage.setItem('nahj_tasks_cycle', String(taskCycleIndex));
  }, [dailyTasks, taskCycleIndex]);

  // Automatic 13-hour task rotation check every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const latestCycle = getCurrentTaskCycleIndex();
      if (latestCycle !== taskCycleIndex) {
        const rotatedTasks = getTasksForCycle(latestCycle);
        setTaskCycleIndex(latestCycle);
        setDailyTasks(rotatedTasks);
        localStorage.setItem('nahj_tasks_cycle', String(latestCycle));
        localStorage.setItem('nahj_tasks', JSON.stringify(rotatedTasks));
        if (voiceAlertsEnabled) {
          announceTask('تجددت مهامك الستة لدورة الـ 13 ساعة الجديدة!');
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [taskCycleIndex, voiceAlertsEnabled]);

  useEffect(() => {
    localStorage.setItem('nahj_profile', JSON.stringify(profile));
  }, [profile]);

  // Fetch Public settings from Server
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.telegramSupportUrl) setTelegramSupportUrl(data.telegramSupportUrl);
      })
      .catch(() => {});
  }, []);

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
    { id: 'curriculum', label: 'المنهج والكبسولات', icon: BookOpen },
    { id: 'backlog', label: 'المتراكم', icon: Layers },
    { id: 'tutor', label: 'أستاذ نَهج', icon: Bot, highlight: true },
    { id: 'quran', label: 'القرآن والأذكار والصلاة', icon: Compass },
    { id: 'nutrition', label: 'الأكل والصحة', icon: Utensils },
    { id: 'exercises', label: 'التمارين', icon: Dumbbell },
    { id: 'mindset', label: 'النفسية والتفكير', icon: Brain },
    { id: 'tasks', label: 'المهام والأوائل', icon: Trophy },
    { id: 'challenges', label: 'تحدي الأصدقاء', icon: Swords },
    { id: 'analytics', label: 'المتابعة والتقييم', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-[#09090B] dark:text-[#F4F4F5] flex flex-col font-['Cairo',sans-serif] transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        profile={profile}
        telegramSupportUrl={telegramSupportUrl}
        onUpdateName={(newName) => setProfile((p) => ({ ...p, name: newName }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />

      {/* Main Layout: Sidebar on Desktop + Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full grow flex gap-6">
        {/* Desktop Sidebar (Obsidian & Crimson aesthetic) */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-2">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-red-900/40 rounded-3xl p-3 shadow-xs sticky top-24 space-y-1 transition-colors duration-200">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isCurrent = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-gradient-to-l from-[#DC2626] to-[#991B1B] text-white shadow-sm shadow-red-600/20'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-red-50/70 dark:hover:bg-zinc-900 hover:text-[#DC2626] dark:hover:text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>

                  {item.highlight && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isCurrent ? 'bg-black text-white' : 'bg-[#DC2626] text-white'
                    }`}>
                      مجاني
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

          {activeTab === 'curriculum' && (
            <CurriculumView
              curriculum={curriculum}
              onToggleLesson={handleToggleLesson}
              onAddCustomLesson={handleAddCustomLesson}
              onAskTutor={handleOpenTutorFromConcept}
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

          {activeTab === 'quran' && (
            <QuranPrayerSection
              currentGovernorate={profile.governorate}
              onUpdateGovernorate={(gov) => setProfile((p) => ({ ...p, governorate: gov }))}
              onAwardBonusXp={handleAwardBonusXp}
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
            />
          )}

          {activeTab === 'challenges' && (
            <FriendsChallengeView
              studentName={profile.name}
              studyLog={todayStudyLog}
              challenges={friendChallenges}
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
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#09090B]/95 backdrop-blur-md border-t border-zinc-200 dark:border-red-900/40 py-1.5 px-3 flex items-center justify-around transition-colors duration-200">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isCurrent = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
                isCurrent
                  ? 'text-[#DC2626] dark:text-red-400 font-black'
                  : 'text-zinc-500 dark:text-zinc-400 font-medium'
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
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-zinc-500 dark:text-zinc-400 font-medium"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">المزيد</span>
        </button>
      </nav>

      {/* Mobile More Sheet Modal */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end">
          <div className="bg-white dark:bg-[#121215] w-full rounded-t-3xl p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto border-t border-zinc-200 dark:border-red-900/40">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-extrabold text-sm text-zinc-950 dark:text-white">باقي أقسام نَهج</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                        ? 'bg-[#DC2626] text-white border-[#DC2626]'
                        : 'bg-zinc-50 dark:bg-[#09090B] text-zinc-950 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800'
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
            setActiveFocusSession(null);
          }}
        />
      )}
    </div>
  );
}
