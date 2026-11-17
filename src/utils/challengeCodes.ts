import { FriendChallenge, InteractiveQuestion, QuizChallengeRoom } from '../types';

export interface ShareableChallengePayload {
  v: 1;
  id: string;
  title: string;
  challengerName: string;
  targetHours: number;
  challengerHours: number;
  sessionDurationMinutes?: number;
  sessionStartedAt?: string | null;
  createdAt: string;
}

export interface SessionTimerMetrics {
  hasStarted: boolean;
  isFinished: boolean;
  durationMinutes: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  currentMinute: number; // 1-indexed current minute inside session
  progressPct: number;
}

export function computeSessionTimerMetrics(
  sessionStartedAt?: string | null,
  sessionDurationMinutes = 50,
  nowMs: number = Date.now()
): SessionTimerMetrics {
  const durationMinutes = Math.max(5, Math.min(240, Number(sessionDurationMinutes) || 50));
  const totalSeconds = durationMinutes * 60;

  if (!sessionStartedAt) {
    return {
      hasStarted: false,
      isFinished: false,
      durationMinutes,
      elapsedSeconds: 0,
      remainingSeconds: totalSeconds,
      currentMinute: 0,
      progressPct: 0,
    };
  }

  const startedMs = new Date(sessionStartedAt).getTime();
  if (Number.isNaN(startedMs)) {
    return {
      hasStarted: false,
      isFinished: false,
      durationMinutes,
      elapsedSeconds: 0,
      remainingSeconds: totalSeconds,
      currentMinute: 0,
      progressPct: 0,
    };
  }

  const rawElapsed = Math.max(0, Math.floor((nowMs - startedMs) / 1000));
  const elapsedSeconds = Math.min(totalSeconds, rawElapsed);
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const isFinished = rawElapsed >= totalSeconds;
  const currentMinute = isFinished
    ? durationMinutes
    : Math.min(durationMinutes, Math.floor(elapsedSeconds / 60) + 1);
  const progressPct = Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100));

  return {
    hasStarted: true,
    isFinished,
    durationMinutes,
    elapsedSeconds,
    remainingSeconds,
    currentMinute,
    progressPct,
  };
}

export function formatMinutesSeconds(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
      sessionDurationMinutes:
        typeof parsed.sessionDurationMinutes === 'number'
          ? Math.min(240, Math.max(5, parsed.sessionDurationMinutes))
          : 50,
      sessionStartedAt:
        typeof parsed.sessionStartedAt === 'string' ? parsed.sessionStartedAt : null,
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
  const timerInfo = computeSessionTimerMetrics(
    challenge.sessionStartedAt,
    challenge.sessionDurationMinutes || 50
  );

  const sessionLine = timerInfo.hasStarted
    ? timerInfo.isFinished
      ? `⏱️ جلسة التحدي (${timerInfo.durationMinutes} دقيقة): مكتملة ✓`
      : `⏱️ الجلسة المباشرة الآن: الدقيقة ${timerInfo.currentMinute} من أصل ${timerInfo.durationMinutes} دقيقة (المتبقي ${formatMinutesSeconds(timerInfo.remainingSeconds)})`
    : `⏱️ مدة الجلسة المحددة: ${timerInfo.durationMinutes} دقيقة`;

  return [
    `🔥 تحدي مذاكرة تالتة ثانوي على منصة نَهج!`,
    `📌 التحدي: ${challenge.title}`,
    `👤 المتحدي: ${cleanName} (ضد ${challenge.friendName})`,
    `📊 تقدمي اليوم: ${myRounded} / ${challenge.targetHours} ساعات`,
    sessionLine,
    ``,
    `انسخ كود التحدي التالي وأدخله في قسم «تحدي الأصدقاء» داخل نَهج لتدخل نفس الجلسة وتعرف إحنا في الدقيقة كام:`,
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

export interface ShareableQuizChallengePayload {
  v: 1;
  code: string;
  title: string;
  subject: string;
  chapter: string;
  lesson: string;
  creatorName: string;
  questions: InteractiveQuestion[];
  createdAt: string;
}

export function encodeQuizChallengeCode(payload: ShareableQuizChallengePayload): string {
  try {
    const json = JSON.stringify(payload);
    const encoded = bytesToBase64(new TextEncoder().encode(json));
    return `NAHJ-QZ:${encoded}`;
  } catch {
    return payload.code;
  }
}

export function decodeQuizChallengeCode(rawInput: string): ShareableQuizChallengePayload | null {
  try {
    const trimmed = rawInput.trim();
    const match = trimmed.match(/NAHJ-QZ:([A-Za-z0-9+/=]+)/);
    const token = match ? match[1] : trimmed.startsWith('NAHJ-QZ:') ? trimmed.slice(8).trim() : '';
    if (!token || token.length < 12) return null;

    const jsonStr = new TextDecoder().decode(base64ToBytes(token));
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed.code !== 'string' || !Array.isArray(parsed.questions)) {
      return null;
    }

    return {
      v: 1,
      code: parsed.code.trim().toUpperCase(),
      title: String(parsed.title || `تحدي ${parsed.lesson || ''}`).slice(0, 100),
      subject: String(parsed.subject || 'علمي علوم').slice(0, 60),
      chapter: String(parsed.chapter || 'عام').slice(0, 120),
      lesson: String(parsed.lesson || 'الدرس المحدد').slice(0, 140),
      creatorName: String(parsed.creatorName || 'بطل نَهج').slice(0, 50),
      questions: parsed.questions.slice(0, 15),
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function extractShortQuizRoomCode(rawInput: string): string | null {
  const upper = rawInput.trim().toUpperCase();
  if (upper.includes('NAHJ-QZ:')) return null;
  const match = upper.match(/(?:NHJ-Q|QZ-)[A-Z0-9]{3,8}/);
  if (match) return match[0];
  if (/^[A-Z0-9-]{4,12}$/.test(upper)) return upper;
  return null;
}

export function buildQuizChallengeShareMessage(room: QuizChallengeRoom, studentName: string): string {
  const cleanName = studentName.split(' ')[0] || 'بطل نَهج';
  return [
    `⚔️ تحدي أسئلة تفاعلية على منصة نَهج!`,
    `📚 المادة: ${room.subject} — ${room.lesson}`,
    `👤 المتحدي: ${cleanName} (${room.questions.length} أسئلة)`,
    `🔑 كود الغرفة السريع: ${room.code}`,
    ``,
    `أو انسخ كود التحدي الكامل التالي وأدخله في قسم «مُنشئ الأسئلة > تحدي الأصدقاء بكود» لتدخل نفس الأسئلة وتتنافس على المركز الأول:`,
    room.shareCode,
  ].join('\n');
}

