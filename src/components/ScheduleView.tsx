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

    // 7. Study Sessions with real Curriculum lessons!
    const daySubject1 = activeSubjects[selectedDayIndex % activeSubjects.length];
    const daySubject2 = activeSubjects[(selectedDayIndex + 2) % activeSubjects.length];
    const daySubject3 = activeSubjects[(selectedDayIndex + 4) % activeSubjects.length];

    const lesson1 =
      daySubject1.chapters[0]?.lessons.find((l) => !l.isCompleted)?.title ||
      daySubject1.chapters[0]?.lessons[0]?.title ||
      'مراجعة وحل تدريبات الباب الأول';

    const lesson2 =
      daySubject2.chapters[0]?.lessons.find((l) => !l.isCompleted)?.title ||
      daySubject2.chapters[0]?.lessons[0]?.title ||
      'حل مسائل وأفكار امتحانات';

    const sessionObj1: StudySession = {
      id: `auto-${selectedDayIndex}-1`,
      subjectId: daySubject1.id,
      subjectName: daySubject1.name,
      lessonTitle: `${daySubject1.chapters[0]?.title || ''}: ${lesson1}`,
      startTime: '16:00',
      durationMinutes: 50,
      isCompleted: false,
    };

    timeline.push({
      time: '4:00 م - 4:50 م',
      title: `جلسة مذاكرة 1: ${daySubject1.name}`,
      type: 'study',
      desc: `الدرس: ${sessionObj1.lessonTitle}`,
      session: sessionObj1,
    });

    timeline.push({
      time: '4:50 م - 5:05 م',
      title: 'استراحة تركيز 15 دقيقة (فاكهة + ماء + إطالة ظهر)',
      type: 'break',
      desc: 'ممنوع فتح السوشيال ميديا حتى لا يتشتت الانتباه.',
    });

    const sessionObj2: StudySession = {
      id: `auto-${selectedDayIndex}-2`,
      subjectId: daySubject2.id,
      subjectName: daySubject2.name,
      lessonTitle: `${daySubject2.chapters[0]?.title || ''}: ${lesson2}`,
      startTime: '17:05',
      durationMinutes: 50,
      isCompleted: false,
    };

    timeline.push({
      time: '5:05 م - 5:55 م',
      title: `جلسة مذاكرة 2: ${daySubject2.name}`,
      type: 'study',
      desc: `الدرس: ${sessionObj2.lessonTitle}`,
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
      id: `auto-${selectedDayIndex}-3`,
      subjectId: daySubject3.id,
      subjectName: daySubject3.name,
      lessonTitle: `تصفية المتراكم وحل بنك الأسئلة في ${daySubject3.name}`,
      startTime: '18:40',
      durationMinutes: 45,
      isCompleted: false,
    };

    timeline.push({
      time: '6:40 م - 7:25 م',
      title: `جلسة مذاكرة 3 (المتراكم وتدريبات): ${daySubject3.name}`,
      type: 'study',
      desc: `الهدف: ${sessionObj3.lessonTitle}`,
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
      <div className="bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2D5A43]/10 text-[#2D5A43] rounded-full text-xs font-bold mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>محرك الجدول اليومي الذكي</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#1E2922]">جدول يومك الكامل بدون عشوائية</h2>
          <p className="text-xs text-[#6F7D72]">
            يبني يومك دقيقة بدقيقة: صلاة → فطار → تمارين → جلسات بأسماء الدروس → استراحات → نوم
          </p>
        </div>

        {/* Navigation Modes */}
        <div className="flex bg-[#F2EFE9] p-1 rounded-xl self-start md:self-center">
          <button
            onClick={() => setActiveTab('auto')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'auto'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'text-[#4B594E] hover:text-[#1E2922]'
            }`}
          >
            الجدول التلقائي المتوازن
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'custom'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'text-[#4B594E] hover:text-[#1E2922]'
            }`}
          >
            صمّم جدولك بنفسك
          </button>
          <button
            onClick={() => setActiveTab('weights')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === 'weights'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'text-[#4B594E] hover:text-[#1E2922]'
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
            className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition-all border ${
              selectedDayIndex === idx
                ? 'bg-[#2D5A43] text-white border-[#2D5A43] shadow-xs'
                : 'bg-white text-[#4B594E] border-[#E2DDD3] hover:border-[#2D5A43]/30'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Mode 1: Automated Smart Day Timeline */}
      {activeTab === 'auto' && (
        <div className="space-y-4">
          {/* Day parameters toggle */}
          <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#2D5A43]/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-[#1E2922]">
                <input
                  type="checkbox"
                  checked={isSchoolDay}
                  onChange={(e) => setIsSchoolDay(e.target.checked)}
                  className="rounded text-[#2D5A43] focus:ring-0 w-4 h-4"
                />
                <span>يوم دراسي / سناتر (تفريغ وقت الصباح)</span>
              </label>
            </div>

            <div className="flex items-center gap-4 text-[#4B594E]">
              <span className="flex items-center gap-1.5 font-bold">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>الاستيقاظ: {convert24To12(wakeUpTime)}</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <Moon className="w-4 h-4 text-indigo-500" />
                <span>النوم: {convert24To12(bedTime)}</span>
              </span>
            </div>
          </div>

          {/* Timeline Cards */}
          <div className="space-y-3 relative before:absolute before:top-4 before:bottom-4 before:right-6 before:w-0.5 before:bg-[#2D5A43]/15">
            {timelineItems.map((item, idx) => {
              const isStudy = item.type === 'study';
              const isPrayer = item.type === 'prayer';
              const isMeal = item.type === 'meal';

              return (
                <div
                  key={idx}
                  className={`relative pr-12 p-4 rounded-2xl border transition-all ${
                    isStudy
                      ? 'bg-white border-[#2D5A43]/30 shadow-xs ring-1 ring-[#2D5A43]/10'
                      : isPrayer
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : isMeal
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-[#FAF9F6] border-[#E8E4DC]'
                  }`}
                >
                  {/* Timeline bullet dot */}
                  <div
                    className={`absolute right-4.5 top-5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                      isStudy
                        ? 'bg-[#2D5A43] ring-4 ring-[#2D5A43]/20'
                        : isPrayer
                        ? 'bg-emerald-600'
                        : isMeal
                        ? 'bg-amber-600'
                        : 'bg-gray-400'
                    }`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs font-bold text-[#8C7A52]" dir="ltr">
                          {item.time}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded font-bold ${
                            isStudy
                              ? 'bg-[#2D5A43] text-white'
                              : isPrayer
                              ? 'bg-emerald-100 text-emerald-800'
                              : isMeal
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
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
                      <h4 className="font-extrabold text-sm text-[#1E2922]">{item.title}</h4>
                      <p className="text-xs text-[#5D6B60] mt-0.5">{item.desc}</p>
                    </div>

                    {item.session && (
                      <button
                        onClick={() => onStartSession(item.session!)}
                        className="px-3.5 py-2 bg-[#2D5A43] hover:bg-[#234734] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-center shrink-0"
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
          <div className="bg-[#FAF9F5] border border-[#2D5A43]/20 rounded-2xl p-4 text-xs text-[#334638]">
            <p className="font-bold text-sm text-[#2D5A43] mb-1">
              صمّم جدول يومك المخصص — ليوم {DAYS[selectedDayIndex]}
            </p>
            أضف جلساتك الخاصة بالمادة والدرس ووقت البداية. الصلوات والوجبات والنوم يتولاهم التطبيق تلقائياً حول جلساتك!
          </div>

          {/* Form to Add Custom Session */}
          <form
            onSubmit={handleAddCustomSession}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-[#2D5A43]/20 shadow-xs space-y-3"
          >
            <h4 className="text-xs font-black text-[#1E2922] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#2D5A43]" />
              <span>إضافة جلسة استذكار جديدة في هذا اليوم</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#4B594E] mb-1">المادة</label>
                <select
                  value={newCustomSubjectId}
                  onChange={(e) => setNewCustomSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#D5CFC3] rounded-lg font-bold text-[#1E2922]"
                >
                  {curriculum.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4B594E] mb-1">اسم الدرس أو الموضوع</label>
                <input
                  type="text"
                  value={newCustomLesson}
                  onChange={(e) => setNewCustomLesson(e.target.value)}
                  placeholder="مثال: الباب الثاني - التحليل الحجمي"
                  required
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#D5CFC3] rounded-lg focus:border-[#2D5A43] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4B594E] mb-1">وقت البدء (ساعة:دقيقة)</label>
                <input
                  type="time"
                  value={newCustomTime}
                  onChange={(e) => setNewCustomTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F5] border border-[#D5CFC3] rounded-lg focus:border-[#2D5A43] focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4B594E] mb-1">المدة (بالدقائق)</label>
                <select
                  value={newCustomDuration}
                  onChange={(e) => setNewCustomDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#D5CFC3] rounded-lg font-bold"
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
              className="py-2.5 px-5 bg-[#2D5A43] hover:bg-[#234734] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إدراج الجلسة في الجدول</span>
            </button>
          </form>

          {/* List of Custom Sessions */}
          <div className="space-y-3">
            {(customDays[selectedDayIndex] || []).length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-[#DDD6C9] text-center">
                <BookOpen className="w-8 h-8 text-[#A0AFA3] mx-auto mb-2" />
                <p className="text-xs font-bold text-[#556458]">
                  لا توجد جلسات مخصصة مضافة ليوم {DAYS[selectedDayIndex]} بعد.
                </p>
                <p className="text-[11px] text-[#8A988D] mt-1">
                  استخدم النموذج أعلاه لإضافة جلساتك أو ارجع للجدول التلقائي.
                </p>
              </div>
            ) : (
              (customDays[selectedDayIndex] || []).map((session) => (
                <div
                  key={session.id}
                  className="bg-white p-4 rounded-2xl border border-[#2D5A43]/20 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-10 rounded-xl bg-[#2D5A43]/10 text-[#2D5A43] flex items-center justify-center font-bold text-xs shrink-0" dir="ltr">
                      {convert24To12(session.startTime)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-black text-[#2D5A43]">
                          {session.subjectName}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 bg-[#FAF8F5] border border-[#E0D9CC] rounded font-bold text-[#6F7D72]">
                          {session.durationMinutes} دقيقة
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#1E2922]">{session.lessonTitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStartSession(session)}
                      className="px-3 py-1.5 bg-[#2D5A43] hover:bg-[#234734] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>ابدأ</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCustomSession(session.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
        <div className="bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-[#1E2922] mb-1">
              تحديد ساعات المذاكرة الأسبوعية لكل مادة
            </h3>
            <p className="text-xs text-[#6F7D72]">
              يستخدم المحرك هذه الأوزان لتوزيع أوقات الجلسات تلقائياً عبر أيام الأسبوع بحسب ثقل كل مادة لديك.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {curriculum.map((subj) => {
              const currentHours = weeklyHours[subj.id] ?? subj.weeklyTargetHours;
              return (
                <div
                  key={subj.id}
                  className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E4DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: subj.color }}
                    />
                    <div>
                      <span className="font-bold text-xs text-[#1E2922] block">{subj.name}</span>
                      <span className="text-[11px] text-[#7A8A7E]">
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
                      className="w-32 accent-[#2D5A43]"
                    />
                    <span className="font-black text-xs text-[#2D5A43] min-w-[70px] text-left" dir="ltr">
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
