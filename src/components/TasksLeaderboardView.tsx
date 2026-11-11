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

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold mb-1.5 border border-amber-200">
            <Trophy className="w-3.5 h-3.5" />
            <span>نظام نقاط المتفوقين وسلسلة الالتزام (Streak)</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#1E2922]">المهام اليومية وقائمة الأوائل</h2>
          <p className="text-xs text-[#6F7D72]">
            النقاط ليست عشوائية: كل نقطة تأتي من إنجاز حقيقي (مذاكرة، ماء، صلاة، تمرين، مراجعة)
          </p>
        </div>

        {/* 20-Hour Reset Timer Banner */}
        <div className="bg-[#FAF9F5] border border-[#2D5A43]/20 px-4 py-2.5 rounded-xl text-left self-start md:self-center">
          <span className="text-[10px] text-[#7A8A7E] font-bold block flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#2D5A43]" />
            <span>تتجدد المهام تلقائياً بعد:</span>
          </span>
          <span className="font-mono text-xs font-black text-[#2D5A43]" dir="ltr">
            {formatCountdown(secondsRemaining)}
          </span>
        </div>
      </div>

      {/* 6 Daily Tasks Section */}
      <div className="bg-white border border-[#2D5A43]/15 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-[#1E2922]">
              مهام اليوم الستة ({completedCount}/{tasks.length})
            </h3>
            <span className="text-xs text-[#7A8A7E]">
              أكمل المهام لرفع رتبتك في لوحة شرف الثانوية العامة
            </span>
          </div>

          <div className="w-28 sm:w-36 h-3 bg-[#EAE6DF] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2D5A43] rounded-full transition-all duration-500"
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
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 shadow-2xs'
                  : 'bg-[#FAF9F6] border-[#E8E4DC] hover:border-[#2D5A43]/40 text-[#1E2922]'
              }`}
            >
              <div className="flex items-center gap-3">
                {task.isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 shrink-0" />
                )}
                <div>
                  <span
                    className={`text-xs font-bold leading-relaxed block ${
                      task.isDone ? 'line-through text-emerald-700/80' : ''
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="text-[10px] text-[#7A8A7E] font-medium block mt-0.5">
                    النوع: {task.category}
                  </span>
                </div>
              </div>

              <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-white border border-[#DDD6C9] text-[#C59B27] shrink-0">
                +{task.xp} XP
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Table (لوحة المتفوقين) */}
      <div className="bg-white border border-[#2D5A43]/15 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0EDE6]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1E2922]">
                لوحة شرف طلاب نَهج — علمي علوم
              </h3>
              <p className="text-xs text-[#7A8A7E]">
                ترتيب الطلاب على مستوى الجمهورية وفقاً لمجموع نقاط الإنجاز والالتزام المستمر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
              ترتيبك الحالي: المركز 4 🎯
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF9F6] text-[#556458] font-bold border-b border-[#EAE6DF]">
              <tr>
                <th className="p-3 text-center">المركز</th>
                <th className="p-3">اسم الطالب والمحافظة</th>
                <th className="p-3">اللقب التحفيزي</th>
                <th className="p-3">سلسلة الأيام</th>
                <th className="p-3 text-left">مجموع النقاط (XP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE6]">
              {leaderboard.map((user) => {
                const isTop3 = user.rank <= 3;
                return (
                  <tr
                    key={user.rank}
                    className={`transition-colors ${
                      user.isCurrentUser
                        ? 'bg-[#2D5A43]/10 font-bold border-y-2 border-[#2D5A43]'
                        : 'hover:bg-[#FAF9F5]'
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
                        <span className="font-mono font-bold text-gray-500">#{user.rank}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#1E2922] block">
                        {user.name} {user.isCurrentUser && '(أنت)'}
                      </span>
                      <span className="text-[10px] text-[#7A8A7E] font-medium block">
                        {user.governorate}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#F5F2EB] border border-[#DDD6C9] text-[10px] font-bold text-[#4B594E]">
                        {user.badge}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 font-bold text-amber-700">
                        <Flame className="w-3.5 h-3.5 fill-current text-amber-500" />
                        <span>{user.streak} يوم</span>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono font-black text-[#2D5A43] text-sm" dir="ltr">
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
