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

interface QuranPrayerSectionProps {
  currentGovernorate: string;
  onUpdateGovernorate: (govName: string) => void;
}

export const QuranPrayerSection: React.FC<QuranPrayerSectionProps> = ({
  currentGovernorate,
  onUpdateGovernorate,
}) => {
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

  // Adhan sound toggle
  const [isPlayingAdhan, setIsPlayingAdhan] = useState(false);
  const adhanAudioRef = useRef<HTMLAudioElement | null>(null);

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

  const toggleAdhan = () => {
    if (!adhanAudioRef.current) {
      const audio = new Audio('https://server8.mp3quran.net/afs/001.mp3');
      audio.onended = () => setIsPlayingAdhan(false);
      audio.play().catch((e) => console.log(e));
      adhanAudioRef.current = audio;
      setIsPlayingAdhan(true);
    } else {
      if (isPlayingAdhan) {
        adhanAudioRef.current.pause();
        setIsPlayingAdhan(false);
      } else {
        adhanAudioRef.current.play().catch((e) => console.log(e));
        setIsPlayingAdhan(true);
      }
    }
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
      {/* 1) Prayer Times Card (27 Egyptian Governorates) */}
      <div className="bg-white border border-[#2D5A43]/15 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EDE6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D5A43]/10 text-[#2D5A43] flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#1E2922]">
                مواقيت الصلاة الفلكية — مصر (الهيئة العامة للمساحة)
              </h2>
              <p className="text-xs text-[#7A8A7E]">
                محسوبة بدقة فلكية لكل الـ 27 محافظة بنظام 12 ساعة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedGov.id}
              onChange={handleGovChange}
              className="bg-[#FAF9F5] border border-[#D5CFC3] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1E2922] focus:border-[#2D5A43] focus:outline-none"
            >
              {EGYPT_GOVERNORATES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleDetectLocation}
              className="p-2 bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#D5CFC3] rounded-xl text-xs font-bold text-[#2D5A43] transition-colors"
              title="تحديد المحافظة تلقائياً عبر GPS"
            >
              <MapPin className="w-4 h-4" />
            </button>

            <button
              onClick={toggleAdhan}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isPlayingAdhan
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {isPlayingAdhan ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isPlayingAdhan ? 'إيقاف التكبير' : 'سماع الأذان'}</span>
            </button>
          </div>
        </div>

        {/* 6 Prayer Times Horizontal Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
          {prayers.map((p) => {
            const isNext = p.key === nextPrayerInfo.nextPrayer.key;
            return (
              <div
                key={p.key}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isNext
                    ? 'bg-[#2D5A43] text-white shadow-md ring-2 ring-[#2D5A43]/20'
                    : 'bg-[#FAF9F6] border-[#E8E4DC] text-[#1E2922]'
                }`}
              >
                <span
                  className={`text-[11px] font-bold block mb-1 ${
                    isNext ? 'text-amber-300' : 'text-[#7A8A7E]'
                  }`}
                >
                  {p.name}
                </span>
                <span className="font-mono text-base font-black tracking-wide" dir="ltr">
                  {p.time}
                </span>
                {isNext && (
                  <span className="text-[10px] block mt-1 text-emerald-200 font-bold">
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
        <div className="bg-white border border-[#2D5A43]/15 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* Header & Quick Bookmark */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2D5A43]/10 text-[#2D5A43] rounded-full text-xs font-bold mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>المصحف الشريف كاملاً مكتوباً بالرسم العثماني</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#1E2922]">
                القرآن الكريم كاملاً (114 سورة — 6,236 آية)
              </h2>
              <p className="text-xs text-[#7A8A7E]">
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
                className="bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-amber-900 rounded-2xl p-3 text-right flex items-center gap-3 transition-all self-start md:self-auto cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold">
                  <Bookmark className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <span className="text-[10px] text-amber-700 font-bold block">موضع قراءتك الأخير:</span>
                  <span className="text-xs font-black">
                    سورة {bookmark.surahName} (صـ {bookmark.page})
                  </span>
                </div>
                <ChevronLeft className="w-4 h-4 text-amber-700 mr-2" />
              </button>
            )}
          </div>

          {/* Search and Category Filter Pills */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative grow">
                <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                <input
                  type="text"
                  value={surahSearch}
                  onChange={(e) => setSurahSearch(e.target.value)}
                  placeholder="ابحث باسم السورة (مثل: الكهف، يس، البقرة) أو رقمها..."
                  className="w-full pr-10 pl-3 py-2.5 text-xs bg-[#FAF9F5] border border-[#D5CFC3] rounded-2xl focus:border-[#2D5A43] focus:outline-none"
                />
              </div>

              {/* Juz selector dropdown */}
              <select
                value={selectedJuzFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedJuzFilter(val === 'all' ? 'all' : Number(val));
                }}
                className="bg-[#FAF9F5] border border-[#D5CFC3] rounded-2xl px-3 py-2 text-xs font-bold text-[#1E2922] focus:border-[#2D5A43] focus:outline-none"
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
                    ? 'bg-[#2D5A43] text-white shadow-2xs'
                    : 'bg-[#FAF9F5] text-[#556358] border border-[#E0DCD4] hover:bg-[#F2EFE9]'
                }`}
              >
                فهرس المصحف كاملاً (114)
              </button>

              <button
                onClick={() => setSelectedFilterCategory('study_blessed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  selectedFilterCategory === 'study_blessed'
                    ? 'bg-[#2D5A43] text-white shadow-2xs'
                    : 'bg-[#FAF9F5] text-[#556358] border border-[#E0DCD4] hover:bg-[#F2EFE9]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>سور السكينة وتثبيت الحفظ (يس، الكهف، الملك، الشرح...)</span>
              </button>

              <button
                onClick={() => setSelectedFilterCategory('juz_amma')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilterCategory === 'juz_amma'
                    ? 'bg-[#2D5A43] text-white shadow-2xs'
                    : 'bg-[#FAF9F5] text-[#556358] border border-[#E0DCD4] hover:bg-[#F2EFE9]'
                }`}
              >
                جزء عمّ كاملاً (37 سورة)
              </button>

              <button
                onClick={() => setSelectedFilterCategory('juz_tabarak')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilterCategory === 'juz_tabarak'
                    ? 'bg-[#2D5A43] text-white shadow-2xs'
                    : 'bg-[#FAF9F5] text-[#556358] border border-[#E0DCD4] hover:bg-[#F2EFE9]'
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
                className="p-3.5 bg-[#FAF9F5] hover:bg-emerald-50/70 border border-[#E8E4DC] hover:border-[#2D5A43]/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-lg bg-[#2D5A43]/10 text-[#2D5A43] font-mono font-bold text-[11px] flex items-center justify-center">
                    {surah.number}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      surah.revelationType === 'مكية'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {surah.revelationType}
                  </span>
                </div>

                <div className="text-center py-1">
                  <h4 className="font-['Amiri',serif] text-xl font-bold text-[#1E2922] group-hover:text-[#2D5A43] transition-colors">
                    سُورَةُ {surah.name}
                  </h4>
                  <span className="text-[10px] text-[#7A8A7E] font-medium block mt-0.5">
                    {surah.versesCount} آية • صـ {surah.startPage}
                  </span>
                </div>

                <span className="text-[10px] text-[#2D5A43] text-center font-bold mt-2 pt-1.5 border-t border-[#EDE8DE] block opacity-70 group-hover:opacity-100">
                  قراءة عثمانية ←
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Dedicated Single Surah Reader Page with Full Uthmani Text */
        <div className="bg-white border-2 border-[#2D5A43]/20 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6">
          {/* Reader Top Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EDE6]">
            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                setIsPlayingAudio(false);
                setActiveSurah(null);
              }}
              className="text-xs font-bold text-[#2D5A43] hover:underline flex items-center gap-1.5 self-start cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>العودة لفهرس القرآن كاملاً (114 سورة)</span>
            </button>

            {/* Reciter Selector + Audio Play + View Mode + Font Scale */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Bookmark button */}
              <button
                onClick={handleSaveBookmark}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="حفظ موضع القراءة الحالي للعودة له لاحقاً"
              >
                <Bookmark className="w-3.5 h-3.5 fill-current text-amber-600" />
                <span>حفظ الموضع</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-[#FAF9F5] border border-[#D5CFC3] rounded-xl p-0.5 text-xs font-bold">
                <button
                  onClick={() => setViewMode('mushaf')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'mushaf' ? 'bg-[#2D5A43] text-white shadow-xs' : 'text-[#556358]'
                  }`}
                >
                  المصحف المتصل
                </button>
                <button
                  onClick={() => setViewMode('verses')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'verses' ? 'bg-[#2D5A43] text-white shadow-xs' : 'text-[#556358]'
                  }`}
                >
                  آية بآية
                </button>
              </div>

              {/* Reciter Selector */}
              <select
                value={selectedReciterId}
                onChange={(e) => handleReciterChange(e.target.value)}
                className="bg-[#FAF9F5] border border-[#D5CFC3] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#1E2922] focus:border-[#2D5A43] focus:outline-none"
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
                    : 'bg-[#2D5A43] text-white hover:bg-[#234734]'
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
              <div className="flex items-center gap-1 bg-[#FAF9F5] border border-[#D5CFC3] rounded-xl p-1">
                <button
                  onClick={() => setFontSize((f) => Math.max(18, f - 2))}
                  className="p-1 hover:bg-gray-200 rounded text-[#4B594E] cursor-pointer"
                  title="تصغير الخط"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold px-1 text-[#4B594E]">{fontSize}</span>
                <button
                  onClick={() => setFontSize((f) => Math.min(44, f + 2))}
                  className="p-1 hover:bg-gray-200 rounded text-[#4B594E] cursor-pointer"
                  title="تكبير الخط"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Surah Header Sacred Banner (Decorative Frame matching Madinah Mushaf) */}
          <div className="text-center py-6 px-4 border-2 border-[#C59B27]/40 rounded-3xl bg-gradient-to-b from-[#FFFDF9] via-[#FAF6EC] to-[#FFFDF9] relative overflow-hidden shadow-2xs">
            <div className="inline-block px-4 py-1 rounded-full bg-[#C59B27]/15 text-[#8C7A52] text-xs font-bold mb-2">
              سُورَةُ {activeSurah.name} • {activeSurah.revelationType} • {activeSurah.versesCount} آيات • صـ {activeSurah.startPage}
            </div>

            <h1 className="font-['Amiri',serif] text-3xl sm:text-5xl font-black text-[#2D5A43] mb-4">
              سُورَةُ {activeSurah.name}
            </h1>

            {/* Sacred Basmala (Shown for all Surahs except At-Tawbah #9) */}
            {activeSurah.number !== 9 && (
              <div className="py-2 inline-block">
                <p className="font-['Amiri',serif] text-2xl sm:text-3xl font-bold text-[#1E2922] tracking-wider leading-relaxed">
                  {UTHMANI_BASMALA}
                </p>
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {isLoadingSurah && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2D5A43] animate-spin mx-auto" />
              <p className="text-sm font-bold text-[#2D5A43]">
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
                  className="font-['Amiri',serif] leading-[2.7] sm:leading-[3.0] text-justify text-[#1E2922] p-6 sm:p-10 bg-[#FFFDF8] border-2 border-[#EDE6D6] rounded-3xl shadow-inner selection:bg-emerald-100"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {surahAyahs.map((ayah, index) => {
                    const isCurrent = isPlayingAudio && currentPlayingAyahIndex === index;
                    return (
                      <span
                        key={ayah.numberInSurah}
                        className={`inline transition-colors duration-300 rounded px-1 ${
                          isCurrent
                            ? 'bg-amber-100 text-[#2D5A43] font-bold shadow-xs'
                            : 'hover:bg-amber-50/60'
                        }`}
                      >
                        {ayah.text}{' '}
                        <span className="font-sans text-[0.62em] font-black text-[#C59B27] px-1.5 py-0.5 border border-[#C59B27]/60 rounded-full inline-block mx-1 select-none">
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
                            ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                            : 'bg-[#FFFDF9] border-[#EDE6D6] hover:border-[#2D5A43]/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#F0EBE0]">
                          <span className="w-7 h-7 rounded-lg bg-[#2D5A43]/10 text-[#2D5A43] font-black text-xs flex items-center justify-center font-mono">
                            {ayah.numberInSurah}
                          </span>

                          <button
                            onClick={() => handleCopyAyah(ayah.text, ayah.numberInSurah)}
                            className="p-1.5 hover:bg-[#F2EFE9] text-gray-500 hover:text-[#2D5A43] rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                            title="نسخ الآية الكريمة"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600">تم النسخ</span>
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
                          className="font-['Amiri',serif] leading-loose text-[#1E2922] text-right"
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
          <div className="flex items-center justify-between pt-4 border-t border-[#F0EDE6]">
            <button
              onClick={() => navigateSurah(-1)}
              disabled={activeSurah.number <= 1}
              className="px-4 py-2.5 bg-[#FAF9F5] hover:bg-[#F0EDE6] disabled:opacity-40 border border-[#D5CFC3] rounded-2xl text-xs font-bold text-[#1E2922] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السورة السابقة</span>
            </button>

            <span className="text-xs font-mono font-bold text-[#7A8A7E]">
              صفحة {activeSurah.startPage} • {activeSurah.versesCount} آية
            </span>

            <button
              onClick={() => navigateSurah(1)}
              disabled={activeSurah.number >= 114}
              className="px-4 py-2.5 bg-[#FAF9F5] hover:bg-[#F0EDE6] disabled:opacity-40 border border-[#D5CFC3] rounded-2xl text-xs font-bold text-[#1E2922] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>السورة التالية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
