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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-['Cairo',sans-serif]">
      {/* Background Subtle Elements */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#1E40AF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#C59B27]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-white border border-[#1E40AF]/15 shadow-xl rounded-2xl p-6 sm:p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1E40AF] text-[#F8FAFC] shadow-md mb-4 ring-4 ring-[#1E40AF]/10">
            <span className="font-['Amiri',serif] text-3xl font-bold">نَهْج</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            نَهج — أفضل نسخة منك
          </h1>
          <p className="text-sm text-[#334155] mt-2 font-medium leading-relaxed">
            النظام اليومي الشامل لطالب تالتة ثانوي علمي علوم
            <br />
            <span className="text-xs text-[#8A7A55]">مذاكرة • صحة • نفسية • روح • متابعة دقيقة</span>
          </p>
        </div>

        {/* Lock Notice */}
        <div className="bg-[#F8FAFC] border border-[#1E40AF]/20 rounded-xl p-3.5 mb-6 flex items-start gap-3">
          <div className="p-2 bg-[#1E40AF]/10 text-[#1E40AF] rounded-lg mt-0.5">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="text-xs text-[#1E293B] leading-relaxed">
            <p className="font-bold text-[#1E40AF] mb-0.5">التطبيق محمي بالكامل</p>
            أدخل كود الدخول المخصص الممنوح لك من المالك للمتابعة، أو تواصل مع الدعم عبر تليجرام للحصول على كود.
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
              كود الدخول المخصص (مثال: NHJ-K7QP3M)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="NHJ-XXXXXX"
              className="w-full px-4 py-3 text-center tracking-widest font-mono text-base font-bold bg-[#F8FAFC] border-2 border-[#E2E8F0] focus:border-[#1E40AF] focus:bg-white rounded-xl focus:outline-none transition-all placeholder:text-[#9BA39B] placeholder:font-sans uppercase"
              dir="ltr"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-[#1E40AF] hover:bg-[#1E3A8A] active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
        <div className="mt-5 p-3.5 bg-[#F0F5F2] border border-[#1E40AF]/20 rounded-xl text-center">
          <p className="text-xs text-[#1E293B] font-medium mb-2">
            ليس لديك كود دخول أو ترغب في الاشتراك؟
          </p>
          <a
            href={telegramSupportUrl || 'https://t.me/Y_lI11'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#229ED9] hover:bg-[#1E8EC4] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>تواصل مع الدعم عبر تليجرام للحصول على كود</span>
          </a>
        </div>

        {/* Owner Portal Dedicated Button */}
        <div className="mt-5 pt-4 border-t border-[#E2E8F0] text-center">
          <button
            type="button"
            onClick={onOpenOwner}
            className="w-full py-2.5 px-3 bg-[#F8FAFC] hover:bg-[#F2EFE9] border border-[#C59B27]/40 rounded-xl text-xs font-bold text-[#8C7A52] hover:text-[#1E40AF] transition-all flex items-center justify-center gap-2 shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4 text-[#C59B27]" />
            <span>مدخل المالك (لوحة إصدار الأكواد والإدارة)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
