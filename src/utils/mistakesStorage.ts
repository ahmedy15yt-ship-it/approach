import { MistakeItem } from '../types';

const MISTAKES_STORAGE_PREFIX = 'nahj_mistakes_v1_';

export function getMistakesStorageKey(accountPhone: string): string {
  return `${MISTAKES_STORAGE_PREFIX}${accountPhone || 'guest'}`;
}

export function loadMistakes(accountPhone: string): MistakeItem[] {
  try {
    const raw = localStorage.getItem(getMistakesStorageKey(accountPhone));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore malformed storage
  }
  return [];
}

export function saveMistakes(accountPhone: string, items: MistakeItem[]): void {
  try {
    localStorage.setItem(getMistakesStorageKey(accountPhone), JSON.stringify(items.slice(0, 120)));
  } catch {
    // ignore quota errors
  }
}

export function appendMistake(
  accountPhone: string,
  entry: Omit<MistakeItem, 'id' | 'reviewCount' | 'isResolved' | 'createdAt'>
): MistakeItem {
  const existing = loadMistakes(accountPhone);
  const newItem: MistakeItem = {
    ...entry,
    id: `msk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reviewCount: 0,
    isResolved: false,
    createdAt: new Date().toISOString(),
  };
  const updated = [newItem, ...existing].slice(0, 120);
  saveMistakes(accountPhone, updated);
  return newItem;
}
