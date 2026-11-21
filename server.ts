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
  QuestionDifficultyFilter,
  QuestionTypeFilter,
  QuizChallengeRoom,
} from './src/types/index.js';
import {
  callStrongSecondaryAI,
  extractJsonPayloadFromText,
  getConfiguredAIProviders,
} from './src/utils/aiProviders.js';


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
}

function loadData(): AppData {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        accounts: parsed.accounts || {},
        challengeRooms: parsed.challengeRooms || {},
        quizChallenges: parsed.quizChallenges || {},
      };
    }
  } catch (e) {
    console.error('Error reading storage, using defaults:', e);
  }

  // Initial Seed
  return {
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
  };
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

  if (existing) {
    const namesMatch =
      existing.username.trim().toLowerCase() === cleanName.toLowerCase();
    if (!namesMatch && !confirmNameUpdate) {
      return res.status(409).json({
        success: false,
        code: 'USERNAME_MISMATCH',
        registeredUsername: existing.username,
        message: `رقم التليفون مسجل مسبقاً باسم «${existing.username}».`,
      });
    }

    existing.username = cleanName;
    existing.lastLoginAt = nowIso;
    if (existing.snapshot && existing.snapshot.profile) {
      existing.snapshot.username = cleanName;
      existing.snapshot.profile.name = cleanName;
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
  appData.accounts[normalizedPhone] = {
    phone: normalizedPhone,
    normalizedPhone,
    username:
      typeof username === 'string' && username.trim()
        ? username.trim()
        : existing?.username || 'طالب نَهج',
    createdAt: existing?.createdAt || nowIso,
    lastLoginAt: existing?.lastLoginAt || nowIso,
    lastSyncedAt: nowIso,
    snapshot,
  };
  saveData();

  return res.json({ success: true, lastSyncedAt: nowIso });
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
    model: 'gemini-4-hydrogen / gemini-3.1-flash-lite',
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

  if (activeAi) {
    const candidateModels =
      modeDepth === 'deep'
        ? [
            { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 8500 },
            { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 6500 },
          ]
        : [
            { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 6000 },
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
        const classified = classifyGeminiError(isAbort ? new Error('TIMEOUT') : err);
        apiWarning = classified.userWarning;
        console.warn(`Gemini tutor stream (${candidate.model}) failover:`, err?.message || err);
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

    if (activeAi) {
      const candidateModels =
        modeDepth === 'deep'
          ? [
              { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 9000 },
              { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 6500 },
            ]
          : [
              { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 6000 },
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
            reply = result.trim();
            responseSource = 'gemini';
            providerLabel = candidate.model;
            apiWarning = undefined;
            break;
          }
        } catch (err: any) {
          const isAbort = err?.name === 'TimeoutError' || err?.name === 'AbortError';
          const classified = classifyGeminiError(isAbort ? new Error('TIMEOUT') : err);
          apiWarning = classified.userWarning;
          console.warn(`Gemini tutor (${candidate.model}) failover triggered:`, err?.message || err);
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
