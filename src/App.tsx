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
} from 'lucide-react';

import {
  Subject,
  StudySession,
  BacklogItem,
  DailyTask,
  StudentProfile,
  LeaderboardUser,
} from './types';
import { INITIAL_CURRICULUM } from './data/curriculum';
import {
  EGYPT_GOVERNORATES,
  calculatePrayerTimes,
  PrayerTime,
} from './data/prayer';
import { INITIAL_DAILY_TASKS, INITIAL_LEADERBOARD } from './data/tasks';

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
import { PomodoroTimerModal } from './components/PomodoroTimerModal';
import { isNotificationsEnabled, notifyPrayerTime } from './services/notificationService';
import { announcePrayer, announceTask, playBellChime } from './utils/voiceAlerts';
import { playAdhan, isAutoAdhanEnabled } from './utils/adhanPlayer';

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

  // Daily Tasks state
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(() => {
    const saved = localStorage.getItem('nahj_tasks');
    return saved ? JSON.parse(saved) : INITIAL_DAILY_TASKS;
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
  }, [dailyTasks]);

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
            setActiveFocusSession(null);
          }}
        />
      )}
    </div>
  );
}
