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

export const AITutorView: React.FC<AITutorViewProps> = ({
  curriculum,
  initialSubject,
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'tutor',
      text: `أهلاً بيك يا دكتورنا وبطل تالتة ثانوي! 👋 معك «أستاذ نَهج» في أي وقت.\n\nعاوزني أشرحلك درس معين؟ محتار في تركة سؤال؟ عاوز اختبار ٥ أسئلة نظام حديث؟ أو محتاج خطة تلم بيها مادة متراكمة؟\n\nاسألني في الأحياء، الكيمياء، الفيزياء، الجيولوجيا، العربي، أو الإنجليزي — والخدمة مجانية بالكامل ومفتوحة لكل طلاب نَهج بدون أي قيود! اكتب سؤالك وأنا معك خطوة بخطوة 🌟`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState(initialPrompt || '');
  const [selectedSubject, setSelectedSubject] = useState(initialSubject || 'الأحياء');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
        text: 'معلش يا بطل، حدث ضغط بسيط في الشبكة. كرر سؤالك فوراً وأنا معك!',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

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
    <div className="space-y-4 font-['Cairo',sans-serif] h-[calc(100vh-130px)] flex flex-col">
      {/* Top Banner */}
      <div className="bg-white border border-[#2D5A43]/15 rounded-2xl p-4 shadow-xs shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2D5A43] text-white flex items-center justify-center shadow-xs">
            <Bot className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-[#1E2922]">أستاذ نَهج — المعلم الذكي</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                مجاني 100% لجميع الطلاب 🌟
              </span>
            </div>
            <p className="text-xs text-[#7A8A7E]">
              شرح مبسط بالعامية، مفاتيح حل، توليد اختبارات MCQ، وخطط استذكار ذكية
            </p>
          </div>
        </div>

        {/* Subject Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['الأحياء', 'الكيمياء', 'الفيزياء', 'الجيولوجيا', 'اللغة العربية', 'اللغة الإنجليزية'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSubject(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedSubject === s
                  ? 'bg-[#2D5A43] text-white shadow-xs'
                  : 'bg-[#FAF9F5] text-[#556458] border border-[#DDD6C9] hover:border-[#2D5A43]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="bg-white border border-[#2D5A43]/15 rounded-3xl p-4 sm:p-6 shadow-xs overflow-y-auto grow space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-[#C59B27] text-white shadow-xs'
                    : 'bg-[#2D5A43] text-white shadow-xs'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-amber-300" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-2xs relative group ${
                  isUser
                    ? 'bg-[#2D5A43] text-white rounded-tr-none'
                    : 'bg-[#FAF9F5] text-[#1E2922] border border-[#EAE6DF] rounded-tl-none'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between mb-1 pb-1 border-b border-[#EDE8DE]">
                    <span className="text-[10px] font-bold text-[#8C7A52]">
                      أستاذ نَهج • مادة {msg.subject || selectedSubject}
                    </span>
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="p-1 text-[#8C7A52] hover:text-[#1E2922] transition-colors"
                      title="نسخ الإجابة"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                <div className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                  {msg.text}
                </div>

                <span
                  className={`text-[9px] block text-left mt-2 ${
                    isUser ? 'text-white/70' : 'text-[#8A988D]'
                  }`}
                  dir="ltr"
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#2D5A43] text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-amber-300 animate-spin" />
            </div>
            <div className="bg-[#FAF9F5] border border-[#EAE6DF] rounded-2xl p-4 text-xs font-bold text-[#2D5A43] flex items-center gap-2">
              <span className="inline-block animate-bounce">●</span>
              <span className="inline-block animate-bounce delay-100">●</span>
              <span className="inline-block animate-bounce delay-200">●</span>
              <span>أستاذ نَهج يجهز لك الشرح والتركات...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Suggestions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            onClick={() => {
              setSelectedSubject(qp.subject);
              handleSendMessage(qp.prompt);
            }}
            className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-[#334638] text-[11px] font-bold rounded-xl border border-[#D5CFC3] hover:border-[#2D5A43] shrink-0 transition-all shadow-2xs"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Message Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-white border border-[#2D5A43]/20 rounded-2xl p-2.5 shadow-sm flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`اسأل أستاذ نَهج في ${selectedSubject} (شرح، مسائل، اختبار، أو نصيحة)...`}
          className="grow px-3 py-2 text-xs bg-transparent focus:outline-none text-[#1E2922] font-medium"
        />

        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="px-4 py-2 bg-[#2D5A43] hover:bg-[#234734] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>إرسال</span>
        </button>
      </form>
    </div>
  );
};
