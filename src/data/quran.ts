export interface SurahMeta {
  number: number;
  name: string;
  transliteration: string;
  versesCount: number;
  revelationType: 'مكية' | 'مدنية';
  startPage: number;
  juzNumber?: number;
}

export interface Ayah {
  numberInSurah: number;
  text: string;
  page?: number;
  juz?: number;
}

export interface SurahDetail extends SurahMeta {
  ayahs: Ayah[];
  audioUrl?: string;
}

export const UTHMANI_BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

export function toArabicNumeral(num: number): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .split('')
    .map((char) => {
      const idx = parseInt(char, 10);
      return isNaN(idx) ? char : arabicDigits[idx];
    })
    .join('');
}

export const SURAH_LIST: SurahMeta[] = [
  { number: 1, name: 'الفاتحة', transliteration: 'Al-Fatihah', versesCount: 7, revelationType: 'مكية', startPage: 1, juzNumber: 1 },
  { number: 2, name: 'البقرة', transliteration: 'Al-Baqarah', versesCount: 286, revelationType: 'مدنية', startPage: 2, juzNumber: 1 },
  { number: 3, name: 'آل عمران', transliteration: 'Ali \'Imran', versesCount: 200, revelationType: 'مدنية', startPage: 50, juzNumber: 3 },
  { number: 4, name: 'النساء', transliteration: 'An-Nisa', versesCount: 176, revelationType: 'مدنية', startPage: 77, juzNumber: 4 },
  { number: 5, name: 'المائدة', transliteration: 'Al-Ma\'idah', versesCount: 120, revelationType: 'مدنية', startPage: 106, juzNumber: 6 },
  { number: 6, name: 'الأنعام', transliteration: 'Al-An\'am', versesCount: 165, revelationType: 'مكية', startPage: 128, juzNumber: 7 },
  { number: 7, name: 'الأعراف', transliteration: 'Al-A\'raf', versesCount: 206, revelationType: 'مكية', startPage: 151, juzNumber: 8 },
  { number: 8, name: 'الأنفال', transliteration: 'Al-Anfal', versesCount: 75, revelationType: 'مدنية', startPage: 177, juzNumber: 9 },
  { number: 9, name: 'التوبة', transliteration: 'At-Tawbah', versesCount: 129, revelationType: 'مدنية', startPage: 187, juzNumber: 10 },
  { number: 10, name: 'يونس', transliteration: 'Yunus', versesCount: 109, revelationType: 'مكية', startPage: 208, juzNumber: 11 },
  { number: 11, name: 'هود', transliteration: 'Hud', versesCount: 123, revelationType: 'مكية', startPage: 221, juzNumber: 11 },
  { number: 12, name: 'يوسف', transliteration: 'Yusuf', versesCount: 111, revelationType: 'مكية', startPage: 235, juzNumber: 12 },
  { number: 13, name: 'الرعد', transliteration: 'Ar-Ra\'d', versesCount: 43, revelationType: 'مدنية', startPage: 249, juzNumber: 13 },
  { number: 14, name: 'إبراهيم', transliteration: 'Ibrahim', versesCount: 52, revelationType: 'مكية', startPage: 255, juzNumber: 13 },
  { number: 15, name: 'الحجر', transliteration: 'Al-Hijr', versesCount: 99, revelationType: 'مكية', startPage: 262, juzNumber: 14 },
  { number: 16, name: 'النحل', transliteration: 'An-Nahl', versesCount: 128, revelationType: 'مكية', startPage: 267, juzNumber: 14 },
  { number: 17, name: 'الإسراء', transliteration: 'Al-Isra', versesCount: 111, revelationType: 'مكية', startPage: 282, juzNumber: 15 },
  { number: 18, name: 'الكهف', transliteration: 'Al-Kahf', versesCount: 110, revelationType: 'مكية', startPage: 293, juzNumber: 15 },
  { number: 19, name: 'مريم', transliteration: 'Maryam', versesCount: 98, revelationType: 'مكية', startPage: 305, juzNumber: 16 },
  { number: 20, name: 'طه', transliteration: 'Taha', versesCount: 135, revelationType: 'مكية', startPage: 312, juzNumber: 16 },
  { number: 21, name: 'الأنبياء', transliteration: 'Al-Anbiya', versesCount: 112, revelationType: 'مكية', startPage: 322, juzNumber: 17 },
  { number: 22, name: 'الحج', transliteration: 'Al-Hajj', versesCount: 78, revelationType: 'مدنية', startPage: 332, juzNumber: 17 },
  { number: 23, name: 'المؤمنون', transliteration: 'Al-Mu\'minun', versesCount: 118, revelationType: 'مكية', startPage: 342, juzNumber: 18 },
  { number: 24, name: 'النور', transliteration: 'An-Nur', versesCount: 64, revelationType: 'مدنية', startPage: 350, juzNumber: 18 },
  { number: 25, name: 'الفرقان', transliteration: 'Al-Furqan', versesCount: 77, revelationType: 'مكية', startPage: 359, juzNumber: 18 },
  { number: 26, name: 'الشعراء', transliteration: 'Ash-Shu\'ara', versesCount: 227, revelationType: 'مكية', startPage: 367, juzNumber: 19 },
  { number: 27, name: 'النمل', transliteration: 'An-Naml', versesCount: 93, revelationType: 'مكية', startPage: 377, juzNumber: 19 },
  { number: 28, name: 'القصص', transliteration: 'Al-Qasas', versesCount: 88, revelationType: 'مكية', startPage: 385, juzNumber: 20 },
  { number: 29, name: 'العنكبوت', transliteration: 'Al-\'Ankabut', versesCount: 69, revelationType: 'مكية', startPage: 396, juzNumber: 20 },
  { number: 30, name: 'الروم', transliteration: 'Ar-Rum', versesCount: 60, revelationType: 'مكية', startPage: 404, juzNumber: 21 },
  { number: 31, name: 'لقمان', transliteration: 'Luqman', versesCount: 34, revelationType: 'مكية', startPage: 411, juzNumber: 21 },
  { number: 32, name: 'السجدة', transliteration: 'As-Sajdah', versesCount: 30, revelationType: 'مكية', startPage: 415, juzNumber: 21 },
  { number: 33, name: 'الأحزاب', transliteration: 'Al-Ahzab', versesCount: 73, revelationType: 'مدنية', startPage: 418, juzNumber: 21 },
  { number: 34, name: 'سبأ', transliteration: 'Saba', versesCount: 54, revelationType: 'مكية', startPage: 428, juzNumber: 22 },
  { number: 35, name: 'فاطر', transliteration: 'Fatir', versesCount: 45, revelationType: 'مكية', startPage: 434, juzNumber: 22 },
  { number: 36, name: 'يس', transliteration: 'Ya-Sin', versesCount: 83, revelationType: 'مكية', startPage: 440, juzNumber: 22 },
  { number: 37, name: 'الصافات', transliteration: 'As-Saffat', versesCount: 182, revelationType: 'مكية', startPage: 446, juzNumber: 23 },
  { number: 38, name: 'ص', transliteration: 'Sad', versesCount: 88, revelationType: 'مكية', startPage: 453, juzNumber: 23 },
  { number: 39, name: 'الزمر', transliteration: 'Az-Zumar', versesCount: 75, revelationType: 'مكية', startPage: 458, juzNumber: 23 },
  { number: 40, name: 'غافر', transliteration: 'Ghafir', versesCount: 85, revelationType: 'مكية', startPage: 467, juzNumber: 24 },
  { number: 41, name: 'فصلت', transliteration: 'Fussilat', versesCount: 54, revelationType: 'مكية', startPage: 477, juzNumber: 24 },
  { number: 42, name: 'الشورى', transliteration: 'Ash-Shura', versesCount: 53, revelationType: 'مكية', startPage: 483, juzNumber: 25 },
  { number: 43, name: 'الزخرف', transliteration: 'Az-Zukhruf', versesCount: 89, revelationType: 'مكية', startPage: 489, juzNumber: 25 },
  { number: 44, name: 'الدخان', transliteration: 'Ad-Dukhan', versesCount: 59, revelationType: 'مكية', startPage: 496, juzNumber: 25 },
  { number: 45, name: 'الجاثية', transliteration: 'Al-Jathiyah', versesCount: 37, revelationType: 'مكية', startPage: 499, juzNumber: 25 },
  { number: 46, name: 'الأحقاف', transliteration: 'Al-Ahqaf', versesCount: 35, revelationType: 'مكية', startPage: 502, juzNumber: 26 },
  { number: 47, name: 'محمد', transliteration: 'Muhammad', versesCount: 38, revelationType: 'مدنية', startPage: 507, juzNumber: 26 },
  { number: 48, name: 'الفتح', transliteration: 'Al-Fath', versesCount: 29, revelationType: 'مدنية', startPage: 511, juzNumber: 26 },
  { number: 49, name: 'الحجرات', transliteration: 'Al-Hujurat', versesCount: 18, revelationType: 'مدنية', startPage: 515, juzNumber: 26 },
  { number: 50, name: 'ق', transliteration: 'Qaf', versesCount: 45, revelationType: 'مكية', startPage: 518, juzNumber: 26 },
  { number: 51, name: 'الذاريات', transliteration: 'Adh-Dhariyat', versesCount: 60, revelationType: 'مكية', startPage: 520, juzNumber: 26 },
  { number: 52, name: 'الطور', transliteration: 'At-Tur', versesCount: 49, revelationType: 'مكية', startPage: 523, juzNumber: 27 },
  { number: 53, name: 'النجم', transliteration: 'An-Najm', versesCount: 62, revelationType: 'مكية', startPage: 526, juzNumber: 27 },
  { number: 54, name: 'القمر', transliteration: 'Al-Qamar', versesCount: 55, revelationType: 'مكية', startPage: 528, juzNumber: 27 },
  { number: 55, name: 'الرحمن', transliteration: 'Ar-Rahman', versesCount: 78, revelationType: 'مدنية', startPage: 531, juzNumber: 27 },
  { number: 56, name: 'الواقعة', transliteration: 'Al-Waqi\'ah', versesCount: 96, revelationType: 'مكية', startPage: 534, juzNumber: 27 },
  { number: 57, name: 'الحديد', transliteration: 'Al-Hadid', versesCount: 29, revelationType: 'مدنية', startPage: 537, juzNumber: 27 },
  { number: 58, name: 'المجادلة', transliteration: 'Al-Mujadila', versesCount: 22, revelationType: 'مدنية', startPage: 542, juzNumber: 28 },
  { number: 59, name: 'الحشر', transliteration: 'Al-Hashr', versesCount: 24, revelationType: 'مدنية', startPage: 545, juzNumber: 28 },
  { number: 60, name: 'الممتحنة', transliteration: 'Al-Mumtahanah', versesCount: 13, revelationType: 'مدنية', startPage: 549, juzNumber: 28 },
  { number: 61, name: 'الصف', transliteration: 'As-Saff', versesCount: 14, revelationType: 'مدنية', startPage: 551, juzNumber: 28 },
  { number: 62, name: 'الجمعة', transliteration: 'Al-Jumu\'ah', versesCount: 11, revelationType: 'مدنية', startPage: 553, juzNumber: 28 },
  { number: 63, name: 'المنافقون', transliteration: 'Al-Munafiqun', versesCount: 11, revelationType: 'مدنية', startPage: 554, juzNumber: 28 },
  { number: 64, name: 'التغابن', transliteration: 'At-Taghabun', versesCount: 18, revelationType: 'مدنية', startPage: 556, juzNumber: 28 },
  { number: 65, name: 'الطلاق', transliteration: 'At-Talaq', versesCount: 12, revelationType: 'مدنية', startPage: 558, juzNumber: 28 },
  { number: 66, name: 'التحريم', transliteration: 'At-Tahrim', versesCount: 12, revelationType: 'مدنية', startPage: 560, juzNumber: 28 },
  { number: 67, name: 'الملك', transliteration: 'Al-Mulk', versesCount: 30, revelationType: 'مكية', startPage: 562, juzNumber: 29 },
  { number: 68, name: 'القلم', transliteration: 'Al-Qalam', versesCount: 52, revelationType: 'مكية', startPage: 564, juzNumber: 29 },
  { number: 69, name: 'الحاقة', transliteration: 'Al-Haqqah', versesCount: 52, revelationType: 'مكية', startPage: 566, juzNumber: 29 },
  { number: 70, name: 'المعارج', transliteration: 'Al-Ma\'arij', versesCount: 44, revelationType: 'مكية', startPage: 568, juzNumber: 29 },
  { number: 71, name: 'نوح', transliteration: 'Nuh', versesCount: 28, revelationType: 'مكية', startPage: 570, juzNumber: 29 },
  { number: 72, name: 'الجن', transliteration: 'Al-Jinn', versesCount: 28, revelationType: 'مكية', startPage: 572, juzNumber: 29 },
  { number: 73, name: 'المزمل', transliteration: 'Al-Muzzammil', versesCount: 20, revelationType: 'مكية', startPage: 574, juzNumber: 29 },
  { number: 74, name: 'المدثر', transliteration: 'Al-Muddaththir', versesCount: 56, revelationType: 'مكية', startPage: 575, juzNumber: 29 },
  { number: 75, name: 'القيامة', transliteration: 'Al-Qiyamah', versesCount: 40, revelationType: 'مكية', startPage: 577, juzNumber: 29 },
  { number: 76, name: 'الإنسان', transliteration: 'Al-Insan', versesCount: 31, revelationType: 'مدنية', startPage: 578, juzNumber: 29 },
  { number: 77, name: 'المرسلات', transliteration: 'Al-Mursalat', versesCount: 50, revelationType: 'مكية', startPage: 580, juzNumber: 29 },
  { number: 78, name: 'النبأ', transliteration: 'An-Naba', versesCount: 40, revelationType: 'مكية', startPage: 582, juzNumber: 30 },
  { number: 79, name: 'النازعات', transliteration: 'An-Nazi\'at', versesCount: 46, revelationType: 'مكية', startPage: 583, juzNumber: 30 },
  { number: 80, name: 'عبس', transliteration: '\'Abasa', versesCount: 42, revelationType: 'مكية', startPage: 585, juzNumber: 30 },
  { number: 81, name: 'التكوير', transliteration: 'At-Takwir', versesCount: 29, revelationType: 'مكية', startPage: 586, juzNumber: 30 },
  { number: 82, name: 'الانفطار', transliteration: 'Al-Infitar', versesCount: 19, revelationType: 'مكية', startPage: 587, juzNumber: 30 },
  { number: 83, name: 'المطففين', transliteration: 'Al-Mutaffifin', versesCount: 36, revelationType: 'مكية', startPage: 587, juzNumber: 30 },
  { number: 84, name: 'الانشقاق', transliteration: 'Al-Inshiqaq', versesCount: 25, revelationType: 'مكية', startPage: 589, juzNumber: 30 },
  { number: 85, name: 'البروج', transliteration: 'Al-Buruj', versesCount: 22, revelationType: 'مكية', startPage: 590, juzNumber: 30 },
  { number: 86, name: 'الطارق', transliteration: 'At-Tariq', versesCount: 17, revelationType: 'مكية', startPage: 591, juzNumber: 30 },
  { number: 87, name: 'الأعلى', transliteration: 'Al-A\'la', versesCount: 19, revelationType: 'مكية', startPage: 591, juzNumber: 30 },
  { number: 88, name: 'الغاشية', transliteration: 'Al-Ghashiyah', versesCount: 26, revelationType: 'مكية', startPage: 592, juzNumber: 30 },
  { number: 89, name: 'الفجر', transliteration: 'Al-Fajr', versesCount: 30, revelationType: 'مكية', startPage: 593, juzNumber: 30 },
  { number: 90, name: 'البلد', transliteration: 'Al-Balad', versesCount: 20, revelationType: 'مكية', startPage: 594, juzNumber: 30 },
  { number: 91, name: 'الشمس', transliteration: 'Ash-Shams', versesCount: 15, revelationType: 'مكية', startPage: 595, juzNumber: 30 },
  { number: 92, name: 'الليل', transliteration: 'Al-Layl', versesCount: 21, revelationType: 'مكية', startPage: 595, juzNumber: 30 },
  { number: 93, name: 'الضحى', transliteration: 'Ad-Duha', versesCount: 11, revelationType: 'مكية', startPage: 596, juzNumber: 30 },
  { number: 94, name: 'الشرح', transliteration: 'Ash-Sharh', versesCount: 8, revelationType: 'مكية', startPage: 596, juzNumber: 30 },
  { number: 95, name: 'التين', transliteration: 'At-Tin', versesCount: 8, revelationType: 'مكية', startPage: 597, juzNumber: 30 },
  { number: 96, name: 'العلق', transliteration: 'Al-\'Alaq', versesCount: 19, revelationType: 'مكية', startPage: 597, juzNumber: 30 },
  { number: 97, name: 'القدر', transliteration: 'Al-Qadr', versesCount: 5, revelationType: 'مكية', startPage: 598, juzNumber: 30 },
  { number: 98, name: 'البينة', transliteration: 'Al-Bayyinah', versesCount: 8, revelationType: 'مدنية', startPage: 598, juzNumber: 30 },
  { number: 99, name: 'الزلزلة', transliteration: 'Az-Zalzalah', versesCount: 8, revelationType: 'مدنية', startPage: 599, juzNumber: 30 },
  { number: 100, name: 'العاديات', transliteration: 'Al-\'Adiyat', versesCount: 11, revelationType: 'مكية', startPage: 599, juzNumber: 30 },
  { number: 101, name: 'القارعة', transliteration: 'Al-Qari\'ah', versesCount: 11, revelationType: 'مكية', startPage: 600, juzNumber: 30 },
  { number: 102, name: 'التكاثر', transliteration: 'At-Takathur', versesCount: 8, revelationType: 'مكية', startPage: 600, juzNumber: 30 },
  { number: 103, name: 'العصر', transliteration: 'Al-\'Asr', versesCount: 3, revelationType: 'مكية', startPage: 601, juzNumber: 30 },
  { number: 104, name: 'الهمزة', transliteration: 'Al-Humazah', versesCount: 9, revelationType: 'مكية', startPage: 601, juzNumber: 30 },
  { number: 105, name: 'الفيل', transliteration: 'Al-Fil', versesCount: 5, revelationType: 'مكية', startPage: 601, juzNumber: 30 },
  { number: 106, name: 'قريش', transliteration: 'Quraysh', versesCount: 4, revelationType: 'مكية', startPage: 602, juzNumber: 30 },
  { number: 107, name: 'الماعون', transliteration: 'Al-Ma\'un', versesCount: 7, revelationType: 'مكية', startPage: 602, juzNumber: 30 },
  { number: 108, name: 'الكوثر', transliteration: 'Al-Kawthar', versesCount: 3, revelationType: 'مكية', startPage: 602, juzNumber: 30 },
  { number: 109, name: 'الكافرون', transliteration: 'Al-Kafirun', versesCount: 6, revelationType: 'مكية', startPage: 603, juzNumber: 30 },
  { number: 110, name: 'النصر', transliteration: 'An-Nasr', versesCount: 3, revelationType: 'مدنية', startPage: 603, juzNumber: 30 },
  { number: 111, name: 'المسد', transliteration: 'Al-Masad', versesCount: 5, revelationType: 'مكية', startPage: 603, juzNumber: 30 },
  { number: 112, name: 'الإخلاص', transliteration: 'Al-Ikhlas', versesCount: 4, revelationType: 'مكية', startPage: 604, juzNumber: 30 },
  { number: 113, name: 'الفلق', transliteration: 'Al-Falaq', versesCount: 5, revelationType: 'مكية', startPage: 604, juzNumber: 30 },
  { number: 114, name: 'الناس', transliteration: 'An-Nas', versesCount: 6, revelationType: 'مكية', startPage: 604, juzNumber: 30 },
];

export interface Reciter {
  id: string;
  name: string;
  subServer: string;
}

export const RECITERS: Reciter[] = [
  { id: 'alafasy', name: 'مشاري راشد العفاسي', subServer: 'https://server8.mp3quran.net/afs/' },
  { id: 'husary', name: 'محمود خليل الحصري (مرتل)', subServer: 'https://server13.mp3quran.net/husr/' },
  { id: 'abdulbasit', name: 'عبد الباسط عبد الصمد (مرتل)', subServer: 'https://server7.mp3quran.net/basit/' },
  { id: 'ghamdi', name: 'سعد الغامدي', subServer: 'https://server7.mp3quran.net/s_gmd/' },
  { id: 'maher', name: 'ماهر المعيقلي', subServer: 'https://server12.mp3quran.net/maher/' },
];

export function getSurahAudioUrl(surahNumber: number, reciterId: string = 'alafasy'): string {
  const reciter = RECITERS.find((r) => r.id === reciterId) || RECITERS[0];
  const numStr = String(surahNumber).padStart(3, '0');
  return `${reciter.subServer}${numStr}.mp3`;
}

// In-Memory cache for loaded Surahs
const inMemoryQuranCache: Record<number, Ayah[]> = {};

// Clean Uthmani Basmala prefix from first verse if not Surah 1
function cleanAyahOneText(surahNumber: number, text: string): string {
  if (surahNumber === 1 || surahNumber === 9) {
    return text.trim();
  }
  const basmalaVariants = [
    'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    '﻿بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  ];

  let cleaned = text.trim();
  for (const b of basmalaVariants) {
    if (cleaned.startsWith(b)) {
      cleaned = cleaned.substring(b.length).trim();
      break;
    }
  }
  return cleaned;
}

// Comprehensive Fetcher with multi-tier caching (Memory -> LocalStorage -> Backend -> Remote CDN)
export async function fetchSurahUthmani(surahNumber: number): Promise<Ayah[]> {
  // 1. In-memory check
  if (inMemoryQuranCache[surahNumber] && inMemoryQuranCache[surahNumber].length > 0) {
    return inMemoryQuranCache[surahNumber];
  }

  // 2. LocalStorage check
  try {
    const saved = localStorage.getItem(`nahj_quran_uthmani_${surahNumber}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryQuranCache[surahNumber] = parsed;
        return parsed;
      }
    }
  } catch {}

  // 3. Built-in instant fallback check
  if (SURAH_PRELOADED_TEXTS[surahNumber]) {
    inMemoryQuranCache[surahNumber] = SURAH_PRELOADED_TEXTS[surahNumber];
  }

  // 4. Fetch from our full-stack server endpoint (Serves the complete 114 Surahs Uthmani database)
  try {
    const res = await fetch(`/api/quran/surah/${surahNumber}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data.ayahs) && json.data.ayahs.length > 0) {
        const ayahs: Ayah[] = json.data.ayahs.map((a: any, idx: number) => {
          let t = a.text;
          if (idx === 0) {
            t = cleanAyahOneText(surahNumber, t);
          }
          return {
            numberInSurah: a.numberInSurah || idx + 1,
            text: t,
            page: a.page,
            juz: a.juz,
          };
        });

        inMemoryQuranCache[surahNumber] = ayahs;
        try {
          localStorage.setItem(`nahj_quran_uthmani_${surahNumber}`, JSON.stringify(ayahs));
        } catch {}
        return ayahs;
      }
    }
  } catch (err) {
    console.warn('Backend quran fetch failed, falling back to remote AlQuran API', err);
  }

  // 5. Remote API Fallback (AlQuran Cloud Uthmani Edition)
  try {
    const remoteRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`);
    if (remoteRes.ok) {
      const json = await remoteRes.json();
      if (json.data && Array.isArray(json.data.ayahs) && json.data.ayahs.length > 0) {
        const ayahs: Ayah[] = json.data.ayahs.map((a: any, idx: number) => {
          let t = a.text;
          if (idx === 0) {
            t = cleanAyahOneText(surahNumber, t);
          }
          return {
            numberInSurah: a.numberInSurah || idx + 1,
            text: t,
            page: a.page,
            juz: a.juz,
          };
        });

        inMemoryQuranCache[surahNumber] = ayahs;
        try {
          localStorage.setItem(`nahj_quran_uthmani_${surahNumber}`, JSON.stringify(ayahs));
        } catch {}
        return ayahs;
      }
    }
  } catch (err) {
    console.error('Remote Quran fetch failed', err);
  }

  // 6. Return preloaded or cached
  return inMemoryQuranCache[surahNumber] || SURAH_PRELOADED_TEXTS[surahNumber] || [];
}

// Built-in instant Uthmani texts for foundational Surahs (Zero-wait offline guarantee)
export const SURAH_PRELOADED_TEXTS: Record<number, Ayah[]> = {
  1: [
    { numberInSurah: 1, text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ' },
    { numberInSurah: 2, text: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ' },
    { numberInSurah: 3, text: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ' },
    { numberInSurah: 4, text: 'مَٰلِكِ يَوْمِ ٱلدِّينِ' },
    { numberInSurah: 5, text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ' },
    { numberInSurah: 6, text: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ' },
    { numberInSurah: 7, text: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ' },
  ],
  94: [
    { numberInSurah: 1, text: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ' },
    { numberInSurah: 2, text: 'وَوَضَعْنَا عَنكَ وِزْرَكَ' },
    { numberInSurah: 3, text: 'ٱلَّذِىٓ أَنقَضَ ظَهْرَكَ' },
    { numberInSurah: 4, text: 'وَرَفَعْنَا لَكَ ذِكْرَكَ' },
    { numberInSurah: 5, text: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا' },
    { numberInSurah: 6, text: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا' },
    { numberInSurah: 7, text: 'فَإِذَا فَرَغْتَ فَٱنصَبْ' },
    { numberInSurah: 8, text: 'وَإِلَىٰ رَبِّكَ فَٱرْغَب' },
  ],
  108: [
    { numberInSurah: 1, text: 'إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ' },
    { numberInSurah: 2, text: 'فَصَلِّ لِرَبِّكَ وَٱنْحَرْ' },
    { numberInSurah: 3, text: 'إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ' },
  ],
  103: [
    { numberInSurah: 1, text: 'وَٱلْعَصْرِ' },
    { numberInSurah: 2, text: 'إِنَّ ٱلْإِنسَٰنَ لَفِى خُسْرٍ' },
    { numberInSurah: 3, text: 'إِلَّا ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّٰلِحَٰتِ وَتَوَاصَوْا۟ بِٱلْحَقِّ وَتَوَاصَوْا۟ بِٱلصَّبْرِ' },
  ],
  112: [
    { numberInSurah: 1, text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ' },
    { numberInSurah: 2, text: 'ٱللَّهُ ٱلصَّمَدُ' },
    { numberInSurah: 3, text: 'لَمْ يَلِدْ وَلَمْ يُولَدْ' },
    { numberInSurah: 4, text: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ' },
  ],
  113: [
    { numberInSurah: 1, text: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ' },
    { numberInSurah: 2, text: 'مِن شَرِّ مَا خَلَقَ' },
    { numberInSurah: 3, text: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ' },
    { numberInSurah: 4, text: 'وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ' },
    { numberInSurah: 5, text: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ' },
  ],
  114: [
    { numberInSurah: 1, text: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ' },
    { numberInSurah: 2, text: 'مَلِكِ ٱلنَّاسِ' },
    { numberInSurah: 3, text: 'إِلَٰهِ ٱلنَّاسِ' },
    { numberInSurah: 4, text: 'مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ' },
    { numberInSurah: 5, text: 'ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ' },
    { numberInSurah: 6, text: 'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ' },
  ],
};
