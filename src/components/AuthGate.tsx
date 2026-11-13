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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-zinc-900 dark:text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-['Cairo',sans-serif] transition-colors">
      {/* Background Subtle Elements */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#DC2626]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#09090B]/20 dark:bg-red-950/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-white dark:bg-[#121215] border border-red-200/70 dark:border-red-900/40 shadow-xl rounded-2xl p-6 sm:p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#DC2626] to-[#09090B] text-white shadow-md mb-4 ring-4 ring-[#DC2626]/15">
            <span className="font-['Amiri',serif] text-3xl font-bold">نَهْج</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            نَهج — أفضل نسخة منك
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2 font-medium leading-relaxed">
            النظام اليومي الشامل لطالب تالتة ثانوي علمي علوم
            <br />
            <span className="text-xs text-[#DC2626] dark:text-red-400 font-bold">مذاكرة • صحة • نفسية • روح • متابعة دقيقة</span>
          </p>
        </div>

        {/* Lock Notice */}
        <div className="bg-zinc-50 dark:bg-[#09090B] border border-red-200/70 dark:border-red-900/40 rounded-xl p-3.5 mb-6 flex items-start gap-3">
          <div className="p-2 bg-[#DC2626]/10 dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 rounded-lg mt-0.5">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <p className="font-bold text-[#DC2626] dark:text-red-400 mb-0.5">التطبيق محمي بالكامل</p>
            أدخل كود الدخول المخصص الممنوح لك من المالك للمتابعة، أو تواصل مع الدعم عبر تليجرام للحصول على كود.
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1.5">
              كود الدخول المخصص (مثال: NHJ-K7QP3M)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="NHJ-XXXXXX"
              className="w-full px-4 py-3 text-center tracking-widest font-mono text-base font-bold bg-zinc-50 dark:bg-[#09090B] text-zinc-900 dark:text-white border-2 border-zinc-200 dark:border-zinc-800 focus:border-[#DC2626] focus:bg-white dark:focus:bg-[#09090B] rounded-xl focus:outline-none transition-all placeholder:text-zinc-400 placeholder:font-sans uppercase"
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
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#DC2626] to-[#991B1B] hover:from-[#B91C1C] hover:to-[#7F1D1D] active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
        <div className="mt-5 p-3.5 bg-red-50/70 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 rounded-xl text-center">
          <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium mb-2">
            ليس لديك كود دخول أو ترغب في الاشتراك؟
          </p>
          <a
            href={telegramSupportUrl || 'https://t.me/Y_lI11'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all border border-red-900/40"
          >
            <Send className="w-3.5 h-3.5 text-[#DC2626]" />
            <span>تواصل مع الدعم عبر تليجرام للحصول على كود</span>
          </a>
        </div>

        {/* Owner Portal Dedicated Button */}
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <button
            type="button"
            onClick={onOpenOwner}
            className="w-full py-2.5 px-3 bg-zinc-50 dark:bg-[#09090B] hover:bg-red-50 dark:hover:bg-red-950/40 border border-amber-400/40 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 hover:text-[#DC2626] dark:hover:text-red-300 transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#C59B27]" />
            <span>مدخل المالك (لوحة إصدار الأكواد والإدارة)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
