import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu,
  Palette,
  Settings,
  Camera,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Delete,
  MoreVertical,
  Copy,
  Check,
  Trash2,
  Atom,
  Sparkles,
} from 'lucide-react';
import {
  AngleUnit,
  CalcVariables,
  evaluateMathExpression,
  primeFactorizeString,
  toDMSString,
  toEngineeringNotation,
  toSimplifiedFraction,
} from '../utils/calculatorEngine';

interface CalcHistoryEntry {
  id: string;
  expr: string;
  result: string;
  angleUnit: AngleUnit;
}

const SCIENCE_CONSTANTS = [
  { symbol: 'c', name: 'سرعة الضوء', val: '3×10^8', desc: '3×10⁸ m/s' },
  { symbol: 'h', name: 'ثابت بلانك', val: '6.625×10^-34', desc: '6.625×10⁻³⁴ J·s' },
  { symbol: 'e⁻', name: 'شحنة الإلكترون', val: '1.6×10^-19', desc: '1.6×10⁻¹⁹ C' },
  { symbol: 'me', name: 'كتلة الإلكترون', val: '9.1×10^-31', desc: '9.1×10⁻³¹ kg' },
  { symbol: 'μ₀', name: 'النفاذية المغناطيسية', val: '(4×π×10^-7)', desc: '4π×10⁻⁷' },
  { symbol: 'NA', name: 'عدد أفوجادرو', val: '6.02×10^23', desc: '6.02×10²³ mol⁻¹' },
  { symbol: 'R', name: 'ثابت الغازات', val: '8.314', desc: '8.314 J/mol·K' },
  { symbol: 'g', name: 'الجاذبية الأرضية', val: '9.8', desc: '9.8 m/s²' },
];

const UNIT_CONVERSIONS = [
  { label: 'km/h → m/s', factor: '*1000/3600' },
  { label: 'm/s → km/h', factor: '*3.6' },
  { label: '°C → K', factor: '+273.15' },
  { label: 'atm → Pa', factor: '*101325' },
  { label: 'eV → Joule', factor: '*1.6*10^-19' },
  { label: 'cm² → m²', factor: '*10^-4' },
];

type ModifierMode = 'NONE' | 'SHIFT' | 'ALPHA' | 'SECOND' | 'HYP' | 'STO';

export const CalculatorView: React.FC = () => {
  const [expression, setExpression] = useState<string>('');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [displayResult, setDisplayResult] = useState<string>('0');
  const [lastNumericResult, setLastNumericResult] = useState<number>(0);
  const [subNote, setSubNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justEvaluated, setJustEvaluated] = useState<boolean>(false);

  const [angleUnit, setAngleUnit] = useState<AngleUnit>('DEG');
  const [modifier, setModifier] = useState<ModifierMode>('NONE');
  const [displayFormat, setDisplayFormat] = useState<'DECI' | 'FRAC' | 'DMS' | 'ENG'>('DECI');
  const [displayBase, setDisplayBase] = useState<'MATH' | 'LINE'>('MATH');
  const [screenTheme, setScreenTheme] = useState<'mint' | 'classic' | 'night'>('mint');

  const [vars, setVars] = useState<CalcVariables>({
    ans: 0,
    preAns: 0,
    m: 0,
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    e: Math.E,
    f: 0,
    x: 0,
    y: 0,
  });

  // Popover drawers inside calculator shell
  const [activeDrawer, setActiveDrawer] = useState<
    null | 'constants' | 'conv' | 'history' | 'mode' | 'vars'
  >(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const [history, setHistory] = useState<CalcHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem('nahj_calces_history');
      return raw ? (JSON.parse(raw) as CalcHistoryEntry[]) : [];
    } catch {
      return [];
    }
  });

  const calcBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('nahj_calces_history', JSON.stringify(history.slice(0, 35)));
    } catch {
      // ignore
    }
  }, [history]);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 2000);
  };

  const insertAtCursor = useCallback(
    (token: string, isBinaryOp = false, cursorBackOffset = 0) => {
      setErrorMsg(null);
      setSubNote('');
      if (justEvaluated) {
        const nextExpr = isBinaryOp ? `Ans${token}` : token;
        setExpression(nextExpr);
        setCursorPos(Math.max(0, nextExpr.length - cursorBackOffset));
        setJustEvaluated(false);
      } else {
        setExpression((prev) => {
          const pos = Math.max(0, Math.min(cursorPos, prev.length));
          const updated = prev.slice(0, pos) + token + prev.slice(pos);
          setCursorPos(Math.max(0, pos + token.length - cursorBackOffset));
          return updated;
        });
      }
      setModifier('NONE');
    },
    [cursorPos, justEvaluated]
  );

  const handleStoreVariable = (varKey: keyof CalcVariables) => {
    const valToStore = lastNumericResult;
    setVars((prev) => ({ ...prev, [varKey]: valToStore }));
    showToast(`تم حفظ ${valToStore} في المتغير ${String(varKey).toUpperCase()}`);
    setModifier('NONE');
  };

  const handleBackspace = useCallback(() => {
    setErrorMsg(null);
    setJustEvaluated(false);
    if (!expression || cursorPos <= 0) return;

    const before = expression.slice(0, cursorPos);
    const after = expression.slice(cursorPos);
    const compoundTokens = [
      'asinh(',
      'acosh(',
      'atanh(',
      'randint(',
      'logxy(',
      'nroot(',
      'PreAns',
      'asin(',
      'acos(',
      'atan(',
      'acot(',
      'sinh(',
      'cosh(',
      'tanh(',
      'floor(',
      'ceil(',
      'sqrt(',
      'cbrt(',
      'd/dx(',
      'Ran#',
      'sin(',
      'cos(',
      'tan(',
      'cot(',
      'log(',
      'ln(',
      'gcd(',
      'lcm(',
      'npr(',
      'ncr(',
      'pol(',
      'rec(',
      'mod(',
      'abs(',
      'exp(',
      'Ans',
      '×10^',
      '∫(',
    ];

    for (const tok of compoundTokens) {
      if (before.endsWith(tok)) {
        const next = before.slice(0, -tok.length) + after;
        setExpression(next);
        setCursorPos(before.length - tok.length);
        return;
      }
    }
    const next = before.slice(0, -1) + after;
    setExpression(next);
    setCursorPos(cursorPos - 1);
  }, [expression, cursorPos]);

  const handleClearAll = useCallback(() => {
    setExpression('');
    setCursorPos(0);
    setDisplayResult('0');
    setSubNote('');
    setErrorMsg(null);
    setJustEvaluated(false);
    setModifier('NONE');
  }, []);

  const handleEvaluate = useCallback(() => {
    const target = expression.trim();
    if (!target) return;

    const outcome = evaluateMathExpression(target, {
      angleUnit,
      ans: vars.ans,
      vars,
    });

    if (outcome.ok === false) {
      setErrorMsg(outcome.error);
      setDisplayResult('Error');
      return;
    }

    setErrorMsg(null);
    setLastNumericResult(outcome.value);
    setDisplayFormat('DECI');
    setDisplayResult(outcome.formatted);
    setSubNote(outcome.note || '');
    setJustEvaluated(true);
    setVars((prev) => ({
      ...prev,
      preAns: prev.ans,
      ans: outcome.value,
    }));

    setHistory((prev) => [
      {
        id: `h-${Date.now()}`,
        expr: target,
        result: outcome.formatted,
        angleUnit,
      },
      ...prev.slice(0, 34),
    ]);
    setModifier('NONE');
  }, [expression, angleUnit, vars]);

  // Toggle S ⇔ D (Fraction / Decimal)
  const handleToggleSD = () => {
    if (modifier === 'SHIFT') {
      // S->D mixed fraction note
      const frac = toSimplifiedFraction(lastNumericResult);
      if (frac) {
        setDisplayResult(frac);
        showToast('تم التحويل إلى كسر اعتيادي');
      } else {
        showToast('العدد صحيح أو غير قابل للتبسيط الكسري');
      }
      setModifier('NONE');
      return;
    }
    if (displayFormat === 'FRAC') {
      setDisplayFormat('DECI');
      setDisplayResult(String(lastNumericResult));
    } else {
      const frac = toSimplifiedFraction(lastNumericResult);
      if (frac) {
        setDisplayFormat('FRAC');
        setDisplayResult(frac);
      } else {
        showToast('لا يوجد تمثيل كسري مختلف لهذا الرقم');
      }
    }
  };

  const handlePrimeFactorize = () => {
    const factStr = primeFactorizeString(lastNumericResult);
    if (factStr) {
      setSubNote(`FACT: ${factStr}`);
      showToast('تم التحليل إلى العوامل الأولية');
    } else {
      showToast('أدخل عدداً صحيحاً أكبر من 1 للتحليل');
    }
    setModifier('NONE');
  };

  const handleDMS = () => {
    const dms = toDMSString(lastNumericResult);
    setDisplayFormat('DMS');
    setDisplayResult(dms);
    setModifier('NONE');
  };

  const handleENG = () => {
    const eng = toEngineeringNotation(lastNumericResult);
    setDisplayFormat('ENG');
    setDisplayResult(eng);
    setModifier('NONE');
  };

  const handleCopyLCD = () => {
    const content = expression ? `${expression} = ${displayResult}` : displayResult;
    navigator.clipboard.writeText(content).then(() => {
      showToast('تم نسخ النتيجة');
    });
  };

  const handlePasteExpr = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip && clip.trim()) {
        insertAtCursor(clip.trim().slice(0, 60));
        showToast('تم اللصق');
      }
    } catch {
      showToast('اسمح باللصق من الحافظة');
    }
  };

  // Physical Keyboard Bindings
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        insertAtCursor(e.key);
      } else if (e.key === '+') {
        e.preventDefault();
        insertAtCursor('+', true);
      } else if (e.key === '-') {
        e.preventDefault();
        insertAtCursor('−', true);
      } else if (e.key === '*') {
        e.preventDefault();
        insertAtCursor('×', true);
      } else if (e.key === '/') {
        e.preventDefault();
        insertAtCursor('÷', true);
      } else if (e.key === '^') {
        e.preventDefault();
        insertAtCursor('^', true);
      } else if (e.key === '(' || e.key === ')' || e.key === ',') {
        e.preventDefault();
        insertAtCursor(e.key);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCursorPos((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCursorPos((p) => Math.min(expression.length, p + 1));
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearAll();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expression.length, insertAtCursor, handleEvaluate, handleBackspace, handleClearAll]);

  const lcdBgClass =
    screenTheme === 'mint'
      ? 'bg-[#DCE6E2] text-[#0E1614]'
      : screenTheme === 'classic'
      ? 'bg-[#C7D4BE] text-[#111912]'
      : 'bg-[#12161A] text-[#E6F1ED]';

  // Helper to render key button with dual SHIFT (amber) & ALPHA (purple) labels matching CalcES screenshot
  const SciKey: React.FC<{
    main: React.ReactNode;
    shiftLbl?: string;
    alphaLbl?: string;
    onPress: () => void;
    btnClass?: string;
  }> = ({ main, shiftLbl, alphaLbl, onPress, btnClass = '' }) => (
    <div className="flex flex-col items-stretch">
      <div className="flex items-center justify-between px-1 h-4 text-[10px] font-bold leading-none select-none">
        <span className="text-[#F5C531] truncate">{shiftLbl || ''}</span>
        <span className="text-[#9683EC] truncate">{alphaLbl || ''}</span>
      </div>
      <button
        type="button"
        onClick={onPress}
        className={`h-9 sm:h-10 rounded-xl bg-[#4E4C52] hover:bg-[#5E5B63] active:scale-[0.97] text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-[0_2px_0_rgba(0,0,0,0.45)] transition-all cursor-pointer ${btnClass}`}
      >
        {main}
      </button>
    </div>
  );

  const NumKey: React.FC<{
    main: React.ReactNode;
    shiftLbl?: string;
    alphaLbl?: string;
    onPress: () => void;
    variant?: 'dark' | 'orange';
  }> = ({ main, shiftLbl, alphaLbl, onPress, variant = 'dark' }) => (
    <div className="flex flex-col items-stretch">
      <div className="flex items-center justify-between px-1 h-4 text-[10px] font-bold leading-none select-none">
        <span className="text-[#F5C531] truncate">{shiftLbl || ''}</span>
        <span className="text-[#9683EC] truncate">{alphaLbl || ''}</span>
      </div>
      <button
        type="button"
        onClick={onPress}
        className={`h-11 sm:h-12 rounded-xl active:scale-[0.97] font-bold text-lg sm:text-xl flex items-center justify-center shadow-[0_2px_0_rgba(0,0,0,0.5)] transition-all cursor-pointer ${
          variant === 'orange'
            ? 'bg-[#ED9E59] hover:bg-[#F5AE6E] text-[#14110F] font-black'
            : 'bg-[#343238] hover:bg-[#434048] text-white'
        }`}
      >
        {main}
      </button>
    </div>
  );

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Page Title & Short Explanation */}
      <header className="bg-white dark:bg-[#19191F] border border-amber-200/70 dark:border-[#D4AF37]/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-zinc-950 dark:text-[#F6E2A6]">
            الآلة الحاسبة العلمية الكاملة (طراز CalcES)
          </h1>
          <p className="text-xs text-zinc-600 dark:text-[#B5AA92]">
            مطابقة تماماً للتصميم العلمي الاحترافي: كسور، تفاضل وتكامل عددي، ثوابت الفيزياء والكيمياء، تحويل وحدات، وتخزين المتغيرات
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveDrawer((d) => (d === 'constants' ? null : 'constants'))}
            className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/35 text-[#9A7218] dark:text-[#F3DFA2] flex items-center gap-1.5 cursor-pointer"
          >
            <Atom className="w-3.5 h-3.5" />
            <span>الثوابت العلمية</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveDrawer((d) => (d === 'history' ? null : 'history'))}
            className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/35 text-[#9A7218] dark:text-[#F3DFA2] cursor-pointer"
          >
            السجل ({history.length})
          </button>
        </div>
      </header>

      {/* Main Centered CalcES Shell + Optional Side History/Drawers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Realistic CalcES Scientific Calculator */}
        <section
          ref={calcBodyRef}
          dir="ltr"
          className="lg:col-span-7 max-w-[490px] w-full mx-auto bg-[#0D0C10] border-2 border-[#D4AF37]/45 rounded-3xl p-3 sm:p-4 shadow-2xl select-none"
        >
          {/* Top Status Indicator Bar matching screenshot */}
          <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider px-1.5 pb-1.5">
            <div className="flex items-center gap-2">
              <span className={modifier === 'SHIFT' ? 'text-[#F5C531]' : 'text-zinc-600'}>S</span>
              <span className={modifier === 'ALPHA' ? 'text-[#9683EC]' : 'text-zinc-600'}>A</span>
              <span className={modifier === 'STO' ? 'text-[#F5C531]' : 'text-zinc-600'}>STO</span>
              <span className="text-zinc-600">RCL</span>
              <span className="text-zinc-300">NORM-11</span>
              <span className="text-zinc-300">{displayBase}</span>
              <span className="text-zinc-300">{displayFormat}</span>
            </div>
            {statusToast && (
              <span className="text-[10px] font-['Cairo',sans-serif] text-[#F5C531]">
                {statusToast}
              </span>
            )}
          </div>

          {/* Mint-Sage Large Natural LCD Screen */}
          <div
            className={`${lcdBgClass} rounded-xl p-3.5 min-h-[152px] flex flex-col justify-between relative shadow-inner border border-black/40 mb-2.5`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="grow font-mono text-base sm:text-lg font-bold tracking-wide overflow-x-auto whitespace-nowrap pr-2">
                {expression ? (
                  <>
                    <span>{expression.slice(0, cursorPos)}</span>
                    <span className="inline-block w-[2px] h-5 bg-[#8C78E6] align-middle animate-pulse" />
                    <span>{expression.slice(cursorPos)}</span>
                  </>
                ) : (
                  <span className="opacity-45">0</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleCopyLCD}
                title="نسخ النتيجة والشاشة"
                className="p-1 rounded hover:bg-black/10 opacity-60 hover:opacity-100 cursor-pointer shrink-0"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-3 flex items-end justify-between gap-2">
              <div className="text-[11px] font-['Cairo',sans-serif] font-bold">
                {errorMsg ? (
                  <span className="text-red-700">{errorMsg}</span>
                ) : (
                  <span className="opacity-75">{subNote}</span>
                )}
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-right truncate">
                {displayResult}
              </div>
            </div>
          </div>

          {/* Toolbar Strip Right Under LCD */}
          <div className="flex items-center justify-between gap-1.5 mb-2.5 px-0.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveDrawer((d) => (d === 'vars' ? null : 'vars'))}
                title="المتغيرات والذاكرة"
                className="w-8 h-7 rounded-lg bg-[#2D2B32] hover:bg-[#3D3A44] text-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawer((d) => (d === 'constants' ? null : 'constants'))}
                className="h-7 px-2.5 rounded-full bg-[#9D79FF] hover:bg-[#AD8EFF] text-[#0D0C10] font-black text-[10px] flex items-center gap-1 cursor-pointer"
                title="مكتبة الثوابت والقوانين (PRO)"
              >
                <Sparkles className="w-3 h-3" />
                <span>PRO</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setScreenTheme((t) => (t === 'mint' ? 'classic' : t === 'classic' ? 'night' : 'mint'))
                }
                title="تغيير لون شاشة الآلة"
                className="w-8 h-7 rounded-lg bg-[#2D2B32] hover:bg-[#3D3A44] text-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => insertAtCursor('∫(,0,1)', false, 5)}
                title="تكامل محدد"
                className="w-8 h-7 rounded-lg bg-[#2D2B32] hover:bg-[#3D3A44] text-zinc-200 font-serif font-black text-xs flex items-center justify-center cursor-pointer"
              >
                Σ
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawer((d) => (d === 'mode' ? null : 'mode'))}
                title="إعدادات العرض والزاوية"
                className="w-8 h-7 rounded-lg bg-[#2D2B32] hover:bg-[#3D3A44] text-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => insertAtCursor('−', false)}
                title="إشارة سالب"
                className="w-8 h-7 rounded-lg bg-[#2D2B32] hover:bg-[#3D3A44] text-zinc-200 font-mono font-black text-xs flex items-center justify-center cursor-pointer"
              >
                +/−
              </button>

              <button
                type="button"
                onClick={handleCopyLCD}
                title="نسخ الشاشة"
                className="w-8 h-7 rounded-lg bg-[#2D2B32] hover:bg-[#3D3A44] text-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setAngleUnit((u) => (u === 'DEG' ? 'RAD' : u === 'RAD' ? 'GRAD' : 'DEG'))
              }
              className="h-7 px-2.5 rounded-lg bg-[#2D2B32] hover:bg-[#3D3A44] text-white font-mono font-black text-[10px] cursor-pointer"
            >
              {angleUnit}
            </button>
          </div>

          {/* Optional Inline Drawer inside Calculator when user opens Constants / Conversions / Vars / Mode */}
          {activeDrawer && activeDrawer !== 'history' && (
            <div className="mb-2.5 p-2.5 rounded-xl bg-[#19181F] border border-[#F5C531]/45 text-white space-y-2" dir="rtl">
              <div className="flex items-center justify-between text-[11px] font-black text-[#F5C531]">
                <span>
                  {activeDrawer === 'constants'
                    ? 'الثوابت العلمية (CONST)'
                    : activeDrawer === 'conv'
                    ? 'تحويل الوحدات (CONV)'
                    : activeDrawer === 'mode'
                    ? 'نظام الآلة (MODE)'
                    : 'الذاكرة والمتغيرات (A - F, X, Y, M)'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

              {activeDrawer === 'constants' && (
                <div className="grid grid-cols-2 gap-1.5" dir="ltr">
                  {SCIENCE_CONSTANTS.map((c) => (
                    <button
                      key={c.symbol}
                      type="button"
                      onClick={() => {
                        insertAtCursor(c.val);
                        setActiveDrawer(null);
                      }}
                      className="p-1.5 rounded-lg bg-[#2A2931] hover:bg-[#383642] text-left text-[10px] cursor-pointer"
                    >
                      <span className="font-mono font-black text-[#F5C531]">{c.symbol}</span>{' '}
                      <span className="text-zinc-300">{c.desc}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeDrawer === 'conv' && (
                <div className="grid grid-cols-2 gap-1.5" dir="ltr">
                  {UNIT_CONVERSIONS.map((u) => (
                    <button
                      key={u.label}
                      type="button"
                      onClick={() => {
                        insertAtCursor(u.factor, true);
                        setActiveDrawer(null);
                      }}
                      className="p-1.5 rounded-lg bg-[#2A2931] hover:bg-[#383642] text-left font-mono text-[10px] cursor-pointer"
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              )}

              {activeDrawer === 'mode' && (
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                  {(['DEG', 'RAD', 'GRAD'] as AngleUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        setAngleUnit(u);
                        setActiveDrawer(null);
                      }}
                      className={`py-1.5 rounded-lg cursor-pointer ${
                        angleUnit === u ? 'bg-[#F5C531] text-black' : 'bg-[#2A2931]'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayBase((b) => (b === 'MATH' ? 'LINE' : 'MATH'));
                      setActiveDrawer(null);
                    }}
                    className="col-span-3 py-1.5 rounded-lg bg-[#2A2931] hover:bg-[#383642] cursor-pointer"
                  >
                    صيغة العرض: {displayBase}
                  </button>
                </div>
              )}

              {activeDrawer === 'vars' && (
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px]" dir="ltr">
                  {(['a', 'b', 'c', 'd', 'e', 'f', 'x', 'y', 'm'] as Array<keyof CalcVariables>).map(
                    (k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          insertAtCursor(String(k));
                          setActiveDrawer(null);
                        }}
                        className="p-1.5 rounded-lg bg-[#2A2931] hover:bg-[#383642] cursor-pointer"
                      >
                        <span className="text-[#9683EC] font-black">{String(k).toUpperCase()}</span>:{' '}
                        {Number(vars[k].toPrecision(4))}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Top Navigation & SHIFT/ALPHA Section matching CalcES layout */}
          <div className="grid grid-cols-6 gap-1.5 mb-2 items-center">
            {/* Left 2 columns stacked 2 rows */}
            <div className="col-span-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setModifier((m) => (m === 'SHIFT' ? 'NONE' : 'SHIFT'))}
                className={`h-9 sm:h-10 rounded-xl font-black text-xs sm:text-sm shadow-[0_2px_0_rgba(0,0,0,0.45)] transition-all cursor-pointer ${
                  modifier === 'SHIFT'
                    ? 'bg-[#FFE066] text-[#09090B] ring-2 ring-white'
                    : 'bg-[#F5C531] hover:bg-[#FFD24D] text-[#09090B]'
                }`}
              >
                SHIFT
              </button>
              <button
                type="button"
                onClick={() => setModifier((m) => (m === 'ALPHA' ? 'NONE' : 'ALPHA'))}
                className={`h-9 sm:h-10 rounded-xl font-black text-xs sm:text-sm shadow-[0_2px_0_rgba(0,0,0,0.45)] transition-all cursor-pointer ${
                  modifier === 'ALPHA'
                    ? 'bg-[#A694FF] text-white ring-2 ring-white'
                    : 'bg-[#8C78E6] hover:bg-[#9E8CF0] text-white'
                }`}
              >
                ALPHA
              </button>

              <SciKey
                shiftLbl="SOLVE"
                alphaLbl="="
                main="CALC"
                onPress={() => {
                  if (modifier === 'SHIFT' || modifier === 'ALPHA') {
                    insertAtCursor('=');
                  } else {
                    handleEvaluate();
                  }
                }}
              />
              <SciKey
                shiftLbl="d/dx"
                alphaLbl=";"
                main="∫dx"
                onPress={() => {
                  if (modifier === 'SHIFT') {
                    insertAtCursor('d/dx(,0)', false, 3);
                  } else if (modifier === 'ALPHA') {
                    insertAtCursor(',');
                  } else {
                    insertAtCursor('∫(,0,1)', false, 5);
                  }
                }}
              />
            </div>

            {/* Center 2-column Wide 4-Way D-Pad Pill */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="w-full h-[88px] sm:h-[96px] rounded-[2rem] bg-[#4E4C52] border border-white/10 shadow-inner relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (history.length > 0) {
                      setExpression(history[0].expr);
                      setCursorPos(history[0].expr.length);
                    }
                  }}
                  title="استعادة آخر عملية"
                  className="absolute top-1.5 left-1/2 -translate-x-1/2 p-1 text-zinc-200 hover:text-[#F5C531] cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawer((d) => (d === 'history' ? null : 'history'))}
                  title="سجل العمليات"
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 p-1 text-zinc-200 hover:text-[#F5C531] cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => setCursorPos((p) => Math.max(0, p - 1))}
                  title="تحريك المؤشر لليسار"
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-zinc-200 hover:text-[#F5C531] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => setCursorPos((p) => Math.min(expression.length, p + 1))}
                  title="تحريك المؤشر لليمين"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-200 hover:text-[#F5C531] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={handleEvaluate}
                  title="تنفيذ ="
                  className="w-5 h-5 rounded-full bg-[#151419] hover:bg-[#F5C531] transition-colors cursor-pointer"
                />
              </div>
            </div>

            {/* Right 2 columns stacked 2 rows */}
            <div className="col-span-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveDrawer((d) => (d === 'mode' ? null : 'mode'))}
                className="h-9 sm:h-10 rounded-xl bg-[#4E4C52] hover:bg-[#5E5B63] text-white font-bold text-xs sm:text-sm shadow-[0_2px_0_rgba(0,0,0,0.45)] cursor-pointer"
              >
                MODE
              </button>
              <button
                type="button"
                onClick={() => setModifier((m) => (m === 'SECOND' || m === 'SHIFT' ? 'NONE' : 'SHIFT'))}
                className={`h-9 sm:h-10 rounded-xl font-bold italic text-xs sm:text-sm shadow-[0_2px_0_rgba(0,0,0,0.45)] cursor-pointer ${
                  modifier === 'SHIFT'
                    ? 'bg-[#F5C531] text-black'
                    : 'bg-[#4E4C52] hover:bg-[#5E5B63] text-white'
                }`}
              >
                2nd
              </button>

              <SciKey
                shiftLbl="x!"
                alphaLbl="><="
                main={<span className="italic">x⁻¹</span>}
                onPress={() => {
                  if (modifier === 'SHIFT') insertAtCursor('!', true);
                  else insertAtCursor('^-1', true);
                }}
              />
              <SciKey
                shiftLbl="Σ"
                alphaLbl="Π"
                main={<span className="text-[11px] sm:text-xs">Logₓy</span>}
                onPress={() => {
                  if (modifier === 'SHIFT') insertAtCursor('∫(,0,5)', false, 5);
                  else insertAtCursor('logxy(,)', false, 2);
                }}
              />
            </div>
          </div>

          {/* 3 Scientific Rows (6 Columns Each) Matching Screenshot */}
          <div className="grid grid-cols-6 gap-1.5 mb-2.5">
            {/* Sci Row 1 */}
            <SciKey
              shiftLbl="x y/z"
              alphaLbl="÷R"
              main={
                <span className="text-[11px] leading-tight flex flex-col items-center">
                  <span className="border-b border-white/70 px-1 text-[9px]">x</span>
                  <span className="text-[9px]">y</span>
                </span>
              }
              onPress={() => {
                if (modifier === 'ALPHA') insertAtCursor('mod(,)', false, 2);
                else insertAtCursor('/', true);
              }}
            />
            <SciKey
              shiftLbl="³√x"
              alphaLbl="mod"
              main="√x"
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('cbrt(');
                else if (modifier === 'ALPHA') insertAtCursor('mod(,)', false, 2);
                else insertAtCursor('sqrt(');
              }}
            />
            <SciKey
              shiftLbl="x³"
              alphaLbl="|"
              main={<span className="italic">x²</span>}
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('^3', true);
                else insertAtCursor('^2', true);
              }}
            />
            <SciKey
              shiftLbl="ˣ√y"
              main={<span className="italic">xʸ</span>}
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('nroot(,)', false, 2);
                else insertAtCursor('^', true);
              }}
            />
            <SciKey
              shiftLbl="10ˣ"
              main="Log"
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('10^(');
                else insertAtCursor('log(');
              }}
            />
            <SciKey
              shiftLbl="eˣ"
              alphaLbl="t"
              main="Ln"
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('exp(');
                else if (modifier === 'ALPHA') insertAtCursor('x');
                else insertAtCursor('ln(');
              }}
            />

            {/* Sci Row 2 */}
            <SciKey
              shiftLbl="∠"
              alphaLbl="a"
              main="(−)"
              onPress={() => {
                if (modifier === 'STO') handleStoreVariable('a');
                else if (modifier === 'ALPHA') insertAtCursor('a');
                else insertAtCursor('-');
              }}
            />
            <SciKey
              shiftLbl="FACT"
              alphaLbl="b"
              main="°'&quot;"
              onPress={() => {
                if (modifier === 'STO') handleStoreVariable('b');
                else if (modifier === 'ALPHA') insertAtCursor('b');
                else if (modifier === 'SHIFT') handlePrimeFactorize();
                else handleDMS();
              }}
            />
            <SciKey
              shiftLbl="|x|"
              alphaLbl="c"
              main={modifier === 'HYP' ? <span className="text-[#F5C531]">hyp●</span> : 'hyp'}
              onPress={() => {
                if (modifier === 'STO') handleStoreVariable('c');
                else if (modifier === 'ALPHA') insertAtCursor('c');
                else if (modifier === 'SHIFT') insertAtCursor('abs(');
                else setModifier((m) => (m === 'HYP' ? 'NONE' : 'HYP'));
              }}
            />
            <SciKey
              shiftLbl="Sin⁻¹"
              alphaLbl="d"
              main="Sin"
              onPress={() => {
                if (modifier === 'STO') handleStoreVariable('d');
                else if (modifier === 'ALPHA') insertAtCursor('d');
                else if (modifier === 'SHIFT') insertAtCursor('asin(');
                else if (modifier === 'HYP') insertAtCursor('sinh(');
                else insertAtCursor('sin(');
              }}
            />
            <SciKey
              shiftLbl="Cos⁻¹"
              alphaLbl="e"
              main="Cos"
              onPress={() => {
                if (modifier === 'STO') handleStoreVariable('e');
                else if (modifier === 'ALPHA') insertAtCursor('e');
                else if (modifier === 'SHIFT') insertAtCursor('acos(');
                else if (modifier === 'HYP') insertAtCursor('cosh(');
                else insertAtCursor('cos(');
              }}
            />
            <SciKey
              shiftLbl="Tan⁻¹"
              alphaLbl="f"
              main="Tan"
              onPress={() => {
                if (modifier === 'STO') handleStoreVariable('f');
                else if (modifier === 'ALPHA') insertAtCursor('f');
                else if (modifier === 'SHIFT') insertAtCursor('atan(');
                else if (modifier === 'HYP') insertAtCursor('tanh(');
                else insertAtCursor('tan(');
              }}
            />

            {/* Sci Row 3 */}
            <SciKey
              shiftLbl="STO"
              alphaLbl="CLRv"
              main="RCL"
              onPress={() => {
                if (modifier === 'SHIFT') {
                  setModifier('STO');
                  showToast('اختر حرفاً (A-F, X, Y, M) للتخزين');
                } else if (modifier === 'ALPHA') {
                  setVars((prev) => ({
                    ...prev,
                    a: 0,
                    b: 0,
                    c: 0,
                    d: 0,
                    f: 0,
                    x: 0,
                    y: 0,
                    m: 0,
                  }));
                  showToast('تم تصفير جميع المتغيرات');
                  setModifier('NONE');
                } else {
                  setActiveDrawer('vars');
                }
              }}
            />
            <SciKey
              shiftLbl="i"
              alphaLbl="Cot"
              main="ENG"
              onPress={() => {
                if (modifier === 'ALPHA') insertAtCursor('cot(');
                else handleENG();
              }}
            />
            <SciKey
              shiftLbl="%"
              alphaLbl="Cot⁻¹"
              main="("
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('%', true);
                else if (modifier === 'ALPHA') insertAtCursor('acot(');
                else insertAtCursor('(');
              }}
            />
            <SciKey
              shiftLbl=","
              alphaLbl="x"
              main=")"
              onPress={() => {
                if (modifier === 'STO') handleStoreVariable('x');
                else if (modifier === 'SHIFT') insertAtCursor(',');
                else if (modifier === 'ALPHA') insertAtCursor('x');
                else insertAtCursor(')');
              }}
            />
            <SciKey
              shiftLbl="x/y→"
              alphaLbl="y"
              main="S ⇌ D"
              onPress={() => {
                if (modifier === 'STO') handleStoreVariable('y');
                else if (modifier === 'ALPHA') insertAtCursor('y');
                else handleToggleSD();
              }}
            />
            <SciKey
              shiftLbl="M−"
              alphaLbl="m"
              main="M+"
              onPress={() => {
                if (modifier === 'STO') handleStoreVariable('m');
                else if (modifier === 'ALPHA') insertAtCursor('m');
                else if (modifier === 'SHIFT') {
                  setVars((prev) => ({ ...prev, m: prev.m - lastNumericResult }));
                  showToast('تم الطرح من الذاكرة M');
                  setModifier('NONE');
                } else {
                  setVars((prev) => ({ ...prev, m: prev.m + lastNumericResult }));
                  showToast('تم الجمع للذاكرة M');
                }
              }}
            />
          </div>

          {/* 4×5 Main Numpad Grid Matching Screenshot */}
          <div className="grid grid-cols-5 gap-2">
            {/* Row 1 */}
            <NumKey
              shiftLbl="CONST"
              main="7"
              onPress={() => {
                if (modifier === 'SHIFT') {
                  setActiveDrawer('constants');
                  setModifier('NONE');
                } else {
                  insertAtCursor('7');
                }
              }}
            />
            <NumKey
              shiftLbl="CONV"
              alphaLbl="SI"
              main="8"
              onPress={() => {
                if (modifier === 'SHIFT') {
                  setActiveDrawer('conv');
                  setModifier('NONE');
                } else {
                  insertAtCursor('8');
                }
              }}
            />
            <NumKey
              shiftLbl="Limit"
              alphaLbl="∞"
              main="9"
              onPress={() => {
                if (modifier === 'ALPHA') insertAtCursor('∞');
                else insertAtCursor('9');
              }}
            />
            <NumKey
              variant="orange"
              main={<Delete className="w-5 h-5" />}
              onPress={handleBackspace}
            />
            <NumKey
              shiftLbl="CLR ALL"
              variant="orange"
              main="AC"
              onPress={handleClearAll}
            />

            {/* Row 2 */}
            <NumKey shiftLbl="MATRIX" main="4" onPress={() => insertAtCursor('4')} />
            <NumKey shiftLbl="VECTOR" main="5" onPress={() => insertAtCursor('5')} />
            <NumKey shiftLbl="FUNC" alphaLbl="HELP" main="6" onPress={() => insertAtCursor('6')} />
            <NumKey
              shiftLbl="nPr"
              alphaLbl="GCD"
              main="×"
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('npr(,)', false, 2);
                else if (modifier === 'ALPHA') insertAtCursor('gcd(,)', false, 2);
                else insertAtCursor('×', true);
              }}
            />
            <NumKey
              shiftLbl="nCr"
              alphaLbl="LCM"
              main="÷"
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('ncr(,)', false, 2);
                else if (modifier === 'ALPHA') insertAtCursor('lcm(,)', false, 2);
                else insertAtCursor('÷', true);
              }}
            />

            {/* Row 3 */}
            <NumKey shiftLbl="STAT" main="1" onPress={() => insertAtCursor('1')} />
            <NumKey shiftLbl="CMPLX" main="2" onPress={() => insertAtCursor('2')} />
            <NumKey shiftLbl="DISTR" main="3" onPress={() => insertAtCursor('3')} />
            <NumKey
              shiftLbl="Pol"
              alphaLbl="Ceil"
              main="+"
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('pol(,)', false, 2);
                else if (modifier === 'ALPHA') insertAtCursor('ceil(');
                else insertAtCursor('+', true);
              }}
            />
            <NumKey
              shiftLbl="Rec"
              alphaLbl="Floor"
              main="−"
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('rec(,)', false, 2);
                else if (modifier === 'ALPHA') insertAtCursor('floor(');
                else insertAtCursor('−', true);
              }}
            />

            {/* Row 4 */}
            <NumKey
              shiftLbl="COPY"
              alphaLbl="PASTE"
              main="0"
              onPress={() => {
                if (modifier === 'SHIFT') {
                  handleCopyLCD();
                  setModifier('NONE');
                } else if (modifier === 'ALPHA') {
                  handlePasteExpr();
                  setModifier('NONE');
                } else {
                  insertAtCursor('0');
                }
              }}
            />
            <NumKey
              shiftLbl="Ran#"
              alphaLbl="RanInt"
              main="."
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('Ran#');
                else if (modifier === 'ALPHA') insertAtCursor('randint(1,10)');
                else insertAtCursor('.');
              }}
            />
            <NumKey
              shiftLbl="π"
              alphaLbl="e"
              main="Exp"
              onPress={() => {
                if (modifier === 'SHIFT') insertAtCursor('π');
                else if (modifier === 'ALPHA') insertAtCursor('e');
                else insertAtCursor('×10^');
              }}
            />
            <NumKey
              alphaLbl="PreAns"
              main="Ans"
              onPress={() => {
                if (modifier === 'ALPHA') insertAtCursor('PreAns');
                else insertAtCursor('Ans');
              }}
            />
            <NumKey
              shiftLbl="History"
              main="="
              onPress={() => {
                if (modifier === 'SHIFT') {
                  setActiveDrawer((d) => (d === 'history' ? null : 'history'));
                  setModifier('NONE');
                } else {
                  handleEvaluate();
                }
              }}
            />
          </div>
        </section>

        {/* Right Companion Panel: History Tape & Quick Shortcuts */}
        <aside className="lg:col-span-5 bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#D4AF37]/20">
            <h2 className="text-sm font-black text-zinc-950 dark:text-[#F6E2A6]">
              سجل العمليات الحسابية ({history.length})
            </h2>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-xs font-bold text-zinc-500 hover:text-red-500 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح</span>
              </button>
            )}
          </div>

          {/* Quick Tips */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/20 text-[11px] text-zinc-600 dark:text-[#B5AA92] space-y-1">
            <p className="font-black text-[#9A7218] dark:text-[#E8CE88]">اختصارات ذكية مثل الآلة الحقيقية:</p>
            <p>• اضغط <span className="font-mono font-bold text-[#F5C531]">SHIFT</span> ثم الزر لتفعيل الكتابة الذهبية (مثل <span className="font-mono">π, √³ ,Sin⁻¹ ,nPr ,d/dx</span>).</p>
            <p>• اضغط <span className="font-mono font-bold text-[#9683EC]">ALPHA</span> لتفعيل الكتابة البنفسجية (مثل <span className="font-mono">e, Cot, GCD, LCM, x, y</span>).</p>
            <p>• اضغط <span className="font-mono font-bold">S ⇌ D</span> للتحويل بين الكسر والرقم العشري.</p>
          </div>

          {history.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500 dark:text-[#B5AA92]">
              ابدأ بحساب أي مسألة ليتم حفظ خطواتك هنا فوراً.
            </div>
          ) : (
            <div className="space-y-2 max-h-[410px] overflow-y-auto pr-1">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setExpression(item.expr);
                    setCursorPos(item.expr.length);
                    setDisplayResult(item.result);
                    setAngleUnit(item.angleUnit);
                    setJustEvaluated(false);
                  }}
                  className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/20 hover:border-[#D4AF37] text-left transition-colors cursor-pointer"
                  dir="ltr"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>{item.angleUnit}</span>
                    <span>استعادة</span>
                  </div>
                  <div className="font-mono text-xs text-zinc-600 dark:text-[#B5AA92] truncate">
                    {item.expr}
                  </div>
                  <div className="font-mono text-base font-black text-[#9A7218] dark:text-[#F3DFA2] tabular-nums">
                    = {item.result}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
