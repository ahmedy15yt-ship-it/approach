import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookA,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Gauge,
  MessageSquareQuote,
  Pause,
  Play,
  Search,
  Volume2,
  X,
} from 'lucide-react';
import {
  ALL_DICTIONARY_WORDS,
  ALPHABET_LETTERS,
  DICTIONARY_BY_LETTER,
  getPartOfSpeechArabic,
} from '../data/dictionary';
import { ALL_IMPORTANT_SENTENCES, SENTENCE_CATEGORIES } from '../data/sentences/sentencesBank';
import { DictionaryWordEntry, ImportantSentenceEntry } from '../types';
import {
  isSpeechSupported,
  speakEnglishText,
  stopSpeaking,
} from '../utils/speechPronunciation';

interface VocabularyVaultViewProps {
  accountPhone?: string;
  onAwardBonusXp?: (xp: number) => void;
}

interface VaultProgressState {
  savedWordIds: string[];
  masteredWordIds: string[];
  savedSentenceIds: string[];
  masteredSentenceIds: string[];
}

const WORDS_PER_PAGE = 36;
const SENTENCES_PER_PAGE = 25;

function loadVaultProgress(storageKey: string): VaultProgressState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        savedWordIds: Array.isArray(parsed.savedWordIds) ? parsed.savedWordIds : [],
        masteredWordIds: Array.isArray(parsed.masteredWordIds) ? parsed.masteredWordIds : [],
        savedSentenceIds: Array.isArray(parsed.savedSentenceIds) ? parsed.savedSentenceIds : [],
        masteredSentenceIds: Array.isArray(parsed.masteredSentenceIds)
          ? parsed.masteredSentenceIds
          : [],
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    savedWordIds: [],
    masteredWordIds: [],
    savedSentenceIds: [],
    masteredSentenceIds: [],
  };
}

export const VocabularyVaultView: React.FC<VocabularyVaultViewProps> = ({
  accountPhone,
  onAwardBonusXp,
}) => {
  const storageKey = `nahj_english_vault_v1_${accountPhone || 'guest'}`;

  const [activeMode, setActiveMode] = useState<'dictionary' | 'sentences'>('dictionary');
  const [selectedLetter, setSelectedLetter] = useState<string>('A');
  const [wordSearch, setWordSearch] = useState('');
  const [wordFilter, setWordFilter] = useState<'all' | 'saved' | 'mastered'>('all');
  const [wordPage, setWordPage] = useState(1);

  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [sentenceSearch, setSentenceSearch] = useState('');
  const [sentenceFilter, setSentenceFilter] = useState<'all' | 'saved' | 'mastered'>('all');
  const [sentencePage, setSentencePage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('');

  const [slowSpeech, setSlowSpeech] = useState(false);
  const [quizHideArabic, setQuizHideArabic] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayAbortRef = useRef(false);

  const [progress, setProgress] = useState<VaultProgressState>(() =>
    loadVaultProgress(storageKey)
  );

  useEffect(() => {
    setProgress(loadVaultProgress(storageKey));
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      // ignore storage errors
    }
  }, [progress, storageKey]);

  useEffect(() => {
    return () => {
      autoPlayAbortRef.current = true;
      stopSpeaking();
    };
  }, []);

  const savedWordSet = useMemo(() => new Set(progress.savedWordIds), [progress.savedWordIds]);
  const masteredWordSet = useMemo(
    () => new Set(progress.masteredWordIds),
    [progress.masteredWordIds]
  );
  const savedSentenceSet = useMemo(
    () => new Set(progress.savedSentenceIds),
    [progress.savedSentenceIds]
  );
  const masteredSentenceSet = useMemo(
    () => new Set(progress.masteredSentenceIds),
    [progress.masteredSentenceIds]
  );

  const speechAvailable = isSpeechSupported();

  const stopAllAudio = () => {
    autoPlayAbortRef.current = true;
    setIsAutoPlaying(false);
    setSpeakingId(null);
    stopSpeaking();
  };

  const handleSpeakItem = (id: string, text: string, forceSlow?: boolean) => {
    autoPlayAbortRef.current = true;
    setIsAutoPlaying(false);
    const rate = forceSlow ? 0.65 : slowSpeech ? 0.68 : 0.94;
    setSpeakingId(id);
    speakEnglishText(text, {
      rate,
      onStart: () => setSpeakingId(id),
      onEnd: () => setSpeakingId((curr) => (curr === id ? null : curr)),
      onError: () => setSpeakingId((curr) => (curr === id ? null : curr)),
    });
  };

  const playSequentialItems = (items: Array<{ id: string; text: string }>) => {
    if (isAutoPlaying) {
      stopAllAudio();
      return;
    }
    if (items.length === 0 || !speechAvailable) return;

    autoPlayAbortRef.current = false;
    setIsAutoPlaying(true);
    let idx = 0;

    const speakNext = () => {
      if (autoPlayAbortRef.current || idx >= items.length) {
        setIsAutoPlaying(false);
        setSpeakingId(null);
        return;
      }
      const item = items[idx++];
      setSpeakingId(item.id);
      speakEnglishText(item.text, {
        rate: slowSpeech ? 0.68 : 0.94,
        onEnd: () => {
          if (!autoPlayAbortRef.current) {
            setTimeout(speakNext, 380);
          }
        },
        onError: () => {
          setIsAutoPlaying(false);
          setSpeakingId(null);
        },
      });
    };

    speakNext();
  };

  const toggleSavedWord = (id: string) => {
    setProgress((prev) => {
      const exists = prev.savedWordIds.includes(id);
      return {
        ...prev,
        savedWordIds: exists
          ? prev.savedWordIds.filter((x) => x !== id)
          : [id, ...prev.savedWordIds],
      };
    });
  };

  const toggleMasteredWord = (id: string) => {
    const already = progress.masteredWordIds.includes(id);
    setProgress((prev) => ({
      ...prev,
      masteredWordIds: already
        ? prev.masteredWordIds.filter((x) => x !== id)
        : [id, ...prev.masteredWordIds],
    }));
    if (!already) {
      onAwardBonusXp?.(3);
    }
  };

  const toggleSavedSentence = (id: string) => {
    setProgress((prev) => {
      const exists = prev.savedSentenceIds.includes(id);
      return {
        ...prev,
        savedSentenceIds: exists
          ? prev.savedSentenceIds.filter((x) => x !== id)
          : [id, ...prev.savedSentenceIds],
      };
    });
  };

  const toggleMasteredSentence = (id: string) => {
    const already = progress.masteredSentenceIds.includes(id);
    setProgress((prev) => ({
      ...prev,
      masteredSentenceIds: already
        ? prev.masteredSentenceIds.filter((x) => x !== id)
        : [id, ...prev.masteredSentenceIds],
    }));
    if (!already) {
      onAwardBonusXp?.(5);
    }
  };

  // Filtered Words
  const filteredWords: DictionaryWordEntry[] = useMemo(() => {
    const q = wordSearch.trim().toLowerCase();
    const baseList =
      selectedLetter === 'ALL' || q.length > 0
        ? ALL_DICTIONARY_WORDS
        : DICTIONARY_BY_LETTER[selectedLetter] || [];

    return baseList.filter((item) => {
      if (selectedLetter !== 'ALL' && q.length > 0 && selectedLetter !== item.letter) {
        // When searching while a letter is picked, allow global search if query >= 2 chars
        if (q.length < 2) return false;
      }
      if (wordFilter === 'saved' && !savedWordSet.has(item.id)) return false;
      if (wordFilter === 'mastered' && !masteredWordSet.has(item.id)) return false;
      if (!q) return true;
      return (
        item.word.toLowerCase().includes(q) ||
        item.arMeaning.toLowerCase().includes(q) ||
        item.arPronunciation.toLowerCase().includes(q)
      );
    });
  }, [selectedLetter, wordSearch, wordFilter, savedWordSet, masteredWordSet]);

  const totalWordPages = Math.max(1, Math.ceil(filteredWords.length / WORDS_PER_PAGE));
  const safeWordPage = Math.min(wordPage, totalWordPages);
  const pagedWords = useMemo(() => {
    const start = (safeWordPage - 1) * WORDS_PER_PAGE;
    return filteredWords.slice(start, start + WORDS_PER_PAGE);
  }, [filteredWords, safeWordPage]);

  // Filtered Sentences
  const sentenceCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = { الكل: ALL_IMPORTANT_SENTENCES.length };
    for (const s of ALL_IMPORTANT_SENTENCES) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, []);

  const filteredSentences: ImportantSentenceEntry[] = useMemo(() => {
    const q = sentenceSearch.trim().toLowerCase();
    return ALL_IMPORTANT_SENTENCES.filter((s) => {
      if (selectedCategory !== 'الكل' && s.category !== selectedCategory) return false;
      if (sentenceFilter === 'saved' && !savedSentenceSet.has(s.id)) return false;
      if (sentenceFilter === 'mastered' && !masteredSentenceSet.has(s.id)) return false;
      if (!q) return true;
      return (
        s.en.toLowerCase().includes(q) ||
        s.ar.toLowerCase().includes(q) ||
        s.arPronunciation.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, sentenceSearch, sentenceFilter, savedSentenceSet, masteredSentenceSet]);

  const totalSentencePages = Math.max(
    1,
    Math.ceil(filteredSentences.length / SENTENCES_PER_PAGE)
  );
  const safeSentencePage = Math.min(sentencePage, totalSentencePages);
  const pagedSentences = useMemo(() => {
    const start = (safeSentencePage - 1) * SENTENCES_PER_PAGE;
    return filteredSentences.slice(start, start + SENTENCES_PER_PAGE);
  }, [filteredSentences, safeSentencePage]);

  const handleLetterClick = (letter: string) => {
    stopAllAudio();
    setSelectedLetter(letter);
    setWordPage(1);
  };

  const handleCategoryClick = (cat: string) => {
    stopAllAudio();
    setSelectedCategory(cat);
    setSentencePage(1);
  };

  const handleJumpToSentencePage = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(jumpPageInput);
    if (!Number.isNaN(num) && num >= 1 && num <= totalSentencePages) {
      stopAllAudio();
      setSentencePage(Math.floor(num));
      setJumpPageInput('');
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <section className="bg-white dark:bg-[#19191F] border border-amber-200/70 dark:border-[#D4AF37]/30 rounded-3xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-[#E8CE88]/80 font-semibold">
              <span>موسوعة اللغة الإنجليزية الشاملة</span>
              <span aria-hidden="true">·</span>
              <span>{ALL_DICTIONARY_WORDS.length.toLocaleString('en-US')} كلمة من A إلى Z</span>
              <span aria-hidden="true">·</span>
              <span>{ALL_IMPORTANT_SENTENCES.length.toLocaleString('en-US')} جملة بالنطق والترجمة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-[#F6E2A6] tracking-tight">
              قاموس الكلمات وبنك الجمل المهمة
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
              تصفّح كلمات كل حرف إنجليزي كاملة مع النطق الصوتي والكتابي والترجمة العربية، وتدرّب على{' '}
              <span className="font-bold text-amber-700 dark:text-[#F6E2A6]">5,000 جملة</span>{' '}
              أساسية للثانوية العامة والمحادثة والترجمة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSlowSpeech((s) => !s)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                slowSpeech
                  ? 'bg-amber-100 dark:bg-[#D4AF37]/20 text-amber-900 dark:text-[#F6E2A6] border-amber-400 dark:border-[#D4AF37]'
                  : 'bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#D4AF37]/25 hover:border-amber-400'
              }`}
              title="التحكم في سرعة النطق الإنجليزي"
            >
              <Gauge className="w-4 h-4 shrink-0" />
              <span>{slowSpeech ? 'سرعة النطق: بطيء (0.68x)' : 'سرعة النطق: عادي (0.94x)'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setQuizHideArabic((q) => !q);
                setRevealedIds({});
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                quizHideArabic
                  ? 'btn-luxury-gold text-[#09090B] border-transparent font-black'
                  : 'bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#D4AF37]/25 hover:border-amber-400'
              }`}
            >
              {quizHideArabic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>{quizHideArabic ? 'إظهار الترجمة للجميع' : 'اختبر نفسك (إخفاء الترجمة)'}</span>
            </button>

            {(speakingId || isAutoPlaying) && (
              <button
                type="button"
                onClick={stopAllAudio}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>إيقاف الصوت</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Switcher + Compact Progress Summary */}
        <div className="mt-6 pt-5 border-t border-zinc-200/80 dark:border-[#D4AF37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex p-1.5 rounded-2xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                stopAllAudio();
                setActiveMode('dictionary');
              }}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeMode === 'dictionary'
                  ? 'btn-luxury-gold text-[#09090B] font-black shadow-sm'
                  : 'text-zinc-700 dark:text-[#E8CE88]/80 hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
              }`}
            >
              <BookA className="w-4 h-4 shrink-0" />
              <span>قاموس الكلمات ({ALL_DICTIONARY_WORDS.length.toLocaleString('en-US')})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopAllAudio();
                setActiveMode('sentences');
              }}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeMode === 'sentences'
                  ? 'btn-luxury-gold text-[#09090B] font-black shadow-sm'
                  : 'text-zinc-700 dark:text-[#E8CE88]/80 hover:text-zinc-950 dark:hover:text-[#F6E2A6]'
              }`}
            >
              <MessageSquareQuote className="w-4 h-4 shrink-0" />
              <span>قسم الجمل المهمة ({ALL_IMPORTANT_SENTENCES.length.toLocaleString('en-US')})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300 font-semibold">
            <span>
              كلمات متقنة:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                {progress.masteredWordIds.length}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              كلمات محفوظة:{' '}
              <strong className="text-amber-700 dark:text-[#F6E2A6] tabular-nums">
                {progress.savedWordIds.length}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              جمل متقنة:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                {progress.masteredSentenceIds.length}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* ==================== MODE 1: DICTIONARY (3,170 WORDS A–Z) ==================== */}
      {activeMode === 'dictionary' && (
        <div className="space-y-5">
          {/* A–Z Letter Picker */}
          <section className="bg-white dark:bg-[#19191F] border border-amber-200/70 dark:border-[#D4AF37]/28 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-zinc-950 dark:text-[#F6E2A6]">
                  اختر الحرف لعرض كلماته (A – Z)
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  كل حرف يضم كلماته الإنجليزية بالنطق العربي والصوتي والترجمة الكاملة
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLetterClick('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer self-start sm:self-auto ${
                  selectedLetter === 'ALL'
                    ? 'btn-luxury-gold text-[#09090B] border-transparent font-black'
                    : 'bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-[#E8CE88] border-zinc-200 dark:border-[#D4AF37]/25 hover:border-amber-400'
                }`}
              >
                عرض كل الحروف ({ALL_DICTIONARY_WORDS.length.toLocaleString('en-US')})
              </button>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-9 lg:grid-cols-[repeat(13,minmax(0,1fr))] gap-2" dir="ltr">
              {ALPHABET_LETTERS.map((letter) => {
                const count = DICTIONARY_BY_LETTER[letter]?.length || 0;
                const isSelected = selectedLetter === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleLetterClick(letter)}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'btn-luxury-gold text-[#09090B] border-transparent font-black shadow-sm'
                        : 'bg-zinc-50 dark:bg-[#09090C] text-zinc-800 dark:text-[#E8CE88] border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37]/60'
                    }`}
                  >
                    <span className="text-sm font-black leading-none">{letter}</span>
                    <span
                      className={`text-[10px] mt-1 tabular-nums ${
                        isSelected ? 'text-[#09090B]/80 font-bold' : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search & Word Filter Bar */}
            <div className="pt-2 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              <div className="lg:col-span-6 relative">
                <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={wordSearch}
                  onChange={(e) => {
                    setWordSearch(e.target.value);
                    setWordPage(1);
                  }}
                  placeholder="ابحث عن كلمة بالإنجليزية أو المعنى بالعربي أو النطق..."
                  className="w-full pr-10 pl-9 py-2.5 rounded-2xl text-sm bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-950 dark:text-[#F4EFE6] placeholder:text-zinc-400 focus:outline-none focus:border-[#D4AF37]"
                />
                {wordSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setWordSearch('');
                      setWordPage(1);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    aria-label="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="lg:col-span-6 flex flex-wrap items-center justify-between lg:justify-end gap-2">
                <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/20">
                  {(
                    [
                      { id: 'all', label: 'الكل' },
                      { id: 'saved', label: `المحفوظة (${progress.savedWordIds.length})` },
                      { id: 'mastered', label: `المتقنة (${progress.masteredWordIds.length})` },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setWordFilter(f.id);
                        setWordPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        wordFilter === f.id
                          ? 'bg-white dark:bg-[#19191F] text-zinc-950 dark:text-[#F6E2A6] shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!speechAvailable || pagedWords.length === 0}
                  onClick={() =>
                    playSequentialItems(pagedWords.map((w) => ({ id: w.id, text: w.word })))
                  }
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-[#09090C] text-[#F6E2A6] border border-[#D4AF37]/35 hover:border-[#D4AF37] disabled:opacity-40 cursor-pointer"
                >
                  {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isAutoPlaying ? 'إيقاف التشغيل' : 'تشغيل نطق الصفحة'}</span>
                </button>
              </div>
            </div>
          </section>

          {/* Word Results Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-zinc-600 dark:text-zinc-400 font-semibold">
            <span>
              {selectedLetter === 'ALL'
                ? 'جميع الحروف (A–Z)'
                : `كلمات حرف (${selectedLetter})`}
              {' · '}
              النتائج: <strong className="text-zinc-950 dark:text-[#F6E2A6] tabular-nums">{filteredWords.length}</strong> كلمة
            </span>
            <span className="tabular-nums">
              صفحة {safeWordPage} من {totalWordPages}
            </span>
          </div>

          {/* Words Grid */}
          {pagedWords.length === 0 ? (
            <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/20 rounded-3xl p-10 text-center space-y-2">
              <p className="text-base font-bold text-zinc-900 dark:text-[#F6E2A6]">
                لا توجد كلمات مطابقة للبحث أو التصفية الحالية
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                جرّب مسح مربع البحث أو اختيار «الكل» أو التبديل إلى حرف آخر.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pagedWords.map((item) => {
                const isSpeaking = speakingId === item.id;
                const isSaved = savedWordSet.has(item.id);
                const isMastered = masteredWordSet.has(item.id);
                const isHidden = quizHideArabic && !revealedIds[item.id];

                return (
                  <article
                    key={item.id}
                    className={`bg-white dark:bg-[#19191F] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${
                      isSpeaking
                        ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/40'
                        : isMastered
                        ? 'border-emerald-500/40 dark:border-emerald-500/35'
                        : 'border-zinc-200/90 dark:border-[#D4AF37]/20 hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">
                            حرف {item.letter} · {getPartOfSpeechArabic(item.partOfSpeech)}
                          </div>
                          <h3
                            dir="ltr"
                            className="text-xl font-black text-zinc-950 dark:text-[#F6E2A6] tracking-wide break-words text-left mt-0.5"
                          >
                            {item.word}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSpeakItem(item.id, item.word)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSpeaking
                                ? 'btn-luxury-gold text-[#09090B] font-black'
                                : 'bg-zinc-100 dark:bg-[#09090C] text-zinc-800 dark:text-[#E8CE88] border border-zinc-200 dark:border-[#D4AF37]/30 hover:border-[#D4AF37]'
                            }`}
                            title="استمع لنطق الكلمة"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>نطق</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSpeakItem(item.id, item.word, true)}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-zinc-100 dark:bg-[#09090C] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37] cursor-pointer"
                            title="نطق بطيء للمبتدئين"
                          >
                            بطيء
                          </button>
                        </div>
                      </div>

                      {/* Arabic Phonetic Pronunciation */}
                      <div className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-200/80 dark:border-[#D4AF37]/15 rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2">
                        <span className="text-zinc-500 dark:text-zinc-400 font-semibold">النطق بالعربي:</span>
                        <span className="font-extrabold text-amber-800 dark:text-[#E8CE88]">
                          {item.arPronunciation}
                        </span>
                      </div>

                      {/* Arabic Meaning */}
                      {isHidden ? (
                        <button
                          type="button"
                          onClick={() => toggleReveal(item.id)}
                          className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-50 dark:bg-[#D4AF37]/10 text-amber-800 dark:text-[#F6E2A6] border border-dashed border-amber-400/60 dark:border-[#D4AF37]/40 hover:bg-amber-100 dark:hover:bg-[#D4AF37]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>اضغط لإظهار الترجمة العربية</span>
                        </button>
                      ) : (
                        <div className="pt-0.5">
                          <p className="text-sm font-bold text-zinc-900 dark:text-[#F4EFE6] leading-relaxed">
                            {item.arMeaning}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Controls */}
                    <div className="pt-2.5 border-t border-zinc-100 dark:border-[#D4AF37]/15 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSavedWord(item.id)}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                          isSaved
                            ? 'text-amber-700 dark:text-[#F6E2A6] bg-amber-50 dark:bg-[#D4AF37]/15'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#E8CE88]'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                        <span>{isSaved ? 'محفوظة' : 'حفظ للمراجعة'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleMasteredWord(item.id)}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                          isMastered
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isMastered ? 'تم الإتقان' : 'أتقنتها'}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Word Pagination */}
          {totalWordPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={safeWordPage <= 1}
                onClick={() => {
                  stopAllAudio();
                  setWordPage((p) => Math.max(1, p - 1));
                }}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-800 dark:text-[#E8CE88] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <span className="px-4 py-2 text-xs font-bold text-zinc-700 dark:text-[#F6E2A6] tabular-nums">
                صفحة {safeWordPage} من {totalWordPages}
              </span>

              <button
                type="button"
                disabled={safeWordPage >= totalWordPages}
                onClick={() => {
                  stopAllAudio();
                  setWordPage((p) => Math.min(totalWordPages, p + 1));
                }}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-800 dark:text-[#E8CE88] disabled:opacity-40 cursor-pointer"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODE 2: 5,000 IMPORTANT SENTENCES ==================== */}
      {activeMode === 'sentences' && (
        <div className="space-y-5">
          {/* Categories & Search */}
          <section className="bg-white dark:bg-[#19191F] border border-amber-200/70 dark:border-[#D4AF37]/28 rounded-3xl p-5 space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-zinc-950 dark:text-[#F6E2A6]">
                أقسام الجمل المهمة ({ALL_IMPORTANT_SENTENCES.length.toLocaleString('en-US')} جملة)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                جمل منتظمة القواعد والمعاني لمواقف الحياة، الامتحانات، كتابة المقال، والترجمة
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {SENTENCE_CATEGORIES.map((cat) => {
                const count = sentenceCategoryCounts[cat] || 0;
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      active
                        ? 'btn-luxury-gold text-[#09090B] border-transparent font-black shadow-sm'
                        : 'bg-zinc-50 dark:bg-[#09090C] text-zinc-700 dark:text-[#E8CE88]/90 border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37]/60'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="opacity-75 mr-1.5 tabular-nums">
                      ({count.toLocaleString('en-US')})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              <div className="lg:col-span-6 relative">
                <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={sentenceSearch}
                  onChange={(e) => {
                    setSentenceSearch(e.target.value);
                    setSentencePage(1);
                  }}
                  placeholder="ابحث داخل 5,000 جملة بالإنجليزية أو العربية..."
                  className="w-full pr-10 pl-9 py-2.5 rounded-2xl text-sm bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-950 dark:text-[#F4EFE6] placeholder:text-zinc-400 focus:outline-none focus:border-[#D4AF37]"
                />
                {sentenceSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSentenceSearch('');
                      setSentencePage(1);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    aria-label="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="lg:col-span-6 flex flex-wrap items-center justify-between lg:justify-end gap-2">
                <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/20">
                  {(
                    [
                      { id: 'all', label: 'الكل' },
                      { id: 'saved', label: `المحفوظة (${progress.savedSentenceIds.length})` },
                      { id: 'mastered', label: `المتقنة (${progress.masteredSentenceIds.length})` },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSentenceFilter(f.id);
                        setSentencePage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        sentenceFilter === f.id
                          ? 'bg-white dark:bg-[#19191F] text-zinc-950 dark:text-[#F6E2A6] shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!speechAvailable || pagedSentences.length === 0}
                  onClick={() =>
                    playSequentialItems(pagedSentences.map((s) => ({ id: s.id, text: s.en })))
                  }
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-[#09090C] text-[#F6E2A6] border border-[#D4AF37]/35 hover:border-[#D4AF37] disabled:opacity-40 cursor-pointer"
                >
                  {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isAutoPlaying ? 'إيقاف التشغيل' : 'تشغيل جمل الصفحة'}</span>
                </button>
              </div>
            </div>
          </section>

          {/* Sentence Results Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-zinc-600 dark:text-zinc-400 font-semibold">
            <span>
              القسم: <strong className="text-zinc-950 dark:text-[#F6E2A6]">{selectedCategory}</strong>
              {' · '}
              إجمالي الجمل المعروضة:{' '}
              <strong className="text-zinc-950 dark:text-[#F6E2A6] tabular-nums">
                {filteredSentences.length.toLocaleString('en-US')}
              </strong>
            </span>
            <span className="tabular-nums">
              صفحة {safeSentencePage} من {totalSentencePages}
            </span>
          </div>

          {/* Sentences List */}
          {pagedSentences.length === 0 ? (
            <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/20 rounded-3xl p-10 text-center space-y-2">
              <p className="text-base font-bold text-zinc-900 dark:text-[#F6E2A6]">
                لم يتم العثور على جمل مطابقة
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                جرّب تغيير كلمة البحث أو اختيار «الكل» في الأقسام.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {pagedSentences.map((item) => {
                const isSpeaking = speakingId === item.id;
                const isSaved = savedSentenceSet.has(item.id);
                const isMastered = masteredSentenceSet.has(item.id);
                const isHidden = quizHideArabic && !revealedIds[item.id];

                return (
                  <article
                    key={item.id}
                    className={`bg-white dark:bg-[#19191F] border rounded-2xl p-4 sm:p-5 space-y-3 transition-all ${
                      isSpeaking
                        ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/40'
                        : isMastered
                        ? 'border-emerald-500/40 dark:border-emerald-500/35'
                        : 'border-zinc-200/90 dark:border-[#D4AF37]/20 hover:border-[#D4AF37]/45'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold flex flex-wrap items-center gap-2">
                          <span className="tabular-nums text-amber-700 dark:text-[#E8CE88] font-bold">
                            جملة #{item.index}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{item.category}</span>
                        </div>

                        <p
                          dir="ltr"
                          className="text-base sm:text-lg font-bold text-zinc-950 dark:text-[#F6E2A6] leading-relaxed text-left"
                        >
                          {item.en}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSpeakItem(item.id, item.en)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSpeaking
                              ? 'btn-luxury-gold text-[#09090B] font-black'
                              : 'bg-zinc-100 dark:bg-[#09090C] text-zinc-800 dark:text-[#E8CE88] border border-zinc-200 dark:border-[#D4AF37]/30 hover:border-[#D4AF37]'
                          }`}
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>نطق الجملة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSpeakItem(item.id, item.en, true)}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-[#09090C] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37] cursor-pointer"
                        >
                          بطيء
                        </button>
                      </div>
                    </div>

                    {/* Written Arabic Pronunciation Guide */}
                    <div className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-200/80 dark:border-[#D4AF37]/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed">
                      <span className="text-zinc-500 dark:text-zinc-400 font-bold ml-2">
                        النطق بالعربي:
                      </span>
                      <span className="font-bold text-amber-800 dark:text-[#E8CE88]">
                        {item.arPronunciation}
                      </span>
                    </div>

                    {/* Arabic Translation */}
                    {isHidden ? (
                      <button
                        type="button"
                        onClick={() => toggleReveal(item.id)}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-50 dark:bg-[#D4AF37]/10 text-amber-800 dark:text-[#F6E2A6] border border-dashed border-amber-400/60 dark:border-[#D4AF37]/40 hover:bg-amber-100 dark:hover:bg-[#D4AF37]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        <span>اضغط لإظهار الترجمة العربية للجملة</span>
                      </button>
                    ) : (
                      <div className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F4EFE6] leading-relaxed">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">الترجمة:</span>
                        {item.ar}
                      </div>
                    )}

                    {/* Actions Footer */}
                    <div className="pt-2.5 border-t border-zinc-100 dark:border-[#D4AF37]/15 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSavedSentence(item.id)}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          isSaved
                            ? 'text-amber-700 dark:text-[#F6E2A6] bg-amber-50 dark:bg-[#D4AF37]/15'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#E8CE88]'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                        <span>{isSaved ? 'محفوظة في المفضلة' : 'حفظ الجملة'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleMasteredSentence(item.id)}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          isMastered
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isMastered ? 'تم إتقان الجملة' : 'تعلمتها وأتقنتها'}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Sentence Pagination + Quick Jump */}
          {totalSentencePages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={safeSentencePage <= 1}
                onClick={() => {
                  stopAllAudio();
                  setSentencePage((p) => Math.max(1, p - 1));
                }}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-800 dark:text-[#E8CE88] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <span className="px-3 py-2 text-xs font-bold text-zinc-700 dark:text-[#F6E2A6] tabular-nums">
                صفحة {safeSentencePage} من {totalSentencePages}
              </span>

              <button
                type="button"
                disabled={safeSentencePage >= totalSentencePages}
                onClick={() => {
                  stopAllAudio();
                  setSentencePage((p) => Math.min(totalSentencePages, p + 1));
                }}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-800 dark:text-[#E8CE88] disabled:opacity-40 cursor-pointer"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>

              <form onSubmit={handleJumpToSentencePage} className="inline-flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={totalSentencePages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  placeholder="رقم صفحة..."
                  className="w-24 px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-[#09090C] text-[#F6E2A6] border border-[#D4AF37]/30 hover:border-[#D4AF37] cursor-pointer"
                >
                  انتقال
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
