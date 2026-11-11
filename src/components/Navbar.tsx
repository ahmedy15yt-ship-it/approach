import React from 'react';
import {
  Flame,
  Award,
  Send,
  ShieldAlert,
  LogOut,
  Sparkles,
  BookMarked,
  Droplet,
} from 'lucide-react';
import { StudentProfile } from '../types';

interface NavbarProps {
  profile: StudentProfile;
  telegramSupportUrl: string;
  onOpenOwner: () => void;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  telegramSupportUrl,
  onOpenOwner,
  onLogout,
  activeTab,
  onTabChange,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#2D5A43]/15 font-['Cairo',sans-serif]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2D5A43] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform ring-2 ring-[#2D5A43]/20">
              <span className="font-['Amiri',serif] text-2xl font-black">نَهْج</span>
            </div>
            <div>
              <span className="font-extrabold text-base text-[#1E2922] block leading-tight">
                نَهج
              </span>
              <span className="text-[10px] text-[#78887C] font-semibold block">
                تالتة ثانوي علمي علوم
              </span>
            </div>
          </div>
        </div>

        {/* User Stats & Badges */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Streak Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-full text-xs font-bold text-amber-800 shadow-2xs">
            <Flame className="w-4 h-4 text-amber-600 fill-amber-500 animate-pulse" />
            <span>{profile.streakDays} يوم التزام</span>
          </div>

          {/* XP Points */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#2D5A43]/10 border border-[#2D5A43]/20 rounded-full text-xs font-bold text-[#2D5A43]">
            <Award className="w-4 h-4 text-[#C59B27]" />
            <span>{profile.totalXp} نقطة</span>
          </div>

          {/* Student Profile Info */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white border border-[#E2DDD3] rounded-full text-xs font-bold text-[#35463A]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="truncate max-w-[140px]">{profile.name}</span>
          </div>

          {/* Telegram Support Link */}
          <a
            href={telegramSupportUrl || 'https://t.me/Y_lI11'}
            target="_blank"
            rel="noopener noreferrer"
            title="شات الدعم الفني على تليجرام"
            className="p-2 text-[#229ED9] hover:bg-[#229ED9]/10 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </a>

          {/* Owner Dashboard Icon */}
          <button
            onClick={onOpenOwner}
            title="لوحة المالك (الأكواد والإعدادات)"
            className="p-2 text-[#8C7A52] hover:bg-[#8C7A52]/10 rounded-xl transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            title="تسجيل الخروج أو تغيير الكود"
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
