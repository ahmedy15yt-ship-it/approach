import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Send, Copy, Check, Sparkles, BookOpen, User } from 'lucide-react';

interface AuthGateProps {
  onLoginSuccess: (studentName: string, codeMasked: string) => void;
  onOpenOwner: () => void;
  telegramSupportUrl: string;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  onLoginSuccess,
  onOpenOwner,
  telegramSupportUrl,
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('يرجى كتابة كود الدخول');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (data.success) {
        onLoginSuccess(data.studentName, data.codeMasked);
      } else {
        setError(data.message || 'الكود غير صحيح أو ملغي');
      }
    } catch (err) {
      setError('تعذر الاتصال بالخادم، تأكد من الاتصال بالإنترنت');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0D0D10] text-zinc-900 dark:text-[#F4EFE6] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-['Cairo',sans-serif] transition-colors">
      {/* Background Subtle Elements */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/40 shadow-xl rounded-2xl p-6 sm:p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="btn-luxury-gold inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-md mb-4 ring-4 ring-[#D4AF37]/20">
            <span className="font-['Amiri',serif] text-3xl font-bold">نَهْج</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-[#F6E2A6] tracking-tight">
            نَهج — أفضل نسخة منك
          </h1>
          <p className="text-sm text-zinc-600 dark:text-[#B5AA92] mt-2 font-medium leading-relaxed">
            النظام اليومي الشامل لطالب تالتة ثانوي علمي علوم
            <br />
            <span className="text-xs text-[#9A7218] dark:text-[#E8CE88] font-bold">مذاكرة • صحة • نفسية • روح • متابعة دقيقة</span>
          </p>
        </div>

        {/* Lock Notice */}
        <div className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-xl p-3.5 mb-6 flex items-start gap-3">
          <div className="p-2 bg-amber-100 dark:bg-[#19191F] border border-amber-300 dark:border-[#D4AF37]/35 text-[#9A7218] dark:text-[#F3DFA2] rounded-lg mt-0.5">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="text-xs text-zinc-700 dark:text-[#B5AA92] leading-relaxed">
            <p className="font-bold text-[#9A7218] dark:text-[#F6E2A6] mb-0.5">التطبيق محمي بالكامل</p>
            أدخل كود الدخول المخصص الممنوح لك من المالك للمتابعة، أو تواصل مع الدعم عبر تليجرام للحصول على كود.
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-900 dark:text-[#F6E2A6] mb-1.5">
              كود الدخول المخصص (مثال: NHJ-K7QP3M)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="NHJ-XXXXXX"
              className="w-full px-4 py-3 text-center tracking-widest font-mono text-base font-bold bg-zinc-50 dark:bg-[#09090C] text-zinc-900 dark:text-[#F6E2A6] border-2 border-zinc-200 dark:border-[#D4AF37]/30 focus:border-[#D4AF37] focus:bg-white dark:focus:bg-[#09090C] rounded-xl focus:outline-none transition-all placeholder:text-zinc-400 placeholder:font-sans uppercase"
              dir="ltr"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-luxury-gold w-full py-3.5 px-4 active:scale-[0.99] font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block animate-spin text-lg">⏳</span>
            ) : (
              <>
                <span>دخول إلى نظام نَهج</span>
                <span className="text-base">←</span>
              </>
            )}
          </button>
        </form>

        {/* Telegram Support Box */}
        <div className="mt-5 p-3.5 bg-amber-50/70 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/30 rounded-xl text-center">
          <p className="text-xs text-zinc-700 dark:text-[#B5AA92] font-medium mb-2">
            ليس لديك كود دخول أو ترغب في الاشتراك؟
          </p>
          <a
            href={telegramSupportUrl || 'https://t.me/Y_lI11'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#08080A] hover:bg-[#19191F] text-[#F3DFA2] text-xs font-bold rounded-lg shadow-sm transition-all border border-[#D4AF37]/40"
          >
            <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>تواصل مع الدعم عبر تليجرام للحصول على كود</span>
          </a>
        </div>

        {/* Owner Portal Dedicated Button */}
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-[#D4AF37]/20 text-center">
          <button
            type="button"
            onClick={onOpenOwner}
            className="w-full py-2.5 px-3 bg-zinc-50 dark:bg-[#09090C] hover:bg-amber-50 dark:hover:bg-[#121217] border border-amber-400/50 dark:border-[#D4AF37]/35 rounded-xl text-xs font-bold text-[#9A7218] dark:text-[#E8CE88] transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>مدخل المالك (لوحة إصدار الأكواد والإدارة)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
