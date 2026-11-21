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
  LogOut,
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
  accountPhone?: string;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  telegramSupportUrl,
  onUpdateName,
  activeTab,
  onTabChange,
  isDarkMode = false,
  onToggleDarkMode,
  accountPhone,
  onLogout,
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
    <header className="sticky top-0 z-40 bg-[#F6F3EC]/92 dark:bg-[#09090C]/95 backdrop-blur-md border-b border-amber-200/70 dark:border-[#D4AF37]/28 font-['Cairo',sans-serif] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl btn-luxury-gold text-[#09090B] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ring-1 ring-[#F6E2A6]/50">
              <span className="font-['Amiri',serif] text-2xl font-black">نَهْج</span>
            </div>
            <div>
              <span className="font-extrabold text-base text-zinc-950 dark:text-[#E8CE88] block leading-tight">
                نَهج
              </span>
              <span className="text-[10px] text-zinc-600 dark:text-[#B5AA92] font-semibold block">
                تالتة ثانوي علمي علوم
              </span>
            </div>
          </div>
        </div>

        {/* User Stats & Interactive Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak Counter (navigates to Streak History in Profile) */}
          <button
            type="button"
            onClick={() => onTabChange('profile')}
            title="عرض سجل وتقويم الاستمرارية في الملف الشخصي"
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-[#16161B] border border-amber-300/70 dark:border-[#D4AF37]/35 rounded-full text-xs font-bold text-amber-900 dark:text-[#F3DFA2] shadow-2xs hover:border-[#D4AF37] transition-colors cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-600 dark:text-[#E8CE88] fill-amber-500/70 animate-pulse" />
            <span className="tabular-nums">{profile.streakDays} يوم</span>
          </button>

          {/* XP Points */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50/80 dark:bg-[#121216] border border-amber-300/70 dark:border-[#D4AF37]/35 rounded-full text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">
            <Award className="w-4 h-4 text-[#B58722] dark:text-[#F3DFA2]" />
            <span className="tabular-nums">{profile.totalXp} XP</span>
          </div>

          {/* Student Profile Button & Quick Name Editor */}
          <button
            type="button"
            onClick={() => onTabChange('profile')}
            title={
              accountPhone
                ? `الملف الشخصي وسجل الاستمرارية (${accountPhone})`
                : 'فتح صفحة الملف الشخصي وسجل الاستمرارية'
            }
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-2xs ${
              activeTab === 'profile'
                ? 'btn-luxury-gold text-[#09090B]'
                : 'bg-white dark:bg-[#19191F] hover:bg-amber-50/70 dark:hover:bg-[#101014] text-zinc-700 dark:text-[#E8CE88] border-zinc-200 dark:border-[#D4AF37]/25'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="hidden lg:inline text-[11px]">ملفي</span>
          </button>

          <div className="hidden md:flex items-center">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-[#0A0A0D] border border-[#D4AF37] rounded-lg focus:outline-none w-36 text-zinc-950 dark:text-[#F4EFE6]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1 btn-luxury-gold text-[#09090B] rounded-lg"
                  title="حفظ الاسم"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div
                onClick={() => setIsEditingName(true)}
                className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-[#19191F] hover:bg-amber-50/70 dark:hover:bg-[#111115] border border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37]/60 rounded-full text-xs font-bold text-zinc-800 dark:text-[#F4EFE6] cursor-pointer transition-colors group shadow-2xs"
                title="اضغط لتعديل اسمك"
              >
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] ring-2 ring-[#D4AF37]/30" />
                <span className="truncate max-w-[130px]">{profile.name || 'طالب نَهج 🩺'}</span>
                <Edit3 className="w-3 h-3 text-zinc-400 group-hover:text-[#D4AF37]" />
              </div>
            )}
          </div>

          {/* Dark / Light Theme Toggle Button */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-white dark:bg-[#19191F] text-zinc-700 dark:text-[#E8CE88] hover:bg-zinc-100 dark:hover:bg-[#101014] transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
              title={isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى سيم الفخامة المظلمة'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-[#F3DFA2] fill-[#D4AF37]/20" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-800 fill-zinc-800/20" />
              )}
              <span className="hidden xl:inline text-[11px] font-bold">
                {isDarkMode ? 'نهاري' : 'فخامة داكنة'}
              </span>
            </button>
          )}

          {/* Notifications Permission / Status Toggle */}
          <button
            onClick={handleToggleNotification}
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-2xs ${
              notifEnabled
                ? 'bg-amber-50 dark:bg-[#19191F] text-[#9A7218] dark:text-[#E8CE88] border-amber-300 dark:border-[#D4AF37]/40 hover:bg-amber-100/70'
                : 'bg-white dark:bg-[#19191F] hover:bg-amber-50 dark:hover:bg-[#111115] text-amber-800 dark:text-[#E8CE88]/80 border-amber-200 dark:border-[#D4AF37]/25'
            }`}
            title={notifEnabled ? 'التنبيهات مفعلة بالخلفية (اضغط لاختبار التنبيه)' : 'اضغط لتفعيل تنبيهات المذاكرة والتركيز'}
          >
            {notifEnabled ? (
              <BellRing className="w-4 h-4 text-[#B58722] dark:text-[#F3DFA2]" />
            ) : (
              <Bell className="w-4 h-4 text-amber-600 dark:text-[#D4AF37]" />
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
            className="p-2 text-zinc-700 dark:text-[#E8CE88] hover:bg-amber-50 dark:hover:bg-[#19191F] rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </a>

          {/* Logout / Switch Account Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="تسجيل الخروج أو تبديل الحساب"
              className="p-2 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#19191F] text-zinc-700 dark:text-[#E8CE88] hover:border-[#D4AF37] hover:text-[#9A7218] dark:hover:text-[#F6E2A6] transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xl:inline text-[11px]">خروج</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
