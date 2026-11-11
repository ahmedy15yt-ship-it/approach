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
      <div className="bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2D5A43]/10 text-[#2D5A43] rounded-full text-xs font-bold mb-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>منهج تالتة ثانوي علمي علوم المعتمد</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#1E2922]">خريطة المنهج والكبسولات السريعة</h2>
          <p className="text-xs text-[#6F7D72]">
            تتبع إنجاز دروسك أولاً بأول، واطلع على ملخصات المفاهيم وتركات الامتحانات قبل كل جلسة
          </p>
        </div>

        {/* Mode switch: Lessons checklist vs Key Concept Summaries */}
        <div className="flex bg-[#F2EFE9] p-1 rounded-xl self-start md:self-center">
          <button
            onClick={() => setActiveTabMode('lessons')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTabMode === 'lessons'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'text-[#4B594E] hover:text-[#1E2922]'
            }`}
          >
            قائمة الدروس والمتابعة
          </button>
          <button
            onClick={() => setActiveTabMode('summaries')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTabMode === 'summaries'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'text-[#4B594E] hover:text-[#1E2922]'
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
              className={`px-4 py-3 rounded-2xl shrink-0 font-bold text-xs transition-all border flex items-center gap-3 ${
                isSelected
                  ? 'bg-[#2D5A43] text-white border-[#2D5A43] shadow-md'
                  : 'bg-white text-[#4B594E] border-[#E2DDD3] hover:border-[#2D5A43]/40'
              }`}
            >
              <div className="text-right">
                <span className="block text-xs font-extrabold">{subj.name}</span>
                <span
                  className={`text-[10px] block ${
                    isSelected ? 'text-emerald-200' : 'text-[#8A988D]'
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
      <div className="bg-white p-4 rounded-xl border border-[#E8E4DC] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2D5A43]/10 text-[#2D5A43] flex items-center justify-center font-bold">
            {progressPercent}%
          </div>
          <div>
            <span className="text-xs font-bold text-[#1E2922] block">
              تقدمك في مادة {currentSubject.name}
            </span>
            <span className="text-[11px] text-[#78887C]">
              أنهيت {completedCount} درس من إجمالي {allLessons.length} درس
            </span>
          </div>
        </div>
        <div className="w-1/3 h-2.5 bg-[#EAE6DF] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2D5A43] rounded-full transition-all duration-500"
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
              className="bg-white border border-[#2D5A43]/15 rounded-2xl p-5 shadow-xs"
            >
              {/* Chapter Title */}
              <div className="flex items-center justify-between border-b border-[#F0EDE6] pb-3 mb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-[#1E2922]">{chapter.title}</h3>
                  {chapter.unitTitle && (
                    <span className="text-[11px] text-[#7A8A7E] font-medium">{chapter.unitTitle}</span>
                  )}
                </div>
                <button
                  onClick={() =>
                    onAskTutor(
                      currentSubject.name,
                      `أستاذ نَهج، اشرحلي أهم أفكار وتركات الامتحان في: ${chapter.title}`
                    )
                  }
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1"
                >
                  <Bot className="w-3.5 h-3.5 text-emerald-600" />
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
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                        : 'bg-[#FAF9F6] border-[#E8E4DC] hover:border-[#2D5A43]/30 text-[#1E2922]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {lesson.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 shrink-0" />
                      )}
                      <span
                        className={`text-xs font-bold leading-relaxed ${
                          lesson.isCompleted ? 'line-through text-emerald-700/80' : ''
                        }`}
                      >
                        {lesson.title}
                      </span>
                    </div>

                    {lesson.isCustom && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold">
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
                    className="grow px-3 py-2 text-xs bg-[#FAF9F5] border border-[#D5CFC3] rounded-lg focus:border-[#2D5A43] focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleAddLessonSubmit(chapter.id)}
                    className="px-4 py-2 bg-[#2D5A43] text-white font-bold text-xs rounded-lg"
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
                  className="mt-3 text-[11px] text-[#2D5A43] hover:underline font-bold flex items-center gap-1"
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
              className="bg-white border-2 border-[#2D5A43]/20 rounded-2xl p-5 shadow-xs space-y-4"
            >
              {/* Chapter Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAE6DF] gap-2">
                <div>
                  <span className="text-[11px] font-bold text-[#8C7A52] block">
                    {chapter.title}
                  </span>
                  <h3 className="font-extrabold text-base text-[#1E2922]">
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
                  className="px-3 py-1.5 bg-[#2D5A43] hover:bg-[#234734] text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 self-start sm:self-center"
                >
                  <Bot className="w-3.5 h-3.5 text-amber-300" />
                  <span>اختبرني في هذا الباب الآن</span>
                </button>
              </div>

              {/* Key Concept Points */}
              <div>
                <h4 className="text-xs font-black text-[#2D5A43] mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2D5A43]" />
                  <span>المفاهيم المحورية والقواعد الذهبية:</span>
                </h4>
                <ul className="space-y-2">
                  {chapter.summary.keyPoints.map((point, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-[#2C3B30] leading-relaxed bg-[#FAF9F5] p-2.5 rounded-xl border border-[#EDE8DE] flex items-start gap-2"
                    >
                      <span className="text-[#2D5A43] font-bold text-sm shrink-0">✦</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Exam Traps & Tips */}
              {chapter.summary.examTips.length > 0 && (
                <div className="bg-[#FFFDF5] border border-amber-200/80 rounded-xl p-3.5">
                  <h4 className="text-xs font-black text-amber-900 mb-2 flex items-center gap-1.5">
                    <span className="text-amber-600">⚡</span>
                    <span>تركات الامتحان التي يقع فيها أغلب الطلاب:</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {chapter.summary.examTips.map((tip, idx) => (
                      <li key={idx} className="text-xs text-amber-950 font-medium leading-relaxed flex items-start gap-2">
                        <span className="text-amber-600 font-bold shrink-0">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Core Formula or Memory Nugget */}
              {chapter.summary.formulaOrNugget && (
                <div className="bg-[#F0F5F2] border border-[#2D5A43]/30 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-[#2D5A43] block mb-0.5">
                    معادلة / ثمرة الباب المختصرة:
                  </span>
                  <span className="font-mono text-xs font-black text-[#1E2922]" dir="ltr">
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
