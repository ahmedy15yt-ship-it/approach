import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export { Type, ThinkingLevel };

const clientCache = new Map<string, GoogleGenAI>();

export function resolveAppReferer(req?: any): string | undefined {
  const origin = req?.headers?.origin;
  if (typeof origin === 'string' && origin.startsWith('http')) {
    return origin.endsWith('/') ? origin : `${origin}/`;
  }
  const referer = req?.headers?.referer || req?.headers?.referrer;
  if (typeof referer === 'string' && referer.startsWith('http')) {
    return referer;
  }
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  if (typeof host === 'string' && host.trim()) {
    const proto = req?.headers?.['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    return `${proto}://${host.trim()}/`;
  }
  const envUrl = typeof process !== 'undefined' ? process.env?.APP_URL?.trim() : '';
  if (envUrl && envUrl.startsWith('http') && envUrl !== 'MY_APP_URL') {
    return envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
  }
  return undefined;
}

export function getServerGeminiClient(req?: any): GoogleGenAI | null {
  const rawKey = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined;
  const trimmedKey = rawKey ? rawKey.trim() : '';
  if (!trimmedKey || trimmedKey === 'MY_GEMINI_API_KEY') {
    return null;
  }

  const referer = resolveAppReferer(req);
  const cacheKey = `${trimmedKey}::${referer || 'default'}`;
  const cached = clientCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'aistudio-build',
    };
    if (referer) {
      headers['Referer'] = referer;
    }

    const client = new GoogleGenAI({
      apiKey: trimmedKey,
      httpOptions: {
        headers,
      },
    });
    if (clientCache.size > 16) {
      clientCache.clear();
    }
    clientCache.set(cacheKey, client);
    return client;
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
      userWarning: 'مفتاح Gemini API غير صالح — يرجى مراجعته في إعدادات البيئة (Settings > Secrets).',
    };
  }
  if (status === 403 || msg.includes('PERMISSION_DENIED') || msg.includes('HTTP_REFERRER_BLOCKED')) {
    return {
      retryable: false,
      userWarning:
        'تم رفض صلاحية الوصول لنموذج Gemini أو تقييد النطاق — تأكد من إضافة نطاق النشر ضمن النطاقات المسموحة للمفتاح في Google AI Studio.',
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
  if (msg.includes('TIMEOUT')) {
    return {
      retryable: false,
      userWarning: 'استغرق الاتصال بخدمة Gemini وقتاً أطول من المعتاد، تم تفعيل الرد السريع البديل.',
    };
  }
  if (status >= 500 || msg.includes('ECONNRESET') || msg.includes('fetch failed')) {
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
