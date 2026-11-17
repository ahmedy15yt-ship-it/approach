import { getServerGeminiClient } from '../_gemini.js';
import { getConfiguredAIProviders } from '../../src/utils/aiProviders.js';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const client = getServerGeminiClient();
  const providers = getConfiguredAIProviders();
  return res.status(200).json({
    configured: Boolean(client) || providers.length > 0,
    model: 'gemini-3.1-flash-lite / gemini-4-hydrogen',
    providers,
  });
}
