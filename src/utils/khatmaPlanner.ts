import { KhatmaDayPlan, KhatmaPrayerKey, KhatmaPrayerWird } from '../types';

export const TOTAL_QURAN_PAGES = 604;

// Standard Madinah Mushaf 30 Juz starting page numbers
export const JUZ_START_PAGES: number[] = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182,
  202, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

export const KHATMA_PRAYER_SLOTS: Array<{ key: KhatmaPrayerKey; label: string }> = [
  { key: 'fajr', label: 'بعد الفجر' },
  { key: 'dhuhr', label: 'بعد الظهر' },
  { key: 'asr', label: 'بعد العصر' },
  { key: 'maghrib', label: 'بعد المغرب' },
  { key: 'isha', label: 'بعد العشاء' },
];

export function getJuzForPage(page: number): number {
  const clamped = Math.max(1, Math.min(TOTAL_QURAN_PAGES, Math.floor(page)));
  for (let i = JUZ_START_PAGES.length - 1; i >= 0; i--) {
    if (clamped >= JUZ_START_PAGES[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function buildKhatmaSchedule(
  targetDays: number,
  completedSlotKeys: string[]
): KhatmaDayPlan[] {
  const safeDays = Math.max(5, Math.min(120, Math.round(targetDays || 30)));
  const completedSet = new Set(completedSlotKeys);

  const totalSlots = safeDays * KHATMA_PRAYER_SLOTS.length;
  const days: KhatmaDayPlan[] = [];

  for (let dayIdx = 0; dayIdx < safeDays; dayIdx++) {
    const prayers: KhatmaPrayerWird[] = [];

    for (let pIdx = 0; pIdx < KHATMA_PRAYER_SLOTS.length; pIdx++) {
      const slotGlobalIdx = dayIdx * KHATMA_PRAYER_SLOTS.length + pIdx;
      const startPage = Math.min(
        TOTAL_QURAN_PAGES,
        Math.floor((slotGlobalIdx * TOTAL_QURAN_PAGES) / totalSlots) + 1
      );
      const nextBoundary = Math.floor(((slotGlobalIdx + 1) * TOTAL_QURAN_PAGES) / totalSlots);
      const endPage = Math.min(TOTAL_QURAN_PAGES, Math.max(startPage, nextBoundary));

      const slotKey = `${dayIdx + 1}:${KHATMA_PRAYER_SLOTS[pIdx].key}`;
      const juzStart = getJuzForPage(startPage);
      const juzEnd = getJuzForPage(endPage);

      prayers.push({
        prayerKey: KHATMA_PRAYER_SLOTS[pIdx].key,
        prayerLabel: KHATMA_PRAYER_SLOTS[pIdx].label,
        startPage,
        endPage,
        pagesCount: Math.max(1, endPage - startPage + 1),
        juzStart,
        juzEnd,
        completed: completedSet.has(slotKey),
      });
    }

    const dayStartPage = prayers[0].startPage;
    const dayEndPage = prayers[prayers.length - 1].endPage;
    const dayJuzStart = getJuzForPage(dayStartPage);
    const dayJuzEnd = getJuzForPage(dayEndPage);

    days.push({
      dayNumber: dayIdx + 1,
      startPage: dayStartPage,
      endPage: dayEndPage,
      juzRangeLabel:
        dayJuzStart === dayJuzEnd
          ? `الجزء ${dayJuzStart}`
          : `من الجزء ${dayJuzStart} إلى ${dayJuzEnd}`,
      prayers,
    });
  }

  return days;
}
