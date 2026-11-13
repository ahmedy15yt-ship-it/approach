import {
  getServerGeminiClient,
  classifyServerGeminiError,
  runServerWithRetry,
  parseRequestBody,
  Type,
  ThinkingLevel,
} from '../_gemini.js';
import { generateMealFallback, MealFallbackResult } from '../../src/utils/aiFallbacks.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = parseRequestBody(req);
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
    } = body;

    const studentWeight = Number(rawStudentWeight ?? weightKg) || 68;
    const studentHeight = Number(rawStudentHeight ?? heightCm) || 172;
    const hMeters = studentHeight > 0 ? studentHeight / 100 : 1.72;
    const studentBmi = Number(rawBmi) || Number((studentWeight / (hMeters * hMeters)).toFixed(1));
    const studentCategory: 'overweight' | 'underweight' | 'balanced' =
      category ||
      (studentBmi >= 25 ? 'overweight' : studentBmi < 18.5 ? 'underweight' : 'balanced');

    const activeAi = getServerGeminiClient();

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

    let structuredResult: MealFallbackResult | null = null;
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

        const rawJson = await runServerWithRetry(async () => {
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
        }, 2, 24000);

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
              thanaweyaTip:
                parsed.thanaweyaTip ||
                'اشرب كوب ماء قبل المذاكرة بـ 10 دقائق لتنشيط الدورة الدموية للمخ.',
            };
            mealSource = 'gemini';
          }
        }
      } catch (err: any) {
        const classified = classifyServerGeminiError(err);
        mealWarning = classified.userWarning;
        console.warn('Vercel Gemini meal inspect error, using fallback:', err?.message || err);
      }
    } else {
      mealWarning = 'مفتاح GEMINI_API_KEY غير مضاف في إعدادات البيئة؛ تم التحليل عبر قاعدة التغذية المحلية.';
    }

    if (!structuredResult) {
      structuredResult = generateMealFallback({
        description,
        hasImage: Boolean(imageBase64),
        studentWeight,
        studentHeight,
        studentBmi,
        studentCategory,
      });
    }

    return res.status(200).json({
      success: true,
      ...structuredResult,
      source: mealSource,
      warning: mealWarning,
      weightKg: studentWeight,
      bmi: studentBmi,
    });
  } catch (error: any) {
    console.error('Vercel Meal Inspector Error:', error);
    return res.status(500).json({
      error: 'تعذر فحص الوجبة حالياً، يرجى المحاولة ثانية',
      details: error?.message,
    });
  }
}
