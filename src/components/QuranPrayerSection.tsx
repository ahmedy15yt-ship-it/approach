import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  MapPin,
  Sparkles,
  ArrowRight,
  Search,
  Bookmark,
  Check,
  Copy,
  Layers,
  FileText,
  Loader2,
  Share2,
} from 'lucide-react';
import {
  EGYPT_GOVERNORATES,
  Governorate,
  PrayerTime,
  calculatePrayerTimes,
  getNextPrayer,
} from '../data/prayer';
import {
  SURAH_LIST,
  SurahMeta,
  RECITERS,
  Reciter,
  getSurahAudioUrl,
  fetchSurahUthmani,
  toArabicNumeral,
  UTHMANI_BASMALA,
  Ayah,
} from '../data/quran';
import { AzkarTasbihSection } from './AzkarTasbihSection';
import {
  MUEZZINS,
  isAdhanPlaying,
  toggleAdhan,
  stopAdhan,
  isAutoAdhanEnabled,
  setAutoAdhanEnabled,
  getSelectedMuezzin,
  setSelectedMuezzin,
  subscribeAdhanState,
} from '../utils/adhanPlayer';

interface QuranPrayerSectionProps {
  currentGovernorate: string;
  onUpdateGovernorate: (govName: string) => void;
  onAwardBonusXp?: (amount: number) => void;
}

export const QuranPrayerSection: React.FC<QuranPrayerSectionProps> = ({
  currentGovernorate,
  onUpdateGovernorate,
  onAwardBonusXp,
}) => {
  // Main Tab: Quran or Azkar
  const [activeMainSection, setActiveMainSection] = useState<'quran' | 'azkar'>('quran');

  const [selectedGov, setSelectedGov] = useState<Governorate>(() => {
    return (
      EGYPT_GOVERNORATES.find((g) => g.name.includes(currentGovernorate)) ||
      EGYPT_GOVERNORATES[0]
    );
  });

  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [nextPrayerInfo, setNextPrayerInfo] = useState<{
    nextPrayer: PrayerTime;
    remainingFormatted: string;
  }>({
    nextPrayer: {} as PrayerTime,
    remainingFormatted: '...',
  });

  // Selected Surah View state
  const [activeSurah, setActiveSurah] = useState<SurahMeta | null>(null);
  const [surahAyahs, setSurahAyahs] = useState<Ayah[]>([]);
  const [isLoadingSurah, setIsLoadingSurah] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(24);
  const [viewMode, setViewMode] = useState<'mushaf' | 'verses'>('mushaf');
  const [currentPlayingAyahIndex, setCurrentPlayingAyahIndex] = useState<number>(0);
  const [copiedAyahNum, setCopiedAyahNum] = useState<number | null>(null);

  // Reciter & Audio
  const [selectedReciterId, setSelectedReciterId] = useState<string>('alafasy');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filters & Search
  const [surahSearch, setSurahSearch] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<'all' | 'juz_amma' | 'juz_tabarak' | 'study_blessed'>('all');
  const [selectedJuzFilter, setSelectedJuzFilter] = useState<number | 'all'>('all');

  // Adhan sound and auto-play state synced with centralized adhanPlayer
  const [isPlayingAdhan, setIsPlayingAdhan] = useState<boolean>(isAdhanPlaying());
  const [autoAdhanActive, setAutoAdhanActive] = useState<boolean>(isAutoAdhanEnabled());
  const [currentMuezzinId, setCurrentMuezzinId] = useState<string>(getSelectedMuezzin().id);

  useEffect(() => {
    const unsubscribe = subscribeAdhanState((playing, mId) => {
      setIsPlayingAdhan(playing);
      setCurrentMuezzinId(mId);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleAutoAdhan = () => {
    const nextVal = !autoAdhanActive;
    setAutoAdhanActive(nextVal);
    setAutoAdhanEnabled(nextVal);
  };

  const handleChangeMuezzin = (mId: string) => {
    setCurrentMuezzinId(mId);
    setSelectedMuezzin(mId);
  };

  // Bookmark / Last Read
  const [bookmark, setBookmark] = useState<{ surahNumber: number; surahName: string; page: number } | null>(() => {
    try {
      const saved = localStorage.getItem('nahj_quran_bookmark');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Calculate prayers on gov change
  useEffect(() => {
    const today = new Date();
    const calculated = calculatePrayerTimes(today, selectedGov);
    setPrayers(calculated);
  }, [selectedGov]);

  // Live countdown update
  useEffect(() => {
    if (!prayers.length) return;
    const updateCountdown = () => {
      const info = getNextPrayer(prayers);
      setNextPrayerInfo({
        nextPrayer: info.nextPrayer,
        remainingFormatted: info.remainingFormatted,
      });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [prayers]);

  const handleGovChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const govId = e.target.value;
    const found = EGYPT_GOVERNORATES.find((g) => g.id === govId) || EGYPT_GOVERNORATES[0];
    setSelectedGov(found);
    onUpdateGovernorate(found.name);
  };

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          let closest = EGYPT_GOVERNORATES[0];
          let minDist = 99999;
          EGYPT_GOVERNORATES.forEach((g) => {
            const dist = Math.hypot(g.lat - pos.coords.latitude, g.lng - pos.coords.longitude);
            if (dist < minDist) {
              minDist = dist;
              closest = g;
            }
          });
          setSelectedGov(closest);
          onUpdateGovernorate(closest.name);
        },
        () => {
          alert('تعذر تحديد الموقع الجغرافي تلقائياً، يمكنك الاختيار من القائمة.');
        }
      );
    }
  };

  // Open Surah in Reader with Full Uthmani Text Loading
  const openSurahReader = async (surah: SurahMeta) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
    setActiveSurah(surah);
    setCurrentPlayingAyahIndex(0);
    setIsLoadingSurah(true);
    setSurahAyahs([]);

    try {
      const ayahs = await fetchSurahUthmani(surah.number);
      setSurahAyahs(ayahs);
    } catch (err) {
      console.error('Error opening surah:', err);
    } finally {
      setIsLoadingSurah(false);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Audio Play / Pause for Surah
  const toggleSurahAudio = () => {
    if (!activeSurah) return;

    if (!audioRef.current) {
      const url = getSurahAudioUrl(activeSurah.number, selectedReciterId);
      const audio = new Audio(url);
      audio.onended = () => {
        setIsPlayingAudio(false);
        setCurrentPlayingAyahIndex(0);
      };
      audio.ontimeupdate = () => {
        if (audio.duration && surahAyahs.length > 1) {
          const progress = audio.currentTime / audio.duration;
          const idx = Math.min(surahAyahs.length - 1, Math.floor(progress * surahAyahs.length));
          setCurrentPlayingAyahIndex(idx);
        }
      };
      audio.play().catch((e) => console.log(e));
      audioRef.current = audio;
      setIsPlayingAudio(true);
    } else {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play().catch((e) => console.log(e));
        setIsPlayingAudio(true);
      }
    }
  };

  const handleReciterChange = (reciterId: string) => {
    setSelectedReciterId(reciterId);
    if (audioRef.current) {
      audioRef.current.pause();
      if (activeSurah) {
        const url = getSurahAudioUrl(activeSurah.number, reciterId);
        audioRef.current = new Audio(url);
        if (isPlayingAudio) {
          audioRef.current.play().catch((e) => console.log(e));
        }
      }
    }
  };

  const navigateSurah = (delta: number) => {
    if (!activeSurah) return;
    const nextNum = activeSurah.number + delta;
    if (nextNum >= 1 && nextNum <= 114) {
      const target = SURAH_LIST.find((s) => s.number === nextNum);
      if (target) openSurahReader(target);
    }
  };

  const handleToggleAdhanPlayback = () => {
    toggleAdhan(currentMuezzinId);
  };


  const handleSaveBookmark = () => {
    if (!activeSurah) return;
    const b = {
      surahNumber: activeSurah.number,
      surahName: activeSurah.name,
      page: activeSurah.startPage,
    };
    setBookmark(b);
    localStorage.setItem('nahj_quran_bookmark', JSON.stringify(b));
  };

  const handleCopyAyah = (ayahText: string, num: number) => {
    const full = `﴿ ${ayahText} ﴾ [سورة ${activeSurah?.name}: ${num}]`;
    navigator.clipboard.writeText(full).then(() => {
      setCopiedAyahNum(num);
      setTimeout(() => setCopiedAyahNum(null), 2000);
    });
  };

  // Filter Surahs
  const filteredSurahs = SURAH_LIST.filter((s) => {
    // text search
    const matchesSearch =
      s.name.includes(surahSearch.trim()) ||
      s.transliteration.toLowerCase().includes(surahSearch.trim().toLowerCase()) ||
      String(s.number) === surahSearch.trim();

    if (!matchesSearch) return false;

    // category filter
    if (selectedFilterCategory === 'juz_amma') {
      return s.number >= 78 && s.number <= 114;
    }
    if (selectedFilterCategory === 'juz_tabarak') {
      return s.number >= 67 && s.number <= 77;
    }
    if (selectedFilterCategory === 'study_blessed') {
      // Key blessed surahs for studying & calm: Al-Fatihah, Ya-Sin, Al-Kahf, Ar-Rahman, Al-Waqiah, Al-Mulk, Al-Sharh
      const blessed = [1, 18, 36, 55, 56, 67, 94, 112, 113, 114];
      return blessed.includes(s.number);
    }

    // Juz filter
    if (selectedJuzFilter !== 'all') {
      return s.juzNumber === selectedJuzFilter;
    }

    return true;
  });

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* 0) Top Main Navigation Tabs: Quran & Prayers vs Azkar & Tasbih */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-200/70 dark:bg-[#09090B] border border-zinc-300/70 dark:border-red-900/40 rounded-2xl">
        <button
          onClick={() => setActiveMainSection('quran')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMainSection === 'quran'
              ? 'bg-[#DC2626] text-white shadow-md'
              : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-900'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>المصحف الشريف ومواقيت الصلاة والأذان</span>
        </button>

        <button
          onClick={() => setActiveMainSection('azkar')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMainSection === 'azkar'
              ? 'bg-[#DC2626] text-white shadow-md'
              : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>حصن المسلم وأذكار المذاكرة والمسبحة</span>
          <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-zinc-950 text-[10px] font-black">
            جديد
          </span>
        </button>
      </div>

      {/* Render Azkar & Tasbih View if selected */}
      {activeMainSection === 'azkar' && (
        <AzkarTasbihSection onAwardXp={onAwardBonusXp} />
      )}

      {/* Render Quran & Prayer Times if selected */}
      {activeMainSection === 'quran' && (
        <>
          {/* 1) Prayer Times Card (27 Egyptian Governorates) */}
          <div className="bg-white dark:bg-[#121215] border border-red-200/70 dark:border-red-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors duration-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#DC2626]/10 dark:bg-red-950/50 text-[#DC2626] dark:text-red-300 flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-zinc-900 dark:text-white">
                    مواقيت الصلاة الفلكية — مصر (الهيئة العامة للمساحة)
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    محسوبة بدقة فلكية لكل الـ 27 محافظة بنظام 12 ساعة مع صوت أذان حقيقي
                  </p>
                </div>
              </div>

              {/* Controls: Governorate, Muezzin Selector, Auto-Adhan, Listen Button */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Governorate Selector */}
                <select
                  value={selectedGov.id}
                  onChange={handleGovChange}
                  className="bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-900 dark:text-white focus:border-[#DC2626] focus:outline-none"
                  title="اختر المحافظة"
                >
                  {EGYPT_GOVERNORATES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleDetectLocation}
                  className="p-2 bg-zinc-50 dark:bg-[#09090B] hover:bg-red-50 dark:hover:bg-red-950/40 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-[#DC2626] dark:text-red-300 transition-colors cursor-pointer"
                  title="تحديد المحافظة تلقائياً عبر GPS"
                >
                  <MapPin className="w-4 h-4" />
                </button>

                {/* Muezzin Choice Dropdown */}
                <select
                  value={currentMuezzinId}
                  onChange={(e) => handleChangeMuezzin(e.target.value)}
                  className="bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-900 dark:text-white focus:border-[#DC2626] focus:outline-none"
                  title="اختر صوت المؤذن"
                >
                  {MUEZZINS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                {/* Auto-Adhan Toggle Button */}
                <button
                  onClick={handleToggleAutoAdhan}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    autoAdhanActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                  }`}
                  title="تفعيل أو إلغاء تشغيل الأذان تلقائياً عند دخول كل صلاة"
                >
                  <span>الأذان التلقائي:</span>
                  <span className="font-black">{autoAdhanActive ? 'مفعّل 🔊' : 'معطّل 🔇'}</span>
                </button>

                {/* Listen to Real Adhan Play/Stop Button */}
                <button
                  onClick={handleToggleAdhanPlayback}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                    isPlayingAdhan
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs animate-pulse'
                      : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white'
                  }`}
                  title="تشغيل أو إيقاف صوت الأذان الحقيقي"
                >
                  {isPlayingAdhan ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-300" />}
                  <span>{isPlayingAdhan ? 'إيقاف الأذان' : 'سماع الأذان'}</span>
                </button>
              </div>
            </div>

            {/* Active Adhan Notice Banner */}
            {isPlayingAdhan && (
              <div className="p-3 bg-gradient-to-r from-amber-500/15 via-red-500/10 to-amber-500/15 border-2 border-amber-400 dark:border-amber-600/60 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold text-amber-950 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <span className="text-base animate-bounce">🕌</span>
                  <span>
                    صوت الأذان يعمل الآن ({getSelectedMuezzin().name}) — استمع وأنصت وكرر خلف المؤذن.
                  </span>
                </div>
                <button
                  onClick={stopAdhan}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-black cursor-pointer shrink-0"
                >
                  إيقاف الآن
                </button>
              </div>
            )}

            {/* 6 Prayer Times Horizontal Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
              {prayers.map((p) => {
                const isNext = p.key === nextPrayerInfo.nextPrayer.key;
                return (
                  <div
                    key={p.key}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isNext
                        ? 'bg-gradient-to-b from-[#DC2626] to-[#991B1B] text-white border-[#DC2626] shadow-md ring-2 ring-[#DC2626]/25'
                        : 'bg-zinc-50 dark:bg-[#09090B]/70 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-bold block mb-1 ${
                        isNext ? 'text-amber-300' : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {p.name}
                    </span>
                    <span className="font-mono text-base font-black tracking-wide" dir="ltr">
                      {p.time}
                    </span>
                    {isNext && (
                      <span className="text-[10px] block mt-1 text-amber-200 font-bold">
                        الصلاة القادمة ({nextPrayerInfo.remainingFormatted})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>


      {/* 2) Quran Section (Index or Single Surah Reader) */}
      {!activeSurah ? (
        /* Full Quran Catalog Index */
        <div className="bg-white dark:bg-[#121215] border border-red-200/70 dark:border-red-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 transition-colors duration-200">
          {/* Header & Quick Bookmark */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#DC2626]/10 dark:bg-red-950/60 text-[#DC2626] dark:text-red-300 rounded-full text-xs font-bold mb-1 border border-red-200/60 dark:border-red-900/50">
                <BookOpen className="w-3.5 h-3.5" />
                <span>المصحف الشريف كاملاً مكتوباً بالرسم العثماني</span>
              </div>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">
                القرآن الكريم كاملاً (114 سورة — 6,236 آية)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                مكتوب بالرسم العثماني المطابق لمصحف المدينة المنورة مع التلاوة الصوتية لأشهر 5 قرّاء
              </p>
            </div>

            {/* Resume Last Read Bookmark button if exists */}
            {bookmark && (
              <button
                onClick={() => {
                  const s = SURAH_LIST.find((item) => item.number === bookmark.surahNumber);
                  if (s) openSurahReader(s);
                }}
                className="bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 rounded-2xl p-3 text-right flex items-center gap-3 transition-all self-start md:self-auto cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold">
                  <Bookmark className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block">موضع قراءتك الأخير:</span>
                  <span className="text-xs font-black">
                    سورة {bookmark.surahName} (صـ {bookmark.page})
                  </span>
                </div>
                <ChevronLeft className="w-4 h-4 text-amber-700 dark:text-amber-400 mr-2" />
              </button>
            )}
          </div>

          {/* Search and Category Filter Pills */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative grow">
                <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3.5" />
                <input
                  type="text"
                  value={surahSearch}
                  onChange={(e) => setSurahSearch(e.target.value)}
                  placeholder="ابحث باسم السورة (مثل: الكهف، يس، البقرة) أو رقمها..."
                  className="w-full pr-10 pl-3 py-2.5 text-xs bg-zinc-50 dark:bg-[#09090B] text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 rounded-2xl focus:border-[#DC2626] focus:outline-none"
                />
              </div>

              {/* Juz selector dropdown */}
              <select
                value={selectedJuzFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedJuzFilter(val === 'all' ? 'all' : Number(val));
                }}
                className="bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-2xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white focus:border-[#DC2626] focus:outline-none"
              >
                <option value="all">كل الأجزاء (٣٠ جزءاً)</option>
                {Array.from({ length: 30 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    الجزء {toArabicNumeral(i + 1)} ({i + 1 === 30 ? 'جزء عم' : i + 1 === 29 ? 'تبارك' : `الجزء ${i + 1}`})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedFilterCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilterCategory === 'all'
                    ? 'bg-[#DC2626] text-white shadow-2xs'
                    : 'bg-zinc-50 dark:bg-[#09090B] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-red-50/60 dark:hover:bg-zinc-800'
                }`}
              >
                فهرس المصحف كاملاً (114)
              </button>

              <button
                onClick={() => setSelectedFilterCategory('study_blessed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  selectedFilterCategory === 'study_blessed'
                    ? 'bg-[#DC2626] text-white shadow-2xs'
                    : 'bg-zinc-50 dark:bg-[#09090B] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-red-50/60 dark:hover:bg-zinc-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>سور السكينة وتثبيت الحفظ (يس، الكهف، الملك، الشرح...)</span>
              </button>

              <button
                onClick={() => setSelectedFilterCategory('juz_amma')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilterCategory === 'juz_amma'
                    ? 'bg-[#DC2626] text-white shadow-2xs'
                    : 'bg-zinc-50 dark:bg-[#09090B] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-red-50/60 dark:hover:bg-zinc-800'
                }`}
              >
                جزء عمّ كاملاً (37 سورة)
              </button>

              <button
                onClick={() => setSelectedFilterCategory('juz_tabarak')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilterCategory === 'juz_tabarak'
                    ? 'bg-[#DC2626] text-white shadow-2xs'
                    : 'bg-zinc-50 dark:bg-[#09090B] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-red-50/60 dark:hover:bg-zinc-800'
                }`}
              >
                جزء تبارك (11 سورة)
              </button>
            </div>
          </div>

          {/* Surah Grid of Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {filteredSurahs.map((surah) => (
              <div
                key={surah.number}
                onClick={() => openSurahReader(surah)}
                className="p-3.5 bg-zinc-50 dark:bg-[#09090B]/70 hover:bg-red-50/70 dark:hover:bg-red-950/40 border border-zinc-200 dark:border-red-900/30 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-lg bg-[#DC2626]/10 dark:bg-red-950/60 text-[#DC2626] dark:text-red-300 font-mono font-bold text-[11px] flex items-center justify-center">
                    {surah.number}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      surah.revelationType === 'مكية'
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {surah.revelationType}
                  </span>
                </div>

                <div className="text-center py-1">
                  <h4 className="font-['Amiri',serif] text-xl font-bold text-zinc-900 dark:text-white group-hover:text-[#DC2626] dark:group-hover:text-red-400 transition-colors">
                    سُورَةُ {surah.name}
                  </h4>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium block mt-0.5">
                    {surah.versesCount} آية • صـ {surah.startPage}
                  </span>
                </div>

                <span className="text-[10px] text-[#DC2626] dark:text-red-400 text-center font-bold mt-2 pt-1.5 border-t border-zinc-200 dark:border-zinc-800 block opacity-70 group-hover:opacity-100">
                  قراءة عثمانية ←
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Dedicated Single Surah Reader Page with Full Uthmani Text */
        <div className="bg-white dark:bg-[#121215] border-2 border-red-200/80 dark:border-red-900/40 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6 transition-colors duration-200">
          {/* Reader Top Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                setIsPlayingAudio(false);
                setActiveSurah(null);
              }}
              className="text-xs font-bold text-[#DC2626] dark:text-red-400 hover:underline flex items-center gap-1.5 self-start cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>العودة لفهرس القرآن كاملاً (114 سورة)</span>
            </button>

            {/* Reciter Selector + Audio Play + View Mode + Font Scale */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Bookmark button */}
              <button
                onClick={handleSaveBookmark}
                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="حفظ موضع القراءة الحالي للعودة له لاحقاً"
              >
                <Bookmark className="w-3.5 h-3.5 fill-current text-amber-600 dark:text-amber-400" />
                <span>حفظ الموضع</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-xl p-0.5 text-xs font-bold">
                <button
                  onClick={() => setViewMode('mushaf')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'mushaf' ? 'bg-[#DC2626] text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  المصحف المتصل
                </button>
                <button
                  onClick={() => setViewMode('verses')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'verses' ? 'bg-[#DC2626] text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  آية بآية
                </button>
              </div>

              {/* Reciter Selector */}
              <select
                value={selectedReciterId}
                onChange={(e) => handleReciterChange(e.target.value)}
                className="bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-900 dark:text-white focus:border-[#DC2626] focus:outline-none"
              >
                {RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    القارئ: {r.name}
                  </option>
                ))}
              </select>

              {/* Play Audio Button */}
              <button
                onClick={toggleSurahAudio}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  isPlayingAudio
                    ? 'bg-amber-600 text-white'
                    : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white'
                }`}
              >
                {isPlayingAudio ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>إيقاف</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>استماع</span>
                  </>
                )}
              </button>

              {/* Font Zoom */}
              <div className="flex items-center gap-1 bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-xl p-1">
                <button
                  onClick={() => setFontSize((f) => Math.max(18, f - 2))}
                  className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  title="تصغير الخط"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold px-1 text-zinc-700 dark:text-zinc-300">{fontSize}</span>
                <button
                  onClick={() => setFontSize((f) => Math.min(44, f + 2))}
                  className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  title="تكبير الخط"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Surah Header Sacred Banner (Decorative Frame matching Madinah Mushaf) */}
          <div className="text-center py-6 px-4 border-2 border-[#C59B27]/40 rounded-3xl bg-gradient-to-b from-white via-red-50/40 to-white dark:from-[#09090B] dark:via-[#121215] dark:to-[#09090B] relative overflow-hidden shadow-2xs">
            <div className="inline-block px-4 py-1 rounded-full bg-[#C59B27]/15 dark:bg-[#C59B27]/25 text-amber-800 dark:text-amber-300 text-xs font-bold mb-2">
              سُورَةُ {activeSurah.name} • {activeSurah.revelationType} • {activeSurah.versesCount} آيات • صـ {activeSurah.startPage}
            </div>

            <h1 className="font-['Amiri',serif] text-3xl sm:text-5xl font-black text-[#DC2626] dark:text-red-400 mb-4">
              سُورَةُ {activeSurah.name}
            </h1>

            {/* Sacred Basmala (Shown for all Surahs except At-Tawbah #9) */}
            {activeSurah.number !== 9 && (
              <div className="py-2 inline-block">
                <p className="font-['Amiri',serif] text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-200 tracking-wider leading-relaxed">
                  {UTHMANI_BASMALA}
                </p>
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {isLoadingSurah && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#DC2626] animate-spin mx-auto" />
              <p className="text-sm font-bold text-[#DC2626] dark:text-red-400">
                جاري فتح آيات سورة {activeSurah.name} المباركة بالرسم العثماني الشريف...
              </p>
            </div>
          )}

          {/* Ayahs Display */}
          {!isLoadingSurah && surahAyahs.length > 0 && (
            <>
              {viewMode === 'mushaf' ? (
                /* Continuous Sacred Mushaf Mode */
                <div
                  className="font-['Amiri',serif] leading-[2.7] sm:leading-[3.0] text-justify text-zinc-900 dark:text-zinc-100 p-6 sm:p-10 bg-white dark:bg-[#09090B] border-2 border-zinc-200 dark:border-red-900/40 rounded-3xl shadow-inner selection:bg-red-100 dark:selection:bg-red-900"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {surahAyahs.map((ayah, index) => {
                    const isCurrent = isPlayingAudio && currentPlayingAyahIndex === index;
                    return (
                      <span
                        key={ayah.numberInSurah}
                        className={`inline transition-colors duration-300 rounded px-1 ${
                          isCurrent
                            ? 'bg-red-100 dark:bg-red-950/70 text-[#DC2626] dark:text-red-300 font-bold shadow-xs'
                            : 'hover:bg-red-50/60 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        {ayah.text}{' '}
                        <span className="font-sans text-[0.62em] font-black text-[#C59B27] dark:text-amber-400 px-1.5 py-0.5 border border-[#C59B27]/60 rounded-full inline-block mx-1 select-none">
                          ﴿{toArabicNumeral(ayah.numberInSurah)}﴾
                        </span>{' '}
                      </span>
                    );
                  })}
                </div>
              ) : (
                /* Verses-by-Verse Card Mode */
                <div className="space-y-3">
                  {surahAyahs.map((ayah, index) => {
                    const isCurrent = isPlayingAudio && currentPlayingAyahIndex === index;
                    const isCopied = copiedAyahNum === ayah.numberInSurah;
                    return (
                      <div
                        key={ayah.numberInSurah}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'bg-red-50/80 dark:bg-red-950/50 border-red-300 dark:border-red-800 shadow-sm'
                            : 'bg-white dark:bg-[#121215] border-zinc-200 dark:border-red-900/40 hover:border-[#DC2626]/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="w-7 h-7 rounded-lg bg-[#DC2626]/10 dark:bg-red-950/60 text-[#DC2626] dark:text-red-300 font-black text-xs flex items-center justify-center font-mono">
                            {ayah.numberInSurah}
                          </span>

                          <button
                            onClick={() => handleCopyAyah(ayah.text, ayah.numberInSurah)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-[#DC2626] dark:hover:text-red-400 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                            title="نسخ الآية الكريمة"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#DC2626] dark:text-red-400" />
                                <span className="text-[#DC2626] dark:text-red-400">تم النسخ</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>نسخ</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p
                          className="font-['Amiri',serif] leading-loose text-zinc-900 dark:text-zinc-100 text-right"
                          style={{ fontSize: `${fontSize}px` }}
                        >
                          {ayah.text}{' '}
                          <span className="font-sans text-[0.65em] font-black text-[#C59B27] inline-block px-1 border border-[#C59B27]/60 rounded-full select-none">
                            ﴿{toArabicNumeral(ayah.numberInSurah)}﴾
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Previous / Next Surah Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => navigateSurah(-1)}
              disabled={activeSurah.number <= 1}
              className="px-4 py-2.5 bg-zinc-50 dark:bg-[#09090B] hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السورة السابقة</span>
            </button>

            <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
              صفحة {activeSurah.startPage} • {activeSurah.versesCount} آية
            </span>

            <button
              onClick={() => navigateSurah(1)}
              disabled={activeSurah.number >= 114}
              className="px-4 py-2.5 bg-zinc-50 dark:bg-[#09090B] hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>السورة التالية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );

};
