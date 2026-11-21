import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  PlusCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  AlertTriangle,
  Lock,
  Send,
  Users,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface OwnerCodeItem {
  id: number;
  displayPrefix: string;
  studentName: string;
  createdAt: string;
  isActive: boolean;
  lastUsedAt?: string;
  usageCount: number;
}

interface OwnerDashboardProps {
  onClose: () => void;
  telegramSupportUrl: string;
  onUpdateTelegramUrl: (newUrl: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  onClose,
  telegramSupportUrl,
  onUpdateTelegramUrl,
}) => {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [codes, setCodes] = useState<OwnerCodeItem[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // One-time code reveal modal state
  const [onceOnlyCreatedCode, setOnceOnlyCreatedCode] = useState<string | null>(null);
  const [createdStudentName, setCreatedStudentName] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Settings
  const [newTelegramInput, setNewTelegramInput] = useState(telegramSupportUrl);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        loadCodes(pin);
      } else {
        setAuthError(data.message || 'كلمة المرور غير صحيحة');
      }
    } catch {
      setAuthError('حدث خطأ في الاتصال بالخادم');
    }
  };

  const loadCodes = async (authPin: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/owner/codes', {
        headers: { 'x-owner-pin': authPin },
      });
      const data = await res.json();
      if (data.codes) {
        setCodes(data.codes);
        if (data.telegramSupportUrl) {
          setNewTelegramInput(data.telegramSupportUrl);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomSampleCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomCodeInput(`NHJ-${rand}`);
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    try {
      const res = await fetch('/api/owner/create-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-pin': pin,
        },
        body: JSON.stringify({
          studentName: newStudentName.trim(),
          customCode: customCodeInput.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.success && data.onceOnlyCode) {
        // Show once-only modal
        setOnceOnlyCreatedCode(data.onceOnlyCode);
        setCreatedStudentName(data.studentName);
        setNewStudentName('');
        setCustomCodeInput('');
        loadCodes(pin);
      } else {
        alert(data.error || 'فشل في إنشاء الكود');
      }
    } catch (err) {
      alert('خطأ أثناء إنشاء الكود');
    }
  };

  const handleToggleCode = async (id: number) => {
    try {
      const res = await fetch('/api/owner/toggle-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-pin': pin,
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        loadCodes(pin);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/owner/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-pin': pin,
        },
        body: JSON.stringify({ telegramSupportUrl: newTelegramInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdateTelegramUrl(newTelegramInput.trim());
        setSettingsSuccess('تم تحديث رابط تليجرام بنجاح');
        setTimeout(() => setSettingsSuccess(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-50 dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/40 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden relative my-6 max-h-[90vh] flex flex-col font-['Cairo',sans-serif]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-[#1E1E26] via-[#121217] to-[#08080A] border-b border-[#D4AF37]/30 text-[#F4EFE6] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#08080A] border border-[#D4AF37]/35 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-[#F6E2A6]" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-[#F6E2A6]">لوحة المالك والإدارة — نَهج</h2>
              <p className="text-xs text-[#B5AA92]">إنشاء أكواد الطلبة، التحكم في الصلاحيات، وإعدادات الدعم</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#B5AA92] hover:text-[#F6E2A6] hover:bg-[#08080A] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto grow">
          {!isAuthenticated ? (
            /* Owner Authentication Form */
            <div className="max-w-md mx-auto py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-[#09090C] border border-amber-300 dark:border-[#D4AF37]/35 text-[#9A7218] dark:text-[#F6E2A6] flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-[#F6E2A6] mb-1">تسجيل دخول المالك</h3>
              <p className="text-xs text-zinc-600 dark:text-[#B5AA92] mb-6">
                أدخل كلمة مرور المالك المعتمدة للوصول إلى لوحة إصدار الأكواد والتحكم
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="كلمة مرور المالك..."
                  className="w-full px-4 py-3 text-center text-base font-bold bg-white dark:bg-[#09090C] text-zinc-900 dark:text-[#F4EFE6] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-xl focus:border-[#D4AF37] focus:outline-none"
                  autoFocus
                />
                {authError && <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{authError}</p>}
                <button
                  type="submit"
                  className="btn-luxury-gold w-full py-3 font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                >
                  دخول لوحة التحكم
                </button>
              </form>
            </div>
          ) : (
            /* Authenticated Owner Dashboard */
            <div className="space-y-6">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-[#09090C] p-4 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 shadow-xs">
                  <span className="text-xs text-zinc-500 dark:text-[#B5AA92] block">إجمالي الأكواد المُصدرة</span>
                  <span className="text-2xl font-black text-[#9A7218] dark:text-[#F6E2A6] tabular-nums">{codes.length}</span>
                </div>
                <div className="bg-white dark:bg-[#09090C] p-4 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 shadow-xs">
                  <span className="text-xs text-zinc-500 dark:text-[#B5AA92] block">الأكواد النشطة حالياً</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {codes.filter((c) => c.isActive).length}
                  </span>
                </div>
                <div className="bg-white dark:bg-[#09090C] p-4 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 shadow-xs">
                  <span className="text-xs text-zinc-500 dark:text-[#B5AA92] block">الأكواد الملغاة</span>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                    {codes.filter((c) => !c.isActive).length}
                  </span>
                </div>
              </div>

              {/* Create Code Section */}
              <div className="bg-white dark:bg-[#09090C] p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 shadow-xs">
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-[#F6E2A6] mb-3 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#9A7218] dark:text-[#E8CE88]" />
                  <span>إنشاء كود وصول لطالب جديد</span>
                </h3>
                <form onSubmit={handleCreateCode} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-[#B5AA92] mb-1">اسم الطالب والمحافظة</label>
                    <input
                      type="text"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="مثال: يوسف أحمد - الإسكندرية"
                      required
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-[#19191F] text-zinc-900 dark:text-[#F4EFE6] border border-zinc-300 dark:border-[#D4AF37]/25 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-[#B5AA92]">الكود (أو اتركه للتوليد التلقائي)</label>
                      <button
                        type="button"
                        onClick={generateRandomSampleCode}
                        className="text-[10px] text-[#9A7218] dark:text-[#E8CE88] hover:underline font-bold cursor-pointer"
                      >
                        ولّد كود عشوائي
                      </button>
                    </div>
                    <input
                      type="text"
                      value={customCodeInput}
                      onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
                      placeholder="NHJ-K7QP3M"
                      className="w-full px-3 py-2 text-xs font-mono uppercase bg-zinc-50 dark:bg-[#19191F] text-zinc-900 dark:text-[#F6E2A6] border border-zinc-300 dark:border-[#D4AF37]/25 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                      dir="ltr"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="btn-luxury-gold w-full py-2.5 px-4 font-bold text-xs rounded-lg transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>إصدار الكود الآن</span>
                    </button>
                  </div>
                </form>
                <p className="text-[11px] text-amber-700 dark:text-[#E8CE88] mt-2 font-medium">
                  ⚠️ تنبيه الأمان: الكود سيظهر لك مرة واحدة فقط بعد الإنشاء مع زر النسخ؛ ولن تستطيع أنت أو الطالب رؤيته مجدداً بعد إغلاق النافذة.
                </p>
              </div>

              {/* Codes Table */}
              <div className="bg-white dark:bg-[#09090C] rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 shadow-xs overflow-hidden">
                <div className="p-3.5 border-b border-zinc-200 dark:border-[#D4AF37]/25 flex items-center justify-between bg-zinc-50 dark:bg-[#19191F]">
                  <span className="font-bold text-xs text-[#9A7218] dark:text-[#F6E2A6]">سجل أكواد الطلاب المعتمدة</span>
                  <button
                    onClick={() => loadCodes(pin)}
                    className="text-xs text-zinc-500 dark:text-[#B5AA92] hover:text-[#9A7218] dark:hover:text-[#F3DFA2] flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>تحديث</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-zinc-50 dark:bg-[#19191F] text-zinc-600 dark:text-[#B5AA92] font-bold border-b border-zinc-200 dark:border-[#D4AF37]/20">
                      <tr>
                        <th className="p-3">اسم الطالب</th>
                        <th className="p-3">الكود (المشفر)</th>
                        <th className="p-3">تاريخ الإنشاء</th>
                        <th className="p-3">مرات الاستخدام</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-[#D4AF37]/15">
                      {codes.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-[#19191F]/80 transition-colors">
                          <td className="p-3 font-bold text-zinc-900 dark:text-[#F4EFE6]">{item.studentName}</td>
                          <td className="p-3 font-mono font-bold text-[#9A7218] dark:text-[#E8CE88]" dir="ltr">
                            {item.displayPrefix}
                          </td>
                          <td className="p-3 text-zinc-500 dark:text-[#B5AA92]">
                            {new Date(item.createdAt).toLocaleDateString('ar-EG', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="p-3 font-medium text-zinc-700 dark:text-[#B5AA92] tabular-nums">{item.usageCount || 0} مرة</td>
                          <td className="p-3">
                            {item.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/50">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>نشط ومفعل</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200 dark:border-rose-900/50">
                                <XCircle className="w-3 h-3" />
                                <span>ملغي</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleCode(item.id)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                item.isActive
                                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50'
                                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900/50'
                              }`}
                            >
                              {item.isActive ? 'إلغاء الكود' : 'إعادة تفعيل'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Telegram Support Link Configuration */}
              <div className="bg-white dark:bg-[#09090C] p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 shadow-xs">
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-[#F6E2A6] mb-2 flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#D4AF37]" />
                  <span>تخصيص رابط تليجرام للدعم الفني للطلبة</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-[#B5AA92] mb-3">
                  هذا الرابط يظهر في شاشة الدخول للطلاب الذين ليس لديهم كود للتواصل معك مباشرة.
                </p>
                <form onSubmit={handleSaveSettings} className="flex gap-2">
                  <input
                    type="url"
                    value={newTelegramInput}
                    onChange={(e) => setNewTelegramInput(e.target.value)}
                    placeholder="https://t.me/your_username"
                    required
                    className="grow px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-[#19191F] text-zinc-900 dark:text-[#F4EFE6] border border-zinc-300 dark:border-[#D4AF37]/25 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                    dir="ltr"
                  />
                  <button
                    type="submit"
                    className="btn-luxury-gold px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer"
                  >
                    حفظ الرابط
                  </button>
                </form>
                {settingsSuccess && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-2">{settingsSuccess}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-zinc-100 dark:bg-[#08080A] border-t border-zinc-200 dark:border-[#D4AF37]/25 text-center shrink-0">
          <button
            onClick={onClose}
            className="btn-luxury-gold px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            إغلاق لوحة المالك والعودة للتطبيق
          </button>
        </div>
      </div>

      {/* ONE-TIME REVEAL POPUP MODAL */}
      {onceOnlyCreatedCode && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#19191F] rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border-2 border-[#D4AF37] animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-[#09090C] border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-[#D4AF37]" />
            </div>

            <h3 className="text-lg font-black text-zinc-900 dark:text-[#F6E2A6] mb-1">
              تم إصدار كود الطالب بنجاح!
            </h3>
            <p className="text-xs text-zinc-600 dark:text-[#B5AA92] mb-4">
              كود خاص بالطالب: <strong className="text-[#9A7218] dark:text-[#E8CE88]">{createdStudentName}</strong>
            </p>

            {/* Glowing Big Code Box */}
            <div className="p-4 bg-zinc-50 dark:bg-[#09090C] border-2 border-dashed border-[#D4AF37]/50 rounded-xl mb-4 select-all">
              <span className="font-mono text-2xl font-black text-[#9A7218] dark:text-[#F6E2A6] tracking-widest block" dir="ltr">
                {onceOnlyCreatedCode}
              </span>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-300 font-bold mb-5 leading-relaxed bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
              ⚡ احفظ أو انسخ هذا الكود فوراً وشاركه مع الطالب الآن!
              <br />
              هذا الكود لن يظهر مرة ثانية أبداً، لا لك ولا لأي شخص آخر، للحفاظ على الأمان التام.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(onceOnlyCreatedCode)}
                className="btn-luxury-gold grow py-3 px-4 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-800" />
                    <span>تم النسخ بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ الكود الآن</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setOnceOnlyCreatedCode(null);
                  setCopied(false);
                }}
                className="py-3 px-4 bg-zinc-100 dark:bg-[#09090C] hover:bg-zinc-200 dark:hover:bg-[#121217] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-700 dark:text-[#B5AA92] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                تم الحفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
