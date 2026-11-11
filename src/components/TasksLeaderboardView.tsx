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

interface TasksLeaderboardViewProps {
  tasks: DailyTask[];
  onToggleTask: (taskId: string) => void;
  leaderboard: LeaderboardUser[];
  studentXp: number;
  streakDays: number;
}

export const TasksLeaderboardView: React.FC<TasksLeaderboardViewProps> = ({
  tasks,
  onToggleTask,
  leaderboard,
  studentXp,
  streakDays,
}) => {
  // 20-Hour Refresh Countdown
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    // 20 hours cycle = 72,000 seconds
    const now = Date.now();
    const cycleMs = 20 * 60 * 60 * 1000;
    const remainder = cycleMs - (now % cycleMs);
    return Math.floor(remainder / 1000);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 20 * 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      <div className="bg-white dark:bg-[#111C38] border border-[#1E40AF]/15 dark:border-[#1E3A8A]/40 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold mb-1.5 border border-amber-200 dark:border-amber-900/50">
            <Trophy className="w-3.5 h-3.5" />
            <span>نظام نقاط المتفوقين وسلسلة الالتزام (Streak)</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white">المهام اليومية وقائمة الأوائل</h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            النقاط ليست عشوائية: كل نقطة تأتي من إنجاز حقيقي (مذاكرة، ماء، صلاة، تمرين، مراجعة)
          </p>
        </div>

        {/* 20-Hour Reset Timer Banner */}
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#1E40AF]/20 dark:border-[#1E3A8A]/30 px-4 py-2.5 rounded-xl text-left self-start md:self-center">
          <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-bold block flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#1E40AF] dark:text-blue-400" />
            <span>تتجدد المهام تلقائياً بعد:</span>
          </span>
          <span className="font-mono text-xs font-black text-[#1E40AF] dark:text-blue-400" dir="ltr">
            {formatCountdown(secondsRemaining)}
          </span>
        </div>
      </div>

      {/* 6 Daily Tasks Section */}
      <div className="bg-white dark:bg-[#111C38] border border-[#1E40AF]/15 dark:border-[#1E3A8A]/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-[#0F172A] dark:text-white">
              مهام اليوم الستة ({completedCount}/{tasks.length})
            </h3>
            <span className="text-xs text-[#64748B] dark:text-slate-400">
              أكمل المهام لرفع رتبتك في لوحة شرف الثانوية العامة
            </span>
          </div>

          <div className="w-28 sm:w-36 h-3 bg-[#E2E8F0] dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1E40AF] rounded-full transition-all duration-500"
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
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-950 dark:text-blue-100 shadow-2xs'
                  : 'bg-[#F8FAFC] dark:bg-[#0B132B] border-[#E2E8F0] dark:border-slate-800 hover:border-[#1E40AF]/40 dark:hover:border-blue-500/40 text-[#0F172A] dark:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {task.isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-[#1E40AF] dark:text-blue-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 shrink-0" />
                )}
                <div>
                  <span
                    className={`text-xs font-bold leading-relaxed block ${
                      task.isDone ? 'line-through text-blue-800/70 dark:text-blue-300/70' : ''
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-medium block mt-0.5">
                    النوع: {task.category}
                  </span>
                </div>
              </div>

              <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-slate-700 text-[#C59B27] dark:text-amber-400 shrink-0">
                +{task.xp} XP
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Table (لوحة المتفوقين) */}
      <div className="bg-white dark:bg-[#111C38] border border-[#1E40AF]/15 dark:border-[#1E3A8A]/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#0F172A] dark:text-white">
                لوحة شرف طلاب نَهج — علمي علوم
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                ترتيب الطلاب على مستوى الجمهورية وفقاً لمجموع نقاط الإنجاز والالتزام المستمر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-[#1E40AF] dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-900/50 shadow-2xs">
              ترتيبك الحالي: المركز {currentUserRank} 🎯
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] text-[#475569] dark:text-slate-400 font-bold border-b border-[#E2E8F0] dark:border-slate-800">
              <tr>
                <th className="p-3 text-center">المركز</th>
                <th className="p-3">اسم الطالب والمحافظة</th>
                <th className="p-3">اللقب التحفيزي</th>
                <th className="p-3">سلسلة الأيام</th>
                <th className="p-3 text-left">مجموع النقاط (XP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
              {sortedLeaderboard.map((user) => {
                const isTop3 = user.rank <= 3;
                return (
                  <tr
                    key={user.rank}
                    className={`transition-colors ${
                      user.isCurrentUser
                        ? 'bg-[#1E40AF]/10 dark:bg-blue-900/30 font-bold border-y-2 border-[#1E40AF] dark:border-blue-500'
                        : 'hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A]'
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
                        <span className="font-mono font-bold text-gray-500 dark:text-slate-400">#{user.rank}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#0F172A] dark:text-white block">
                        {user.name} {user.isCurrentUser && '(أنت)'}
                      </span>
                      <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-medium block">
                        {user.governorate}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#F5F2EB] dark:bg-[#0B132B] border border-[#E2E8F0] dark:border-slate-800 text-[10px] font-bold text-[#334155] dark:text-slate-300">
                        {user.badge}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                        <Flame className="w-3.5 h-3.5 fill-current text-amber-500" />
                        <span>{user.streak} يوم</span>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono font-black text-[#1E40AF] dark:text-blue-400 text-sm" dir="ltr">
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
