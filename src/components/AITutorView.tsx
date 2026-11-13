import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  RotateCcw,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  User,
  Trash2,
  ZoomIn,
  ZoomOut,
  Zap,
  Volume2,
  VolumeX,
  ListChecks,
  Target,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { Subject } from '../types';
import { speakTutorVoice, stopSpeaking } from '../utils/voiceAlerts';

interface Message {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: string;
  subject?: string;
  mode?: 'explain' | 'quiz' | 'problem' | 'plan';
  source?: 'gemini' | 'fallback';
  warning?: string;
  isError?: boolean;
}

interface AITutorViewProps {
  curriculum: Subject[];
  initialSubject?: string;
  initialPrompt?: string;
}

type TutorMode = 'explain' | 'quiz' | 'problem' | 'plan';

// Smart Markdown & Pedagogical Block Beautifier for Thanaweya AI Tutor
function renderFormattedMessage(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentBlockType: 'target' | 'explain' | 'trick' | 'interactive' | null = null;
  let currentBlockLines: string[] = [];

  const flushBlock = (key: number) => {
    if (!currentBlockType || currentBlockLines.length === 0) return;

    if (currentBlockType === 'target') {
      elements.push(
        <div
          key={`block-${key}`}
          className="my-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 shadow-xs"
        >
          <div className="flex items-center gap-2 mb-1.5 text-zinc-950 dark:text-zinc-100 font-black text-xs sm:text-sm">
            <Target className="w-4 h-4 text-[#DC2626] dark:text-red-400 shrink-0" />
            <span>تفكيك السؤال وفهم المطلوب بدقة</span>
          </div>
          <div className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed space-y-1">
            {currentBlockLines.map((l, i) => (
              <p key={i}>{parseInlineBold(l)}</p>
            ))}
          </div>
        </div>
      );
    } else if (currentBlockType === 'explain') {
      elements.push(
        <div
          key={`block-${key}`}
          className="my-3 p-3.5 sm:p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900/50 shadow-xs"
        >
          <div className="flex items-center gap-2 mb-1.5 text-red-900 dark:text-red-300 font-black text-xs sm:text-sm">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
            <span>الشرح والخطوات النموذجية</span>
          </div>
          <div className="text-xs sm:text-sm text-zinc-950 dark:text-zinc-100 leading-relaxed space-y-1.5">
            {currentBlockLines.map((l, i) => (
              <p key={i}>{parseInlineBold(l)}</p>
            ))}
          </div>
        </div>
      );
    } else if (currentBlockType === 'trick') {
      elements.push(
        <div
          key={`block-${key}`}
          className="my-3 p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 shadow-xs"
        >
          <div className="flex items-center gap-2 mb-1.5 text-amber-950 dark:text-amber-300 font-black text-xs sm:text-sm">
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>تركة الامتحان ومصيدة الطلاب</span>
          </div>
          <div className="text-xs sm:text-sm text-amber-950 dark:text-amber-100 leading-relaxed space-y-1">
            {currentBlockLines.map((l, i) => (
              <p key={i}>{parseInlineBold(l)}</p>
            ))}
          </div>
        </div>
      );
    } else if (currentBlockType === 'interactive') {
      elements.push(
        <div
          key={`block-${key}`}
          className="my-3 p-3.5 sm:p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700/60 shadow-xs"
        >
          <div className="flex items-center gap-2 mb-1.5 text-emerald-950 dark:text-emerald-300 font-black text-xs sm:text-sm">
            <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>سؤال تفاعلي فوري لقياس فهمك</span>
          </div>
          <div className="text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 leading-relaxed space-y-1 font-semibold">
            {currentBlockLines.map((l, i) => (
              <p key={i}>{parseInlineBold(l)}</p>
            ))}
          </div>
        </div>
      );
    }

    currentBlockLines = [];
    currentBlockType = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return;
    }

    // Detect section headers
    if (trimmed.includes('🎯') || trimmed.includes('تفكيك السؤال')) {
      flushBlock(idx);
      currentBlockType = 'target';
      return;
    }
    if (trimmed.includes('💡') || trimmed.includes('الشرح وخطوات الحل') || trimmed.includes('الشرح المفصل')) {
      flushBlock(idx);
      currentBlockType = 'explain';
      return;
    }
    if (trimmed.includes('⚡') || trimmed.includes('تركة الامتحان') || trimmed.includes('مصيدة')) {
      flushBlock(idx);
      currentBlockType = 'trick';
      return;
    }
    if (trimmed.includes('❓') || trimmed.includes('سؤال تفاعلي') || trimmed.includes('تحدي فوري')) {
      flushBlock(idx);
      currentBlockType = 'interactive';
      return;
    }

    if (currentBlockType) {
      currentBlockLines.push(trimmed);
      return;
    }

    // Main Headers (### or ##)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const headerText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4
          key={idx}
          className="font-black text-sm sm:text-base text-zinc-950 dark:text-white mt-3 mb-1.5 pb-1 border-b border-red-200 dark:border-red-900/40 flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-[#DC2626] dark:bg-red-400" />
          <span>{headerText}</span>
        </h4>
      );
      return;
    }

    // Bullet points (- or * or •)
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1 mr-2 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C59B27] dark:bg-amber-400 mt-2 shrink-0" />
          <span className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200">{parseInlineBold(itemText)}</span>
        </div>
      );
      return;
    }

    // Numbered lists (1. or 2.)
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1.5 mr-1 leading-relaxed">
          <span className="w-5 h-5 rounded-md bg-red-50 dark:bg-red-950/60 text-[#DC2626] dark:text-red-300 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <span className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200">{parseInlineBold(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={idx} className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed my-1">
        {parseInlineBold(line)}
      </p>
    );
  });

  flushBlock(lines.length + 1);

  return elements;
}

// Convert **bold text** to styled <strong> tags
function parseInlineBold(str: string): React.ReactNode {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="font-extrabold text-zinc-950 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-950/50 px-1 rounded">
          {inner}
        </strong>
      );
    }
    return part;
  });
}

export const AITutorView: React.FC<AITutorViewProps> = ({
  curriculum,
  initialSubject,
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'tutor',
      text: `أهلاً بيك يا دكتورنا وبطل تالتة ثانوي! 👋 معك «أستاذ نَهج» في أي وقت.\n\n🎯 **تفكيك السؤال وفهم المطلوب:**\nأنا هنا لأفكك لك أي سؤال صعب، مسألة معقدة، أو فكرة ربط بين الأبواب خطوة بخطوة بالعامية المصرية الممتعة وأسلوب الثانوية العامة الحديث.\n\n💡 **الشرح وخطوات الحل النموذجية:**\nسأعطيك خلاصة الفهم، القوانين المباشرة، وطريقة الحل التي توفر وقتك داخل الامتحان.\n\n⚡ **تركة الامتحان ومصيدة الطلاب:**\nسأنبهك دائماً على الأخطاء الشائعة اللي بيقع فيها 90% من الطلاب وتفرق بين الـ 95% والـ 100%.\n\n❓ **سؤال تفاعلي فوري:**\nفي نهاية كل شرح، سأطرح عليك سؤالاً تفاعلياً تختبر به نفسك فوراً!\n\nاختر أسلوب المذاكرة من الأعلى واكتب سؤالك 🌟`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState(initialPrompt || '');
  const [selectedSubject, setSelectedSubject] = useState(initialSubject || 'الأحياء');
  const [tutorMode, setTutorMode] = useState<TutorMode>('explain');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('large');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastFailedPayload, setLastFailedPayload] = useState<{ text: string; subject: string } | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    fetch('/api/gemini/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.configured === 'boolean') {
          setGeminiConfigured(data.configured);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialPrompt) {
      setInputMessage(initialPrompt);
    }
    if (initialSubject) {
      setSelectedSubject(initialSubject);
    }
  }, [initialPrompt, initialSubject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, apiError]);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputMessage]);

  const handleSendMessage = async (customText?: string, overrideSubject?: string) => {
    const textToSend = (customText ?? inputMessage).trim();
    const activeSubject = overrideSubject || selectedSubject;
    if (!textToSend || isLoading) return;

    setApiError(null);
    setLastFailedPayload(null);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      subject: activeSubject,
      mode: tutorMode,
    };

    const historyPayload = messages
      .filter((m) => m.id !== 'welcome-1' && m.id !== 'welcome-reset' && !m.isError)
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) {
      setInputMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          subject: activeSubject,
          tutorMode: tutorMode,
          history: historyPayload,
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const errDetail =
          data?.error ||
          data?.message ||
          (res.status === 429
            ? 'تم تجاوز حد الطلبات المؤقت لخدمة الذكاء الاصطناعي، يرجى الانتظار قليلاً ثم المحاولة.'
            : res.status === 401 || res.status === 403
            ? 'تعذر التحقق من صلاحية مفتاح Gemini API على الخادم.'
            : `تعذر الحصول على رد من الخادم (كود ${res.status}).`);
        throw new Error(errDetail);
      }

      if (data && typeof data.reply === 'string' && data.reply.trim()) {
        const tutorMsg: Message = {
          id: `tutor-${Date.now()}`,
          sender: 'tutor',
          text: data.reply.trim(),
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          subject: activeSubject,
          mode: tutorMode,
          source: data.source,
          warning: data.warning,
        };
        setMessages((prev) => [...prev, tutorMsg]);
      } else {
        throw new Error(data?.error || 'وصل رد فارغ من المعلم الذكي، يرجى إعادة المحاولة.');
      }
    } catch (err: any) {
      const errMessage =
        err?.message && typeof err.message === 'string'
          ? err.message
          : 'حدث انقطاع مؤقت في الاتصال بالخادم، يرجى التحقق من الإنترنت وإعادة المحاولة.';
      setApiError(errMessage);
      setLastFailedPayload({ text: textToSend, subject: activeSubject });
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'tutor',
        text: `⚠️ تعذر إتمام الرد: ${errMessage}\nيمكنك الضغط على زر «إعادة المحاولة» بالأسفل لإرسال سؤالك فوراً دون الحاجة لإعادة كتابته.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryLast = () => {
    if (!lastFailedPayload || isLoading) return;
    const { text, subject } = lastFailedPayload;
    setMessages((prev) => prev.filter((m) => !m.isError));
    setApiError(null);
    setLastFailedPayload(null);
    handleSendMessage(text, subject);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleSpeak = (msgId: string, text: string) => {
    if (speakingMessageId === msgId) {
      stopSpeaking();
      setSpeakingMessageId(null);
    } else {
      stopSpeaking();
      const started = speakTutorVoice(
        text,
        () => setSpeakingMessageId(null),
        () => setSpeakingMessageId(null)
      );
      if (started) {
        setSpeakingMessageId(msgId);
      }
    }
  };

  const handleClearChat = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    setConfirmClear(false);
    stopSpeaking();
    setSpeakingMessageId(null);
    setApiError(null);
    setLastFailedPayload(null);
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'tutor',
        text: `بدأنا جلسة جديدة يا بطل! جاهز لأي سؤال في **${selectedSubject}** بنظام تفكيك السؤال والشرح وتركات الامتحان. تفضل اكتب ما تحتاجه 🚀`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const SUBJECTS = [
    { name: 'الأحياء', icon: '🧬' },
    { name: 'الكيمياء', icon: '🧪' },
    { name: 'الفيزياء', icon: '⚡' },
    { name: 'الجيولوجيا', icon: '🏔️' },
    { name: 'اللغة العربية', icon: '📖' },
    { name: 'اللغة الإنجليزية', icon: '🌐' },
  ];

  const TUTOR_MODES: { id: TutorMode; label: string; desc: string; icon: any }[] = [
    { id: 'explain', label: '🧠 شرح وتفكيك عميق', desc: 'تفكيك السؤال + خطوات الحل + تركة الامتحان', icon: Sparkles },
    { id: 'quiz', label: '🏆 تحدي وتدريب MCQ', desc: 'أسئلة اختيار من متعدد مع التقييم الفوري', icon: HelpCircle },
    { id: 'problem', label: '⚡ حل مسائل وتركات', desc: 'مسائل ثانوية عامة صعبة ومفاتيح الربط', icon: Zap },
    { id: 'plan', label: '📋 خطة لمّ المتراكم', desc: 'جدول إنقاذ زمني لمادة في أيام معدودة', icon: ListChecks },
  ];

  const QUICK_PROMPTS = [
    {
      subject: 'الأحياء',
      label: '🔬 الدعامة والضغط الاسموزي',
      prompt: 'اشرحلي مفهوم الدعامة الفسيولوجية والتركيبية في النبات بالعامية مع أهم تركات الامتحان وأسئلة الربط والضغط الاسموزي.',
    },
    {
      subject: 'الكيمياء',
      label: '🧪 تركات الكيمياء الكهربية وفاراداي',
      prompt: 'اختبرني بـ 4 أسئلة اختيار من متعدد نظام حديث في الكيمياء الكهربية وفاراداي وقيم إجابتي ووضح التركات.',
    },
    {
      subject: 'الفيزياء',
      label: '⚡ خطة لم كيرشوف وتوصيل المقاومات',
      prompt: 'ازاي ألم فيزياء كهربية وقوانين كيرشوف وتوصيل المقاومات في 3 أيام بدون ما أنسى القوانين وطريقة الحل؟',
    },
    {
      subject: 'الجيولوجيا',
      label: '🏔️ مقارنة الفوالق والتراكيب الجيولوجية',
      prompt: 'وضحلي الفرق الجوهري بين الفالق العادي والمعكوس والدسر وعلاقتهم بقوى الشد والضغط في الامتحان.',
    },
  ];

  return (
    <div className="font-['Cairo',sans-serif] flex flex-col h-[calc(100vh-105px)] min-h-[720px] max-h-[920px] bg-white dark:bg-[#121215] border-2 border-red-200 dark:border-red-900/50 rounded-3xl shadow-sm overflow-hidden transition-colors duration-200">
      {/* 1) Top Header Bar: Tutor Identity + Mode + Controls */}
      <div className="bg-zinc-50 dark:bg-[#09090B] border-b border-red-200/70 dark:border-red-900/40 px-4 sm:px-6 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#DC2626] to-[#991B1B] text-white flex items-center justify-center shadow-md ring-2 ring-[#DC2626]/20 dark:ring-red-500/40 shrink-0">
            <Bot className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-base sm:text-lg text-zinc-950 dark:text-white">
                أستاذ نَهج — المعلم الأكاديمي الذكي المتطور
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                {geminiConfigured === false ? 'وضع المحرك البديل ⚡' : 'Gemini AI متصل ⚡'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              تفكيك السؤال 🎯 • الشرح والخطوات 💡 • تركة الامتحان ⚡ • سؤال تفاعلي فوري ❓
            </p>
          </div>
        </div>

        {/* Header Quick Controls: Font Size & Clear Chat */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setFontSize(fontSize === 'large' ? 'normal' : 'large')}
            className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
            title="تغيير حجم خط الشرح"
          >
            {fontSize === 'large' ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
            <span>{fontSize === 'large' ? 'خط عادي' : 'خط كبير'}</span>
          </button>

          <button
            onClick={handleClearChat}
            className={`px-2.5 py-2 border rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
              confirmClear
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
            title="مسح سجل المحادثة"
          >
            <Trash2 className="w-4 h-4" />
            {confirmClear && <span>تأكيد المسح؟</span>}
          </button>
        </div>
      </div>

      {/* 2) Tutor Mode Selector Banner */}
      <div className="bg-red-50/70 dark:bg-red-950/30 border-b border-red-200/70 dark:border-red-900/30 px-4 sm:px-6 py-2 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-black text-[#DC2626] dark:text-red-300 shrink-0 ml-1">
          أسلوب الرد:
        </span>
        {TUTOR_MODES.map((mode) => {
          const isSelected = tutorMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setTutorMode(mode.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                isSelected
                  ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-800 hover:border-[#DC2626]'
              }`}
            >
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3) Subjects Filter Bar */}
      <div className="bg-zinc-100 dark:bg-[#09090B]/90 border-b border-zinc-200 dark:border-red-900/30 px-4 sm:px-6 py-2 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-400 shrink-0 ml-1">المادة:</span>
        {SUBJECTS.map((s) => {
          const isSelected = selectedSubject === s.name;
          return (
            <button
              key={s.name}
              onClick={() => setSelectedSubject(s.name)}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-[#DC2626] text-white shadow-xs ring-2 ring-[#DC2626]/20'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:border-[#DC2626]/40'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* 4) Main Chat Messages Canvas (Expansive & Multi-turn) */}
      <div className="grow overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-[#FAFAFA] dark:bg-[#09090B]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isSpeaking = speakingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 max-w-4xl mx-auto ${
                isUser ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                  isUser
                    ? 'bg-zinc-900 dark:bg-amber-600 text-white'
                    : 'bg-[#DC2626] text-white ring-2 ring-[#DC2626]/20'
                }`}
              >
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-amber-300" />}
              </div>

              {/* Message Bubble Card */}
              <div
                className={`grow max-w-[92%] sm:max-w-[85%] rounded-3xl p-4 sm:p-6 shadow-xs relative transition-all ${
                  isUser
                    ? 'bg-gradient-to-br from-[#DC2626] to-[#991B1B] text-white rounded-tr-none'
                    : 'bg-white dark:bg-[#121215] text-zinc-950 dark:text-white border-2 border-zinc-200 dark:border-red-900/40 rounded-tl-none'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#DC2626] dark:text-red-400">أستاذ نَهج</span>
                      <span className="text-[11px] text-[#8C7A52] dark:text-amber-300 font-bold">
                        • {msg.subject || selectedSubject}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Audio TTS Speak Button */}
                      <button
                        onClick={() => handleToggleSpeak(msg.id, msg.text)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                          isSpeaking
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-[#DC2626] border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                        title={isSpeaking ? 'إيقاف الصوت' : 'استماع للشرح صوتياً'}
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span>إيقاف</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>استماع</span>
                          </>
                        )}
                      </button>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="p-1 text-[#8C7A52] dark:text-amber-400 hover:text-[#DC2626] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                        title="نسخ الشرح"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#DC2626] dark:text-red-400" />
                            <span className="text-[#DC2626] dark:text-red-400">تم</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Formatted Text Content */}
                <div
                  className={`leading-relaxed ${
                    fontSize === 'large' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                  } ${isUser ? 'text-white whitespace-pre-wrap font-medium' : ''}`}
                >
                  {isUser ? msg.text : renderFormattedMessage(msg.text)}
                </div>

                {/* Optional Fallback / API Notice */}
                {!isUser && msg.warning && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                    ℹ️ {msg.warning}
                  </div>
                )}

                {/* Interactive Tutor Action Chips Under Model Responses */}
                {!isUser && msg.id !== 'welcome-1' && !msg.isError && (
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500">
                      تفاعل مع الشرح:
                    </span>
                    <button
                      onClick={() => {
                        setInputMessage('إجابتي على السؤال التفاعلي هي: ');
                        textareaRef.current?.focus();
                      }}
                      className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-300 text-[11px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/60 transition-colors cursor-pointer"
                    >
                      ✍️ حل السؤال التفاعلي
                    </button>

                    <button
                      onClick={() =>
                        handleSendMessage('وضحلي تركات إضافية وأفكار ربط مع دروس ثانية لنفس الموضوع.')
                      }
                      className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-300 text-[11px] font-bold rounded-lg border border-amber-200 dark:border-amber-800/60 transition-colors cursor-pointer"
                    >
                      ⚡ تركات وأفكار ربط
                    </button>

                    <button
                      onClick={() =>
                        handleSendMessage('اديني مسألة ثانوية عامة أصعب بنظام الفهم على هذه الجزئية.')
                      }
                      className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-900 dark:text-red-300 text-[11px] font-bold rounded-lg border border-red-200 dark:border-red-800/60 transition-colors cursor-pointer"
                    >
                      📝 مسألة امتحان أصعب
                    </button>

                    <button
                      onClick={() =>
                        handleSendMessage('لخصلي هذا الشرح في 3 نقاط ذهبية للحفظ والمراجعة السريعة.')
                      }
                      className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-900 dark:text-zinc-200 text-[11px] font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer"
                    >
                      💡 تلخيص في 3 نقاط
                    </button>
                  </div>
                )}

                {/* Timestamp */}
                <span
                  className={`text-[10px] font-mono block text-left mt-2.5 pt-1 ${
                    isUser ? 'text-white/75' : 'text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800'
                  }`}
                  dir="ltr"
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Fast Loading Spinner Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3.5 max-w-4xl mx-auto">
            <div className="w-9 h-9 rounded-2xl bg-[#DC2626] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-5 h-5 text-amber-300 animate-spin" />
            </div>
            <div className="bg-white dark:bg-[#121215] border-2 border-red-200 dark:border-red-900/50 rounded-3xl p-5 shadow-xs text-sm font-bold text-[#DC2626] dark:text-red-300 flex items-center gap-2.5">
              <span className="inline-block animate-bounce text-amber-500">●</span>
              <span className="inline-block animate-bounce delay-150 text-[#DC2626]">●</span>
              <span className="inline-block animate-bounce delay-300 text-amber-500">●</span>
              <span>أستاذ نَهج يفكك السؤال ويكتب لك خطوات الحل وتركات الامتحان الآن...</span>
            </div>
          </div>
        )}

        {/* Actionable Error Banner with 1-Click Retry */}
        {apiError && lastFailedPayload && !isLoading && (
          <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-950/50 border-2 border-red-300 dark:border-red-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-bold text-red-900 dark:text-red-200">
              ⚠️ {apiError}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRetryLast}
                className="px-3.5 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة المحاولة</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setApiError(null);
                  setLastFailedPayload(null);
                }}
                className="px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5) Quick Question Suggestion Pills */}
      <div className="bg-zinc-50 dark:bg-[#09090B] border-t border-red-200/60 dark:border-red-900/30 px-4 sm:px-6 py-2 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 shrink-0">أسئلة مقترحة:</span>
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            onClick={() => {
              setSelectedSubject(qp.subject);
              handleSendMessage(qp.prompt, qp.subject);
            }}
            className="px-3 py-1 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-[#DC2626] shrink-0 transition-all shadow-2xs cursor-pointer"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* 6) Bottom Input Form: Spacious & Multi-line capable */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-white dark:bg-[#121215] border-t-2 border-red-200/70 dark:border-red-900/40 p-3 sm:p-4 shrink-0 flex items-end gap-2.5 transition-colors duration-200"
      >
        <div className="grow relative bg-zinc-50 dark:bg-[#09090B] border-2 border-zinc-300 dark:border-zinc-700 focus-within:border-[#DC2626] dark:focus-within:border-red-500 focus-within:bg-white dark:focus-within:bg-[#09090B] rounded-2xl transition-all p-2 flex items-center">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`اسأل أستاذ نَهج في ${selectedSubject} (مسألة صعبة، تركة سؤال، أو إجابتك على السؤال التفاعلي)...`}
            className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-zinc-950 dark:text-white font-medium resize-none max-h-36 px-2 py-1 leading-relaxed placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>

        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="h-11 px-5 sm:px-6 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-40 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">إرسال</span>
        </button>
      </form>
    </div>
  );
};
