import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export { Type, ThinkingLevel };

let cachedKey: string | null = null;
let cachedClient: GoogleGenAI | null = null;

export function getServerGeminiClient(): GoogleGenAI | null {
  const rawKey = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined;
  const trimmedKey = rawKey ? rawKey.trim() : '';
  if (!trimmedKey || trimmedKey === 'MY_GEMINI_API_KEY') {
    cachedKey = null;
    cachedClient = null;
    return null;
  }
  if (cachedClient && cachedKey === trimmedKey) {
    return cachedClient;
  }
  try {
    cachedClient = new GoogleGenAI({
      apiKey: trimmedKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedKey = trimmedKey;
    return cachedClient;
  } catch (err) {
    console.error('Gemini SDK init note:', err);
    return null;
  }
}

export function classifyServerGeminiError(err: any): { retryable: boolean; userWarning: string } {
  const msg = String(err?.message || err || '');
  const status = Number(err?.status || err?.code || 0);

  if (status === 400 || msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
    return {
      retryable: false,
      userWarning: 'مفتاح Gemini API غير صالح — يرجى مراجعته في إعدادات البيئة (GEMINI_API_KEY).',
    };
  }
  if (status === 403 || msg.includes('PERMISSION_DENIED')) {
    return {
      retryable: false,
      userWarning: 'تم رفض صلاحية الوصول لنموذج Gemini — يرجى التحقق من مفتاح API.',
    };
  }
  if (status === 404 || msg.includes('NOT_FOUND')) {
    return {
      retryable: false,
      userWarning: 'نموذج Gemini المطلوب غير متاح حالياً.',
    };
  }
  if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    return {
      retryable: true,
      userWarning: 'تم تجاوز حد الطلبات المؤقت لخدمة Gemini، تم تقديم الرد من المحرك التعليمي البديل.',
    };
  }
  if (msg.includes('TIMEOUT') || status >= 500 || msg.includes('ECONNRESET') || msg.includes('fetch failed')) {
    return {
      retryable: true,
      userWarning: 'استغرق الاتصال بخدمة Gemini وقتاً أطول من المعتاد، تم تفعيل الرد السريع البديل.',
    };
  }
  return {
    retryable: true,
    userWarning: 'تعذر الوصول لخادم Gemini حالياً، تم تقديم إرشاد تعليمي سريع من المحرك البديل.',
  };
}

export async function runServerWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  timeoutMs = 25000
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
      );
      return await Promise.race([fn(), timeoutPromise]);
    } catch (err: any) {
      lastError = err;
      const { retryable } = classifyServerGeminiError(err);
      if (!retryable || attempt === maxRetries) {
        throw err;
      }
      const delayMs = 500 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export function parseRequestBody(req: any): Record<string, any> {
  if (!req?.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return typeof req.body === 'object' ? req.body : {};
}
