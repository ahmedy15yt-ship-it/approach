import {
  GeneratedQuestionDifficulty,
  GeneratedQuestionType,
  InteractiveQuestion,
  QuestionDifficultyFilter,
  QuestionTypeFilter,
} from '../types';

export interface QuestionGenerationParams {
  subject: string;
  chapter: string;
  lesson: string;
  count: number;
  questionType: QuestionTypeFilter;
  difficulty: QuestionDifficultyFilter;
  focusNotes?: string;
  excludeQuestions?: string[];
  variationSeed?: string;
  contextPoints?: string[];
}

const VARIATION_ANGLES = [
  'التركيز على الفهم السببي (لماذا وكيف تحدث الظاهرة) وربط السبب بالنتيجة',
  'التركيز على المقارنات الدقيقة والفروق الجوهرية والاستثناءات العلمية',
  'التركيز على تطبيق القوانين والعلاقات الرياضية والبيانية وتأثير تغيّر العوامل',
  'التركيز على الأخطاء الشائعة ومصائد واضعي الامتحانات في النظام الحديث',
  'التركيز على المواقف العملية والتجارب المعملية والاستنتاج المنطقي',
  'التركيز على التسلسل الزمني والترتيب المنهجي للخطوات والتفاعلات',
  'التركيز على تحليل العلاقات العكسية والطردية وشروط حدوثها أو توقفها',
  'التركيز على الربط بين المفاهيم المتقاربة والتمييز الدقيق بين المصطلحات',
];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandomFactory(seedNum: number): () => number {
  let state = seedNum || 123456789;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function shuffleQuestionOptions(q: InteractiveQuestion, rng: () => number): InteractiveQuestion {
  if (q.type !== 'mcq' || q.options.length !== 4) return q;
  const correctOpt = q.options[q.correctAnswerIndex ?? 0] ?? q.correctAnswerText;
  const shuffled = shuffleWithRng(q.options, rng);
  const newIdx = shuffled.findIndex((o) => o === correctOpt);
  return {
    ...q,
    options: shuffled,
    correctAnswerIndex: newIdx >= 0 ? newIdx : 0,
    correctAnswerText: shuffled[newIdx >= 0 ? newIdx : 0],
  };
}

export function buildQuestionGeneratorSystemInstruction(): string {
  return `وظيفتك العمل كمُنشئ محتوى تعليمي. بناءً على المادة والفصل والدرس الذي يحدده المستخدم، قم بتوليد مجموعة من الأسئلة التفاعلية المناسبة مع توفير الإجابات الصحيحة.

قواعد الدقة والسرعة والتنوّع:
1. التزم بدقة بـ (المادة، الفصل، الدرس) وصُغ أسئلة سريعة الفهم عالية الجودة بنظام الفهم والاستنتاج.
2. اجعل كل جولة مختلفة تماماً عن أي أسئلة سابقة (نوّع الزاوية، السيناريو، الأرقام، أو أسلوب الطرح، ووزّع مكان الإجابة الصحيحة عشوائياً بين الخيارات الأربعة ولا تجعلها دائماً الأولى).
3. اكتب المعادلات والرموز مقروءة مباشرة بدون LaTeX (مثل: H₂SO₄، Fe²⁺، R = ρe × (L / A)، ⇌).
4. صيغ الأنواع:
   - "mcq": 4 اختيارات متوازنة، و"correctAnswerIndex" من 0 إلى 3، و"correctAnswerText" مطابق تماماً للاختيار الصحيح.
   - "true_false": options دائماً ["صواب", "خطأ"]، وcorrectAnswerIndex (0 أو 1).
   - "short_answer": options مصفوفة []، و"correctAnswerText" إجابة نموذجية مركزة.
5. اجعل "explanation" (جملتين واضحتين) و"hint" (جملة قصيرة) لضمان أسرع استجابة.`;
}

export function buildQuestionGeneratorPrompt(params: QuestionGenerationParams): string {
  const safeCount = Math.min(15, Math.max(3, Math.round(params.count || 6)));
  const seedStr = params.variationSeed || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const angle = VARIATION_ANGLES[hashSeed(seedStr) % VARIATION_ANGLES.length];

  const typeLabel =
    params.questionType === 'mcq'
      ? 'جميع الأسئلة اختيار من متعدد (mcq) بـ 4 اختيارات.'
      : params.questionType === 'true_false'
      ? 'جميع الأسئلة صواب وخطأ (true_false).'
      : params.questionType === 'short_answer'
      ? 'جميع الأسئلة مقالية قصيرة / استنتاجية (short_answer).'
      : 'تنوّع بين اختيار من متعدد وصواب وخطأ وسؤال قصير.';

  const difficultyLabel =
    params.difficulty === 'basic'
      ? 'تأسيسي يرسخ المفاهيم الأساسية.'
      : params.difficulty === 'exam'
      ? 'مستوى امتحان الوزارة (فهم وربط).'
      : params.difficulty === 'advanced'
      ? 'مستوى متفوقين وتركات عليا.'
      : 'متدرج من الأساسي إلى التحدي.';

  const excluded = Array.isArray(params.excludeQuestions)
    ? params.excludeQuestions
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .slice(0, 18)
    : [];

  const contextBlock =
    Array.isArray(params.contextPoints) && params.contextPoints.length > 0
      ? `نقاط مرجعية سريعة من المنهج:\n- ${params.contextPoints.slice(0, 4).join('\n- ')}`
      : null;

  const excludeBlock =
    excluded.length > 0
      ? `ممنوع تماماً تكرار أو إعادة صياغة أي من الأسئلة السابقة التالية (ابتكر أفكاراً وصياغات جديدة 100%):\n${excluded
          .map((q, idx) => `${idx + 1}) ${q.slice(0, 110)}`)
          .join('\n')}`
      : null;

  return [
    `المادة: ${params.subject.trim()}`,
    `الفصل: ${params.chapter.trim() || 'عام'}`,
    `الدرس: ${params.lesson.trim()}`,
    `العدد المطلوب: ${safeCount} أسئلة.`,
    `النوع: ${typeLabel}`,
    `المستوى: ${difficultyLabel}`,
    `زاوية التوليد الفريدة لهذه الجلسة (${seedStr}): ${angle}.`,
    contextBlock,
    params.focusNotes?.trim() ? `توجيه المستخدم: ${params.focusNotes.trim()}` : null,
    excludeBlock,
    'أعد مصفوفة JSON مطابقة للمخطط فقط.',
  ]
    .filter(Boolean)
    .join('\n');
}

function normalizeDifficulty(raw: any): GeneratedQuestionDifficulty {
  const text = String(raw || '').trim();
  if (text.includes('أساس') || text.includes('سهل')) return 'أساسي';
  if (text.includes('تحد') || text.includes('صعب') || text.includes('عليا')) return 'تحدي';
  return 'متوسط';
}

function normalizeQuestionType(raw: any, requestedFilter: QuestionTypeFilter): GeneratedQuestionType {
  if (requestedFilter !== 'mixed') return requestedFilter;
  const text = String(raw || '').trim().toLowerCase();
  if (text === 'true_false' || text.includes('true') || text.includes('صواب')) return 'true_false';
  if (text === 'short_answer' || text.includes('short') || text.includes('مقال')) return 'short_answer';
  return 'mcq';
}

export function normalizeGeneratedQuestions(
  rawList: any[],
  params: QuestionGenerationParams
): InteractiveQuestion[] {
  if (!Array.isArray(rawList)) return [];

  const seedNum = hashSeed(
    `${params.variationSeed || Date.now()}-${params.lesson}-${rawList.length}`
  );
  const rng = seededRandomFactory(seedNum);

  const normalized: InteractiveQuestion[] = [];
  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i] || {};
    const questionText = String(item.question || '').trim();
    if (!questionText) continue;

    const qType = normalizeQuestionType(item.type, params.questionType);
    const difficulty = normalizeDifficulty(item.difficulty);
    const explanation =
      String(item.explanation || '').trim() ||
      'راجع الفكرة الأساسية في الدرس وتحقق من العلاقة بين المعطيات والمطلوب.';
    const hint = String(item.hint || '').trim() || undefined;

    if (qType === 'true_false') {
      let correctIdx = Number(item.correctAnswerIndex);
      const ansText = String(item.correctAnswerText || '').trim();
      if (Number.isNaN(correctIdx) || correctIdx < 0 || correctIdx > 1) {
        correctIdx = ansText.includes('خطأ') || ansText.toLowerCase() === 'false' ? 1 : 0;
      }
      normalized.push({
        id: `gq-${seedNum}-${i}-${Math.floor(rng() * 999)}`,
        type: 'true_false',
        difficulty,
        question: questionText,
        options: ['صواب', 'خطأ'],
        correctAnswerIndex: correctIdx,
        correctAnswerText: correctIdx === 0 ? 'صواب' : 'خطأ',
        explanation,
        hint,
      });
    } else if (qType === 'short_answer') {
      const correctText =
        String(item.correctAnswerText || '').trim() ||
        'راجع التعريف والنقاط الجوهرية في الدرس لكتابة الإجابة النموذجية.';
      normalized.push({
        id: `gq-${seedNum}-${i}-${Math.floor(rng() * 999)}`,
        type: 'short_answer',
        difficulty,
        question: questionText,
        options: [],
        correctAnswerText: correctText,
        explanation,
        hint,
      });
    } else {
      let options: string[] = Array.isArray(item.options)
        ? item.options.map((o: any) => String(o || '').trim()).filter(Boolean)
        : [];
      while (options.length < 4) {
        options.push(`اختيار إضافي (${options.length + 1})`);
      }
      if (options.length > 4) {
        options = options.slice(0, 4);
      }
      let correctIdx = Number(item.correctAnswerIndex);
      if (Number.isNaN(correctIdx) || correctIdx < 0 || correctIdx >= options.length) {
        const targetText = String(item.correctAnswerText || '').trim();
        const foundIdx = options.findIndex((opt) => opt === targetText);
        correctIdx = foundIdx >= 0 ? foundIdx : 0;
      }

      const rawQ: InteractiveQuestion = {
        id: `gq-${seedNum}-${i}-${Math.floor(rng() * 999)}`,
        type: 'mcq',
        difficulty,
        question: questionText,
        options,
        correctAnswerIndex: correctIdx,
        correctAnswerText: options[correctIdx],
        explanation,
        hint,
      };
      // Ensure options are genuinely balanced across positions if model skewed toward index 0
      normalized.push(shuffleQuestionOptions(rawQ, rng));
    }
  }

  return normalized;
}

export function generateQuestionsFallback(params: QuestionGenerationParams): InteractiveQuestion[] {
  const subj = params.subject.trim() || 'المادة المختارة';
  const ch = params.chapter.trim() || 'الفصل المحدد';
  const les = params.lesson.trim() || 'الدرس المحدد';
  const targetCount = Math.min(15, Math.max(3, params.count || 6));
  const seedStr =
    params.variationSeed || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rng = seededRandomFactory(hashSeed(`${seedStr}-${subj}-${les}`));

  const excludedNormalized = new Set(
    (params.excludeQuestions || []).map((q) => String(q || '').trim().slice(0, 65))
  );

  const keyPointA = params.contextPoints?.[0] || `ترابط المعطيات والشروط الأساسية في درس «${les}»`;
  const keyPointB = params.contextPoints?.[1] || `التفريق بين الحالة القياسية والحالات الاستثنائية في (${ch})`;

  const richPool: Array<Omit<InteractiveQuestion, 'id'>> = [
    {
      type: 'mcq',
      difficulty: 'أساسي',
      question: `عند بدء تحليل أي مسألة أو سؤال في درس «${les}» (${subj})، أي إجراء يضمن تجنب الخطأ المنهجي؟`,
      options: [
        'تحديد المعطيات والشروط الثابتة والمتغيرة قبل اختيار القاعدة المناسبة',
        'تطبيق أول علاقة محفوظة فور قراءة الرقم الأول في السؤال',
        'افتراض تساوي جميع الظروف الخارجية دون مراجعة نص السؤال',
        'البدء بالخيارات الرقمية وتجربتها عشوائياً دون قانون',
      ],
      correctAnswerIndex: 0,
      correctAnswerText: 'تحديد المعطيات والشروط الثابتة والمتغيرة قبل اختيار القاعدة المناسبة',
      explanation: `يعتمد الفهم الصحيح لدرس «${les}» على حصر المعطيات والشروط أولاً لأن تغيّر شرط واحد قد يغيّر القاعدة المستخدمة بالكامل.`,
      hint: 'تذكر خطوة تفكيك السؤال قبل الحل.',
    },
    {
      type: 'mcq',
      difficulty: 'متوسط',
      question: `في إطار مفاهيم (${ch}) وبالتحديد درس «${les}»، ما التفسير الأدق للعلاقة التالية: «${keyPointA.slice(0, 95)}»؟`,
      options: [
        'وجود ارتباط سببي مباشر تحكمه شروط محددة تتحقق داخل الدرس',
        'ظاهرة عشوائية لا تتأثر بتغيّر العوامل المحيطة',
        'قاعدة استثنائية لا يمكن تطبيقها على أي أمثلة مشابهة',
        'علاقة شكلية تقتصر على التعريف اللفظي دون أثر عملي',
      ],
      correctAnswerIndex: 0,
      correctAnswerText: 'وجود ارتباط سببي مباشر تحكمه شروط محددة تتحقق داخل الدرس',
      explanation: `تؤكد النقطة المحورية في درس «${les}» أن النتائج تتبع السبب العلمي والشروط المحددة بصورة منضبطة يمكن استنتاجها منطقياً.`,
      hint: 'اربط بين السبب والنتيجة في هذه الجزئية.',
    },
    {
      type: 'true_false',
      difficulty: 'أساسي',
      question: `في درس «${les}» بمادة ${subj}، يكفي الاعتماد على الحفظ النصي للتعريفات دون فهم شروط التطبيق أو الاستثناءات للإجابة على أسئلة الفهم.`,
      options: ['صواب', 'خطأ'],
      correctAnswerIndex: 1,
      correctAnswerText: 'خطأ',
      explanation: 'خطأ؛ تعتمد أسئلة النظام الحديث على الفهم والتطبيق وتحليل شروط الحدوث والعلاقات السببية وليس الحفظ الآلي.',
      hint: 'انتبه لطبيعة أسئلة النظام الحديث.',
    },
    {
      type: 'mcq',
      difficulty: 'تحدي',
      question: `إذا طُلب منك المقارنة بين حالتين متضادتين في درس «${les}»، فما المعيار الحاسم الذي يمنع الخلط بينهما في الامتحان؟`,
      options: [
        'فحص اتجاه التغير في العامل المستقل وأثره على الناتج النهائي وزمن الحدوث',
        'عدّ عدد الكلمات في كل عبارة واختيار الصياغة الأطول',
        'تجاهل حالة الوسط أو الترتيب الزمني للتغيرات',
        'الاعتماد على تشابه الأسماء الظاهرية للمصطلحات',
      ],
      correctAnswerIndex: 0,
      correctAnswerText: 'فحص اتجاه التغير في العامل المستقل وأثره على الناتج النهائي وزمن الحدوث',
      explanation: 'المقارنات الدقيقة في الاختبارات تحسمها الشروط الفاصلة، واتجاه التأثير (يزداد/يقل/يثبت)، والفرق بين الأثر اللحظي والمستمر.',
      hint: 'ابحث عن المعيار العلمي الحقيقي للتمييز.',
    },
    {
      type: 'short_answer',
      difficulty: 'متوسط',
      question: `اشرح بإيجاز بأسلوبك الفكرة المحورية لدرس «${les}» ضمن (${ch}) مع ذكر شرط واحد أساسي لحدوثها أو صحتها.`,
      options: [],
      correctAnswerText: `تركّز الفكرة المحورية لدرس «${les}» على: ${keyPointA}. ويُشترط لصحتها التحقق من العوامل الحاكمة وتكامل المعطيات المذكورة في (${ch}).`,
      explanation: 'الإجابة القوية في الأسئلة القصيرة تُصاغ في صورة: (المبدأ العلمي + شرط التحقق + النتيجة المترتبة).',
      hint: 'اكتب الفكرة ثم أضف: "بشرط أن...".',
    },
    {
      type: 'mcq',
      difficulty: 'تحدي',
      question: `أبرز مصيدة امتحان في مسائل وأسئلة درس «${les}» تتمثل في اختيار الطالب لإجابة صحيحة عموماً لكنها تتجاهل:`,
      options: [
        'قيداً محدداً أو استثناءً مذكوراً داخل رأس السؤال (مثل: في البداية، عدا، أو عند ثبوت عامل معين)',
        'تغيير خط الكتابة أو ترقيم الخيارات في ورقة الأسئلة',
        'ترتيب الدروس في فهرس الكتاب المدرسي',
        'اختصار العناوين الفرعية في الملخصات',
      ],
      correctAnswerIndex: 0,
      correctAnswerText: 'قيداً محدداً أو استثناءً مذكوراً داخل رأس السؤال (مثل: في البداية، عدا، أو عند ثبوت عامل معين)',
      explanation: 'كثيراً ما تكون الجملة صحيحة علمياً في المطلق، لكن السؤال يقيّدها بزمن أو شرط أو حالة عكسية تغيّر الاختيار الصحيح تماماً.',
      hint: 'راقب الكلمات المفتاحية المقيدة في السؤال.',
    },
    {
      type: 'true_false',
      difficulty: 'متوسط',
      question: `فهم النقطة التالية: «${keyPointB.slice(0, 95)}» يساعد في استبعاد المشتتات الخاطئة في أسئلة الاختيار من متعدد لدرس «${les}».`,
      options: ['صواب', 'خطأ'],
      correctAnswerIndex: 0,
      correctAnswerText: 'صواب',
      explanation: 'صواب؛ الوعي بالفروق الدقيقة والاستثناءات يمنحك قدرة فورية على استبعاد الاختيارات المتناقضة علمياً.',
      hint: 'فكّر في فائدة معرفة الفروق الدقيقة أثناء الحل.',
    },
    {
      type: 'mcq',
      difficulty: 'متوسط',
      question: `عند قراءة منحنى بياني يخص متغيرين في درس «${les}» (${subj})، ما أول خطوة قبل الحكم على شكل العلاقة؟`,
      options: [
        'التحقق من كمية ووحدة كلٍّ من المحور الأفقي (المستقل) والمحور الرأسي (التابع)',
        'افتراض أن الخط المستقيم المائل يعني دائماً علاقة عكسية',
        'النظر لنقطة النهاية فقط دون معرفة نقطة البداية أو الميل',
        'تجاهل القيم العددية على المحاور',
      ],
      correctAnswerIndex: 0,
      correctAnswerText: 'التحقق من كمية ووحدة كلٍّ من المحور الأفقي (المستقل) والمحور الرأسي (التابع)',
      explanation: 'في الرسوم البيانية قد يعكس واضع السؤال موضع المحورين أو يغيّر البادئات (ملي/مايكرو)، لذا فحص المحورين أولاً ضروري.',
      hint: 'مقلوب الميل يتغير لو تبدل المحوران!',
    },
    {
      type: 'short_answer',
      difficulty: 'تحدي',
      question: `ماذا يحدث إذا اختلّ أحد الشروط الأساسية الحاكمة للظاهرة أو القاعدة في درس «${les}»؟ فسّر إجابتك علمياً في سطرين.`,
      options: [],
      correctAnswerText: `يتعطل المسار الطبيعي أو يتغير الناتج الكمي والنوعي المرتبط بدرس «${les}»؛ لأن تحقق الظاهرة أو صحة العلاقة يعتمد بصورة مباشرة على تكامل تلك الشروط.`,
      explanation: 'توضيح الأثر المباشر لغياب الشرط يثبت الفهم العميق وليس مجرد حفظ النتيجة.',
      hint: 'اسأل نفسك: ما وظيفة هذا الشرط ولو غاب ماذا يتوقف؟',
    },
    {
      type: 'true_false',
      difficulty: 'تحدي',
      question: `في جميع التطبيقات المرتبطة بدرس «${les}» (${ch})، يؤدي زيادة أي عامل مؤثر إلى زيادة الناتج النهائي إلى ما لا نهاية دون وجود حد أقصى أو تثبيط.`,
      options: ['صواب', 'خطأ'],
      correctAnswerIndex: 1,
      correctAnswerText: 'خطأ',
      explanation: 'خطأ؛ معظم العمليات والعلاقات لها حدود تشبع أو عوامل محددة أو آليات تنظيم عكسية تمنع الزيادة المطلقة إلى ما لا نهاية.',
      hint: 'تذكّر قاعدة الحدود القصوى والعامل المحدد.',
    },
    {
      type: 'mcq',
      difficulty: 'أساسي',
      question: `ما الغرض الأساسي من ربط درس «${les}» بسائر دروس (${ch}) في المراجعة النهائية لمادة ${subj}؟`,
      options: [
        'تكوين خريطة مفاهيم متكاملة تعالج أسئلة الربط بين أكثر من جزئية في الامتحان',
        'مضاعفة حجم الحفظ النظري دون تطبيق عملي',
        'فصل كل جزئية عن سياقها العام داخل المادة',
        'تأجيل التدريب العملي حتى ليلة الامتحان فقط',
      ],
      correctAnswerIndex: 0,
      correctAnswerText: 'تكوين خريطة مفاهيم متكاملة تعالج أسئلة الربط بين أكثر من جزئية في الامتحان',
      explanation: 'الامتحانات الحديثة تجمع غالباً بين مفهومين من درسين متتاليين داخل الفصل في سؤال واحد.',
      hint: 'أسئلة النظام الحديث تحب الربط بين الدروس.',
    },
    {
      type: 'short_answer',
      difficulty: 'أساسي',
      question: `اذكر قاعدة أو خطوة ذهبية واحدة تحرص على مراجعتها قبل البدء في حل بنك أسئلة درس «${les}».`,
      options: [],
      correctAnswerText: `البدء بمراجعة المفاهيم والمصطلحات الأساسية وشروط التطبيق والوحدات في درس «${les}» قبل الانطلاق في حل التدريبات المتدرجة.`,
      explanation: 'تثبيت الأساسيات يمنع تضاعف الأخطاء أثناء حل الأسئلة المركبة.',
      hint: 'فكّر في أهم أساس تعتمد عليه قبل حل المسائل.',
    },
  ];

  const matchingType =
    params.questionType === 'mixed'
      ? richPool
      : richPool.filter((q) => q.type === params.questionType);

  // Filter out recently seen stems when possible so every retry delivers distinct questions
  const unseenFirst = matchingType.filter(
    (q) => !excludedNormalized.has(q.question.trim().slice(0, 65))
  );
  const candidateBase = unseenFirst.length >= targetCount ? unseenFirst : matchingType;
  const shuffledPool = shuffleWithRng(candidateBase, rng);

  const result: InteractiveQuestion[] = [];
  for (let i = 0; i < targetCount; i++) {
    const base = shuffledPool[i % shuffledPool.length];
    const item: InteractiveQuestion = {
      ...base,
      id: `fb-${Date.now()}-${i}-${Math.floor(rng() * 10000)}`,
      options: [...base.options],
    };
    result.push(shuffleQuestionOptions(item, rng));
  }
  return result;
}
