export interface ExternalAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ExternalAIRequest {
  systemInstruction: string;
  messages: ExternalAIMessage[];
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface ExternalAIResult {
  text: string;
  providerId: 'openrouter' | 'openai' | 'anthropic' | 'groq' | 'deepseek';
  providerLabel: string;
  model: string;
}

function getTrimmedEnv(name: string): string {
  if (typeof process === 'undefined' || !process.env) return '';
  const val = String(process.env[name] || '').trim();
  if (!val || val.startsWith('MY_')) return '';
  return val;
}

export function getConfiguredAIProviders(): Array<{ id: string; label: string; model: string }> {
  const providers: Array<{ id: string; label: string; model: string }> = [];
  if (getTrimmedEnv('GEMINI_API_KEY')) {
    providers.push({ id: 'gemini', label: 'Google Gemini', model: 'gemini-4-hydrogen / gemini-3.1-flash-lite' });
  }
  if (getTrimmedEnv('OPENROUTER_API_KEY')) {
    providers.push({
      id: 'openrouter',
      label: 'OpenRouter (Claude / GPT / DeepSeek)',
      model: getTrimmedEnv('OPENROUTER_MODEL') || 'anthropic/claude-3.5-sonnet',
    });
  }
  if (getTrimmedEnv('OPENAI_API_KEY')) {
    providers.push({
      id: 'openai',
      label: 'OpenAI GPT-4o',
      model: getTrimmedEnv('OPENAI_MODEL') || 'gpt-4o',
    });
  }
  if (getTrimmedEnv('ANTHROPIC_API_KEY')) {
    providers.push({
      id: 'anthropic',
      label: 'Anthropic Claude',
      model: getTrimmedEnv('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-latest',
    });
  }
  if (getTrimmedEnv('GROQ_API_KEY')) {
    providers.push({
      id: 'groq',
      label: 'Groq Llama 3.3 70B (Ultra-Fast)',
      model: getTrimmedEnv('GROQ_MODEL') || 'llama-3.3-70b-versatile',
    });
  }
  if (getTrimmedEnv('DEEPSEEK_API_KEY')) {
    providers.push({
      id: 'deepseek',
      label: 'DeepSeek AI',
      model: getTrimmedEnv('DEEPSEEK_MODEL') || 'deepseek-chat',
    });
  }
  return providers;
}

async function callOpenAICompatibleProvider(opts: {
  url: string;
  apiKey: string;
  model: string;
  providerId: ExternalAIResult['providerId'];
  providerLabel: string;
  req: ExternalAIRequest;
  extraHeaders?: Record<string, string>;
}): Promise<ExternalAIResult> {
  const timeoutMs = opts.req.timeoutMs || 10000;
  const bodyPayload: Record<string, any> = {
    model: opts.model,
    messages: [
      { role: 'system', content: opts.req.systemInstruction },
      ...opts.req.messages,
    ],
    temperature: 0.4,
  };
  if (opts.req.jsonMode && opts.providerId !== 'anthropic') {
    bodyPayload.response_format = { type: 'json_object' };
  }

  const res = await fetch(opts.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
      ...(opts.extraHeaders || {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`${opts.providerId} HTTP ${res.status}: ${errText.slice(0, 120)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new Error(`${opts.providerId} returned empty text`);
  }

  return {
    text: content.trim(),
    providerId: opts.providerId,
    providerLabel: opts.providerLabel,
    model: opts.model,
  };
}

async function callAnthropicProvider(
  apiKey: string,
  model: string,
  req: ExternalAIRequest
): Promise<ExternalAIResult> {
  const timeoutMs = req.timeoutMs || 10000;
  const userMessages = req.messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: req.systemInstruction,
      messages: userMessages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`anthropic HTTP ${res.status}: ${errText.slice(0, 120)}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('anthropic returned empty text');
  }

  return {
    text: text.trim(),
    providerId: 'anthropic',
    providerLabel: 'Anthropic Claude 3.5',
    model,
  };
}

export async function callStrongSecondaryAI(
  req: ExternalAIRequest
): Promise<ExternalAIResult | null> {
  const openRouterKey = getTrimmedEnv('OPENROUTER_API_KEY');
  if (openRouterKey) {
    try {
      const model = getTrimmedEnv('OPENROUTER_MODEL') || 'anthropic/claude-3.5-sonnet';
      return await callOpenAICompatibleProvider({
        url: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: openRouterKey,
        model,
        providerId: 'openrouter',
        providerLabel: `OpenRouter (${model.split('/').pop()})`,
        req,
        extraHeaders: {
          'X-Title': 'Nahj Educational Platform',
        },
      });
    } catch (err: any) {
      console.warn('OpenRouter secondary AI skipped:', err?.message || err);
    }
  }

  const openAiKey = getTrimmedEnv('OPENAI_API_KEY');
  if (openAiKey) {
    try {
      const model = getTrimmedEnv('OPENAI_MODEL') || 'gpt-4o';
      return await callOpenAICompatibleProvider({
        url: 'https://api.openai.com/v1/chat/completions',
        apiKey: openAiKey,
        model,
        providerId: 'openai',
        providerLabel: 'OpenAI GPT-4o',
        req,
      });
    } catch (err: any) {
      console.warn('OpenAI secondary AI skipped:', err?.message || err);
    }
  }

  const anthropicKey = getTrimmedEnv('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    try {
      const model = getTrimmedEnv('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-latest';
      return await callAnthropicProvider(anthropicKey, model, req);
    } catch (err: any) {
      console.warn('Anthropic secondary AI skipped:', err?.message || err);
    }
  }

  const groqKey = getTrimmedEnv('GROQ_API_KEY');
  if (groqKey) {
    try {
      const model = getTrimmedEnv('GROQ_MODEL') || 'llama-3.3-70b-versatile';
      return await callOpenAICompatibleProvider({
        url: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: groqKey,
        model,
        providerId: 'groq',
        providerLabel: 'Groq Llama 3.3 70B',
        req,
      });
    } catch (err: any) {
      console.warn('Groq secondary AI skipped:', err?.message || err);
    }
  }

  const deepSeekKey = getTrimmedEnv('DEEPSEEK_API_KEY');
  if (deepSeekKey) {
    try {
      const model = getTrimmedEnv('DEEPSEEK_MODEL') || 'deepseek-chat';
      return await callOpenAICompatibleProvider({
        url: 'https://api.deepseek.com/chat/completions',
        apiKey: deepSeekKey,
        model,
        providerId: 'deepseek',
        providerLabel: 'DeepSeek AI',
        req,
      });
    } catch (err: any) {
      console.warn('DeepSeek secondary AI skipped:', err?.message || err);
    }
  }

  return null;
}

export function extractJsonPayloadFromText(rawText: string): any {
  const cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  let jsonCandidate = cleaned;
  if (!(cleaned.startsWith('{') && cleaned.endsWith('}')) && !(cleaned.startsWith('[') && cleaned.endsWith(']'))) {
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const useArray = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);
    const startIdx = useArray ? firstBracket : firstBrace;
    const endIdx = useArray ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx > startIdx) {
      jsonCandidate = cleaned.slice(startIdx, endIdx + 1);
    }
  }

  const parsed = JSON.parse(jsonCandidate);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  return parsed;
}
