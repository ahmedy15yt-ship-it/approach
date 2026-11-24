import { ImportantSentenceEntry } from '../../types';
import { generateSentenceArabicPronunciation } from '../../utils/speechPronunciation';
// Ensure dictionary phonetic cache is registered before computing sentence pronunciations
import '../dictionary';

export const SENTENCE_CATEGORIES = [
  'الكل',
  'المحادثات اليومية',
  'الدراسة والامتحانات',
  'كتابة المقال والترجمة',
  'القواعد في السياق',
  'العلم والتكنولوجيا',
  'العمل والمستقبل',
  'الصحة والحياة',
  'تعبيرات وأمثال شائعة',
] as const;

interface CoreSentenceSeed {
  category: string;
  en: string;
  ar: string;
}

const CORE_GOLDEN_SENTENCES: CoreSentenceSeed[] = [
  // المحادثات اليومية
  { category: 'المحادثات اليومية', en: 'Good morning, how is everything going with you today?', ar: 'صباح الخير، كيف تسير الأمور معك اليوم؟' },
  { category: 'المحادثات اليومية', en: 'Excuse me, could you speak a little more slowly, please?', ar: 'عذراً، هل يمكنك التحدث ببطء أكثر من فضلك؟' },
  { category: 'المحادثات اليومية', en: 'Thank you so much for your kind help and support.', ar: 'شكراً جزيلاً لك على مساعدتك اللطيفة ودعمك.' },
  { category: 'المحادثات اليومية', en: 'Could you tell me the quickest way to the nearest metro station?', ar: 'هل يمكنك إخباري بأقرب طريق إلى محطة المترو الأقرب؟' },
  { category: 'المحادثات اليومية', en: 'I really appreciate your patience while I explain my point.', ar: 'أقدّر صبرك حقاً بينما أشرح وجهة نظري.' },
  { category: 'المحادثات اليومية', en: 'Do you mind if I open the window to let some fresh air in?', ar: 'هل تمانع إذا فتحت النافذة لإدخال بعض الهواء النقي؟' },
  { category: 'المحادثات اليومية', en: 'I am looking forward to hearing good news from you soon.', ar: 'أتطلع لسماع أخبار سارة منك قريباً.' },
  { category: 'المحادثات اليومية', en: 'Let us stay in touch and plan our next meeting carefully.', ar: 'دعنا نبقى على تواصل ونخطط لاجتماعنا القادم بعناية.' },
  { category: 'المحادثات اليومية', en: 'Sorry for the delay, the traffic was unexpectedly heavy this morning.', ar: 'آسف على التأخير، كان الازدحام المروري شديداً بشكل غير متوقع هذا الصباح.' },
  { category: 'المحادثات اليومية', en: 'That sounds like a wonderful idea, let us give it a try.', ar: 'تبدو فكرة رائعة، دعنا نجربها.' },
  { category: 'المحادثات اليومية', en: 'Could you please repeat that last sentence once more?', ar: 'هل يمكنك تكرار هذه الجملة الأخيرة مرة أخرى من فضلك؟' },
  { category: 'المحادثات اليومية', en: 'Take your time and let me know whenever you are ready.', ar: 'خذ وقتك وأخبرني متى كنت مستعداً.' },
  { category: 'المحادثات اليومية', en: 'I could not agree with you more on this important matter.', ar: 'أتفق معك تماماً في هذا الأمر المهم.' },
  { category: 'المحادثات اليومية', en: 'Would you like a cup of tea or coffee before we start?', ar: 'هل تود كوباً من الشاي أم القهوة قبل أن نبدأ؟' },
  { category: 'المحادثات اليومية', en: 'Please feel free to ask me anytime you need clarification.', ar: 'لا تتردد في سؤالي في أي وقت تحتاج فيه إلى توضيح.' },

  // الدراسة والامتحانات
  { category: 'الدراسة والامتحانات', en: 'Consistent daily revision is the real secret behind high exam grades.', ar: 'المراجعة اليومية المنتظمة هي السر الحقيقي وراء الدرجات العالية في الامتحان.' },
  { category: 'الدراسة والامتحانات', en: 'Understanding the core concept is always better than blind memorization.', ar: 'فهم الفكرة الأساسية أفضل دائماً من الحفظ الأعمى.' },
  { category: 'الدراسة والامتحانات', en: 'Read every single question twice before choosing your final answer.', ar: 'اقرأ كل سؤال مرتين قبل اختيار إجابتك النهائية.' },
  { category: 'الدراسة والامتحانات', en: 'Solving past exam papers builds confidence and improves time management.', ar: 'حل امتحانات السنوات السابقة يبني الثقة ويحسّن إدارة الوقت.' },
  { category: 'الدراسة والامتحانات', en: 'Summarize each lesson in your own words to lock it into memory.', ar: 'لخّص كل درس بأسلوبك الخاص لتثبيته في ذاكرتك.' },
  { category: 'الدراسة والامتحانات', en: 'Do not compare your progress to anyone else; focus on your daily growth.', ar: 'لا تقارن تقدمك بأي شخص آخر؛ ركز على تطورك اليومي.' },
  { category: 'الدراسة والامتحانات', en: 'Keep a special notebook for common mistakes and tricky questions.', ar: 'احتفظ بدفتر خاص للأخطاء الشائعة والأسئلة ذات الأفكار الخدّاعة.' },
  { category: 'الدراسة والامتحانات', en: 'Short focused breaks between study sessions refresh your concentration.', ar: 'فترات الراحة القصيرة المركزة بين حصص المذاكرة تنعش تركيزك.' },
  { category: 'الدراسة والامتحانات', en: 'Start with the hardest subject when your mind is fresh in the morning.', ar: 'ابدأ بأصعب مادة عندما يكون ذهنك صافياً في الصباح.' },
  { category: 'الدراسة والامتحانات', en: 'Success in high school depends on discipline, patience, and smart planning.', ar: 'النجاح في الثانوية العامة يعتمد على الانضباط والصبر والتخطيط الذكي.' },
  { category: 'الدراسة والامتحانات', en: 'Never leave today’s backlog until the final week before exams.', ar: 'لا تؤجل تراكمات اليوم إلى الأسبوع الأخير قبل الامتحانات.' },
  { category: 'الدراسة والامتحانات', en: 'Asking good questions during lessons shows deep curiosity and active learning.', ar: 'طرح الأسئلة الجيدة أثناء الدروس يدل على الفضول العميق والتعلم النشط.' },

  // كتابة المقال والترجمة
  { category: 'كتابة المقال والترجمة', en: 'Education is the cornerstone upon which modern nations build their prosperity.', ar: 'التعليم هو حجر الزاوية الذي تبني عليه الأمم الحديثة ازدهارها.' },
  { category: 'كتابة المقال والترجمة', en: 'On the one hand, technology saves time; on the other hand, it requires careful regulation.', ar: 'من ناحية، توفر التكنولوجيا الوقت؛ ومن ناحية أخرى، تتطلب تنظيماً دقيقاً.' },
  { category: 'كتابة المقال والترجمة', en: 'Youth represent the driving force behind social reform and economic growth.', ar: 'يمثل الشباب القوة الدافعة وراء الإصلاح الاجتماعي والنمو الاقتصادي.' },
  { category: 'كتابة المقال والترجمة', en: 'Protecting the environment is a shared responsibility between governments and citizens.', ar: 'حماية البيئة مسؤولية مشتركة بين الحكومات والمواطنين.' },
  { category: 'كتابة المقال والترجمة', en: 'Scientific research plays a vital role in solving global health and energy crises.', ar: 'يلعب البحث العلمي دوراً حيوياً في حل أزمات الصحة والطاقة العالمية.' },
  { category: 'كتابة المقال والترجمة', en: 'In conclusion, investing in human skills yields the highest long-term return.', ar: 'وفي الختام، فإن الاستثمار في مهارات الإنسان يحقق أعلى عائد على المدى الطويل.' },
  { category: 'كتابة المقال والترجمة', en: 'No one can deny that cultural tourism strengthens mutual respect among peoples.', ar: 'لا يمكن لأحد أن ينكر أن السياحة الثقافية تعزز الاحترام المتبادل بين الشعوب.' },
  { category: 'كتابة المقال والترجمة', en: 'Media literacy helps young people distinguish reliable facts from misleading rumors.', ar: 'الوعي الإعلامي يساعد الشباب على التمييز بين الحقائق الموثوقة والشائعات المضللة.' },
  { category: 'كتابة المقال والترجمة', en: 'Voluntary work instills a sense of belonging and solidarity within local communities.', ar: 'العمل التطوعي يغرس شعوراً بالانتماء والتضامن داخل المجتمعات المحلية.' },
  { category: 'كتابة المقال والترجمة', en: 'Sustainable development aims to meet present needs without compromising future generations.', ar: 'تهدف التنمية المستدامة إلى تلبية احتياجات الحاضر دون المساس بحقوق الأجيال القادمة.' },

  // القواعد في السياق
  { category: 'القواعد في السياق', en: 'If I had known about the schedule change, I would have arrived earlier.', ar: 'لو كنت قد علمت بتغيير الجدول، لكنت وصلت مبكراً.' },
  { category: 'القواعد في السياق', en: 'She has been studying English literature since she entered secondary school.', ar: 'هي تدرس الأدب الإنجليزي منذ أن دخلت المرحلة الثانوية.' },
  { category: 'القواعد في السياق', en: 'By the time the train arrived, the passengers had already bought their tickets.', ar: 'بحلول وقت وصول القطار، كان الركاب قد اشتروا تذاكرهم بالفعل.' },
  { category: 'القواعد في السياق', en: 'The scientific report must be reviewed carefully before it is published online.', ar: 'يجب مراجعة التقرير العلمي بعناية قبل نشره عبر الإنترنت.' },
  { category: 'القواعد في السياق', en: 'Neither the teacher nor the students were absent from yesterday’s seminar.', ar: 'لم يغب لا المعلم ولا الطلاب عن ندوة الأمس.' },
  { category: 'القواعد في السياق', en: 'He used to wake up late, but now he is used to starting his day at dawn.', ar: 'اعتاد أن يستيقظ متأخراً، لكنه الآن معتاد على بدء يومه عند الفجر.' },
  { category: 'القواعد في السياق', en: 'Having finished all his assignments, Omar went out for an evening walk.', ar: 'بعد أن أنهى جميع واجباته، خرج عمر في نزهة مسائية.' },
  { category: 'القواعد في السياق', en: 'The more you practice speaking English, the more fluent and confident you become.', ar: 'كلما مارست التحدث بالإنجليزية أكثر، أصبحت أكثر طلاقة وثقة.' },
  { category: 'القواعد في السياق', en: 'I wish I had spent more time reviewing grammar rules last semester.', ar: 'ليتني قضيت وقتاً أطول في مراجعة قواعد النحو الفصل الماضي.' },
  { category: 'القواعد في السياق', en: 'Not only did she win first prize, but she also inspired her entire class.', ar: 'لم تفز بالجائزة الأولى فحسب، بل ألهمت فصلها بأكمله أيضاً.' },

  // العلم والتكنولوجيا
  { category: 'العلم والتكنولوجيا', en: 'Artificial intelligence is transforming healthcare diagnostics and personalized learning.', ar: 'يحوّل الذكاء الاصطناعي التشخيص الطبي والتعلم الشخصي المخصص.' },
  { category: 'العلم والتكنولوجيا', en: 'Renewable solar and wind energy can dramatically reduce carbon emissions.', ar: 'يمكن للطاقة المتجددة الشمسية والرياحية أن تقلل انبعاثات الكربون بشكل كبير.' },
  { category: 'العلم والتكنولوجيا', en: 'Space exploration has given humanity satellite navigation and weather forecasting.', ar: 'منح استكشاف الفضاء البشرية الملاحة عبر الأقمار الصناعية والتنبؤ بالطقس.' },
  { category: 'العلم والتكنولوجيا', en: 'Cybersecurity is essential to protect personal privacy and banking systems.', ar: 'الأمن السيبراني ضروري لحماية الخصوصية الشخصية والأنظمة المصرفية.' },
  { category: 'العلم والتكنولوجيا', en: 'Modern vaccines have saved millions of lives from dangerous infectious diseases.', ar: 'أنقذت اللقاحات الحديثة ملايين الأرواح من الأمراض المعدية الخطيرة.' },
  { category: 'العلم والتكنولوجيا', en: 'Every great scientific breakthrough started with a curious mind asking why.', ar: 'بدأ كل إنجاز علمي عظيم بعقل فضولي يسأل لماذا.' },

  // العمل والمستقبل
  { category: 'العمل والمستقبل', en: 'Continuous learning is the key to staying competitive in the modern job market.', ar: 'التعلم المستمر هو المفتاح للبقاء منافساً في سوق العمل الحديث.' },
  { category: 'العمل والمستقبل', en: 'Effective teamwork achieves far more than isolated individual effort.', ar: 'العمل الجماعي الفعّال يحقق أكثر بكثير من الجهد الفردي المنعزل.' },
  { category: 'العمل والمستقبل', en: 'Set clear measurable goals and track your weekly progress honestly.', ar: 'ضع أهدافاً واضحة قابلة للقياس وتابع تقدمك الأسبوعي بصدق.' },
  { category: 'العمل والمستقبل', en: 'Communication skills are just as important as technical qualifications.', ar: 'مهارات التواصل لا تقل أهمية عن المؤهلات التقنية.' },
  { category: 'العمل والمستقبل', en: 'True leaders empower others to discover their hidden strengths.', ar: 'القادة الحقيقيون يمكّنون الآخرين من اكتشاف نقاط قوتهم الخفية.' },

  // الصحة والحياة
  { category: 'الصحة والحياة', en: 'Drinking enough water throughout the day boosts both focus and physical energy.', ar: 'شرب كمية كافية من الماء طوال اليوم يعزز التركيز والطاقة البدنية معاً.' },
  { category: 'الصحة والحياة', en: 'Getting seven to eight hours of quality sleep repairs the brain and improves memory.', ar: 'الحصول على سبع إلى ثماني ساعات من النوم الجيد يجدد الدماغ ويحسّن الذاكرة.' },
  { category: 'الصحة والحياة', en: 'Regular morning exercise reduces daily stress and strengthens the heart.', ar: 'ممارسة الرياضة الصباحية بانتظام تقلل التوتر اليومي وتقوي القلب.' },
  { category: 'الصحة والحياة', en: 'A balanced diet rich in vegetables, proteins, and fruits supports immunity.', ar: 'النظام الغذائي المتوازن الغني بالخضروات والبروتينات والفواكه يدعم المناعة.' },

  // تعبيرات وأمثال شائعة
  { category: 'تعبيرات وأمثال شائعة', en: 'Actions speak louder than words when true character is tested.', ar: 'الأفعال أبلغ من الأقوال عندما تُختبر الشخصية الحقيقية.' },
  { category: 'تعبيرات وأمثال شائعة', en: 'Where there is a strong will, there is always a practical way.', ar: 'حيثما توجد إرادة قوية، توجد دائماً طريقة عملية.' },
  { category: 'تعبيرات وأمثال شائعة', en: 'Do not put off until tomorrow what you can accomplish today.', ar: 'لا تؤجل إلى الغد ما يمكنك إنجازه اليوم.' },
  { category: 'تعبيرات وأمثال شائعة', en: 'Every cloud has a silver lining, even during the hardest challenges.', ar: 'مع كل محنة منحة، حتى في أصعب التحديات.' },
  { category: 'تعبيرات وأمثال شائعة', en: 'Practice makes perfect if you stay patient and keep improving.', ar: 'الممارسة تصنع الإتقان إذا تحليت بالصبر وواصلت التحسن.' },
  { category: 'تعبيرات وأمثال شائعة', en: 'Better late than never, as long as you start with determination.', ar: 'أن تصل متأخراً خير من ألا تصل أبداً، ما دمت تبدأ بعزيمة.' },
  { category: 'تعبيرات وأمثال شائعة', en: 'A journey of a thousand miles begins with a single courageous step.', ar: 'رحلة الألف ميل تبدأ بخطوة واحدة شجاعة.' },
  { category: 'تعبيرات وأمثال شائعة', en: 'Knowledge is power only when it is applied with wisdom and ethics.', ar: 'المعرفة قوة فقط عندما تُطبق بحكمة وأخلاق.' },
];

interface MatrixFrame {
  category: string;
  leads: Array<{ en: string; ar: string }>;
  actions: Array<{ en: string; ar: string }>;
  contexts: Array<{ en: string; ar: string }>;
}

const MATRIX_FRAMES: MatrixFrame[] = [
  // 1. المحادثات اليومية (~640 combos)
  {
    category: 'المحادثات اليومية',
    leads: [
      { en: 'Could you please', ar: 'هل يمكنك من فضلك أن' },
      { en: 'Would you mind taking a moment to', ar: 'هل تمانع في تخصيص لحظة لكي' },
      { en: 'When you have a minute, could you', ar: 'عندما تجد دقيقة فراغ، هل يمكنك أن' },
      { en: 'Before we close today, please', ar: 'قبل أن ننهي يومنا، يرجى أن' },
      { en: 'Do you think you could', ar: 'هل تظن أنه يمكنك أن' },
      { en: 'I would appreciate it if you could', ar: 'سأكون ممتناً لو استطعت أن' },
      { en: 'Whenever possible, could you', ar: 'متى أمكن ذلك، هل يمكنك أن' },
      { en: 'It would help us a lot if you could', ar: 'سيساعدنا كثيراً لو استطعت أن' },
    ],
    actions: [
      { en: 'share the updated details', ar: 'تشارك التفاصيل المحدّثة' },
      { en: 'confirm our appointment time', ar: 'تؤكد موعد لقائنا' },
      { en: 'explain the main instructions', ar: 'تشرح التعليمات الأساسية' },
      { en: 'check the delivery address', ar: 'تتحقق من عنوان التوصيل' },
      { en: 'send the required documents', ar: 'ترسل المستندات المطلوبة' },
      { en: 'arrange a quiet meeting', ar: 'ترتّب اجتماعاً هادئاً' },
      { en: 'review the travel route', ar: 'تراجع مسار الرحلة' },
      { en: 'double-check the ticket price', ar: 'تتأكد مرة أخرى من سعر التذكرة' },
      { en: 'recommend a reliable place', ar: 'ترشح مكاناً موثوقاً' },
      { en: 'answer a quick question', ar: 'تجيب عن سؤال سريع' },
    ],
    contexts: [
      { en: 'before the end of the day.', ar: 'قبل نهاية اليوم.' },
      { en: 'as soon as you have free time.', ar: 'بمجرد أن يتوفر لديك وقت فراغ.' },
      { en: 'so we can avoid any confusion.', ar: 'حتى نتجنب أي التباس.' },
      { en: 'before everyone arrives at the hall.', ar: 'قبل أن يصل الجميع إلى القاعة.' },
      { en: 'if your schedule allows it today.', ar: 'إذا سمح جدولك بذلك اليوم.' },
      { en: 'for our upcoming family trip.', ar: 'لرحلتنا العائلية القادمة.' },
      { en: 'without causing any extra delay.', ar: 'دون التسبب في أي تأخير إضافي.' },
      { en: 'to make everything crystal clear.', ar: 'لجعل كل شيء واضحاً تماماً.' },
    ],
  },
  // 2. الدراسة والامتحانات (~640 combos)
  {
    category: 'الدراسة والامتحانات',
    leads: [
      { en: 'As an ambitious student, you should try to', ar: 'بصفتك طالباً طموحاً، ينبغي أن تحاول أن' },
      { en: 'During exam preparation, you need to', ar: 'أثناء الاستعداد للامتحان، تحتاج إلى أن' },
      { en: 'A smart study routine helps you', ar: 'يساعدك روتين المذاكرة الذكي على أن' },
      { en: 'In your daily revision, remember to', ar: 'في مراجعتك اليومية، تذكّر أن' },
      { en: 'Before solving practice tests, make sure to', ar: 'قبل حل الاختبارات التدريبية، احرص على أن' },
      { en: 'To overcome exam stress, learn to', ar: 'للتغلب على توتر الامتحان، تعلّم أن' },
      { en: 'When facing a tough chapter, start to', ar: 'عند مواجهة فصل صعب، ابدأ بأن' },
      { en: 'To boost long-term retention, continue to', ar: 'لتعزيز التثبيت طويل المدى، استمر في أن' },
    ],
    actions: [
      { en: 'organize core definitions clearly', ar: 'تنظم التعريفات الأساسية بوضوح' },
      { en: 'practice new vocabulary in context', ar: 'تتدرب على المفردات الجديدة في سياقها' },
      { en: 'analyze every mistake patiently', ar: 'تحلل كل خطأ بصبر' },
      { en: 'connect scientific ideas logically', ar: 'تربط الأفكار العلمية منطقياً' },
      { en: 'summarize key rules on one sheet', ar: 'تلخص القواعد الرئيسية في ورقة واحدة' },
      { en: 'solve timed questions regularly', ar: 'تحل أسئلة مؤقتة بانتظام' },
      { en: 'check tricky grammar exceptions', ar: 'تراجع استثناءات القواعد المخادعة' },
      { en: 'listen carefully to pronunciation', ar: 'تستمع جيداً إلى النطق الصحيح' },
      { en: 'review difficult formulas every morning', ar: 'تراجع القوانين الصعبة كل صباح' },
      { en: 'compare similar concepts side by side', ar: 'تقارن المفاهيم المتشابهة جنباً إلى جنب' },
    ],
    contexts: [
      { en: 'with calm focus and steady confidence.', ar: 'بتركيز هادئ وثقة ثابتة.' },
      { en: 'instead of rushing before midnight.', ar: 'بدلاً من الاستعجال قبل منتصف الليل.' },
      { en: 'for at least thirty minutes daily.', ar: 'لمدة ثلاثين دقيقة على الأقل يومياً.' },
      { en: 'so complex topics become remarkably easy.', ar: 'لتصبح الموضوعات المعقدة سهلة للغاية.' },
      { en: 'under realistic exam conditions.', ar: 'تحت ظروف امتحان واقعية.' },
      { en: 'to secure top marks effortlessly.', ar: 'لضمان أعلى الدرجات بسلاسة.' },
      { en: 'alongside your weekly study plan.', ar: 'إلى جانب خطتك الدراسية الأسبوعية.' },
      { en: 'step by step without feeling overwhelmed.', ar: 'خطوة بخطوة دون الشعور بالإرهاق.' },
    ],
  },
  // 3. كتابة المقال والترجمة (~640 combos - uses Arabic masdar after prepositions for 100% agreement)
  {
    category: 'كتابة المقال والترجمة',
    leads: [
      { en: 'Modern societies strongly emphasize', ar: 'تؤكد المجتمعات الحديثة بشدة على' },
      { en: 'Responsible citizens work together toward', ar: 'يتعاون المواطنون المسؤولون من أجل' },
      { en: 'National development plans aim at', ar: 'تهدف خطط التنمية الوطنية إلى' },
      { en: 'Educators and parents agree on the importance of', ar: 'يتفق التربويون والآباء على أهمية' },
      { en: 'International cooperation accelerates', ar: 'يسرّع التعاون الدولي من' },
      { en: 'Constructive media campaigns support', ar: 'تدعم الحملات الإعلامية البنّاءة' },
      { en: 'Long-term economic stability depends on', ar: 'يعتمد الاستقرار الاقتصادي طويل المدى على' },
      { en: 'Public institutions are dedicated to', ar: 'تلتزم المؤسسات العامة بالعمل على' },
    ],
    actions: [
      { en: 'promoting lifelong education and training', ar: 'تعزيز التعليم والتدريب مدى الحياة' },
      { en: 'protecting natural resources and biodiversity', ar: 'حماية الموارد الطبيعية والتنوع الحيوي' },
      { en: 'encouraging youth innovation and entrepreneurship', ar: 'تشجيع ابتكار الشباب وريادة الأعمال' },
      { en: 'raising public awareness about climate change', ar: 'رفع الوعي العام حول تغير المناخ' },
      { en: 'improving healthcare quality in rural areas', ar: 'تحسين جودة الرعاية الصحية في المناطق الريفية' },
      { en: 'strengthening cultural heritage and tourism', ar: 'تقوية التراث الثقافي والسياحة' },
      { en: 'combating misinformation with verified facts', ar: 'مكافحة المعلومات المضللة بالحقائق الموثقة' },
      { en: 'expanding equal opportunities for all talents', ar: 'توسيع تكافؤ الفرص لجميع المواهب' },
      { en: 'supporting small local industries sustainably', ar: 'دعم الصناعات المحلية الصغيرة بشكل مستدام' },
      { en: 'building safer and greener smart cities', ar: 'بناء مدن ذكية أكثر أماناً وخضرة' },
    ],
    contexts: [
      { en: 'for the benefit of future generations.', ar: 'لصالح الأجيال القادمة.' },
      { en: 'in order to achieve lasting prosperity.', ar: 'من أجل تحقيق ازدهار دائم.' },
      { en: 'across both urban and rural communities.', ar: 'عبر المجتمعات الحضرية والريفية معاً.' },
      { en: 'while preserving core moral values.', ar: 'مع الحفاظ على القيم الأخلاقية الأساسية.' },
      { en: 'in a rapidly changing global world.', ar: 'في عالم عالمي سريع التغير.' },
      { en: 'through transparent policies and hard work.', ar: 'من خلال سياسات شفافة وعمل جاد.' },
      { en: 'as a practical foundation for progress.', ar: 'كأساس عملي للتقدم.' },
      { en: 'to bridge the gap between theory and practice.', ar: 'لسد الفجوة بين النظرية والتطبيق.' },
    ],
  },
  // 4. القواعد في السياق (~640 combos)
  {
    category: 'القواعد في السياق',
    leads: [
      { en: 'If the team follows the instructions carefully,', ar: 'إذا اتبع الفريق التعليمات بعناية،' },
      { en: 'As soon as the professor explains the rule,', ar: 'بمجرد أن يشرح الأستاذ القاعدة،' },
      { en: 'Even though the task looks challenging at first,', ar: 'على الرغم من أن المهمة تبدو صعبة في البداية،' },
      { en: 'Whenever you encounter an unfamiliar expression,', ar: 'كلما صادفت تعبيراً غير مألوف،' },
      { en: 'Provided that everyone submits the form on time,', ar: 'بشرط أن يقدم الجميع الاستمارة في الوقت المحدد،' },
      { en: 'Before the final decision is officially announced,', ar: 'قبل أن يُعلن القرار النهائي رسمياً،' },
      { en: 'Unless we manage our study hours wisely,', ar: 'ما لم نُدِر ساعات مذاكرتنا بحكمة،' },
      { en: 'Because the experiment was conducted accurately,', ar: 'لأن التجربة أُجريت بدقة،' },
    ],
    actions: [
      { en: 'the results will be much clearer', ar: 'ستكون النتائج أكثر وضوحاً بكثير' },
      { en: 'every participant can gain valuable experience', ar: 'يمكن لكل مشارك اكتساب خبرة قيمة' },
      { en: 'the whole project will finish ahead of schedule', ar: 'سينتهي المشروع بأكمله قبل الموعد المحدد' },
      { en: 'students will avoid repeating common errors', ar: 'سيتجنب الطلاب تكرار الأخطاء الشائعة' },
      { en: 'the committee should review all written reports', ar: 'ينبغي للجنة مراجعة جميع التقارير المكتوبة' },
      { en: 'the solution becomes surprisingly straightforward', ar: 'يصبح الحل مباشراً بشكل مدهش' },
      { en: 'you will notice rapid progress in fluency', ar: 'ستلاحظ تقدماً سريعاً في الطلاقة' },
      { en: 'our goals can easily turn into reality', ar: 'يمكن لأهدافنا أن تتحول بسهولة إلى واقع' },
      { en: 'new opportunities are likely to appear', ar: 'من المرجح أن تظهر فرص جديدة' },
      { en: 'the final essay deserves a higher score', ar: 'يستحق المقال النهائي درجة أعلى' },
    ],
    contexts: [
      { en: 'than anyone initially expected.', ar: 'مما توقعه أي شخص في البداية.' },
      { en: 'which makes everyone feel truly proud.', ar: 'مما يجعل الجميع يشعر بالفخر حقاً.' },
      { en: 'without needing any last-minute rush.', ar: 'دون الحاجة إلى أي استعجال في اللحظة الأخيرة.' },
      { en: 'as long as patience remains high.', ar: 'طالما ظل الصبر مرتفعاً.' },
      { en: 'thanks to clear grammatical structure.', ar: 'بفضل البناء النحوي الواضح.' },
      { en: 'according to the supervisor’s guidelines.', ar: 'وفقاً لإرشادات المشرف.' },
      { en: 'during the second half of the term.', ar: 'خلال النصف الثاني من الفصل الدراسي.' },
      { en: 'whenever proper context is respected.', ar: 'كلما تم احترام السياق الصحيح.' },
    ],
  },
  // 5. العلم والتكنولوجيا (~640 combos - uses Arabic masdar nouns for flawless agreement)
  {
    category: 'العلم والتكنولوجيا',
    leads: [
      { en: 'Modern researchers are investing heavily in', ar: 'يستثمر الباحثون الحديثون بقوة في' },
      { en: 'Advances in artificial intelligence facilitate', ar: 'تسهّل التطورات في الذكاء الاصطناعي عملية' },
      { en: 'Clean renewable technologies accelerate', ar: 'تسرّع التقنيات النظيفة المتجددة من' },
      { en: 'High-resolution satellites greatly improve', ar: 'تحسّن الأقمار الصناعية عالية الدقة بشكل كبير من' },
      { en: 'Biomedical laboratories focus daily on', ar: 'تركز المختبرات الطبية الحيوية يومياً على' },
      { en: 'Digital cloud platforms simplify', ar: 'تبسّط المنصات السحابية الرقمية عملية' },
      { en: 'Modern robotics systems assist engineers in', ar: 'تساعد أنظمة الروبوتات الحديثة المهندسين في' },
      { en: 'Data scientists apply smart algorithms for', ar: 'يطبق علماء البيانات خوارزميات ذكية من أجل' },
    ],
    actions: [
      { en: 'detecting early signs of complex diseases', ar: 'رصد العلامات المبكرة للأمراض المعقدة' },
      { en: 'reducing energy waste in factories', ar: 'تقليل هدر الطاقة في المصانع' },
      { en: 'monitoring weather patterns and sea levels', ar: 'مراقبة أنماط الطقس ومستويات البحار' },
      { en: 'designing faster and safer electric vehicles', ar: 'تصميم مركبات كهربائية أسرع وأكثر أماناً' },
      { en: 'protecting sensitive networks from cyber attacks', ar: 'حماية الشبكات الحساسة من الهجمات السيبرانية' },
      { en: 'delivering interactive lessons to remote villages', ar: 'توصيل الدروس التفاعلية إلى القرى البعيدة' },
      { en: 'desalinating seawater at lower cost', ar: 'تحلية مياه البحر بتكلفة أقل' },
      { en: 'simulating chemical reactions accurately', ar: 'محاكاة التفاعلات الكيميائية بدقة' },
      { en: 'automating repetitive warehouse operations', ar: 'أتمتة عمليات المستودعات المتكررة' },
      { en: 'translating scientific papers across languages', ar: 'ترجمة الأوراق العلمية عبر اللغات' },
    ],
    contexts: [
      { en: 'with remarkable speed and precision.', ar: 'بسرعة ودقة لافتتين.' },
      { en: 'while keeping human safety as a priority.', ar: 'مع إبقاء سلامة الإنسان أولوية.' },
      { en: 'across global research universities.', ar: 'عبر الجامعات البحثية العالمية.' },
      { en: 'to build a cleaner sustainable planet.', ar: 'لبناء كوكب أنظف ومستدام.' },
      { en: 'saving both time and natural resources.', ar: 'مما يوفر الوقت والموارد الطبيعية معاً.' },
      { en: 'in ways that seemed impossible ten years ago.', ar: 'بطرق بدت مستحيلة قبل عشر سنوات.' },
      { en: 'under strict ethical standards.', ar: 'تحت معايير أخلاقية صارمة.' },
      { en: 'for millions of users worldwide.', ar: 'لملايين المستخدمين حول العالم.' },
    ],
  },
  // 6. العمل والمستقبل (~640 combos - 2nd person throughout)
  {
    category: 'العمل والمستقبل',
    leads: [
      { en: 'As an ambitious young professional, always strive to', ar: 'بصفتك شاباً طموحاً، اسعَ دائماً إلى أن' },
      { en: 'To stand out in job interviews, learn how to', ar: 'لتتميز في مقابلات العمل، تعلّم كيف' },
      { en: 'Experienced mentors always advise you to', ar: 'ينصحك المرشدون ذوو الخبرة دائماً بأن' },
      { en: 'Building a successful career requires you to', ar: 'يتطلب بناء مسيرة مهنية ناجحة منك أن' },
      { en: 'Global remote companies expect you to', ar: 'تتوقع الشركات العالمية عن بُعد منك أن' },
      { en: 'Before launching any business project, you must', ar: 'قبل إطلاق أي مشروع عمل، يجب عليك أن' },
      { en: 'Effective team leaders encourage you to', ar: 'يشجعك قادة الفرق الفعالون على أن' },
      { en: 'To earn clients’ lasting trust, always aim to', ar: 'لكسب ثقة العملاء الدائمة، اسعَ دائماً إلى أن' },
    ],
    actions: [
      { en: 'communicate ideas clearly and politely', ar: 'توصل الأفكار بوضوح ولباقة' },
      { en: 'deliver high-quality work before deadlines', ar: 'تسلّم عملاً عالي الجودة قبل المواعيد النهائية' },
      { en: 'upgrade practical skills every quarter', ar: 'تطوّر المهارات العملية كل ربع سنة' },
      { en: 'solve unexpected problems creatively', ar: 'تحل المشكلات غير المتوقعة بإبداع' },
      { en: 'collaborate smoothly with diverse colleagues', ar: 'تتعاون بسلاسة مع زملاء متنوعين' },
      { en: 'write professional emails without mistakes', ar: 'تكتب رسائل بريد مهنية خالية من الأخطاء' },
      { en: 'adapt quickly to changing market trends', ar: 'تتكيف بسرعة مع تغيرات السوق' },
      { en: 'prioritize important tasks over distractions', ar: 'تمنح الأولوية للمهام المهمة على المشتتات' },
      { en: 'negotiate fair terms with confidence', ar: 'تتفاوض على شروط عادلة بثقة' },
      { en: 'accept constructive feedback gracefully', ar: 'تتقبل النقد البناء برحابة صدر' },
    ],
    contexts: [
      { en: 'throughout every stage of your career.', ar: 'خلال كل مرحلة من مسيرتك المهنية.' },
      { en: 'even under tight daily pressure.', ar: 'حتى تحت الضغط اليومي الشديد.' },
      { en: 'with honesty, respect, and dedication.', ar: 'بصدق واحترام وتفانٍ.' },
      { en: 'to unlock international career opportunities.', ar: 'لفتح فرص مهنية دولية.' },
      { en: 'while maintaining healthy work-life balance.', ar: 'مع الحفاظ على توازن صحي بين العمل والحياة.' },
      { en: 'and turn obstacles into stepping stones.', ar: 'وتحويل العقبات إلى درجات للنجاح.' },
      { en: 'which strengthens long-term professional reputation.', ar: 'مما يقوي السمعة المهنية طويلة المدى.' },
      { en: 'step by step toward real leadership.', ar: 'خطوة بخطوة نحو القيادة الحقيقية.' },
    ],
  },
  // 7. الصحة والحياة (~640 combos - 2nd person throughout)
  {
    category: 'الصحة والحياة',
    leads: [
      { en: 'Doctors frequently advise you to', ar: 'ينصحك الأطباء كثيراً بأن' },
      { en: 'To protect mental peace and focus, remember to', ar: 'لحماية صفاء الذهن والتركيز، تذكّر أن' },
      { en: 'A healthy morning routine encourages you to', ar: 'يشجعك الروتين الصباحي الصحي على أن' },
      { en: 'For stronger immunity and stamina, try to', ar: 'لمناعة أقوى وقدرة تحمل أعلى، حاول أن' },
      { en: 'Instead of staying up all night, choose to', ar: 'بدلاً من السهر طوال الليل، اختر أن' },
      { en: 'Sports coaches always remind you to', ar: 'يذكّرك مدربو الرياضة دائماً بأن' },
      { en: 'A balanced lifestyle teaches you to', ar: 'يعلّمك نمط الحياة المتوازن أن' },
      { en: 'When feeling tired or stressed, pause to', ar: 'عندما تشعر بالتعب أو التوتر، توقف قليلاً لكي' },
    ],
    actions: [
      { en: 'drink fresh water before reaching for coffee', ar: 'تشرب ماءً نقياً قبل اللجوء إلى القهوة' },
      { en: 'eat natural fruits and leafy vegetables', ar: 'تتناول الفواكه الطبيعية والخضروات الورقية' },
      { en: 'walk outdoors for twenty minutes', ar: 'تمشي في الهواء الطلق لمدة عشرين دقيقة' },
      { en: 'stretch gently after sitting at a desk', ar: 'تتمدد بلطف بعد الجلوس على المكتب' },
      { en: 'breathe deeply and clear anxious thoughts', ar: 'تتنفس بعمق وتصفي الأفكار القلقة' },
      { en: 'avoid heavy fast food late at night', ar: 'تتجنب الوجبات السريعة الدسمة ليلاً' },
      { en: 'keep electronic screens away before sleep', ar: 'تبعد الشاشات الإلكترونية قبل النوم' },
      { en: 'maintain good posture while reading', ar: 'تحافظ على استقامة ظهرك أثناء القراءة' },
      { en: 'enjoy sunlight briefly every morning', ar: 'تستمتع بأشعة الشمس قليلاً كل صباح' },
      { en: 'express gratitude for small daily blessings', ar: 'تعبر عن الامتنان للنعم اليومية الصغيرة' },
    ],
    contexts: [
      { en: 'every single day without fail.', ar: 'كل يوم دون انقطاع.' },
      { en: 'to feel energized from morning till night.', ar: 'لتشعر بالنشاط من الصباح حتى المساء.' },
      { en: 'because prevention is always better than cure.', ar: 'لأن الوقاية خير من العلاج دائماً.' },
      { en: 'which refreshes both body and mind.', ar: 'مما ينعش الجسد والعقل معاً.' },
      { en: 'so your memory performs at its peak.', ar: 'ليعمل دماغك وذاكرتك بأقصى كفاءة.' },
      { en: 'for a happier and calmer life.', ar: 'من أجل حياة أسعد وأهدأ.' },
      { en: 'alongside regular physical activity.', ar: 'إلى جانب النشاط البدني المنتظم.' },
      { en: 'to recover naturally after tough days.', ar: 'للتعافي بشكل طبيعي بعد الأيام الشاقة.' },
    ],
  },
  // 8. تعبيرات وأمثال شائعة (~640 combos - 2nd person throughout)
  {
    category: 'تعبيرات وأمثال شائعة',
    leads: [
      { en: 'Wise mentors often tell you it is better to', ar: 'يخبرك الحكماء غالباً أنه من الأفضل لك أن' },
      { en: 'Life experience teaches you to', ar: 'تعلّمك تجربة الحياة أن' },
      { en: 'True wisdom reminds you never to hesitate to', ar: 'تذكّرك الحكمة الحقيقية ألا تتردد أبداً في أن' },
      { en: 'In moments of doubt, take heart and', ar: 'في لحظات الشك، تشجّع و' },
      { en: 'No matter how difficult things get, choose to', ar: 'مهما اشتدت الصعوبات، اختر أن' },
      { en: 'One golden rule reminds you to', ar: 'تذكّرك قاعدة ذهبية واحدة بأن' },
      { en: 'Good daily habits train you to', ar: 'تدرّبك العادات اليومية الطيبة على أن' },
      { en: 'Always keep your head up and continue to', ar: 'ارفع رأسك دائماً واستمر في أن' },
    ],
    actions: [
      { en: 'think twice before making promises', ar: 'تفكر مرتين قبل قطع الوعود' },
      { en: 'turn past failures into valuable lessons', ar: 'تحول إخفاقات الماضي إلى دروس قيمة' },
      { en: 'stay humble during moments of victory', ar: 'تظل متواضعاً في لحظات الانتصار' },
      { en: 'help others silently without expecting praise', ar: 'تساعد الآخرين بصمت دون انتظار ثناء' },
      { en: 'value true friends who stand by you', ar: 'تقدّر الأصدقاء الأوفياء الذين يقفون بجانبك' },
      { en: 'keep learning something useful every week', ar: 'تواصل تعلم شيء مفيد كل أسبوع' },
      { en: 'respect time as your most precious asset', ar: 'تحترم الوقت باعتباره أثمن ما تملك' },
      { en: 'speak gently even when you strongly disagree', ar: 'تتحدث بلطف حتى عندما تختلف بشدة' },
      { en: 'focus on solutions instead of blaming luck', ar: 'تركز على الحلول بدلاً من لوم الحظ' },
      { en: 'plant seeds of kindness wherever you go', ar: 'تزرع بذور اللطف أينما ذهبت' },
    ],
    contexts: [
      { en: 'because character defines destiny.', ar: 'لأن الأخلاق والشخصية تصنعان المصير.' },
      { en: 'and good results will follow naturally.', ar: 'وستتبعك النتائج الطيبة بشكل طبيعي.' },
      { en: 'since hard work never goes unnoticed.', ar: 'إذ إن العمل الجاد لا يضيع أبداً.' },
      { en: 'even when nobody else is watching.', ar: 'حتى عندما لا يراقبك أحد.' },
      { en: 'for peace of mind outweighs fleeting fame.', ar: 'لأن راحة البال تفوق الشهرة العابرة.' },
      { en: 'until your quiet efforts bear fruit.', ar: 'حتى تؤتي جهودك الصامتة ثمارها.' },
      { en: 'as patience always rewards the persistent.', ar: 'فالصبر يكافئ المثابرين دائماً.' },
      { en: 'to leave a positive mark behind you.', ar: 'لتترك أثراً إيجابياً خلفك.' },
    ],
  },
];

function buildAllSentences(): ImportantSentenceEntry[] {
  const seenEn = new Set<string>();
  const results: ImportantSentenceEntry[] = [];

  // 1. Add core golden sentences first
  for (const seed of CORE_GOLDEN_SENTENCES) {
    const cleanEn = seed.en.trim();
    const key = cleanEn.toLowerCase();
    if (!seenEn.has(key)) {
      seenEn.add(key);
      results.push({
        id: `sent-${results.length + 1}`,
        index: results.length + 1,
        category: seed.category,
        en: cleanEn,
        arPronunciation: generateSentenceArabicPronunciation(cleanEn),
        ar: seed.ar.trim(),
      });
    }
  }

  // 2. Round-robin interleave across the 8 thematic frames so browsing/searching sees rich diversity on page 1..200
  const TARGET_TOTAL = 5000;
  const frameCursors = MATRIX_FRAMES.map((frame) => {
    const combos: Array<{ category: string; en: string; ar: string }> = [];
    for (let cIdx = 0; cIdx < frame.contexts.length; cIdx++) {
      for (let aIdx = 0; aIdx < frame.actions.length; aIdx++) {
        for (let lIdx = 0; lIdx < frame.leads.length; lIdx++) {
          const lead = frame.leads[lIdx];
          const act = frame.actions[aIdx];
          const ctx = frame.contexts[cIdx];
          const en = `${lead.en} ${act.en} ${ctx.en}`.replace(/\s+/g, ' ').trim();
          const ar = `${lead.ar} ${act.ar} ${ctx.ar}`.replace(/\s+/g, ' ').trim();
          combos.push({ category: frame.category, en, ar });
        }
      }
    }
    return { combos, ptr: 0 };
  });

  let addedInRound = true;
  while (results.length < TARGET_TOTAL && addedInRound) {
    addedInRound = false;
    for (const cursor of frameCursors) {
      if (results.length >= TARGET_TOTAL) break;
      while (cursor.ptr < cursor.combos.length) {
        const item = cursor.combos[cursor.ptr++];
        const key = item.en.toLowerCase();
        if (!seenEn.has(key)) {
          seenEn.add(key);
          results.push({
            id: `sent-${results.length + 1}`,
            index: results.length + 1,
            category: item.category,
            en: item.en,
            arPronunciation: generateSentenceArabicPronunciation(item.en),
            ar: item.ar,
          });
          addedInRound = true;
          break;
        }
      }
    }
  }

  return results;
}

export const ALL_IMPORTANT_SENTENCES: ImportantSentenceEntry[] = buildAllSentences();
