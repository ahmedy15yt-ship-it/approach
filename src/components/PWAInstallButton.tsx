import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, ExternalLink, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // Hide install button once running inside installed standalone app
  if (isInstalled) {
    return null;
  }

  const isInsideIframe =
    typeof window !== 'undefined' && window.self !== window.top;

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 3000);
        return;
      }
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="تثبيت تطبيق نَهج على جهازك مع أيقونة الشاشة الرئيسية"
        className={`btn-luxury-gold rounded-xl font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 ${
          compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
        } ${className}`}
      >
        <img
          src="/pwa-192x192.png"
          alt="أيقونة تطبيق نَهج"
          className="w-4 h-4 rounded-md object-cover ring-1 ring-[#09090B]/25 shrink-0"
        />
        {justInstalled ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>تم التثبيت ✔</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className={compact ? 'hidden sm:inline' : ''}>تثبيت التطبيق</span>
          </>
        )}
      </button>

      {showGuideModal && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-['Cairo',sans-serif]"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#19191F] border border-amber-300/70 dark:border-[#D4AF37]/40 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="أيقونة تطبيق نَهج"
                  className="w-12 h-12 rounded-2xl object-cover shadow-md border border-[#D4AF37]/40 shrink-0"
                />
                <div>
                  <h3 className="text-base font-black text-zinc-950 dark:text-[#F6E2A6]">
                    تثبيت تطبيق نَهج على جهازك
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-[#B5AA92]">
                    سيظهر بأيقونة مستقلة على الشاشة الرئيسية ويعمل كتطبيق أصلي.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-[#0D0D10] cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm text-zinc-800 dark:text-[#F4EFE6]">
                <p className="font-black text-[#9A7218] dark:text-[#E8CE88] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>خطوات التثبيت على iPhone / iPad (Safari):</span>
                </p>
                <ol className="space-y-2 list-decimal list-inside font-semibold">
                  <li className="flex items-center gap-1.5">
                    <span>1. اضغط على زر</span>
                    <strong className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-300">
                      <Share className="w-3.5 h-3.5" /> المشاركة (Share)
                    </strong>
                    <span>في شريط سفاري.</span>
                  </li>
                  <li className="flex items-center gap-1.5 flex-wrap">
                    <span>2. مرّر للأسفل واختر</span>
                    <strong className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-[#9A7218] dark:text-[#F3DFA2]">
                      <PlusSquare className="w-3.5 h-3.5" /> إضافة إلى الشاشة الرئيسية
                    </strong>
                  </li>
                  <li>3. اضغط «إضافة (Add)» في أعلى الشاشة.</li>
                </ol>
              </div>
            ) : (
              <div className="bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm text-zinc-800 dark:text-[#F4EFE6]">
                <p className="font-black text-[#9A7218] dark:text-[#E8CE88] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>خطوات التثبيت على Android / الكمبيوتر (Chrome / Edge):</span>
                </p>
                {isInsideIframe && (
                  <p className="text-xs font-bold text-amber-700 dark:text-[#F3DFA2] bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
                    التطبيق مفتوح حالياً داخل إطار معاينة؛ افتحه في نافذة متصفح مستقلة ليظهر لك زر التثبيت المباشر من النظام.
                  </p>
                )}
                <ol className="space-y-1.5 font-semibold">
                  <li>1. افتح قائمة المتصفح (⋮ أو أيقونة التثبيت في شريط العنوان).</li>
                  <li>2. اختر <strong>«تثبيت التطبيق (Install app)»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.</li>
                  <li>3. أكّد التثبيت ليظهر تطبيق نَهج بأيقونته على جهازك.</li>
                </ol>
                {isInsideIframe && typeof window !== 'undefined' && (
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 w-full py-2.5 px-4 btn-luxury-gold rounded-xl text-xs font-black flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>فتح التطبيق في نافذة مستقلة للتثبيت</span>
                  </a>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-black text-zinc-800 dark:text-[#E8CE88] hover:border-[#D4AF37] cursor-pointer"
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};
