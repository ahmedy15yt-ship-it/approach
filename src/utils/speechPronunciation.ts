// English SpeechSynthesis audio pronunciation + Arabic phonetic guide generator

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore speech cancellation errors
    }
  }
  activeUtterance = null;
}

export function speakEnglishText(
  text: string,
  options?: {
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): boolean {
  if (!isSpeechSupported() || !text.trim()) {
    options?.onError?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = options?.rate ?? 0.94;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferred =
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith('en-us') &&
            (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en-gb')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en'));

      if (preferred) {
        utterance.voice = preferred;
        utterance.lang = preferred.lang;
      }
    }

    utterance.onstart = () => options?.onStart?.();
    utterance.onend = () => {
      activeUtterance = null;
      options?.onEnd?.();
    };
    utterance.onerror = () => {
      activeUtterance = null;
      options?.onError?.();
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    options?.onError?.();
    return false;
  }
}

// Common English words & function words with crisp Arabic phonetic pronunciations
const COMMON_WORD_PHONETICS: Record<string, string> = {
  i: 'آي',
  we: 'وي',
  you: 'يو',
  they: 'ذاي',
  he: 'هي',
  she: 'شي',
  it: 'إت',
  my: 'ماي',
  our: 'آوَر',
  your: 'يور',
  their: 'ذير',
  his: 'هيز',
  her: 'هير',
  its: 'إتس',
  me: 'مي',
  us: 'أس',
  them: 'ذيم',
  him: 'هيم',
  the: 'ذا',
  a: 'أَ',
  an: 'أن',
  this: 'ذيس',
  that: 'ذات',
  these: 'ذيز',
  those: 'ذوز',
  is: 'إز',
  are: 'آر',
  was: 'واز',
  were: 'وير',
  am: 'آم',
  be: 'بي',
  been: 'بين',
  being: 'بيينج',
  have: 'هاف',
  has: 'هاز',
  had: 'هاد',
  do: 'دو',
  does: 'دَز',
  did: 'ديد',
  will: 'ويل',
  would: 'وود',
  can: 'كان',
  could: 'كود',
  should: 'شود',
  must: 'ماست',
  may: 'ماي',
  might: 'مايت',
  shall: 'شال',
  to: 'تو',
  of: 'أوف',
  in: 'إن',
  on: 'أون',
  at: 'أت',
  for: 'فور',
  with: 'ويذ',
  by: 'باي',
  from: 'فروم',
  into: 'إنتو',
  onto: 'أونتو',
  about: 'أباوت',
  through: 'ثرو',
  between: 'بيتوين',
  among: 'أمونج',
  during: 'ديورينج',
  before: 'بيفور',
  after: 'أفتر',
  until: 'أنتيل',
  since: 'سينس',
  while: 'وايل',
  when: 'وين',
  where: 'وير',
  why: 'واي',
  how: 'هاو',
  what: 'وات',
  which: 'ويتش',
  who: 'هو',
  whom: 'هوم',
  whose: 'هوز',
  and: 'آند',
  or: 'أور',
  but: 'بات',
  so: 'سو',
  because: 'بيكوز',
  although: 'أولذو',
  though: 'ذو',
  however: 'هاويفر',
  therefore: 'ذيرفور',
  moreover: 'مور أوفر',
  unless: 'أنليس',
  if: 'إف',
  whether: 'ويذر',
  not: 'نوت',
  no: 'نو',
  yes: 'يس',
  always: 'أولويز',
  usually: 'يوجوالي',
  often: 'أوفن',
  sometimes: 'سامتايمز',
  never: 'نيفر',
  every: 'إيفري',
  each: 'إيتش',
  all: 'أول',
  some: 'سام',
  any: 'إني',
  many: 'ميني',
  much: 'ماتش',
  more: 'مور',
  most: 'موست',
  few: 'فيو',
  little: 'ليتل',
  less: 'ليس',
  good: 'جود',
  better: 'بيتر',
  best: 'بيست',
  great: 'جريت',
  new: 'نيو',
  old: 'أولد',
  important: 'إمبورتنت',
  necessary: 'نيسيساري',
  essential: 'إيسينشال',
  effective: 'إفيكتيف',
  modern: 'مودرن',
  daily: 'دايلي',
  regularly: 'ريجيولارلي',
  clearly: 'كليرلي',
  quickly: 'كويكلي',
  slowly: 'سلولي',
  carefully: 'كيرفولي',
  successfully: 'ساكسيسفولي',
  finally: 'فاينالي',
  today: 'توداي',
  tomorrow: 'تومورو',
  yesterday: 'يسترداي',
  now: 'ناو',
  soon: 'سون',
  here: 'هير',
  there: 'ذير',
  please: 'بليز',
  thank: 'ثانك',
  thanks: 'ثانكس',
  sorry: 'سوري',
  excuse: 'إكسكيوز',
  help: 'هيلب',
  study: 'ستادي',
  studying: 'ستاديينج',
  learn: 'ليرن',
  learning: 'ليرنينج',
  work: 'ويرك',
  working: 'ويركينج',
  time: 'تايم',
  day: 'داي',
  days: 'دايز',
  life: 'لايف',
  world: 'ويرلد',
  people: 'بيبول',
  students: 'ستيودنتس',
  student: 'ستيودنت',
  teacher: 'تيتشر',
  school: 'سكول',
  exam: 'إجزام',
  exams: 'إجزامز',
  future: 'فيوتشر',
  success: 'ساكسيس',
  goal: 'جول',
  goals: 'جولز',
  english: 'إنجلش',
  arabic: 'أرابيك',
  egypt: 'إيجيبت',
  society: 'سوسايتي',
  technology: 'تكنولوجي',
  science: 'ساينس',
  health: 'هيلث',
  education: 'إديوكيشن',
  knowledge: 'نوليدج',
  skills: 'سكيلز',
  skill: 'سكيل',
  practice: 'براكتيس',
  make: 'ميك',
  makes: 'ميكس',
  made: 'ميد',
  take: 'تيك',
  takes: 'تيكس',
  took: 'توك',
  give: 'جيف',
  gives: 'جيفز',
  gave: 'جيف',
  get: 'جيت',
  gets: 'جيتس',
  got: 'جوت',
  go: 'جو',
  goes: 'جوز',
  went: 'وينت',
  come: 'كام',
  comes: 'كامز',
  came: 'كيم',
  know: 'نو',
  knows: 'نوز',
  think: 'ثينك',
  thinks: 'ثينكس',
  want: 'وانت',
  need: 'نيد',
  needs: 'نيدز',
  like: 'لايك',
  love: 'لاف',
  try: 'تراي',
  use: 'يوز',
  used: 'يوزد',
  using: 'يوزينج',
  find: 'فايند',
  found: 'فاوند',
  keep: 'كيب',
  keeps: 'كيبس',
  start: 'ستارت',
  started: 'ستارتد',
  finish: 'فينيش',
  finished: 'فينيشت',
  improve: 'إمبروف',
  improves: 'إمبروفز',
  improved: 'إمبروفد',
  develop: 'ديفيلوب',
  achieve: 'أتشييف',
  build: 'بيلد',
  read: 'ريد',
  reading: 'ريدينج',
  write: 'رايت',
  writing: 'رايتينج',
  speak: 'سبيك',
  speaking: 'سبيكينج',
  listen: 'ليسن',
  understand: 'أندرستاند',
  remember: 'ريميمبر',
  plan: 'بلان',
  focus: 'فوكاس',
  solve: 'سولف',
  prepare: 'بريبير',
  wait: 'ويت',
  stop: 'ستوب',
  stay: 'ستاي',
  feel: 'فيل',
  believe: 'بيليف',
  trust: 'تراست',
  share: 'شير',
  protect: 'بروتيكت',
  respect: 'ريسبكت',
  support: 'سابورت',
  save: 'سيف',
  spend: 'سبيند',
  manage: 'مانيدج',
  organize: 'أورجانايز',
  choose: 'تشوز',
  check: 'تشيك',
  review: 'ريفيو',
  ask: 'آسك',
  answer: 'آنسر',
  explain: 'إكسبلين',
  tell: 'تيل',
  say: 'ساي',
  said: 'سيد',
  look: 'لوك',
  see: 'سي',
  watch: 'واتش',
  enjoy: 'إنجوي',
  avoid: 'أفويد',
  solve_problems: 'سولف بروبلمز',
  hard: 'هارد',
  well: 'ويل',
  very: 'فيري',
  really: 'ريلي',
  too: 'تو',
  also: 'أولسو',
  only: 'أونلي',
  even: 'إيفن',
  just: 'جاست',
  still: 'ستيل',
  already: 'أولريدي',
  yet: 'يت',
  together: 'توجيذر',
  alone: 'ألون',
  early: 'إيرلي',
  late: 'ليت',
  fast: 'فاست',
  high: 'هاي',
  long: 'لونج',
  short: 'شورت',
  easy: 'إيزي',
  difficult: 'ديفيكالت',
  clear: 'كلير',
  strong: 'سترونج',
  wise: 'وايز',
  smart: 'سمارت',
  right: 'رايت',
  wrong: 'رونج',
  true: 'ترو',
  false: 'فولس',
  sure: 'شور',
  ready: 'ريدي',
  able: 'إيبل',
  different: 'ديفرنت',
  same: 'سيم',
  other: 'أذر',
  another: 'أنذر',
  first: 'فيرست',
  second: 'سيكند',
  last: 'لاست',
  next: 'نكست',
  one: 'وان',
  two: 'تو',
  three: 'ثري',
  four: 'فور',
  five: 'فايف',
  ten: 'تين',
  hundred: 'هاندرد',
  thousand: 'ثاوزند',
};

let dictionaryPhoneticCache: Map<string, string> | null = null;

export function registerDictionaryPhonetics(map: Map<string, string>): void {
  dictionaryPhoneticCache = map;
}

/**
 * Converts an arbitrary English word into a readable Arabic phonetic approximation
 * when it is not found in the pre-annotated dictionary map.
 */
export function transliterateEnglishWordToArabic(rawWord: string): string {
  const clean = rawWord.toLowerCase().replace(/[^a-z']/g, '');
  if (!clean) return '';

  if (COMMON_WORD_PHONETICS[clean]) {
    return COMMON_WORD_PHONETICS[clean];
  }
  if (dictionaryPhoneticCache?.has(clean)) {
    return dictionaryPhoneticCache.get(clean)!;
  }

  // Handle common contractions
  const contractionMap: Record<string, string> = {
    "i'm": 'آيم',
    "i've": 'آيف',
    "i'll": 'آيل',
    "i'd": 'آيد',
    "you're": 'يور',
    "you've": 'يوف',
    "you'll": 'يول',
    "we're": 'وير',
    "we've": 'ويف',
    "we'll": 'ويل',
    "they're": 'ذير',
    "they've": 'ذيف',
    "he's": 'هيز',
    "she's": 'شيز',
    "it's": 'إتس',
    "don't": 'دونت',
    "doesn't": 'دازنت',
    "didn't": 'ديدنت',
    "won't": 'وونت',
    "can't": 'كانت',
    "couldn't": 'كودنت',
    "shouldn't": 'شودنت',
    "wouldn't": 'وودنت',
    "isn't": 'إزنت',
    "aren't": 'آرنت',
    "wasn't": 'وازنت',
    "weren't": 'ويرنت',
    "haven't": 'هافنت',
    "hasn't": 'هازنت',
    "let's": 'ليتس',
    "that's": 'ذاتس',
    "there's": 'ذيرز',
    "what's": 'واتس',
  };
  if (contractionMap[clean]) return contractionMap[clean];

  // Handle common -ies endings cleanly (tries -> ترايز, cities -> سيتيز)
  if (clean.length > 4 && clean.endsWith('ies')) {
    const base = clean.slice(0, -3);
    const stemPho = COMMON_WORD_PHONETICS[`${base}y`] || dictionaryPhoneticCache?.get(`${base}y`);
    if (stemPho) {
      return `${stemPho}ز`;
    }
    return `${transliterateEnglishWordToArabic(`${base}y`)}ز`;
  }

  // Fallback suffix stripping lookup
  for (const suffix of ['s', 'es', 'ed', 'ing', 'ly']) {
    if (clean.length > suffix.length + 2 && clean.endsWith(suffix)) {
      const stem = clean.slice(0, -suffix.length);
      const stemPho = COMMON_WORD_PHONETICS[stem] || dictionaryPhoneticCache?.get(stem);
      if (stemPho) {
        if (suffix === 's' || suffix === 'es') return `${stemPho}ز`;
        if (suffix === 'ed') return `${stemPho}د`;
        if (suffix === 'ing') return `${stemPho}ينج`;
        if (suffix === 'ly') return `${stemPho}لي`;
      }
    }
  }

  // Rule-based orthographic-to-phonetic Arabic mapper
  let w = clean.replace(/'/g, '');
  w = w
    .replace(/tion\b/g, 'شن')
    .replace(/sion\b/g, 'جن')
    .replace(/cious\b/g, 'شاس')
    .replace(/tious\b/g, 'شاس')
    .replace(/ment\b/g, 'منت')
    .replace(/ness\b/g, 'نس')
    .replace(/able\b/g, 'يبل')
    .replace(/ible\b/g, 'يبل')
    .replace(/less\b/g, 'لس')
    .replace(/ful\b/g, 'فول')
    .replace(/ing\b/g, 'ينج')
    .replace(/ight/g, 'ايت')
    .replace(/ough/g, 'أو')
    .replace(/eigh/g, 'اي')
    .replace(/kn/g, 'ن')
    .replace(/wr/g, 'ر')
    .replace(/ph/g, 'ف')
    .replace(/sh/g, 'ش')
    .replace(/ch/g, 'تش')
    .replace(/th/g, 'ث')
    .replace(/qu/g, 'كو')
    .replace(/ck/g, 'ك')
    .replace(/ng/g, 'نج')
    .replace(/ee/g, 'ي')
    .replace(/ea/g, 'ي')
    .replace(/oo/g, 'و')
    .replace(/ou/g, 'او')
    .replace(/ow/g, 'او')
    .replace(/ai/g, 'اي')
    .replace(/ay/g, 'اي')
    .replace(/oa/g, 'او')
    .replace(/oi/g, 'وي')
    .replace(/oy/g, 'وي');

  const charMap: Record<string, string> = {
    a: 'ا',
    b: 'ب',
    c: 'ك',
    d: 'د',
    e: 'ي',
    f: 'ف',
    g: 'ج',
    h: 'ه',
    i: 'ي',
    j: 'ج',
    k: 'ك',
    l: 'ل',
    m: 'م',
    n: 'ن',
    o: 'و',
    p: 'ب',
    q: 'ك',
    r: 'ر',
    s: 'س',
    t: 'ت',
    u: 'و',
    v: 'ف',
    w: 'و',
    x: 'كس',
    y: 'ي',
    z: 'ز',
  };

  let out = '';
  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    if (charMap[ch]) {
      if (i === 0 && (ch === 'a' || ch === 'e' || ch === 'i' || ch === 'o' || ch === 'u')) {
        out += ch === 'a' ? 'أ' : ch === 'o' ? 'أو' : ch === 'u' ? 'أ' : 'إ';
      } else if (ch === 'e' && i === w.length - 1 && w.length > 2) {
        // silent trailing e
      } else if (ch === 'c' && i + 1 < w.length && (w[i + 1] === 'e' || w[i + 1] === 'i' || w[i + 1] === 'y')) {
        out += 'س';
      } else {
        out += charMap[ch];
      }
    } else {
      out += ch;
    }
  }
  return out;
}

export function generateSentenceArabicPronunciation(sentence: string): string {
  return sentence
    .split(/[\s\-–—/]+/)
    .filter(Boolean)
    .map((tok) => transliterateEnglishWordToArabic(tok))
    .filter(Boolean)
    .join(' ');
}
