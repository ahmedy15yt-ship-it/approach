// Voice Alerts & Audio Chime Helper for Nahj (Egyptian Thanaweya)
// Uses Web Speech API (Arabic TTS) + Web Audio API Bell Chime

// Play a realistic gentle bell chime before voice announcement
export function playBellChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic bell frequencies (G5, D6)
    const freqs = [784, 1175];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 1.3);
    });
  } catch (e) {
    console.warn('Audio chime note:', e);
  }
}

// Speak Arabic text using Web Speech API
export function speakArabicAlert(text: string) {
  // Check if voice alerts are enabled by user
  const isEnabled = localStorage.getItem('nahj_voice_alerts') !== 'false';
  if (!isEnabled) return;

  // First play chime
  playBellChime();

  if (!('speechSynthesis' in window)) return;

  // Short delay so chime rings clearly before speech
  setTimeout(() => {
    try {
      window.speechSynthesis.cancel(); // cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Find an Arabic voice if available
      const voices = window.speechSynthesis.getVoices();
      const arVoice = voices.find((v) => v.lang.startsWith('ar') || v.name.includes('Arabic'));
      if (arVoice) {
        utterance.voice = arVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis note:', err);
    }
  }, 400);
}

let activeSpeechToken = 0;

function pickBestArabicVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  return (
    voices.find((v) => v.lang.toLowerCase() === 'ar-eg') ||
    voices.find((v) => v.lang.toLowerCase().startsWith('ar-')) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('ar') || v.name.includes('Arabic')) ||
    null
  );
}

function splitArabicSpeechChunks(text: string, maxLen = 160): string[] {
  const sentences = text
    .split(/(?<=[.!؟،\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (sentence.length > maxLen) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      const words = sentence.split(/\s+/);
      let piece = '';
      for (const word of words) {
        if ((piece + ' ' + word).trim().length > maxLen) {
          if (piece) chunks.push(piece.trim());
          piece = word;
        } else {
          piece = (piece + ' ' + word).trim();
        }
      }
      if (piece) chunks.push(piece.trim());
    } else if ((current + ' ' + sentence).trim().length > maxLen) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current = (current + ' ' + sentence).trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

// Dedicated Tutor Text-to-Speech (chunked for reliable Chrome/Android playback of long explanations)
export function speakTutorVoice(text: string, onEnd?: () => void, onError?: () => void): boolean {
  if (!('speechSynthesis' in window)) return false;

  try {
    activeSpeechToken += 1;
    const myToken = activeSpeechToken;
    window.speechSynthesis.cancel();

    // Clean markdown symbols and emojis for crisp natural Arabic speech
    const cleanText = text
      .replace(/[#*`_~]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return false;

    const chunks = splitArabicSpeechChunks(cleanText, 160);
    if (chunks.length === 0) return false;

    const arVoice = pickBestArabicVoice();

    const speakNext = (index: number) => {
      if (myToken !== activeSpeechToken) return;
      if (index >= chunks.length) {
        if (onEnd) onEnd();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = arVoice?.lang || 'ar-EG';
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      if (arVoice) {
        utterance.voice = arVoice;
      }

      utterance.onend = () => {
        if (myToken !== activeSpeechToken) return;
        speakNext(index + 1);
      };

      utterance.onerror = () => {
        if (myToken !== activeSpeechToken) return;
        if (onError) onError();
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNext(0);
    return true;
  } catch (err) {
    console.warn('Tutor voice synthesis note:', err);
    if (onError) onError();
    return false;
  }
}

export function stopSpeaking() {
  activeSpeechToken += 1;
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

// Convenience alerts
export function announcePrayer(prayerName: string) {
  speakArabicAlert(`حان الآن موعد صلاة ${prayerName}، قم وتوضأ واستعن بالله.`);
}

export function announceTask(taskTitle: string) {
  speakArabicAlert(`تنبيه نَهج: حان وقت ${taskTitle}`);
}

export function announceSessionComplete(sessionName: string) {
  playBellChime();
  setTimeout(() => {
    speakArabicAlert(`ما شاء الله! انتهت جلسة ${sessionName} بنجاح. خذ استراحة واشرب ماء.`);
  }, 400);
}

