import { DictionaryWordEntry } from '../../types';
import { registerDictionaryPhonetics } from '../../utils/speechPronunciation';
import { DICT_A, DICT_B, DICT_C } from './part1_AC';
import { DICT_D, DICT_E, DICT_F } from './part2_DF';
import { DICT_G, DICT_H, DICT_I, DICT_J, DICT_K, DICT_L } from './part3_GL';
import { DICT_M, DICT_N, DICT_O, DICT_P, DICT_Q, DICT_R } from './part4_MR';
import { DICT_S, DICT_T, DICT_U, DICT_V, DICT_W, DICT_X, DICT_Y, DICT_Z } from './part5_SZ';
import { DICT_EXTRA } from './part6_extra';

export const ALPHABET_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
] as const;

const PART_OF_SPEECH_AR: Record<string, string> = {
  n: 'اسم',
  v: 'فعل',
  adj: 'صفة',
  adv: 'ظرف',
  prep: 'حرف جر',
  conj: 'أداة ربط',
  pron: 'ضمير',
  det: 'أداة تعريف/تحديد',
  num: 'عدد',
  ord: 'عدد ترتيبي',
  interj: 'صيغة تعجب',
};

export function getPartOfSpeechArabic(pos: string): string {
  return PART_OF_SPEECH_AR[pos] || pos;
}

const RAW_BLOCKS = [
  DICT_A,
  DICT_B,
  DICT_C,
  DICT_D,
  DICT_E,
  DICT_F,
  DICT_G,
  DICT_H,
  DICT_I,
  DICT_J,
  DICT_K,
  DICT_L,
  DICT_M,
  DICT_N,
  DICT_O,
  DICT_P,
  DICT_Q,
  DICT_R,
  DICT_S,
  DICT_T,
  DICT_U,
  DICT_V,
  DICT_W,
  DICT_X,
  DICT_Y,
  DICT_Z,
  DICT_EXTRA,
];

function parseAllDictionaryWords(): DictionaryWordEntry[] {
  const seen = new Set<string>();
  const phoneticMap = new Map<string, string>();
  const entries: DictionaryWordEntry[] = [];

  for (const block of RAW_BLOCKS) {
    const lines = block.split('\n');
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      const parts = trimmed.split('|');
      if (parts.length < 4) continue;

      const rawWord = parts[0].replace(/_/g, ' ').trim();
      const key = rawWord.toLowerCase();
      if (!rawWord || seen.has(key)) continue;

      const firstLetter = rawWord.charAt(0).toUpperCase();
      if (firstLetter < 'A' || firstLetter > 'Z') continue;

      seen.add(key);
      const partOfSpeech = parts[1].trim();
      const arPronunciation = parts[2].trim();
      const arMeaning = parts.slice(3).join('|').trim();

      phoneticMap.set(key, arPronunciation);

      entries.push({
        id: `w-${firstLetter}-${entries.length + 1}`,
        letter: firstLetter,
        word: rawWord,
        partOfSpeech,
        phonetic: arPronunciation,
        arPronunciation,
        arMeaning,
      });
    }
  }

  // Sort alphabetically within the vault for clean A–Z browsing
  entries.sort((a, b) => a.word.localeCompare(b.word, 'en'));
  registerDictionaryPhonetics(phoneticMap);
  return entries;
}

export const ALL_DICTIONARY_WORDS: DictionaryWordEntry[] = parseAllDictionaryWords();

export const DICTIONARY_BY_LETTER: Record<string, DictionaryWordEntry[]> = (() => {
  const map: Record<string, DictionaryWordEntry[]> = {};
  for (const l of ALPHABET_LETTERS) {
    map[l] = [];
  }
  for (const entry of ALL_DICTIONARY_WORDS) {
    if (map[entry.letter]) {
      map[entry.letter].push(entry);
    }
  }
  return map;
})();
