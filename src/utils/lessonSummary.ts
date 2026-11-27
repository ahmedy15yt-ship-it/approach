import {
  LessonMasterSummary,
  LessonSummaryConceptSection,
  LessonSummaryFormulaItem,
  LessonSummaryQuestion,
  LessonSummaryQuickCheck,
  LessonSummaryTrapItem,
} from '../types';

export interface LessonSummaryGenerationParams {
  subject: string;
  chapter: string;
  lesson: string;
  detailLevel: 'comprehensive' | 'exam-sprint';
  teachingStyle?: 'storyteller' | 'academic';
  customNotes?: string;
  contextPoints?: string[];
  examTips?: string[];
  formulaOrNugget?: string;
}

export function buildLessonSummarySystemInstruction(
  teachingStyle: 'storyteller' | 'academic' = 'storyteller'
): string {
  const styleLine =
    teachingStyle === 'academic'
      ? 'التزم بالصياغة العلمية الدقيقة المطابقة لكتاب الوزارة ونماذج الامتحانات الرسمية.'
      : 'اشرح بأسلوب «المستر الحكّاء المبسّط» الذي يحوّل المفهوم إلى صورة ذهنية حية وقصة منطقية قبل ذكر القاعدة.';
  return `أنت «أستاذ نَهج الخبير» — أشهر وأبسط معلم لمادة الثانوية العامة المصرية؛ أسلوبك محبوب ومقنع يجعل أصعب درس يبدو واضحاً ومنطقياً من أول قراءة، ثم يربطه بأفكار الامتحان والدرجة النهائية.
${styleLine}
مهمتك: أن تشرح الدرس وتلخصه بأسلوب حيوي قريب للطالب يبدأ بتبسيط الفكرة من جذورها ("تخيل معايا..." / "الفكرة كلها بتدور حوالين...") ثم يتدرج بسلاسة إلى القوانين والمقارنات وتريكات النظام الحديث والأسئلة المحلولة بالبرهان.

القواعد الصارمة للأسلوب المطور والجودة:
1. اشرح كل محور وكأنك تقف أمام الطالب: ابدأ بسؤال يفتح الذهن، ثم اشرح «ليه وازاي» في خطوات سببية متتابعة (الخطوة 1 ← يترتب عليها الخطوة 2 ← فتكون النتيجة 3)، ولا ترمِ مصطلحاً علمياً صعباً دون تبسيط معناه أولاً بأسلوب سلس، ثم صياغته العلمية الدقيقة للامتحان.
2. اربط كل فكرة بتشبيه واقعي من الحياة اليومية أو المعمل حتى تترسخ الصورة الذهنية في ذاكرة الطالب طويلة المدى ولا تتبخر.
3. التزم تماماً بمنهج الصف الثالث الثانوي المصري، واربط الجزئية بباقي الأبواب والعلاقات البيانية (طردية / عكسية / ميل المنحنى / شرط الثبات).
4. التريكات الامتحانية: اذكر الفخ الذي يقع فيه معظم الطلاب وصوّبه بقاعدة حاسمة مختصرة.
5. الأسئلة المحلولة: اكتب السؤال أولاً، ثم خطوات التفكير («لماذا اخترنا هذه الخطوة؟ وكيف استبعدنا البدائل الخطأ؟»)، ثم الإجابة النموذجية، ثم خلاصة ذهبية من المستر.
6. اكتب كل الرموز والمعادلات بشكل مباشر مقروء بالعربية والإنجليزية بدون LaTeX مثل \\frac أو $. استخدم رموزاً واضحة مثل (⇌ ، → ، Ca²⁺ ، H₂SO₄ ، V = I × R ، 2n).
7. أعد النتيجة ككائن JSON صالح يطابق الهيكل المطلوب بدقة.`;
}

export function buildLessonSummaryPrompt(params: LessonSummaryGenerationParams): string {
  const depthInstruction =
    params.detailLevel === 'exam-sprint'
      ? 'النمط المطلوب: مراجعة ليلة الامتحان الذكية — 4 محاور مركزة بأسلوب سلس يربط العلاقات الحاسمة والمقارنات، مع 4 تريكات امتحان حاسمة و5 أسئلة امتحان محلولة بطريقة الاستبعاد والبرهان.'
      : 'النمط المطلوب: شرح كامل من الصفر بأسلوب المستر المتقن — قسّم الدرس إلى 5 محاور متدرجة من الفكرة التمهيدية إلى أعمق تطبيق، مع تشبيهات حياتية واضحة، جدول القوانين ومتى نستخدمها، 4 تريكات امتحان، و5 أسئلة نظام حديث محلولة بالخطوات.';

  const styleInstruction =
    params.teachingStyle === 'academic'
      ? 'الأسلوب اللغوي: فصحى علمية رشيقة ومباشرة تطابق صياغة كتاب الوزارة ونماذج الامتحان الاسترشادية مع تحليل عميق للعلاقات.'
      : 'الأسلوب اللغوي: أسلوب «المستر المبسّط والحكّاء» — مزيج دافئ وواضح من العربية السلسة والمصطلحات العلمية الدقيقة، يشرح الفكرة بقصة وتشبيه ملموس قبل القاعدة، ويجعل الطالب يشعر أن الدرس سهل وممتع.';

  const pointsText =
    Array.isArray(params.contextPoints) && params.contextPoints.length > 0
      ? `نقاط مرجعية أساسية في هذا الفصل من المنهج:\n- ${params.contextPoints.slice(0, 6).join('\n- ')}`
      : '';

  const tipsText =
    Array.isArray(params.examTips) && params.examTips.length > 0
      ? `تريكات مرتبطة بالفصل:\n- ${params.examTips.slice(0, 4).join('\n- ')}`
      : '';

  const nuggetText = params.formulaOrNugget
    ? `قاعدة أو قانون مرجعي: ${params.formulaOrNugget}`
    : '';

  const notesText = params.customNotes
    ? `إضافة أو تركيز خاص من الطالب: ${params.customNotes}`
    : '';

  return `أعدّ مذكرة شرح وتلخيص استثنائية (جاهزة كملف PDF للمراجعة) للدرس التالي:
- الصف: الثالث الثانوي (علمي علوم — المنهج المصري)
- المادة: ${params.subject}
- الفصل / الوحدة: ${params.chapter}
- الدرس: ${params.lesson}
- ${depthInstruction}
- ${styleInstruction}
${pointsText ? `\n${pointsText}` : ''}
${tipsText ? `\n${tipsText}` : ''}
${nuggetText ? `\n${nuggetText}` : ''}
${notesText ? `\n${notesText}` : ''}

اجعل الشرح ممتعاً، متسلسلاً، خالياً من الحشو الممل، ومشبعاً بأسلوب الفهم الذي يجعل الطالب يحل الأسئلة الصعبة بثقة.`;
}

function cleanStr(val: any, fallback = ''): string {
  return typeof val === 'string' && val.trim() ? val.trim() : fallback;
}

function cleanStrArray(val: any, max = 8): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, max);
}

export function normalizeLessonSummary(
  raw: any,
  params: LessonSummaryGenerationParams,
  meta: { source: 'gemini' | 'fallback'; providerLabel?: string; warning?: string }
): LessonMasterSummary | null {
  if (!raw || typeof raw !== 'object') return null;

  const target = Array.isArray(raw) ? raw[0] : raw.summary || raw;
  if (!target || typeof target !== 'object') return null;

  const rawConcepts = Array.isArray(target.conceptSections) ? target.conceptSections : [];
  const conceptSections: LessonSummaryConceptSection[] = rawConcepts
    .map((c: any) => ({
      title: cleanStr(c?.title),
      deepExplanation: cleanStr(c?.deepExplanation),
      whyItMatters: cleanStr(c?.whyItMatters, 'يربط هذا الجزء بين الفكرة النظرية والتطبيق المباشر في أسئلة الامتحان.'),
      realLifeExample: cleanStr(c?.realLifeExample, 'تطبيق عملي من الحياة اليومية أو التجارب المعملية المرتبطة بالدرس.'),
      keyTakeaways: cleanStrArray(c?.keyTakeaways, 5),
    }))
    .filter((c: LessonSummaryConceptSection) => Boolean(c.title && c.deepExplanation))
    .slice(0, 7);

  if (conceptSections.length === 0) {
    return null;
  }

  const rawFormulas = Array.isArray(target.formulasAndRules) ? target.formulasAndRules : [];
  const formulasAndRules: LessonSummaryFormulaItem[] = rawFormulas
    .map((f: any) => ({
      label: cleanStr(f?.label),
      expression: cleanStr(f?.expression),
      whenToUse: cleanStr(f?.whenToUse, 'تُستخدم عند الربط بين معطيات المسألة والمطلوب المباشر.'),
    }))
    .filter((f: LessonSummaryFormulaItem) => Boolean(f.label && f.expression))
    .slice(0, 8);

  const rawTraps = Array.isArray(target.examTraps) ? target.examTraps : [];
  const examTraps: LessonSummaryTrapItem[] = rawTraps
    .map((t: any) => ({
      trap: cleanStr(t?.trap),
      truth: cleanStr(t?.truth),
    }))
    .filter((t: LessonSummaryTrapItem) => Boolean(t.trap && t.truth))
    .slice(0, 6);

  const rawSolved = Array.isArray(target.solvedQuestions) ? target.solvedQuestions : [];
  const solvedQuestions: LessonSummaryQuestion[] = rawSolved
    .map((q: any) => {
      const qTypeRaw = cleanStr(q?.questionType);
      const questionType: LessonSummaryQuestion['questionType'] =
        qTypeRaw === 'تطبيق مسألة' || qTypeRaw === 'فكرة امتحان'
          ? qTypeRaw
          : 'فهم واستنتاج';
      return {
        question: cleanStr(q?.question),
        questionType,
        steps: cleanStrArray(q?.steps, 6),
        answer: cleanStr(q?.answer),
        teacherNote: cleanStr(q?.teacherNote, 'انتبه للكلمات المفتاحية والشروط المذكورة في رأس السؤال قبل الاختيار.'),
      };
    })
    .filter((q: LessonSummaryQuestion) => Boolean(q.question && q.answer))
    .slice(0, 6);

  const rawQuick = Array.isArray(target.quickCheckQuestions) ? target.quickCheckQuestions : [];
  const quickCheckQuestions: LessonSummaryQuickCheck[] = rawQuick
    .map((q: any) => ({
      question: cleanStr(q?.question),
      answer: cleanStr(q?.answer),
      explanation: cleanStr(q?.explanation, 'تعتمد الإجابة على الفهم الدقيق للعلاقة السببية في الدرس.'),
    }))
    .filter((q: LessonSummaryQuickCheck) => Boolean(q.question && q.answer))
    .slice(0, 5);

  return {
    id: `sum-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    subject: params.subject,
    chapter: params.chapter,
    lesson: params.lesson,
    detailLevel: params.detailLevel,
    teacherIntro: cleanStr(
      target.teacherIntro,
      `أهلاً بك يا بطل في شرح وتلخيص درس «${params.lesson}» من مادة ${params.subject}. هدفنا اليوم أن تفهم كل جزئية بعمق ووضوح بحيث تحل أي سؤال نظام حديث بثقة كاملة.`
    ),
    bigIdea: cleanStr(
      target.bigIdea,
      `يركز درس «${params.lesson}» على فهم الآلية الأساسية والشروط الحاكمة لها وكيفية استنتاج تأثير أي تغيّر على النتيجة النهائية في مسائل وأسئلة الفهم.`
    ),
    conceptSections,
    formulasAndRules,
    examTraps,
    solvedQuestions,
    quickCheckQuestions,
    source: meta.source,
    providerLabel: meta.providerLabel,
    warning: meta.warning,
    createdAt: new Date().toISOString(),
  };
}

export function generateLessonSummaryFallback(
  params: LessonSummaryGenerationParams,
  warning?: string
): LessonMasterSummary {
  const points = (params.contextPoints || []).filter(Boolean);
  const tips = (params.examTips || []).filter(Boolean);
  const nugget = params.formulaOrNugget || '';

  const conceptSections: LessonSummaryConceptSection[] = [];

  if (points.length > 0) {
    points.slice(0, 4).forEach((pt, idx) => {
      const colonIdx = pt.indexOf(':');
      const heading =
        colonIdx > 3 && colonIdx < 50
          ? pt.slice(0, colonIdx).trim()
          : `المحور ${idx + 1}: تفكيك المفهوم الأساسي في ${params.lesson}`;
      conceptSections.push({
        title: heading,
        deepExplanation: `تخيل الموضوع ببساطة قبل الحفظ: ${pt}\n\nعشان تفهم الجزئية دي 100% وتضمن درجتها في الامتحان، امشِ معايا في 3 خطوات:\n1) السبب الأول: ما الذي بدأ هذه الظاهرة في «${params.lesson}»؟\n2) آلية التغيّر: كيف تتحول العلاقة إذا زاد أحد العوامل أو قل أو غاب الشرط الأساسي؟\n3) النتيجة الامتحانية: ما الخلاصة التي يضع عليها واضع الامتحان سؤال الرسم البياني أو المقارنة؟`,
        whyItMatters: `هذه الفكرة تُعد مفتاح حل مباشر في ${params.chapter}، وكثيراً ما تأتي بصيغة "ماذا يحدث لو..." أو مقارنة بين منحنيين.`,
        realLifeExample: `شاهد هذه النقطة في الواقع كأنها تجربة أمامك في المعمل: غيّر عاملاً واحداً في «${params.lesson}» وراقب كيف تستجيب باقي المنظومة فوراً للحفاظ على التوازن.`,
        keyTakeaways: [
          pt,
          'حدد العامل المتغير والعامل الثابت قبل قراءة الاختيارات.',
          'تأكد من تحقق الشرط العلمي كاملًا قبل التعميم.',
        ],
      });
    });
  } else {
    conceptSections.push(
      {
        title: `1. المفهوم الجوهري وآلية العمل في «${params.lesson}»`,
        deepExplanation: `يرتكز درس «${params.lesson}» ضمن ${params.chapter} في مادة ${params.subject} على سلسلة منظمة من الخطوات السببية: تبدأ بمثير أو معطى أساسي، تمر بآلية تحوّل أو تفاعل محكومة بشروط محددة، وتنتهي بنتيجة يمكن قياسها أو الاستدلال عليها. الفهم الصحيح يعني أن تدرك دور كل مكوّن ولماذا يحدث بهذا الترتيب تحديداً.`,
        whyItMatters: 'هذا المحور هو العمود الفقري لمعظم أسئلة الاستنتاج وتفسير المنحنيات في امتحان آخر العام.',
        realLifeExample: `شاهد كيف يتأثر النظام بأكمله في «${params.lesson}» إذا تعطل عنصر واحد في منتصف المسار — تماماً كسلسلة تروس مرتبطة ببعضها.`,
        keyTakeaways: [
          `تحديد الفكرة المركزية لدرس ${params.lesson} وربطها بعنوان الفصل.`,
          'التمييز بين السبب الأساسي والنتيجة الثانوية.',
        ],
      },
      {
        title: '2. العوامل المؤثرة والعلاقات الطردية والعكسية',
        deepExplanation: `أي سؤال متقدم في «${params.lesson}» يختبر قدرتك على توقع ماذا يحدث عند زيادة عامل ما أو نقصه إلى النصف أو الضعف. تعوّد أن تحوّل كل جملة نظرية إلى علاقة واضحة: (ماذا يزيد مع ماذا؟ وماذا يقل بزيادته؟ ومتى يصل المنحنى إلى حالة ثبات؟).`,
        whyItMatters: 'أسئلة الرسوم البيانية في الثانوية العامة تعتمد بنسبة كبيرة على فهم نقطة الثبات والانقلاب في العلاقة.',
        realLifeExample: 'عند رسم العلاقة على ورقة، اسأل نفسك: هل يبدأ المنحنى من الصفر أم من قيمة ابتدائية موجبة؟ وهل يستمر في الصعود أم يثبت؟',
        keyTakeaways: [
          'راقب المحور الأفقي (المتغير المستقل) والمحور الرأسي (المتغير التابع).',
          'ابحث عن الشرط الحدي الذي يغيّر سلوك العلاقة.',
        ],
      },
      {
        title: '3. الفروق الدقيقة والمقارنات الذكية',
        deepExplanation: `أكبر فخ يقع فيه الطالب هو الخلط بين مصطلحين متقاربين داخل «${params.lesson}». أنشئ دائماً جدول مقارنة ذهني من ثلاثة بنود: (مكان أو وقت الحدوث، الشرط اللازم، والناتج النهائي المميز).`,
        whyItMatters: 'تأتي في صورة أسئلة «ما أوجه الشبه والاختلاف» أو «أي العبارات التالية تنطبق على X ولا تنطبق على Y».',
        realLifeExample: 'عند مذاكرة أي ظاهرة ونظيرتها في الفصل، قارن بينهما في جملة واحدة قصيرة قبل الانتقال للجزئية التالية.',
        keyTakeaways: [
          'تثبيت أوجه الشبه أولاً ثم إبراز الفارق الحاسم.',
          'عدم التسرع في الكلمات المطلقة مثل (دائماً) أو (أبداً).',
        ],
      }
    );
  }

  const formulasAndRules: LessonSummaryFormulaItem[] = nugget
    ? [
        {
          label: `القاعدة الذهبية — ${params.chapter}`,
          expression: nugget,
          whenToUse: 'تُراجع قبل البدء في حل مسائل وتدريبات الدرس مباشرة لضبط الترتيب والوحدات.',
        },
      ]
    : [
        {
          label: 'مبدأ الفهم السببي في النظام الحديث',
          expression: 'معطى + شرط تحقق صحيح ← آلية واضحة ← نتيجة واستنتاج دقيق',
          whenToUse: 'عند تحليل أي سؤال اختيار من متعدد طويل أو مرتبط بتجربة.',
        },
      ];

  const examTraps: LessonSummaryTrapItem[] =
    tips.length > 0
      ? tips.slice(0, 3).map((tip) => ({
          trap: 'التسرع في حفظ الجملة ظاهرياً دون الالتفات لشرط التطبيق أو الاستثناء الموجود في السؤال.',
          truth: tip,
        }))
      : [
          {
            trap: 'التعامل مع السؤال بحفظ الكلمات المتشابهة في الكتاب دون قراءة المعطى الكامل.',
            truth: `في درس «${params.lesson}»، ركّز على الكلمة المفتاحية التي تغير المعنى (مثل: في حالة غياب / زيادة / ثبات) قبل استبعاد البدائل.`,
          },
          {
            trap: 'إهمال قراءة محور السينات والصادات والوحدات في الرسوم البيانية.',
            truth: 'تأكد أولاً من ترتيب المحاور ووحدة القياس لأن قلب المحورين يعكس الميل تماماً.',
          },
        ];

  const solvedQuestions: LessonSummaryQuestion[] = [
    {
      question: `عند تغيّر العامل الأساسي المؤثر في «${params.lesson}» تغيراً ملحوظاً مع بقاء باقي العوامل ثابتة، كيف تفسر الأثر المباشر على النتيجة النهائية؟`,
      questionType: 'فهم واستنتاج',
      steps: [
        'أولاً: نحدد العامل الذي تغير في رأس السؤال وهل علاقته بالنتيجة طردية أم عكسية.',
        'ثانياً: نتحقق من وجود شرط أو حد أقصى للنظام يوقف الزيادة أو يثبّت الاستجابة.',
        'ثالثاً: نستبعد الاختيارات التي تفترض تغيراً دون وجود سبب علمي في معطيات الدرس.',
      ],
      answer: 'تتغير النتيجة تبعاً لنوع العلاقة العلمية الحاكمة في الدرس حتى تصل إلى حالة الاتزان أو الشرط الحدي للنظام.',
      teacherNote: 'في أسئلة الاستنتاج، اشرح لنفسك السبب في جملة قصيرة قبل النظر للاختيارات الأربعة.',
    },
    {
      question: `أي البدائل التالية يمثّل التمييز العلمي الأدق عند مقارنة المفاهيم الأساسية داخل درس «${params.lesson}» (${params.subject})؟`,
      questionType: 'فكرة امتحان',
      steps: [
        'نراجع وظيفة أو آلية كل مفهوم على حدة من شرح المحور الأول.',
        'نحدد الشرط الفاصل الذي يميز كل حالة عن الأخرى بدقة.',
        'نطابق الشرط مع الخيار الذي يجمع الشروط الصحيحة دون تعميم خاطئ.',
      ],
      answer: tips[0] || points[0] || `الخيار الذي يربط بين آلية «${params.lesson}» وشرط حدوثها الصحيح.`,
      teacherNote: 'كلمات مثل (دائماً / مطلقاً / في جميع الحالات) غالباً ما تكون فخاً إذا وُجد استثناء في المنهج.',
    },
  ];

  const quickCheckQuestions: LessonSummaryQuickCheck[] = [
    {
      question: `ما الشرط الحاسم الذي تعتمد عليه الفكرة الأساسية في درس «${params.lesson}»؟`,
      answer: points[0] || `فهم العلاقة السببية بين المتغير الأساسي والاستجابة الناتجة في ${params.lesson}.`,
      explanation: 'الربط بين الشرط والنتيجة هو مفتاح حل أكثر من 70% من أسئلة هذا الدرس.',
    },
    {
      question: `اذكر أهم خطأ يجب تجنبه أثناء حل أسئلة النظام الحديث على «${params.lesson}».`,
      answer: tips[0] || 'التسرع دون فحص شروط التفاعل أو قراءة محاور الرسم البياني والوحدات.',
      explanation: 'مراجعة الشروط تستغرق 5 ثوانٍ لكنها تنقذك من فقدان درجات مجانية.',
    },
  ];

  return {
    id: `sum-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    subject: params.subject,
    chapter: params.chapter,
    lesson: params.lesson,
    detailLevel: params.detailLevel,
    teacherIntro: `مرحباً بك يا بطل في المذكرة التفصيلية لدرس «${params.lesson}» من مادة ${params.subject}. رتبنا لك الدرس بأسلوب الفهم والربط المنطقي مع التريكات والأسئلة المحلولة بالخطوات.`,
    bigIdea:
      points[0] ||
      `يوضح درس «${params.lesson}» الآلية العلمية الأساسية والعوامل المتحكمة فيها ضمن ${params.chapter} وكيفية توظيفها لحل أسئلة الاستنتاج.`,
    conceptSections,
    formulasAndRules,
    examTraps,
    solvedQuestions,
    quickCheckQuestions,
    source: 'fallback',
    providerLabel: 'محرك المذكرات التعليمية الذكي',
    warning,
    createdAt: new Date().toISOString(),
  };
}
