import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
  Clock,
  Plus,
  Minus,
  Copy,
  Check,
  Trophy,
  Flame,
  Share2,
  UserPlus,
  Trash2,
  Sparkles,
  Target,
  Award,
  Download,
  AlertCircle,
  Users,
  Play,
  RotateCcw,
  CheckCircle2,
  Timer,
  BarChart3,
  TrendingUp,
  MonitorCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { DailyStudyHoursLog, FriendChallenge, StreakHistoryEntry } from '../types';
import {
  buildChallengeShareMessage,
  buildDailyHoursShareMessage,
  computeSessionTimerMetrics,
  decodeChallengeShareCode,
  formatMinutesSeconds,
} from '../utils/challengeCodes';
import { playBellChime, announceSessionComplete } from '../utils/voiceAlerts';
import { useWakeLock } from '../utils/useWakeLock';
import {
  buildAggregate7DaySeries,
  buildChallenge7DaySeries,
  ChallengeComparisonChartPoint,
} from '../utils/challengeCharts';

interface FriendsChallengeViewProps {
  studentName: string;
  studyLog: DailyStudyHoursLog;
  challenges: FriendChallenge[];
  streakHistory?: Record<string, StreakHistoryEntry>;
  onAdjustTodayHours: (deltaHours: number) => void;
  onSetTodayHours: (exactHours: number) => void;
  onUpdateDailyGoal: (goalHours: number) => void;
  onCreateChallenge: (input: {
    title: string;
    friendName: string;
    targetHours: number;
    friendInitialHours?: number;
    sessionDurationMinutes?: number;
    startSessionNow?: boolean;
  }) => FriendChallenge;
  onImportChallengeCode: (code: string) => {
    ok: boolean;
    challengeId?: string;
    message: string;
  };
  onUpdateFriendHours: (challengeId: string, deltaHours: number) => void;
  onClaimChallengeReward: (challengeId: string) => void;
  onDeleteChallenge: (challengeId: string) => void;
  onStartOrUpdateSession: (
    challengeId: string,
    options?: {
      durationMinutes?: number;
      startNow?: boolean;
      reset?: boolean;
      syncStartedAt?: string | null;
    }
  ) => void;
  onCompleteChallengeSession: (challengeId: string, elapsedMinutes: number) => void;
}

const CHALLENGE_PRESETS = [
  'ماراثون 6 ساعات فيزياء وكيمياء ⚡',
  'تحدي 8 ساعات تركيز بدون تشتيت 🔥',
  'سباق تصفية متراكم الأحياء والجيولوجيا 🧬',
  'تحدي 4 ساعات حل امتحانات شاملة 📝',
];

const MiniComparisonTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value?: number; dataKey?: string }>;
  label?: string;
  myLabel: string;
  friendLabel: string;
}> = ({ active, payload, label, myLabel, friendLabel }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = (payload[0] as unknown as { payload?: ChallengeComparisonChartPoint })?.payload;
  const myVal = payload.find((p) => p.dataKey === 'myHours')?.value ?? point?.myHours ?? 0;
  const friendVal =
    payload.find((p) => p.dataKey === 'friendHours')?.value ?? point?.friendHours ?? 0;

  return (
    <div
      dir="rtl"
      className="bg-[#08080A]/95 text-[#F4EFE6] border border-[#D4AF37]/45 rounded-xl px-3 py-2 shadow-lg text-[11px] font-['Cairo',sans-serif] space-y-1"
    >
      <div className="font-black text-[#E8CE88] border-b border-[#D4AF37]/20 pb-1">
        {point?.fullDateLabel || label}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-[#F3DFA2] font-bold">
          <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
          {myLabel}:
        </span>
        <span className="font-mono font-black text-[#F4EFE6] tabular-nums" dir="ltr">
          {Number(myVal).toFixed(1)} h
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-slate-300 font-bold">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          {friendLabel}:
        </span>
        <span className="font-mono font-black text-[#F4EFE6] tabular-nums" dir="ltr">
          {Number(friendVal).toFixed(1)} h
        </span>
      </div>
    </div>
  );
};

export const FriendsChallengeView: React.FC<FriendsChallengeViewProps> = ({
  studentName,
  studyLog,
  challenges,
  streakHistory,
  onAdjustTodayHours,
  onSetTodayHours,
  onUpdateDailyGoal,
  onCreateChallenge,
  onImportChallengeCode,
  onUpdateFriendHours,
  onClaimChallengeReward,
  onDeleteChallenge,
  onStartOrUpdateSession,
  onCompleteChallengeSession,
}) => {
  // Custom study hours editor
  const [customHoursInput, setCustomHoursInput] = useState<string>('');
  const [copiedDailyReport, setCopiedDailyReport] = useState(false);

  // Create challenge form
  const [challengeTitle, setChallengeTitle] = useState(CHALLENGE_PRESETS[0]);
  const [friendName, setFriendName] = useState('');
  const [targetHours, setTargetHours] = useState<number>(6);
  const [friendInitialHours, setFriendInitialHours] = useState<number>(0);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(50);
  const [startSessionNow, setStartSessionNow] = useState<boolean>(true);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);

  // Import friend challenge code form
  const [importCodeInput, setImportCodeInput] = useState('');
  const [importStatus, setImportStatus] = useState<{ ok: boolean; text: string } | null>(null);

  // Copy & delete states per challenge card
  const [copiedChallengeId, setCopiedChallengeId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished'>('all');

  // Active Challenge Session Room state & 1-second live clock
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    const running = challenges.find((c) => Boolean(c.sessionStartedAt));
    return running ? running.id : challenges[0]?.id || null;
  });
  const [sessionAlertedMap, setSessionAlertedMap] = useState<Record<string, boolean>>({});
  const [roomSyncFeedback, setRoomSyncFeedback] = useState<string | null>(null);
  const roomRef = useRef<HTMLDivElement | null>(null);

  // Overview mini-chart UI state
  const [chartStyle, setChartStyle] = useState<'area' | 'bar'>('area');
  const [chartTargetId, setChartTargetId] = useState<string>('all');

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeRoomChallenge =
    challenges.find((c) => c.id === activeRoomId) ||
    challenges.find((c) => Boolean(c.sessionStartedAt)) ||
    challenges[0] ||
    null;

  const activeTimer = activeRoomChallenge
    ? computeSessionTimerMetrics(
        activeRoomChallenge.sessionStartedAt,
        activeRoomChallenge.sessionDurationMinutes || 50,
        nowMs
      )
    : null;

  const anyChallengeTimerRunning = challenges.some((ch) => {
    const metrics = computeSessionTimerMetrics(
      ch.sessionStartedAt,
      ch.sessionDurationMinutes || 50,
      nowMs
    );
    return metrics.hasStarted && !metrics.isFinished;
  });

  // Keep screen awake whenever a challenge session countdown is actively running
  const { isSupported: isWakeLockSupported, isWakeLocked } = useWakeLock(anyChallengeTimerRunning);

  // Bell chime & announcement when active session timer finishes
  useEffect(() => {
    if (
      activeRoomChallenge &&
      activeTimer?.hasStarted &&
      activeTimer.isFinished &&
      !sessionAlertedMap[activeRoomChallenge.id]
    ) {
      setSessionAlertedMap((prev) => ({ ...prev, [activeRoomChallenge.id]: true }));
      playBellChime();
      announceSessionComplete(activeRoomChallenge.title);
    }
  }, [activeRoomChallenge, activeTimer?.hasStarted, activeTimer?.isFinished, sessionAlertedMap]);

  // Poll server room state every 8s when inside a challenge room so peers stay synced
  useEffect(() => {
    if (!activeRoomChallenge) return;
    let cancelled = false;

    const syncRoom = async () => {
      try {
        const res = await fetch(`/api/challenges/room/${encodeURIComponent(activeRoomChallenge.id)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const remoteStartedAt = data?.room?.sessionStartedAt || null;
        if (
          remoteStartedAt &&
          !activeRoomChallenge.sessionStartedAt &&
          remoteStartedAt !== activeRoomChallenge.sessionStartedAt
        ) {
          onStartOrUpdateSession(activeRoomChallenge.id, {
            durationMinutes: data.room.sessionDurationMinutes || activeRoomChallenge.sessionDurationMinutes || 50,
            syncStartedAt: remoteStartedAt,
          });
        }
      } catch {
        // offline or serverless — wall-clock share code keeps working seamlessly
      }
    };

    const interval = setInterval(syncRoom, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeRoomChallenge?.id, activeRoomChallenge?.sessionStartedAt]);

  const dailyPct = Math.min(
    100,
    Math.round((studyLog.hours / Math.max(1, studyLog.dailyGoalHours)) * 100)
  );

  const activeChallengesCount = challenges.filter((c) => c.status === 'active').length;
  const wonChallengesCount = challenges.filter((c) => c.status === 'won').length;

  const filteredChallenges = challenges.filter((c) => {
    if (statusFilter === 'active') return c.status === 'active';
    if (statusFilter === 'finished') return c.status !== 'active';
    return true;
  });

  const handleCopyDailyReport = () => {
    const text = buildDailyHoursShareMessage(
      studentName,
      studyLog.hours,
      studyLog.dailyGoalHours,
      studyLog.sessionsCount
    );
    navigator.clipboard.writeText(text);
    setCopiedDailyReport(true);
    setTimeout(() => setCopiedDailyReport(false), 2500);
  };

  const dailyWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    buildDailyHoursShareMessage(
      studentName,
      studyLog.hours,
      studyLog.dailyGoalHours,
      studyLog.sessionsCount
    )
  )}`;

  const handleSetExactHours = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(customHoursInput);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 24) return;
    onSetTodayHours(parsed);
    setCustomHoursInput('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim()) {
      setCreateFeedback('يرجى كتابة اسم الصديق أو الزميل أولاً.');
      return;
    }
    const created = onCreateChallenge({
      title: challengeTitle.trim() || CHALLENGE_PRESETS[0],
      friendName: friendName.trim(),
      targetHours,
      friendInitialHours,
      sessionDurationMinutes,
      startSessionNow,
    });
    setActiveRoomId(created.id);
    setFriendName('');
    setFriendInitialHours(0);
    setCreateFeedback(
      startSessionNow
        ? `تم إنشاء التحدي مع ${created.friendName} وبدأت الجلسة الآن (${sessionDurationMinutes} دقيقة)! شارك الكود ليدخل زميلك على نفس الدقيقة.`
        : `تم إنشاء التحدي مع ${created.friendName} بنجاح! اضغط «دخول الجلسة» أو شارك الكود.`
    );
    setTimeout(() => setCreateFeedback(null), 6000);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCodeInput.trim()) return;
    const preview = decodeChallengeShareCode(importCodeInput);
    if (!preview) {
      setImportStatus({
        ok: false,
        text: 'الكود غير صالح أو غير مكتمل. تأكد من لصق الكود الذي يبدأ بـ NAHJ-CH: كاملاً.',
      });
      return;
    }
    const result = onImportChallengeCode(importCodeInput);
    setImportStatus({ ok: result.ok, text: result.message });
    if (result.ok) {
      if (result.challengeId) {
        setActiveRoomId(result.challengeId);
      }
      setImportCodeInput('');
    }
  };

  const handleEnterChallengeSession = (challenge: FriendChallenge) => {
    setActiveRoomId(challenge.id);
    if (!challenge.sessionStartedAt) {
      setSessionAlertedMap((prev) => ({ ...prev, [challenge.id]: false }));
      onStartOrUpdateSession(challenge.id, {
        durationMinutes: challenge.sessionDurationMinutes || 50,
        startNow: true,
      });
    }
    setTimeout(() => {
      roomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const handleCompleteRoomSession = () => {
    if (!activeRoomChallenge || !activeTimer) return;
    const elapsedMins = Math.max(
      1,
      Math.round(activeTimer.elapsedSeconds / 60) || activeTimer.durationMinutes
    );
    onCompleteChallengeSession(activeRoomChallenge.id, elapsedMins);
    setSessionAlertedMap((prev) => ({ ...prev, [activeRoomChallenge.id]: false }));
    confetti({
      particleCount: 85,
      spread: 70,
      origin: { y: 0.6 },
    });
    setRoomSyncFeedback(
      `أحسنت! تم احتساب ${elapsedMins} دقيقة مذاكرة في تحدي «${activeRoomChallenge.title}» وإضافة +25 XP.`
    );
    setTimeout(() => setRoomSyncFeedback(null), 5000);
  };

  const handleCopyChallenge = (challenge: FriendChallenge) => {
    const shareText = buildChallengeShareMessage(challenge, studentName);
    navigator.clipboard.writeText(shareText);
    setCopiedChallengeId(challenge.id);
    setTimeout(() => setCopiedChallengeId(null), 2500);
  };

  const handleClaimReward = (challenge: FriendChallenge) => {
    onClaimChallengeReward(challenge.id);
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Hero Banner */}
      <div className="bg-gradient-to-l from-[#1E1E26] via-[#121217] to-[#08080A] text-[#F4EFE6] rounded-3xl p-6 sm:p-7 shadow-lg border border-[#D4AF37]/45 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#08080A]/85 rounded-full text-xs font-black text-[#E8CE88] border border-[#D4AF37]/35">
              <Swords className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>ساحة المنافسة الإيجابية • محفوظة في جهازك</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#F6E2A6]">
              تحدي الأصدقاء وساعات المذاكرة اليومية ⚔️
            </h1>
            <p className="text-xs sm:text-sm text-[#E5DEC9] max-w-2xl leading-relaxed">
              سجّل ساعات مذاكرتك اليوم (أو دع مؤقت بومودورو يسجلها لك تلقائياً)، أنشئ تحدياً مع زميلك، وشارك كود التحدي لمتابعة التقدم وجهاً لوجه وحصد نقاط XP!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 bg-[#09090C]/90 p-3 rounded-2xl border border-[#D4AF37]/35 shrink-0">
            <div className="text-center px-2.5 border-l border-[#D4AF37]/20">
              <span className="text-[10px] text-[#B5AA92] block">ساعات اليوم</span>
              <span className="text-lg sm:text-xl font-black text-[#F3DFA2] tabular-nums">
                {studyLog.hours.toFixed(1)} س
              </span>
            </div>
            <div className="text-center px-2.5 border-l border-[#D4AF37]/20">
              <span className="text-[10px] text-[#B5AA92] block">تحديات نشطة</span>
              <span className="text-lg sm:text-xl font-black text-[#F4EFE6] tabular-nums">
                {activeChallengesCount}
              </span>
            </div>
            <div className="text-center px-2.5">
              <span className="text-[10px] text-[#B5AA92] block">انتصاراتك</span>
              <span className="text-lg sm:text-xl font-black text-emerald-400 tabular-nums">
                {wonChallengesCount} 🏆
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Shared Challenge Session Room (Exact Current Minute & Countdown) */}
      {activeRoomChallenge && activeTimer && (
        <section
          ref={roomRef}
          className="bg-white dark:bg-[#19191F] border-2 border-[#D4AF37]/50 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 transition-colors"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-[#D4AF37]/25">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
                <span className="inline-flex items-center gap-1.5 text-[#9A7218] dark:text-[#E8CE88]">
                  <Timer className="w-4 h-4 text-[#D4AF37]" />
                  <span>غرفة مؤقت الجلسة المشتركة</span>
                </span>
                <span aria-hidden="true" className="text-zinc-400">·</span>
                <span className="text-zinc-600 dark:text-[#B5AA92]">
                  ضد {activeRoomChallenge.friendName}
                </span>
                {activeTimer.hasStarted && !activeTimer.isFinished && (
                  <>
                    <span aria-hidden="true" className="text-zinc-400">·</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                      <MonitorCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isWakeLocked || isWakeLockSupported
                          ? 'الشاشة لن تفصل أثناء الجلسة'
                          : 'وضع التركيز المستمر نشط'}
                      </span>
                    </span>
                  </>
                )}
                {challenges.length > 1 && (
                  <>
                    <span aria-hidden="true" className="text-zinc-400">·</span>
                    <select
                      aria-label="اختيار تحدي الجلسة"
                      value={activeRoomChallenge.id}
                      onChange={(e) => setActiveRoomId(e.target.value)}
                      className="bg-zinc-100 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-lg px-2 py-0.5 text-[11px] font-bold text-zinc-900 dark:text-[#E8CE88] focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                    >
                      {challenges.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.friendName})
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-zinc-950 dark:text-[#F4EFE6]">
                {activeRoomChallenge.title}
              </h2>
            </div>

            {/* Prominent Current Minute Indicator */}
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/35 rounded-2xl px-4 py-3 shrink-0">
              <div className="text-right">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] block">
                  توقيت الجلسة الحالي لكما
                </span>
                {activeTimer.hasStarted ? (
                  activeTimer.isFinished ? (
                    <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      اكتملت الدقيقة {activeTimer.durationMinutes} من {activeTimer.durationMinutes} ✓
                    </span>
                  ) : (
                    <span className="text-base sm:text-lg font-black text-[#9A7218] dark:text-[#F3DFA2] tabular-nums">
                      الدقيقة {activeTimer.currentMinute} من أصل {activeTimer.durationMinutes} دقيقة
                    </span>
                  )
                ) : (
                  <span className="text-sm sm:text-base font-black text-zinc-800 dark:text-[#E8CE88] tabular-nums">
                    جاهزة للبدء ({activeTimer.durationMinutes} دقيقة)
                  </span>
                )}
              </div>
              <div className="h-9 w-px bg-zinc-200 dark:bg-[#D4AF37]/25" />
              <div className="text-center font-mono tabular-nums" dir="ltr">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-[#B5AA92] block">
                  المتبقي
                </span>
                <span className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F6E2A6]">
                  {formatMinutesSeconds(activeTimer.remainingSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* Live Elapsed/Remaining Bar & Session Controls */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-zinc-600 dark:text-[#B5AA92] tabular-nums">
              <span>
                الوقت المنقضي:{' '}
                <strong className="font-mono text-zinc-950 dark:text-[#F4EFE6]" dir="ltr">
                  {formatMinutesSeconds(activeTimer.elapsedSeconds)}
                </strong>
              </span>
              <span>
                نسبة الجلسة: <strong className="text-[#9A7218] dark:text-[#F3DFA2]">{activeTimer.progressPct}%</strong>
              </span>
              <span>
                المدة الكلية: <strong className="text-zinc-950 dark:text-[#F4EFE6]">{activeTimer.durationMinutes} دقيقة</strong>
              </span>
            </div>

            <div className="w-full h-3 bg-zinc-200 dark:bg-[#09090C] rounded-full overflow-hidden border border-transparent dark:border-[#D4AF37]/20">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activeTimer.isFinished
                    ? 'bg-emerald-600'
                    : 'bg-gradient-to-l from-[#F6E2A6] via-[#D4AF37] to-[#B58722]'
                }`}
                style={{ width: `${activeTimer.progressPct}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Duration quick selector (only editable when not running or resetting) */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92] ml-1">
                  مدة الجلسة:
                </span>
                {[25, 45, 50, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    disabled={activeTimer.hasStarted && !activeTimer.isFinished}
                    onClick={() =>
                      onStartOrUpdateSession(activeRoomChallenge.id, {
                        durationMinutes: mins,
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer tabular-nums disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeTimer.durationMinutes === mins
                        ? 'btn-luxury-gold'
                        : 'bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-[#B5AA92] border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37]'
                    }`}
                  >
                    {mins} د
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {!activeTimer.hasStarted ? (
                  <button
                    type="button"
                    onClick={() => handleEnterChallengeSession(activeRoomChallenge)}
                    className="px-4 py-2 btn-luxury-gold rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>بدء مؤقت الجلسة الآن</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCompleteRoomSession}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {activeTimer.isFinished
                          ? 'إتمام الجلسة واحتساب الساعات (+25 XP)'
                          : 'إنهاء واحتساب الدقائق المنجزة'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSessionAlertedMap((prev) => ({
                          ...prev,
                          [activeRoomChallenge.id]: false,
                        }));
                        onStartOrUpdateSession(activeRoomChallenge.id, { reset: true });
                      }}
                      className="px-3 py-2 bg-zinc-100 dark:bg-[#09090C] hover:bg-zinc-200 dark:hover:bg-[#101014] border border-zinc-300 dark:border-[#D4AF37]/30 text-zinc-700 dark:text-[#E8CE88] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة ضبط</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleCopyChallenge(activeRoomChallenge)}
                  className="px-3.5 py-2 bg-white dark:bg-[#09090C] hover:bg-amber-50 dark:hover:bg-[#101014] border border-amber-200 dark:border-[#D4AF37]/35 text-[#9A7218] dark:text-[#E8CE88] rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedChallengeId === activeRoomChallenge.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تم نسخ كود الجلسة ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>مشاركة الكود بنفس الدقيقة</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {roomSyncFeedback && (
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-2 rounded-xl">
                ✅ {roomSyncFeedback}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Daily Study Hours Tracker + Share Card */}
      <div className="bg-white dark:bg-[#19191F] border-2 border-amber-200/80 dark:border-[#D4AF37]/35 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#09090C] border border-[#D4AF37]/45 text-[#E8CE88] flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5 text-[#F3DFA2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-950 dark:text-[#F4EFE6]">
                سجل ساعات مذاكرتك اليوم ({studyLog.date})
              </h2>
              <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
                كل ساعة تضيفها تُحدّث تقدمك تلقائياً داخل جميع تحدياتك النشطة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-zinc-600 dark:text-[#B5AA92]">
              هدف اليوم:
            </label>
            <select
              value={studyLog.dailyGoalHours}
              onChange={(e) => onUpdateDailyGoal(Number(e.target.value))}
              className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl px-2.5 py-1 text-xs font-black text-[#9A7218] dark:text-[#E8CE88] focus:outline-none focus:border-[#D4AF37]"
            >
              {[4, 5, 6, 7, 8, 9, 10, 12].map((h) => (
                <option key={h} value={h}>
                  {h} ساعات
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Big Hours Meter + Quick Step Buttons */}
        <div className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-[#9A7218] dark:text-[#F3DFA2] font-mono tabular-nums" dir="ltr">
                {studyLog.hours.toFixed(1)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-zinc-600 dark:text-[#B5AA92]">
                من {studyLog.dailyGoalHours} ساعات ({dailyPct}%) • {studyLog.sessionsCount} جلسة بومودورو
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onAdjustTodayHours(-0.5)}
                disabled={studyLog.hours <= 0}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-300 dark:border-[#D4AF37]/30 text-xs font-black text-zinc-700 dark:text-[#E8CE88] hover:border-[#D4AF37] disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <Minus className="w-3 h-3" />
                <span>0.5 س</span>
              </button>
              {[0.5, 1, 2].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => onAdjustTodayHours(inc)}
                  className="px-3 py-1.5 rounded-xl btn-luxury-gold text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{inc} س</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-3 bg-zinc-200 dark:bg-[#19191F] rounded-full overflow-hidden border border-transparent dark:border-[#D4AF37]/20">
            <div
              className="h-full bg-gradient-to-l from-[#F6E2A6] via-[#D4AF37] to-[#B58722] transition-all duration-300 rounded-full"
              style={{ width: `${dailyPct}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Manual Exact Hours Input */}
            <form onSubmit={handleSetExactHours} className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={customHoursInput}
                onChange={(e) => setCustomHoursInput(e.target.value)}
                placeholder="تعديل دقيق (مثال: 5.5)"
                className="w-40 bg-white dark:bg-[#19191F] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-zinc-900 dark:bg-[#23232C] hover:bg-black text-white dark:text-[#E8CE88] border border-transparent dark:border-[#D4AF37]/30 rounded-xl text-xs font-black cursor-pointer"
              >
                تثبيت الرقم
              </button>
            </form>

            {/* Share Daily Hours Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyDailyReport}
                className="px-3.5 py-2 bg-white dark:bg-[#19191F] hover:bg-amber-50 dark:hover:bg-[#101014] border border-amber-200 dark:border-[#D4AF37]/35 rounded-xl text-xs font-black text-[#9A7218] dark:text-[#E8CE88] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedDailyReport ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-400">تم نسخ التقرير!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ ساعات اليوم للمشاركة</span>
                  </>
                )}
              </button>

              <a
                href={dailyWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>تحدَّ أصدقاءك على واتساب</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Create Challenge + Import Friend Code Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card A: Create New Challenge */}
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors duration-200"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/35 text-[#B58722] dark:text-[#E8CE88] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-zinc-950 dark:text-[#F4EFE6]">
                إنشاء تحدي جديد مع زميل
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92]">
                تولّد لك المنصة كود تحدي فوري ترسله لزميلك
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-extrabold text-zinc-700 dark:text-[#E8CE88] block mb-1">
                اسم الصديق / الزميل المتحدي:
              </label>
              <input
                type="text"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="مثال: يوسف طارق أو سارة محمود"
                className="w-full bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl px-3.5 py-2 text-xs font-bold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-zinc-700 dark:text-[#E8CE88] block mb-1">
                عنوان التحدي (اختر أو اكتب بنفسك):
              </label>
              <input
                type="text"
                value={challengeTitle}
                onChange={(e) => setChallengeTitle(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl px-3.5 py-2 text-xs font-bold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CHALLENGE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setChallengeTitle(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      challengeTitle === preset
                        ? 'bg-amber-50 dark:bg-[#09090C] border-[#D4AF37] text-[#9A7218] dark:text-[#F3DFA2]'
                        : 'bg-zinc-50 dark:bg-[#0E0E12] border-zinc-200 dark:border-[#D4AF37]/20 text-zinc-600 dark:text-[#B5AA92]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-extrabold text-zinc-700 dark:text-[#E8CE88] block mb-1">
                  هدف التحدي (ساعات):
                </label>
                <select
                  value={targetHours}
                  onChange={(e) => setTargetHours(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl px-3 py-2 text-xs font-black text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12].map((h) => (
                    <option key={h} value={h}>
                      {h} ساعات
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-zinc-700 dark:text-[#E8CE88] block mb-1">
                  مدة الجلسة الواحدة:
                </label>
                <select
                  value={sessionDurationMinutes}
                  onChange={(e) => setSessionDurationMinutes(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl px-3 py-2 text-xs font-black text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37] tabular-nums"
                >
                  {[25, 45, 50, 60, 90, 120].map((m) => (
                    <option key={m} value={m}>
                      {m} دقيقة
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-zinc-700 dark:text-[#E8CE88] block mb-1">
                  ساعات زميلك المبدئية:
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={friendInitialHours}
                  onChange={(e) => setFriendInitialHours(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl px-3 py-2 text-xs font-bold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-[#E5DEC9] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={startSessionNow}
                onChange={(e) => setStartSessionNow(e.target.checked)}
                className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
              />
              <span>بدء مؤقت الجلسة الآن فور الإنشاء ليظهر لزميلك في أي دقيقة أنتما</span>
            </label>
          </div>

          {createFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200">
              ✅ {createFeedback}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 btn-luxury-gold rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Swords className="w-4 h-4" />
            <span>بدء التحدي وتوليد كود المشاركة</span>
          </button>
        </form>

        {/* Card B: Import / Sync Friend Challenge Code */}
        <form
          onSubmit={handleImportSubmit}
          className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 transition-colors duration-200"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/35 text-[#B58722] dark:text-[#E8CE88] flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-950 dark:text-[#F4EFE6]">
                  قبول تحدي أو تحديث ساعات صديق بكود
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92]">
                  الصق رسالة التحدي أو الكود الذي يبدأ بـ <span className="font-mono">NAHJ-CH:</span> ليُحدّث التقدم فوراً
                </p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-zinc-700 dark:text-[#E8CE88] block mb-1.5">
                كود التحدي المُرسل من زميلك:
              </label>
              <textarea
                rows={4}
                value={importCodeInput}
                onChange={(e) => {
                  setImportCodeInput(e.target.value);
                  if (importStatus) setImportStatus(null);
                }}
                placeholder="الصق هنا رسالة التحدي كاملة أو الكود (NAHJ-CH:...)..."
                className="w-full bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37] resize-none"
                dir="auto"
              />
            </div>

            {importStatus && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
                  importStatus.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
                }`}
              >
                {importStatus.ok ? (
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                )}
                <span>{importStatus.text}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!importCodeInput.trim()}
            className="w-full py-2.5 btn-luxury-gold disabled:opacity-40 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Users className="w-4 h-4" />
            <span>استيراد التحدي وتحديث الساعات الآن</span>
          </button>
        </form>
      </div>

      {/* 7-Day Comparative Progress Mini-Chart (You vs Friends) */}
      {challenges.length > 0 && (() => {
        const selectedOverviewChallenge =
          chartTargetId === 'all'
            ? null
            : challenges.find((c) => c.id === chartTargetId) || null;
        const overviewSeries = selectedOverviewChallenge
          ? buildChallenge7DaySeries(
              selectedOverviewChallenge,
              streakHistory,
              studyLog.hours
            )
          : buildAggregate7DaySeries(challenges, streakHistory, studyLog.hours);
        const myWeeklyTotal = Number(
          overviewSeries.reduce((acc, pt) => acc + pt.myHours, 0).toFixed(1)
        );
        const friendWeeklyTotal = Number(
          overviewSeries.reduce((acc, pt) => acc + pt.friendHours, 0).toFixed(1)
        );
        const weeklyDiff = Number((myWeeklyTotal - friendWeeklyTotal).toFixed(1));
        const opponentLabel = selectedOverviewChallenge
          ? selectedOverviewChallenge.friendName
          : challenges.length > 1
          ? 'متوسط الأصدقاء'
          : challenges[0].friendName;
        const firstName = studentName.split(' ')[0] || 'أنت';

        return (
          <section className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/35 text-[#B58722] dark:text-[#E8CE88] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-zinc-950 dark:text-[#E8CE88]">
                    مقارنة الأداء الأسبوعي: أنت ضد {opponentLabel}
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92]">
                    تطور ساعات المذاكرة خلال آخر 7 أيام حتى اللحظة
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {challenges.length > 1 && (
                  <select
                    aria-label="اختيار منافس للرسم البياني"
                    value={chartTargetId}
                    onChange={(e) => setChartTargetId(e.target.value)}
                    className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-900 dark:text-[#E8CE88] focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="all">كل التحديات (المتوسط)</option>
                    {challenges.map((c) => (
                      <option key={c.id} value={c.id}>
                        ضد {c.friendName}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setChartStyle('area')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors ${
                      chartStyle === 'area'
                        ? 'btn-luxury-gold'
                        : 'text-zinc-600 dark:text-[#B5AA92]'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    <span>منحنى</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartStyle('bar')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors ${
                      chartStyle === 'bar'
                        ? 'btn-luxury-gold'
                        : 'text-zinc-600 dark:text-[#B5AA92]'
                    }`}
                  >
                    <BarChart3 className="w-3 h-3" />
                    <span>أعمدة</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Compact Weekly Summary Strip + Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 font-extrabold text-zinc-900 dark:text-[#F4EFE6] tabular-nums">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                  <span>أنت ({firstName}):</span>
                  <strong className="text-[#9A7218] dark:text-[#F3DFA2] font-mono" dir="ltr">
                    {myWeeklyTotal}h
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1.5 font-extrabold text-zinc-900 dark:text-[#F4EFE6] tabular-nums">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span>{opponentLabel}:</span>
                  <strong className="text-slate-600 dark:text-slate-300 font-mono" dir="ltr">
                    {friendWeeklyTotal}h
                  </strong>
                </span>
              </div>

              <span
                className={`text-[11px] font-black tabular-nums ${
                  weeklyDiff >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-[#9A7218] dark:text-[#E8CE88]'
                }`}
              >
                {weeklyDiff >= 0
                  ? `متفوق أسبوعياً بـ +${weeklyDiff} ساعة`
                  : `متأخر أسبوعياً بـ ${Math.abs(weeklyDiff)} ساعة`}
              </span>
            </div>

            {/* Recharts Interactive Mini-Chart */}
            <div dir="ltr" className="w-full h-44 pt-1">
              <ResponsiveContainer width="100%" height="100%">
                {chartStyle === 'area' ? (
                  <AreaChart
                    data={overviewSeries}
                    margin={{ top: 8, right: 10, left: -24, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="nahjMyArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="nahjFriendArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(212, 175, 55, 0.14)"
                    />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fontSize: 10, fill: '#B5AA92', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#B5AA92' }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      content={
                        <MiniComparisonTooltip
                          myLabel={`أنت (${firstName})`}
                          friendLabel={opponentLabel}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="friendHours"
                      stroke="#94A3B8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#nahjFriendArea)"
                      activeDot={{ r: 4, fill: '#94A3B8' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="myHours"
                      stroke="#E8CE88"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#nahjMyArea)"
                      activeDot={{ r: 5, fill: '#F3DFA2' }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={overviewSeries}
                    margin={{ top: 8, right: 10, left: -24, bottom: 0 }}
                    barGap={3}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(212, 175, 55, 0.14)"
                    />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fontSize: 10, fill: '#B5AA92', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#B5AA92' }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(212, 175, 55, 0.08)' }}
                      content={
                        <MiniComparisonTooltip
                          myLabel={`أنت (${firstName})`}
                          friendLabel={opponentLabel}
                        />
                      }
                    />
                    <Bar
                      dataKey="myHours"
                      fill="#D4AF37"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={14}
                    />
                    <Bar
                      dataKey="friendHours"
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={14}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </section>
        );
      })()}

      {/* Challenges List Header & Filter */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#C59B27] dark:text-[#D4AF37]" />
            <h2 className="text-base sm:text-lg font-black text-zinc-950 dark:text-[#E8CE88]">
              سجل التحديات والمنافسات ({filteredChallenges.length})
            </h2>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-[#19191F] p-1 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'active', label: 'النشطة' },
              { id: 'finished', label: 'المنتهية' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'btn-luxury-gold'
                    : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-[#F3DFA2]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredChallenges.length === 0 ? (
          <div className="bg-white dark:bg-[#19191F] border border-dashed border-zinc-300 dark:border-[#D4AF37]/35 rounded-3xl p-8 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-[#D4AF37] mx-auto" />
            <h3 className="text-sm font-black text-zinc-950 dark:text-[#E8CE88]">
              لا توجد تحديات في هذا التصنيف حالياً
            </h3>
            <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
              أنشئ تحدياً جديداً بالأعلى أو استقبل كود تحدي من صديقك لتبدأ المنافسة!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChallenges.map((challenge) => {
              const myPct = Math.min(
                100,
                Math.round((challenge.myHours / Math.max(1, challenge.targetHours)) * 100)
              );
              const friendPct = Math.min(
                100,
                Math.round((challenge.friendHours / Math.max(1, challenge.targetHours)) * 100)
              );
              const diff = Number((challenge.myHours - challenge.friendHours).toFixed(1));
              const canClaimReward =
                !challenge.rewardClaimed && challenge.myHours >= challenge.targetHours;
              const cardTimer = computeSessionTimerMetrics(
                challenge.sessionStartedAt,
                challenge.sessionDurationMinutes || 50,
                nowMs
              );
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
                buildChallengeShareMessage(challenge, studentName)
              )}`;

              return (
                <div
                  key={challenge.id}
                  className={`bg-white dark:bg-[#19191F] border-2 rounded-3xl p-5 shadow-xs space-y-4 transition-all ${
                    challenge.rewardClaimed
                      ? 'border-emerald-300 dark:border-emerald-800/70'
                      : diff >= 0
                      ? 'border-amber-200 dark:border-[#D4AF37]/45'
                      : 'border-zinc-300 dark:border-slate-500/50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-[#09090C] text-[#9A7218] dark:text-[#E8CE88] border border-amber-200 dark:border-[#D4AF37]/35 flex items-center gap-1">
                          <Target className="w-3 h-3 text-[#D4AF37]" />
                          <span>الهدف: {challenge.targetHours} ساعات</span>
                        </span>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-50 dark:bg-[#09090C] text-amber-800 dark:text-[#F3DFA2] border border-amber-200 dark:border-[#D4AF37]/35 tabular-nums">
                          +{challenge.rewardXp} XP
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-zinc-950 dark:text-[#F4EFE6] mt-2">
                        {challenge.title}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
                        المنافس: <strong className="text-zinc-900 dark:text-[#E8CE88]">{challenge.friendName}</strong>
                      </p>
                    </div>

                    {/* 2-step delete button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmDeleteId === challenge.id) {
                          onDeleteChallenge(challenge.id);
                          setConfirmDeleteId(null);
                        } else {
                          setConfirmDeleteId(challenge.id);
                          setTimeout(() => setConfirmDeleteId(null), 3500);
                        }
                      }}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                        confirmDeleteId === challenge.id
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-zinc-50 dark:bg-[#09090C] text-zinc-400 hover:text-red-500 border-zinc-200 dark:border-[#D4AF37]/25'
                      }`}
                      title="حذف التحدي"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDeleteId === challenge.id && <span>تأكيد؟</span>}
                    </button>
                  </div>

                  {/* Lead Status Pill */}
                  <div
                    className={`p-2.5 rounded-xl text-xs font-black flex items-center justify-between ${
                      diff > 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                        : diff === 0
                        ? 'bg-zinc-100 dark:bg-[#09090C] text-zinc-800 dark:text-[#E8CE88] border border-zinc-200 dark:border-[#D4AF37]/25'
                        : 'bg-amber-50 dark:bg-[#0E0E12] text-amber-900 dark:text-[#E8CE88] border border-amber-200 dark:border-[#D4AF37]/40'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 shrink-0" />
                      {diff > 0
                        ? `أنت متقدم بفارق +${diff} ساعة 🔥`
                        : diff === 0
                        ? 'تعادل قوي بينكما الآن ⚖️'
                        : `${challenge.friendName} متقدم بفارق ${Math.abs(diff)} س — شد حيلك! ⚡`}
                    </span>
                    {challenge.rewardClaimed && (
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        مُنجز ✓
                      </span>
                    )}
                  </div>

                  {/* Head-to-Head Progress Bars */}
                  <div className="space-y-3 bg-zinc-50 dark:bg-[#09090C] p-3.5 rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25">
                    {/* My Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span className="text-[#9A7218] dark:text-[#F3DFA2]">
                          أنت ({studentName.split(' ')[0]})
                        </span>
                        <span className="font-mono text-zinc-950 dark:text-[#F4EFE6] tabular-nums" dir="ltr">
                          {challenge.myHours.toFixed(1)} / {challenge.targetHours} h ({myPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-zinc-200 dark:bg-[#19191F] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-[#F6E2A6] via-[#D4AF37] to-[#B58722] rounded-full transition-all duration-300"
                          style={{ width: `${myPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Friend Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span className="text-slate-600 dark:text-slate-300">
                          {challenge.friendName}
                        </span>
                        <span className="font-mono text-zinc-950 dark:text-[#F4EFE6] tabular-nums" dir="ltr">
                          {challenge.friendHours.toFixed(1)} / {challenge.targetHours} h ({friendPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-zinc-200 dark:bg-[#19191F] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-slate-400 to-slate-500 rounded-full transition-all duration-300"
                          style={{ width: `${friendPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Manual Friend Progress Sync Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200 dark:border-[#D4AF37]/20">
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-[#B5AA92]">
                        تحديث ساعات {challenge.friendName}:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdateFriendHours(challenge.id, -0.5)}
                          disabled={challenge.friendHours <= 0}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-[#19191F] border border-zinc-300 dark:border-[#D4AF37]/25 text-[10px] font-black text-zinc-700 dark:text-[#E8CE88] disabled:opacity-40 cursor-pointer"
                        >
                          -0.5 س
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateFriendHours(challenge.id, 0.5)}
                          className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black cursor-pointer"
                        >
                          +0.5 س
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateFriendHours(challenge.id, 1)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black cursor-pointer"
                        >
                          +1 س
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Per-Challenge 7-Day Mini Comparison Chart */}
                  {(() => {
                    const cardSeries = buildChallenge7DaySeries(
                      challenge,
                      streakHistory,
                      challenge.status === 'active' ? studyLog.hours : undefined
                    );
                    const my7d = Number(
                      cardSeries.reduce((s, d) => s + d.myHours, 0).toFixed(1)
                    );
                    const friend7d = Number(
                      cardSeries.reduce((s, d) => s + d.friendHours, 0).toFixed(1)
                    );

                    return (
                      <div className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-extrabold">
                          <span className="flex items-center gap-1 text-zinc-700 dark:text-[#E8CE88]">
                            <BarChart3 className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>تقدمكما آخر 7 أيام</span>
                          </span>
                          <div className="flex items-center gap-3 tabular-nums">
                            <span className="flex items-center gap-1 text-[#9A7218] dark:text-[#F3DFA2]">
                              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                              <span>أنت: {my7d}س</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              <span>{challenge.friendName.split(' ')[0]}: {friend7d}س</span>
                            </span>
                          </div>
                        </div>

                        <div dir="ltr" className="w-full h-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={cardSeries}
                              margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
                              barGap={2}
                            >
                              <CartesianGrid
                                strokeDasharray="2 2"
                                vertical={false}
                                stroke="rgba(212, 175, 55, 0.12)"
                              />
                              <XAxis
                                dataKey="shortLabel"
                                tick={{ fontSize: 9, fill: '#B5AA92', fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                              />
                              <Tooltip
                                cursor={{ fill: 'rgba(212, 175, 55, 0.08)' }}
                                content={
                                  <MiniComparisonTooltip
                                    myLabel="أنت"
                                    friendLabel={challenge.friendName}
                                  />
                                }
                              />
                              <Bar
                                dataKey="myHours"
                                fill="#D4AF37"
                                radius={[3, 3, 0, 0]}
                                maxBarSize={9}
                              />
                              <Bar
                                dataKey="friendHours"
                                fill="#94A3B8"
                                radius={[3, 3, 0, 0]}
                                maxBarSize={9}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Session Timer Bar on Card */}
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Timer className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      {cardTimer.hasStarted ? (
                        cardTimer.isFinished ? (
                          <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                            اكتملت الجلسة ({cardTimer.durationMinutes} من {cardTimer.durationMinutes} دقيقة) ✓
                          </span>
                        ) : (
                          <span className="text-zinc-900 dark:text-[#F4EFE6] tabular-nums">
                            في <strong className="text-[#9A7218] dark:text-[#F3DFA2]">الدقيقة {cardTimer.currentMinute}</strong> من {cardTimer.durationMinutes} د · متبقي{' '}
                            <span className="font-mono" dir="ltr">
                              {formatMinutesSeconds(cardTimer.remainingSeconds)}
                            </span>
                          </span>
                        )
                      ) : (
                        <span className="text-zinc-600 dark:text-[#B5AA92] tabular-nums">
                          جلسة {cardTimer.durationMinutes} دقيقة — جاهزة للبدء
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEnterChallengeSession(challenge)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors ${
                        cardTimer.hasStarted && !cardTimer.isFinished
                          ? 'btn-luxury-gold'
                          : 'bg-zinc-900 dark:bg-[#23232C] text-white dark:text-[#E8CE88] border border-transparent dark:border-[#D4AF37]/30 hover:bg-black'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>
                        {cardTimer.hasStarted && !cardTimer.isFinished
                          ? 'فتح غرفة الجلسة'
                          : 'دخول الجلسة'}
                      </span>
                    </button>
                  </div>

                  {/* Reward Claim OR Share Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {canClaimReward && (
                      <button
                        type="button"
                        onClick={() => handleClaimReward(challenge)}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        <span>حققّت الهدف! استلم مكافأة +{challenge.rewardXp} XP 🏆</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyChallenge(challenge)}
                      className="grow py-2 px-3 bg-zinc-100 dark:bg-[#09090C] hover:bg-amber-50 dark:hover:bg-[#101014] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-xl text-xs font-black text-zinc-800 dark:text-[#E8CE88] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedChallengeId === challenge.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 dark:text-emerald-400">تم نسخ الكود والدعوة ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>نسخ كود التحدي للمشاركة</span>
                        </>
                      )}
                    </button>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
