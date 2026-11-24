import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Sparkles,
  Plus,
  Bot,
  Lightbulb,
  HelpCircle,
  FileText,
  Search,
  Filter,
  Download,
  Copy,
  Printer,
  Edit3,
  Trash2,
  Save,
  Check,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Subject, Lesson } from '../types';

interface RevisionNote {
  id: string;
  subjectId: string;
  subjectName: string;
  chapterTitle: string;
  lessonTitle: string;
  lawsAndFormulas: string;
  keyPoints: string[];
  examTraps: string;
  createdAt: string;
}

const INITIAL_REVISION_NOTES: RevisionNote[] = [
  {
    id: 'rn-1',
    subjectId: 'physics',
    subjectName: 'الفيزياء',
    chapterTitle: 'الفصل الأول: التيار الكهربي وقانون أوم وقوانين كيرشوف',
    lessonTitle: 'قوانين كيرشوف وحساب فروق الجهد والشدات',
    lawsAndFormulas: 'قانون كيرشوف الأول (حفظ الشحنة): Σ I_in = Σ I_out\nقانون كيرشوف الثاني (حفظ الطاقة): Σ V_B = Σ (I × R)\nمعادلة الدائرة المغلقة: V = V_B - (I × r)',
    keyPoints: [
      'حدد اتجاه مسار العروة الافتراضي (مع أو عكس عقارب الساعة) وثبّت الإشارات بدقة.',
      'إذا مر التيار في نفس اتجاه المسار الافتراضي يكون فرق الجهد موجباً (+ I R)، وإذا كان العكس يكون سالباً.',
      'قطب البطارية: الخروج من الموجب يعني (+ V_B)، والخروج من السالب يعني (- V_B).',
    ],
    examTraps: 'انتبه للمقاومة الداخلية للمصدر (r) ولا تهملها، وانتبه للنقاط المتصلة بالأرض (جهد الأرض = صفر).',
    createdAt: '2026-10-15',
  },
  {
    id: 'rn-2',
    subjectId: 'biology',
    subjectName: 'الأحياء',
    chapterTitle: 'الباب الأول: الدعامة والحركة في الكائنات الحية',
    lessonTitle: 'آلية انقباض العضلة الهيكلية (نظرية الخيوط المنزلقة لهكسلي)',
    lawsAndFormulas: 'القطعة العضلية (ساركومير) = المسافة بين خطين داكنين (Z).\nطول القطعة العضلية = طول المنطقة المضيئة I + طول المنطقة الداكنة A.\nأيونات Ca2+ تكشف مواقع الارتباط + ATP يفصل الروابط المستعرضة.',
    keyPoints: [
      'أثناء الانقباض التام: يقل طول المنطقة I، تختفي المنطقة شبه المضيئة H، ويظل طول المنطقة الداكنة A ثابتاً لا يتغير أبداً.',
      'يلزم ATP في مرحلتين: اتصال الروابط المستعرضة بالأكتين، وانفصالها لإتمام الانبساط.',
      'غياب ATP يسبب الشد العضلي المؤلم والمستمر لعدم انفصال الروابط المستعرضة.',
    ],
    examTraps: 'المنطقة A طولها ثابت دائماً لأن طول خيوط الميوسين لا يتغير! التغير يحدث فقط في المسافة بين خطوط Z.',
    createdAt: '2026-10-20',
  },
  {
    id: 'rn-3',
    subjectId: 'chemistry',
    subjectName: 'الكيمياء',
    chapterTitle: 'الباب الأول: العناصر الانتقالية وخامات الحديد',
    lessonTitle: 'تحويلات وتفاعلات أكاسيد الحديد الثلاثة (FeO, Fe3O4, Fe2O3)',
    lawsAndFormulas: 'Fe + H2SO4 (مخفف) → FeSO4 + H2 (غاز يشتعل بفرقعة)\nFe + H2SO4 (مركز ساخن) → FeSO4 + Fe2(SO4)3 + SO2 + H2O\nFe2O3 + 3CO (عند 400-700°C) → 2FeO + 3CO2',
    keyPoints: [
      'حمض النيتريك المركز يسبب خمولاً كيميائياً للحديد بسبب تكون طبقة غير مسامية من الأكسيد تزال بالحك أو HCl مخفف.',
      'أكسيد الحديد الأسود (المغناطيسي) Fe3O4 أكسيد مختلط يعطي عند تفاعله مع الأحماض المركزة خليطاً من أملاح حديد II وحديد III.',
      'التحميص يهدف للتخلص من الرطوبة وزيادة نسبة الحديد في الخام وأكسدة الشوائب (S, P).',
    ],
    examTraps: 'أكسيد الحديد III لا يتفاعل مع الأحماض المخففة إطلاقاً، بل يحتاج أحماضاً معدنية مركزة وساخنة.',
    createdAt: '2026-10-25',
  },
  {
    id: 'rn-4',
    subjectId: 'geology',
    subjectName: 'الجيولوجيا والعلوم البيئية',
    chapterTitle: 'الباب الأول: علم الجيولوجيا ومادة كوكب الأرض',
    lessonTitle: 'التراكيب الجيولوجية الثانوية (الفوالق والطيات وعدم التوافق)',
    lawsAndFormulas: 'الفالق العادي: الحائط العلوي يتحرك لأسفل بفعل قوى شد (اتساع المساحة).\nالفالق المعكوس / الدسر: الحائط العلوي يتحرك لأعلى بفعل قوى ضغط (انكماش المساحة).\nعدم التوافق المتباين: صخور رسوبية تعلو صخوراً نارية أو متحولة.',
    keyPoints: [
      'لتحديد نوع الفالق: حدد صخور الحائط العلوي أولاً (الواقعة فوق مستوى الفالق المائل).',
      'فالق الخندق (الخسفي) = فالقان عاديان يتحدا في صخور الحائط العلوي.',
      'فالق بارز (ساتر) = فالقان عاديان يتحدا في صخور الحائط السفلي.',
    ],
    examTraps: 'الفالق الدسر هو فالق معكوس ولكن زاوية ميله قليلة تقترب من الأفق (أقل من 45 درجة).',
    createdAt: '2026-11-01',
  },
];

interface CurriculumViewProps {
  curriculum: Subject[];
  onToggleLesson: (subjectId: string, chapterId: string, lessonId: string) => void;
  onAddCustomLesson: (subjectId: string, chapterId: string, lessonTitle: string) => void;
  onAskTutor: (subjectName: string, promptText: string) => void;
  onOpenSummarizer?: (subjectName: string, chapterTitle: string, lessonTitle?: string) => void;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  curriculum,
  onToggleLesson,
  onAddCustomLesson,
  onAskTutor,
  onOpenSummarizer,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(curriculum[0].id);
  const [activeTabMode, setActiveTabMode] = useState<'lessons' | 'summaries' | 'revision_notes'>('lessons');
  const [searchQuery, setSearchQuery] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [addingToChapterId, setAddingToChapterId] = useState<string | null>(null);

  // Revision Notes State (User Request: قسم مذكرات المراجعة النهائية)
  const [revisionNotes, setRevisionNotes] = useState<RevisionNote[]>(() => {
    const saved = localStorage.getItem('nahj_revision_notes');
    return saved ? JSON.parse(saved) : INITIAL_REVISION_NOTES;
  });

  useEffect(() => {
    localStorage.setItem('nahj_revision_notes', JSON.stringify(revisionNotes));
  }, [revisionNotes]);

  // Note Creator Modal / Form
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteChapter, setNoteChapter] = useState('');
  const [noteLesson, setNoteLesson] = useState('');
  const [noteLaws, setNoteLaws] = useState('');
  const [notePointsText, setNotePointsText] = useState('');
  const [noteTraps, setNoteTraps] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const currentSubject =
    curriculum.find((s) => s.id === selectedSubjectId) || curriculum[0];

  // Calculate subject progress
  const allLessons = currentSubject.chapters.flatMap((c) => c.lessons);
  const completedCount = allLessons.filter((l) => l.isCompleted).length;
  const progressPercent = allLessons.length
    ? Math.round((completedCount / allLessons.length) * 100)
    : 0;

  const handleAddLessonSubmit = (chapterId: string) => {
    if (!newLessonTitle.trim()) return;
    onAddCustomLesson(selectedSubjectId, chapterId, newLessonTitle.trim());
    setNewLessonTitle('');
    setAddingToChapterId(null);
  };

  const handleSaveRevisionNote = () => {
    if (!noteLesson.trim() && !noteLaws.trim() && !notePointsText.trim()) return;

    const pointsArray = notePointsText
      .split('\n')
      .map((p) => p.trim().replace(/^[-•*]\s*/, ''))
      .filter(Boolean);

    if (editingNoteId) {
      setRevisionNotes((prev) =>
        prev.map((n) =>
          n.id === editingNoteId
            ? {
                ...n,
                chapterTitle: noteChapter || n.chapterTitle,
                lessonTitle: noteLesson || n.lessonTitle,
                lawsAndFormulas: noteLaws,
                keyPoints: pointsArray.length > 0 ? pointsArray : n.keyPoints,
                examTraps: noteTraps,
              }
            : n
        )
      );
      setEditingNoteId(null);
    } else {
      const newNote: RevisionNote = {
        id: `rn-${Date.now()}`,
        subjectId: selectedSubjectId,
        subjectName: currentSubject.name,
        chapterTitle: noteChapter || currentSubject.chapters[0]?.title || 'الباب الأول',
        lessonTitle: noteLesson || 'ملخص عام للدرس',
        lawsAndFormulas: noteLaws,
        keyPoints: pointsArray.length > 0 ? pointsArray : ['مراجعة شاملة لقوانين ومفاهيم الدرس'],
        examTraps: noteTraps,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setRevisionNotes((prev) => [newNote, ...prev]);
    }

    // Reset Form
    setNoteLesson('');
    setNoteChapter('');
    setNoteLaws('');
    setNotePointsText('');
    setNoteTraps('');
    setIsCreatingNote(false);
  };

  const handleStartEditNote = (note: RevisionNote) => {
    setEditingNoteId(note.id);
    setSelectedSubjectId(note.subjectId);
    setNoteChapter(note.chapterTitle);
    setNoteLesson(note.lessonTitle);
    setNoteLaws(note.lawsAndFormulas);
    setNotePointsText(note.keyPoints.join('\n'));
    setNoteTraps(note.examTraps);
    setIsCreatingNote(true);
  };

  const handleDeleteNote = (id: string) => {
    setRevisionNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleExportAsTextFile = (note: RevisionNote) => {
    const content = `=====================================================
مذكرة المراجعة النهائية — نَهج ثانوية عامة
المادة: ${note.subjectName}
الباب: ${note.chapterTitle}
الدرس: ${note.lessonTitle}
تاريخ التدوين: ${note.createdAt}
=====================================================

[1] القوانين والمعادلات الذهبية:
${note.lawsAndFormulas || 'لا توجد معادلات خاصة'}

[2] أهم النقاط والمعلومات للمراجعة السريعة:
${note.keyPoints.map((pt, i) => `${i + 1}. ${pt}`).join('\n')}

[3] تركات الامتحان ومصائد واضعي الأسئلة:
${note.examTraps || 'انتبه لصياغة الأسئلة وقراءة رأس المسألة كاملاً'}

=====================================================
تم الإنشاء بواسطة منصة «نَهج — أفضل نسخة منك»
ادعُ لأحمد يحيى بالتوفيق والنجاح 🤲🤍
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `مذكرة_${note.subjectName}_${note.lessonTitle.slice(0, 20)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyNoteAsBullets = (note: RevisionNote) => {
    const bullets = `📌 ملخص سريع: ${note.subjectName} — ${note.lessonTitle}\n` +
      (note.lawsAndFormulas ? `⚡ القوانين:\n${note.lawsAndFormulas}\n\n` : '') +
      `✦ أهم النقاط:\n` +
      note.keyPoints.map((p) => `• ${p}`).join('\n') +
      (note.examTraps ? `\n\n🎯 تركات الامتحان: ${note.examTraps}` : '');

    navigator.clipboard.writeText(bullets).then(() => {
      setCopyFeedback(note.id);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white dark:bg-[#19191F] border border-amber-200/70 dark:border-[#D4AF37]/30 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-[#09090C] text-[#9A7218] dark:text-[#E8CE88] rounded-full text-xs font-bold mb-1.5 border border-amber-200/70 dark:border-[#D4AF37]/35">
            <BookOpen className="w-3.5 h-3.5" />
            <span>منهج تالتة ثانوي علمي علوم المعتمد</span>
          </div>
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-[#F6E2A6]">
            خريطة المنهج والكبسولات ومذكرات المراجعة
          </h2>
          <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
            تتبع إنجاز دروسك، واطلع على كبسولات الامتحان، وأنشئ مذكراتك النصية لتصديرها ومراجعتها سريعاً
          </p>
        </div>

        {/* Mode switch: Lessons checklist vs Key Concept Summaries vs Final Revision Notes */}
        <div className="flex flex-wrap bg-zinc-100 dark:bg-[#09090C] p-1 rounded-xl self-start md:self-center border border-zinc-200 dark:border-[#D4AF37]/25 gap-1">
          <button
            onClick={() => setActiveTabMode('lessons')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'lessons'
                ? 'btn-luxury-gold shadow-xs'
                : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-900 dark:hover:text-[#F6E2A6]'
            }`}
          >
            قائمة الدروس
          </button>
          <button
            onClick={() => setActiveTabMode('summaries')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTabMode === 'summaries'
                ? 'btn-luxury-gold shadow-xs'
                : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-900 dark:hover:text-[#F6E2A6]'
            }`}
          >
            <Lightbulb className={`w-3.5 h-3.5 ${activeTabMode === 'summaries' ? 'text-[#09090B]' : 'text-[#D4AF37]'}`} />
            <span>كبسولات ومفاتيح</span>
          </button>
          <button
            onClick={() => setActiveTabMode('revision_notes')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTabMode === 'revision_notes'
                ? 'btn-luxury-gold shadow-xs'
                : 'text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-900 dark:hover:text-[#F6E2A6]'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeTabMode === 'revision_notes' ? 'text-[#09090B]' : 'text-[#D4AF37]'}`} />
            <span>مذكرات المراجعة النهائية 📝</span>
          </button>
        </div>
      </div>

      {/* Subject Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {curriculum.map((subj) => {
          const isSelected = subj.id === selectedSubjectId;
          const total = subj.chapters.flatMap((c) => c.lessons).length;
          const done = subj.chapters.flatMap((c) => c.lessons).filter((l) => l.isCompleted).length;
          const pct = total ? Math.round((done / total) * 100) : 0;

          return (
            <button
              key={subj.id}
              onClick={() => setSelectedSubjectId(subj.id)}
              className={`px-4 py-3 rounded-2xl shrink-0 font-bold text-xs transition-all border flex items-center gap-3 cursor-pointer ${
                isSelected
                  ? 'btn-luxury-gold border-[#F6E2A6]/60 shadow-md'
                  : 'bg-white dark:bg-[#19191F] text-zinc-700 dark:text-[#F4EFE6] border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37]/50'
              }`}
            >
              <div className="text-right">
                <span className="block text-xs font-extrabold">{subj.name}</span>
                <span
                  className={`text-[10px] block tabular-nums ${
                    isSelected ? 'text-[#09090B]/80 font-bold' : 'text-zinc-500 dark:text-[#B5AA92]'
                  }`}
                >
                  {pct}% منجز ({done}/{total})
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress Bar for Current Subject */}
      <div className="bg-white dark:bg-[#19191F] p-4 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/25 flex items-center justify-between gap-4 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-amber-200/70 dark:border-[#D4AF37]/30 text-[#9A7218] dark:text-[#E8CE88] flex items-center justify-center font-bold tabular-nums">
            {progressPercent}%
          </div>
          <div>
            <span className="text-xs font-bold text-zinc-900 dark:text-[#F6E2A6] block">
              تقدمك في مادة {currentSubject.name}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-[#B5AA92] tabular-nums">
              أنهيت {completedCount} درس من إجمالي {allLessons.length} درس
            </span>
          </div>
        </div>
        <div className="w-1/3 h-2.5 bg-zinc-200 dark:bg-[#09090C] border border-transparent dark:border-[#D4AF37]/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-[#F6E2A6] via-[#DFBC5B] to-[#B58722] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Content depending on activeTabMode */}
      {activeTabMode === 'lessons' ? (
        /* Lessons Checklist Mode */
        <div className="space-y-4">
          {currentSubject.chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="bg-white dark:bg-[#19191F] border border-amber-200/70 dark:border-[#D4AF37]/30 rounded-2xl p-5 shadow-xs transition-colors duration-200"
            >
              {/* Chapter Title */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#D4AF37]/20 pb-3 mb-3 gap-2 flex-wrap">
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-[#F6E2A6]">{chapter.title}</h3>
                  {chapter.unitTitle && (
                    <span className="text-[11px] text-zinc-500 dark:text-[#B5AA92] font-medium">{chapter.unitTitle}</span>
                  )}
                </div>
                <button
                  onClick={() =>
                    onAskTutor(
                      currentSubject.name,
                      `أستاذ نَهج، اشرحلي أهم أفكار وتركات الامتحان في: ${chapter.title}`
                    )
                  }
                  className="px-2.5 py-1 bg-amber-50 dark:bg-[#09090C] hover:bg-amber-100 dark:hover:bg-[#1E1E26] text-[#9A7218] dark:text-[#E8CE88] rounded-lg text-xs font-bold border border-amber-200 dark:border-[#D4AF37]/35 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>اسأل أستاذ نَهج عن هذا الباب (مجاناً)</span>
                </button>
              </div>

              {/* Lessons List */}
              <div className="space-y-2">
                {chapter.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    onClick={() => onToggleLesson(currentSubject.id, chapter.id, lesson.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      lesson.isCompleted
                        ? 'bg-amber-50/70 dark:bg-[#D4AF37]/10 border-amber-200 dark:border-[#D4AF37]/45 text-amber-950 dark:text-[#F3DFA2] shadow-2xs'
                        : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37]/50 text-zinc-900 dark:text-[#F4EFE6]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {lesson.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-[#9A7218] dark:text-[#D4AF37] shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-400 dark:text-[#B5AA92]/60 shrink-0" />
                      )}
                      <span
                        className={`text-xs font-bold leading-relaxed ${
                          lesson.isCompleted ? 'line-through text-amber-900/70 dark:text-[#E8CE88]/70' : ''
                        }`}
                      >
                        {lesson.title}
                      </span>
                    </div>

                    {lesson.isCustom && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-[#09090C] text-amber-800 dark:text-[#E8CE88] border border-transparent dark:border-[#D4AF37]/30 rounded font-semibold">
                        مخصص
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Custom Lesson */}
              {addingToChapterId === chapter.id ? (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    placeholder="اسم الدرس أو الفصل الإضافي..."
                    className="grow px-3 py-2 text-xs bg-zinc-50 dark:bg-[#09090C] text-zinc-900 dark:text-[#F4EFE6] border border-zinc-300 dark:border-[#D4AF37]/30 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleAddLessonSubmit(chapter.id)}
                    className="px-4 py-2 btn-luxury-gold font-bold text-xs rounded-lg cursor-pointer"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => {
                      setAddingToChapterId(null);
                      setNewLessonTitle('');
                    }}
                    className="px-3 py-2 bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-600 dark:text-[#B5AA92] text-xs rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingToChapterId(chapter.id)}
                  className="mt-3 text-[11px] text-[#9A7218] dark:text-[#E8CE88] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة درس أو موضوع إضافي لهذا الباب</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : activeTabMode === 'summaries' ? (
        /* Concise Key Concepts Summaries Mode (كبسولات ومفاتيح الامتحان) */
        <div className="space-y-5">
          <div className="bg-amber-50/70 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/30 rounded-2xl p-4 text-xs text-amber-900 dark:text-[#E8CE88] flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-[#9A7218] dark:text-[#D4AF37] shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-sm mb-0.5 dark:text-[#F6E2A6]">
                كبسولات المراجعة السريعة ومفاتيح حل الامتحانات
              </strong>
              اقرأ هذه الكبسولة قبل بدء المذاكرة أو في المراجعة السريعة لترتيب أفكارك وتثبيت التركات والروابط التي يركز عليها واضعو الامتحانات.
            </div>
          </div>

          {currentSubject.chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="bg-white dark:bg-[#19191F] border-2 border-amber-200/70 dark:border-[#D4AF37]/30 rounded-2xl p-5 shadow-xs space-y-4 transition-colors duration-200"
            >
              {/* Chapter Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#D4AF37]/20 gap-2">
                <div>
                  <span className="text-[11px] font-bold text-[#9A7218] dark:text-[#E8CE88] block">
                    {chapter.title}
                  </span>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-[#F6E2A6]">
                    💡 {chapter.summary.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                  {onOpenSummarizer && (
                    <button
                      onClick={() =>
                        onOpenSummarizer(
                          currentSubject.name,
                          chapter.title,
                          chapter.lessons[0]?.title
                        )
                      }
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/35 bg-zinc-50 dark:bg-[#09090C] text-xs font-bold text-zinc-800 dark:text-[#E8CE88] hover:border-[#D4AF37] transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>شرح ومذكرة PDF</span>
                    </button>
                  )}

                  <button
                    onClick={() =>
                      onAskTutor(
                        currentSubject.name,
                        `أستاذ نَهج، اختبرني في ${chapter.title} بـ 4 أسئلة اختيار من متعدد نظام حديث وشوف إجابتي!`
                      )
                    }
                    className="px-3 py-1.5 btn-luxury-gold rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-[#09090B]" />
                    <span>اختبرني في هذا الباب الآن</span>
                  </button>
                </div>
              </div>

              {/* Key Concept Points */}
              <div>
                <h4 className="text-xs font-black text-[#9A7218] dark:text-[#E8CE88] mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                  <span>المفاهيم المحورية والقواعد الذهبية:</span>
                </h4>
                <ul className="space-y-2">
                  {chapter.summary.keyPoints.map((point, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-zinc-800 dark:text-[#F4EFE6] leading-relaxed bg-zinc-50 dark:bg-[#09090C] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20 flex items-start gap-2"
                    >
                      <span className="text-[#9A7218] dark:text-[#D4AF37] font-bold text-sm shrink-0">✦</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Exam Traps & Tips */}
              {chapter.summary.examTips.length > 0 && (
                <div className="bg-amber-50/70 dark:bg-[#09090C] border border-amber-200/80 dark:border-[#D4AF37]/30 rounded-xl p-3.5">
                  <h4 className="text-xs font-black text-amber-900 dark:text-[#F6E2A6] mb-2 flex items-center gap-1.5">
                    <span className="text-[#D4AF37]">⚡</span>
                    <span>تركات الامتحان التي يقع فيها أغلب الطلاب:</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {chapter.summary.examTips.map((tip, idx) => (
                      <li key={idx} className="text-xs text-amber-950 dark:text-[#E8CE88] font-medium leading-relaxed flex items-start gap-2">
                        <span className="text-[#9A7218] dark:text-[#D4AF37] font-bold shrink-0">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Core Formula or Memory Nugget */}
              {chapter.summary.formulaOrNugget && (
                <div className="bg-amber-50/60 dark:bg-[#08080A] border border-amber-200 dark:border-[#D4AF37]/35 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-[#9A7218] dark:text-[#E8CE88] block mb-0.5">
                    معادلة / ثمرة الباب المختصرة:
                  </span>
                  <span className="font-mono text-xs font-black text-zinc-900 dark:text-[#F6E2A6]" dir="ltr">
                    {chapter.summary.formulaOrNugget}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Final Revision Notes Mode (User Request: مذكرات المراجعة النهائية) */
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Section Banner */}
          <div className="bg-gradient-to-l from-amber-50/90 via-zinc-50 to-amber-50/80 dark:from-[#1E1E26] dark:via-[#121217] dark:to-[#08080A] border-2 border-amber-200/80 dark:border-[#D4AF37]/45 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#09090C] text-[#E8CE88] border border-[#D4AF37]/40 rounded-full text-[11px] font-bold">
                <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>مذكرات المراجعة النهائية وقوانين الدروس</span>
              </div>
              <h3 className="font-black text-base text-zinc-900 dark:text-[#F6E2A6]">
                كبسولاتك النصية الخاصة بمادة {currentSubject.name}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-[#B5AA92] leading-relaxed max-w-xl">
                اكتب ولخص أهم القوانين والملاحظات لكل درس، وقم بنسخها كنقاط للمراجعة السريعة أو تصديرها كملف نصي (.txt) للمذاكرة بدون إنترنت أو للطباعة.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingNoteId(null);
                setNoteChapter(currentSubject.chapters[0]?.title || '');
                setNoteLesson('');
                setNoteLaws('');
                setNotePointsText('');
                setNoteTraps('');
                setIsCreatingNote(true);
              }}
              className="px-4 py-2.5 btn-luxury-gold rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer self-start sm:self-center shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء مذكرة جديدة للدرس</span>
            </button>
          </div>

          {/* Note Creation / Editing Box */}
          {isCreatingNote && (
            <div className="bg-white dark:bg-[#19191F] border-2 border-[#D4AF37] rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#D4AF37]/25">
                <h4 className="font-black text-sm text-zinc-900 dark:text-[#F6E2A6] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#9A7218] dark:text-[#D4AF37]" />
                  <span>{editingNoteId ? 'تعديل مذكرة الدرس' : 'إنشاء مذكرة مراجعة نهائية جديدة'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreatingNote(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-[#B5AA92] dark:hover:text-[#F6E2A6] cursor-pointer font-bold"
                >
                  إلغاء ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-[#B5AA92] block">
                    اختر الباب / الفصل:
                  </label>
                  <select
                    value={noteChapter}
                    onChange={(e) => setNoteChapter(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] text-zinc-900 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                  >
                    {currentSubject.chapters.map((ch) => (
                      <option key={ch.id} value={ch.title}>
                        {ch.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-[#B5AA92] block">
                    عنوان الدرس أو الموضوع:
                  </label>
                  <input
                    type="text"
                    value={noteLesson}
                    onChange={(e) => setNoteLesson(e.target.value)}
                    placeholder="مثال: قوانين كيرشوف وحل الدوائر الكهربية المعقدة"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] text-zinc-900 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Laws & Formulas */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#9A7218] dark:text-[#E8CE88] block">
                  ⚡ أهم القوانين والمعادلات الذهبية للدرس:
                </label>
                <textarea
                  value={noteLaws}
                  onChange={(e) => setNoteLaws(e.target.value)}
                  rows={3}
                  placeholder="اكتب القوانين وصيغ الحسابات الرياضية والكيميائية (سطر لكل قانون)..."
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] text-zinc-900 dark:text-[#F3DFA2] focus:outline-none focus:border-[#D4AF37] font-mono leading-relaxed"
                />
              </div>

              {/* Key Bullet Points */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-[#F4EFE6] block">
                  ✦ نقاط ومعلومات المراجعة السريعة (اكتب كل نقطة في سطر منفصل):
                </label>
                <textarea
                  value={notePointsText}
                  onChange={(e) => setNotePointsText(e.target.value)}
                  rows={4}
                  placeholder="• حدد مسار العروة الافتراضي أولاً&#10;• أيونات الكالسيوم تكشف مواقع الارتباط&#10;• أكسيد الحديد III لا يتفاعل مع الأحماض المخففة"
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#09090C] text-zinc-900 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37] leading-relaxed"
                />
              </div>

              {/* Exam Traps */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-amber-700 dark:text-[#E8CE88] block">
                  🎯 تركات الامتحان والملاحظات الخادعة:
                </label>
                <input
                  type="text"
                  value={noteTraps}
                  onChange={(e) => setNoteTraps(e.target.value)}
                  placeholder="مثال: المنطقة A طولها ثابت دائماً ولا يتغير بالانقباض، احذر الوقوع في هذا الفخ"
                  className="w-full text-xs p-2.5 rounded-xl border border-amber-200 dark:border-[#D4AF37]/35 bg-amber-50/50 dark:bg-[#09090C] text-zinc-900 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveRevisionNote}
                  className="py-2.5 px-5 btn-luxury-gold rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ المذكرة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNote(false)}
                  className="py-2.5 px-4 bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-600 dark:text-[#B5AA92] rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Notes List for Selected Subject */}
          <div className="space-y-4">
            {revisionNotes
              .filter((n) => n.subjectId === selectedSubjectId)
              .map((note) => (
                <div
                  key={note.id}
                  className="bg-white dark:bg-[#19191F] border-2 border-amber-200/70 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 hover:border-[#D4AF37]/60 transition-all"
                >
                  {/* Note Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 dark:border-[#D4AF37]/20 gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 dark:bg-[#09090C] border border-amber-200/70 dark:border-[#D4AF37]/35 text-[#9A7218] dark:text-[#E8CE88]">
                          {note.subjectName}
                        </span>
                        <span className="text-[11px] text-zinc-400 dark:text-[#B5AA92] tabular-nums">
                          {note.createdAt}
                        </span>
                      </div>
                      <h4 className="font-black text-base text-zinc-900 dark:text-[#F6E2A6]">
                        {note.lessonTitle}
                      </h4>
                      <span className="text-xs text-zinc-500 dark:text-[#B5AA92] font-medium">
                        {note.chapterTitle}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleCopyNoteAsBullets(note)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          copyFeedback === note.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 hover:bg-zinc-200 dark:hover:bg-[#1E1E26] text-zinc-700 dark:text-[#F4EFE6]'
                        }`}
                        title="نسخ كنقاط للمراجعة السريعة"
                      >
                        {copyFeedback === note.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم النسخ بنجاح!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ كنقاط</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportAsTextFile(note)}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-[#09090C] hover:bg-amber-100 dark:hover:bg-[#1E1E26] text-[#9A7218] dark:text-[#E8CE88] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-amber-200 dark:border-[#D4AF37]/35"
                        title="تصدير كملف نصي (.txt)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تصدير (.txt)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEditNote(note)}
                        className="p-1.5 rounded-xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 hover:bg-zinc-200 dark:hover:bg-[#1E1E26] text-zinc-600 dark:text-[#E8CE88] cursor-pointer"
                        title="تعديل"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Laws & Formulas (if present) */}
                  {note.lawsAndFormulas && (
                    <div className="bg-[#09090C] text-[#F3DFA2] border border-[#D4AF37]/35 p-3.5 rounded-2xl font-mono text-xs leading-relaxed space-y-1 shadow-inner" dir="ltr">
                      <span className="text-[10px] text-[#B5AA92] font-sans block text-right font-bold" dir="rtl">
                        ⚡ القوانين والمعادلات الذهبية:
                      </span>
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        {note.lawsAndFormulas}
                      </pre>
                    </div>
                  )}

                  {/* Section 2: Key Bullet Points */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-[#9A7218] dark:text-[#E8CE88] block">
                      ✦ أهم النقاط والمعلومات للمراجعة السريعة:
                    </span>
                    <ul className="space-y-1.5">
                      {note.keyPoints.map((pt, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-zinc-700 dark:text-[#F4EFE6] bg-zinc-50/80 dark:bg-[#09090C] p-2.5 rounded-xl border border-zinc-200/80 dark:border-[#D4AF37]/20 flex items-start gap-2 leading-relaxed"
                        >
                          <span className="text-[#9A7218] dark:text-[#D4AF37] font-bold shrink-0">✦</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Section 3: Exam Traps (if present) */}
                  {note.examTraps && (
                    <div className="bg-amber-50/70 dark:bg-[#09090C] border border-amber-200 dark:border-[#D4AF37]/30 p-3 rounded-2xl flex items-start gap-2">
                      <span className="text-[#D4AF37] text-base shrink-0">⚡</span>
                      <div>
                        <span className="text-[11px] font-black text-amber-900 dark:text-[#F6E2A6] block mb-0.5">
                          تركات الامتحان ومصائد واضعي الأسئلة:
                        </span>
                        <p className="text-xs text-amber-950 dark:text-[#E8CE88] font-medium leading-relaxed">
                          {note.examTraps}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

            {revisionNotes.filter((n) => n.subjectId === selectedSubjectId).length === 0 && (
              <div className="text-center py-10 bg-white dark:bg-[#19191F] rounded-3xl border border-zinc-200 dark:border-[#D4AF37]/30 space-y-3 p-6">
                <FileText className="w-12 h-12 text-zinc-300 dark:text-[#D4AF37]/50 mx-auto" />
                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-[#F6E2A6]">
                  لا توجد مذكرات مراجعة بعد لمادة {currentSubject.name}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-[#B5AA92] max-w-md mx-auto">
                  اضغط على زر «إنشاء مذكرة جديدة للدرس» لتلخيص أهم القوانين والتركات وتصديرها للمراجعة السريعة.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoteId(null);
                    setNoteChapter(currentSubject.chapters[0]?.title || '');
                    setNoteLesson('');
                    setNoteLaws('');
                    setNotePointsText('');
                    setNoteTraps('');
                    setIsCreatingNote(true);
                  }}
                  className="px-4 py-2 btn-luxury-gold rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  + إنشاء أول مذكرة الآن
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
