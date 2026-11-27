import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-black text-white shadow-lg border border-amber-300/50 font-['Cairo',sans-serif]"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>وضع عدم الاتصال — يتم استخدام البيانات المحفوظة</span>
    </div>
  );
};
