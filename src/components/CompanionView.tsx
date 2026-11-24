import React, { useState, useEffect, useRef } from 'react';
import {
  HeartHandshake,
  Send,
  Sparkles,
  Users,
  Heart,
  MessageCircle,
  Loader2,
  Volume2,
  Smile,
  BatteryLow,
  Compass,
  Flame,
  RefreshCw,
} from 'lucide-react';
import {
  CompanionChatMessage,
  CompanionCommunityPost,
  CompanionMood,
} from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { isVerifiedPhone } from '../utils/verifiedAccounts';
import { speakMultilingualText } from '../utils/translatorFallback';

interface CompanionViewProps {
  studentName: string;
  accountPhone?: string;
  isStudentVerified?: boolean;
  onAwardBonusXp?: (amount: number) => void;
}

const MOOD_OPTIONS: Array<{
  id: CompanionMood;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'motivated', label: 'متحمس ومنجز', desc: 'جاهز لتحدي قوي', icon: Flame },
  { id: 'stressed', label: 'مضغوط شوية', desc: 'خايف من الوقت أو التراكم', icon: Smile },
  { id: 'tired', label: 'مرهق جسدياً', desc: 'محتاج شحن طاقة وراحة', icon: BatteryLow },
  { id: 'lost', label: 'تايه ومشتت', desc: 'محتاج أرتب أولوياتي', icon: Compass },
];

const QUICK_PROMPTS = [
  'عندي دروس متراكمة ومضغوط، أرتب يومي إزاي دلوقتي؟',
  'محتاج كلمة تشجيع قوية تخليني أكمل مذاكرة لآخر السنة.',
  'نومي متلخبط ومش عارف أوازن بين الراحة والمذاكرة والحياة اليومية.',
  'بنسي اللي بذاكره بسرعة، إزاي أثبت المعلومة بذكاء؟',
];

export const CompanionView: React.FC<CompanionViewProps> = ({
  studentName,
  accountPhone = 'guest',
  isStudentVerified = false,
  onAwardBonusXp,
}) => {
  const firstName = studentName.split(' ')[0] || 'بطل';
  const verifiedSelf = Boolean(isStudentVerified || isVerifiedPhone(accountPhone));
  const chatStorageKey = `nahj_companion_chat_${accountPhone}`;

  const [mood, setMood] = useState<CompanionMood>('motivated');
  const [messages, setMessages] = useState<CompanionChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(chatStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'cmp-welcome',
        role: 'companion',
        text: `أهلاً بيك يا ${firstName}! أنا «رفيقي» — معاك في المذاكرة، تنظيم يومك، نفسيتك، وأي تحدي يومي تمر به. احكيلي يومك ماشي إزاي النهارده؟`,
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const [chatInput, setChatInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Interactive Community Wall state
  const [posts, setPosts] = useState<CompanionCommunityPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState<CompanionCommunityPost['category']>('تحفيز');
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [wallError, setWallError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(messages.slice(-30)));
    } catch {
      // ignore
    }
  }, [messages, chatStorageKey]);

  const fetchCommunityPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const res = await fetch('/api/companion/posts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.posts)) {
          setPosts(data.posts);
        }
      }
    } catch {
      // keep existing posts if offline
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchCommunityPosts();
  }, []);

  const handleSendCompanionChat = async (customText?: string) => {
    const text = (customText ?? chatInput).trim();
    if (!text || isReplying) return;

    const userMsg: CompanionChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!customText) setChatInput('');
    setIsReplying(true);

    try {
      const res = await fetch('/api/gemini/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mood,
          studentName,
          history: nextHistory.slice(-12),
        }),
      });
      const data = await res.json();
      const replyText =
        data?.reply ||
        'خد نفس عميق يا بطل، خطوة واحدة صغيرة دلوقتي أحسن من ألف خطة مؤجلة. ابدأ بـ 15 دقيقة تركيز وهتنجز!';

      setMessages((prev) => [
        ...prev,
        {
          id: `c-${Date.now()}`,
          role: 'companion',
          text: replyText,
          createdAt: new Date().toISOString(),
        },
      ]);
      onAwardBonusXp?.(4);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `c-err-${Date.now()}`,
          role: 'companion',
          text: 'أنا معاك دايماً يا بطل! رتب أولوياتك على ورقة في 3 نقط وابدأ بأصغر مهمة لمدة 20 دقيقة الآن.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsReplying(false);
    }
  };

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = postContent.trim();
    if (clean.length < 3 || isPublishingPost) {
      setWallError('اكتب كلمة تشجيع أو إنجاز واضح (3 أحرف على الأقل).');
      return;
    }

    setWallError(null);
    setIsPublishingPost(true);
    try {
      const res = await fetch('/api/companion/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: studentName,
          authorPhone: accountPhone,
          category: postCategory,
          content: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.post) {
        throw new Error(data.error || 'تعذر النشر حالياً');
      }
      setPosts((prev) => [data.post, ...prev]);
      setPostContent('');
      onAwardBonusXp?.(10);
    } catch (err: any) {
      setWallError(err?.message || 'حدث خطأ أثناء نشر الرسالة.');
    } finally {
      setIsPublishingPost(false);
    }
  };

  const handleCheerPost = async (postId: string) => {
    // Optimistic increment
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, cheers: p.cheers + 1 } : p))
    );
    try {
      const res = await fetch(`/api/companion/posts/${postId}/cheer`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
        }
      }
    } catch {
      // ignore network jitter
    }
  };

  const handleSendReply = async (postId: string) => {
    const replyText = (replyDrafts[postId] || '').trim();
    if (replyText.length < 2) return;
    try {
      const res = await fetch(`/api/companion/posts/${postId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: studentName,
          authorPhone: accountPhone,
          text: replyText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
        }
        setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
        setActiveReplyPostId(null);
        onAwardBonusXp?.(5);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header */}
      <header className="bg-gradient-to-l from-[#1C1B22] via-[#121217] to-[#08080A] border border-[#D4AF37]/45 rounded-3xl p-5 sm:p-6 text-[#F4EFE6] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl btn-luxury-gold flex items-center justify-center shrink-0">
            <HeartHandshake className="w-6 h-6 text-[#09090B]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#F6E2A6] flex items-center gap-2 flex-wrap">
              <span>قسم «رفيقي» — رفيق المذاكرة والحياة</span>
              {verifiedSelf && <VerifiedBadge size="md" />}
            </h1>
            <p className="text-xs sm:text-sm text-[#D8CEB8] leading-relaxed mt-0.5">
              دعم نفسي وعملي في كل خطوة من يومك + حائط تفاعل حقيقي لمشاركة الإنجازات وتشجيع زملائك
            </p>
          </div>
        </div>
      </header>

      {/* Main Split: Personal AI Companion Chat (6 cols) + Live Student Community Wall (6 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Personal Companion Coach */}
        <section className="xl:col-span-6 bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-zinc-950 dark:text-[#F6E2A6] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span>مساعدك الشخصي في المذاكرة والحياة</span>
            </h2>
          </div>

          {/* Mood / Energy Check-in */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MOOD_OPTIONS.map((m) => {
              const Icon = m.icon;
              const isSelected = mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMood(m.id)}
                  className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer ${
                    isSelected
                      ? 'btn-luxury-gold text-[#09090B] font-black'
                      : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 text-zinc-800 dark:text-[#E8CE88] hover:border-[#D4AF37]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-extrabold">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </div>
                  <span
                    className={`text-[10px] block mt-0.5 truncate ${
                      isSelected ? 'text-[#09090B]/80 font-bold' : 'text-zinc-500 dark:text-[#B5AA92]'
                    }`}
                  >
                    {m.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Conversation Stream */}
          <div className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-4 h-[340px] overflow-y-auto space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed space-y-1.5 ${
                    msg.role === 'user'
                      ? 'bg-[#D4AF37]/15 dark:bg-[#19191F] border border-[#D4AF37]/40 text-zinc-950 dark:text-[#F6E2A6] font-bold'
                      : 'bg-white dark:bg-[#141419] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-900 dark:text-[#F4EFE6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black text-[#9A7218] dark:text-[#E8CE88]">
                      {msg.role === 'user' ? studentName : 'رفيقي الداعم'}
                    </span>
                    {msg.role === 'companion' && (
                      <button
                        type="button"
                        onClick={() => speakMultilingualText(msg.text, 'ar')}
                        className="p-1 rounded hover:bg-amber-50 dark:hover:bg-[#19191F] text-[#D4AF37] cursor-pointer"
                        title="استماع صوتي للرسالة"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}
            {isReplying && (
              <div className="flex justify-end">
                <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#141419] border border-[#D4AF37]/30 text-xs font-bold text-[#9A7218] dark:text-[#E8CE88] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>رفيقي يرتب لك النصيحة المناسبة...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendCompanionChat(q)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 hover:border-[#D4AF37] text-[11px] font-bold text-zinc-700 dark:text-[#E8CE88] cursor-pointer text-right"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCompanionChat();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="احكِ لرفيقي عن أي شيء في مذاكرتك أو يومك..."
              className="grow px-4 py-3 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 text-xs sm:text-sm font-bold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              disabled={isReplying || !chatInput.trim()}
              className="px-4 py-3 btn-luxury-gold text-[#09090B] rounded-xl font-black text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>إرسال</span>
            </button>
          </form>
        </section>

        {/* Right: Interactive Student Encouragement Community Wall */}
        <section className="xl:col-span-6 bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-zinc-950 dark:text-[#F6E2A6] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#D4AF37]" />
                <span>مجتمع نَهج التفاعلي لتشجيع الطلاب</span>
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-[#B5AA92]">
                شارك إنجازك اليومي أو شجع زملاءك بدعوة وكلمة طيبة (+10 XP للنشر)
              </p>
            </div>
            <button
              type="button"
              onClick={fetchCommunityPosts}
              title="تحديث المنشورات"
              className="p-2 rounded-xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-600 dark:text-[#E8CE88] hover:border-[#D4AF37] cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingPosts ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Publish New Encouragement Form */}
          <form
            onSubmit={handlePublishPost}
            className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-3.5 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-800 dark:text-[#F4EFE6]">
                <span>{studentName}</span>
                {verifiedSelf && <VerifiedBadge size="xs" />}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['تحفيز', 'إنجاز يومي', 'نصيحة مذاكرة', 'طلب مساعدة'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPostCategory(cat)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer ${
                      postCategory === cat
                        ? 'btn-luxury-gold text-[#09090B]'
                        : 'bg-white dark:bg-[#19191F] text-zinc-600 dark:text-[#B5AA92] border border-zinc-200 dark:border-[#D4AF37]/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="اكتب رسالة تشجيع، أو إنجاز حققته اليوم، أو سؤال لزملائك..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#141419] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-bold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37] resize-none"
            />

            {wallError && (
              <p className="text-[11px] font-bold text-red-600 dark:text-red-400">{wallError}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPublishingPost}
                className="px-4 py-2 btn-luxury-gold text-[#09090B] rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isPublishingPost ? 'جاري النشر...' : 'انشر في المجتمع'}</span>
              </button>
            </div>
          </form>

          {/* Posts Feed */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {posts.map((post) => (
              <article
                key={post.id}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-zinc-950 dark:text-[#F6E2A6]">
                    <span>{post.authorName}</span>
                    {post.isVerified && <VerifiedBadge size="xs" />}
                  </div>
                  <span className="text-[10px] font-bold text-[#9A7218] dark:text-[#E8CE88]">
                    {post.category}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-800 dark:text-[#F4EFE6] leading-relaxed">
                  {post.content}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/70 dark:border-[#D4AF37]/15">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleCheerPost(post.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:scale-105 transition-transform cursor-pointer"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                      <span className="tabular-nums">{post.cheers}</span>
                      <span>تشجيع</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveReplyPostId((cur) => (cur === post.id ? null : post.id))
                      }
                      className="flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-[#B5AA92] hover:text-[#D4AF37] cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>رد ({post.replies?.length || 0})</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-zinc-400 tabular-nums">
                    {new Date(post.createdAt).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Replies list */}
                {post.replies && post.replies.length > 0 && (
                  <div className="space-y-1.5 pt-1 pr-3 border-r-2 border-[#D4AF37]/30">
                    {post.replies.map((rep) => (
                      <div key={rep.id} className="text-xs space-y-0.5">
                        <span className="font-extrabold text-[#9A7218] dark:text-[#E8CE88] inline-flex items-center gap-1">
                          <span>{rep.authorName}</span>
                          {rep.isVerified && <VerifiedBadge size="xs" />}
                        </span>
                        <p className="text-zinc-700 dark:text-[#F4EFE6]/90">{rep.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeReplyPostId === post.id && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={replyDrafts[post.id] || ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      placeholder="اكتب ردك المشجع..."
                      className="grow px-3 py-1.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-300 dark:border-[#D4AF37]/30 text-xs font-bold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendReply(post.id)}
                      className="px-3 py-1.5 btn-luxury-gold text-[#09090B] rounded-xl text-xs font-black cursor-pointer"
                    >
                      إرسال
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
