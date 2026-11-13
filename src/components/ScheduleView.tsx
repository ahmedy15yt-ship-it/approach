import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Play,
  Plus,
  Trash2,
  Sliders,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Coffee,
  CheckCircle2,
  Settings,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
} from 'lucide-react';
import { Subject, StudySession, DaySchedule } from '../types';
import { PrayerTime, convert24To12 } from '../data/prayer';

interface ScheduleViewProps {
  curriculum: Subject[];
  prayers: PrayerTime[];
  onStartSession: (session: StudySession) => void;
  weeklyHours: Record<string, number>;
  onUpdateWeeklyHours: (subjectId: string, hours: number) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  curriculum,
  prayers,
  onStartSession,
  weeklyHours,
  onUpdateWeeklyHours,
}) => {
  const [activeTab, setActiveTab] = useState<'auto' | 'custom' | 'weights'>('auto');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isSchoolDay, setIsSchoolDay] = useState(true);
  const [wakeUpTime, setWakeUpTime] = useState('05:30');
  const [bedTime, setBedTime] = useState('23:00');

  // Weekly rotation state (User Request: كل أسبوع يتغير قسم الجدول التلقائي المتوازن)
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    const saved = localStorage.getItem('nahj_selected_week');
    if (saved) return Number(saved);
    const now = new Date();
    // Default current week in the Egyptian Thanaweya calendar (approx week 24 in mid-year)
    return 1;
  });

  const handleSelectWeek = (w: number) => {
    const safeW = Math.max(1, Math.min(30, w));
    setSelectedWeek(safeW);
    localStorage.setItem('nahj_selected_week', String(safeW));
  };

  const getWeeklyFocusTheme = (weekNum: number) => {
    const themes = [
      { week: 1, title: 'الانطلاقة وبناء العادات', focus: 'التأسيس القوي للفصول الأولى وحل أفكار كتاب الوزارة الأساسية' },
      { week: 2, title: 'التعمق وتثبيت المفاهيم', focus: 'التنسيق الهرموني، الاتزان الكيميائي، والتأثير المغناطيسي' },
      { week: 3, title: 'الحل المكثف وبنوك الأسئلة', focus: 'التكاثر في الكائنات الحية، الكيمياء الكهربية، والحث الكهرومغناطيسي' },
      { week: 4, title: 'الربط بين الأبواب والمفاهيم المركبة', focus: 'المناعة، الكيمياء العضوية الممتعة، ودوائر التيار المتردد' },
      { week: 5, title: 'البيولوجيا الجزيئية والفيزياء الحديثة', focus: 'DNA و RNA والفيزياء الحديثة والجيولوجيا التاريخية' },
      { week: 6, title: 'المراجعة الأسبوعية الشاملة وحل الامتحانات', focus: 'امتحانات شاملة على نصف المنهج وتصفية أي متراكم قديم' },
    ];
    return themes[(weekNum - 1) % themes.length];
  };

  const currentWeekTheme = getWeeklyFocusTheme(selectedWeek);

  const DAYS = [
    'السبت',
    'الأحد',
    'الاثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة (إجازة ومراجعة)',
  ];

  // Custom schedule state for each day
  const [customDays, setCustomDays] = useState<Record<number, StudySession[]>>({
    0: [
      {
        id: 'cs-1',
        subjectId: 'biology',
        subjectName: 'الأحياء',
        lessonTitle: 'الباب الأول: الدعامة في النبات والحركة في الإنسان',
        startTime: '16:00',
        durationMinutes: 45,
        isCompleted: false,
      },
      {
        id: 'cs-2',
        subjectId: 'chemistry',
        subjectName: 'الكيمياء',
        lessonTitle: 'الباب الأول: خواص فلز الحديد والأكاسيد والتحويلات',
        startTime: '17:30',
        durationMinutes: 45,
        isCompleted: false,
      },
    ],
    1: [
      {
        id: 'cs-3',
        subjectId: 'physics',
        subjectName: 'الفيزياء',
        lessonTitle: 'الفصل الأول: المقاومة الكهربية وقوانين كيرشوف',
        startTime: '16:00',
        durationMinutes: 50,
        isCompleted: false,
      },
      {
        id: 'cs-4',
        subjectId: 'arabic',
        subjectName: 'اللغة العربية',
        lessonTitle: 'النحو: إعمال اسم الفاعل والمفعول وصيغ المبالغة',
        startTime: '17:45',
        durationMinutes: 40,
        isCompleted: false,
      },
    ],
  });

  // Custom session form state
  const [newCustomSubjectId, setNewCustomSubjectId] = useState(curriculum[0].id);
  const [newCustomLesson, setNewCustomLesson] = useState('');
  const [newCustomTime, setNewCustomTime] = useState('18:00');
  const [newCustomDuration, setNewCustomDuration] = useState(45);

  // Generate automated full day timeline
  const generateDailyTimeline = () => {
    // Pick active subjects based on weights & current day index
    const activeSubjects = [...curriculum].sort((a, b) => {
      const hA = weeklyHours[a.id] ?? a.weeklyTargetHours;
      const hB = weeklyHours[b.id] ?? b.weeklyTargetHours;
      return hB - hA;
    });

    const timeline: Array<{
      time: string;
      title: string;
      type: 'prayer' | 'meal' | 'exercise' | 'school' | 'study' | 'sleep' | 'break';
      desc: string;
      session?: StudySession;
    }> = [];

    // 1. Wakeup & Fajr
    const fajrTime = prayers.find((p) => p.key === 'fajr')?.time || '5:00 ص';
    timeline.push({
      time: fajrTime,
      title: 'استيقاظ وصلاة الفجر وأذكار الصباح',
      type: 'prayer',
      desc: 'بداية اليوم المبارك، بركة البكور واستحضار النية لله.',
    });

    // 2. Breakfast & Routine
    timeline.push({
      time: '5:40 ص',
      title: 'فطور الدماغ + شرب كوبي ماء',
      type: 'meal',
      desc: 'فول بزيت حار وبيض مسلوق لإمداد المخ بالكولين وأوميجا 3 وجلوكوز مستقر.',
    });

    // 3. Quick Workout
    timeline.push({
      time: '6:10 ص',
      title: 'تمارين 7 دقائق تنشيط الدورة الدموية',
      type: 'exercise',
      desc: 'قرفصاء الطاولة وإطالة الرقبة لضخ الأكسجين إلى الفص الجبهي.',
    });

    // 4. School / Classes Block
    if (isSchoolDay && selectedDayIndex !== 6) {
      timeline.push({
        time: '7:30 ص - 2:00 م',
        title: 'المدرسة / السناتر والدروس الخصوصية',
        type: 'school',
        desc: 'حضور وتركيز مع المعلمين وتدوين الملاحظات والتركات.',
      });
    }

    // 5. Dhuhr Prayer & Lunch
    const dhuhrTime = prayers.find((p) => p.key === 'dhuhr')?.time || '12:00 م';
    timeline.push({
      time: dhuhrTime,
      title: `صلاة الظهر (${dhuhrTime}) وغداء خفيف واستراحة قيلولة 20 دقيقة`,
      type: 'prayer',
      desc: 'إعادة شحن الطاقة العصبية بدون سكر ثقيل.',
    });

    // 6. Asr Prayer
    const asrTime = prayers.find((p) => p.key === 'asr')?.time || '3:15 م';
    timeline.push({
      time: asrTime,
      title: `صلاة العصر (${asrTime}) وتجهيز المكتب`,
      type: 'prayer',
      desc: 'وضوء منعش، كوب ماء، وتحديد أهداف جلسات المساء.',
    });

    // 7. Study Sessions with dynamic Weekly Rotation!
    const weekShift = (selectedWeek - 1) * 2;
    const daySubject1 = activeSubjects[(selectedDayIndex + weekShift) % activeSubjects.length];
    const daySubject2 = activeSubjects[(selectedDayIndex + weekShift + 2) % activeSubjects.length];
    const daySubject3 = activeSubjects[(selectedDayIndex + weekShift + 4) % activeSubjects.length];

    const getProgressionForSubject = (subj: Subject, sessionIndex: number) => {
      const chapterCount = subj.chapters.length || 1;
      const chIndex = (selectedWeek - 1 + sessionIndex) % chapterCount;
      const chapter = subj.chapters[chIndex] || subj.chapters[0];
      const lesson =
        chapter?.lessons.find((l) => !l.isCompleted)?.title ||
        chapter?.lessons[(selectedWeek - 1) % (chapter?.lessons.length || 1)]?.title ||
        'مراجعة شاملة وحل بنك أسئلة الوزارة';
      return {
        chapterTitle: chapter?.title || 'الباب العام',
        lessonTitle: lesson,
      };
    };

    const s1Info = getProgressionForSubject(daySubject1, 0);
    const s2Info = getProgressionForSubject(daySubject2, 1);
    const s3Info = getProgressionForSubject(daySubject3, 2);

    const sessionObj1: StudySession = {
      id: `auto-w${selectedWeek}-d${selectedDayIndex}-1`,
      subjectId: daySubject1.id,
      subjectName: daySubject1.name,
      lessonTitle: `${s1Info.chapterTitle}: ${s1Info.lessonTitle}`,
      startTime: '16:00',
      durationMinutes: 50,
      isCompleted: false,
    };

    timeline.push({
      time: '4:00 م - 4:50 م',
      title: `جلسة مذاكرة 1: ${daySubject1.name}`,
      type: 'study',
      desc: `الدرس (الأسبوع ${selectedWeek}): ${sessionObj1.lessonTitle}`,
      session: sessionObj1,
    });

    timeline.push({
      time: '4:50 م - 5:05 م',
      title: 'استراحة تركيز 15 دقيقة (فاكهة + ماء + إطالة ظهر)',
      type: 'break',
      desc: 'ممنوع فتح السوشيال ميديا حتى لا يتشتت الانتباه.',
    });

    const sessionObj2: StudySession = {
      id: `auto-w${selectedWeek}-d${selectedDayIndex}-2`,
      subjectId: daySubject2.id,
      subjectName: daySubject2.name,
      lessonTitle: `${s2Info.chapterTitle}: ${s2Info.lessonTitle}`,
      startTime: '17:05',
      durationMinutes: 50,
      isCompleted: false,
    };

    timeline.push({
      time: '5:05 م - 5:55 م',
      title: `جلسة مذاكرة 2: ${daySubject2.name}`,
      type: 'study',
      desc: `الدرس (الأسبوع ${selectedWeek}): ${sessionObj2.lessonTitle}`,
      session: sessionObj2,
    });

    // 8. Maghrib Prayer
    const maghribTime = prayers.find((p) => p.key === 'maghrib')?.time || '6:00 م';
    timeline.push({
      time: maghribTime,
      title: `صلاة المغرب (${maghribTime}) وسناك مكسرات/فول سوداني`,
      type: 'prayer',
      desc: 'راحة ذهنية وتثبيت ما تم استيعابه.',
    });

    // 9. Study Session 3 (or Backlog session)
    const sessionObj3: StudySession = {
      id: `auto-w${selectedWeek}-d${selectedDayIndex}-3`,
      subjectId: daySubject3.id,
      subjectName: daySubject3.name,
      lessonTitle: `تصفية المتراكم وحل بنك الأسئلة في ${daySubject3.name} (${s3Info.chapterTitle})`,
      startTime: '18:40',
      durationMinutes: 45,
      isCompleted: false,
    };

    timeline.push({
      time: '6:40 م - 7:25 م',
      title: `جلسة مذاكرة 3 (المتراكم وتدريبات): ${daySubject3.name}`,
      type: 'study',
      desc: `الهدف (الأسبوع ${selectedWeek}): ${sessionObj3.lessonTitle}`,
      session: sessionObj3,
    });

    // 10. Isha Prayer & Light Dinner
    const ishaTime = prayers.find((p) => p.key === 'isha')?.time || '7:30 م';
    timeline.push({
      time: ishaTime,
      title: `صلاة العشاء والشفع والوتر (${ishaTime}) + عشاء خفيف`,
      type: 'prayer',
      desc: 'جبنة قريش بزيت زيتون أو زبادي بالعسل لبروتين بطيء الامتصاص ونوم هادئ.',
    });

    // 11. Day wrap-up & sleep
    timeline.push({
      time: '9:30 م - 10:30 م',
      title: 'مراجعة خفيفة (قراءة كبسولات المنهج) + تدوين إنجاز اليوم',
      type: 'break',
      desc: 'كتابة شيء واحد نجحت فيه اليوم في دفتر الإنجاز اليومي وتجهيز جدول الغد.',
    });

    timeline.push({
      time: convert24To12(bedTime),
      title: 'نوم عميق وإيقاف الشاشات تماماً',
      type: 'sleep',
      desc: 'المخ يقوم بتخزين وتثبيت معلومات اليوم أثناء مراحل النوم العميق.',
    });

    return timeline;
  };

  const handleAddCustomSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomLesson.trim()) return;

    const subj = curriculum.find((s) => s.id === newCustomSubjectId) || curriculum[0];
    const newSession: StudySession = {
      id: `custom-${Date.now()}`,
      subjectId: subj.id,
      subjectName: subj.name,
      lessonTitle: newCustomLesson.trim(),
      startTime: newCustomTime,
      durationMinutes: Number(newCustomDuration),
      isCompleted: false,
    };

    const currentSessions = customDays[selectedDayIndex] || [];
    setCustomDays({
      ...customDays,
      [selectedDayIndex]: [...currentSessions, newSession],
    });

    setNewCustomLesson('');
  };

  const handleDeleteCustomSession = (sessionId: string) => {
    const currentSessions = customDays[selectedDayIndex] || [];
    setCustomDays({
      ...customDays,
      [selectedDayIndex]: currentSessions.filter((s) => s.id !== sessionId),
    });
  };

  const timelineItems = generateDailyTimeline();

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-red-900/40 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/50 text-[#DC2626] dark:text-red-400 rounded-full text-xs font-bold mb-1.5 border border-red-200/70 dark:border-red-900/40">
            <Calendar className="w-3.5 h-3.5" />
            <span>محرك الجدول اليومي الذكي</span>
          </div>
          <h2 className="text-xl font-extrabold text-zinc-950 dark:text-white">جدول يومك الكامل بدون عشوائية</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            يبني يومك دقيقة بدقيقة: صلاة → فطار → تمارين → جلسات بأسماء الدروس → استراحات → نوم
          </p>
        </div>

        {/* Navigation Modes */}
        <div className="flex bg-zinc-100 dark:bg-[#09090B] p-1 rounded-xl self-start md:self-center border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('auto')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'auto'
                ? 'bg-[#DC2626] text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            الجدول التلقائي المتوازن
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-[#DC2626] text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            صمّم جدولك بنفسك
          </button>
          <button
            onClick={() => setActiveTab('weights')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'weights'
                ? 'bg-[#DC2626] text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>أوزان الساعات</span>
          </button>
        </div>
      </div>

      {/* Day Selector (السبت إلى الجمعة) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {DAYS.map((day, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDayIndex(idx)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition-all border cursor-pointer ${
              selectedDayIndex === idx
                ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                : 'bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-red-400/50 dark:hover:border-red-500/40'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Mode 1: Automated Smart Day Timeline */}
      {activeTab === 'auto' && (
        <div className="space-y-4">
          {/* Weekly Dynamic Rotation Control */}
          <div className="bg-gradient-to-r from-red-50/90 via-white to-red-50/90 dark:from-red-950/35 dark:via-[#121215] dark:to-red-950/35 border-2 border-red-200 dark:border-red-900/50 rounded-2xl p-4 space-y-3 shadow-2xs transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-red-200/80 dark:border-red-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#DC2626] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  W{selectedWeek}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-zinc-950 dark:text-white">
                      الجدول التلقائي المتوازن — يتغير أسبوعياً
                    </span>
                    <span className="text-[10px] px-2 py-0.2 bg-amber-400 text-black font-extrabold rounded-full">
                      تدوير المواد وفصول المنهج
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
                    تتغير موضوعات ودروس المذاكرة آلياً كل أسبوع لتغطية أبواب المنهج بالتناوب بدون ملل
                  </span>
                </div>
              </div>

              {/* Week Navigation Controls */}
              <div className="flex items-center gap-1.5 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => handleSelectWeek(selectedWeek - 1)}
                  disabled={selectedWeek <= 1}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:border-[#DC2626] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>السابق</span>
                </button>

                <select
                  value={selectedWeek}
                  onChange={(e) => handleSelectWeek(Number(e.target.value))}
                  className="bg-white dark:bg-zinc-900 border border-[#DC2626] dark:border-red-500 rounded-xl px-2.5 py-1.5 text-xs font-black text-[#DC2626] dark:text-red-300 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 30 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      الأسبوع {i + 1} من 30
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleSelectWeek(selectedWeek + 1)}
                  disabled={selectedWeek >= 30}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:border-[#DC2626] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Weekly Focus Theme Banner */}
            <div className="bg-white/90 dark:bg-[#09090B]/90 rounded-xl p-3 border border-red-100 dark:border-red-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-extrabold text-zinc-950 dark:text-white">
                  محور الأسبوع {selectedWeek}: «{currentWeekTheme.title}»
                </span>
              </div>
              <span className="text-zinc-600 dark:text-zinc-300 text-[11px] font-medium">
                🎯 {currentWeekTheme.focus}
              </span>
            </div>
          </div>

          {/* Day parameters toggle */}
          <div className="bg-white dark:bg-[#121215] p-3.5 rounded-xl border border-zinc-200 dark:border-red-900/30 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-950 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={isSchoolDay}
                  onChange={(e) => setIsSchoolDay(e.target.checked)}
                  className="rounded accent-[#DC2626] focus:ring-0 w-4 h-4"
                />
                <span>يوم دراسي / سناتر (تفريغ وقت الصباح)</span>
              </label>
            </div>

            <div className="flex items-center gap-4 text-zinc-700 dark:text-zinc-400">
              <span className="flex items-center gap-1.5 font-bold">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>الاستيقاظ: {convert24To12(wakeUpTime)}</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <Moon className="w-4 h-4 text-red-400" />
                <span>النوم: {convert24To12(bedTime)}</span>
              </span>
            </div>
          </div>

          {/* Timeline Cards */}
          <div className="space-y-3 relative before:absolute before:top-4 before:bottom-4 before:right-6 before:w-0.5 before:bg-red-200 dark:before:bg-red-900/40">
            {timelineItems.map((item, idx) => {
              const isStudy = item.type === 'study';
              const isPrayer = item.type === 'prayer';
              const isMeal = item.type === 'meal';

              return (
                <div
                  key={idx}
                  className={`relative pr-12 p-4 rounded-2xl border transition-all ${
                    isStudy
                      ? 'bg-white dark:bg-[#121215] border-[#DC2626]/35 dark:border-red-700/50 shadow-xs ring-1 ring-[#DC2626]/10 dark:ring-red-500/10'
                      : isPrayer
                      ? 'bg-red-50/40 dark:bg-red-950/25 border-red-200 dark:border-red-900/40'
                      : isMeal
                      ? 'bg-amber-50/40 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/50'
                      : 'bg-zinc-50 dark:bg-[#0E0E11] border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {/* Timeline bullet dot */}
                  <div
                    className={`absolute right-4.5 top-5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#121215] shadow-xs ${
                      isStudy
                        ? 'bg-[#DC2626] dark:bg-red-500 ring-4 ring-[#DC2626]/20'
                        : isPrayer
                        ? 'bg-red-700 dark:bg-red-400'
                        : isMeal
                        ? 'bg-amber-600 dark:bg-amber-400'
                        : 'bg-zinc-400 dark:bg-zinc-600'
                    }`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs font-bold text-[#8C7A52] dark:text-amber-400" dir="ltr">
                          {item.time}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded font-bold ${
                            isStudy
                              ? 'bg-[#DC2626] text-white'
                              : isPrayer
                              ? 'bg-red-100 dark:bg-red-900/60 text-red-900 dark:text-red-200'
                              : isMeal
                              ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {item.type === 'study'
                            ? 'جلسة مذاكرة'
                            : item.type === 'prayer'
                            ? 'صلاة وروح'
                            : item.type === 'meal'
                            ? 'تغذية المخ'
                            : item.type === 'exercise'
                            ? 'تنشيط بدني'
                            : item.type === 'school'
                            ? 'مدرسة ودروس'
                            : 'راحة واستقرار'}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-zinc-950 dark:text-white">{item.title}</h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{item.desc}</p>
                    </div>

                    {item.session && (
                      <button
                        type="button"
                        onClick={() => onStartSession(item.session!)}
                        className="px-3.5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>ابدأ الجلسة (بومودورو)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 2: Custom Schedule Builder (صمّم جدولك بنفسك) */}
      {activeTab === 'custom' && (
        <div className="space-y-5">
          <div className="bg-zinc-50 dark:bg-[#121215] border border-red-200 dark:border-red-900/40 rounded-2xl p-4 text-xs text-zinc-800 dark:text-zinc-200">
            <p className="font-bold text-sm text-[#DC2626] dark:text-red-400 mb-1">
              صمّم جدول يومك المخصص — ليوم {DAYS[selectedDayIndex]}
            </p>
            أضف جلساتك الخاصة بالمادة والدرس ووقت البداية. الصلوات والوجبات والنوم يتولاهم التطبيق تلقائياً حول جلساتك!
          </div>

          {/* Form to Add Custom Session */}
          <form
            onSubmit={handleAddCustomSession}
            className="bg-white dark:bg-[#121215] p-4 sm:p-5 rounded-2xl border border-red-200/80 dark:border-red-900/40 shadow-xs space-y-3 transition-colors"
          >
            <h4 className="text-xs font-black text-zinc-950 dark:text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#DC2626] dark:text-red-400" />
              <span>إضافة جلسة استذكار جديدة في هذا اليوم</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">المادة</label>
                <select
                  value={newCustomSubjectId}
                  onChange={(e) => setNewCustomSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-lg font-bold text-zinc-950 dark:text-white"
                >
                  {curriculum.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">اسم الدرس أو الموضوع</label>
                <input
                  type="text"
                  value={newCustomLesson}
                  onChange={(e) => setNewCustomLesson(e.target.value)}
                  placeholder="مثال: الباب الثاني - التحليل الحجمي"
                  required
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-950 dark:text-white focus:border-[#DC2626] dark:focus:border-red-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">وقت البدء (ساعة:دقيقة)</label>
                <input
                  type="time"
                  value={newCustomTime}
                  onChange={(e) => setNewCustomTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-950 dark:text-white focus:border-[#DC2626] dark:focus:border-red-400 focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">المدة (بالدقائق)</label>
                <select
                  value={newCustomDuration}
                  onChange={(e) => setNewCustomDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-[#09090B] border border-zinc-300 dark:border-zinc-700 rounded-lg font-bold text-zinc-950 dark:text-white"
                >
                  <option value={25}>25 دقيقة (بومودورو قياسي)</option>
                  <option value={45}>45 دقيقة (جلسة متقدمة)</option>
                  <option value={60}>60 دقيقة (ساعة كاملة)</option>
                  <option value={90}>90 دقيقة (جلسة مراجعة شاملة)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إدراج الجلسة في الجدول</span>
            </button>
          </form>

          {/* List of Custom Sessions */}
          <div className="space-y-3">
            {(customDays[selectedDayIndex] || []).length === 0 ? (
              <div className="bg-white dark:bg-[#121215] p-8 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center transition-colors">
                <BookOpen className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  لا توجد جلسات مخصصة مضافة ليوم {DAYS[selectedDayIndex]} بعد.
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-1">
                  استخدم النموذج أعلاه لإضافة جلساتك أو ارجع للجدول التلقائي.
                </p>
              </div>
            ) : (
              (customDays[selectedDayIndex] || []).map((session) => (
                <div
                  key={session.id}
                  className="bg-white dark:bg-[#121215] p-4 rounded-2xl border border-red-200/80 dark:border-red-900/40 shadow-xs flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#DC2626] dark:text-red-400 flex items-center justify-center font-bold text-xs shrink-0" dir="ltr">
                      {convert24To12(session.startTime)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-black text-[#DC2626] dark:text-red-400">
                          {session.subjectName}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 bg-zinc-100 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded font-bold text-zinc-600 dark:text-zinc-400">
                          {session.durationMinutes} دقيقة
                        </span>
                      </div>
                      <p className="text-xs font-bold text-zinc-950 dark:text-white">{session.lessonTitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onStartSession(session)}
                      className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>ابدأ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomSession(session.id)}
                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="حذف الجلسة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Mode 3: Subject Weights Allocation */}
      {activeTab === 'weights' && (
        <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-red-900/40 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
          <div>
            <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white mb-1">
              تحديد ساعات المذاكرة الأسبوعية لكل مادة
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              يستخدم المحرك هذه الأوزان لتوزيع أوقات الجلسات تلقائياً عبر أيام الأسبوع بحسب ثقل كل مادة لديك.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {curriculum.map((subj) => {
              const currentHours = weeklyHours[subj.id] ?? subj.weeklyTargetHours;
              return (
                <div
                  key={subj.id}
                  className="bg-zinc-50 dark:bg-[#09090B] p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: subj.color }}
                    />
                    <div>
                      <span className="font-bold text-xs text-zinc-950 dark:text-white block">{subj.name}</span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {subj.chapters.length} أبواب • {subj.chapters.flatMap((c) => c.lessons).length} درس
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={currentHours}
                      onChange={(e) => onUpdateWeeklyHours(subj.id, Number(e.target.value))}
                      className="w-32 accent-[#DC2626]"
                    />
                    <span className="font-black text-xs text-[#DC2626] dark:text-red-400 min-w-[70px] text-left" dir="ltr">
                      {currentHours} ساعات/أسبوع
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
