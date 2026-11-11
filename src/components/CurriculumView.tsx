import React, { useState } from 'react';
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
} from 'lucide-react';
import { Subject, Lesson } from '../types';

interface CurriculumViewProps {
  curriculum: Subject[];
  onToggleLesson: (subjectId: string, chapterId: string, lessonId: string) => void;
  onAddCustomLesson: (subjectId: string, chapterId: string, lessonTitle: string) => void;
  onAskTutor: (subjectName: string, promptText: string) => void;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  curriculum,
  onToggleLesson,
  onAddCustomLesson,
  onAskTutor,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(curriculum[0].id);
  const [activeTabMode, setActiveTabMode] = useState<'lessons' | 'summaries'>('lessons');
  const [searchQuery, setSearchQuery] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [addingToChapterId, setAddingToChapterId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white dark:bg-[#111C38] border border-[#1E40AF]/15 dark:border-blue-900/40 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1E40AF]/10 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 rounded-full text-xs font-bold mb-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>منهج تالتة ثانوي علمي علوم المعتمد</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white">خريطة المنهج والكبسولات السريعة</h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            تتبع إنجاز دروسك أولاً بأول، واطلع على ملخصات المفاهيم وتركات الامتحانات قبل كل جلسة
          </p>
        </div>

        {/* Mode switch: Lessons checklist vs Key Concept Summaries */}
        <div className="flex bg-[#F2EFE9] dark:bg-[#0B132B] p-1 rounded-xl self-start md:self-center border border-transparent dark:border-slate-800">
          <button
            onClick={() => setActiveTabMode('lessons')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'lessons'
                ? 'bg-[#1E40AF] text-white shadow-xs'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            قائمة الدروس والمتابعة
          </button>
          <button
            onClick={() => setActiveTabMode('summaries')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTabMode === 'summaries'
                ? 'bg-[#1E40AF] text-white shadow-xs'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
            <span>كبسولات ومفاتيح الامتحان</span>
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
                  ? 'bg-[#1E40AF] text-white border-[#1E40AF] shadow-md'
                  : 'bg-white dark:bg-[#111C38] text-[#334155] dark:text-slate-200 border-[#E2E8F0] dark:border-slate-800 hover:border-[#1E40AF]/40'
              }`}
            >
              <div className="text-right">
                <span className="block text-xs font-extrabold">{subj.name}</span>
                <span
                  className={`text-[10px] block ${
                    isSelected ? 'text-amber-300' : 'text-[#64748B] dark:text-slate-400'
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
      <div className="bg-white dark:bg-[#111C38] p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E40AF]/10 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 flex items-center justify-center font-bold">
            {progressPercent}%
          </div>
          <div>
            <span className="text-xs font-bold text-[#0F172A] dark:text-white block">
              تقدمك في مادة {currentSubject.name}
            </span>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400">
              أنهيت {completedCount} درس من إجمالي {allLessons.length} درس
            </span>
          </div>
        </div>
        <div className="w-1/3 h-2.5 bg-[#E2E8F0] dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1E40AF] dark:bg-blue-500 rounded-full transition-all duration-500"
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
              className="bg-white dark:bg-[#111C38] border border-[#1E40AF]/15 dark:border-blue-900/40 rounded-2xl p-5 shadow-xs transition-colors duration-200"
            >
              {/* Chapter Title */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3 mb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-[#0F172A] dark:text-white">{chapter.title}</h3>
                  {chapter.unitTitle && (
                    <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">{chapter.unitTitle}</span>
                  )}
                </div>
                <button
                  onClick={() =>
                    onAskTutor(
                      currentSubject.name,
                      `أستاذ نَهج، اشرحلي أهم أفكار وتركات الامتحان في: ${chapter.title}`
                    )
                  }
                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[#1E40AF] dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800/40 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400" />
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
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50 text-blue-950 dark:text-blue-200 shadow-2xs'
                        : 'bg-[#F8FAFC] dark:bg-[#0B132B]/60 border-[#E2E8F0] dark:border-slate-800 hover:border-[#1E40AF]/30 dark:hover:border-blue-500/40 text-[#0F172A] dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {lesson.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-[#1E40AF] dark:text-blue-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 dark:text-slate-500 shrink-0" />
                      )}
                      <span
                        className={`text-xs font-bold leading-relaxed ${
                          lesson.isCompleted ? 'line-through text-blue-800/70 dark:text-blue-400/70' : ''
                        }`}
                      >
                        {lesson.title}
                      </span>
                    </div>

                    {lesson.isCustom && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 rounded font-semibold">
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
                    className="grow px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:border-[#1E40AF] focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleAddLessonSubmit(chapter.id)}
                    className="px-4 py-2 bg-[#1E40AF] text-white font-bold text-xs rounded-lg"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => {
                      setAddingToChapterId(null);
                      setNewLessonTitle('');
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-600 text-xs rounded-lg"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingToChapterId(chapter.id)}
                  className="mt-3 text-[11px] text-[#1E40AF] hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة درس أو موضوع إضافي لهذا الباب</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Concise Key Concepts Summaries Mode (كبسولات ومفاتيح الامتحان) */
        <div className="space-y-5">
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-sm mb-0.5">
                كبسولات المراجعة السريعة ومفاتيح حل الامتحانات
              </strong>
              اقرأ هذه الكبسولة قبل بدء المذاكرة أو في المراجعة السريعة لترتيب أفكارك وتثبيت التركات والروابط التي يركز عليها واضعو الامتحانات.
            </div>
          </div>

          {currentSubject.chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="bg-white dark:bg-[#111C38] border-2 border-[#1E40AF]/20 dark:border-blue-900/40 rounded-2xl p-5 shadow-xs space-y-4 transition-colors duration-200"
            >
              {/* Chapter Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800 gap-2">
                <div>
                  <span className="text-[11px] font-bold text-[#8C7A52] dark:text-amber-300 block">
                    {chapter.title}
                  </span>
                  <h3 className="font-extrabold text-base text-[#0F172A] dark:text-white">
                    💡 {chapter.summary.title}
                  </h3>
                </div>

                <button
                  onClick={() =>
                    onAskTutor(
                      currentSubject.name,
                      `أستاذ نَهج، اختبرني في ${chapter.title} بـ 4 أسئلة اختيار من متعدد نظام حديث وشوف إجابتي!`
                    )
                  }
                  className="px-3 py-1.5 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-amber-300" />
                  <span>اختبرني في هذا الباب الآن</span>
                </button>
              </div>

              {/* Key Concept Points */}
              <div>
                <h4 className="text-xs font-black text-[#1E40AF] dark:text-blue-400 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1E40AF] dark:bg-blue-400" />
                  <span>المفاهيم المحورية والقواعد الذهبية:</span>
                </h4>
                <ul className="space-y-2">
                  {chapter.summary.keyPoints.map((point, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-[#1E293B] dark:text-slate-200 leading-relaxed bg-[#F8FAFC] dark:bg-[#0B132B]/60 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 flex items-start gap-2"
                    >
                      <span className="text-[#1E40AF] dark:text-blue-400 font-bold text-sm shrink-0">✦</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Exam Traps & Tips */}
              {chapter.summary.examTips.length > 0 && (
                <div className="bg-[#FFFDF5] dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl p-3.5">
                  <h4 className="text-xs font-black text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400">⚡</span>
                    <span>تركات الامتحان التي يقع فيها أغلب الطلاب:</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {chapter.summary.examTips.map((tip, idx) => (
                      <li key={idx} className="text-xs text-amber-950 dark:text-amber-200 font-medium leading-relaxed flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Core Formula or Memory Nugget */}
              {chapter.summary.formulaOrNugget && (
                <div className="bg-[#F0F5F2] border border-[#1E40AF]/30 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-[#1E40AF] block mb-0.5">
                    معادلة / ثمرة الباب المختصرة:
                  </span>
                  <span className="font-mono text-xs font-black text-[#0F172A]" dir="ltr">
                    {chapter.summary.formulaOrNugget}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
