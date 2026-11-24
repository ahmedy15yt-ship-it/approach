export interface Lesson {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
  isCustom?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  unitTitle?: string;
  lessons: Lesson[];
  summary: {
    title: string;
    keyPoints: string[];
    examTips: string[];
    formulaOrNugget?: string;
  };
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  weeklyTargetHours: number;
  chapters: Chapter[];
}

export interface StudySession {
  id: string;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  lessonTitle: string;
  startTime: string; // HH:mm
  durationMinutes: number;
  isCompleted: boolean;
  notes?: string;
  xpEarned?: number;
}

export interface DaySchedule {
  dayName: string; // السبت، الأحد...
  isSchoolDay: boolean;
  wakeUpTime: string;
  bedTime: string;
  sessions: StudySession[];
}

export interface BacklogItem {
  id: string;
  subjectId: string;
  subjectName: string;
  lessonTitle: string;
  assignedDate: string; // YYYY-MM-DD
  isCompleted: boolean;
  completedAt?: string;
}

export interface DailyTask {
  id: string;
  title: string;
  category: 'study' | 'water' | 'prayer' | 'exercise' | 'backlog' | 'mindset';
  xp: number;
  isDone: boolean;
  targetCount?: number;
  currentCount?: number;
}

export interface CustomDailyTask {
  id: string;
  title: string;
  category: 'study' | 'practice' | 'summary' | 'worship' | 'personal';
  priority: 'high' | 'medium' | 'normal';
  estimatedMinutes: number;
  xp: number;
  isDone: boolean;
  xpClaimed?: boolean;
  cycleIndex: number;
  createdAt: string;
}

export interface StudentProfile {
  name: string;
  codeMasked: string;
  streakDays: number;
  totalXp: number;
  rankTitle: string;
  governorate: string;
  dailyWaterCups: number;
  dailyWin?: string;
  weeklyHoursAllocation: Record<string, number>; // subjectId -> hours
  weightKg?: number;
  heightCm?: number;
  fitnessGoal?: 'maintain' | 'lose' | 'gain';
  isVerified?: boolean;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  governorate: string;
  xp: number;
  streak: number;
  badge: string;
  isCurrentUser?: boolean;
  isVerified?: boolean;
}

export interface DailyStudyHoursLog {
  date: string; // YYYY-MM-DD
  hours: number;
  sessionsCount: number;
  dailyGoalHours: number;
  updatedAt: string;
}

export interface ChallengeDailyPoint {
  date: string; // YYYY-MM-DD
  myHours: number;
  friendHours: number;
}

export interface FriendChallenge {
  id: string;
  title: string;
  friendName: string;
  targetHours: number;
  myHours: number;
  friendHours: number;
  dailyHistory?: ChallengeDailyPoint[];
  status: 'active' | 'won' | 'completed';
  rewardXp: number;
  rewardClaimed?: boolean;
  shareCode: string;
  sessionDurationMinutes?: number;
  sessionStartedAt?: string | null;
  sessionCompletedCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StreakHistoryEntry {
  date: string; // YYYY-MM-DD local date
  status: 'completed' | 'freeze' | 'missed';
  studyHours: number;
  tasksCompleted: number;
  xpEarned: number;
  note?: string;
  updatedAt: string;
}

export interface AccountSession {
  phone: string;
  normalizedPhone: string;
  username: string;
  loggedInAt: string;
  lastSyncedAt?: string;
  isVerified?: boolean;
}

export interface StudentActivitySnapshot {
  username: string;
  phone: string;
  normalizedPhone: string;
  profile: StudentProfile;
  curriculum: Subject[];
  backlogItems: BacklogItem[];
  dailyTasks: DailyTask[];
  taskCycleIndex: number;
  todayStudyLog: DailyStudyHoursLog;
  friendChallenges: FriendChallenge[];
  streakHistory: Record<string, StreakHistoryEntry>;
  streakLastTickMs: number;
  updatedAt: string;
}

export type GeneratedQuestionType = 'mcq' | 'true_false' | 'short_answer';
export type GeneratedQuestionDifficulty = 'أساسي' | 'متوسط' | 'تحدي';
export type QuestionTypeFilter = 'mixed' | 'mcq' | 'true_false' | 'short_answer';
export type QuestionDifficultyFilter = 'balanced' | 'basic' | 'exam' | 'advanced';

export interface InteractiveQuestion {
  id: string;
  type: GeneratedQuestionType;
  difficulty: GeneratedQuestionDifficulty;
  question: string;
  options: string[];
  correctAnswerIndex?: number;
  correctAnswerText: string;
  explanation: string;
  hint?: string;
}

export interface GeneratedQuestionSet {
  id: string;
  subject: string;
  chapter: string;
  lesson: string;
  questionTypeFilter: QuestionTypeFilter;
  difficultyFilter: QuestionDifficultyFilter;
  questions: InteractiveQuestion[];
  source: 'gemini' | 'fallback';
  providerLabel?: string;
  warning?: string;
  createdAt: string;
  scoreCorrect?: number;
  scoreTotal?: number;
  xpAwarded?: boolean;
}

export interface QuizChallengeParticipant {
  name: string;
  scoreCorrect: number;
  totalQuestions: number;
  accuracy: number;
  timeSeconds: number;
  submittedAt: string;
}

export interface QuizChallengeRoom {
  code: string;
  title: string;
  subject: string;
  chapter: string;
  lesson: string;
  creatorName: string;
  questions: InteractiveQuestion[];
  participants: QuizChallengeParticipant[];
  shareCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonSummaryConceptSection {
  title: string;
  deepExplanation: string;
  whyItMatters: string;
  realLifeExample: string;
  keyTakeaways: string[];
}

export interface LessonSummaryFormulaItem {
  label: string;
  expression: string;
  whenToUse: string;
}

export interface LessonSummaryTrapItem {
  trap: string;
  truth: string;
}

export interface LessonSummaryQuestion {
  question: string;
  questionType: 'فهم واستنتاج' | 'تطبيق مسألة' | 'فكرة امتحان';
  steps: string[];
  answer: string;
  teacherNote: string;
}

export interface LessonSummaryQuickCheck {
  question: string;
  answer: string;
  explanation: string;
}

export interface LessonMasterSummary {
  id: string;
  subject: string;
  chapter: string;
  lesson: string;
  detailLevel: 'comprehensive' | 'exam-sprint';
  teacherIntro: string;
  bigIdea: string;
  conceptSections: LessonSummaryConceptSection[];
  formulasAndRules: LessonSummaryFormulaItem[];
  examTraps: LessonSummaryTrapItem[];
  solvedQuestions: LessonSummaryQuestion[];
  quickCheckQuestions: LessonSummaryQuickCheck[];
  source: 'gemini' | 'fallback';
  providerLabel?: string;
  warning?: string;
  createdAt: string;
}

export interface DictionaryWordEntry {
  id: string;
  letter: string;
  word: string;
  partOfSpeech: string;
  phonetic: string;
  arPronunciation: string;
  arMeaning: string;
}

export interface ImportantSentenceEntry {
  id: string;
  index: number;
  category: string;
  en: string;
  arPronunciation: string;
  ar: string;
}

export type TranslationLanguageCode = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'it';

export interface TranslationResult {
  sourceText: string;
  translatedText: string;
  sourceLang: TranslationLanguageCode;
  targetLang: TranslationLanguageCode;
  phoneticPronunciation: string;
  grammarNote: string;
  usageExamples: Array<{ source: string; target: string }>;
  source: 'gemini' | 'fallback';
  providerLabel?: string;
  warning?: string;
}

export interface TranslationHistoryItem extends TranslationResult {
  id: string;
  createdAt: string;
}

export type CompanionMood = 'motivated' | 'stressed' | 'tired' | 'lost';

export interface CompanionChatMessage {
  id: string;
  role: 'user' | 'companion';
  text: string;
  createdAt: string;
  actionTip?: string;
}

export interface CompanionReplyItem {
  id: string;
  authorName: string;
  authorPhone?: string;
  isVerified?: boolean;
  text: string;
  createdAt: string;
}

export interface CompanionCommunityPost {
  id: string;
  authorName: string;
  authorPhone?: string;
  isVerified?: boolean;
  category: 'تحفيز' | 'إنجاز يومي' | 'طلب مساعدة' | 'نصيحة مذاكرة';
  content: string;
  cheers: number;
  replies: CompanionReplyItem[];
  createdAt: string;
}

export type KhatmaPrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface KhatmaPrayerWird {
  prayerKey: KhatmaPrayerKey;
  prayerLabel: string;
  startPage: number;
  endPage: number;
  pagesCount: number;
  juzStart: number;
  juzEnd: number;
  completed: boolean;
}

export interface KhatmaDayPlan {
  dayNumber: number;
  startPage: number;
  endPage: number;
  juzRangeLabel: string;
  prayers: KhatmaPrayerWird[];
}

export interface KhatmaPlanState {
  targetDays: number;
  startedAt: string;
  completedSlotKeys: string[]; // format: "dayNumber:prayerKey"
}

export type WhiteboardDiagramType =
  | 'physics_circuit'
  | 'physics_wave'
  | 'chem_reaction'
  | 'chem_atom'
  | 'bio_cell'
  | 'bio_dna'
  | 'geology_layers'
  | 'concept_map';

export interface WhiteboardScene {
  id: string;
  title: string;
  durationSec: number;
  diagramType: WhiteboardDiagramType;
  diagramTitle: string;
  diagramLabels: string[];
  boardLines: string[];
  formulaBox?: string;
  narration: string;
  textbookKeyPoints?: string[];
}

export interface WhiteboardLessonScript {
  id: string;
  subject: string;
  chapter: string;
  lesson: string;
  introTitle: string;
  lessonObjective?: string;
  scenes: WhiteboardScene[];
  source: 'gemini' | 'fallback';
  providerLabel?: string;
  warning?: string;
  createdAt: string;
}


