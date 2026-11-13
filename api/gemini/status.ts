import { getServerGeminiClient } from '../_gemini.js';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const client = getServerGeminiClient();
  return res.status(200).json({
    configured: Boolean(client),
    model: 'gemini-4-hydrogen',
  });
}
