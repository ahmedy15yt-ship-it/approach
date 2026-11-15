import {
  getServerGeminiClient,
  classifyServerGeminiError,
  parseRequestBody,
  ThinkingLevel,
} from '../_gemini.js';
import { generateTutorFallback } from '../../src/utils/aiFallbacks.js';
import {
  buildTutorSystemPrompt,
  buildTutorFormattedContents,
  TutorDeepMode,
} from '../../src/utils/tutorPrompts.js';

function sendSseEvent(res: any, payload: Record<string, any>) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = parseRequestBody(req);
  const { message, context, subject, history, tutorMode, deepMode } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: 'يرجى كتابة رسالة أو سؤال أولاً' });
  }

  // Establish SSE headers immediately for lowest possible Time-To-First-Byte
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  let closed = false;
  res.on?.('close', () => {
    if (!res.writableEnded) {
      closed = true;
    }
  });

  const activeAi = getServerGeminiClient();
  const modeDepth: TutorDeepMode = deepMode === 'deep' ? 'deep' : 'fast';
  const systemPrompt = buildTutorSystemPrompt(tutorMode, modeDepth);
  const formattedContents = buildTutorFormattedContents({
    message,
    subject,
    context,
    history,
  });

  let streamedAnyChunk = false;
  let apiWarning: string | undefined;

  if (activeAi) {
    const abortController = new AbortController();
    const firstChunkTimeout = setTimeout(() => {
      abortController.abort();
    }, 12000);

    try {
      const thinkingLevel =
        modeDepth === 'deep' ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW;

      const streamResult = await activeAi.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents: formattedContents,
        config: {
          abortSignal: abortController.signal,
          systemInstruction: systemPrompt,
          thinkingConfig: { thinkingLevel },
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
          sendSseEvent(res, { chunk: piece });
        }
      }

      clearTimeout(firstChunkTimeout);

      if (streamedAnyChunk && !closed) {
        sendSseEvent(res, { done: true, source: 'gemini', isFree: true });
        return res.end();
      }
    } catch (err: any) {
      clearTimeout(firstChunkTimeout);
      const isAbort = err?.name === 'AbortError' || abortController.signal.aborted;
      const classified = classifyServerGeminiError(isAbort ? new Error('TIMEOUT') : err);
      apiWarning = classified.userWarning;
      console.warn('Vercel Gemini stream fallback triggered:', err?.message || err);
    }
  } else {
    apiWarning = 'مفتاح GEMINI_API_KEY غير مضاف في إعدادات البيئة؛ تم الرد عبر المحرك التعليمي السريع.';
  }

  // Graceful fallback if Gemini stream produced nothing before an error
  if (!streamedAnyChunk && !closed) {
    const fallbackReply = generateTutorFallback({ message, subject, tutorMode });
    sendSseEvent(res, { chunk: fallbackReply });
    sendSseEvent(res, {
      done: true,
      source: 'fallback',
      warning: apiWarning,
      isFree: true,
    });
  } else if (!closed) {
    sendSseEvent(res, { done: true, source: 'gemini', isFree: true });
  }

  return res.end();
}
