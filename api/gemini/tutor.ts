import {
  getServerGeminiClient,
  classifyServerGeminiError,
  runServerWithRetry,
  parseRequestBody,
  ThinkingLevel,
} from '../_gemini.js';
import { generateTutorFallback } from '../../src/utils/aiFallbacks.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = parseRequestBody(req);
    const { message, context, subject, history, tutorMode } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'يرجى كتابة رسالة أو سؤال أولاً' });
    }

    const activeAi = getServerGeminiClient();

    const modeDirective =
      tutorMode === 'quiz'
        ? 'نمط التحدي: اطرح على الطالب 3 أسئلة اختيار من متعدد قوية بنظام الربط والاستنتاج الحديث، ولا تكشف الإجابات حتى يجيب هو أولاً!'
        : tutorMode === 'problem'
        ? 'نمط المسائل والتركات: ركز على القوانين، التعويض الرياضي بالخطوات والأرقام، وتنبيهات الوحدات والتحويلات الفيزيائية والكيميائية.'
        : tutorMode === 'plan'
        ? 'نمط الخطة: صمم خطة عملية محكمة بالأيام والساعات لإنهاء وتصفية هذا الجزء في أقصر وقت ممكن.'
        : 'نمط الشرح التفاعلي: فكك السؤال، اشرح المفهوم العلمي ببساطة، ركز على تركات الامتحان، واختم بسؤال تفاعلي سريع.';

    const systemPrompt = `أنت «أستاذ نَهج»، المعلم الأكاديمي والمرشد التربوي الذكي الأول لطلاب الثانوية العامة في مصر (شعبة علمي علوم).
طريقتك وأسلوبك:
- تتحدث بالعامية المصرية الراقية والذكية، كأستاذ ثانوية عامة عبقري ومخلص يشرح بحب ووضوح، يشجع طالبه ويزرع فيه الثقة والهمة.
- التوجيه الحالي: ${modeDirective}
- منهجية الإجابة الذهبية لتوضيح كل سؤال وتفاعل الطالب (اجعل الرد مركزاً وواضحاً في حدود 180-320 كلمة بدون إطالة مملة):
  1. 🎯 **تفكيك السؤال وفهم المطلوب:** وضح للطالب أولاً ماذا يطلب السؤال ولماذا يبدو خادعاً أو ما الفكرة المفتاحية التي يبحث عنها واضع الامتحان.
  2. 💡 **الشرح وخطوات الحل النموذجية:** شرح علمي منظم بالخطوات، القوانين، والمعادلات مع ضرب مثال واقعي يرسخ في الذهن.
  3. ⚡ **تركة الامتحان ومصيدة الطلاب:** نبهه صراحة على الخطأ الشائع الذي يقع فيه أغلب الطلاب في هذا الموضوع.
  4. ❓ **سؤال تفاعلي سريع لك يا بطل:** اطرح في نهاية كل إجابة سؤالاً تطبيقياً قصيراً (اختيار من متعدد أو مسألة صغيرة) وتحداه أن يجاوب عليها الآن لتقييم إجابته!
- متخصص ومتمكن في:
  * الأحياء (الدعامة والحركة، الهرمونات، التكاثر، المناعة، البيولوجيا الجزيئية DNA & RNA).
  * الكيمياء (العناصر الانتقالية، التحليل، الاتزان، الكهربية، الكيمياء العضوية).
  * الفيزياء (الكهربية وقوانين كيرشوف، التأثير المغناطيسي، الحث، دوائر المتردد، الفيزياء الحديثة).
  * الجيولوجيا والعلوم البيئية (التراكيب، المعادن، الصخور، التكتونية، التجوية، البيئة).
  * اللغة العربية (النحو، البلاغة، الأدب، النصوص، القراءة) واللغة الإنجليزية.
- إذا أرسل الطالب إجابة على سؤال سابق، قيّم إجابته بصراحة وصحح له الخطأ إن وجد أو احتفل بإصابته، ثم انتقل لخطوة أعلى.
- ردودك سريعة ومباشرة دون حشو، وتستخدم علامات التنسيق الواضحة والنقاط.`;

    let reply = '';
    let responseSource: 'gemini' | 'fallback' = 'fallback';
    let apiWarning: string | undefined;

    if (activeAi) {
      try {
        const formattedContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
        if (Array.isArray(history) && history.length > 0) {
          const recentTurns = history.slice(-6);
          for (const item of recentTurns) {
            if (item?.text && typeof item.text === 'string' && item.text.trim()) {
              formattedContents.push({
                role: item.sender === 'user' || item.role === 'user' ? 'user' : 'model',
                parts: [{ text: item.text }],
              });
            }
          }
        }

        const currentPrompt = `[المادة المستهدفة: ${subject || 'علمي علوم'}] ${context ? `[سياق: ${context}]` : ''}\nسؤال الطالب:\n${message}`;
        formattedContents.push({
          role: 'user',
          parts: [{ text: currentPrompt }],
        });

        const result = await runServerWithRetry(async () => {
          const response = await activeAi.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: formattedContents,
            config: {
              systemInstruction: systemPrompt,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          return response.text || '';
        }, 2, 24000);

        if (result && result.trim()) {
          reply = result.trim();
          responseSource = 'gemini';
        }
      } catch (err: any) {
        const classified = classifyServerGeminiError(err);
        apiWarning = classified.userWarning;
        console.warn('Vercel Gemini tutor fallback triggered:', err?.message || err);
      }
    } else {
      apiWarning = 'مفتاح GEMINI_API_KEY غير مضاف في إعدادات البيئة؛ تم الرد عبر المحرك التعليمي السريع.';
    }

    if (!reply) {
      reply = generateTutorFallback({ message, subject, tutorMode });
    }

    return res.status(200).json({
      success: true,
      reply,
      source: responseSource,
      warning: apiWarning,
      isFree: true,
    });
  } catch (error: any) {
    console.error('Vercel Gemini Tutor Error:', error);
    return res.status(500).json({
      success: false,
      error: 'تعذر معالجة سؤالك حالياً، يرجى إعادة المحاولة.',
    });
  }
}
