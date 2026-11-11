import React, { useState } from 'react';
import {
  Flame,
  Award,
  Send,
  Bell,
  BellRing,
  Edit3,
  Check,
  User,
  Sparkles,
  Moon,
  Sun,
} from 'lucide-react';
import { StudentProfile } from '../types';
import {
  isNotificationSupported,
  isNotificationsEnabled,
  requestNotificationPermission,
  sendNotification,
} from '../services/notificationService';

interface NavbarProps {
  profile: StudentProfile;
  telegramSupportUrl: string;
  onUpdateName?: (newName: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  telegramSupportUrl,
  onUpdateName,
  activeTab,
  onTabChange,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name || 'طالب نَهج المجتهد 🩺');
  const [notifEnabled, setNotifEnabled] = useState(() => isNotificationsEnabled());

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim() && onUpdateName) {
      onUpdateName(nameInput.trim());
    }
    setIsEditingName(false);
  };

  const handleToggleNotification = async () => {
    if (!isNotificationSupported()) {
      alert('متصفحك لا يدعم نظام التنبيهات المباشرة.');
      return;
    }

    if (!notifEnabled) {
      const granted = await requestNotificationPermission();
      setNotifEnabled(granted);
      if (granted) {
        sendNotification('🔔 تم تفعيل تنبيهات نَهج بنجاح!', {
          body: 'ستصلك تنبيهات جلسات التركيز ومواعيد المذاكرة حتى عند تصغير التطبيق.',
        });
      }
    } else {
      sendNotification('🔔 اختبار تنبيهات نَهج', {
        body: 'نظام التنبيهات يعمل بنجاح في الخلفية لمتابعة مذاكرتك.',
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F8FAFC]/90 dark:bg-[#0B132B]/90 backdrop-blur-md border-b border-[#1E40AF]/15 dark:border-blue-900/40 font-['Cairo',sans-serif] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1E40AF] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform ring-2 ring-[#1E40AF]/20 dark:ring-blue-500/40">
              <span className="font-['Amiri',serif] text-2xl font-black">نَهْج</span>
            </div>
            <div>
              <span className="font-extrabold text-base text-[#0F172A] dark:text-white block leading-tight">
                نَهج
              </span>
              <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-semibold block">
                تالتة ثانوي علمي علوم
              </span>
            </div>
          </div>
        </div>

        {/* User Stats & Interactive Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 rounded-full text-xs font-bold text-amber-800 dark:text-amber-300 shadow-2xs">
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500 animate-pulse" />
            <span>{profile.streakDays} يوم</span>
          </div>

          {/* XP Points */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#1E40AF]/10 dark:bg-blue-950/50 border border-[#1E40AF]/20 dark:border-blue-800/40 rounded-full text-xs font-bold text-[#1E40AF] dark:text-blue-300">
            <Award className="w-4 h-4 text-[#C59B27] dark:text-amber-400" />
            <span>{profile.totalXp} XP</span>
          </div>

          {/* Student Profile Info / Name Editor */}
          <div className="hidden md:flex items-center">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-[#1E40AF] rounded-lg focus:outline-none w-36 text-[#0F172A] dark:text-white"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A]"
                  title="حفظ الاسم"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div
                onClick={() => setIsEditingName(true)}
                className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900/90 hover:bg-blue-50/60 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-slate-800 hover:border-blue-500/40 rounded-full text-xs font-bold text-[#1E293B] dark:text-slate-200 cursor-pointer transition-colors group shadow-2xs"
                title="اضغط لتعديل اسمك"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-900" />
                <span className="truncate max-w-[130px]">{profile.name || 'طالب نَهج 🩺'}</span>
                <Edit3 className="w-3 h-3 text-gray-400 group-hover:text-[#1E40AF]" />
              </div>
            )}
          </div>

          {/* Dark / Light Theme Toggle Button */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl border border-slate-200 dark:border-blue-900/40 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
              title={isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 fill-slate-700/20" />
              )}
              <span className="hidden xl:inline text-[11px] font-bold">
                {isDarkMode ? 'نهاري' : 'ليلي'}
              </span>
            </button>
          )}

          {/* Notifications Permission / Status Toggle */}
          <button
            onClick={handleToggleNotification}
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-2xs ${
              notifEnabled
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200/90 dark:border-blue-800/40 hover:bg-blue-100/70'
                : 'bg-white dark:bg-slate-900/80 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
            }`}
            title={notifEnabled ? 'التنبيهات مفعلة بالخلفية (اضغط لاختبار التنبيه)' : 'اضغط لتفعيل تنبيهات المذاكرة والتركيز'}
          >
            {notifEnabled ? (
              <BellRing className="w-4 h-4 text-blue-600 dark:text-blue-400 fill-blue-100 dark:fill-blue-950" />
            ) : (
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
            <span className="hidden sm:inline text-[11px]">
              {notifEnabled ? 'التنبيهات مفعلة' : 'تفعيل التنبيهات'}
            </span>
          </button>

          {/* Telegram Support Link */}
          <a
            href={telegramSupportUrl || 'https://t.me/Y_lI11'}
            target="_blank"
            rel="noopener noreferrer"
            title="شات الدعم على تليجرام"
            className="p-2 text-[#229ED9] hover:bg-[#229ED9]/10 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
};
