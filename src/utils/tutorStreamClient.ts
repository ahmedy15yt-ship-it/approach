import { generateTutorFallback } from './aiFallbacks';

export interface StreamTutorParams {
  message: string;
  subject?: string;
  context?: string;
  tutorMode?: string;
  deepMode?: 'fast' | 'deep';
  history?: Array<{ role: string; text: string }>;
  signal?: AbortSignal;
  onChunk: (accumulatedText: string, delta: string) => void;
}

export interface StreamTutorResult {
  reply: string;
  source?: 'gemini' | 'fallback';
  warning?: string;
}

export async function streamTutorReply({
  message,
  subject,
  context,
  tutorMode = 'explain',
  deepMode = 'fast',
  history = [],
  signal,
  onChunk,
}: StreamTutorParams): Promise<StreamTutorResult> {
  const payload = JSON.stringify({
    message,
    subject,
    context,
    tutorMode,
    deepMode,
    history,
  });

  // 1) Try fast SSE streaming endpoint first
  const streamRes = await fetch('/api/gemini/tutor-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: payload,
  });

  const contentType = streamRes.headers.get('content-type') || '';

  if (streamRes.ok && contentType.includes('text/event-stream') && streamRes.body) {
    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let sseBuffer = '';
    let accumulated = '';
    let finalSource: 'gemini' | 'fallback' | undefined;
    let finalWarning: string | undefined;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const events = sseBuffer.split('\n\n');
      sseBuffer = events.pop() ?? '';

      for (const rawEvent of events) {
        const lines = rawEvent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (typeof parsed.chunk === 'string' && parsed.chunk.length > 0) {
              accumulated += parsed.chunk;
              onChunk(accumulated, parsed.chunk);
            }
            if (parsed.source) {
              finalSource = parsed.source;
            }
            if (parsed.warning) {
              finalWarning = parsed.warning;
            }
          } catch {
            // ignore incomplete/malformed SSE line
          }
        }
      }
    }

    // Flush any remaining buffered SSE line
    if (sseBuffer.trim().startsWith('data:')) {
      try {
        const parsed = JSON.parse(sseBuffer.trim().slice(5).trim());
        if (typeof parsed.chunk === 'string' && parsed.chunk.length > 0) {
          accumulated += parsed.chunk;
          onChunk(accumulated, parsed.chunk);
        }
        if (parsed.source) finalSource = parsed.source;
        if (parsed.warning) finalWarning = parsed.warning;
      } catch {
        // ignore
      }
    }

    if (accumulated.trim()) {
      return {
        reply: accumulated.trim(),
        source: finalSource || 'gemini',
        warning: finalWarning,
      };
    }
  }

  // 2) If stream endpoint returned non-404 error with JSON body, surface informative error unless 404
  if (!streamRes.ok && streamRes.status !== 404) {
    const rawText = await streamRes.text().catch(() => '');
    let errData: any = null;
    try {
      errData = rawText ? JSON.parse(rawText) : null;
    } catch {
      errData = null;
    }
    const errMsg =
      errData?.error ||
      errData?.message ||
      (streamRes.status === 429
        ? 'تم تجاوز حد الطلبات المؤقت لخدمة الذكاء الاصطناعي، يرجى الانتظار قليلاً ثم المحاولة.'
        : streamRes.status === 401 || streamRes.status === 403
        ? 'تعذر التحقق من صلاحية مفتاح Gemini API على الخادم.'
        : `تعذر الحصول على رد من الخادم (كود ${streamRes.status}).`);
    throw new Error(errMsg);
  }

  // 3) Fallback to standard JSON endpoint /api/gemini/tutor
  const fallbackRes = await fetch('/api/gemini/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: payload,
  });

  const rawText = await fallbackRes.text();
  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!fallbackRes.ok) {
    if (fallbackRes.status === 404) {
      const localReply = generateTutorFallback({ message, subject, tutorMode });
      onChunk(localReply, localReply);
      return {
        reply: localReply,
        source: 'fallback',
        warning: 'تم التجاوب عبر المحرك التعليمي الذكي المدمج.',
      };
    }
    const errDetail =
      data?.error ||
      data?.message ||
      (fallbackRes.status === 429
        ? 'تم تجاوز حد الطلبات المؤقت لخدمة الذكاء الاصطناعي، يرجى الانتظار قليلاً ثم المحاولة.'
        : fallbackRes.status === 401 || fallbackRes.status === 403
        ? 'تعذر التحقق من صلاحية مفتاح Gemini API على الخادم.'
        : `تعذر الحصول على رد من الخادم (كود ${fallbackRes.status}).`);
    throw new Error(errDetail);
  }

  if (data && typeof data.reply === 'string' && data.reply.trim()) {
    const replyText = data.reply.trim();
    onChunk(replyText, replyText);
    return {
      reply: replyText,
      source: data.source,
      warning: data.warning,
    };
  }

  throw new Error(data?.error || 'وصل رد فارغ من المعلم الذكي، يرجى إعادة المحاولة.');
}
