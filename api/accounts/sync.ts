export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json({
    success: true,
    lastSyncedAt: new Date().toISOString(),
  });
}
