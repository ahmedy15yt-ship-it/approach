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
import { callStrongSecondaryAI } from '../../src/utils/aiProviders.js';

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

  const activeAi = getServerGeminiClient(req);
  const modeDepth: TutorDeepMode = deepMode === 'fast' ? 'fast' : 'deep';
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
    const candidateModels =
      modeDepth === 'deep'
        ? [
            { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 8500 },
            { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 6500 },
          ]
        : [
            { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 6000 },
          ];

    for (const candidate of candidateModels) {
      if (streamedAnyChunk || closed) break;
      const abortController = new AbortController();
      const firstChunkTimeout = setTimeout(() => {
        abortController.abort();
      }, candidate.timeoutMs);

      try {
        const streamResult = await activeAi.models.generateContentStream({
          model: candidate.model,
          contents: formattedContents,
          config: {
            abortSignal: abortController.signal,
            systemInstruction: systemPrompt,
            thinkingConfig: { thinkingLevel: candidate.thinkingLevel },
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
          sendSseEvent(res, {
            done: true,
            source: 'gemini',
            providerLabel: candidate.model,
            isFree: true,
          });
          return res.end();
        }
      } catch (err: any) {
        clearTimeout(firstChunkTimeout);
        const isAbort = err?.name === 'AbortError' || abortController.signal.aborted;
        const classified = classifyServerGeminiError(isAbort ? new Error('TIMEOUT') : err);
        apiWarning = classified.userWarning;
        console.warn(`Vercel Gemini stream (${candidate.model}) failover:`, err?.message || err);
      }
    }
  }

  if (!streamedAnyChunk && !closed) {
    const extMessages = formattedContents.map((c) => ({
      role: (c.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: c.parts.map((p) => p.text).join('\n'),
    }));
    const secondary = await callStrongSecondaryAI({
      systemInstruction: systemPrompt,
      messages: extMessages,
      timeoutMs: 9000,
    });
    if (secondary && !closed) {
      streamedAnyChunk = true;
      sendSseEvent(res, { chunk: secondary.text });
      sendSseEvent(res, {
        done: true,
        source: 'gemini',
        providerLabel: secondary.providerLabel,
        isFree: true,
      });
      return res.end();
    }
  }

  if (!streamedAnyChunk && !closed) {
    const fallbackReply = generateTutorFallback({ message, subject, tutorMode });
    sendSseEvent(res, { chunk: fallbackReply });
    sendSseEvent(res, {
      done: true,
      source: 'fallback',
      warning:
        apiWarning ||
        (!activeAi
          ? 'مفتاح GEMINI_API_KEY غير مضاف في إعدادات البيئة؛ تم الرد عبر المحرك التعليمي السريع.'
          : undefined),
      isFree: true,
    });
  } else if (!closed) {
    sendSseEvent(res, { done: true, source: 'gemini', isFree: true });
  }

  return res.end();
}
