import { FriendChallenge } from '../types';

export interface ShareableChallengePayload {
  v: 1;
  id: string;
  title: string;
  challengerName: string;
  targetHours: number;
  challengerHours: number;
  createdAt: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeChallengeShareCode(payload: ShareableChallengePayload): string {
  try {
    const json = JSON.stringify(payload);
    const encoded = bytesToBase64(new TextEncoder().encode(json));
    return `NAHJ-CH:${encoded}`;
  } catch {
    return `NAHJ-CH:${payload.id}`;
  }
}

export function decodeChallengeShareCode(rawInput: string): ShareableChallengePayload | null {
  try {
    const trimmed = rawInput.trim();
    const match = trimmed.match(/NAHJ-CH:([A-Za-z0-9+/=]+)/);
    const token = match ? match[1] : trimmed.replace(/^NAHJ-CH:/i, '').trim();
    if (!token || token.length < 8) return null;

    const jsonStr = new TextDecoder().decode(base64ToBytes(token));
    const parsed = JSON.parse(jsonStr);

    if (
      !parsed ||
      typeof parsed.id !== 'string' ||
      typeof parsed.title !== 'string' ||
      typeof parsed.challengerName !== 'string' ||
      typeof parsed.targetHours !== 'number'
    ) {
      return null;
    }

    return {
      v: 1,
      id: parsed.id,
      title: parsed.title.slice(0, 80),
      challengerName: parsed.challengerName.slice(0, 50),
      targetHours: Math.min(24, Math.max(1, Number(parsed.targetHours) || 6)),
      challengerHours: Math.min(24, Math.max(0, Number(parsed.challengerHours) || 0)),
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function buildChallengeShareMessage(
  challenge: FriendChallenge,
  studentName: string
): string {
  const cleanName = studentName.split(' ')[0] || 'بطل نَهج';
  const myRounded = Number(challenge.myHours.toFixed(1));
  return [
    `🔥 تحدي مذاكرة تالتة ثانوي على منصة نَهج!`,
    `📌 التحدي: ${challenge.title}`,
    `👤 المتحدي: ${cleanName} (ضد ${challenge.friendName})`,
    `⏱️ تقدمي اليوم: ${myRounded} / ${challenge.targetHours} ساعات`,
    ``,
    `انسخ كود التحدي التالي وأدخله في قسم «تحدي الأصدقاء» داخل نَهج للمنافسة وتحديث ساعاتك:`,
    challenge.shareCode,
  ].join('\n');
}

export function buildDailyHoursShareMessage(
  studentName: string,
  hours: number,
  dailyGoalHours: number,
  sessionsCount: number
): string {
  const cleanName = studentName.split(' ')[0] || 'بطل نَهج';
  const pct = Math.min(100, Math.round((hours / Math.max(1, dailyGoalHours)) * 100));
  return [
    `📊 تقرير مذاكرتي اليوم على منصة نَهج — تالتة ثانوي:`,
    `👤 الطالب: ${cleanName}`,
    `⏱️ عدد ساعات المذاكرة اليوم: ${Number(hours.toFixed(1))} ساعة (الهدف: ${dailyGoalHours} س — ${pct}%)`,
    `🍅 الجلسات المنجزة: ${sessionsCount} جلسة تركيز`,
    `💪 مين يتحداني ويكسر الرقم ده النهارده؟!`,
  ].join('\n');
}
