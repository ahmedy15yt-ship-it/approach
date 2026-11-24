import { TranslationLanguageCode, TranslationResult } from '../types';

export interface LanguageOption {
  code: TranslationLanguageCode;
  labelAr: string;
  speechLang: string;
  direction: 'rtl' | 'ltr';
}

export const TRANSLATION_LANGUAGES: LanguageOption[] = [
  { code: 'ar', labelAr: 'العربية', speechLang: 'ar-EG', direction: 'rtl' },
  { code: 'en', labelAr: 'الإنجليزية', speechLang: 'en-US', direction: 'ltr' },
  { code: 'fr', labelAr: 'الفرنسية', speechLang: 'fr-FR', direction: 'ltr' },
  { code: 'de', labelAr: 'الألمانية', speechLang: 'de-DE', direction: 'ltr' },
  { code: 'es', labelAr: 'الإسبانية', speechLang: 'es-ES', direction: 'ltr' },
  { code: 'it', labelAr: 'الإيطالية', speechLang: 'it-IT', direction: 'ltr' },
];

export function getLanguageMeta(code: TranslationLanguageCode): LanguageOption {
  return (
    TRANSLATION_LANGUAGES.find((l) => l.code === code) || TRANSLATION_LANGUAGES[0]
  );
}

const PHRASE_DICTIONARY: Array<{
  ar: string;
  en: string;
  fr: string;
  de: string;
  es: string;
  it: string;
  phoneticEn: string;
  note: string;
}> = [
  {
    ar: 'النجاح هو مجموع مجهودات صغيرة تتكرر كل يوم.',
    en: 'Success is the sum of small efforts repeated day in and day out.',
    fr: 'Le succès est la somme de petits efforts répétés jour après jour.',
    de: 'Erfolg ist die Summe kleiner Anstrengungen, die jeden Tag wiederholt werden.',
    es: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
    it: 'Il successo è la somma di piccoli sforzi ripetuti giorno dopo giorno.',
    phoneticEn: 'ساكسيس إز ذا سام أوف سمول إيفورتس ريبيتيد داي إن آند داي آوت',
    note: 'عبارة ملهمة شائعة في امتحانات الثانوية العامة بموضوعات الإرادة وتطوير الذات.',
  },
  {
    ar: 'يلعب البحث العلمي دوراً محورياً في تطوير الرعاية الصحية ومستقبل الأمم.',
    en: 'Scientific research plays a pivotal role in advancing healthcare and shaping the future of nations.',
    fr: "La recherche scientifique joue un rôle essentiel dans l'amélioration des soins de santé et l'avenir des nations.",
    de: 'Die wissenschaftliche Forschung spielt eine zentrale Rolle für den Fortschritt der Gesundheitsversorgung.',
    es: 'La investigación científica desempeña un papel fundamental en el avance de la salud y el futuro de las naciones.',
    it: 'La ricerca scientifica svolge un ruolo fondamentale nel progresso della sanità e nel futuro delle nazioni.',
    phoneticEn: 'ساينتفيك ريسيرتش بلايز أَ بيفوتال رول إن أدفانسينج هيلثكير',
    note: 'انتبه لتوافق الفعل المفرد (plays) مع الفاعل غير المعدود (Scientific research).',
  },
  {
    ar: 'يجب على الطلاب إدارة وقتهم بحكمة لتحقيق التوازن بين المذاكرة والراحة.',
    en: 'Students must manage their time wisely to balance studying and rest.',
    fr: 'Les étudiants doivent gérer leur temps sagement pour équilibrer études et repos.',
    de: 'Schüler müssen ihre Zeit klug einteilen, um Lernen und Erholung auszubalancieren.',
    es: 'Los estudiantes deben administrar su tiempo sabiamente para equilibrar el estudio y el descanso.',
    it: 'Gli studenti devono gestire il loro tempo con saggezza per bilanciare studio e riposo.',
    phoneticEn: 'ستيودنتس ماست مانيدج ذير تايم وايزلي تو بالانس ستاديينج آند ريست',
    note: 'استخدم الفعل (balance) بمعنى يوازن بين أمرين، والظرف (wisely) لوصف كيفية إدارة الوقت.',
  },
  {
    ar: 'المثابرة والعمل اليومي يؤديان دائماً إلى النجاح.',
    en: 'Perseverance and daily hard work always lead to success.',
    fr: 'La persévérance et le travail quotidien mènent toujours à la réussite.',
    de: 'Ausdauer und tägliche Arbeit führen immer zum Erfolg.',
    es: 'La perseverancia y el trabajo diario siempre conducen al éxito.',
    it: 'La perseveranza e il lavoro quotidiano portano sempre al successo.',
    phoneticEn: 'بيرسيفيرانس آند دايلي هارد وورك أولويز ليد تو ساكسيس',
    note: 'الفاعل المركب بـ (and) يعامل معاملة الجمع فيأخذ الفعل (lead) بدون s.',
  },
  {
    ar: 'الوقاية خير من العلاج في جميع الأمراض.',
    en: 'Prevention is better than cure in all diseases.',
    fr: 'Mieux vaut prévenir que guérir.',
    de: 'Vorbeugen ist besser als heilen.',
    es: 'Más vale prevenir que curar.',
    it: 'Prevenire è meglio che curare.',
    phoneticEn: 'بريفينشن إز بيتر ذان كيور إن أول ديزيزز',
    note: 'حكمة طبية وعلمية أساسية تُستخدم كثيراً في قطع الفهم والترجمة.',
  },
];

const BILINGUAL_CORE_MAP: Array<[string, string]> = [
  ['hello', 'مرحباً'],
  ['hi', 'أهلاً'],
  ['welcome', 'أهلاً وسهلاً'],
  ['good morning', 'صباح الخير'],
  ['good evening', 'مساء الخير'],
  ['good night', 'تصبح على خير'],
  ['how are you', 'كيف حالك'],
  ['thank you', 'شكراً لك'],
  ['thanks', 'شكراً'],
  ['please', 'من فضلك'],
  ['sorry', 'آسف'],
  ['yes', 'نعم'],
  ['no', 'لا'],
  ['love', 'يحب / حب'],
  ['like', 'يحب / يعجب بـ'],
  ['studying', 'دراسة / مذاكرة'],
  ['study', 'يدرس / يذاكر'],
  ['learn', 'يتعلم'],
  ['read', 'يقرأ'],
  ['write', 'يكتب'],
  ['understand', 'يفهم'],
  ['book', 'كتاب'],
  ['school', 'مدرسة'],
  ['student', 'طالب'],
  ['students', 'الطلاب'],
  ['teacher', 'معلم'],
  ['biology', 'الأحياء'],
  ['chemistry', 'الكيمياء'],
  ['physics', 'الفيزياء'],
  ['geology', 'الجيولوجيا'],
  ['mathematics', 'الرياضيات'],
  ['english', 'الإنجليزية'],
  ['arabic', 'العربية'],
  ['science', 'العلم'],
  ['doctor', 'طبيب'],
  ['engineer', 'مهندس'],
  ['medicine', 'الطب / الدواء'],
  ['hospital', 'مستشفى'],
  ['university', 'جامعة'],
  ['college', 'كلية'],
  ['exam', 'امتحان'],
  ['test', 'اختبار'],
  ['question', 'سؤال'],
  ['answer', 'إجابة'],
  ['success', 'النجاح'],
  ['future', 'المستقبل'],
  ['dream', 'الحلم'],
  ['goal', 'الهدف'],
  ['hope', 'الأمل'],
  ['time', 'الوقت'],
  ['day', 'اليوم'],
  ['morning', 'الصباح'],
  ['night', 'الليل'],
  ['every', 'كل'],
  ['today', 'اليوم'],
  ['tomorrow', 'غداً'],
  ['work', 'عمل / يعمل'],
  ['hard', 'جداً / صعب'],
  ['easy', 'سهل'],
  ['important', 'مهم'],
  ['knowledge', 'المعرفة'],
  ['patience', 'الصبر'],
  ['focus', 'التركيز'],
  ['energy', 'الطاقة'],
  ['cell', 'الخلية'],
  ['resistance', 'المقاومة'],
  ['current', 'التيار'],
  ['voltage', 'فرق الجهد'],
  ['reaction', 'التفاعل'],
  ['acid', 'حمض'],
  ['base', 'قاعدة'],
  ['enzyme', 'إنزيم'],
  ['hormone', 'هرمون'],
  ['genetics', 'علم الوراثة'],
  ['planet', 'كوكب'],
  ['water', 'الماء'],
  ['life', 'الحياة'],
  ['health', 'الصحة'],
  ['mind', 'العقل'],
  ['family', 'الأسرة'],
  ['friend', 'صديق'],
  ['never give up', 'لا تستسلم أبداً'],
  ['i', 'أنا'],
  ['you', 'أنت'],
  ['we', 'نحن'],
  ['they', 'هم'],
  ['he', 'هو'],
  ['she', 'هي'],
  ['is', 'يكون'],
  ['are', 'يكونون'],
  ['in', 'في'],
  ['on', 'على'],
  ['to', 'إلى'],
  ['for', 'لـ / من أجل'],
  ['with', 'مع'],
  ['and', 'و'],
  ['of', 'من / الـ'],
  ['the', ''],
  ['a', ''],
  ['an', ''],
];

const EN_TO_AR_MAP = new Map<string, string>(
  BILINGUAL_CORE_MAP.map(([en, ar]) => [en.toLowerCase(), ar])
);

const AR_TO_EN_MAP = new Map<string, string>();
for (const [en, ar] of BILINGUAL_CORE_MAP) {
  if (!ar) continue;
  for (const part of ar.split('/').map((s) => s.trim())) {
    if (part && !AR_TO_EN_MAP.has(part)) {
      AR_TO_EN_MAP.set(part, en);
    }
    const noAl = part.replace(/^ال/, '');
    if (noAl && !AR_TO_EN_MAP.has(noAl)) {
      AR_TO_EN_MAP.set(noAl, en);
    }
  }
}

export function speakMultilingualText(
  text: string,
  lang: TranslationLanguageCode
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    const meta = getLanguageMeta(lang);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = meta.speechLang;
    utterance.rate = 0.94;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const prefix = meta.speechLang.split('-')[0].toLowerCase();
      const match =
        voices.find((v) => v.lang.toLowerCase() === meta.speechLang.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      if (match) {
        utterance.voice = match;
        utterance.lang = match.lang;
      }
    }
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function buildTranslationFallback(params: {
  text: string;
  sourceLang: TranslationLanguageCode;
  targetLang: TranslationLanguageCode;
  warning?: string;
}): TranslationResult {
  const cleanText = params.text.trim();
  const normalizedLower = cleanText.toLowerCase().replace(/[.,!?؟،]+$/g, '').trim();

  // 1. Check curated phrase bank first
  const matchedPhrase = PHRASE_DICTIONARY.find((item) => {
    const src = (item[params.sourceLang] || '').trim().toLowerCase();
    return (
      src &&
      (src === normalizedLower ||
        normalizedLower.includes(src) ||
        src.includes(normalizedLower))
    );
  });

  if (matchedPhrase) {
    return {
      sourceText: cleanText,
      translatedText: matchedPhrase[params.targetLang],
      sourceLang: params.sourceLang,
      targetLang: params.targetLang,
      phoneticPronunciation:
        params.targetLang === 'en'
          ? matchedPhrase.phoneticEn
          : `نطق صوتي مباشر متاح بالضغط على زر السماعة (${getLanguageMeta(params.targetLang).labelAr})`,
      grammarNote: matchedPhrase.note,
      usageExamples: [
        {
          source: matchedPhrase[params.sourceLang],
          target: matchedPhrase[params.targetLang],
        },
      ],
      source: 'fallback',
      providerLabel: 'مترجم نَهج الفوري',
      warning: params.warning,
    };
  }

  // 2. Exact match in bilingual core map
  if (params.sourceLang === 'en' && params.targetLang === 'ar') {
    const direct = EN_TO_AR_MAP.get(normalizedLower);
    if (direct) {
      return {
        sourceText: cleanText,
        translatedText: direct,
        sourceLang: params.sourceLang,
        targetLang: params.targetLang,
        phoneticPronunciation: 'اضغط على أيقونة السماعة لسماع النطق الصحيح.',
        grammarNote: 'ترجمة مباشرة دقيقة للمصطلح الأساسي.',
        usageExamples: [{ source: cleanText, target: direct }],
        source: 'fallback',
        providerLabel: 'قاموس نَهج المحلي',
        warning: params.warning,
      };
    }

    // Word-by-word intelligent composition for English -> Arabic offline fallback
    const tokens = normalizedLower.split(/\s+/);
    const mappedTokens = tokens.map((tok) => {
      const cleanTok = tok.replace(/[^a-z']/g, '');
      return EN_TO_AR_MAP.get(cleanTok);
    });
    const knownCount = mappedTokens.filter((v) => v !== undefined).length;
    if (knownCount >= 1) {
      const assembled = mappedTokens
        .map((val, idx) => (val !== undefined ? val : tokens[idx]))
        .filter(Boolean)
        .join(' ')
        .trim();
      return {
        sourceText: cleanText,
        translatedText: assembled || cleanText,
        sourceLang: params.sourceLang,
        targetLang: params.targetLang,
        phoneticPronunciation: 'اضغط على زر السماعة لسماع النطق.',
        grammarNote: 'تمت الترجمة بالمحرك المحلي؛ يمكنك الضغط على «ترجم الآن» عند عودة الشبكة للصياغة الأدبية.',
        usageExamples: [{ source: cleanText, target: assembled }],
        source: 'fallback',
        providerLabel: 'مترجم نَهج المحلي',
        warning: params.warning,
      };
    }
  }

  if (params.sourceLang === 'ar' && params.targetLang === 'en') {
    const directEn =
      AR_TO_EN_MAP.get(cleanText) || AR_TO_EN_MAP.get(cleanText.replace(/^ال/, ''));
    if (directEn) {
      return {
        sourceText: cleanText,
        translatedText: directEn,
        sourceLang: params.sourceLang,
        targetLang: params.targetLang,
        phoneticPronunciation: directEn,
        grammarNote: 'ترجمة دقيقة للمصطلح.',
        usageExamples: [{ source: cleanText, target: directEn }],
        source: 'fallback',
        providerLabel: 'قاموس نَهج المحلي',
        warning: params.warning,
      };
    }
  }

  return {
    sourceText: cleanText,
    translatedText: cleanText,
    sourceLang: params.sourceLang,
    targetLang: params.targetLang,
    phoneticPronunciation: 'اضغط على أيقونة السماعة لسماع النطق مباشرة.',
    grammarNote: 'تعذر الوصول لمحرك الترجمة الشبكي مؤقتاً — أعد المحاولة الآن.',
    usageExamples: [],
    source: 'fallback',
    providerLabel: 'المترجم المحلي الاحتياطي',
    warning: params.warning,
  };
}
