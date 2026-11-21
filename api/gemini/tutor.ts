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
import { callStrongSecondaryAI } from '../../src/utils/aiProviders.js';

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

    const activeAi = getServerGeminiClient(req);
    const modeDepth: TutorDeepMode = deepMode === 'fast' ? 'fast' : 'deep';
    const systemPrompt = buildTutorSystemPrompt(tutorMode, modeDepth);
    const formattedContents = buildTutorFormattedContents({
      message,
      subject,
      context,
      history,
    });

    let reply = '';
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
          const result = await runServerWithRetry(
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
          const classified = classifyServerGeminiError(isAbort ? new Error('TIMEOUT') : err);
          apiWarning = classified.userWarning;
          console.warn(`Vercel Gemini tutor (${candidate.model}) failover triggered:`, err?.message || err);
        }
      }
    }

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

    if (!reply) {
      if (!activeAi && !apiWarning) {
        apiWarning = 'مفتاح GEMINI_API_KEY غير مضاف في إعدادات البيئة؛ تم الرد عبر المحرك التعليمي السريع.';
      }
      reply = generateTutorFallback({ message, subject, tutorMode });
    }

    return res.status(200).json({
      success: true,
      reply,
      source: responseSource,
      providerLabel,
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
