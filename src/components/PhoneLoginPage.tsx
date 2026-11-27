import React, { useState, useMemo } from 'react';
import {
  Phone,
  User,
  ArrowLeft,
  Moon,
  Sun,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Flame,
  Award,
} from 'lucide-react';
import { AccountSession, StudentActivitySnapshot } from '../types';
import {
  getSavedAccountsSummary,
  hasUnmigratedGuestData,
  loginWithPhoneAndUsername,
  maskPhoneNumber,
  SavedAccountSummary,
} from '../utils/accountStorage';
import { VerifiedBadge } from './VerifiedBadge';
import { isVerifiedPhone } from '../utils/verifiedAccounts';
import { PWAInstallButton } from './PWAInstallButton';

interface PhoneLoginPageProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLoginSuccess: (payload: {
    session: AccountSession;
    snapshot: StudentActivitySnapshot | null;
    isNewAccount: boolean;
    importGuestData: boolean;
  }) => void;
}

export const PhoneLoginPage: React.FC<PhoneLoginPageProps> = ({
  isDarkMode,
  onToggleDarkMode,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [importGuestData, setImportGuestData] = useState<boolean>(() =>
    hasUnmigratedGuestData()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mismatchUsername, setMismatchUsername] = useState<string | null>(null);

  const hasLegacyData = useMemo(() => hasUnmigratedGuestData(), []);
  const savedAccounts = useMemo(() => getSavedAccountsSummary(), []);

  const performLogin = async (
    targetPhone: string,
    targetUsername: string,
    confirmNameUpdate = false
  ) => {
    setErrorMsg(null);
    setMismatchUsername(null);
    setIsLoading(true);

    try {
      const result = await loginWithPhoneAndUsername({
        phone: targetPhone,
        username: targetUsername,
        confirmNameUpdate,
      });

      if (!result.ok) {
        if (result.code === 'USERNAME_MISMATCH' && result.registeredUsername) {
          setMismatchUsername(result.registeredUsername);
        }
        setErrorMsg(result.message);
        return;
      }

      onLoginSuccess({
        session: result.session,
        snapshot: result.snapshot,
        isNewAccount: result.isNewAccount,
        importGuestData: result.isNewAccount && hasLegacyData && importGuestData,
      });
    } catch {
      setErrorMsg('تعذر إتمام تسجيل الدخول حالياً، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(phone, username, false);
  };

  const handleQuickAccountSelect = (acc: SavedAccountSummary) => {
    setUsername(acc.username);
    setPhone(acc.phone);
    performLogin(acc.phone, acc.username, false);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F6F3EC] dark:bg-[#0D0D10] text-zinc-950 dark:text-[#F4EFE6] flex flex-col font-['Cairo',sans-serif] transition-colors duration-200"
    >
      {/* Minimal Top Bar */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl btn-luxury-gold text-[#09090B] flex items-center justify-center shadow-sm">
            <span className="font-['Amiri',serif] text-2xl font-black">نَهْج</span>
          </div>
          <span className="font-extrabold text-base text-zinc-950 dark:text-[#E8CE88] whitespace-nowrap">
            نَهج — تالتة ثانوي علمي علوم
          </span>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton compact />

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى سيم الفخامة المظلمة'}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-white dark:bg-[#19191F] text-zinc-700 dark:text-[#E8CE88] hover:border-[#D4AF37] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-[#F3DFA2]" />
                <span>نهاري</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-zinc-800" />
                <span>فخامة داكنة</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Centered Login Workspace */}
      <main className="grow flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left/Primary Card: Login Form */}
          <section className="lg:col-span-7 bg-white dark:bg-[#19191F] border border-amber-200/80 dark:border-[#D4AF37]/30 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#9A7218] dark:text-[#E8CE88]">
                حساب الطالب الشخصي
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-[#F4EFE6] leading-tight [text-wrap:balance]">
                سجل دخولك ليبقى كل نشاطك محفوظاً
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92] leading-relaxed">
                أدخل اسم المستخدم ورقم التليفون ليتم ربط ساعات مذاكرتك، سلسلة أيامك، مهامك، وتقدم المنهج بحسابك تلقائياً.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-username"
                  className="block text-xs font-extrabold text-zinc-800 dark:text-[#E8CE88]"
                >
                  اسم المستخدم
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 dark:text-[#D4AF37]/70 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-username"
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                      if (mismatchUsername) setMismatchUsername(null);
                    }}
                    placeholder="مثال: أحمد يحيى"
                    className="w-full pr-10 pl-4 py-3 text-sm font-bold bg-zinc-50 dark:bg-[#09090C] text-zinc-950 dark:text-[#F4EFE6] border border-zinc-300 dark:border-[#D4AF37]/25 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors"
                    autoComplete="name"
                    autoFocus
                  />
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-phone"
                  className="block text-xs font-extrabold text-zinc-800 dark:text-[#E8CE88]"
                >
                  رقم التليفون
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 dark:text-[#D4AF37]/70 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-phone"
                    type="tel"
                    inputMode="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                      if (mismatchUsername) setMismatchUsername(null);
                    }}
                    placeholder="01012345678"
                    dir="ltr"
                    className="w-full pr-10 pl-4 py-3 text-sm font-bold font-mono tabular-nums text-left bg-zinc-50 dark:bg-[#09090C] text-zinc-950 dark:text-[#F4EFE6] border border-zinc-300 dark:border-[#D4AF37]/25 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors"
                    autoComplete="tel"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92] font-medium flex items-center gap-1.5 flex-wrap">
                  <span>مثال: 010XXXXXXXX أو رقم دولي — يُستخدم كمفتاح لحفظ واستعادة سجلك.</span>
                  {isVerifiedPhone(phone) && (
                    <span className="inline-flex items-center gap-1 text-[#1D9BF0] font-black">
                      <VerifiedBadge size="xs" />
                      <span>رقم موثق بالعلامة الزرقاء</span>
                    </span>
                  )}
                </p>
              </div>

              {/* Optional Legacy Guest Data Preservation Checkbox */}
              {hasLegacyData && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importGuestData}
                    onChange={(e) => setImportGuestData(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-[#E8CE88] leading-relaxed">
                    نقل نشاطي وتقدمي الحالي على هذا الجهاز إلى حسابي الجديد عند الإنشاء
                  </span>
                </label>
              )}

              {/* Validation or Username Mismatch Feedback */}
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 text-red-800 dark:text-red-200 space-y-2.5"
                >
                  <div className="flex items-start gap-2 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                    <span>{errorMsg}</span>
                  </div>

                  {mismatchUsername && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUsername(mismatchUsername);
                          performLogin(phone, mismatchUsername, false);
                        }}
                        className="px-3 py-1.5 rounded-lg btn-luxury-gold text-[#09090B] text-[11px] font-bold cursor-pointer"
                      >
                        الدخول بالاسم المسجل ({mismatchUsername})
                      </button>
                      <button
                        type="button"
                        onClick={() => performLogin(phone, username, true)}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#19191F] border border-zinc-300 dark:border-[#D4AF37]/30 text-zinc-800 dark:text-[#E8CE88] text-[11px] font-bold hover:border-[#D4AF37] cursor-pointer transition-colors"
                      >
                        تحديث الاسم إلى «{username.trim()}» والمتابعة
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-5 btn-luxury-gold active:scale-[0.99] text-[#09090B] font-black text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحقق وتحميل سجلك...</span>
                  </>
                ) : (
                  <>
                    <span>دخول وتسجيل النشاط</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Right Panel: What Gets Saved + Quick Account Switcher */}
          <aside className="lg:col-span-5 bg-white dark:bg-[#19191F] border border-amber-200/80 dark:border-[#D4AF37]/30 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-4">
              <h2 className="text-base font-black text-zinc-950 dark:text-[#E8CE88]">
                ماذا يُحفظ داخل حسابك تلقائياً؟
              </h2>

              <ul className="space-y-3 text-xs font-semibold text-zinc-700 dark:text-[#F4EFE6]/90">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <span>سجل الاستمرارية (Streak History) وسلسلة الـ 24 ساعة وتواريخ الإنجازات.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <span>ساعات المذاكرة اليومية وجلسات البومودورو وتحديات الأصدقاء.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <span>الدروس المنتهية في المنهج، المتراكم، والمهام الستة ونقاط (XP).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <span>حساب منفصل لكل رقم تليفون مع إمكانية التبديل أو تسجيل الخروج في أي وقت.</span>
                </li>
              </ul>
            </div>

            {/* Previously Logged-In Accounts on this Device */}
            <div className="pt-4 border-t border-zinc-200 dark:border-[#D4AF37]/20 space-y-3">
              <h3 className="text-xs font-extrabold text-zinc-500 dark:text-[#B5AA92]">
                {savedAccounts.length > 0
                  ? 'حسابات مسجلة على هذا الجهاز (دخول سريع)'
                  : 'أول تسجيل دخول لك'}
              </h3>

              {savedAccounts.length > 0 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {savedAccounts.map((acc) => (
                    <button
                      key={acc.normalizedPhone}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleQuickAccountSelect(acc)}
                      className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37] text-right transition-colors cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-zinc-950 dark:text-[#F4EFE6] flex items-center gap-1.5 truncate">
                          <span className="truncate">{acc.username}</span>
                          {(acc.isVerified || isVerifiedPhone(acc.phone)) && (
                            <VerifiedBadge size="xs" />
                          )}
                        </span>
                        <span
                          className="text-[11px] font-mono text-zinc-500 dark:text-[#B5AA92] tabular-nums"
                          dir="ltr"
                        >
                          {maskPhoneNumber(acc.phone)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-[11px] font-bold tabular-nums shrink-0">
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-[#F3DFA2]">
                          <Flame className="w-3.5 h-3.5" />
                          {acc.streakDays}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#9A7218] dark:text-[#E8CE88]">
                          <Award className="w-3.5 h-3.5" />
                          {acc.totalXp} XP
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-[#B5AA92] leading-relaxed">
                  عند دخولك لأول مرة برقم تليفونك واسمك، سيظهر حسابك هنا لاحقاً للوصول السريع مع كامل سجلاتك.
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
