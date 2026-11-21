import { useEffect, useRef, useState } from 'react';

interface WakeLockState {
  isSupported: boolean;
  isWakeLocked: boolean;
}

/**
 * Keeps the device screen awake using the Screen Wake Lock API while `enabled` is true.
 * Automatically re-acquires the lock when returning to a visible tab and releases it on pause/unmount.
 */
export function useWakeLock(enabled: boolean): WakeLockState {
  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'wakeLock' in navigator;

  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!isSupported) {
      setIsWakeLocked(false);
      return;
    }

    let cancelled = false;

    const releaseLock = async () => {
      const current = sentinelRef.current;
      sentinelRef.current = null;
      if (current) {
        try {
          if (!current.released) {
            await current.release();
          }
        } catch {
          // Ignore release errors when browser already released the lock
        }
      }
      if (!cancelled) {
        setIsWakeLocked(false);
      }
    };

    const acquireLock = async () => {
      if (cancelled || !enabled) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      if (sentinelRef.current && !sentinelRef.current.released) {
        setIsWakeLocked(true);
        return;
      }

      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled || !enabled) {
          try {
            await sentinel.release();
          } catch {
            // Ignore cleanup error
          }
          return;
        }
        sentinelRef.current = sentinel;
        setIsWakeLocked(true);

        const handleRelease = () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
          }
          if (!cancelled) {
            setIsWakeLocked(false);
          }
        };
        sentinel.addEventListener('release', handleRelease);
      } catch {
        // Browsers may reject if battery saver is on or document is backgrounded
        if (!cancelled) {
          setIsWakeLocked(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        void acquireLock();
      }
    };

    if (enabled) {
      void acquireLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      void releaseLock();
    }

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseLock();
    };
  }, [enabled, isSupported]);

  return { isSupported, isWakeLocked };
}
