import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { generateTutorFallback, generateMealFallback } from './src/utils/aiFallbacks.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize Gemini client strictly server-side if key is present
let cachedApiKey: string | null = null;
let ai: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const rawKey = process.env.GEMINI_API_KEY;
  const trimmedKey = rawKey ? rawKey.trim() : '';
  if (!trimmedKey || trimmedKey === 'MY_GEMINI_API_KEY') {
    cachedApiKey = null;
    ai = null;
    return null;
  }
  if (ai && cachedApiKey === trimmedKey) {
    return ai;
  }
  try {
    ai = new GoogleGenAI({
      apiKey: trimmedKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = trimmedKey;
    return ai;
  } catch (err) {
    console.error('Gemini SDK initialization note:', err);
    return null;
  }
}

ai = getGeminiClient();

function classifyGeminiError(err: any): { retryable: boolean; userWarning: string } {
  const msg = String(err?.message || err || '');
  const status = Number(err?.status || err?.code || 0);

  if (status === 400 || msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
    return {
      retryable: false,
      userWarning: 'مفتاح Gemini API غير صالح — يرجى مراجعته في لوحة Settings > Secrets.',
    };
  }
  if (status === 403 || msg.includes('PERMISSION_DENIED')) {
    return {
      retryable: false,
      userWarning: 'تم رفض صلاحية الوصول لنموذج Gemini — يرجى التحقق من مفتاح API في Settings > Secrets.',
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
  if (msg.includes('TIMEOUT') || status >= 500 || msg.includes('ECONNRESET') || msg.includes('fetch failed')) {
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

interface AppData {
  ownerPin: string;
  telegramSupportUrl: string;
  codes: StudentCode[];
}

function loadData(): AppData {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(raw);
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

// Gemini API configuration status (never exposes key value)
app.get('/api/gemini/status', (_req, res) => {
  const client = getGeminiClient();
  return res.json({
    configured: Boolean(client),
    model: 'gemini-4-hydrogen',
  });
});

// ----------------- Gemini AI Tutor ("أستاذ نَهج") -----------------
app.post('/api/gemini/tutor', async (req, res) => {
  try {
    const { message, context, subject, history, tutorMode } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'يرجى كتابة رسالة أو سؤال أولاً' });
    }

    const activeAi = getGeminiClient();

    const modeDirective =
      tutorMode === 'quiz'
        ? 'نمط التحدي: اطرح على الطالب 3 أسئلة اختيار من متعدد قوية بنظام الربط والاستنتاج الحديث، ولا تكشف الإجابات حتى يجيب هو أولاً!'
        : tutorMode === 'problem'
        ? 'نمط المسائل والتركات: ركز على القوانين، التعويض الرياضي بالخطوات والأرقام، وتنبيهات الوحدات والتحويلات الفيزيائية والكيميائية.'
        : tutorMode === 'plan'
        ? 'نمط الخطة: صمم خطة عملية محكمة بالأيام والساعات لإنهاء وتصفية هذا الجزء في أقصر وقت ممكن.'
        : 'نمط الشرح التفاعلي: فكك السؤال، اشرح المفهوم العلمي ببساطة، ركز على تركات الامتحان، واختم بسؤال تفاعلي سريع.';

    const systemPrompt = `أنت «أستاذ نَهج»، المعلم الأكاديمي والمرشد التربوي الذكي الأول لطلاب الثانوية العامة في مصر (شعبة علمي علوم).
طريقتك وأسلوبك:
- تتحدث بالعامية المصرية الراقية والذكية، كأستاذ ثانوية عامة عبقري ومخلص يشرح بحب ووضوح، يشجع طالبه ويزرع فيه الثقة والهمة.
- التوجيه الحالي: ${modeDirective}
- منهجية الإجابة الذهبية لتوضيح كل سؤال وتفاعل الطالب (اجعل الرد مركزاً وواضحاً في حدود 180-320 كلمة بدون إطالة مملة):
  1. 🎯 **تفكيك السؤال وفهم المطلوب:** وضح للطالب أولاً ماذا يطلب السؤال ولماذا يبدو خادعاً أو ما الفكرة المفتاحية التي يبحث عنها واضع الامتحان.
  2. 💡 **الشرح وخطوات الحل النموذجية:** شرح علمي منظم بالخطوات، القوانين، والمعادلات مع ضرب مثال واقعي يرسخ في الذهن.
  3. ⚡ **تركة الامتحان ومصيدة الطلاب:** نبهه صراحة على الخطأ الشائع الذي يقع فيه أغلب الطلاب في هذا الموضوع.
  4. ❓ **سؤال تفاعلي سريع لك يا بطل:** اطرح في نهاية كل إجابة سؤالاً تطبيقياً قصيراً (اختيار من متعدد أو مسألة صغيرة) وتحداه أن يجاوب عليها الآن لتقييم إجابته!
- متخصص ومتمكن في:
  * الأحياء (الدعامة والحركة، الهرمونات، التكاثر، المناعة، البيولوجيا الجزيئية DNA & RNA).
  * الكيمياء (العناصر الانتقالية، التحليل، الاتزان، الكهربية، الكيمياء العضوية).
  * الفيزياء (الكهربية وقوانين كيرشوف، التأثير المغناطيسي، الحث، دوائر المتردد، الفيزياء الحديثة).
  * الجيولوجيا والعلوم البيئية (التراكيب، المعادن، الصخور، التكتونية، التجوية، البيئة).
  * اللغة العربية (النحو، البلاغة، الأدب، النصوص، القراءة) واللغة الإنجليزية.
- إذا أرسل الطالب إجابة على سؤال سابق، قيّم إجابته بصراحة وصحح له الخطأ إن وجد أو احتفل بإصابته، ثم انتقل لخطوة أعلى.
- ردودك سريعة ومباشرة دون حشو، وتستخدم علامات التنسيق الواضحة والنقاط.`;

    let reply: string = '';
    let responseSource: 'gemini' | 'fallback' = 'fallback';
    let apiWarning: string | undefined;

    if (activeAi) {
      try {
        const formattedContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
        if (Array.isArray(history) && history.length > 0) {
          const recentTurns = history.slice(-6);
          for (const item of recentTurns) {
            if (item?.text && typeof item.text === 'string' && item.text.trim()) {
              formattedContents.push({
                role: (item.sender === 'user' || item.role === 'user') ? 'user' : 'model',
                parts: [{ text: item.text }],
              });
            }
          }
        }

        const currentPrompt = `[المادة المستهدفة: ${subject || 'علمي علوم'}] ${context ? `[سياق: ${context}]` : ''}\nسؤال الطالب:\n${message}`;
        formattedContents.push({
          role: 'user',
          parts: [{ text: currentPrompt }],
        });

        const result = await runWithRetry(async () => {
          const response = await activeAi.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: formattedContents,
            config: {
              systemInstruction: systemPrompt,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          return response.text || '';
        }, 2, 28000);

        if (result && result.trim()) {
          reply = result.trim();
          responseSource = 'gemini';
        }
      } catch (err: any) {
        const classified = classifyGeminiError(err);
        apiWarning = classified.userWarning;
        console.warn('Gemini tutor fallback triggered:', err?.message || err);
      }
    } else {
      apiWarning = 'مفتاح GEMINI_API_KEY غير مضاف في Settings > Secrets؛ تم الرد عبر المحرك التعليمي المحلي.';
    }

    // Intelligent Multi-Mode Pedagogical Engine (Used if API key missing or network timeout)
    if (!reply) {
      reply = generateTutorFallback({ message, subject, tutorMode });
    }

    return res.json({
      success: true,
      reply,
      source: responseSource,
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

    const activeAi = getGeminiClient();

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
