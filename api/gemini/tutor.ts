import {
  getServerGeminiClient,
  classifyServerGeminiError,
  runServerWithRetry,
  parseRequestBody,
  ThinkingLevel,
} from '../_gemini.js';
import { generateTutorFallback } from '../../src/utils/aiFallbacks.js';
import {
  buildTutorSystemPrompt,
  buildTutorFormattedContents,
  TutorDeepMode,
} from '../../src/utils/tutorPrompts.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = parseRequestBody(req);
    const { message, context, subject, history, tutorMode, deepMode } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'يرجى كتابة رسالة أو سؤال أولاً' });
    }

    const activeAi = getServerGeminiClient();
    const modeDepth: TutorDeepMode = deepMode === 'deep' ? 'deep' : 'fast';
    const systemPrompt = buildTutorSystemPrompt(tutorMode, modeDepth);
    const formattedContents = buildTutorFormattedContents({
      message,
      subject,
      context,
      history,
    });

    let reply = '';
    let responseSource: 'gemini' | 'fallback' = 'fallback';
    let apiWarning: string | undefined;

    if (activeAi) {
      try {
        const result = await runServerWithRetry(async () => {
          const response = await activeAi.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: formattedContents,
            config: {
              systemInstruction: systemPrompt,
              thinkingConfig: {
                thinkingLevel:
                  modeDepth === 'deep' ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW,
              },
            },
          });
          return response.text || '';
        }, 1, 25000);

        if (result && result.trim()) {
          reply = result.trim();
          responseSource = 'gemini';
        }
      } catch (err: any) {
        const classified = classifyServerGeminiError(err);
        apiWarning = classified.userWarning;
        console.warn('Vercel Gemini tutor fallback triggered:', err?.message || err);
      }
    } else {
      apiWarning = 'مفتاح GEMINI_API_KEY غير مضاف في إعدادات البيئة؛ تم الرد عبر المحرك التعليمي السريع.';
    }

    if (!reply) {
      reply = generateTutorFallback({ message, subject, tutorMode });
    }

    return res.status(200).json({
      success: true,
      reply,
      source: responseSource,
      warning: apiWarning,
      isFree: true,
    });
  } catch (error: any) {
    console.error('Vercel Gemini Tutor Error:', error);
    return res.status(500).json({
      success: false,
      error: 'تعذر معالجة سؤالك حالياً، يرجى إعادة المحاولة.',
    });
  }
}
