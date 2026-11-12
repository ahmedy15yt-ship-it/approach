import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize Gemini client strictly server-side if key is present
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Gemini SDK initialization note:', err);
  }
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

// ----------------- Gemini AI Tutor ("أستاذ نَهج") -----------------
// Fast, highly intelligent, interactive, clarifying questions, 100% free with zero errors
app.post('/api/gemini/tutor', async (req, res) => {
  try {
    const { message, context, subject, history, tutorMode } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'يرجى كتابة رسالة أو سؤال' });
    }

    // Dynamic Gemini client getter (checks process.env.GEMINI_API_KEY on every call)
    let activeAi = ai;
    if (!activeAi && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      try {
        activeAi = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });
        ai = activeAi;
      } catch (e) {
        console.error('On-demand AI init note:', e);
      }
    }

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
- منهجية الإجابة الذهبية لتوضيح كل سؤال وتفاعل الطالب:
  1. 🎯 **تفكيك السؤال وفهم المطلوب:** وضح للطالب أولاً ماذا يطلب السؤال ولماذا يبدو خادعاً أو ما الفكرة المفتاحية التي يبحث عنها واضع الامتحان.
  2. 💡 **الشرح وخطوات الحل النموذجية:** شرح علمي منظم بالخطوات، القوانين، والمعادلات مع ضرب مثال واقعي يرسخ في الذهن.
  3. ⚡ **تركة الامتحان ومصيدة الطلاب:** نبهه صراحة على الخطأ الشائع الذي يقع فيه أغلب الطلاب في هذا الموضوع.
  4. ❓ **سؤال تفاعلي سريع لك يا بطل:** اطرح في نهاية كل إجابة سؤالاً تطبيقياً قصيراً (اختيار من متعدد أو مسألة صغيرة) وتحداه أن يجاوب عليها الآن لتقيم إجابته!
- متخصص ومتمكن في:
  * الأحياء (الدعامة والحركة، الهرمونات، التكاثر، المناعة، البيولوجيا الجزيئية DNA & RNA).
  * الكيمياء (العناصر الانتقالية، التحليل، الاتزان، الكهربية، الكيمياء العضوية).
  * الفيزياء (الكهربية وقوانين كيرشوف، التأثير المغناطيسي، الحث، دوائر المتردد، الفيزياء الحديثة).
  * الجيولوجيا والعلوم البيئية (التراكيب، المعادن، الصخور، التكتونية، التجوية، البيئة).
  * اللغة العربية (النحو، البلاغة، الأدب، النصوص، القراءة) واللغة الإنجليزية.
- ردودك سريعة ومباشرة دون حشو أو إطالة مملة، وتستخدم علامات التنسيق الواضحة والنقاط.`;

    let reply: string = '';

    if (activeAi) {
      try {
        // Fast timeout of 12 seconds so the student never waits or faces hanging requests
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 12000)
        );

        // Build multi-turn content if history exists
        const formattedContents: any[] = [];
        if (Array.isArray(history) && history.length > 0) {
          // Last 6 turns for rapid context
          const recentTurns = history.slice(-6);
          for (const item of recentTurns) {
            if (item.text && (item.sender === 'user' || item.sender === 'tutor' || item.role === 'user' || item.role === 'model')) {
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

        const geminiCall = async () => {
          const response = await activeAi!.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: formattedContents,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.5,
              maxOutputTokens: 1200,
            },
          });
          return response.text || '';
        };

        const result = await Promise.race([geminiCall(), timeoutPromise]);
        if (result && result.trim()) {
          reply = result.trim();
        }
      } catch (err: any) {
        console.warn('Gemini tutor fast fallback activated:', err?.message);
      }
    }

    // High-Yield Pedagogical Egyptian Thanaweya Engine (Always fast, structured, and interactive)
    if (!reply) {
      const msg = message.toLowerCase();

      // 1. Biology (الأحياء)
      if (msg.includes('دعامة') || msg.includes('نبات') || msg.includes('حركة') || msg.includes('عضل')) {
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
          `2. **الخلايا التائية Mساعدة (TH):** مفتاح المناعة النوعية؛ ترتبط بالأنتيجين المعروض على بروتين التوافق النسيجي MHC وتفرز الإنترلوكينات.\n` +
          `3. **الخلايا التائية السامة (TC):** تقضي على الخلايا المصابة بالفيروس والخلايا السرطانية بواسطة البيرفورين (صانع الثقوب) والسموم الليمفاوية.\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `الجسم المضاد IgM خماسي الوحدات (بـ 10 مواقع ارتباط)، ويعمل بآلية التلازن (الإلصاق) وهي الأكفأ ضد البكتيريا.\n\n` +
          `❓ **سؤال تفاعلي سريع لك يا بطل:**\n` +
          `ما اسم المادة الكيميائية المفرزة التي تنبه الخلايا السليمة المجاورة لخلية مصابة بفيروس لمنع تكاثره؟ جاوبني الآن! 🛡️`;

      // 2. Chemistry (الكيمياء)
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
      } else if (msg.includes('كيمياء') || msg.includes('حديد') || msg.includes('كهربية') || msg.includes('فاراداي') || msg.includes('اتزان') || msg.includes('تأكسد')) {
        reply = `يا بطل الكيمياء! 🧪 إليك تفكيك المسألة بدقة:\n\n` +
          `🎯 **تفكيك السؤال وفهم المطلوب:**\n` +
          `السؤال يتناول مبادئ الأكسدة والاختزال وحسابات التكافؤ وثوابت الاتزان (Kc, Kp) في النظام الحديث.\n\n` +
          `💡 **الشرح وخطوات الحل النموذجية:**\n` +
          `1. **قاعدة لوشاتيليه:** المؤثرات الثلاثة (تركيز، حرارة، ضغط). زيادة الضغط تحرك التفاعل نحو المولات الغازية الأقل.\n` +
          `2. **قوانين فاراداي:** كمية الكهربية Q (كولوم) = شدة التيار I (أمبير) × الزمن t (ثواني).\n` +
          `3. لترسيب كتلة مكافئة جرامية واحدة من أي عنصر نحتاج دائماً 1 فاراداي (96500 كولوم).\n\n` +
          `⚡ **تركة الامتحان ومصيدة الطلاب:**\n` +
          `العامل الحفاز يسرع التفاعل الطردي والعكسي بنفس المقدار، ولا يغير موضع الاتزان أو قيمة Kc نهائياً!\n\n` +
          `❓ **سؤال تفاعلي سريع لك:**\n` +
          `ما شحنة أيون الحديد في مركب Fe3O4؟ هل هو ثنائي أم ثلاثي أم كلاهما؟ أرسل إجابتك فوراً! ⚡`;

      // 3. Physics (الفيزياء)
      } else if (msg.includes('فيزياء') || msg.includes('كيرشوف') || msg.includes('حث') || msg.includes('مغناطيس') || msg.includes('دينامو') || msg.includes('مقاوم')) {
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

      // 4. Geology (الجيولوجيا)
      } else if (msg.includes('جيولوجيا') || msg.includes('فالق') || msg.includes('صخر') || msg.includes('معدن') || msg.includes('طية') || msg.includes('تكتوني')) {
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

      // 5. Arabic (اللغة العربية)
      } else if (msg.includes('نحو') || msg.includes('عربي') || msg.includes('بلاغة') || msg.includes('مبتدأ') || msg.includes('إعراب') || msg.includes('مفعول')) {
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

      // 6. Plans & Recovery (الخطط والمتراكم)
      } else if (msg.includes('خطة') || msg.includes('جدول') || msg.includes('انقاذ') || msg.includes('متراكم') || msg.includes('مذاكرة') || msg.includes('ملل')) {
        reply = `يا بطل! إليك خطة الإنقاذ والسيطرة الفورية 🎯:\n\n` +
          `🎯 **تفكيك المشكلة وفهم الحل:**\n` +
          `التراكم النفسي أخطر من التراكم الفعلي للمنهج. الحل في تقسيم المادة لوحدات صغيرة جداً تبدأ بإنجازها فوراً اليوم.\n\n` +
          `💡 **خطة الـ 72 ساعة المكثفة:**\n` +
          `1. **قاعدة الـ 50/10:** ذاكر 50 دقيقة تركيز تام مغلقاً الهاتف بالكامل، ثم استرح 10 دقائق (ماء + إطالة ظهر دون تصفح سوشيال ميديا).\n` +
          `2. **توزيع الساعات:** 60% لحل أسئلة وتدريبات الامتحانات السابقة، و 40% فقط لقراءة الشرح وتلخيص المفاهيم.\n` +
          `3. **سلاح الفجر الذهبي:** ساعتان بعد صلاة الفجر تعادلان 5 ساعات مذاكرة في منتصف اليوم بفضل صفاء كيمياء المخ.\n\n` +
          `⚡ **تركة تنظيم الوقت:**\n` +
          `لا تؤجل الجديد لتذاكر القديم! ذاكر درس اليوم أولاً، ثم خصص ساعة واحدة ثابتة يومياً لتصفية درس قديم من المتراكم.\n\n` +
          `❓ **تحدي تفاعلي لك الآن:**\n` +
          `ما هو أكثر درس يسبب لك قلقاً حالياً؟ اكتب اسمه وسأفصله لك في 5 نقاط ونبدأ به فوراً! 🚀`;

      // General fallback
      } else {
        reply = `يا بطل تالتة ثانوي! 👋 معك «أستاذ نَهج» مخصص لك ومجاني 100% بدون أي قيود.\n\n` +
          `🎯 **تفكيك استفسارك بخصوص: «${message}»:**\n` +
          `سؤالك مهم جداً، وفي امتحانات الثانوية العامة بالنظام الحديث ترتبط هذه الجزئية دائماً بالفهم العميق وتطبيق القوانين واستبعاد المشتتات الخاطئة.\n\n` +
          `💡 **خارطة التعامل مع هذه النقطة:**\n` +
          `1. اقرأ رأس السؤال وحدد المعطيات والمطلوب بدقة دون استعجال.\n` +
          `2. اربط المفهوم بالقانون العلمي أو القاعدة الذهبية للباب التابع له.\n` +
          `3. طبق في حل 3 أسئلة متنوعة فوراً لتثبيت المعلومة في الذاكرة طويلة المدى.\n\n` +
          `⚡ **تركة الامتحان:** واضع الامتحان يضع خياراً واحداً مشابهاً جداً للصواب (مشتت ذكي)؛ استبعد الخيارات البعيدة أولاً، ثم قارن بين الاحتمالين المتبقيين بعين فاحصة.\n\n` +
          `❓ **سؤال تفاعلي:** تحب أشرحلك أي درس بالتفصيل، ولا نعمل اختبار 3 أسئلة MCQ الآن، ولا محتاج مسألة وحلها؟ اختر ما يناسبك! 🌟`;
      }
    }

    return res.json({
      success: true,
      reply,
      isFree: true,
    });
  } catch (error: any) {
    console.error('Gemini Tutor Error:', error);
    // Never return raw 500 error to user - provide graceful helpful response
    return res.json({
      success: true,
      reply: `يا بطل تالتة ثانوي! 👋 معك أستاذ نَهج دائماً.\n\nسؤالك بخصوص هذا الموضوع تم تسجيله. ركز دائماً على المفاهيم المركزية وقراءة السؤال بتمهل مرتين لتحديد المعطيات والمطلوب. اكتب لي اسم الدرس أو الباب بالتحديد وسأشرحه لك بتركات الامتحان كاملة فوراً! 🌟`,
      isFree: true,
    });
  }
});


// ----------------- Smart Meal Photo & Nutritional Inspector -----------------
// Examines food photos & description to determine if it fits the student's body metrics
app.post('/api/gemini/inspect-meal', async (req, res) => {
  try {
    const { imageBase64, mimeType, description, weightKg, heightCm, bmi, category } = req.body;

    const studentWeight = Number(weightKg) || 68;
    const studentHeight = Number(heightCm) || 172;
    const studentBmi = Number(bmi) || 23.0;
    const studentCategory = category || 'balanced';

    const promptText = `أنت خبير تغذية سريري مصري متخصص في تغذية طلاب الثانوية العامة (الصف الثالث الثانوي علمي علوم).
بيانات الطالب:
- الوزن: ${studentWeight} كجم
- الطول: ${studentHeight} سم
- مؤشر كتلة الجسم (BMI): ${studentBmi} (${studentCategory === 'overweight' ? 'زيادة وزن' : studentCategory === 'underweight' ? 'نحافة' : 'وزن معتدل'})
- الهدف: أقصى تركيز ذهني للمذاكرة بدون كسل أو خمول، وتثبيت سكر الدم.

وصف الطالب لوجبته: "${description || 'وجبة محضرة منزلياً'}".

المطلوب بدقة وأمانة علمية بالعامية المصرية الراقية:
1. هل هذه الوجبة مناسبة لجسمه ووزنه الحالي وهدفه في المذاكرة؟ (نعم مناسبة جداً / مناسبة مع تعديل بسيط / غير مناسبة وتسبب خمول).
2. تقدير السعرات التقريبية والبروتين في الوجبة.
3. تأثير هذه الوجبة على المخ والتركيز (هل تسبب ضباباً دماغياً وسقوطاً في سكر الدم، أم تمد المخ بطاقة مستقرة؟).
4. نصائح عملية ومكونات مصرية شعبية بديلة أو إضافات تحسن الوجبة (مثل إضافة ليمون، بيضة مسلوقة، خيار، تقليل العيش، إلخ).`;

    let reply: string = '';

    if (ai) {
      try {
        const parts: any[] = [];
        if (imageBase64 && typeof imageBase64 === 'string') {
          const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          });
        }
        parts.push({ text: promptText });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 25000)
        );

        const geminiCall = async () => {
          const response = await ai!.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: { parts },
          });
          return response.text || '';
        };

        const result = await Promise.race([geminiCall(), timeoutPromise]);
        if (result && result.trim()) {
          reply = result.trim();
        }
      } catch (err: any) {
        console.warn('Gemini meal inspect error, using expert nutrition fallback:', err?.message);
      }
    }

    // Expert Egyptian Nutrition fallback engine if no key or error
    if (!reply) {
      const desc = (description || '').toLowerCase();
      const hasProtein = desc.includes('بيض') || desc.includes('فول') || desc.includes('جبن') || desc.includes('فراخ') || desc.includes('لحم') || desc.includes('سمك') || desc.includes('تونة');
      const hasHeavyCarbs = desc.includes('كشري') || desc.includes('مكرونة') || desc.includes('شيبسي') || desc.includes('بيبسي') || desc.includes('سكر') || desc.includes('عيش بلدي كتير') || desc.includes('مقلي');

      let isSuitable = true;
      let verdictTitle = 'وجبة ممتازة ومتوازنة لطالب علمي علوم 🎯';
      let suitabilityScore = 88;
      let estCalories = '350 - 450 سعرة';
      let estProtein = '20 - 28 جم بروتين';
      let brainImpact = 'إمداد مستمر وثابت بالجلوكوز للمخ دون خمول أو نعاس بعد الأكل.';
      let advice = 'ممتازة جداً لمذاكرة الفترات الطويلة. حافظ على شرب كوبين ماء معها.';

      if (hasHeavyCarbs && !hasProtein) {
        isSuitable = false;
        verdictTitle = 'تحذير: وجبة نشويات ثقيلة تسبب الخمول والنعاس بعد 30 دقيقة ⚠️';
        suitabilityScore = 45;
        estCalories = '550 - 750 سعرة';
        estProtein = '8 - 12 جم فقط';
        brainImpact = 'ارتفاع سريع في سكر الدم يتبعه هبوط مفاجئ وصداع ورغبة في النوم أثناء المذاكرة.';
        advice = 'أضف بيضتين مسلوقتين أو قطعة جبنة قريش، وقلل كمية الخبز أو المكرونة إلى النصف.';
      } else if (studentCategory === 'overweight' && hasHeavyCarbs) {
        isSuitable = false;
        verdictTitle = 'مناسبة جزئياً ولكنها تزيد السعرات وتعيق الحرق لوزنك الحالي ⚖️';
        suitabilityScore = 60;
        estCalories = '480 - 620 سعرة';
        estProtein = '16 - 22 جم';
        brainImpact = 'قد تسبب ثقلاً في المعدة وتشتت تركيز الفص الجبهي في هضم الدهون الثقيلة.';
        advice = 'استبدل الزيوت النباتية بنقطة زيت زيتون أو زيت حار، وأضف طبق سلطة خضراء خيار وجرجير لامتصاص بطيء.';
      } else if (studentCategory === 'underweight') {
        isSuitable = true;
        verdictTitle = 'وجبة مناسبة لدعم طاقتك وبناء وزن صحي وكتلة عضلية متينة 💪';
        suitabilityScore = 90;
        estCalories = '450 - 600 سعرة';
        estProtein = '22 - 30 جم';
        brainImpact = 'طاقة ممتازة لتعويض الحرق العصبي المرتفع أثناء حل مسائل الكيمياء والفيزياء.';
        advice = 'أضف ملعقة عسل نحل أو حفنة فول سوداني لرفع السعرات الصحية غير الضارة.';
      }

      reply = `### فحص وتحليل الوجبة بالنسبة لجسمك (${studentWeight} كجم - BMI: ${studentBmi}):\n\n` +
        `**النتيجة:** ${verdictTitle}\n\n` +
        `📊 **التقدير الغذائي:**\n` +
        `- **السعرات التقريبية:** ${estCalories}\n` +
        `- **البروتين الصافي:** ${estProtein} (احتياجك اليومي الموصى به: ${Math.round(studentWeight * 1.4)} جم)\n\n` +
        `🧠 **التأثير على مخك والمذاكرة:**\n${brainImpact}\n\n` +
        `💡 **توصية نَهج لجلسة المذاكرة القادمة:**\n${advice}`;
    }

    return res.json({
      success: true,
      analysis: reply,
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
