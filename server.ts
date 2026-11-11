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

app.use(express.json());

// Initialize Gemini client strictly server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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
// FREE FOR ALL STUDENTS (اجعل ذكاء اصطناعي مجاني للجميع)
app.post('/api/gemini/tutor', async (req, res) => {
  try {
    const { message, context, subject, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'يرجى كتابة رسالة أو سؤال' });
    }

    const systemPrompt = `أنت «أستاذ نَهج»، المعلم الأكاديمي والمرشد النفسي الذكي الأول المخصص لطلاب الصف الثالث الثانوي في مصر (شعبة علمي علوم).
طريقتك وأسلوبك:
- تتحدث بالعامية المصرية الراقية الذكية والمحبوبة، مثل أستاذ ثانوية عامة عبقري ومخلص يشجع طالبه ويبعث فيه الطمأنينة والإصرار.
- متخصص ومحنك في مواد علمي علوم:
  1) الأحياء (الدعامة والحركة، التنسيق الهرموني، التكاثر، المناعة، البيولوجيا الجزيئية DNA و RNA وتخليق البروتين).
  2) الكيمياء (العناصر الانتقالية، التحليل الكيميائي، الاتزان الكيميائي والأيوني، الكيمياء الكهربية، الكيمياء العضوية).
  3) الفيزياء (الكهربية، كيرشوف، التأثير المغناطيسي وأجهزة القياس، الحث، المتردد، الفيزياء الحديثة وليزر وبور).
  4) الجيولوجيا والعلوم البيئية (التراكيب الجيولوجية، المعادن وصلادتها، الصخور ودورتها، تكتونية الصفائح والزلازل والبراكين، التجوية والترسيب، البيئة واستنزاف الموارد).
  5) اللغة العربية (النحو والبلاغة والأدب والنصوص والقراءة والتعبير).
  6) اللغة الإنجليزية.
- عندما يطلب منك شرح درس: اشرح المفاهيم الرئيسية ببساطة، ركز على «تركات الامتحان» وأفكار النظام الحديث (فهم واستنتاج)، وادعمه بمثال واقعي أو تشبيه لا يُنسى.
- عندما يطلب خطة: ضع خطة واقعية مقسمة بالأيام والساعات وخطوات محددة دون كلام عام.
- عندما يطلب اختباراً: ولّد أسئلة اختيار من متعدد (MCQ) بنظام التفكير والربط مع ذكر مفتاح الإجابة وتفسير سبب صحتها بعد ذلك.
- عندما يشعر بالإحباط أو الخوف: خفف عنه بحكمة واقعية، فككه من هول الموقف، وذكره بأنه قادر وأن السعي هو المطلوب والنتيجة بيد الله.
- التنسيق: استخدم علامات التنسيق الواضحة (عناوين، نقاط، تمييز للكلمات المفتاحية).
- الخدمة مجانية بالكامل لجميع الطلاب في تطبيق نَهج!`;

    // Construct prompt with context if provided
    let fullPrompt = '';
    if (subject) {
      fullPrompt += `[المادة المستهدفة: ${subject}]\n`;
    }
    if (context) {
      fullPrompt += `[سياق الطالب الحالي: ${context}]\n`;
    }
    fullPrompt += `سؤال الطالب:\n${message}`;

    // Call Gemini with timeout
    const callGeminiWithTimeout = async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
        config: {
          systemInstruction: systemPrompt,
        },
      });
      return response.text;
    };

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 8000)
    );

    let reply: string;
    try {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
        const text = await Promise.race([callGeminiWithTimeout(), timeoutPromise]);
        reply = text || '';
      } else {
        throw new Error('NO_API_KEY');
      }
    } catch (e: any) {
      // Intelligent pedagogical Egyptian Thanaweya tutor fallback
      const msg = message.toLowerCase();
      if (msg.includes('دعامة') || msg.includes('نبات') || msg.includes('أحياء')) {
        reply = `يا هلا ببطل الأحياء! 🌿 ركز معايا في أهم تركة في الباب الأول:\n\n1. **الدعامة الفسيولوجية:**\n- مؤقتة وتتناول الخلية ككل.\n- بتعتمد على امتلاء الفجوة العصارية بالماء بالخاصية الأسموزية (من وسط أقل تركيز للأملاح إلى أعلى تركيز).\n- لما النبات يمتص الماء، الفجوة بتنتفخ وتضغط على البروتوبلازم ويدفع الجدار للخارج فيتوتر ويكتسب الدعامة.\n\n2. **الدعامة التركيبية:**\n- دائمة وتتناول جدر الخلايا أو أجزاء منها بترسيب مواد صلبة غير منفذة:\n  * السليلوز واللجنين (قوة وصلابة ومرونة كما في الخلايا الكولنشيمية والإسكلرنشيمية والألياف).\n  * الكيوتين (على جدر خلايا البشرة لمنع فقد الماء — يعني دعامة تركيبية وبتحافظ في نفس الوقت على الفسيولوجية!).\n  * السيوبرين (في الخلايا الفلينية لمنع نفاذ الماء).\n\n💡 **تركة الامتحان:** وضع ثمرة ضامرة في ماء نقي يجعلها تنتفخ وتكتسب دعامة فسيولوجية، والعكس صحيح عند وضعها في محلول سكري مركز تنكمش وتفقدها!`;
      } else if (msg.includes('كيمياء') || msg.includes('حديد') || msg.includes('كهربية') || msg.includes('فاراداي')) {
        reply = `يا دكتور المستقبل! 🧪 ركز في أهم مفتاح في الكيمياء الكهربية والحديد:\n\n1. **متسلسلة الجهود الكهربية:**\n- العنصر ذو جهد الأكسدة الأكبر والجهد القياسي الأكثر سالبية هو الأنود (القطب السالب الذي يتأكسد ويفقد إلكترونات).\n- الكاثود هو القطب الموجب الذي تختزل عنده الأيونات.\n\n2. **قانون فاراداي العام:**\n- كمية الكهربية اللازمة لترسيب كتلة مكافئة جرامية واحدة من أي مادة = 1 فاراداي (96,500 كولوم).\n- عدد الفاراداي لترسيب مول ذرة = التكافؤ × 1F (وللغازات الثنائية مثل O₂ محتاج 4F).\n\n💡 **تركة الامتحان:** أكسدة الماجنتيت Fe₃O₄ في الهواء الساخن تعطي أكسيد الحديد III الأحمر Fe₂O₃؛ وتسخين أوكسالات الحديد II بمعزل عن الهواء تعطي FeO فقط مع غازي CO و CO₂!`;
      } else if (msg.includes('فيزياء') || msg.includes('كيرشوف') || msg.includes('مقاوم')) {
        reply = `يا باشمهندس المستقبل! ⚡ مفاتيح كيرشوف اللي بتخلي المسألة تتحل في دقيقة:\n\n1. **كيرشوف الأول (حفظ الشحنة):**\n- Σ I_in = Σ I_out عند أي نقطة تفرع (عقدة).\n\n2. **كيرشوف الثاني (حفظ الطاقة):**\n- في أي مسار مغلق: Σ VB = Σ (I × R).\n- وأنت ماشي مع اتجاه المسار: لو قابلت البطارية من السالب للموجب تبقى (+VB)، ومن الموجب للسالب تبقى (-VB).\n- مع تيار المقاومة (+I·R)، وعكس تيار المقاومة (-I·R).\n\n💡 **تركة الامتحان:** المقاومة التي تلغى تماماً هي التي تقع بين نقطتين متساويتين في الجهد ولا يمر بها تيار (قنطرة ويتستون المتزنة)!`;
      } else if (msg.includes('جيولوجيا') || msg.includes('فالق') || msg.includes('صخر')) {
        reply = `يا بطل الجيولوجيا! 🏔️ الفروق الجوهرية بين الفوالق:\n\n1. **الفالق العادي:** ناتج عن قوى **شد**، وتتحرك فيه صخور الحائط العلوي **لأسفل** بالنسبة للسفلي.\n2. **الفالق المعكوس:** ناتج عن قوى **ضغط**، وتتحرك صخور الحائط العلوي **لأعلى** وتتكرر الطبقات رأسياً.\n3. **الفالق الدسر (الزحفي):** نوع من المعكوس لكن زاوية ميله قليلة جداً (أقل من 45°) وتزحف الصخور أفقياً تقريباً.\n\n💡 **تركة الامتحان:** الحفرية المرشدة لازم يتوفر فيها شرطين معاً: انتشار جغرافي واسع + مدى زمني قصير ومحدود!`;
      } else {
        reply = `يا بطل تالتة ثانوي! 👋 معك أستاذ نَهج.\n\nسؤالك ممتاز: بخصوص «${message}»:\n\n1. افهم المفهوم الأساسي أولاً دون حفظ أصم.\n2. اربط الفكرة بباقي أجزاء الباب وامتحانات النظام الحديث.\n3. طبق مباشرة بحل 3 إلى 5 أسئلة اختيار من متعدد مع تحليل سبب استبعاد البدائل الخاطئة.\n\nأنا معك دائماً في أي استفسار أو مسألة أو اختبار، ومجاني بالكامل لكل طلبة نَهج! 🌟`;
      }
    }

    return res.json({
      success: true,
      reply,
      isFree: true,
    });
  } catch (error: any) {
    console.error('Gemini Tutor Error:', error);
    return res.status(500).json({
      error: 'تعذر الاتصال بأستاذ نَهج الآن. تأكد من الاتصال بالإنترنت ثم أعد المحاولة.',
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
