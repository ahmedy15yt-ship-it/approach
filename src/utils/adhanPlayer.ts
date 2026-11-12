// Centralized Adhan Audio Player & Scheduler for Nahj
// Supports Egyptian Adhan (Sheikh Abdulbasit) & Madinah Adhan with auto-play on prayer times

export interface Muezzin {
  id: string;
  name: string;
  url: string;
}

export const MUEZZINS: Muezzin[] = [
  {
    id: 'abdulbasit',
    name: 'الشيخ عبد الباسط عبد الصمد (مصر)',
    url: '/audio/adhan.mp3',
  },
  {
    id: 'madinah',
    name: 'أذان الحرم النبوي الشريف (المدينة المنورة)',
    url: '/audio/adhan_madinah.mp3',
  },
];

let globalAdhanAudio: HTMLAudioElement | null = null;
let activeListeners: Set<(isPlaying: boolean, currentMuezzin: string) => void> = new Set();
let currentMuezzinId = localStorage.getItem('nahj_muezzin') || 'abdulbasit';

export function getSelectedMuezzin(): Muezzin {
  return MUEZZINS.find((m) => m.id === currentMuezzinId) || MUEZZINS[0];
}

export function setSelectedMuezzin(id: string) {
  currentMuezzinId = id;
  localStorage.setItem('nahj_muezzin', id);
  if (globalAdhanAudio) {
    const wasPlaying = !globalAdhanAudio.paused;
    globalAdhanAudio.pause();
    globalAdhanAudio.src = getSelectedMuezzin().url;
    if (wasPlaying) {
      globalAdhanAudio.play().catch(() => {});
    }
  }
  notifyListeners();
}

export function isAutoAdhanEnabled(): boolean {
  return localStorage.getItem('nahj_auto_adhan') !== 'false';
}

export function setAutoAdhanEnabled(enabled: boolean) {
  localStorage.setItem('nahj_auto_adhan', enabled ? 'true' : 'false');
}

export function isAdhanPlaying(): boolean {
  return !!globalAdhanAudio && !globalAdhanAudio.paused;
}

export function subscribeAdhanState(listener: (isPlaying: boolean, currentMuezzin: string) => void) {
  activeListeners.add(listener);
  return () => {
    activeListeners.delete(listener);
  };
}

function notifyListeners() {
  const isPlaying = isAdhanPlaying();
  activeListeners.forEach((fn) => fn(isPlaying, currentMuezzinId));
}

export function playAdhan(muezzinId?: string): Promise<void> {
  if (muezzinId) {
    currentMuezzinId = muezzinId;
    localStorage.setItem('nahj_muezzin', muezzinId);
  }

  const muezzin = getSelectedMuezzin();

  if (!globalAdhanAudio) {
    globalAdhanAudio = new Audio(muezzin.url);
    globalAdhanAudio.onended = () => {
      notifyListeners();
    };
    globalAdhanAudio.onerror = () => {
      notifyListeners();
    };
  } else {
    if (globalAdhanAudio.src !== window.location.origin + muezzin.url && !globalAdhanAudio.src.endsWith(muezzin.url)) {
      globalAdhanAudio.src = muezzin.url;
    }
  }

  return globalAdhanAudio
    .play()
    .then(() => {
      notifyListeners();
    })
    .catch((err) => {
      console.warn('Adhan audio play error (user gesture may be needed):', err);
      notifyListeners();
    });
}

export function stopAdhan() {
  if (globalAdhanAudio) {
    globalAdhanAudio.pause();
    globalAdhanAudio.currentTime = 0;
  }
  notifyListeners();
}

export function toggleAdhan(muezzinId?: string) {
  if (isAdhanPlaying()) {
    stopAdhan();
  } else {
    playAdhan(muezzinId);
  }
}
