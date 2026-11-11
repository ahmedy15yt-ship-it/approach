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
  Maximize2,
  ChevronDown,
} from 'lucide-react';
import { Subject } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: string;
  subject?: string;
}

interface AITutorViewProps {
  curriculum: Subject[];
  initialSubject?: string;
  initialPrompt?: string;
}

// Markdown and Text Beautifier for Thanaweya Lessons and Explanations
function renderFormattedMessage(text: string) {
  // Split into paragraphs / lines
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();

    // Empty lines
    if (!trimmed) {
      return <div key={idx} className="h-2" />;
    }

    // Main Headers (### or ##)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const headerText = trimmed.replace(/^#+\s*/, '');
      return (
        <h4
          key={idx}
          className="font-black text-sm sm:text-base text-[#0F172A] dark:text-white mt-3 mb-1.5 pb-1 border-b border-[#1E40AF]/15 dark:border-blue-900/30 flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-[#1E40AF] dark:bg-blue-400" />
          <span>{headerText}</span>
        </h4>
      );
    }

    // Bullet points (- or * or •)
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      return (
        <div key={idx} className="flex items-start gap-2 my-1 mr-2 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C59B27] dark:bg-amber-400 mt-2 shrink-0" />
          <span className="text-xs sm:text-sm text-[#1E293B] dark:text-slate-200">{parseInlineBold(itemText)}</span>
        </div>
      );
    }

    // Numbered lists (1. or 2.)
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numMatch) {
      return (
        <div key={idx} className="flex items-start gap-2 my-1.5 mr-1 leading-relaxed">
          <span className="w-5 h-5 rounded-md bg-[#1E40AF]/10 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <span className="text-xs sm:text-sm text-[#1E293B] dark:text-slate-200">{parseInlineBold(numMatch[2])}</span>
        </div>
      );
    }

    // Regular paragraph with inline bold support
    return (
      <p key={idx} className="text-xs sm:text-sm text-[#1E293B] dark:text-slate-200 leading-relaxed my-1">
        {parseInlineBold(line)}
      </p>
    );
  });
}

// Convert **bold text** to styled <strong> tags
function parseInlineBold(str: string): React.ReactNode {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="font-extrabold text-[#0F172A] bg-amber-100/50 px-1 rounded">
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
      text: `أهلاً بيك يا دكتورنا وبطل تالتة ثانوي! 👋 معك «أستاذ نَهج» في أي وقت.\n\nعاوزني أشرحلك درس معين؟ محتار في تركة سؤال؟ عاوز اختبار ٥ أسئلة نظام حديث؟ أو محتاج خطة تلم بيها مادة متراكمة؟\n\nاسألني في **الأحياء، الكيمياء، الفيزياء، الجيولوجيا، العربي، أو الإنجليزي** — والخدمة مجانية بالكامل ومفتوحة لكل طلاب نَهج بدون أي قيود! اكتب سؤالك وأنا معك خطوة بخطوة 🌟`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState(initialPrompt || '');
  const [selectedSubject, setSelectedSubject] = useState(initialSubject || 'الأحياء');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('large');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
  }, [messages, isLoading]);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputMessage]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      subject: selectedSubject,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          subject: selectedSubject,
        }),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const tutorMsg: Message = {
          id: `tutor-${Date.now()}`,
          sender: 'tutor',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          subject: selectedSubject,
        };
        setMessages((prev) => [...prev, tutorMsg]);
      } else {
        throw new Error(data.error || 'فشل الاتصال بالمعلم الذكي');
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'tutor',
        text: 'معلش يا بطل، حدث ضغط بسيط في الشبكة. كرر سؤالك فوراً وسأجيبك بأدق التفاصيل!',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
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

  const handleClearChat = () => {
    if (window.confirm('هل تريد مسح سجل المحادثة والبدء من جديد؟')) {
      setMessages([
        {
          id: 'welcome-reset',
          sender: 'tutor',
          text: `بدأنا محادثة جديدة يا بطل! جاهز لأي سؤال في **${selectedSubject}** أو باقي المواد. تفضل اكتب ما تحتاجه 🚀`,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const SUBJECTS = [
    { name: 'الأحياء', icon: '🧬' },
    { name: 'الكيمياء', icon: '🧪' },
    { name: 'الفيزياء', icon: '⚡' },
    { name: 'الجيولوجيا', icon: '🏔️' },
    { name: 'اللغة العربية', icon: '📖' },
    { name: 'اللغة الإنجليزية', icon: '🌐' },
  ];

  const QUICK_PROMPTS = [
    {
      subject: 'الأحياء',
      label: '🔬 الدعامة الفسيولوجية والتركيبية',
      prompt: 'اشرحلي مفهوم الدعامة الفسيولوجية والتركيبية في النبات بالعامية مع أهم تركات الامتحان وأسئلة الربط.',
    },
    {
      subject: 'الكيمياء',
      label: '🧪 تركات الكيمياء الكهربية',
      prompt: 'اختبرني بـ 4 أسئلة اختيار من متعدد نظام حديث في الكيمياء الكهربية وفاراداي وقيم إجابتي.',
    },
    {
      subject: 'الفيزياء',
      label: '⚡ خطة لم كيرشوف والكهربية',
      prompt: 'ازاي ألم فيزياء كهربية وقوانين كيرشوف وتوصيل المقاومات في 3 أيام بدون ما أنسى القوانين؟',
    },
    {
      subject: 'الجيولوجيا',
      label: '🏔️ مقارنة الفوالق والتراكيب',
      prompt: 'وضحلي الفرق الجوهري بين الفالق العادي والمعكوس والدسر وعلاقتهم بقوى الشد والضغط في الامتحان.',
    },
  ];

  return (
    <div className="font-['Cairo',sans-serif] flex flex-col h-[calc(100vh-105px)] min-h-[720px] max-h-[920px] bg-white dark:bg-[#111C38] border-2 border-[#1E40AF]/20 dark:border-blue-900/50 rounded-3xl shadow-sm overflow-hidden transition-colors duration-200">
      {/* 1) Top Header Bar: Tutor Identity + Subject Tabs + Actions */}
      <div className="bg-[#F8FAFC] dark:bg-[#0B132B] border-b border-[#1E40AF]/15 dark:border-blue-900/40 px-4 sm:px-6 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#1E40AF] text-white flex items-center justify-center shadow-md ring-2 ring-[#1E40AF]/20 dark:ring-blue-500/40 shrink-0">
            <Bot className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg text-[#0F172A] dark:text-white">
                أستاذ نَهج — المعلم الأكاديمي الذكي
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 text-[10px] font-black border border-blue-200 dark:border-blue-800">
                مجاني 100% لجميع الطلاب 🌟
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              شرح مبسط، مفاتيح حل التركات، اختبارات MCQ، وخطط لم المتراكم في جميع مواد علمي علوم
            </p>
          </div>
        </div>

        {/* Header Quick Controls: Font Size & Clear Chat */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setFontSize(fontSize === 'large' ? 'normal' : 'large')}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-slate-800 rounded-xl text-xs font-bold text-[#334155] dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            title="تغيير حجم خط الشرح"
          >
            {fontSize === 'large' ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
            <span>{fontSize === 'large' ? 'خط عادي' : 'خط كبير'}</span>
          </button>

          <button
            onClick={handleClearChat}
            className="p-2 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[#E2E8F0] dark:border-slate-800 text-gray-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
            title="مسح سجل المحادثة"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2) Subjects Filter Bar */}
      <div className="bg-[#F1F5F9] dark:bg-[#0B132B]/80 border-b border-[#1E40AF]/10 dark:border-blue-900/30 px-4 sm:px-6 py-2.5 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-black text-[#475569] dark:text-slate-400 shrink-0 ml-1">المادة الحالية:</span>
        {SUBJECTS.map((s) => {
          const isSelected = selectedSubject === s.name;
          return (
            <button
              key={s.name}
              onClick={() => setSelectedSubject(s.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-[#1E40AF] text-white shadow-xs ring-2 ring-[#1E40AF]/20'
                  : 'bg-white dark:bg-slate-900 text-[#475569] dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#1E40AF]/40'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3) Main Chat Messages Canvas (Expansive, Tall & Spacious) */}
      <div className="grow overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5 bg-[#F8FAFC] dark:bg-[#080E1E]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
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
                    ? 'bg-[#C59B27] text-white'
                    : 'bg-[#1E40AF] text-white ring-2 ring-[#1E40AF]/20'
                }`}
              >
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-amber-300" />}
              </div>

              {/* Message Bubble Card */}
              <div
                className={`grow max-w-[90%] sm:max-w-[82%] rounded-3xl p-4 sm:p-6 shadow-xs relative transition-all ${
                  isUser
                    ? 'bg-[#1E40AF] text-white rounded-tr-none'
                    : 'bg-white dark:bg-[#111C38] text-[#0F172A] dark:text-white border-2 border-[#E2E8F0] dark:border-blue-900/40 rounded-tl-none'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#F0EBE0] dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#1E40AF] dark:text-blue-400">أستاذ نَهج</span>
                      <span className="text-[11px] text-[#8C7A52] dark:text-amber-300 font-bold">
                        • مادة {msg.subject || selectedSubject}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="p-1.5 text-[#8C7A52] dark:text-amber-400 hover:text-[#1E40AF] hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                      title="نسخ الشرح"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="text-blue-600 dark:text-blue-400">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ</span>
                        </>
                      )}
                    </button>
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

                {/* Timestamp */}
                <span
                  className={`text-[10px] font-mono block text-left mt-2.5 pt-1 ${
                    isUser ? 'text-white/70' : 'text-[#8A988D] dark:text-slate-500 border-t border-gray-100 dark:border-slate-800'
                  }`}
                  dir="ltr"
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading Spinner Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3.5 max-w-4xl mx-auto">
            <div className="w-9 h-9 rounded-2xl bg-[#1E40AF] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-5 h-5 text-amber-300 animate-spin" />
            </div>
            <div className="bg-white dark:bg-[#111C38] border-2 border-[#1E40AF]/20 dark:border-blue-900/50 rounded-3xl p-5 shadow-xs text-sm font-bold text-[#1E40AF] dark:text-blue-300 flex items-center gap-2.5">
              <span className="inline-block animate-bounce text-amber-500">●</span>
              <span className="inline-block animate-bounce delay-150 text-blue-500">●</span>
              <span className="inline-block animate-bounce delay-300 text-amber-500">●</span>
              <span>أستاذ نَهج يكتب لك الشرح المفصل ومفاتيح حل الامتحان الآن...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4) Quick Question Pills Suggestions */}
      <div className="bg-[#F8FAFC] dark:bg-[#0B132B] border-t border-[#1E40AF]/10 dark:border-blue-900/30 px-4 sm:px-6 py-2 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-black text-gray-500 dark:text-slate-400 shrink-0">أسئلة سريعة:</span>
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            onClick={() => {
              setSelectedSubject(qp.subject);
              handleSendMessage(qp.prompt);
            }}
            className="px-3 py-1 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-[#1E293B] dark:text-slate-200 text-[11px] font-bold rounded-xl border border-[#CBD5E1] dark:border-slate-700 hover:border-[#1E40AF] shrink-0 transition-all shadow-2xs cursor-pointer"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* 5) Bottom Input Form: Spacious & Multi-line capable */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-white dark:bg-[#111C38] border-t-2 border-[#1E40AF]/15 dark:border-blue-900/40 p-3 sm:p-4 shrink-0 flex items-end gap-2.5 transition-colors duration-200"
      >
        <div className="grow relative bg-[#F8FAFC] dark:bg-[#0B132B] border-2 border-[#CBD5E1] dark:border-slate-700 focus-within:border-[#1E40AF] dark:focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-[#0B132B] rounded-2xl transition-all p-2 flex items-center">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`اسأل أستاذ نَهج في ${selectedSubject} (اكتب سؤالك، مسألة صعبة، أو اطلب اختبار MCQ)...`}
            className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-[#0F172A] dark:text-white font-medium resize-none max-h-36 px-2 py-1 leading-relaxed placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
        </div>

        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="h-11 px-5 sm:px-6 bg-[#1E40AF] hover:bg-[#1D4ED8] disabled:opacity-40 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">إرسال</span>
        </button>
      </form>
    </div>
  );
};
