import {
  AccountSession,
  BacklogItem,
  DailyStudyHoursLog,
  DailyTask,
  FriendChallenge,
  StreakHistoryEntry,
  StudentActivitySnapshot,
  StudentProfile,
  Subject,
} from '../types';
import { isVerifiedPhone } from './verifiedAccounts';

export const ACTIVE_ACCOUNT_KEY = 'nahj_active_account';
export const ACCOUNT_DATA_PREFIX = 'nahj_account_data_';
export const SAVED_ACCOUNTS_INDEX_KEY = 'nahj_saved_accounts';
export const LEGACY_MIGRATED_KEY = 'nahj_legacy_migrated';

export interface SavedAccountSummary {
  normalizedPhone: string;
  phone: string;
  username: string;
  lastUsedAt: string;
  streakDays: number;
  totalXp: number;
  isVerified?: boolean;
}

export function normalizeDigits(input: string): string {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  return input
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)));
}

export function normalizePhoneNumber(rawPhone: string): string {
  const ascii = normalizeDigits(rawPhone || '').trim();
  const hasPlus = ascii.startsWith('+');
  const digits = ascii.replace(/\D/g, '');

  // Normalize Egyptian numbers: +2010... / 2010... / 002010... -> 010...
  if (digits.startsWith('0020') && digits.length === 14) {
    return `0${digits.slice(4)}`;
  }
  if (digits.startsWith('20') && digits.length === 12 && digits[2] === '1') {
    return `0${digits.slice(2)}`;
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return `0${digits}`;
  }

  return hasPlus && !digits.startsWith('20') ? `+${digits}` : digits;
}

export function validatePhoneInput(rawPhone: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizePhoneNumber(rawPhone);
  const digitsOnly = normalized.replace(/\D/g, '');

  if (!digitsOnly) {
    return { valid: false, normalized, error: 'يرجى كتابة رقم التليفون أولاً.' };
  }

  // Standard Egyptian mobile: 010, 011, 012, 015 (11 digits)
  if (normalized.startsWith('01') && digitsOnly.length === 11) {
    if (/^01[0125]\d{8}$/.test(digitsOnly)) {
      return { valid: true, normalized };
    }
    return {
      valid: false,
      normalized,
      error: 'رقم الموبايل المصري يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً.',
    };
  }

  if (digitsOnly.length < 9 || digitsOnly.length > 15) {
    return {
      valid: false,
      normalized,
      error: 'يرجى إدخال رقم تليفون صحيح (مثال: 01012345678).',
    };
  }

  return { valid: true, normalized };
}

export function maskPhoneNumber(phone: string): string {
  const clean = normalizePhoneNumber(phone);
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 3)}••••${clean.slice(-3)}`;
}

export function getActiveAccountSession(): AccountSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AccountSession;
    if (parsed && parsed.normalizedPhone && parsed.username) {
      return {
        ...parsed,
        isVerified: Boolean(parsed.isVerified) || isVerifiedPhone(parsed.normalizedPhone),
      };
    }
  } catch {
    // ignore malformed session
  }
  return null;
}

export function setActiveAccountSession(session: AccountSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    } else {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore storage errors
  }
}

export function loadLocalAccountSnapshot(
  normalizedPhone: string
): StudentActivitySnapshot | null {
  try {
    const raw = localStorage.getItem(`${ACCOUNT_DATA_PREFIX}${normalizedPhone}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudentActivitySnapshot;
    if (parsed && parsed.profile && Array.isArray(parsed.curriculum)) {
      return parsed;
    }
  } catch {
    // ignore malformed snapshot
  }
  return null;
}

export function saveLocalAccountSnapshot(snapshot: StudentActivitySnapshot): void {
  try {
    localStorage.setItem(
      `${ACCOUNT_DATA_PREFIX}${snapshot.normalizedPhone}`,
      JSON.stringify(snapshot)
    );
    upsertSavedAccountSummary({
      normalizedPhone: snapshot.normalizedPhone,
      phone: snapshot.phone,
      username: snapshot.username,
      lastUsedAt: snapshot.updatedAt || new Date().toISOString(),
      streakDays: snapshot.profile?.streakDays || 0,
      totalXp: snapshot.profile?.totalXp || 0,
      isVerified: Boolean(snapshot.profile?.isVerified) || isVerifiedPhone(snapshot.normalizedPhone),
    });
  } catch {
    // ignore quota errors
  }
}

export function getSavedAccountsSummary(): SavedAccountSummary[] {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => (b.lastUsedAt || '').localeCompare(a.lastUsedAt || ''));
    }
  } catch {
    // ignore
  }
  return [];
}

function upsertSavedAccountSummary(summary: SavedAccountSummary): void {
  const list = getSavedAccountsSummary().filter(
    (item) => item.normalizedPhone !== summary.normalizedPhone
  );
  list.unshift(summary);
  localStorage.setItem(SAVED_ACCOUNTS_INDEX_KEY, JSON.stringify(list.slice(0, 10)));
}

export function hasUnmigratedGuestData(): boolean {
  try {
    if (localStorage.getItem(LEGACY_MIGRATED_KEY) === 'true') return false;
    return Boolean(
      localStorage.getItem('nahj_profile') ||
        localStorage.getItem('nahj_curriculum') ||
        localStorage.getItem('nahj_streak_history') ||
        localStorage.getItem('nahj_study_hours_log')
    );
  } catch {
    return false;
  }
}

export function extractLegacyGuestSnapshotParts(): Partial<{
  profile: StudentProfile;
  curriculum: Subject[];
  backlogItems: BacklogItem[];
  dailyTasks: DailyTask[];
  taskCycleIndex: number;
  todayStudyLog: DailyStudyHoursLog;
  friendChallenges: FriendChallenge[];
  streakHistory: Record<string, StreakHistoryEntry>;
  streakLastTickMs: number;
}> {
  const result: any = {};
  try {
    const p = localStorage.getItem('nahj_profile');
    if (p) result.profile = JSON.parse(p);

    const c = localStorage.getItem('nahj_curriculum');
    if (c) result.curriculum = JSON.parse(c);

    const b = localStorage.getItem('nahj_backlog');
    if (b) result.backlogItems = JSON.parse(b);

    const t = localStorage.getItem('nahj_tasks');
    if (t) result.dailyTasks = JSON.parse(t);

    const tc = localStorage.getItem('nahj_tasks_cycle');
    if (tc && !Number.isNaN(Number(tc))) result.taskCycleIndex = Number(tc);

    const sh = localStorage.getItem('nahj_study_hours_log');
    if (sh) result.todayStudyLog = JSON.parse(sh);

    const fc = localStorage.getItem('nahj_friend_challenges');
    if (fc) result.friendChallenges = JSON.parse(fc);

    const hist = localStorage.getItem('nahj_streak_history');
    if (hist) result.streakHistory = JSON.parse(hist);

    const tick = localStorage.getItem('nahj_streak_last_tick_ms');
    if (tick && !Number.isNaN(Number(tick))) result.streakLastTickMs = Number(tick);
  } catch {
    // ignore partial parse errors
  }
  return result;
}

export function markLegacyGuestMigrated(): void {
  try {
    localStorage.setItem(LEGACY_MIGRATED_KEY, 'true');
  } catch {
    // ignore
  }
}

export type LoginResult =
  | {
      ok: true;
      session: AccountSession;
      snapshot: StudentActivitySnapshot | null;
      isNewAccount: boolean;
    }
  | {
      ok: false;
      code: 'USERNAME_MISMATCH' | 'VALIDATION_ERROR';
      registeredUsername?: string;
      message: string;
    };

export async function loginWithPhoneAndUsername(params: {
  phone: string;
  username: string;
  confirmNameUpdate?: boolean;
}): Promise<LoginResult> {
  const cleanName = params.username.trim();
  if (cleanName.length < 2) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'يرجى إدخال اسم مستخدم واضح (حرفين على الأقل).',
    };
  }

  const phoneCheck = validatePhoneInput(params.phone);
  if (!phoneCheck.valid) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: phoneCheck.error || 'رقم التليفون غير صحيح.',
    };
  }

  const normalizedPhone = phoneCheck.normalized;
  const localSnapshot = loadLocalAccountSnapshot(normalizedPhone);
  const savedSummary = getSavedAccountsSummary().find(
    (s) => s.normalizedPhone === normalizedPhone
  );

  let serverSnapshot: StudentActivitySnapshot | null = null;
  let isNewAccount = !localSnapshot && !savedSummary;

  try {
    const res = await fetch('/api/accounts/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: normalizedPhone,
        username: cleanName,
        confirmNameUpdate: Boolean(params.confirmNameUpdate),
      }),
    });

    if (res.ok || res.status === 409) {
      const data = await res.json();
      if (!data.success && data.code === 'USERNAME_MISMATCH') {
        return {
          ok: false,
          code: 'USERNAME_MISMATCH',
          registeredUsername: data.registeredUsername,
          message:
            data.message ||
            `رقم التليفون مسجل مسبقاً باسم «${data.registeredUsername}».`,
        };
      }
      if (data.success) {
        isNewAccount = Boolean(data.isNewAccount);
        if (data.account?.snapshot) {
          serverSnapshot = data.account.snapshot as StudentActivitySnapshot;
        }
      }
    }
  } catch {
    // Graceful local-first fallback when offline or server unavailable
  }

  // Local username mismatch protection if server wasn't reachable or didn't have the record
  const knownLocalUsername = localSnapshot?.username || savedSummary?.username;
  if (
    knownLocalUsername &&
    knownLocalUsername.trim().toLowerCase() !== cleanName.toLowerCase() &&
    !params.confirmNameUpdate
  ) {
    return {
      ok: false,
      code: 'USERNAME_MISMATCH',
      registeredUsername: knownLocalUsername,
      message: `هذا الرقم مسجل مسبقاً على هذا الجهاز باسم «${knownLocalUsername}».`,
    };
  }

  // Pick newest snapshot between local and server
  let chosenSnapshot: StudentActivitySnapshot | null = null;
  if (serverSnapshot && localSnapshot) {
    chosenSnapshot =
      (serverSnapshot.updatedAt || '') > (localSnapshot.updatedAt || '')
        ? serverSnapshot
        : localSnapshot;
  } else {
    chosenSnapshot = serverSnapshot || localSnapshot;
  }

  const serverVerified = Boolean(
    chosenSnapshot?.profile?.isVerified || isVerifiedPhone(normalizedPhone)
  );

  if (chosenSnapshot) {
    chosenSnapshot = {
      ...chosenSnapshot,
      username: cleanName,
      profile: {
        ...chosenSnapshot.profile,
        name: cleanName,
        isVerified: serverVerified,
      },
    };
    saveLocalAccountSnapshot(chosenSnapshot);
  }

  const nowIso = new Date().toISOString();
  const session: AccountSession = {
    phone: normalizedPhone,
    normalizedPhone,
    username: cleanName,
    loggedInAt: nowIso,
    lastSyncedAt: chosenSnapshot?.updatedAt || nowIso,
    isVerified: serverVerified,
  };

  setActiveAccountSession(session);
  upsertSavedAccountSummary({
    normalizedPhone,
    phone: normalizedPhone,
    username: cleanName,
    lastUsedAt: nowIso,
    streakDays: chosenSnapshot?.profile?.streakDays || 0,
    totalXp: chosenSnapshot?.profile?.totalXp || 0,
    isVerified: serverVerified,
  });

  return {
    ok: true,
    session,
    snapshot: chosenSnapshot,
    isNewAccount,
  };
}

export async function syncAccountSnapshotToServer(
  snapshot: StudentActivitySnapshot
): Promise<boolean> {
  saveLocalAccountSnapshot(snapshot);
  try {
    const res = await fetch('/api/accounts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: snapshot.normalizedPhone,
        username: snapshot.username,
        snapshot,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
