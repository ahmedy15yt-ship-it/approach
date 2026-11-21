import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  Circle,
  Flame,
  Clock,
  Sparkles,
  Trophy,
  Users,
  Target,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DailyTask, LeaderboardUser } from '../types';
import { getTaskCycleRemainingMs } from '../data/tasks';

interface TasksLeaderboardViewProps {
  tasks: DailyTask[];
  onToggleTask: (taskId: string) => void;
  leaderboard: LeaderboardUser[];
  studentXp: number;
  streakDays: number;
  nextStreakAtMs?: number;
}

export const TasksLeaderboardView: React.FC<TasksLeaderboardViewProps> = ({
  tasks,
  onToggleTask,
  leaderboard,
  studentXp,
  streakDays,
  nextStreakAtMs,
}) => {
  // 13-Hour Refresh Countdown & 24-Hour Streak Countdown
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    Math.floor(getTaskCycleRemainingMs() / 1000)
  );
  const [streakRemainingSec, setStreakRemainingSec] = useState(() =>
    nextStreakAtMs ? Math.max(0, Math.floor((nextStreakAtMs - Date.now()) / 1000)) : 86400
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(Math.floor(getTaskCycleRemainingMs() / 1000));
      if (nextStreakAtMs) {
        setStreakRemainingSec(Math.max(0, Math.floor((nextStreakAtMs - Date.now()) / 1000)));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [nextStreakAtMs]);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours} ساعة و ${mins} دقيقة و ${secs} ثانية`;
  };

  const handleTaskClick = (taskId: string, isDone: boolean) => {
    if (!isDone) {
      confetti({ particleCount: 50, spread: 60 });
    }
    onToggleTask(taskId);
  };

  const completedCount = tasks.filter((t) => t.isDone).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  // Dynamically compute the sorted leaderboard including the student's real current XP!
  const sortedLeaderboard = React.useMemo(() => {
    const list = leaderboard.map((u) => {
      if (u.isCurrentUser) {
        return {
          ...u,
          xp: studentXp,
          streak: streakDays,
        };
      }
      return u;
    });

    // Sort by XP descending
    list.sort((a, b) => b.xp - a.xp);

    // Re-assign ranks
    return list.map((user, idx) => ({
      ...user,
      rank: idx + 1,
    }));
  }, [leaderboard, studentXp, streakDays]);

  const currentUserRank = sortedLeaderboard.find((u) => u.isCurrentUser)?.rank || sortedLeaderboard.length;

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white dark:bg-[#19191F] border border-amber-200/70 dark:border-[#D4AF37]/30 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-[#101014] text-amber-800 dark:text-[#E8CE88] rounded-full text-xs font-bold mb-1.5 border border-amber-200 dark:border-[#D4AF37]/35">
            <Trophy className="w-3.5 h-3.5" />
            <span>نظام نقاط المتفوقين وسلسلة الالتزام (Streak)</span>
          </div>
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-[#E8CE88]">المهام اليومية وقائمة الأوائل</h2>
          <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
            النقاط ليست عشوائية: كل نقطة تأتي من إنجاز حقيقي (مذاكرة، ماء، صلاة، تمرين، مراجعة)
          </p>
        </div>

        {/* 4:00 AM Egypt Time Reset & 24-Hour Streak Timer Banner */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
          <div className="bg-zinc-50 dark:bg-[#09090C] border border-amber-200/80 dark:border-[#D4AF37]/35 px-3.5 py-2 rounded-xl text-left">
            <span className="text-[10px] text-zinc-600 dark:text-[#B5AA92] font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#B58722] dark:text-[#E8CE88]" />
              <span>تتجدد المهام الستة (4:00 ص بتوقيت مصر) بعد:</span>
            </span>
            <span className="font-mono text-xs font-black text-[#9A7218] dark:text-[#F3DFA2] tabular-nums" dir="ltr">
              {formatCountdown(secondsRemaining)}
            </span>
          </div>

          {nextStreakAtMs && (
            <div className="bg-amber-50/70 dark:bg-[#101014] border border-amber-200 dark:border-[#D4AF37]/30 px-3.5 py-2 rounded-xl text-left">
              <span className="text-[10px] text-amber-800 dark:text-[#E8CE88] font-bold flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#D4AF37]" />
                <span>تحتسب السلسلة (+1 يوم) بعد:</span>
              </span>
              <span className="font-mono text-xs font-black text-amber-800 dark:text-[#F6E2A6] tabular-nums" dir="ltr">
                {formatCountdown(streakRemainingSec)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 6 Daily Tasks Section */}
      <div className="bg-white dark:bg-[#19191F] border border-amber-200/70 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-extrabold text-base text-zinc-900 dark:text-[#F4EFE6]">
              مهام اليوم الستة ({completedCount}/{tasks.length}) — تتجدد 4:00 ص بتوقيت مصر
            </h3>
            <span className="text-xs text-zinc-500 dark:text-[#B5AA92]">
              تتغير تلقائياً كل يوم الساعة 4:00 صباحاً بتوقيت القاهرة لإشعال الحماس ورفع رتبتك
            </span>
          </div>

          <div className="w-28 sm:w-36 h-3 bg-zinc-200 dark:bg-[#09090C] rounded-full overflow-hidden border border-transparent dark:border-[#D4AF37]/20">
            <div
              className="h-full bg-gradient-to-l from-[#F6E2A6] via-[#D4AF37] to-[#B58722] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task.id, task.isDone)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                task.isDone
                  ? 'bg-amber-50/70 dark:bg-[#101014] border-amber-300 dark:border-[#D4AF37]/55 text-zinc-950 dark:text-[#E8CE88] shadow-2xs'
                  : 'bg-zinc-50 dark:bg-[#0A0A0D] border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37] text-zinc-900 dark:text-[#F4EFE6]'
              }`}
            >
              <div className="flex items-center gap-3">
                {task.isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-[#B58722] dark:text-[#F3DFA2] shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-zinc-400 dark:text-[#D4AF37]/40 shrink-0" />
                )}
                <div>
                  <span
                    className={`text-xs font-bold leading-relaxed block ${
                      task.isDone ? 'line-through text-zinc-600 dark:text-[#E8CE88]/65' : ''
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] font-medium block mt-0.5">
                    النوع: {task.category}
                  </span>
                </div>
              </div>

              <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-white dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/30 text-[#9A7218] dark:text-[#E8CE88] shrink-0">
                +{task.xp} XP
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Table (لوحة المتفوقين) */}
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#D4AF37]/20 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/35 text-[#9A7218] dark:text-[#E8CE88] flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-[#F6E2A6]">
                لوحة شرف طلاب نَهج — علمي علوم
              </h3>
              <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
                ترتيب الطلاب على مستوى الجمهورية وفقاً لمجموع نقاط الإنجاز والالتزام المستمر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-amber-50 dark:bg-[#09090C] text-[#9A7218] dark:text-[#E8CE88] rounded-full border border-amber-200 dark:border-[#D4AF37]/35 shadow-2xs">
              ترتيبك الحالي: المركز {currentUserRank} 🎯
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-[#09090C] text-zinc-600 dark:text-[#E8CE88] font-bold border-b border-zinc-200 dark:border-[#D4AF37]/25">
              <tr>
                <th className="p-3 text-center">المركز</th>
                <th className="p-3">اسم الطالب والمحافظة</th>
                <th className="p-3">اللقب التحفيزي</th>
                <th className="p-3">سلسلة الأيام</th>
                <th className="p-3 text-left">مجموع النقاط (XP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-[#D4AF37]/15">
              {sortedLeaderboard.map((user) => {
                return (
                  <tr
                    key={user.rank}
                    className={`transition-colors ${
                      user.isCurrentUser
                        ? 'bg-amber-50/70 dark:bg-[#D4AF37]/12 font-bold border-y-2 border-[#D4AF37]/70'
                        : 'hover:bg-zinc-50 dark:hover:bg-[#09090C]'
                    }`}
                  >
                    <td className="p-3 text-center">
                      {user.rank === 1 ? (
                        <span className="w-7 h-7 rounded-full bg-amber-400 text-black font-black inline-flex items-center justify-center shadow-xs">
                          🥇
                        </span>
                      ) : user.rank === 2 ? (
                        <span className="w-7 h-7 rounded-full bg-slate-300 text-black font-black inline-flex items-center justify-center shadow-xs">
                          🥈
                        </span>
                      ) : user.rank === 3 ? (
                        <span className="w-7 h-7 rounded-full bg-amber-700 text-white font-black inline-flex items-center justify-center shadow-xs">
                          🥉
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-zinc-500 dark:text-[#B5AA92]">#{user.rank}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-zinc-900 dark:text-[#F4EFE6] block">
                        {user.name} {user.isCurrentUser && '(أنت)'}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] font-medium block">
                        {user.governorate}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-[10px] font-bold text-zinc-700 dark:text-[#E8CE88]">
                        {user.badge}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 font-bold text-[#9A7218] dark:text-[#E8CE88]">
                        <Flame className="w-3.5 h-3.5 fill-current text-[#D4AF37]" />
                        <span>{user.streak} يوم</span>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono font-black text-[#9A7218] dark:text-[#F3DFA2] text-sm" dir="ltr">
                      {user.xp} XP
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
