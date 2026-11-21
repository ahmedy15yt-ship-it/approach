import { DailyTask, LeaderboardUser } from '../types';

export const TASK_CYCLE_MS = 24 * 60 * 60 * 1000; // تتجدد المهام الستة يومياً الساعة 4:00 صباحاً بتوقيت مصر

const FOUR_AM_MS = 4 * 60 * 60 * 1000;

interface EgyptTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getEgyptTimeParts(nowMs: number = Date.now()): EgyptTimeParts {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(nowMs));
    const lookup: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') {
        lookup[p.type] = Number(p.value);
      }
    }
    const rawHour = Number.isFinite(lookup.hour) ? lookup.hour : 0;
    return {
      year: lookup.year || new Date(nowMs).getUTCFullYear(),
      month: lookup.month || new Date(nowMs).getUTCMonth() + 1,
      day: lookup.day || new Date(nowMs).getUTCDate(),
      hour: rawHour === 24 ? 0 : rawHour,
      minute: Number.isFinite(lookup.minute) ? lookup.minute : 0,
      second: Number.isFinite(lookup.second) ? lookup.second : 0,
    };
  } catch {
    // Fallback to Egypt UTC+2 if Intl timezone database is unavailable
    const d = new Date(nowMs + 2 * 60 * 60 * 1000);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
    };
  }
}

export const TASK_CYCLE_POOLS: DailyTask[][] = [
  // الدورة الأولى
  [
    {
      id: 'c1-study',
      title: 'إتمام جلستي بومودورو مركزتين في المادة الأساسية (50 دقيقة تركيز تام)',
      category: 'study',
      xp: 50,
      isDone: false,
      targetCount: 2,
      currentCount: 0,
    },
    {
      id: 'c1-prayer',
      title: 'أداء الصلوات المكتوبة في مواقيتها + أذكار ما بعد الصلاة بتدبر',
      category: 'prayer',
      xp: 40,
      isDone: false,
      targetCount: 5,
      currentCount: 0,
    },
    {
      id: 'c1-water',
      title: 'شرب 8 أكواب ماء كاملة لتنشيط الموصلات العصبية ومنع الصداع',
      category: 'water',
      xp: 30,
      isDone: false,
      targetCount: 8,
      currentCount: 0,
    },
    {
      id: 'c1-backlog',
      title: 'إنهاء وتصفية "نصيب النهاردة" من قائمة الدروس المتراكمة',
      category: 'backlog',
      xp: 60,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
    {
      id: 'c1-exercise',
      title: 'تطبيق روتين الـ 7 دقائق (إطالة الرقبة والظهر + قرفصاء لضخ الدم للمخ)',
      category: 'exercise',
      xp: 35,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
    {
      id: 'c1-mindset',
      title: 'تدوين إنجاز الدورة في دفتر الإنجاز + قراءة كبسولة مراجعة سريعة',
      category: 'mindset',
      xp: 25,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
  ],
  // الدورة الثانية
  [
    {
      id: 'c2-study',
      title: 'حل 25 سؤال نظام حديث (اختيار من متعدد) مع تدوين أفكار الأسئلة الصعبة',
      category: 'study',
      xp: 55,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
    {
      id: 'c2-prayer',
      title: 'أداء الصلوات الخمس في وقتها + قراءة ورد القرآن اليومي (صفحتين على الأقل)',
      category: 'prayer',
      xp: 45,
      isDone: false,
      targetCount: 5,
      currentCount: 0,
    },
    {
      id: 'c2-water',
      title: 'شرب كوب ماء قبل كل جلسة مذاكرة لتقوية الذاكرة قصيرة المدى',
      category: 'water',
      xp: 30,
      isDone: false,
      targetCount: 8,
      currentCount: 0,
    },
    {
      id: 'c2-backlog',
      title: 'مراجعة وحل تطبيق عملي على أصعب درس مؤجل في الكيمياء أو الفيزياء',
      category: 'backlog',
      xp: 60,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
    {
      id: 'c2-exercise',
      title: 'مشي سريع أو تمرين تنفس 4-7-8 لتفريغ التوتر بين جلسات المذاكرة',
      category: 'exercise',
      xp: 35,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
    {
      id: 'c2-mindset',
      title: 'اختبار نفسك مع أستاذ نَهج في 3 أسئلة تفاعلية وتصحيح أي تركة خطأ',
      category: 'mindset',
      xp: 30,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
  ],
  // الدورة الثالثة
  [
    {
      id: 'c3-study',
      title: 'كتابة مذكرة أو ملخص قوانين/مقارنات في صفحة واحدة لأحد فصول المنهج',
      category: 'study',
      xp: 50,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
    {
      id: 'c3-prayer',
      title: 'المحافظة على صلاة الجماعة أو الصلاة في أول الوقت مع أذكار المذاكرة',
      category: 'prayer',
      xp: 40,
      isDone: false,
      targetCount: 5,
      currentCount: 0,
    },
    {
      id: 'c3-water',
      title: 'تجنب المشروبات الغازية واستبدالها بالماء أو كوب شاي أخضر/أعشاب',
      category: 'water',
      xp: 35,
      isDone: false,
      targetCount: 8,
      currentCount: 0,
    },
    {
      id: 'c3-backlog',
      title: 'إغلاق مسألة متراكمة كاملة أو مراجعة باب قديم في الأحياء أو الجيولوجيا',
      category: 'backlog',
      xp: 60,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
    {
      id: 'c3-exercise',
      title: 'تمارين إطالة العمود الفقري والكتفين لمنع آلام الجلوس على المكتب',
      category: 'exercise',
      xp: 35,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
    {
      id: 'c3-mindset',
      title: 'تطبيق ساعة كاملة بدون سوشيال ميديا أو تشتيت الهاتف (Focus Mode)',
      category: 'mindset',
      xp: 30,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
  ],
  // الدورة الرابعة
  [
    {
      id: 'c4-study',
      title: 'حل نموذج امتحان شامل بالوقت المحدد ومراجعة الإجابات النموذجية',
      category: 'study',
      xp: 60,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
    {
      id: 'c4-prayer',
      title: 'أداء الصلوات مع السنن الراتبة + الاستغفار والدعاء بالفتح والتوفيق',
      category: 'prayer',
      xp: 45,
      isDone: false,
      targetCount: 5,
      currentCount: 0,
    },
    {
      id: 'c4-water',
      title: 'إتمام هدف شرب الماء اليومي وتناول وجبة صحية خفيفة بدون دهون مهدرجة',
      category: 'water',
      xp: 30,
      isDone: false,
      targetCount: 8,
      currentCount: 0,
    },
    {
      id: 'c4-backlog',
      title: 'مراجعة "بنك الأخطاء" وإعادة حل 5 مسائل كنت أخطأت فيها سابقاً',
      category: 'backlog',
      xp: 55,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
    {
      id: 'c4-exercise',
      title: 'حركة نشطة لمدة 10 دقائق + تهوية الغرفة لاستنشاق أكسجين نقي',
      category: 'exercise',
      xp: 35,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
    {
      id: 'c4-mindset',
      title: 'ترتيب المكتب وتجهيز خطة أول درس للمذاكرة في الدورة القادمة',
      category: 'mindset',
      xp: 25,
      isDone: false,
      targetCount: 1,
      currentCount: 0,
    },
  ],
];

export const INITIAL_DAILY_TASKS: DailyTask[] = TASK_CYCLE_POOLS[0];

export function getCurrentTaskCycleIndex(nowMs: number = Date.now()): number {
  const egypt = getEgyptTimeParts(nowMs);
  const utcDayIndex = Math.floor(
    Date.UTC(egypt.year, egypt.month - 1, egypt.day) / TASK_CYCLE_MS
  );
  // Before 4:00 AM Egypt time, stay on yesterday's 4:00 AM cycle
  return egypt.hour < 4 ? utcDayIndex - 1 : utcDayIndex;
}

export function getTasksForCycle(cycleIndex: number): DailyTask[] {
  const len = TASK_CYCLE_POOLS.length;
  const poolIndex = ((cycleIndex % len) + len) % len;
  return TASK_CYCLE_POOLS[poolIndex].map((task) => ({
    ...task,
    isDone: false,
    currentCount: 0,
  }));
}

export function getTaskCycleRemainingMs(nowMs: number = Date.now()): number {
  const egypt = getEgyptTimeParts(nowMs);
  const msSinceMidnight =
    ((egypt.hour * 60 + egypt.minute) * 60 + egypt.second) * 1000 +
    (nowMs % 1000);
  if (msSinceMidnight < FOUR_AM_MS) {
    return FOUR_AM_MS - msSinceMidnight;
  }
  return TASK_CYCLE_MS - msSinceMidnight + FOUR_AM_MS;
}

export const INITIAL_LEADERBOARD: LeaderboardUser[] = [
  {
    rank: 1,
    name: 'مريم أحمد عبد الله',
    governorate: 'المنصورة (الدقهلية)',
    xp: 450,
    streak: 8,
    badge: 'طبيبة المستقبل 🩺',
  },
  {
    rank: 2,
    name: 'أحمد محمود السعيد',
    governorate: 'مدينة نصر (القاهرة)',
    xp: 380,
    streak: 6,
    badge: 'قاهر المتراكم ⚡',
  },
  {
    rank: 3,
    name: 'فاطمة إبراهيم الشناوي',
    governorate: 'طنطا (الغربية)',
    xp: 310,
    streak: 5,
    badge: 'صائدة الدرجات 🎯',
  },
  {
    rank: 4,
    name: 'يوسف شريف عزب',
    governorate: 'الإسكندرية',
    xp: 240,
    streak: 4,
    badge: 'عبقري الأحياء 🧬',
  },
  {
    rank: 5,
    name: 'نور الهدى مصطفى',
    governorate: 'أسيوط',
    xp: 180,
    streak: 3,
    badge: 'شعلة النشاط 🔥',
  },
  {
    rank: 6,
    name: 'عبد الرحمن خالد',
    governorate: 'الزقازيق (الشرقية)',
    xp: 120,
    streak: 2,
    badge: 'أسد الكيمياء 🧪',
  },
  {
    rank: 7,
    name: 'أنت (طالب نَهج)',
    governorate: 'القاهرة',
    xp: 0,
    streak: 0,
    badge: 'بداية الانطلاق 🚀',
    isCurrentUser: true,
  },
];
