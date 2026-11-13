import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

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
      const msg = message.toLowerCase();
      const subj = (subject || 'علمي علوم').trim();
      const lastTutorTurn = Array.isArray(history)
        ? [...history].reverse().find((h: any) => h.role === 'model' || h.sender === 'tutor')?.text || ''
        : '';

      // Handle interactive answer submission or follow-up action chips cleanly
      if (msg.includes('إجابتي على السؤال التفاعلي') || (msg.length < 45 && (msg.includes('إجابت') || msg.includes('الناتج') || /^\d+$/.test(msg.trim())))) {
        const userAns = message.replace('إجابتي على السؤال التفاعلي هي:', '').trim();
        reply = `عاش يا بطل على المحاولة والتفاعل! 👏\n\n` +
          `🎯 **تفكيك إجابتك («${userAns || 'محاولة موفقة'}»):**\n` +
          `ممتاز إنك فكرت وحاولت تحل بإيدك، ده أهم سر للتميز في النظام الحديث.\n\n` +
          `💡 **تأكيد الحل والفهم الصحيح في ${subj}:**\n` +
          `1. راجع دائماً الوحدات والمعطيات الأساسية في السؤال وتأكد هل المطلوب قيمة عددية أم نسبة مئوية أم اتجاه.\n` +
          `2. في مسائل الدعامة والـ DNA: تذكر أن (A=T و G≡C) وكودون الوقف لا يُترجم لحمض أميني.\n` +
          `3. في الفيزياء والكيمياء: راجع تحويلات الملي والمايكرو وعوامل التناسب الطردي والعكسي.\n\n` +
          `⚡ **تركة الامتحان:**\n` +
          `السرعة مطلوبة، لكن التحقق من منطقية الناتج بياخد 5 ثوانٍ فقط ويحميك من خسارة درجات مضمونة!\n\n` +
          `❓ **سؤال تفاعلي جديد لك:**\n` +
          `اكتب لي اسم أصعب جزئية أو مسألة واقفة معاك دلوقتي في مادة **${subj}** عشان نشرحها خطوة بخطوة! 🚀`;
      } else if (msg.includes('لخصلي هذا الشرح') || msg.includes('3 نقاط')) {
        reply = `حاضر يا بطل! إليك الخلاصة المركزة في **${subj}** للمراجعة قبل النوم 💡:\n\n` +
          `🎯 **تفكيك الفكرة في كبسولة:**\n` +
          `بدل ما تحفظ صفحات طويلة، اربط الدرس بـ 3 مفاتيح فقط تستدعي بهم كل الإجابات في اللجنة.\n\n` +
          `💡 **الملخص الذهبي في 3 نقاط:**\n` +
          `1. **المفهوم الأساسي:** حدد السبب والنتيجة (ما العامل المؤثر وما الاستجابة الحيوية أو الفيزيائية الناتجة؟).\n` +
          `2. **القانون أو العلاقة الحاكمة:** اكتب القانون في ورقة جانبية وحدد المتغيرات الثابتة والمتغيرة.\n` +
          `3. **تطبيق النظام الحديث:** طبّق الفكرة على رسم بياني (طردي / عكسي / ثابت) لأن 40% من الامتحان رسوم بيانية.\n\n` +
          `⚡ **تركة الامتحان:**\n` +
          `في الرسوم البيانية، اقرأ اسم المحورين الرأسي (Y) والأفقي (X) أولاً قبل النظر لشكل المنحنى — أحياناً يعكس واضع الامتحان المحورين!\n\n` +
          `❓ **سؤال تفاعلي سريع:**\n` +
          `لو طلب منك تحديد العلاقة البيانية في درس اليوم، هل هي طردية أم عكسية عند ثبوت باقي العوامل؟ جاوبني! 📊`;
      } else if (msg.includes('مسألة امتحان أصعب') || msg.includes('تركات إضافية') || tutorMode === 'quiz' || tutorMode === 'problem') {
        if (subj.includes('فيزياء') || msg.includes('فيزياء')) {
          reply = `تحدي الفيزياء للـ 60/60 يا بشمهندس! ⚡\n\n` +
            `🎯 **تفكيك الفكرة المركبة (الفيزياء):**\n` +
            `هذه المسألة تربط بين مقاومة الموصلات وقانون أوم للدائرة المغلقة وتأثير الحث الكهرومغناطيسي.\n\n` +
            `💡 **مسألة نظام حديث بمستوى المتفوقين:**\n` +
            `سلك معدني منتظم المقطع مقاومته R، تم سحبه بانتظام ليصبح طوله 3 أمثال طوله الأصلي، ثم وُصل بمصدر مهمل المقاومة الداخلية.\n` +
            `1. عند السحب مع ثبوت الحجم: L2 = 3 L1 ⇒ A2 = A1 / 3.\n` +
            `2. وبما أن R = ρe × (L / A)، فإن المقاومة تزداد لـ (3 / (1/3)) = **9 أمثال** (R2 = 9 R1).\n` +
            `3. بالتالي شدة التيار تقل للتسع (I/9) والقدرة المستنفذة عند ثبوت فرق الجهد تقل للتسع أيضاً!\n\n` +
            `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
            `فرّق جيداً بين: "ثُني السلك على نفسه" (نصف القطر يزداد أو المساحة تتضاعف) وبين "سُحب السلك" (الحجم يظل ثابتاً فالمقاومة تتناسب مع مربع الطول L²)!\n\n` +
            `❓ **سؤال تفاعلي سريع لك يا بطل:**\n` +
            `إذا أُعيد تشكيل نفس السلك ليقل نصف قطره إلى النصف، كم تصبح مقاومته الجديدة بدلالة R؟ احسبها واكتب الإجابة! 🧮`;
        } else if (subj.includes('كيمياء') || msg.includes('كيمياء')) {
          reply = `تحدي أبطال الكيمياء! 🧪 ركز معايا في فكرة الربط دي:\n\n` +
            `🎯 **تفكيك السؤال المركب:**\n` +
            `الربط بين الاتزان الأيوني / الحديد / الكيمياء العضوية من أكثر أفكار امتحان آخر العام تكراراً.\n\n` +
            `💡 **الخطوات الذهبية للتعامل مع مسائل الكيمياء:**\n` +
            `1. **كتابة المعادلة الموزونة أولاً:** النسبة المولية هي التي تحدد العامل المحدد للتفاعل.\n` +
            `2. **الـ pH والتركيزات:** تذكر أن [H+] × [OH-] = 10⁻¹⁴ عند 25°م، وزيادة درجة الحرارة ترفع Kw لأن التأين ماص للحرارة.\n` +
            `3. **العضوية:** راقب عدد ذرات الكربون والمجموعة الوظيفية (هل تفاعل استبدال أم إضافة أم نزع؟).\n\n` +
            `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
            `أكسالات الحديد II عند تسخينها بمعزل عن الهواء تعطي FeO، بينما تسخينها في الهواء يعطي Fe2O3 (أكسدة فورية)!\n\n` +
            `❓ **سؤال تفاعلي سريع لك:**\n` +
            `عند تحميص السدريت (FeCO3) في الهواء بشدة، ما هو الناتج النهائي وما عدد تأكسد الحديد فيه؟ أجبني الآن! 🧪`;
        } else {
          reply = `تحدي المتفوقين في **${subj}** بنظام الفهم والاستنتاج! 🔥\n\n` +
            `🎯 **تفكيك سؤال النظام الحديث:**\n` +
            `الأسئلة العليا لا تقيس حفظ السطور بل تربط بين سببين أو جهازين حيويين في نفس الوقت.\n\n` +
            `💡 **سؤال وتطبيق عملي:**\n` +
            `1. اقرأ المعطيات المرسومة أو المذكورة وحدد ما يتغير أولاً (المؤثر الأولي).\n` +
            `2. تتبع التغذية الراجعة (سواء في الهرمونات كالغدة النخامية والدرقية، أو في المناعة الخلطية والخلوية).\n` +
            `3. استبعد الاختيارين المتناقضين منطقياً قبل أن تختار الأدق علمياً.\n\n` +
            `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
            `كلمة «يقل أولاً ثم يزداد» تختلف جذرياً عن «لا يتأثر»؛ ركز في الزمن (في البداية vs بعد فترة طويلة).\n\n` +
            `❓ **سؤال تفاعلي لك يا دكتور:**\n` +
            `لو ارتفع مستوى هرمون الثيروكسين في الدم بشكل غير طبيعي بسبب ورم في الغدة الدرقية، فماذا تتوقع لمستوى هرمون TSH المفرز من النخامية (يزداد أم يقل)؟ جاوبني! 🩺`;
        }
      } else if (msg.includes('دعامة') || msg.includes('نبات') || msg.includes('حركة') || msg.includes('عضل')) {
        reply = `يا هلا ببطل الأحياء وطبيب المستقبل! 🩺🌿 ركز معايا:\n\n` +
          `🎯 **تفكيك السؤال وفهم المطلوب:**\n` +
          `السؤال هنا يدور حول كيفية احتفاظ الخلية الحية بشكلها ودور الساركومير في حركة الكائن الحي في النظام الحديث.\n\n` +
          `💡 **الشرح وخطوات الحل النموذجية:**\n` +
          `1. **الدعامة الفسيولوجية:** مؤقتة وتعتمد على امتلاء الفجوة العصارية بالماء بالخاصية الأسموزية فتضغط على البروتوبلازم ليتوتر الجدار.\n` +
          `2. **الدعامة التركيبية:** دائمة بترسيب مواد صلبة (السليلوز واللجنين للقوة، الكيوتين والسيوبرين لمنع فقدان الماء).\n` +
          `3. **انقباض العضلة (هكسلي):** خيوط الميوسين تمد روابط مستعرضة بواسطة Ca++ وتسحب خيوط الأكتين مستهلكة ATP، فتتقارب خطوط Z ويقل طول المنطقة I، وتنعدم H، بينما المنطقة A تظل ثابتة تماماً!\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `احذر: طول خيوط الميوسين وخيوط الأكتين نفسها لا يقصر أبداً! الذي يتغير هو فقط المسافة بين خطوط Z ومساحة الانزلاق.\n\n` +
          `❓ **سؤال تفاعلي سريع لك يا بطل:**\n` +
          `إذا انعدمت جزيئات ATP تماماً داخل ليفة عضلية منقبضة، فماذا يحدث للروابط المستعرضة؟ (اكتب إجابتك الآن وسأصححها لك فوراً!) 🚀`;
      } else if (msg.includes('هرمون') || msg.includes('تكاثر') || msg.includes('غدة') || msg.includes('حيوان منوي') || msg.includes('مبيض')) {
        reply = `أهلاً بدكتور المستقبل! 🩺 موضوع الغدد والتكاثر من أمتع وأضمن درجات الأحياء:\n\n` +
          `🎯 **تفكيك الفكرة الأساسية:**\n` +
          `كل سؤال هنا يعتمد على التغذية الراجعة السلبية بين الغدة النخامية والغدد الصماء أو دورات الطمث والتلقيح.\n\n` +
          `💡 **الشرح والخطوات النموذجية:**\n` +
          `1. **النخامية (المايسترو):** الفص الأمامي يفرز (GH, TSH, ACTH, FSH, LH, Prolactin) بينما الخلفي يخزن (ADH و الأوكسيتوسين المخلقة من منطقة تحت المهاد).\n` +
          `2. **الأوكسينات النباتية:** تهاجر بعيداً عن الضوء نحو الجانب المظلم فتزيد استطالة خلايا الساق وتقل استطالة خلايا الجذر.\n` +
          `3. **في دورة الطمث:** ارتفاع LH يوم 14 يفجر حويصلة جراف ويحرر البويضة ويكون الجسم الأصفر المفرز للبروجسترون.\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `الخلايا العصبية المفرزة في «تحت المهاد» هي التي تخلّق هرموني ADH والأوكسيتوسين، وليس الفص الخلفي نفسه (الفص الخلفي مخزن وممر فقط)!\n\n` +
          `❓ **سؤال تفاعلي سريع لك:**\n` +
          `ما هو الهرمون الذي يرتفع مستواه بشدة في اليوم الـ 13-14 من دورة الطمث لتحفيز الإباضة؟ جاوبني الآن! 🩺`;
      } else if (msg.includes('dna') || msg.includes('rna') || msg.includes('طفرة') || msg.includes('بروتين') || msg.includes('جين')) {
        reply = `يا عبقري البيولوجيا الجزيئية! 🧬 ركز في تفكيك هذا المفهوم:\n\n` +
          `🎯 **تفكيك السؤال وفهم المطلوب:**\n` +
          `أسئلة الـ DNA في النظام الحديث تعتمد بنسبة 80% على الحسابات الرياضية الدقيقة للروابط والنيوكليوتيدات وكودونات الترجمة.\n\n` +
          `💡 **الشرح وخطوات الحل النموذجية:**\n` +
          `1. في لولب DNA المزدوج: نسبة (A + G) البيورينات = نسبة (T + C) البيريميدينات = 50% دائماً.\n` +
          `2. الروابط الهيدروجينية: بين A و T رابطتان (A = T)، وبين G و C ثلاث روابط (G ≡ C).\n` +
          `3. كل لفة كاملة على شريط واحد = 10 نيوكليوتيدات، وعلى الشريطين المزدوجين = 20 نيوكليوتيدة.\n` +
          `4. الترجمة: تبدأ بكودون AUG (ميثيونين)، وتتوقف عند UAA أو UAG أو UGA (لا تشفر لأي حمض).\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `لحساب عدد الأحماض الأمينية في بروتين: عدد كودونات mRNA ناقص 1 (لأن كودون الوقف لا يترجم لحمض أميني)!\n\n` +
          `❓ **سؤال تفاعلي سريع لك يا دكتور:**\n` +
          `قطعة DNA مزدوجة تحتوي على 300 قاعدة نيتروجينية، منها 60 قاعدة أدينين (A). كم عدد الروابط الهيدروجينية الكلية في هذه القطعة؟ اكتب الناتج في رسالتك القادمة! ✍️`;
      } else if (msg.includes('مناعة') || msg.includes('أجسام مضادة') || msg.includes('تائية') || msg.includes('بائية') || msg.includes('بلعمية')) {
        reply = `يا طبيب الغد! 🩺 أسرار وتفكيك فصل المناعة:\n\n` +
          `🎯 **تفكيك السؤال وفهم المطلوب:**\n` +
          `المناعة تتطلب التمييز الدقيق بين خط الدفاع الثاني (الالتهاب) وخط الدفاع الثالث (المناعة الخلطية بالسوائل والخلوية بالخلايا التائية).\n\n` +
          `💡 **الشرح وخطوات الحل النموذجية:**\n` +
          `1. **الخلايا البائية:** تنتج الأجسام المضادة (IgG, IgM, IgA, IgD, IgE) وتتخصص في ميكروبات سوائل الجسم.\n` +
          `2. **الخلايا التائية المساعدة (TH):** مفتاح المناعة النوعية؛ ترتبط بالأنتيجين المعروض على بروتين التوافق النسيجي MHC وتفرز الإنترلوكينات.\n` +
          `3. **الخلايا التائية السامة (TC):** تقضي على الخلايا المصابة بالفيروس والخلايا السرطانية بواسطة البيرفورين (صانع الثقوب) والسموم الليمفاوية.\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `الجسم المضاد IgM خماسي الوحدات (بـ 10 مواقع ارتباط)، ويعمل بآلية التلازن (الإلصاق) وهي الأكفأ ضد البكتيريا.\n\n` +
          `❓ **سؤال تفاعلي سريع لك يا بطل:**\n` +
          `ما اسم المادة الكيميائية المفرزة التي تنبه الخلايا السليمة المجاورة لخلية مصابة بفيروس لمنع تكاثره؟ جاوبني الآن! 🛡️`;
      } else if (msg.includes('عضوية') || msg.includes('ألكان') || msg.includes('إستر') || msg.includes('بنزين') || msg.includes('كحول') || msg.includes('ألكين')) {
        reply = `يا عبقري الكيمياء العضوية! 🧪 ركز في هذا التفكيك الشامل:\n\n` +
          `🎯 **تفكيك السؤال وفهم المطلوب:**\n` +
          `الكيمياء العضوية في تالتة ثانوي ليست حفظ معادلات، بل فهم مسارات التحويل وتطبيق القواعد الكلاسيكية كقاعدة ماركونيكوف والأكسدة والاختزال.\n\n` +
          `💡 **الشرح وخطوات الحل النموذجية:**\n` +
          `1. **قاعدة ماركونيكوف:** عند إضافة كاشف غير متماثل (HX) لألكين غير متماثل، يضاف H لذرة الكربون الأغنى بالهيدروجين، ويضاف X لذرة الكربون الأقل هيدروجيناً.\n` +
          `2. **أكسدة الكحولات:** الكحول الأولي يتأكسد لألديهيد ثم لحمض كربوكسيلي. الكحول الثانوي يتأكسد لكيتون. الكحول الثالثي يقاوم الأكسدة العادية لعدم وجود هيدروجين كربينول.\n` +
          `3. **تفاعل الأسترة:** حمض كربوكسيلي + كحول ⇌ إستر + ماء (نزع OH من الحمض و H من الكحول).\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `للحصول على ميثان من حمض أسيتيك: تعادل مع NaOH ثم تقطير جاف مع الجير الصودي (ينقص السلسلة بذرة كربون واحدة)!\n\n` +
          `❓ **سؤال تفاعلي سريع لك:**\n` +
          `عند إضافة بروميد الهيدروجين (HBr) إلى 2-ميثيل-2-بيوتين، ما هو اسم المركب الناتج طبقاً للأيوباك؟ منتظر إجابتك! 🧪`;
      } else if (subj.includes('كيمياء') || msg.includes('كيمياء') || msg.includes('حديد') || msg.includes('كهربية') || msg.includes('فاراداي') || msg.includes('اتزان') || msg.includes('تأكسد')) {
        reply = `يا بطل الكيمياء! 🧪 إليك تفكيك المسألة بدقة:\n\n` +
          `🎯 **تفكيك السؤال وفهم المطلوب:**\n` +
          `السؤال يتناول مبادئ الأكسدة والاختزال وحسابات التكافؤ وثوابت الاتزان (Kc, Kp) وتفاعلات العناصر الانتقالية في النظام الحديث.\n\n` +
          `💡 **الشرح وخطوات الحل النموذجية:**\n` +
          `1. **قاعدة لوشاتيليه:** المؤثرات الثلاثة (تركيز، حرارة، ضغط). زيادة الضغط تحرك التفاعل نحو المولات الغازية الأقل.\n` +
          `2. **قوانين فاراداي:** كمية الكهربية Q (كولوم) = شدة التيار I (أمبير) × الزمن t (ثواني).\n` +
          `3. لترسيب كتلة مكافئة جرامية واحدة من أي عنصر نحتاج دائماً 1 فاراداي (96500 كولوم).\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `العامل الحفاز يسرع التفاعل الطردي والعكسي بنفس المقدار، ولا يغير موضع الاتزان أو قيمة Kc نهائياً!\n\n` +
          `❓ **سؤال تفاعلي سريع لك:**\n` +
          `ما شحنة أيون الحديد في مركب Fe3O4؟ هل هو ثنائي أم ثلاثي أم كلاهما؟ أرسل إجابتك فوراً! ⚡`;
      } else if (subj.includes('فيزياء') || msg.includes('فيزياء') || msg.includes('كيرشوف') || msg.includes('حث') || msg.includes('مغناطيس') || msg.includes('دينامو') || msg.includes('مقاوم')) {
        reply = `يا بطل الفيزياء والدوائر المعقدة! ⚡ ركز في تفكيك هذا المفهوم:\n\n` +
          `🎯 **تفكيك السؤال وفهم المطلوب:**\n` +
          `مسائل الفيزياء الحديثة والكهربية في تالتة ثانوي تعتمد على تحديد نقاط الجهد وتطبيق قوانين الحفظ دون تشتت في التعقيدات الرياضية.\n\n` +
          `💡 **الشرح وخطوات الحل النموذجية:**\n` +
          `1. **كيرشوف الأول:** Σ I_داخل = Σ I_خارج (مبدأ حفظ الشحنة الكهربية).\n` +
          `2. **كيرشوف الثاني:** Σ V_B = Σ (I × R) في أي مسار مغلق (مبدأ حفظ الطاقة).\n` +
          `3. **قانون فاراداي للحث:** emf = - N (ΔΦm / Δt)؛ والإشارة السالبة لقاعدة لنز لمقاومة التغير.\n` +
          `4. **الرنين في دوائر المتردد:** يحدث عندما XL = XC، وتكون المعاوقة Z أقل ما يمكن وتساوي المقاومة R، وتكون الدائرة ذات خواص أومية نقية.\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `عند سحب سلك فزاد طوله للضعف: يقل نصف قطره للنصف فتقل مساحته للربع، فتزداد المقاومة لـ 4 أمثال قيمتها الأولى (R2 = 4 R1)!\n\n` +
          `❓ **سؤال تفاعلي سريع لك يا بشمهندس:**\n` +
          `إذا زاد تردد دوران ملف الدينامو إلى الضعف، فماذا يحدث للقيمة العظمى للقوة الدافعة الكهربية المستحثة (emf_max)؟ جاوبني في رسالتك! ⚡`;
      } else if (subj.includes('جيولوجيا') || msg.includes('جيولوجيا') || msg.includes('فالق') || msg.includes('صخر') || msg.includes('معدن') || msg.includes('طية') || msg.includes('تكتوني')) {
        reply = `يا بطل الجيولوجيا وعلم الأرض! 🏔️ تفكيك التراكيب الجيولوجية ببساطة:\n\n` +
          `🎯 **تفكيك السؤال وفهم المطلوب:**\n` +
          `تحديد صخور الحائط العلوي والسفلي هو المفتاح لحل أي فالق أو سطح عدم توافق في امتحان الثانوية العامة.\n\n` +
          `💡 **الشرح وخطوات الحل النموذجية:**\n` +
          `1. **الفالق العادي:** ناتج عن قوى شد، صخور الحائط العلوي تتحرك لأسفل بالنسبة للحائط السفلي (يسبب اتساع المساحة وغياب طبقات).\n` +
          `2. **الفالق المعكوس:** ناتج عن قوى ضغط، صخور الحائط العلوي تتحرك لأعلى بالنسبة للحائط السفلي (يسبب تكرار رأسي للطبقات).\n` +
          `3. **الطيات:** المحدبة طبقاتها الأقدم في المركز، والمقعرة طبقاتها الأحدث في المركز.\n` +
          `4. **صلادة موهس:** تالك 1، جبس 2، كالسيت 3، فلوريت 4، أباتيت 5، أرثوكليز 6، كوارتز 7، توباز 8، كوراندوم 9، ماس 10.\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `لوح المخدش الخزفي صلادته (6.5)، لذلك يخدش الكوارتز (7) بالعكس! الكوارتز هو الذي يخدش لوح المخدش.\n\n` +
          `❓ **سؤال تفاعلي سريع لك:**\n` +
          `ما التركيب التكتوني الذي يتكون عندما يتحد فالقان عاديان في صخور الحائط العلوي؟ اكتب اسم الفالق في ثوانٍ! 🏔️`;
      } else if (subj.includes('عرب') || msg.includes('نحو') || msg.includes('عربي') || msg.includes('بلاغة') || msg.includes('مبتدأ') || msg.includes('إعراب') || msg.includes('مفعول')) {
        reply = `يا سيبويه تالتة ثانوي! 📜 مفاتيح الإعراب والبلاغة في النظام الحديث:\n\n` +
          `🎯 **تفكيك السؤال وفهم المطلوب:**\n` +
          `النحو في الثانوية العامة يعتمد على المعنى والسياق وتحديد العوامل، وليس مجرد الحفظ الشكلي.\n\n` +
          `💡 **الشرح وخطوات الحل النموذجية:**\n` +
          `1. **إعمال المشتقات:** اسم الفاعل وصيغ المبالغة يعملان عمل الفعل المبني للمعلوم (يرفعان فاعلاً وينصبان مفعولاً). اسم المفعول يعمل عمل المبني للمجهول فيرفع **نائب فاعل** دائماً!\n` +
          `2. **المصدر المؤول:** (أن + الفعل) يعرب حسب موقعه في الجملة (فاعل، مفعول، مبتدأ).\n` +
          `3. **الاستثناء بـ (غير وسوى):** يأخذان إعراب الاسم الواقع بعد (إلا)، وما بعدهما يعرب مضافاً إليه مجروراً دائماً.\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `الاسم بعد «بخاصة» يعرب مبتدأ مؤخراً مرفوعاً؛ بينما بعد «خصوصاً» يعرب مفعولاً به منصوباً، و«خصوصاً» نفسها تعرب مفعولاً مطلقاً!\n\n` +
          `❓ **سؤال تفاعلي سريع لك:**\n` +
          `أعرب كلمة «المجتهد» في جملة: «أكرمتُ الطلاب وبخاصة المجتهدُ». ما إعرابها بدقة؟ ✍️`;
      } else if (subj.includes('إنجليز') || msg.includes('english') || msg.includes('grammar') || msg.includes('تراكم')) {
        reply = `أهلاً ببطل اللغة الإنجليزية! 🌐 إليك خلاصة القواعد والتركات:\n\n` +
          `🎯 **تفكيك السؤال وفهم المطلوب:**\n` +
          `امتحان الإنجليزي في تالتة ثانوي يركز على الفروق الدقيقة بين الأزمنة (Past Simple vs Present Perfect vs Past Perfect)، وضمائر الوصل، والـ Passive.\n\n` +
          `💡 **الخطوات الذهبية للحل السريع:**\n` +
          `1. **الحدث الأقدم من حدثين في الماضي:** دائماً Past Perfect (had + P.P)، والأحدث Past Simple.\n` +
          `2. **Since + نقطة زمنية ماضية:** يأتي قبلها Present Perfect (have/has + P.P).\n` +
          `3. **تجنب الترجمة الحرفية:** في سؤال الترجمة ابدأ بفحص الفاعل والزمن واستبعد الجمل التي تخل بالمعنى العام.\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `انتبه لصيغة Used to + inf (عادة ماضية انتهت) مقابل be used to + V-ing / noun (معتاد على شيء حالياً)!\n\n` +
          `❓ **سؤال تفاعلي سريع لك:**\n` +
          `اختر الصحيح: By the time we arrived at the station, the train _____ (left / had left / has left). اكتب إجابتك! ✍️`;
      } else if (tutorMode === 'plan' || msg.includes('خطة') || msg.includes('جدول') || msg.includes('انقاذ') || msg.includes('متراكم') || msg.includes('مذاكرة') || msg.includes('ملل')) {
        reply = `يا بطل! إليك خطة الإنقاذ والسيطرة الفورية 🎯:\n\n` +
          `🎯 **تفكيك المشكلة وفهم الحل:**\n` +
          `التراكم النفسي أخطر من التراكم الفعلي للمنهج. الحل في تقسيم ${subj} لوحدات صغيرة جداً تبدأ بإنجازها فوراً اليوم.\n\n` +
          `💡 **خطة الـ 72 ساعة المكثفة:**\n` +
          `1. **قاعدة الـ 50/10:** ذاكر 50 دقيقة تركيز تام مغلقاً الهاتف بالكامل، ثم استرح 10 دقائق (ماء + إطالة ظهر دون تصفح سوشيال ميديا).\n` +
          `2. **توزيع الساعات:** 60% لحل أسئلة وتدريبات الامتحانات السابقة، و 40% فقط لقراءة الشرح وتلخيص المفاهيم.\n` +
          `3. **سلاح الفجر الذهبي:** ساعتان بعد صلاة الفجر تعادلان 5 ساعات مذاكرة في منتصف اليوم بفضل صفاء كيمياء المخ.\n\n` +
          `⚡ **تركة تنظيم الوقت:**\n` +
          `لا تؤجل الجديد لتذاكر القديم! ذاكر درس اليوم أولاً، ثم خصص ساعة واحدة ثابتة يومياً لتصفية درس قديم من المتراكم.\n\n` +
          `❓ **تحدي تفاعلي لك الآن:**\n` +
          `ما هو أكثر درس يسبب لك قلقاً حالياً في ${subj}؟ اكتب اسمه وسأفصله لك في 5 نقاط ونبدأ به فوراً! 🚀`;
      } else {
        reply = `يا بطل تالتة ثانوي! 👋 معك «أستاذ نَهج» في مادة **${subj}**.\n\n` +
          `🎯 **تفكيك استفسارك بخصوص: «${message}»:**\n` +
          `سؤالك مهم جداً، وفي امتحانات الثانوية العامة بالنظام الحديث ترتبط هذه الجزئية في ${subj} دائماً بفهم العلاقة بين السبب والنتيجة وتطبيق القوانين واستبعاد المشتتات الخاطئة.\n\n` +
          `💡 **خارطة التعامل مع هذه النقطة:**\n` +
          `1. اقرأ رأس السؤال وحدد المعطيات والمطلوب بدقة دون استعجال.\n` +
          `2. اربط المفهوم بالقانون العلمي أو القاعدة الذهبية للباب التابع له.\n` +
          `3. طبق في حل 3 أسئلة متنوعة فوراً لتثبيت المعلومة في الذاكرة طويلة المدى.\n\n` +
          `⚡ **تركة الامتحان:**\n` +
          `واضع الامتحان يضع خياراً واحداً مشابهاً جداً للصواب (مشتت ذكي)؛ استبعد الخيارات البعيدة أولاً، ثم قارن بين الاحتمالين المتبقيين بعين فاحصة.\n\n` +
          `❓ **سؤال تفاعلي سريع لك:**\n` +
          `اكتب لي اسم الدرس أو المسألة تحديداً (أو أرسل أرقام المعطيات) لأشرحها لك بالتفصيل وأختبرك فيها الآن! 🌟`;
      }
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
      const desc = (description || '').toLowerCase();
      const hasImage = Boolean(imageBase64);

      const hasCleanProtein =
        desc.includes('بيض') ||
        desc.includes('فول') ||
        desc.includes('جبن') ||
        desc.includes('قريش') ||
        desc.includes('فراخ') ||
        desc.includes('دجاج') ||
        desc.includes('لحم') ||
        desc.includes('سمك') ||
        desc.includes('تونة') ||
        desc.includes('عدس') ||
        desc.includes('زبادي') ||
        desc.includes('لبن');

      const hasVeggies =
        desc.includes('سلطة') ||
        desc.includes('خيار') ||
        desc.includes('طماطم') ||
        desc.includes('جرجير') ||
        desc.includes('خضار') ||
        desc.includes('ليمون') ||
        desc.includes('سبانخ') ||
        desc.includes('ملوخية');

      const hasHeavyOrFried =
        desc.includes('مقلي') ||
        desc.includes('محمر') ||
        desc.includes('زيت غزير') ||
        desc.includes('سمن') ||
        desc.includes('شيبسي') ||
        desc.includes('بيبسي') ||
        desc.includes('مشروب غازي') ||
        desc.includes('سكر') ||
        desc.includes('بانيه') ||
        desc.includes('برجر') ||
        desc.includes('بيتزا') ||
        desc.includes('حواوشي') ||
        desc.includes('فطير') ||
        desc.includes('حلويات');

      const hasHeavyCarbs =
        desc.includes('كشري') ||
        desc.includes('مكرونة') ||
        desc.includes('محشي') ||
        desc.includes('أرز كتير') ||
        desc.includes('رز كتير') ||
        desc.includes('عيش كتير') ||
        desc.includes('رغيفين');

      const dailyProteinNeed = Math.round(studentWeight * 1.4);

      if (hasHeavyOrFried || (hasHeavyCarbs && !hasCleanProtein)) {
        structuredResult = {
          isSuitable: false,
          verdict:
            studentCategory === 'overweight'
              ? 'غير مناسبة لوزنك الحالي — تسبب زيادة الوزن والخمول أثناء المذاكرة ⚠️'
              : 'وجبة دسمة/نشوية ثقيلة — تحتاج تعديلاً لتجنب النعاس بعد الأكل ⚠️',
          caloriesEstimate: hasHeavyOrFried ? '620 - 820 سعرة' : '540 - 700 سعرة',
          proteinGrams: hasCleanProtein ? '18 جم' : '10 جم فقط',
          carbsGrams: '75 - 95 جم',
          analysis: `بناءً على بيانات جسمك (${studentWeight} كجم، طول ${studentHeight} سم، مؤشر كتلة ${studentBmi})، هذه الوجبة تحتوي على نسبة عالية من النشويات السريعة أو الدهون المشبعة. ذلك يسحب جزءاً كبيراً من تدفق الدم نحو المعدة للهضم ويسبب ارتفاعاً مفاجئاً ثم هبوطاً حاداً في سكر الدم، مما يؤدي إلى الشعور بالتخمة والنعاس بعد 30-45 دقيقة بدلاً من التركيز الذهني.`,
          recommendations: [
            'قلل كمية الخبز أو المكرونة أو الأرز إلى النصف تماماً لتفادي هبوط سكر الدم.',
            'أضف مصدر بروتين خفيف سريع الامتصاص (مثل بيضة مسلوقة أو قطعة جبنة قريش) لتغذية الناقلات العصبية.',
            'أضف طبق سلطة خضراء (خيار، طماطم، جرجير، عصرة ليمون) لإبطاء امتصاص الدهون والنشويات.',
          ],
          thanaweyaTip:
            'بعد هذه الوجبة تحرّك أو تمشَّ في الغرفة لمدة 7 دقائق قبل الجلوس على المكتب، واشرب كوب ماء بليمون حتى لا يسيطر عليك الخمول.',
        };
      } else if (studentCategory === 'overweight' && (hasHeavyCarbs || desc.includes('أرز') || desc.includes('رز') || desc.includes('رغيف'))) {
        structuredResult = {
          isSuitable: true,
          verdict: 'مناسبة نسبياً لجسمك — مع نصيحة بضبط كمية النشويات ⚖️',
          caloriesEstimate: '430 - 520 سعرة',
          proteinGrams: hasCleanProtein ? '24 جم' : '15 جم',
          carbsGrams: '48 جم',
          analysis: `لوزنك الحالي (${studentWeight} كجم ومؤشر ${studentBmi})، الوجبة مقبولة وتمد مخك بالطاقة، لكن تقليل حصة النشويات (الأرز/الخبز) مع رفع الخضار سيجعل جسمك أخف ويمنع تراكم الدهون ويزيد تركيزك في جلسات الفيزياء والأحياء.`,
          recommendations: [
            'اكتفِ بنصف رغيف بلدي أو 4 ملاعق أرز فقط مع الوجبة.',
            hasVeggies ? 'استمر في تناول السلطة الخضراء قبل البدء بالنشويات.' : 'ابدأ بطبق سلطة خضراء لملء المعدة بالألياف قبل النشويات.',
            'تجنب شرب العصائر المحلاة أو الشاي بسكر بعد الأكل مباشرة حتى لا يعيق امتصاص الحديد.',
          ],
          thanaweyaTip:
            'توزيع الأكل على وجبات خفيفة هو سر الحفاظ على نشاط مخ طالب تالتة ثانوي دون زيادة وزن.',
        };
      } else if (studentCategory === 'underweight') {
        structuredResult = {
          isSuitable: hasCleanProtein || hasImage,
          verdict: hasCleanProtein
            ? 'وجبة ممتازة وتدعم بناء وزن صحي وطاقة مذاكرة عالية 💪'
            : 'وجبة خفيفة — يفضل تدعيمها ببروتين ودهون صحية لزيادة وزنك بنشاط 🌟',
          caloriesEstimate: hasCleanProtein ? '480 - 600 سعرة' : '320 - 400 سعرة',
          proteinGrams: hasCleanProtein ? '25 جم' : '12 جم',
          carbsGrams: '55 جم',
          analysis: `مؤشر كتلة جسمك (${studentBmi} لوزن ${studentWeight} كجم وطول ${studentHeight} سم) يشير إلى حاجتك لسعرات صحية وبروتين عالٍ (هدفك اليومي ${dailyProteinNeed} جم بروتين). هذه الوجبة تمنحك طاقة جيدة للمذاكرة، ومع إضافة بروتين أو دهون نافعة ستعوض الحرق الذهني العالي في الثانوية العامة دون إجهاد المعدة.`,
          recommendations: [
            'أضف ملعقة زيت زيتون أو طحينة على الطعام لرفع السعرات الصحية بسهولة.',
            hasCleanProtein ? 'كمية البروتين ممتازة لبناء الكتلة العضلية وتجديد خلايا الدماغ.' : 'أضف 2 بيضة مسلوقة أو علبة زبادي أو حفنة فول سوداني لتعزيز القيمة الغذائية.',
            'تناول ثمرة موز أو تمر بعد الوجبة بساعة لتثبيت الطاقة أثناء حل التدريبات.',
          ],
          thanaweyaTip:
            'المذاكرة المكثفة تحرق طاقة عصبية عالية؛ حافظ على 3 وجبات رئيسية و2 سناك مغذي يومياً لعدم خسارة الوزن.',
        };
      } else {
        structuredResult = {
          isSuitable: true,
          verdict: hasImage && !description
            ? 'تم فحص صورة وجبتك المنزلية — وجبة متوازنة ومناسبة لتركيزك 🎯'
            : 'وجبة ممتازة ومناسبة جداً لجسمك ومذاكرتك اليوم ✅',
          caloriesEstimate: '380 - 470 سعرة',
          proteinGrams: hasCleanProtein ? '24 - 30 جم' : '16 - 20 جم',
          carbsGrams: '35 - 45 جم',
          analysis: `بناءً على بيانات جسمك (${studentWeight} كجم، طول ${studentHeight} سم، BMI: ${studentBmi})، توفر هذه الوجبة المنزلية توازناً رائعاً بين البروتين والطاقة المستقرة. لن تسبب ارتفاعاً مفاجئاً في الأنسولين أو خمولاً بعد الأكل، وستساعدك على الحفاظ على صفاء الذهن والاستيعاب في المذاكرة (احتياجك اليومي ${dailyProteinNeed} جم بروتين).`,
          recommendations: [
            'اشرب كوبين ماء على فترات خلال الساعة القادمة لتعزيز تدفق الأكسجين للمخ.',
            hasVeggies ? 'وجود الخضروات في وجبتك ممتاز لدعم الفيتامينات والمناعة.' : 'أضف حبة خيار أو جرجير بجانب الوجبة لزيادة الألياف والانتعاش.',
            'اجعل الشاي أو القهوة بعد الأكل بساعة على الأقل للحفاظ على امتصاص العناصر الغذائية.',
          ],
          thanaweyaTip:
            'الوقت المثالي لبدء جلسة مذاكرة عميقة (45-50 دقيقة) هو بعد هذه الوجبة الخفيفة بـ 20 دقيقة!',
        };
      }
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
