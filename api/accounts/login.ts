export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { phone, username } = req.body || {};
  const cleanName = typeof username === 'string' ? username.trim() : '';
  const digits = String(phone || '').replace(/\D/g, '');
  if (cleanName.length < 2 || digits.length < 9) {
    return res.status(400).json({
      success: false,
      message: 'يرجى كتابة اسم مستخدم ورقم تليفون صحيحين.',
    });
  }

  const nowIso = new Date().toISOString();
  return res.status(200).json({
    success: true,
    isNewAccount: false,
    account: {
      phone: String(phone).trim(),
      normalizedPhone: String(phone).trim(),
      username: cleanName,
      createdAt: nowIso,
      lastLoginAt: nowIso,
    },
  });
}
