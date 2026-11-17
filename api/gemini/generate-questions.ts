import {
  getServerGeminiClient,
  classifyServerGeminiError,
  runServerWithRetry,
  parseRequestBody,
  Type,
  ThinkingLevel,
} from '../_gemini.js';
import {
  buildQuestionGeneratorPrompt,
  buildQuestionGeneratorSystemInstruction,
  generateQuestionsFallback,
  normalizeGeneratedQuestions,
  QuestionGenerationParams,
} from '../../src/utils/questionGenerator.js';
import {
  callStrongSecondaryAI,
  extractJsonPayloadFromText,
} from '../../src/utils/aiProviders.js';
import { QuestionDifficultyFilter, QuestionTypeFilter } from '../../src/types/index.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = parseRequestBody(req);
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

    const activeAi = getServerGeminiClient();
    const systemInstruction = buildQuestionGeneratorSystemInstruction();
    const userPrompt = buildQuestionGeneratorPrompt(params);

    let questions = [] as ReturnType<typeof normalizeGeneratedQuestions>;
    let responseSource: 'gemini' | 'fallback' = 'fallback';
    let providerLabel = 'المحرك التعليمي السريع';
    let apiWarning: string | undefined;

    if (activeAi) {
      try {
        const rawJsonText = await runServerWithRetry(async () => {
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
        const isAbort = err?.name === 'TimeoutError' || err?.name === 'AbortError';
        const classified = classifyServerGeminiError(isAbort ? new Error('TIMEOUT') : err);
        apiWarning = classified.userWarning;
        console.warn('Vercel Gemini Question Generator failover triggered:', err?.message || err);
      }
    }

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
        console.warn('Vercel secondary AI question generator error:', err?.message || err);
      }
    }

    if (questions.length === 0) {
      if (!activeAi && !apiWarning) {
        apiWarning =
          'مفتاح GEMINI_API_KEY غير مضاف في إعدادات البيئة؛ تم التوليد من المحرك التعليمي السريع.';
      }
      questions = generateQuestionsFallback(params);
    }

    return res.status(200).json({
      success: true,
      questions,
      source: responseSource,
      providerLabel,
      warning: apiWarning,
    });
  } catch (error: any) {
    console.error('Vercel Question Generator Error:', error);
    return res.status(500).json({
      success: false,
      error: 'تعذر توليد الأسئلة التفاعلية حالياً، يرجى إعادة المحاولة.',
    });
  }
}
