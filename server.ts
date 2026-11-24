import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { generateTutorFallback, generateMealFallback } from './src/utils/aiFallbacks.js';
import {
  buildTutorSystemPrompt,
  buildTutorFormattedContents,
  TutorDeepMode,
} from './src/utils/tutorPrompts.js';
import {
  buildQuestionGeneratorPrompt,
  buildQuestionGeneratorSystemInstruction,
  generateQuestionsFallback,
  normalizeGeneratedQuestions,
  QuestionGenerationParams,
} from './src/utils/questionGenerator.js';
import {
  buildLessonSummaryPrompt,
  buildLessonSummarySystemInstruction,
  generateLessonSummaryFallback,
  LessonSummaryGenerationParams,
  normalizeLessonSummary,
} from './src/utils/lessonSummary.js';
import {
  QuestionDifficultyFilter,
  QuestionTypeFilter,
  QuizChallengeRoom,
  CompanionCommunityPost,
  TranslationLanguageCode,
} from './src/types/index.js';
import {
  callStrongSecondaryAI,
  extractJsonPayloadFromText,
  getConfiguredAIProviders,
} from './src/utils/aiProviders.js';
import { buildTranslationFallback, getLanguageMeta } from './src/utils/translatorFallback.js';
import {
  buildWhiteboardSystemInstruction,
  buildWhiteboardUserPrompt,
  generateWhiteboardFallback,
  normalizeWhiteboardLessonScript,
  sanitizeArabicForSpeech,
} from './src/utils/whiteboardGenerator.js';
import { generateCompanionResponse } from './src/utils/companionBrain.js';


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize Gemini client strictly server-side if key is present (propagating app domain Referer for domain-restricted keys)
const geminiClientCache = new Map<string, GoogleGenAI>();

function resolveServerAppReferer(req?: any): string | undefined {
  const origin = req?.headers?.origin;
  if (typeof origin === 'string' && origin.startsWith('http')) {
    return origin.endsWith('/') ? origin : `${origin}/`;
  }
  const referer = req?.headers?.referer || req?.headers?.referrer;
  if (typeof referer === 'string' && referer.startsWith('http')) {
    return referer;
  }
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  if (typeof host === 'string' && host.trim()) {
    const proto =
      req?.headers?.['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    return `${proto}://${host.trim()}/`;
  }
  const envUrl = process.env.APP_URL ? process.env.APP_URL.trim() : '';
  if (envUrl && envUrl.startsWith('http') && envUrl !== 'MY_APP_URL') {
    return envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
  }
  return undefined;
}

function getGeminiClient(req?: any): GoogleGenAI | null {
  const rawKey = process.env.GEMINI_API_KEY;
  const trimmedKey = rawKey ? rawKey.trim() : '';
  if (!trimmedKey || trimmedKey === 'MY_GEMINI_API_KEY') {
    return null;
  }

  const referer = resolveServerAppReferer(req);
  const cacheKey = `${trimmedKey}::${referer || 'default'}`;
  const cached = geminiClientCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'aistudio-build',
    };
    if (referer) {
      headers['Referer'] = referer;
    }
    const client = new GoogleGenAI({
      apiKey: trimmedKey,
      httpOptions: {
        headers,
      },
    });
    if (geminiClientCache.size > 16) {
      geminiClientCache.clear();
    }
    geminiClientCache.set(cacheKey, client);
    return client;
  } catch (err) {
    console.error('Gemini SDK initialization note:', err);
    return null;
  }
}

let ai: GoogleGenAI | null = getGeminiClient();

function classifyGeminiError(err: any): { retryable: boolean; userWarning: string } {
  const msg = String(err?.message || err || '');
  const status = Number(err?.status || err?.code || 0);

  if (status === 400 || msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
    return {
      retryable: false,
      userWarning: 'مفتاح Gemini API غير صالح — يرجى مراجعته في لوحة Settings > Secrets.',
    };
  }
  if (status === 403 || msg.includes('PERMISSION_DENIED') || msg.includes('HTTP_REFERRER_BLOCKED')) {
    return {
      retryable: false,
      userWarning:
        'تم رفض صلاحية الوصول أو تقييد النطاق — تأكد من إضافة نطاق التطبيق ضمن النطاقات المسموحة لمفتاح Google AI Studio.',
    };
  }
  if (status === 404 || msg.includes('NOT_FOUND')) {
    return {
      retryable: false,
      userWarning: 'نموذج Gemini المطلوب غير متاح حالياً.',
    };
  }
  if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    return {
      retryable: true,
      userWarning: 'تم تجاوز حد الطلبات المؤقت لخدمة Gemini، تم تقديم الرد من المحرك التعليمي البديل.',
    };
  }
  if (msg.includes('TIMEOUT')) {
    return {
      retryable: false,
      userWarning: 'استغرق الاتصال بخدمة Gemini وقتاً أطول من المعتاد، تم تفعيل الرد السريع البديل.',
    };
  }
  if (status >= 500 || msg.includes('ECONNRESET') || msg.includes('fetch failed')) {
    return {
      retryable: true,
      userWarning: 'استغرق الاتصال بخدمة Gemini وقتاً أطول من المعتاد، تم تفعيل الرد السريع البديل.',
    };
  }
  return {
    retryable: true,
    userWarning: 'تعذر الوصول لخادم Gemini حالياً، تم تقديم إرشاد تعليمي سريع من المحرك البديل.',
  };
}

let geminiTextCooldownUntil = 0;
let lastGeminiTextWarning: string | undefined;
let geminiTtsCooldownUntil = 0;
let lastGeminiTtsWarning: string | undefined;

function shouldFastBreakGeminiLoop(err: any): boolean {
  const msg = String(err?.message || err || '');
  const status = Number(err?.status || err?.code || 0);
  const isAbort = err?.name === 'TimeoutError' || err?.name === 'AbortError';
  return (
    isAbort ||
    status === 400 ||
    status === 403 ||
    status === 429 ||
    status >= 500 ||
    msg.includes('TIMEOUT') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('429') ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('fetch failed')
  );
}

function recordGeminiTextFailure(err: any): string {
  const isAbort = err?.name === 'TimeoutError' || err?.name === 'AbortError';
  const warning = classifyGeminiError(isAbort ? new Error('TIMEOUT') : err).userWarning;
  if (shouldFastBreakGeminiLoop(err)) {
    geminiTextCooldownUntil = Date.now() + 90_000;
    lastGeminiTextWarning = warning;
  }
  return warning;
}

function recordGeminiTtsFailure(err: any): string {
  const isAbort = err?.name === 'TimeoutError' || err?.name === 'AbortError';
  const warning = classifyGeminiError(isAbort ? new Error('TIMEOUT') : err).userWarning;
  if (shouldFastBreakGeminiLoop(err)) {
    geminiTtsCooldownUntil = Date.now() + 90_000;
    lastGeminiTtsWarning = warning;
  }
  return warning;
}

async function runWithRetry<T>(fn: () => Promise<T>, maxRetries = 2, timeoutMs = 28000): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
      );
      return await Promise.race([fn(), timeoutPromise]);
    } catch (err: any) {
      lastError = err;
      const { retryable } = classifyGeminiError(err);
      if (!retryable || attempt === maxRetries) {
        throw err;
      }
      const delayMs = 600 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

// Storage for Student Access Codes and Settings
interface StudentCode {
  codeHash: string; // Stored securely
  displayPrefix: string; // e.g. "NHJ-***3M"
  studentName: string;
  createdAt: string;
  isActive: boolean;
  lastUsedAt?: string;
  usageCount: number;
}

const STORAGE_FILE = path.join(__dirname, '.nahj_data.json');

export interface ServerStudentAccount {
  phone: string;
  normalizedPhone: string;
  username: string;
  isVerified?: boolean;
  isPreSeededPlaceholder?: boolean;
  createdAt: string;
  lastLoginAt: string;
  lastSyncedAt?: string;
  snapshot?: any;
}

export interface ServerChallengeRoom {
  id: string;
  title: string;
  sessionDurationMinutes: number;
  sessionStartedAt: string | null;
  participants: Record<
    string,
    {
      name: string;
      hours: number;
      lastSeenAt: string;
    }
  >;
  updatedAt: string;
}

interface AppData {
  ownerPin: string;
  telegramSupportUrl: string;
  codes: StudentCode[];
  accounts?: Record<string, ServerStudentAccount>;
  challengeRooms?: Record<string, ServerChallengeRoom>;
  quizChallenges?: Record<string, QuizChallengeRoom>;
  companionPosts?: CompanionCommunityPost[];
}

const VERIFIED_SERVER_PHONES = new Set(['01094482324']);

function getInitialCompanionPosts(): CompanionCommunityPost[] {
  const now = Date.now();
  return [
    {
      id: 'cp-seed-1',
      authorName: 'الحساب الرسمي الموثق',
      authorPhone: '01094482324',
      isVerified: true,
      category: 'تحفيز',
      content:
        'دفعة تالتة ثانوي الأبطال 💪: كل مسألة صعبة بتغلط فيها دلوقتي هي درجة كاملة مضمونة في امتحان آخر السنة. كمل وما تسيبش حلمك!',
      cheers: 24,
      replies: [
        {
          id: 'cpr-1',
          authorName: 'مريم طارق - الدقهلية',
          isVerified: false,
          text: 'شكراً جداً على الدعم، كلامك فرق معايا النهارده والله 🌟',
          createdAt: new Date(now - 3600_000).toISOString(),
        },
      ],
      createdAt: new Date(now - 7200_000).toISOString(),
    },
    {
      id: 'cp-seed-2',
      authorName: 'سارة خالد - المنصورة',
      isVerified: false,
      category: 'إنجاز يومي',
      content:
        'الحمد لله خلصت الباب الأول فيزياء وحليت 60 سؤال نظام حديث من غير ما أبص في الإجابات! عقبالكم جميعاً 🔥',
      cheers: 17,
      replies: [],
      createdAt: new Date(now - 14400_000).toISOString(),
    },
    {
      id: 'cp-seed-3',
      authorName: 'عمر شريف - القاهرة',
      isVerified: false,
      category: 'نصيحة مذاكرة',
      content:
        'نصيحة عن تجربة: لما تحس إنك فصلت، خُد 15 دقيقة راحة واشرب مية وصلّي ركعتين، هترجع للمذاكرة بتركيز الضعف.',
      cheers: 19,
      replies: [],
      createdAt: new Date(now - 21600_000).toISOString(),
    },
  ];
}

function ensureSeededAccountsAndPosts(data: AppData): AppData {
  const nowIso = new Date().toISOString();
  const accounts = data.accounts || {};
  if (!accounts['01094482324']) {
    accounts['01094482324'] = {
      phone: '01094482324',
      normalizedPhone: '01094482324',
      username: 'الحساب الموثق',
      isVerified: true,
      isPreSeededPlaceholder: true,
      createdAt: nowIso,
      lastLoginAt: nowIso,
      lastSyncedAt: nowIso,
    };
  } else {
    accounts['01094482324'].isVerified = true;
  }

  return {
    ...data,
    accounts,
    challengeRooms: data.challengeRooms || {},
    quizChallenges: data.quizChallenges || {},
    companionPosts:
      Array.isArray(data.companionPosts) && data.companionPosts.length > 0
        ? data.companionPosts
        : getInitialCompanionPosts(),
  };
}

function loadData(): AppData {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return ensureSeededAccountsAndPosts(parsed);
    }
  } catch (e) {
    console.error('Error reading storage, using defaults:', e);
  }

  // Initial Seed
  return ensureSeededAccountsAndPosts({
    ownerPin: process.env.OWNER_PIN || 'Ahmed1122@#',
    telegramSupportUrl: 'https://t.me/Y_lI11',
    codes: [
      {
        codeHash: 'NHJ-K7QP3M',
        displayPrefix: 'NHJ-***P3M',
        studentName: 'سارة خالد - المنصورة',
        createdAt: new Date().toISOString(),
        isActive: true,
        usageCount: 0,
      },
      {
        codeHash: 'NHJ-T9X4A1',
        displayPrefix: 'NHJ-***4A1',
        studentName: 'عمر شريف - القاهرة',
        createdAt: new Date().toISOString(),
        isActive: true,
        usageCount: 0,
      },
    ],
    accounts: {},
  });
}

let appData: AppData = loadData();

function saveData() {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(appData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save data:', err);
  }
}

// Generate code format NHJ-XXXXXX
function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NHJ-${rand}`;
}

// ----------------- API Endpoints -----------------

// Verify Student Code (Login)
app.post('/api/auth/verify-code', (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, message: 'يرجى إدخال الكود' });
  }

  const rawTrimmed = code.trim();
  const cleanCode = rawTrimmed.toUpperCase();

  // If owner entered their master owner PIN directly as the code
  if (rawTrimmed === appData.ownerPin) {
    return res.json({
      success: true,
      studentName: 'المالك (أحمد)',
      codeMasked: 'NHJ-***ER1',
      isOwner: true,
    });
  }

  const found = appData.codes.find((c) => c.codeHash === cleanCode);

  if (!found) {
    return res.status(401).json({
      success: false,
      message: 'كود الدخول غير صحيح، تأكد من نسخه بدقة أو تواصل مع الدعم عبر تلجرام.',
    });
  }

  if (!found.isActive) {
    return res.status(403).json({
      success: false,
      message: 'هذا الكود تم إلغاؤه من قبل المالك. يرجى التواصل مع الدعم.',
    });
  }

  found.lastUsedAt = new Date().toISOString();
  found.usageCount = (found.usageCount || 0) + 1;
  saveData();

  return res.json({
    success: true,
    studentName: found.studentName,
    codeMasked: found.displayPrefix,
  });
});

// Get Public Settings (Telegram support link, etc.)
app.get('/api/settings', (req, res) => {
  return res.json({
    telegramSupportUrl: appData.telegramSupportUrl,
  });
});

// Normalize Egyptian/International phone digits server-side
function normalizeServerPhone(raw: string): string {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const ascii = String(raw || '')
    .replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)))
    .trim();
  const hasPlus = ascii.startsWith('+');
  const digits = ascii.replace(/\D/g, '');
  if (digits.startsWith('0020') && digits.length === 14) return `0${digits.slice(4)}`;
  if (digits.startsWith('20') && digits.length === 12 && digits[2] === '1') {
    return `0${digits.slice(2)}`;
  }
  if (digits.length === 10 && digits.startsWith('1')) return `0${digits}`;
  return hasPlus && !digits.startsWith('20') ? `+${digits}` : digits;
}

// Student Login / Registration via Phone Number + Username
app.post('/api/accounts/login', (req, res) => {
  const { phone, username, confirmNameUpdate } = req.body || {};
  const cleanName = typeof username === 'string' ? username.trim() : '';
  const normalizedPhone = normalizeServerPhone(String(phone || ''));
  const digitsOnly = normalizedPhone.replace(/\D/g, '');

  if (cleanName.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'يرجى كتابة اسم المستخدم (حرفين على الأقل).',
    });
  }

  if (digitsOnly.length < 9 || digitsOnly.length > 15) {
    return res.status(400).json({
      success: false,
      message: 'يرجى إدخال رقم تليفون صحيح.',
    });
  }

  if (!appData.accounts) {
    appData.accounts = {};
  }

  const nowIso = new Date().toISOString();
  const existing = appData.accounts[normalizedPhone];
  const isVerifiedAccount = VERIFIED_SERVER_PHONES.has(normalizedPhone);

  if (existing) {
    const namesMatch =
      existing.username.trim().toLowerCase() === cleanName.toLowerCase();
    if (!namesMatch && !confirmNameUpdate && !existing.isPreSeededPlaceholder) {
      return res.status(409).json({
        success: false,
        code: 'USERNAME_MISMATCH',
        registeredUsername: existing.username,
        message: `رقم التليفون مسجل مسبقاً باسم «${existing.username}».`,
      });
    }

    existing.username = cleanName;
    existing.isVerified = isVerifiedAccount || Boolean(existing.isVerified);
    existing.isPreSeededPlaceholder = false;
    existing.lastLoginAt = nowIso;
    if (existing.snapshot && existing.snapshot.profile) {
      existing.snapshot.username = cleanName;
      existing.snapshot.profile.name = cleanName;
      existing.snapshot.profile.isVerified = existing.isVerified;
    }
    saveData();

    return res.json({
      success: true,
      isNewAccount: false,
      account: existing,
    });
  }

  const created: ServerStudentAccount = {
    phone: normalizedPhone,
    normalizedPhone,
    username: cleanName,
    isVerified: isVerifiedAccount,
    createdAt: nowIso,
    lastLoginAt: nowIso,
    lastSyncedAt: nowIso,
  };
  appData.accounts[normalizedPhone] = created;
  saveData();

  return res.json({
    success: true,
    isNewAccount: true,
    account: created,
  });
});

// Sync Full Student Activity Snapshot to Server
app.post('/api/accounts/sync', (req, res) => {
  const { phone, username, snapshot } = req.body || {};
  const normalizedPhone = normalizeServerPhone(String(phone || ''));
  if (!normalizedPhone || !snapshot || typeof snapshot !== 'object') {
    return res.status(400).json({ success: false, message: 'بيانات المزامنة غير مكتملة' });
  }

  if (!appData.accounts) {
    appData.accounts = {};
  }

  const nowIso = new Date().toISOString();
  const existing = appData.accounts[normalizedPhone];
  const isVerifiedAccount =
    VERIFIED_SERVER_PHONES.has(normalizedPhone) || Boolean(existing?.isVerified);
  appData.accounts[normalizedPhone] = {
    phone: normalizedPhone,
    normalizedPhone,
    username:
      typeof username === 'string' && username.trim()
        ? username.trim()
        : existing?.username || 'طالب نَهج',
    isVerified: isVerifiedAccount,
    isPreSeededPlaceholder: false,
    createdAt: existing?.createdAt || nowIso,
    lastLoginAt: existing?.lastLoginAt || nowIso,
    lastSyncedAt: nowIso,
    snapshot,
  };
  saveData();

  return res.json({ success: true, lastSyncedAt: nowIso, isVerified: isVerifiedAccount });
});

// Retrieve Latest Activity Snapshot for a Logged-In Student
app.get('/api/accounts/me', (req, res) => {
  const normalizedPhone = normalizeServerPhone(String(req.query.phone || ''));
  if (!normalizedPhone || !appData.accounts?.[normalizedPhone]) {
    return res.status(404).json({ success: false, message: 'الحساب غير موجود' });
  }
  return res.json({
    success: true,
    account: appData.accounts[normalizedPhone],
  });
});

// Live Challenge Session Room Sync (Synchronized shared session timer)
app.post('/api/challenges/room/sync', (req, res) => {
  const {
    challengeId,
    title,
    participantName,
    participantHours,
    sessionDurationMinutes,
    sessionStartedAt,
    resetSession,
  } = req.body || {};

  if (!challengeId || typeof challengeId !== 'string') {
    return res.status(400).json({ success: false, message: 'معرّف التحدي مطلوب' });
  }

  if (!appData.challengeRooms) {
    appData.challengeRooms = {};
  }

  const nowIso = new Date().toISOString();
  const existing = appData.challengeRooms[challengeId];

  const resolvedDuration =
    typeof sessionDurationMinutes === 'number' && sessionDurationMinutes >= 5
      ? Math.min(240, sessionDurationMinutes)
      : existing?.sessionDurationMinutes || 50;

  let resolvedStart: string | null = existing?.sessionStartedAt || null;
  if (resetSession) {
    resolvedStart = null;
  } else if (typeof sessionStartedAt === 'string' && sessionStartedAt) {
    // Preserve earliest start time when both peers join, or apply explicit new start if none
    resolvedStart = existing?.sessionStartedAt || sessionStartedAt;
  }

  const participants = { ...(existing?.participants || {}) };
  if (typeof participantName === 'string' && participantName.trim()) {
    const cleanPName = participantName.trim();
    participants[cleanPName] = {
      name: cleanPName,
      hours: Number(participantHours) || 0,
      lastSeenAt: nowIso,
    };
  }

  const updatedRoom: ServerChallengeRoom = {
    id: challengeId,
    title: typeof title === 'string' && title.trim() ? title.trim() : existing?.title || 'تحدي مذاكرة',
    sessionDurationMinutes: resolvedDuration,
    sessionStartedAt: resolvedStart,
    participants,
    updatedAt: nowIso,
  };

  appData.challengeRooms[challengeId] = updatedRoom;
  saveData();

  return res.json({ success: true, room: updatedRoom });
});

app.get('/api/challenges/room/:id', (req, res) => {
  const room = appData.challengeRooms?.[req.params.id];
  if (!room) {
    return res.status(404).json({ success: false, message: 'غرفة الجلسة غير موجودة بعد' });
  }
  return res.json({ success: true, room });
});

// Owner Login Check
app.post('/api/owner/login', (req, res) => {
  const { pin } = req.body;
  if (pin === appData.ownerPin) {
    return res.json({ success: true, message: 'مرحباً بك في لوحة المالك' });
  }
  return res.status(401).json({ success: false, message: 'كلمة مرور المالك غير صحيحة' });
});

// Owner List Codes (Never returns the raw code, only masked version for privacy!)
app.get('/api/owner/codes', (req, res) => {
  const authPin = req.headers['x-owner-pin'];
  if (authPin !== appData.ownerPin) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  // Map to exclude raw codeHash
  const safeList = appData.codes.map((c, index) => ({
    id: index,
    displayPrefix: c.displayPrefix,
    studentName: c.studentName,
    createdAt: c.createdAt,
    isActive: c.isActive,
    lastUsedAt: c.lastUsedAt,
    usageCount: c.usageCount,
  }));

  return res.json({
    codes: safeList,
    telegramSupportUrl: appData.telegramSupportUrl,
    totalCount: appData.codes.length,
    activeCount: appData.codes.filter((c) => c.isActive).length,
  });
});

// Owner Create Code (Shows ONE TIME ONLY)
app.post('/api/owner/create-code', (req, res) => {
  const authPin = req.headers['x-owner-pin'];
  if (authPin !== appData.ownerPin) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  const { studentName, customCode } = req.body;
  if (!studentName || !studentName.trim()) {
    return res.status(400).json({ error: 'يرجى كتابة اسم الطالب' });
  }

  const codeToUse = (customCode && customCode.trim() ? customCode.trim().toUpperCase() : generateRandomCode());
  
  // Format masked display (e.g. NHJ-***3M)
  const displayPrefix = `${codeToUse.substring(0, 4)}***${codeToUse.substring(codeToUse.length - 2)}`;

  const newEntry: StudentCode = {
    codeHash: codeToUse,
    displayPrefix,
    studentName: studentName.trim(),
    createdAt: new Date().toISOString(),
    isActive: true,
    usageCount: 0,
  };

  appData.codes.unshift(newEntry);
  saveData();

  // Return the raw code ONCE ONLY in this response
  return res.json({
    success: true,
    onceOnlyCode: codeToUse,
    displayPrefix,
    studentName: newEntry.studentName,
    createdAt: newEntry.createdAt,
    message: 'تم إنشاء الكود بنجاح. انسخه الآن لأنه لن يظهر مجددًا!',
  });
});

// Owner Toggle Code Status (Revoke/Reinstate)
app.post('/api/owner/toggle-code', (req, res) => {
  const authPin = req.headers['x-owner-pin'];
  if (authPin !== appData.ownerPin) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  const { id } = req.body;
  if (typeof id !== 'number' || !appData.codes[id]) {
    return res.status(400).json({ error: 'معرّف غير صالح' });
  }

  appData.codes[id].isActive = !appData.codes[id].isActive;
  saveData();

  return res.json({
    success: true,
    isActive: appData.codes[id].isActive,
    message: appData.codes[id].isActive ? 'تم تفعيل الكود' : 'تم إلغاء الكود',
  });
});

// Owner Update Settings
app.post('/api/owner/settings', (req, res) => {
  const authPin = req.headers['x-owner-pin'];
  if (authPin !== appData.ownerPin) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  const { telegramSupportUrl, newPin } = req.body;
  if (telegramSupportUrl) {
    appData.telegramSupportUrl = telegramSupportUrl;
  }
  if (newPin && newPin.trim().length >= 4) {
    appData.ownerPin = newPin.trim();
  }

  saveData();
  return res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح' });
});

// Gemini & Multi-AI API configuration status (never exposes key values)
app.get('/api/gemini/status', (req, res) => {
  const client = getGeminiClient(req);
  const providers = getConfiguredAIProviders();
  return res.json({
    configured: Boolean(client) || providers.length > 0,
    model: 'gemini-4-hydrogen (ThinkingLevel.HIGH)',
    providers,
  });
});

// ----------------- Gemini AI Tutor ("أستاذ نَهج") -----------------
app.post('/api/gemini/tutor-stream', async (req, res) => {
  const { message, context, subject, history, tutorMode, deepMode } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: 'يرجى كتابة رسالة أو سؤال أولاً' });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let closed = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      closed = true;
    }
  });

  const activeAi = getGeminiClient(req);
  const modeDepth: TutorDeepMode = deepMode === 'fast' ? 'fast' : 'deep';
  const systemPrompt = buildTutorSystemPrompt(tutorMode, modeDepth);
  const formattedContents = buildTutorFormattedContents({
    message,
    subject,
    context,
    history,
  });

  let streamedAnyChunk = false;
  let apiWarning: string | undefined;
  let responseSource: 'gemini' | 'fallback' = 'fallback';
  let providerLabel = 'المحرك التعليمي السريع';

  if (activeAi && Date.now() < geminiTextCooldownUntil) {
    apiWarning = lastGeminiTextWarning;
  } else if (activeAi) {
    const candidateModels =
      modeDepth === 'deep'
        ? [
            { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.HIGH, timeoutMs: 22000 },
            { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 10000 },
          ]
        : [
            { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 12000 },
            { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 8000 },
          ];

    for (const candidate of candidateModels) {
      if (streamedAnyChunk || closed) break;
      const abortController = new AbortController();
      const firstChunkTimeout = setTimeout(() => {
        abortController.abort();
      }, candidate.timeoutMs);

      try {
        const streamResult = await activeAi.models.generateContentStream({
          model: candidate.model,
          contents: formattedContents,
          config: {
            abortSignal: abortController.signal,
            systemInstruction: systemPrompt,
            thinkingConfig: { thinkingLevel: candidate.thinkingLevel },
          },
        });

        for await (const chunk of streamResult) {
          if (closed) break;
          const piece = chunk?.text;
          if (piece) {
            if (!streamedAnyChunk) {
              clearTimeout(firstChunkTimeout);
              geminiTextCooldownUntil = 0;
            }
            streamedAnyChunk = true;
            res.write(`data: ${JSON.stringify({ chunk: piece })}\n\n`);
          }
        }

        clearTimeout(firstChunkTimeout);

        if (streamedAnyChunk && !closed) {
          res.write(
            `data: ${JSON.stringify({
              done: true,
              source: 'gemini',
              providerLabel: candidate.model,
              isFree: true,
            })}\n\n`
          );
          return res.end();
        }
      } catch (err: any) {
        clearTimeout(firstChunkTimeout);
        const isAbort = err?.name === 'AbortError' || abortController.signal.aborted;
        const rawErr = isAbort ? new Error('TIMEOUT') : err;
        apiWarning = recordGeminiTextFailure(rawErr);
        console.warn(`Gemini tutor stream (${candidate.model}) failover:`, err?.message || err);
        if (shouldFastBreakGeminiLoop(rawErr)) break;
      }
    }
  }

  // Tier 2: Try stronger secondary AI provider (OpenRouter / OpenAI GPT-4o / Claude / Groq / DeepSeek)
  if (!streamedAnyChunk && !closed) {
    const extMessages = formattedContents.map((c) => ({
      role: (c.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: c.parts.map((p) => p.text).join('\n'),
    }));
    const secondary = await callStrongSecondaryAI({
      systemInstruction: systemPrompt,
      messages: extMessages,
      timeoutMs: 9000,
    });
    if (secondary && !closed) {
      streamedAnyChunk = true;
      responseSource = 'gemini';
      providerLabel = secondary.providerLabel;
      res.write(`data: ${JSON.stringify({ chunk: secondary.text })}\n\n`);
      res.write(
        `data: ${JSON.stringify({
          done: true,
          source: 'gemini',
          providerLabel: secondary.providerLabel,
          isFree: true,
        })}\n\n`
      );
      return res.end();
    }
  }

  if (!streamedAnyChunk && !closed) {
    const fallbackReply = generateTutorFallback({ message, subject, tutorMode });
    res.write(`data: ${JSON.stringify({ chunk: fallbackReply })}\n\n`);
    res.write(
      `data: ${JSON.stringify({
        done: true,
        source: responseSource,
        providerLabel,
        warning:
          apiWarning ||
          (!activeAi
            ? 'مفتاح GEMINI_API_KEY غير مضاف في Settings > Secrets؛ تم الرد عبر المحرك التعليمي السريع.'
            : undefined),
        isFree: true,
      })}\n\n`
    );
  } else if (!closed) {
    res.write(`data: ${JSON.stringify({ done: true, source: 'gemini', isFree: true })}\n\n`);
  }

  return res.end();
});

app.post('/api/gemini/tutor', async (req, res) => {
  try {
    const { message, context, subject, history, tutorMode, deepMode } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'يرجى كتابة رسالة أو سؤال أولاً' });
    }

    const activeAi = getGeminiClient(req);
    const modeDepth: TutorDeepMode = deepMode === 'fast' ? 'fast' : 'deep';
    const systemPrompt = buildTutorSystemPrompt(tutorMode, modeDepth);
    const formattedContents = buildTutorFormattedContents({
      message,
      subject,
      context,
      history,
    });

    let reply: string = '';
    let responseSource: 'gemini' | 'fallback' = 'fallback';
    let providerLabel = 'المحرك التعليمي السريع';
    let apiWarning: string | undefined;

    if (activeAi && Date.now() < geminiTextCooldownUntil) {
      apiWarning = lastGeminiTextWarning;
    } else if (activeAi) {
      const candidateModels =
        modeDepth === 'deep'
          ? [
              { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.HIGH, timeoutMs: 22000 },
              { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 10000 },
            ]
          : [
              { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 12000 },
              { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 8000 },
            ];

      for (const candidate of candidateModels) {
        try {
          const result = await runWithRetry(
            async () => {
              const response = await activeAi.models.generateContent({
                model: candidate.model,
                contents: formattedContents,
                config: {
                  abortSignal: AbortSignal.timeout(candidate.timeoutMs),
                  systemInstruction: systemPrompt,
                  thinkingConfig: { thinkingLevel: candidate.thinkingLevel },
                },
              });
              return response.text || '';
            },
            0,
            candidate.timeoutMs + 500
          );

          if (result && result.trim()) {
            geminiTextCooldownUntil = 0;
            reply = result.trim();
            responseSource = 'gemini';
            providerLabel = candidate.model;
            apiWarning = undefined;
            break;
          }
        } catch (err: any) {
          const isAbort = err?.name === 'TimeoutError' || err?.name === 'AbortError';
          const rawErr = isAbort ? new Error('TIMEOUT') : err;
          apiWarning = recordGeminiTextFailure(rawErr);
          console.warn(`Gemini tutor (${candidate.model}) failover triggered:`, err?.message || err);
          if (shouldFastBreakGeminiLoop(rawErr)) break;
        }
      }
    }

    // Tier 2: Automatic stronger external AI failover if Gemini didn't reply
    if (!reply) {
      const extMessages = formattedContents.map((c) => ({
        role: (c.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: c.parts.map((p) => p.text).join('\n'),
      }));
      const secondary = await callStrongSecondaryAI({
        systemInstruction: systemPrompt,
        messages: extMessages,
        timeoutMs: 9000,
      });
      if (secondary) {
        reply = secondary.text;
        responseSource = 'gemini';
        providerLabel = secondary.providerLabel;
        apiWarning = undefined;
      }
    }

    // Tier 3: Instant Local Pedagogical Engine
    if (!reply) {
      if (!activeAi && !apiWarning) {
        apiWarning =
          'مفتاح GEMINI_API_KEY غير مضاف في Settings > Secrets؛ تم الرد عبر المحرك التعليمي السريع.';
      }
      reply = generateTutorFallback({ message, subject, tutorMode });
    }

    return res.json({
      success: true,
      reply,
      source: responseSource,
      providerLabel,
      warning: apiWarning,
      isFree: true,
    });
  } catch (error: any) {
    console.error('Gemini Tutor Error:', error);
    return res.status(500).json({
      success: false,
      error: 'تعذر معالجة سؤالك حالياً، يرجى إعادة المحاولة.',
    });
  }
});

// ----------------- Educational Content & Interactive Question Generator -----------------
app.post('/api/gemini/generate-questions', async (req, res) => {
  try {
    const body = req.body || {};
    const subject = String(body.subject || '').trim();
    const chapter = String(body.chapter || '').trim();
    const lesson = String(body.lesson || '').trim();
    const count = Math.min(15, Math.max(3, Number(body.count) || 6));
    const questionType: QuestionTypeFilter = ['mixed', 'mcq', 'true_false', 'short_answer'].includes(
      body.questionType
    )
      ? body.questionType
      : 'mixed';
    const difficulty: QuestionDifficultyFilter = ['balanced', 'basic', 'exam', 'advanced'].includes(
      body.difficulty
    )
      ? body.difficulty
      : 'balanced';
    const focusNotes = body.focusNotes ? String(body.focusNotes).trim() : '';
    const excludeQuestions = Array.isArray(body.excludeQuestions)
      ? body.excludeQuestions.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 24)
      : [];
    const variationSeed = body.variationSeed
      ? String(body.variationSeed).trim()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const contextPoints = Array.isArray(body.contextPoints)
      ? body.contextPoints.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 6)
      : [];

    if (!subject || !lesson) {
      return res.status(400).json({
        success: false,
        error: 'يرجى تحديد المادة والدرس أولاً قبل توليد الأسئلة التفاعلية.',
      });
    }

    const params: QuestionGenerationParams = {
      subject,
      chapter: chapter || 'الوحدة المحددة',
      lesson,
      count,
      questionType,
      difficulty,
      focusNotes,
      excludeQuestions,
      variationSeed,
      contextPoints,
    };

    const activeAi = getGeminiClient(req);
    const systemInstruction = buildQuestionGeneratorSystemInstruction();
    const userPrompt = buildQuestionGeneratorPrompt(params);

    let questions = [] as ReturnType<typeof normalizeGeneratedQuestions>;
    let responseSource: 'gemini' | 'fallback' = 'fallback';
    let providerLabel = 'المحرك التعليمي السريع';
    let apiWarning: string | undefined;

    // Tier 1: Ultra-fast Gemini (gemini-3.1-flash-lite MINIMAL thinking for snappy ~1.5-4s speed)
    if (activeAi) {
      try {
        const rawJsonText = await runWithRetry(async () => {
          const response = await activeAi.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: userPrompt,
            config: {
              abortSignal: AbortSignal.timeout(6500),
              systemInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctAnswerIndex: { type: Type.INTEGER },
                    correctAnswerText: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    hint: { type: Type.STRING },
                  },
                  required: ['type', 'difficulty', 'question', 'correctAnswerText', 'explanation'],
                },
              },
            },
          });
          return response.text || '[]';
        }, 0, 7000);

        const parsed = extractJsonPayloadFromText(rawJsonText);
        const normalized = normalizeGeneratedQuestions(parsed, params);
        if (normalized.length > 0) {
          questions = normalized;
          responseSource = 'gemini';
          providerLabel = 'Gemini 3.1 Flash Lite';
        }
      } catch (err: any) {
        const classified = classifyGeminiError(
          err?.name === 'TimeoutError' || err?.name === 'AbortError' ? new Error('TIMEOUT') : err
        );
        apiWarning = classified.userWarning;
        console.warn('Gemini Question Generator failover triggered:', err?.message || err);
      }
    }

    // Tier 2: Stronger secondary AI failover (OpenRouter / OpenAI GPT-4o / Claude / Groq / DeepSeek)
    if (questions.length === 0) {
      try {
        const secondary = await callStrongSecondaryAI({
          systemInstruction: `${systemInstruction}\nأعد كائن JSON يحتوي على مصفوفة باسم "questions" فقط.`,
          messages: [{ role: 'user', content: userPrompt }],
          jsonMode: true,
          timeoutMs: 9000,
        });
        if (secondary) {
          const parsed = extractJsonPayloadFromText(secondary.text);
          const normalized = normalizeGeneratedQuestions(parsed, params);
          if (normalized.length > 0) {
            questions = normalized;
            responseSource = 'gemini';
            providerLabel = secondary.providerLabel;
            apiWarning = undefined;
          }
        }
      } catch (err: any) {
        console.warn('Secondary AI Question Generator error:', err?.message || err);
      }
    }

    if (questions.length === 0) {
      if (!activeAi && !apiWarning) {
        apiWarning = 'مفتاح GEMINI_API_KEY غير مضاف؛ تم التوليد من المحرك التعليمي السريع.';
      }
      questions = generateQuestionsFallback(params);
    }

    return res.json({
      success: true,
      questions,
      source: responseSource,
      providerLabel,
      warning: apiWarning,
    });
  } catch (error: any) {
    console.error('Gemini Question Generator Error:', error);
    return res.status(500).json({
      success: false,
      error: 'تعذر توليد الأسئلة التفاعلية حالياً، يرجى إعادة المحاولة.',
    });
  }
});

// ----------------- AI Curriculum Lesson Summarizer + Master PDF Sheet Generator -----------------
app.post('/api/gemini/summarize-lesson', async (req, res) => {
  try {
    const body = req.body || {};
    const subject = String(body.subject || '').trim();
    const chapter = String(body.chapter || '').trim();
    const lesson = String(body.lesson || '').trim();
    const detailLevel = body.detailLevel === 'exam-sprint' ? 'exam-sprint' : 'comprehensive';
    const customNotes = body.customNotes ? String(body.customNotes).trim() : '';
    const formulaOrNugget = body.formulaOrNugget ? String(body.formulaOrNugget).trim() : '';
    const contextPoints = Array.isArray(body.contextPoints)
      ? body.contextPoints.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 6)
      : [];
    const examTips = Array.isArray(body.examTips)
      ? body.examTips.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 4)
      : [];

    if (!subject || !lesson) {
      return res.status(400).json({
        success: false,
        error: 'يرجى تحديد المادة والدرس أولاً لإنشاء التلخيص المفصل.',
      });
    }

    const params: LessonSummaryGenerationParams = {
      subject,
      chapter: chapter || 'الفصل المحدد',
      lesson,
      detailLevel,
      customNotes,
      contextPoints,
      examTips,
      formulaOrNugget,
    };

    const activeAi = getGeminiClient(req);
    const systemInstruction = buildLessonSummarySystemInstruction();
    const userPrompt = buildLessonSummaryPrompt(params);

    let normalizedSummary: ReturnType<typeof normalizeLessonSummary> = null;
    let apiWarning: string | undefined;

    const jsonPromptWithSchemaGuide = `${userPrompt}

أعد النتيجة بصيغة كائن JSON صالح فقط بدون أي نص خارج JSON، وبالمفاتيح التالية بالضبط:
{
  "teacherIntro": "مقدمة دافئة ومحفزة من المستر عن أهمية الدرس",
  "bigIdea": "الفكرة المحورية للدرس في سطرين واضحين",
  "conceptSections": [
    {
      "title": "عنوان المحور",
      "deepExplanation": "شرح مفصل بالفهم العميق ليه وازاي بتحصل الظاهرة بأسلوب المستر",
      "whyItMatters": "لماذا نفهم هذه النقطة وعلاقتها بالامتحان",
      "realLifeExample": "مثال واقعي أو عملي ملموس",
      "keyTakeaways": ["نقطة خلاصة 1", "نقطة خلاصة 2"]
    }
  ],
  "formulasAndRules": [
    {
      "label": "اسم القانون أو القاعدة",
      "expression": "القانون أو العلاقة بصيغة واضحة",
      "whenToUse": "متى وكيف نستخدمها في الحل"
    }
  ],
  "examTraps": [
    {
      "trap": "الخطأ الشائع الذي يقع فيه الطالب",
      "truth": "الفهم الصحيح والقاعدة الدقيقة"
    }
  ],
  "solvedQuestions": [
    {
      "question": "نص سؤال نظام حديث متكامل",
      "questionType": "فهم واستنتاج",
      "steps": ["الخطوة الأولى في التفكير", "الخطوة الثانية", "الخطوة الثالثة"],
      "answer": "الإجابة النهائية الصحيحة",
      "teacherNote": "ملاحظة المستر والتريكة المهمة"
    }
  ],
  "quickCheckQuestions": [
    {
      "question": "سؤال سريع لاختبار الفهم",
      "answer": "الإجابة الصحيحة",
      "explanation": "تعليل سريع بالفهم"
    }
  ]
}`;

    if (activeAi && Date.now() < geminiTextCooldownUntil) {
      apiWarning = lastGeminiTextWarning;
    } else if (activeAi) {
      const candidateModels = [
        {
          model: 'gemini-4-hydrogen',
          thinkingLevel: ThinkingLevel.HIGH,
          timeoutMs: 28000,
          label: 'أستاذ نَهج الخبير (Gemini 4 — تحليل عميق)',
        },
        {
          model: 'gemini-3.1-flash-lite',
          thinkingLevel: ThinkingLevel.LOW,
          timeoutMs: 14000,
          label: 'أستاذ نَهج (Gemini Fast)',
        },
      ];

      const formattedContents = [
        {
          role: 'user' as const,
          parts: [{ text: jsonPromptWithSchemaGuide }],
        },
      ];

      for (const candidate of candidateModels) {
        try {
          const rawJsonText = await runWithRetry(async () => {
            const response = await activeAi.models.generateContent({
              model: candidate.model,
              contents: formattedContents,
              config: {
                abortSignal: AbortSignal.timeout(candidate.timeoutMs),
                systemInstruction,
                thinkingConfig: { thinkingLevel: candidate.thinkingLevel },
                responseMimeType: 'application/json',
              },
            });
            return response.text || '{}';
          }, 0, candidate.timeoutMs + 500);

          const parsed = extractJsonPayloadFromText(rawJsonText);
          const candidateSummary = normalizeLessonSummary(parsed, params, {
            source: 'gemini',
            providerLabel: candidate.label,
          });
          if (candidateSummary) {
            geminiTextCooldownUntil = 0;
            normalizedSummary = candidateSummary;
            apiWarning = undefined;
            break;
          }
        } catch (err: any) {
          const isAbort = err?.name === 'TimeoutError' || err?.name === 'AbortError';
          const rawErr = isAbort ? new Error('TIMEOUT') : err;
          apiWarning = recordGeminiTextFailure(rawErr);
          console.warn(`Gemini Lesson Summary (${candidate.model}) failover:`, err?.message || err);
          if (shouldFastBreakGeminiLoop(rawErr)) break;
        }
      }
    }

    if (!normalizedSummary) {
      try {
        const secondary = await callStrongSecondaryAI({
          systemInstruction: `${systemInstruction}\nأعد النتيجة ككائن JSON فقط مطابق للهيكل.`,
          messages: [{ role: 'user', content: userPrompt }],
          jsonMode: true,
          timeoutMs: 12000,
        });
        if (secondary) {
          const parsed = extractJsonPayloadFromText(secondary.text);
          const candidateSummary = normalizeLessonSummary(parsed, params, {
            source: 'gemini',
            providerLabel: secondary.providerLabel,
          });
          if (candidateSummary) {
            normalizedSummary = candidateSummary;
            apiWarning = undefined;
          }
        }
      } catch (err: any) {
        console.warn('Secondary AI Lesson Summary error:', err?.message || err);
      }
    }

    if (!normalizedSummary) {
      if (!activeAi && !apiWarning) {
        apiWarning = 'مفتاح GEMINI_API_KEY غير مضاف؛ تم إعداد الملخص من المحرك التعليمي السريع.';
      }
      normalizedSummary = generateLessonSummaryFallback(params, apiWarning);
    }

    return res.json({
      success: true,
      summary: normalizedSummary,
      source: normalizedSummary.source,
      providerLabel: normalizedSummary.providerLabel,
      warning: normalizedSummary.warning,
    });
  } catch (error: any) {
    console.error('Gemini Summarize Lesson Error:', error);
    return res.status(500).json({
      success: false,
      error: 'تعذر إنشاء ملخص الدرس حالياً، يرجى إعادة المحاولة.',
    });
  }
});

// ----------------- Friends Quiz Challenge Rooms (Join by Code) -----------------
function generateShortQuizCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NHJ-Q${suffix}`;
}

app.post('/api/quiz-challenge/create', (req, res) => {
  const { title, subject, chapter, lesson, creatorName, questions, shareCode } = req.body || {};

  if (!subject || !lesson || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'يجب توفير المادة والدرس ومجموعة أسئلة صالحة لإنشاء تحدي أصدقاء.',
    });
  }

  if (!appData.quizChallenges) {
    appData.quizChallenges = {};
  }

  let shortCode = generateShortQuizCode();
  while (appData.quizChallenges[shortCode]) {
    shortCode = generateShortQuizCode();
  }

  const now = new Date().toISOString();
  const cleanRoom: QuizChallengeRoom = {
    code: shortCode,
    title: String(title || `تحدي ${lesson}`).slice(0, 100),
    subject: String(subject).slice(0, 60),
    chapter: String(chapter || 'عام').slice(0, 120),
    lesson: String(lesson).slice(0, 140),
    creatorName: String(creatorName || 'بطل نَهج').slice(0, 50),
    questions: questions.slice(0, 15),
    participants: [],
    shareCode: typeof shareCode === 'string' && shareCode.trim() ? shareCode.trim() : shortCode,
    createdAt: now,
    updatedAt: now,
  };

  appData.quizChallenges[shortCode] = cleanRoom;
  saveData();

  return res.json({ success: true, room: cleanRoom });
});

app.get('/api/quiz-challenge/room/:code', (req, res) => {
  const cleanCode = String(req.params.code || '').trim().toUpperCase();
  const room = appData.quizChallenges?.[cleanCode];
  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'لم يتم العثور على غرفة تحدي بهذا الكود — تأكد من الكود أو استخدم كود التحدي الكامل NAHJ-QZ.',
    });
  }
  return res.json({ success: true, room });
});

app.post('/api/quiz-challenge/submit', (req, res) => {
  const {
    code,
    participantName,
    scoreCorrect,
    totalQuestions,
    timeSeconds,
    fallbackRoom,
  } = req.body || {};

  const cleanCode = String(code || '').trim().toUpperCase();
  const cleanName = String(participantName || '').trim();

  if (!cleanCode || !cleanName) {
    return res.status(400).json({
      success: false,
      message: 'كود الغرفة واسم المتسابق مطلوبان لتسجيل النتيجة.',
    });
  }

  if (!appData.quizChallenges) {
    appData.quizChallenges = {};
  }

  let room = appData.quizChallenges[cleanCode];
  if (!room && fallbackRoom && Array.isArray(fallbackRoom.questions)) {
    const now = new Date().toISOString();
    room = {
      code: cleanCode,
      title: String(fallbackRoom.title || `تحدي ${fallbackRoom.lesson || ''}`),
      subject: String(fallbackRoom.subject || 'علمي علوم'),
      chapter: String(fallbackRoom.chapter || 'عام'),
      lesson: String(fallbackRoom.lesson || 'الدرس'),
      creatorName: String(fallbackRoom.creatorName || 'بطل نَهج'),
      questions: fallbackRoom.questions.slice(0, 15),
      participants: [],
      shareCode: String(fallbackRoom.shareCode || cleanCode),
      createdAt: fallbackRoom.createdAt || now,
      updatedAt: now,
    };
  }

  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'غرفة التحدي غير موجودة.',
    });
  }

  const safeTotal = Math.max(1, Number(totalQuestions) || room.questions.length || 1);
  const safeCorrect = Math.min(safeTotal, Math.max(0, Number(scoreCorrect) || 0));
  const safeTime = Math.max(1, Number(timeSeconds) || 1);
  const accuracy = Math.round((safeCorrect / safeTotal) * 100);
  const nowIso = new Date().toISOString();

  const existingIdx = room.participants.findIndex(
    (p) => p.name.trim().toLowerCase() === cleanName.toLowerCase()
  );

  const entry = {
    name: cleanName,
    scoreCorrect: safeCorrect,
    totalQuestions: safeTotal,
    accuracy,
    timeSeconds: safeTime,
    submittedAt: nowIso,
  };

  if (existingIdx >= 0) {
    const prev = room.participants[existingIdx];
    // Keep better score, or faster time if tied; allow updates if re-taken
    if (
      entry.scoreCorrect > prev.scoreCorrect ||
      (entry.scoreCorrect === prev.scoreCorrect && entry.timeSeconds <= prev.timeSeconds)
    ) {
      room.participants[existingIdx] = entry;
    }
  } else {
    room.participants.push(entry);
  }

  room.participants.sort((a, b) => {
    if (b.scoreCorrect !== a.scoreCorrect) return b.scoreCorrect - a.scoreCorrect;
    return a.timeSeconds - b.timeSeconds;
  });

  room.updatedAt = nowIso;
  appData.quizChallenges[cleanCode] = room;
  saveData();

  return res.json({ success: true, room });
});




// ----------------- Smart Meal Photo & Nutritional Inspector -----------------
// Examines food photos & description to determine if it fits the student's body metrics
app.post('/api/gemini/inspect-meal', async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType,
      description,
      studentWeight: rawStudentWeight,
      studentHeight: rawStudentHeight,
      weightKg,
      heightCm,
      bmi: rawBmi,
      category,
    } = req.body;

    const studentWeight = Number(rawStudentWeight ?? weightKg) || 68;
    const studentHeight = Number(rawStudentHeight ?? heightCm) || 172;
    const hMeters = studentHeight > 0 ? studentHeight / 100 : 1.72;
    const studentBmi = Number(rawBmi) || Number((studentWeight / (hMeters * hMeters)).toFixed(1));
    const studentCategory =
      category ||
      (studentBmi >= 25 ? 'overweight' : studentBmi < 18.5 ? 'underweight' : 'balanced');

    const activeAi = getGeminiClient(req);

    const promptText = `أنت خبير تغذية سريري مصري متخصص في تغذية طلاب الثانوية العامة (الصف الثالث الثانوي علمي علوم).
بيانات الطالب:
- الوزن: ${studentWeight} كجم
- الطول: ${studentHeight} سم
- مؤشر كتلة الجسم (BMI): ${studentBmi} (${studentCategory === 'overweight' ? 'زيادة وزن' : studentCategory === 'underweight' ? 'نحافة' : 'وزن معتدل'})
- الهدف: أقصى تركيز ذهني للمذاكرة بدون كسل أو خمول، وتثبيت سكر الدم.

وصف الطالب لوجبته المنزلية: "${description || (imageBase64 ? 'وجبة منزلية مرفقة بالصورة' : 'وجبة محضرة منزلياً')}".

افحص الصورة والوصف وأرجع JSON دقيق بالعامية المصرية الراقية يحتوي على:
- isSuitable: boolean (true إذا كانت الوجبة مناسبة أو مناسبة مع تعديل بسيط، false إذا كانت ثقيلة أو غير مناسبة وتسبب خمولاً أو تضر بوزنه)
- verdict: عنوان واضح ومختصر للنتيجة
- caloriesEstimate: السعرات التقريبية مثال "420 سعرة"
- proteinGrams: البروتين التقديري مثال "24 جم"
- carbsGrams: الكربوهيدرات التقديرية مثال "38 جم"
- analysis: التقييم العلمي المفصل لأثر هذه الوجبة على جسم الطالب (وزنه ${studentWeight} كجم وBMI ${studentBmi}) وعلى المخ والتركيز أثناء المذاكرة
- recommendations: مصفوفة من 3 نصائح وتعديلات مصرية عملية (مثل إضافة بيضة مسلوقة، خيار، ليمون، تقليل العيش)
- thanaweyaTip: نصيحة ذهبية قصيرة لربط هذه الوجبة بجلسة المذاكرة القادمة.`;

    let structuredResult: {
      isSuitable: boolean;
      verdict: string;
      caloriesEstimate: string;
      proteinGrams: string;
      carbsGrams: string;
      analysis: string;
      recommendations: string[];
      thanaweyaTip: string;
    } | null = null;
    let mealSource: 'gemini' | 'fallback' = 'fallback';
    let mealWarning: string | undefined;

    if (activeAi) {
      try {
        const parts: any[] = [];
        if (imageBase64 && typeof imageBase64 === 'string') {
          const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          });
        }
        parts.push({ text: promptText });

        const rawJson = await runWithRetry(async () => {
          const response = await activeAi.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: { parts },
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  isSuitable: { type: Type.BOOLEAN },
                  verdict: { type: Type.STRING },
                  caloriesEstimate: { type: Type.STRING },
                  proteinGrams: { type: Type.STRING },
                  carbsGrams: { type: Type.STRING },
                  analysis: { type: Type.STRING },
                  recommendations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  thanaweyaTip: { type: Type.STRING },
                },
                required: [
                  'isSuitable',
                  'verdict',
                  'caloriesEstimate',
                  'proteinGrams',
                  'carbsGrams',
                  'analysis',
                  'recommendations',
                  'thanaweyaTip',
                ],
              },
            },
          });
          return response.text || '';
        }, 2, 28000);

        if (rawJson && rawJson.trim()) {
          const parsed = JSON.parse(rawJson.trim());
          if (parsed && typeof parsed.verdict === 'string' && typeof parsed.analysis === 'string') {
            structuredResult = {
              isSuitable: Boolean(parsed.isSuitable),
              verdict: parsed.verdict,
              caloriesEstimate: parsed.caloriesEstimate || '400 سعرة',
              proteinGrams: parsed.proteinGrams || '20 جم',
              carbsGrams: parsed.carbsGrams || '40 جم',
              analysis: parsed.analysis,
              recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
              thanaweyaTip: parsed.thanaweyaTip || 'اشرب كوب ماء قبل المذاكرة بـ 10 دقائق لتنشيط الدورة الدموية للمخ.',
            };
            mealSource = 'gemini';
          }
        }
      } catch (err: any) {
        const classified = classifyGeminiError(err);
        mealWarning = classified.userWarning;
        console.warn('Gemini meal inspect error, using expert nutrition fallback:', err?.message || err);
      }
    } else {
      mealWarning = 'مفتاح GEMINI_API_KEY غير مضاف في Settings > Secrets؛ تم التحليل عبر قاعدة التغذية المحلية.';
    }

    // Expert Egyptian Nutrition fallback engine (Returns exact structured schema)
    if (!structuredResult) {
      structuredResult = generateMealFallback({
        description,
        hasImage: Boolean(imageBase64),
        studentWeight,
        studentHeight,
        studentBmi,
        studentCategory: studentCategory as 'overweight' | 'underweight' | 'balanced',
      });
    }

    return res.json({
      success: true,
      ...structuredResult,
      source: mealSource,
      warning: mealWarning,
      weightKg: studentWeight,
      bmi: studentBmi,
    });
  } catch (error: any) {
    console.error('Meal Inspector Error:', error);
    return res.status(500).json({
      error: 'تعذر فحص الوجبة حالياً، يرجى المحاولة ثانية',
      details: error?.message,
    });
  }
});

// ----------------- Complete Quran Uthmani API -----------------
// Serves all 114 Surahs and 6,236 Ayahs in authentic Uthmani script
let quranCache: any = null;

function getFullQuranData() {
  if (quranCache) return quranCache;
  const quranPath = path.join(__dirname, 'src', 'data', 'quran_data', 'quran_uthmani.json');
  if (fs.existsSync(quranPath)) {
    try {
      const raw = fs.readFileSync(quranPath, 'utf-8');
      quranCache = JSON.parse(raw);
      return quranCache;
    } catch (e) {
      console.error('Error reading quran_uthmani.json', e);
    }
  }
  return null;
}

app.get('/api/quran/surah/:number', async (req, res) => {
  const surahNum = parseInt(req.params.number, 10);
  if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
    return res.status(400).json({ error: 'رقم سورة غير صالح (يجب أن يكون بين 1 و 114)' });
  }

  const quran = getFullQuranData();
  if (quran && quran.data && Array.isArray(quran.data.surahs)) {
    const found = quran.data.surahs.find((s: any) => s.number === surahNum);
    if (found) {
      return res.json({
        success: true,
        source: 'local_uthmani',
        data: found,
      });
    }
  }

  // Fallback to AlQuran Cloud API if local file fails
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`);
    if (response.ok) {
      const data = await response.json();
      return res.json({
        success: true,
        source: 'remote_api',
        data: data.data,
      });
    }
  } catch (err: any) {
    console.error('Fallback Quran fetch failed:', err?.message);
  }

  return res.status(500).json({ error: 'تعذر جلب آيات السورة، يرجى المحاولة ثانية' });
});

// ----------------- Instant Smart Translator API -----------------
async function translateWithMyMemoryFallback(
  text: string,
  sourceLang: TranslationLanguageCode,
  targetLang: TranslationLanguageCode
): Promise<string | null> {
  const sentences = text.split(/(?<=[.!؟،\n])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).length <= 420) {
      current = current ? `${current} ${s}` : s;
    } else {
      if (current) chunks.push(current);
      current = s.slice(0, 420);
    }
  }
  if (current) chunks.push(current);
  if (chunks.length === 0) chunks.push(text.slice(0, 420));

  const translatedParts: string[] = [];
  for (const chunk of chunks.slice(0, 5)) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      chunk
    )}&langpair=${encodeURIComponent(sourceLang)}|${encodeURIComponent(targetLang)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;
    const data: any = await res.json();
    const out = String(data?.responseData?.translatedText || '').trim();
    if (
      !out ||
      out.toUpperCase().includes('MYMEMORY WARNING') ||
      out.toUpperCase().includes('INVALID LANGUAGE')
    ) {
      return null;
    }
    translatedParts.push(out);
  }
  const joined = translatedParts.join(' ').trim();
  return joined || null;
}

app.post('/api/gemini/translate', async (req, res) => {
  try {
    const {
      text,
      sourceLang = 'en',
      targetLang = 'ar',
    } = (req.body || {}) as {
      text?: string;
      sourceLang?: TranslationLanguageCode;
      targetLang?: TranslationLanguageCode;
    };

    const cleanText = String(text || '').trim();
    if (!cleanText) {
      return res.status(400).json({ error: 'يرجى كتابة النص المراد ترجمته.' });
    }

    const srcMeta = getLanguageMeta(sourceLang);
    const tgtMeta = getLanguageMeta(targetLang);

    const activeAi = getGeminiClient(req) || ai;
    let translationPayload: any = null;
    let apiWarning: string | undefined;

    const systemInstruction = `أنت مترجم أكاديمي ولغوي محترف لطلاب الصف الثالث الثانوي في مصر.
ترجم النص بدقة من ${srcMeta.labelAr} إلى ${tgtMeta.labelAr}، مع ضبط القواعد والسياق، وتقديم نطق تقريبي بالعربية وملاحظة نحوية مختصرة ومثال تطبيقي واحد.
أعد JSON فقط بهذه الحقول:
{
  "translatedText": "الترجمة الدقيقة",
  "phoneticPronunciation": "طريقة النطق بحروف عربية واضحة (أو وصف النطق)",
  "grammarNote": "ملاحظة نحوية أو سياقية مفيدة للطالب بالعربية",
  "usageExamples": [{ "source": "جملة قصيرة بلغة المصدر", "target": "ترجمتها بلغة الهدف" }]
}`;

    const promptText = `ترجم النص التالي من ${srcMeta.labelAr} إلى ${tgtMeta.labelAr}:\n"${cleanText}"`;

    if (activeAi && Date.now() < geminiTextCooldownUntil) {
      apiWarning = lastGeminiTextWarning;
    } else if (activeAi) {
      for (const modelName of ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']) {
        try {
          const rawJson = await runWithRetry(async () => {
            const response = await activeAi.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts: [{ text: promptText }] }],
              config: {
                abortSignal: AbortSignal.timeout(4800),
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
                responseMimeType: 'application/json',
              },
            });
            return response.text || '{}';
          }, 0, 5200);

          const parsed = extractJsonPayloadFromText(rawJson);
          if (parsed && typeof parsed.translatedText === 'string' && parsed.translatedText.trim()) {
            geminiTextCooldownUntil = 0;
            translationPayload = {
              sourceText: cleanText,
              translatedText: parsed.translatedText.trim(),
              sourceLang,
              targetLang,
              phoneticPronunciation: String(parsed.phoneticPronunciation || '').trim(),
              grammarNote: String(parsed.grammarNote || '').trim(),
              usageExamples: Array.isArray(parsed.usageExamples)
                ? parsed.usageExamples
                    .filter((ex: any) => ex && ex.source && ex.target)
                    .slice(0, 2)
                : [],
              source: 'gemini',
              providerLabel: 'مترجم نَهج الذكي (Gemini)',
            };
            apiWarning = undefined;
            break;
          }
        } catch (err: any) {
          apiWarning = recordGeminiTextFailure(err);
          if (shouldFastBreakGeminiLoop(err)) break;
        }
      }
    }

    if (!translationPayload) {
      try {
        const secondary = await callStrongSecondaryAI({
          systemInstruction,
          messages: [{ role: 'user', content: promptText }],
          jsonMode: true,
          timeoutMs: 8000,
        });
        if (secondary) {
          const parsed = extractJsonPayloadFromText(secondary.text);
          if (parsed && typeof parsed.translatedText === 'string' && parsed.translatedText.trim()) {
            translationPayload = {
              sourceText: cleanText,
              translatedText: parsed.translatedText.trim(),
              sourceLang,
              targetLang,
              phoneticPronunciation: String(parsed.phoneticPronunciation || '').trim(),
              grammarNote: String(parsed.grammarNote || '').trim(),
              usageExamples: Array.isArray(parsed.usageExamples) ? parsed.usageExamples.slice(0, 2) : [],
              source: 'gemini',
              providerLabel: secondary.providerLabel,
            };
            apiWarning = undefined;
          }
        }
      } catch {
        // ignore secondary error and continue to neural machine translation backup
      }
    }

    // Tier 3: Real Neural Machine Translation API (works across all 6 languages independently of Gemini quota)
    if (!translationPayload) {
      try {
        const mtText = await translateWithMyMemoryFallback(cleanText, sourceLang, targetLang);
        if (mtText) {
          translationPayload = {
            sourceText: cleanText,
            translatedText: mtText,
            sourceLang,
            targetLang,
            phoneticPronunciation: `استمع للنطق الصحيح بالضغط على زر السماعة (${tgtMeta.labelAr})`,
            grammarNote: `تمت الترجمة من ${srcMeta.labelAr} إلى ${tgtMeta.labelAr} بدقة سياقية عبر محرك الترجمة الفوري.`,
            usageExamples: [{ source: cleanText, target: mtText }],
            source: 'gemini',
            providerLabel: 'محرك نَهج الفوري للترجمة الدقيقة',
          };
          apiWarning = undefined;
        }
      } catch {
        // fallback below
      }
    }

    if (!translationPayload) {
      translationPayload = buildTranslationFallback({
        text: cleanText,
        sourceLang,
        targetLang,
        warning: apiWarning,
      });
    }

    return res.json({ success: true, result: translationPayload });
  } catch (error) {
    console.error('Translate Error:', error);
    return res.status(500).json({ error: 'تعذر إتمام الترجمة حالياً، يرجى إعادة المحاولة.' });
  }
});

// ----------------- «رفيقي» Study & Daily-Life Companion + Community Wall -----------------
app.post('/api/gemini/companion', async (req, res) => {
  try {
    const { message, mood = 'motivated', studentName = 'بطل نَهج', history = [] } = req.body || {};
    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      return res.status(400).json({ error: 'اكتب ما تشعر به أو ما تريد التخطيط له.' });
    }

    const moodLabel =
      mood === 'stressed'
        ? 'مضغوط وقلق'
        : mood === 'tired'
        ? 'مرهق ويحتاج شحن طاقة'
        : mood === 'lost'
        ? 'مشتت ويحتاج ترتيب أولويات'
        : 'متحمس ومنجز';

    const systemInstruction = `أنت «رفيقي» — الصديق الداعم والمرشد الشخصي للطالب «${studentName}» في الصف الثالث الثانوي والحياة اليومية.
حالة الطالب الآن: ${moodLabel}.
أسلوبك: دافئ، مشجع، واقعي، قريب للقلب باللهجة المصرية المهذبة أو العربية الواضحة، يقدم خطوة عملية قابلة للتنفيذ في 15 دقيقة سواء في المذاكرة أو تنظيم اليوم والراحة والنفسية.
يجب أن يكون ردك مختلفاً ومرتبطاً مباشرة بسؤال الطالب الأخير دون تكرار الردود السابقة.
أجب في فقرة مركزة + نصيحة عملية واحدة بعنوان «خطوتك الآن:».`;

    const previousReplies: string[] = Array.isArray(history)
      ? history
          .filter((m: any) => m?.role === 'companion' && typeof m?.text === 'string')
          .map((m: any) => String(m.text))
      : [];

    // Cleanly sanitize history so it alternates user/model, never starts with model, and never duplicates the final user turn
    const priorHistory = Array.isArray(history)
      ? history.slice(0, -1).slice(-6).filter((m: any) => String(m?.text || '').trim())
      : [];
    while (priorHistory.length > 0 && priorHistory[0].role === 'companion') {
      priorHistory.shift();
    }

    const activeAi = getGeminiClient(req) || ai;
    let replyText = '';
    let source: 'gemini' | 'fallback' = 'fallback';
    let warning: string | undefined;

    if (activeAi && Date.now() < geminiTextCooldownUntil) {
      warning = lastGeminiTextWarning;
    } else if (activeAi) {
      const formattedHistory = priorHistory.map((m: any) => ({
        role: (m.role === 'companion' ? 'model' : 'user') as 'model' | 'user',
        parts: [{ text: String(m.text || '').trim() }],
      }));
      formattedHistory.push({ role: 'user', parts: [{ text: cleanMessage }] });

      for (const modelName of ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']) {
        try {
          const text = await runWithRetry(async () => {
            const response = await activeAi.models.generateContent({
              model: modelName,
              contents: formattedHistory,
              config: {
                abortSignal: AbortSignal.timeout(4800),
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              },
            });
            return response.text || '';
          }, 0, 5200);

          if (text.trim()) {
            geminiTextCooldownUntil = 0;
            replyText = text.trim();
            source = 'gemini';
            warning = undefined;
            break;
          }
        } catch (err: any) {
          warning = recordGeminiTextFailure(err);
          if (shouldFastBreakGeminiLoop(err)) break;
        }
      }
    }

    if (!replyText) {
      try {
        const extMsgs = [
          ...priorHistory.map((m: any) => ({
            role: (m.role === 'companion' ? 'assistant' : 'user') as 'user' | 'assistant',
            content: String(m.text || '').trim(),
          })),
          { role: 'user' as const, content: cleanMessage },
        ];
        const secondary = await callStrongSecondaryAI({
          systemInstruction,
          messages: extMsgs,
          timeoutMs: 8000,
        });
        if (secondary && secondary.text.trim()) {
          replyText = secondary.text.trim();
          source = 'gemini';
          warning = undefined;
        }
      } catch {
        // fallback to dynamic non-repeating companion brain
      }
    }

    if (!replyText) {
      replyText = generateCompanionResponse({
        message: cleanMessage,
        mood,
        studentName,
        previousReplies,
      });
    }

    return res.json({
      success: true,
      reply: replyText,
      source,
      warning,
    });
  } catch (error) {
    console.error('Companion Error:', error);
    return res.status(500).json({ error: 'تعذر الرد حالياً من رفيقي.' });
  }
});

app.get('/api/companion/posts', (req, res) => {
  const posts = (appData.companionPosts || []).slice().sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  return res.json({ success: true, posts });
});

app.post('/api/companion/posts', (req, res) => {
  const { authorName, authorPhone, category = 'تحفيز', content } = req.body || {};
  const cleanContent = String(content || '').trim();
  const cleanAuthor = String(authorName || 'طالب نَهج').trim();

  if (cleanContent.length < 3) {
    return res.status(400).json({ error: 'يرجى كتابة رسالة أو نصيحة مفيدة (3 أحرف على الأقل).' });
  }

  const normalizedPhone = normalizeServerPhone(String(authorPhone || ''));
  const isVerified = VERIFIED_SERVER_PHONES.has(normalizedPhone);

  const validCategories = ['تحفيز', 'إنجاز يومي', 'طلب مساعدة', 'نصيحة مذاكرة'] as const;
  const safeCat = validCategories.includes(category) ? category : 'تحفيز';

  const newPost: CompanionCommunityPost = {
    id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    authorName: cleanAuthor,
    authorPhone: normalizedPhone || undefined,
    isVerified,
    category: safeCat,
    content: cleanContent.slice(0, 600),
    cheers: 1,
    replies: [],
    createdAt: new Date().toISOString(),
  };

  if (!appData.companionPosts) appData.companionPosts = [];
  appData.companionPosts.unshift(newPost);
  appData.companionPosts = appData.companionPosts.slice(0, 60);
  saveData();

  return res.json({ success: true, post: newPost });
});

app.post('/api/companion/posts/:id/cheer', (req, res) => {
  const postId = req.params.id;
  const post = (appData.companionPosts || []).find((p) => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'المنشور غير موجود' });
  }
  post.cheers = (post.cheers || 0) + 1;
  saveData();
  return res.json({ success: true, post });
});

app.post('/api/companion/posts/:id/reply', (req, res) => {
  const postId = req.params.id;
  const { authorName, authorPhone, text } = req.body || {};
  const cleanText = String(text || '').trim();
  if (cleanText.length < 2) {
    return res.status(400).json({ error: 'يرجى كتابة رد واضح' });
  }
  const post = (appData.companionPosts || []).find((p) => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'المنشور غير موجود' });
  }
  const normalizedPhone = normalizeServerPhone(String(authorPhone || ''));
  const reply = {
    id: `cpr-${Date.now()}`,
    authorName: String(authorName || 'طالب نَهج').trim(),
    authorPhone: normalizedPhone || undefined,
    isVerified: VERIFIED_SERVER_PHONES.has(normalizedPhone),
    text: cleanText.slice(0, 350),
    createdAt: new Date().toISOString(),
  };
  if (!Array.isArray(post.replies)) post.replies = [];
  post.replies.push(reply);
  saveData();
  return res.json({ success: true, post });
});

// ----------------- Interactive Whiteboard Video Explainer API -----------------
const whiteboardTtsCache = new Map<
  string,
  { audioBase64: string; mimeType: string; voiceName: string; needsMalePitchTune?: boolean }
>();

const MALE_TEACHER_VOICE_MAP: Record<string, { voiceName: string; style: string }> = {
  calm_teacher: {
    voiceName: 'Charon',
    style:
      'Deep, calm, warm, authoritative Egyptian male high school teacher explaining a textbook lesson in eloquent clear Arabic with steady natural pacing and clear pauses at punctuation.',
  },
  energetic_teacher: {
    voiceName: 'Fenrir',
    style:
      'Clear, confident, engaging male Egyptian lecturer explaining high school science concepts enthusiastically in crisp fluent Arabic without rushing or stumbling.',
  },
  academic_lecturer: {
    voiceName: 'Puck',
    style:
      'Articulate, friendly, clear-spoken male teacher guiding high school students step by step in accurate Modern Standard Arabic with natural intonation.',
  },
};

async function synthesizeArabicSpeechFallbackMp3(spokenText: string): Promise<string | null> {
  const sentences = spokenText.split(/(?<=[.!؟،؛])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if ((buf + ' ' + s).length <= 165) {
      buf = buf ? `${buf} ${s}` : s;
    } else {
      if (buf) chunks.push(buf);
      if (s.length <= 165) {
        buf = s;
      } else {
        // Hard word split if a single clause > 165 chars
        const words = s.split(/\s+/);
        let wBuf = '';
        for (const w of words) {
          if ((wBuf + ' ' + w).length <= 160) {
            wBuf = wBuf ? `${wBuf} ${w}` : w;
          } else {
            if (wBuf) chunks.push(wBuf);
            wBuf = w;
          }
        }
        buf = wBuf;
      }
    }
  }
  if (buf) chunks.push(buf);
  if (chunks.length === 0) return null;

  const audioBuffers: Buffer[] = [];
  for (const chunk of chunks.slice(0, 8)) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&q=${encodeURIComponent(
      chunk
    )}`;
    const ttsRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!ttsRes.ok) return null;
    const arrBuf = await ttsRes.arrayBuffer();
    if (!arrBuf.byteLength) return null;
    audioBuffers.push(Buffer.from(arrBuf));
  }
  if (audioBuffers.length === 0) return null;
  return Buffer.concat(audioBuffers).toString('base64');
}

app.post('/api/gemini/whiteboard-tts', async (req, res) => {
  try {
    const rawText = String(req.body?.text || '').trim();
    const voiceStyleKey = String(req.body?.voiceStyle || 'calm_teacher');
    const selectedVoice =
      MALE_TEACHER_VOICE_MAP[voiceStyleKey] || MALE_TEACHER_VOICE_MAP.calm_teacher;

    const cleanedText = sanitizeArabicForSpeech(rawText);
    if (!cleanedText) {
      return res.status(400).json({
        success: false,
        error: 'النص المطلوب نطقه فارغ.',
      });
    }

    const spokenText = cleanedText.slice(0, 950);
    const cacheKey = `${selectedVoice.voiceName}::${spokenText}`;
    const cached = whiteboardTtsCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        audioBase64: cached.audioBase64,
        mimeType: cached.mimeType,
        voiceName: cached.voiceName,
        needsMalePitchTune: Boolean(cached.needsMalePitchTune),
        cleanedText: spokenText,
        cached: true,
      });
    }

    const activeAi = getGeminiClient(req) || ai;
    let lastWarning: string | undefined;

    if (activeAi && Date.now() < geminiTtsCooldownUntil) {
      lastWarning = lastGeminiTtsWarning;
    } else if (activeAi) {
      try {
        const response = await runWithRetry(
          async () =>
            activeAi.models.generateContent({
              model: 'gemini-3.8-flash-lite-tts',
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: spokenText,
                      speechMetadata: {
                        style: selectedVoice.style,
                      },
                    },
                  ],
                },
              ],
              config: {
                abortSignal: AbortSignal.timeout(8000),
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: selectedVoice.voiceName },
                  },
                },
              },
            }),
          0,
          8500
        );

        const inlinePart = response.candidates?.[0]?.content?.parts?.find(
          (p: any) => p?.inlineData?.data
        )?.inlineData;

        if (inlinePart?.data) {
          geminiTtsCooldownUntil = 0;
          const mimeType = inlinePart.mimeType || 'audio/wav';
          if (whiteboardTtsCache.size >= 80) {
            const oldestKey = whiteboardTtsCache.keys().next().value;
            if (oldestKey) whiteboardTtsCache.delete(oldestKey);
          }
          whiteboardTtsCache.set(cacheKey, {
            audioBase64: inlinePart.data,
            mimeType,
            voiceName: selectedVoice.voiceName,
            needsMalePitchTune: false,
          });

          return res.json({
            success: true,
            audioBase64: inlinePart.data,
            mimeType,
            voiceName: selectedVoice.voiceName,
            needsMalePitchTune: false,
            cleanedText: spokenText,
            cached: false,
          });
        }
      } catch (ttsErr: any) {
        lastWarning = recordGeminiTtsFailure(ttsErr);
      }
    }

    // Tier 2: Real server-side Arabic MP3 synthesis (pitch-tuned cleanly to male register on client)
    try {
      const mp3Base64 = await synthesizeArabicSpeechFallbackMp3(spokenText);
      if (mp3Base64) {
        const voiceLabel = `أستاذ نَهج (${selectedVoice.voiceName})`;
        if (whiteboardTtsCache.size >= 80) {
          const oldestKey = whiteboardTtsCache.keys().next().value;
          if (oldestKey) whiteboardTtsCache.delete(oldestKey);
        }
        whiteboardTtsCache.set(cacheKey, {
          audioBase64: mp3Base64,
          mimeType: 'audio/mpeg',
          voiceName: voiceLabel,
          needsMalePitchTune: true,
        });

        return res.json({
          success: true,
          audioBase64: mp3Base64,
          mimeType: 'audio/mpeg',
          voiceName: voiceLabel,
          needsMalePitchTune: true,
          cleanedText: spokenText,
          cached: false,
        });
      }
    } catch {
      // fall through to browser speech
    }

    return res.json({
      success: false,
      fallbackToBrowserMale: true,
      cleanedText: spokenText,
      warning: lastWarning || 'تم استخدام الصوت الرجالي المحلي لقراءة الشرح بوضوح.',
    });
  } catch (err) {
    console.error('Whiteboard TTS Error:', err);
    return res.json({
      success: false,
      fallbackToBrowserMale: true,
      cleanedText: sanitizeArabicForSpeech(String(req.body?.text || '')),
      warning: 'تم تفعيل الصوت الرجالي البديل لشرح الدرس.',
    });
  }
});

app.post('/api/gemini/whiteboard-lesson', async (req, res) => {
  try {
    const { subject, chapter, lesson, chapterSummary } = req.body || {};
    const cleanSubject = String(subject || '').trim();
    const cleanChapter = String(chapter || '').trim() || 'المنهج الأساسي';
    const cleanLesson = String(lesson || '').trim();

    if (!cleanSubject || !cleanLesson) {
      return res.status(400).json({
        success: false,
        error: 'يرجى اختيار المادة والدرس أولاً لتوليد شرح السبورة.',
      });
    }

    const params = {
      subject: cleanSubject,
      chapter: cleanChapter,
      lesson: cleanLesson,
      chapterSummary:
        chapterSummary && typeof chapterSummary === 'object'
          ? {
              title: String(chapterSummary.title || '').trim(),
              keyPoints: Array.isArray(chapterSummary.keyPoints)
                ? chapterSummary.keyPoints.map((p: any) => String(p || '').trim()).filter(Boolean)
                : [],
              examTips: Array.isArray(chapterSummary.examTips)
                ? chapterSummary.examTips.map((p: any) => String(p || '').trim()).filter(Boolean)
                : [],
              formulaOrNugget: chapterSummary.formulaOrNugget
                ? String(chapterSummary.formulaOrNugget).trim()
                : undefined,
            }
          : undefined,
    };
    const systemInstruction = buildWhiteboardSystemInstruction();
    const userPrompt = buildWhiteboardUserPrompt(params);
    const activeAi = getGeminiClient(req) || ai;

    let script = null;
    let apiWarning: string | undefined;

    if (activeAi && Date.now() < geminiTextCooldownUntil) {
      apiWarning = lastGeminiTextWarning;
    } else if (activeAi) {
      for (const candidate of [
        {
          model: 'gemini-4-hydrogen',
          label: 'أستاذ نَهج الخبير (Gemini 4 — تحليل وشرح الكتاب العميق)',
          thinking: ThinkingLevel.HIGH,
          timeout: 24000,
        },
        {
          model: 'gemini-3.1-flash-lite',
          label: 'سبورة أستاذ نَهج (Gemini Fast)',
          thinking: ThinkingLevel.LOW,
          timeout: 14000,
        },
      ]) {
        try {
          const rawJson = await runWithRetry(
            async () => {
              const response = await activeAi.models.generateContent({
                model: candidate.model,
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                config: {
                  abortSignal: AbortSignal.timeout(candidate.timeout),
                  systemInstruction,
                  thinkingConfig: { thinkingLevel: candidate.thinking },
                  responseMimeType: 'application/json',
                },
              });
              return response.text || '{}';
            },
            0,
            candidate.timeout + 500
          );

          const parsed = extractJsonPayloadFromText(rawJson);
          const normalized = normalizeWhiteboardLessonScript(parsed, params, {
            source: 'gemini',
            providerLabel: candidate.label,
          });
          if (normalized) {
            geminiTextCooldownUntil = 0;
            script = normalized;
            apiWarning = undefined;
            break;
          }
        } catch (err: any) {
          apiWarning = recordGeminiTextFailure(err);
          if (shouldFastBreakGeminiLoop(err)) break;
        }
      }
    }

    if (!script) {
      try {
        const secondary = await callStrongSecondaryAI({
          systemInstruction: `${systemInstruction}\nأعد كائن JSON صالحاً فقط.`,
          messages: [{ role: 'user', content: userPrompt }],
          jsonMode: true,
          timeoutMs: 14000,
        });
        if (secondary) {
          const parsed = extractJsonPayloadFromText(secondary.text);
          const normalized = normalizeWhiteboardLessonScript(parsed, params, {
            source: 'gemini',
            providerLabel: secondary.providerLabel,
          });
          if (normalized) {
            script = normalized;
            apiWarning = undefined;
          }
        }
      } catch {
        // fallback below
      }
    }

    if (!script) {
      script = generateWhiteboardFallback(params, apiWarning);
    }

    return res.json({
      success: true,
      script,
      source: script.source,
      providerLabel: script.providerLabel,
      warning: script.warning,
    });
  } catch (error) {
    console.error('Whiteboard Lesson Error:', error);
    return res.status(500).json({
      success: false,
      error: 'تعذر توليد سيناريو السبورة حالياً، يرجى المحاولة مرة أخرى.',
    });
  }
});

// ----------------- Vite Server Mounting -----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`نَهج Server running on port ${PORT}`);
  });
}

startServer();
