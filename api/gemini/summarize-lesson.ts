import {
  getServerGeminiClient,
  classifyServerGeminiError,
  runServerWithRetry,
  parseRequestBody,
  ThinkingLevel,
} from '../_gemini.js';
import {
  buildLessonSummaryPrompt,
  buildLessonSummarySystemInstruction,
  generateLessonSummaryFallback,
  LessonSummaryGenerationParams,
  normalizeLessonSummary,
} from '../../src/utils/lessonSummary.js';
import {
  callStrongSecondaryAI,
  extractJsonPayloadFromText,
} from '../../src/utils/aiProviders.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = parseRequestBody(req);
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

    const activeAi = getServerGeminiClient(req);
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

    if (activeAi) {
      const candidateModels = [
        {
          model: 'gemini-3.1-flash-lite',
          thinkingLevel: ThinkingLevel.MINIMAL,
          timeoutMs: 22000,
          label: 'أستاذ نَهج (Gemini)',
        },
        {
          model: 'gemini-4-hydrogen',
          thinkingLevel: ThinkingLevel.LOW,
          timeoutMs: 18000,
          label: 'أستاذ نَهج (Gemini 4)',
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
          const rawJsonText = await runServerWithRetry(async () => {
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
            normalizedSummary = candidateSummary;
            apiWarning = undefined;
            break;
          }
        } catch (err: any) {
          const isAbort = err?.name === 'TimeoutError' || err?.name === 'AbortError';
          const classified = classifyServerGeminiError(isAbort ? new Error('TIMEOUT') : err);
          apiWarning = classified.userWarning;
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
      } catch {
        // Fallback below
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
    console.error('Summarize Lesson Error:', error);
    return res.status(500).json({
      success: false,
      error: 'تعذر إنشاء ملخص الدرس حالياً، يرجى إعادة المحاولة.',
    });
  }
}
