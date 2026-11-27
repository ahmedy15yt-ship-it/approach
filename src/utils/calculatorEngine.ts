// Pure TypeScript CalcES Scientific Calculator Engine (No eval / No Function)

export type AngleUnit = 'DEG' | 'RAD' | 'GRAD';

export interface CalcVariables {
  ans: number;
  preAns: number;
  m: number;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  x: number;
  y: number;
}

type Token =
  | { type: 'number'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '^' | '%' }
  | { type: 'unary_minus' }
  | { type: 'factorial' }
  | { type: 'percent' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' };

const BUILTIN_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  'π': Math.PI,
  e: Math.E,
  inf: Infinity,
  '∞': Infinity,
};

// Map of functions and their arity (comma-separated args when multi-arg)
const MULTI_ARG_FUNCTIONS = new Set([
  'logxy',
  'nroot',
  'gcd',
  'lcm',
  'npr',
  'ncr',
  'randint',
  'pol',
  'rec',
  'mod',
]);

const SINGLE_ARG_FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'cot',
  'asin',
  'acos',
  'atan',
  'acot',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
  'log',
  'ln',
  'sqrt',
  'cbrt',
  'abs',
  'exp',
  'tenpow',
  'ceil',
  'floor',
]);

function factorial(n: number): number {
  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
    throw new Error('المضروب للأعداد الصحيحة غير السالبة فقط');
  }
  if (n > 170) throw new Error('تجاوز الحد الحسابي');
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function gcdNum(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function lcmNum(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.round(a) * Math.round(b)) / gcdNum(a, b);
}

function nPr(n: number, r: number): number {
  if (n < 0 || r < 0 || r > n || Math.floor(n) !== n || Math.floor(r) !== r) {
    throw new Error('قيمة غير صالحة للتباديل nPr');
  }
  return factorial(n) / factorial(n - r);
}

function nCr(n: number, r: number): number {
  if (n < 0 || r < 0 || r > n || Math.floor(n) !== n || Math.floor(r) !== r) {
    throw new Error('قيمة غير صالحة للتوافيق nCr');
  }
  return factorial(n) / (factorial(r) * factorial(n - r));
}

function normalizeDisplayExpression(raw: string): string {
  return raw
    .replace(/×10\^/g, '*10^')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁻¹/g, '^(-1)')
    .replace(/√\(/g, 'sqrt(')
    .replace(/√(\d+(?:\.\d+)?)/g, 'sqrt($1)')
    .replace(/√([a-zA-Zπ]+)/g, 'sqrt($1)')
    .replace(/∛\(/g, 'cbrt(')
    .replace(/∛(\d+(?:\.\d+)?)/g, 'cbrt($1)')
    .replace(/∛([a-zA-Zπ]+)/g, 'cbrt($1)')
    .replace(/π/g, 'pi')
    .replace(/∞/g, 'inf')
    .replace(/Ran#/gi, String(Number(Math.random().toFixed(4))))
    .replace(/\s+/g, '');
}

function tokenize(expr: string, vars: CalcVariables): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    // Numbers
    if (/\d/.test(ch) || (ch === '.' && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      let numStr = '';
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        numStr += expr[i++];
      }
      if (i < expr.length && expr[i] === 'E' && /[+\-\d]/.test(expr[i + 1] || '')) {
        numStr += expr[i++];
        if (expr[i] === '+' || expr[i] === '-') numStr += expr[i++];
        while (i < expr.length && /\d/.test(expr[i])) numStr += expr[i++];
      }
      const val = Number(numStr);
      if (!Number.isFinite(val)) throw new Error('صيغة رقمية غير صالحة');
      tokens.push({ type: 'number', value: val });
      continue;
    }

    // Identifiers
    if (/[a-zA-Z]/.test(ch)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        ident += expr[i++];
      }
      const lower = ident.toLowerCase();
      if (lower === 'ans') {
        tokens.push({ type: 'number', value: vars.ans });
      } else if (lower === 'preans') {
        tokens.push({ type: 'number', value: vars.preAns });
      } else if (lower in BUILTIN_CONSTANTS) {
        tokens.push({ type: 'number', value: BUILTIN_CONSTANTS[lower] });
      } else if (
        lower === 'a' ||
        lower === 'b' ||
        lower === 'c' ||
        lower === 'd' ||
        lower === 'f' ||
        lower === 'x' ||
        lower === 'y' ||
        lower === 'm'
      ) {
        tokens.push({ type: 'number', value: vars[lower as keyof CalcVariables] ?? 0 });
      } else if (SINGLE_ARG_FUNCTIONS.has(lower) || MULTI_ARG_FUNCTIONS.has(lower)) {
        tokens.push({ type: 'ident', value: lower });
      } else {
        throw new Error(`رمز غير معروف: ${ident}`);
      }
      continue;
    }

    if (ch === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    if (ch === '!') {
      tokens.push({ type: 'factorial' });
      i++;
      continue;
    }

    if (ch === '%') {
      // Percent postfix if previous produces number, otherwise modulo operator
      const prev = tokens[tokens.length - 1];
      if (prev && (prev.type === 'number' || prev.type === 'rparen')) {
        tokens.push({ type: 'percent' });
      } else {
        tokens.push({ type: 'op', value: '%' });
      }
      i++;
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      if (ch === '-') {
        const prev = tokens[tokens.length - 1];
        const isUnary =
          !prev ||
          prev.type === 'op' ||
          prev.type === 'lparen' ||
          prev.type === 'comma' ||
          prev.type === 'unary_minus';
        if (isUnary) {
          tokens.push({ type: 'unary_minus' });
          i++;
          continue;
        }
      }
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    throw new Error(`رمز غير مدعوم: ${ch}`);
  }

  // Implicit multiplication
  const expanded: Token[] = [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const curr = tokens[idx];
    const prev = expanded[expanded.length - 1];
    if (prev) {
      const prevProduces =
        prev.type === 'number' ||
        prev.type === 'rparen' ||
        prev.type === 'factorial' ||
        prev.type === 'percent';
      const currConsumes =
        curr.type === 'number' || curr.type === 'lparen' || curr.type === 'ident';
      if (prevProduces && currConsumes) {
        expanded.push({ type: 'op', value: '*' });
      }
    }
    expanded.push(curr);
  }

  return expanded;
}

function precedence(token: Token): number {
  if (token.type === 'op') {
    if (token.value === '+' || token.value === '-') return 1;
    if (token.value === '*' || token.value === '/' || token.value === '%') return 2;
    if (token.value === '^') return 4;
  }
  if (token.type === 'unary_minus') return 3;
  if (token.type === 'factorial' || token.type === 'percent') return 5;
  return 0;
}

function isRightAssociative(token: Token): boolean {
  return (token.type === 'op' && token.value === '^') || token.type === 'unary_minus';
}

function cleanFloatPrecision(n: number): number {
  if (!Number.isFinite(n)) return n;
  if (Math.abs(n) < 1e-13) return 0;
  const rounded = Number(n.toPrecision(12));
  return Math.abs(rounded - Math.round(rounded)) < 1e-12 ? Math.round(rounded) : rounded;
}

export function formatMathResult(val: number): string {
  if (!Number.isFinite(val)) return String(val);
  if (Math.abs(val) >= 1e11 || (val !== 0 && Math.abs(val) < 1e-7)) {
    return val.toExponential(6).replace('e+', '×10^').replace('e', '×10^');
  }
  return String(val);
}

export function evaluateMathExpression(
  rawExpression: string,
  options: { angleUnit: AngleUnit; ans: number; vars?: Partial<CalcVariables> }
):
  | { ok: true; value: number; formatted: string; note?: string }
  | { ok: false; error: string } {
  const trimmed = rawExpression.trim();
  if (!trimmed) return { ok: false, error: 'أدخل عملية حسابية' };

  const fullVars: CalcVariables = {
    ans: options.ans,
    preAns: options.vars?.preAns ?? 0,
    m: options.vars?.m ?? 0,
    a: options.vars?.a ?? 0,
    b: options.vars?.b ?? 0,
    c: options.vars?.c ?? 0,
    d: options.vars?.d ?? 0,
    e: options.vars?.e ?? Math.E,
    f: options.vars?.f ?? 0,
    x: options.vars?.x ?? 0,
    y: options.vars?.y ?? 0,
  };

  // Handle special symbolic commands: d/dx(expr, xVal) and integ(expr, a, b)
  const derivMatch = trimmed.match(/^d\/dx\((.+),([^,)]+)\)$/i);
  if (derivMatch) {
    const body = derivMatch[1];
    const xPointRes = evaluateMathExpression(derivMatch[2], options);
    if (!xPointRes.ok) return xPointRes;
    const x0 = xPointRes.value;
    const h = 1e-3;
    const evalAt = (pt: number) =>
      evaluateMathExpression(body, {
        ...options,
        vars: { ...fullVars, x: pt },
      });
    const f1 = evalAt(x0 + h);
    const f2 = evalAt(x0 - h);
    const f3 = evalAt(x0 + 2 * h);
    const f4 = evalAt(x0 - 2 * h);
    if (!f1.ok) return f1;
    if (!f2.ok) return f2;
    if (!f3.ok) return f3;
    if (!f4.ok) return f4;
    const rawDeriv = (-f3.value + 8 * f1.value - 8 * f2.value + f4.value) / (12 * h);
    const deriv = Number(rawDeriv.toPrecision(9));
    return {
      ok: true,
      value: Math.abs(deriv) < 1e-11 ? 0 : deriv,
      formatted: formatMathResult(Math.abs(deriv) < 1e-11 ? 0 : deriv),
      note: `d/dx عند x = ${x0}`,
    };
  }

  const integMatch = trimmed.match(/^∫\((.+),([^,)]+),([^,)]+)\)$/);
  if (integMatch) {
    const body = integMatch[1];
    const aRes = evaluateMathExpression(integMatch[2], options);
    const bRes = evaluateMathExpression(integMatch[3], options);
    if (!aRes.ok) return aRes;
    if (!bRes.ok) return bRes;
    const aVal = aRes.value;
    const bVal = bRes.value;
    const steps = 60;
    const h = (bVal - aVal) / steps;
    let sum = 0;
    for (let k = 0; k <= steps; k++) {
      const xk = aVal + k * h;
      const fx = evaluateMathExpression(body, {
        ...options,
        vars: { ...fullVars, x: xk },
      });
      if (!fx.ok) return fx;
      const weight = k === 0 || k === steps ? 1 : k % 2 === 1 ? 4 : 2;
      sum += weight * fx.value;
    }
    const integral = cleanFloatPrecision((h / 3) * sum);
    return {
      ok: true,
      value: integral,
      formatted: formatMathResult(integral),
      note: `تكامل من ${aVal} إلى ${bVal}`,
    };
  }

  const normalized = normalizeDisplayExpression(trimmed);
  if (!normalized) return { ok: false, error: 'أدخل عملية حسابية' };

  try {
    const tokens = tokenize(normalized, fullVars);
    if (tokens.length === 0) return { ok: false, error: 'أدخل عملية حسابية' };

    let openParens = 0;
    for (const t of tokens) {
      if (t.type === 'lparen') openParens++;
      if (t.type === 'rparen') openParens--;
    }
    while (openParens > 0) {
      tokens.push({ type: 'rparen' });
      openParens--;
    }

    const output: Token[] = [];
    const stack: Token[] = [];

    for (const token of tokens) {
      if (token.type === 'number') {
        output.push(token);
      } else if (token.type === 'ident') {
        stack.push(token);
      } else if (token.type === 'factorial' || token.type === 'percent') {
        output.push(token);
      } else if (token.type === 'comma') {
        while (stack.length > 0 && stack[stack.length - 1].type !== 'lparen') {
          output.push(stack.pop()!);
        }
      } else if (token.type === 'op' || token.type === 'unary_minus') {
        while (stack.length > 0) {
          const top = stack[stack.length - 1];
          if (
            (top.type === 'op' || top.type === 'unary_minus') &&
            ((isRightAssociative(token) && precedence(token) < precedence(top)) ||
              (!isRightAssociative(token) && precedence(token) <= precedence(top)))
          ) {
            output.push(stack.pop()!);
          } else {
            break;
          }
        }
        stack.push(token);
      } else if (token.type === 'lparen') {
        stack.push(token);
      } else if (token.type === 'rparen') {
        let foundLeft = false;
        while (stack.length > 0) {
          const top = stack.pop()!;
          if (top.type === 'lparen') {
            foundLeft = true;
            break;
          }
          output.push(top);
        }
        if (!foundLeft) throw new Error('أقواس غير متوازنة');
        if (stack.length > 0 && stack[stack.length - 1].type === 'ident') {
          output.push(stack.pop()!);
        }
      }
    }

    while (stack.length > 0) {
      const top = stack.pop()!;
      if (top.type === 'lparen' || top.type === 'rparen') throw new Error('أقواس غير متوازنة');
      output.push(top);
    }

    const evalStack: number[] = [];
    const angleScale =
      options.angleUnit === 'DEG'
        ? Math.PI / 180
        : options.angleUnit === 'GRAD'
        ? Math.PI / 200
        : 1;
    const toRad = (v: number) => v * angleScale;
    const fromRad = (r: number) => r / angleScale;

    let extraNote: string | undefined;

    for (const token of output) {
      if (token.type === 'number') {
        evalStack.push(token.value);
      } else if (token.type === 'unary_minus') {
        if (evalStack.length < 1) throw new Error('صيغة غير مكتملة');
        evalStack.push(-evalStack.pop()!);
      } else if (token.type === 'factorial') {
        if (evalStack.length < 1) throw new Error('صيغة غير مكتملة');
        evalStack.push(factorial(evalStack.pop()!));
      } else if (token.type === 'percent') {
        if (evalStack.length < 1) throw new Error('صيغة غير مكتملة');
        evalStack.push(evalStack.pop()! / 100);
      } else if (token.type === 'op') {
        if (evalStack.length < 2) throw new Error('صيغة غير مكتملة');
        const b = evalStack.pop()!;
        const a = evalStack.pop()!;
        switch (token.value) {
          case '+':
            evalStack.push(a + b);
            break;
          case '-':
            evalStack.push(a - b);
            break;
          case '*':
            evalStack.push(a * b);
            break;
          case '/':
            if (b === 0) throw new Error('القسمة على صفر غير معرفة');
            evalStack.push(a / b);
            break;
          case '%':
            if (b === 0) throw new Error('القسمة على صفر غير معرفة');
            evalStack.push(a % b);
            break;
          case '^':
            evalStack.push(Math.pow(a, b));
            break;
        }
      } else if (token.type === 'ident') {
        if (MULTI_ARG_FUNCTIONS.has(token.value)) {
          if (evalStack.length < 2) throw new Error(`الدالة ${token.value} تتطلب معاملين`);
          const arg2 = evalStack.pop()!;
          const arg1 = evalStack.pop()!;
          let res = 0;
          switch (token.value) {
            case 'logxy':
              if (arg1 <= 0 || arg1 === 1 || arg2 <= 0) throw new Error('خارج مجال اللوغاريتم');
              res = Math.log(arg2) / Math.log(arg1);
              break;
            case 'nroot':
              if (arg1 === 0) throw new Error('رتبة الجذر لا تساوي صفراً');
              res = arg2 < 0 && Math.abs(arg1 % 2) === 1 ? -Math.pow(-arg2, 1 / arg1) : Math.pow(arg2, 1 / arg1);
              break;
            case 'gcd':
              res = gcdNum(arg1, arg2);
              break;
            case 'lcm':
              res = lcmNum(arg1, arg2);
              break;
            case 'npr':
              res = nPr(arg1, arg2);
              break;
            case 'ncr':
              res = nCr(arg1, arg2);
              break;
            case 'randint': {
              const lo = Math.ceil(Math.min(arg1, arg2));
              const hi = Math.floor(Math.max(arg1, arg2));
              res = Math.floor(Math.random() * (hi - lo + 1)) + lo;
              break;
            }
            case 'mod':
              if (arg2 === 0) throw new Error('القسمة على صفر غير معرفة');
              res = ((arg1 % arg2) + arg2) % arg2;
              break;
            case 'pol': {
              const r = Math.hypot(arg1, arg2);
              const theta = cleanFloatPrecision(fromRad(Math.atan2(arg2, arg1)));
              extraNote = `r = ${cleanFloatPrecision(r)}, θ = ${theta}`;
              res = r;
              break;
            }
            case 'rec': {
              const rx = arg1 * Math.cos(toRad(arg2));
              const ry = arg1 * Math.sin(toRad(arg2));
              extraNote = `x = ${cleanFloatPrecision(rx)}, y = ${cleanFloatPrecision(ry)}`;
              res = rx;
              break;
            }
          }
          evalStack.push(res);
        } else {
          if (evalStack.length < 1) throw new Error('ناقص معامل الدالة');
          const arg = evalStack.pop()!;
          let res = 0;
          switch (token.value) {
            case 'sin':
              res = Math.sin(toRad(arg));
              break;
            case 'cos':
              res = Math.cos(toRad(arg));
              break;
            case 'tan': {
              const rad = toRad(arg);
              if (Math.abs(Math.cos(rad)) < 1e-12) throw new Error('Math ERROR');
              res = Math.tan(rad);
              break;
            }
            case 'cot': {
              const rad = toRad(arg);
              if (Math.abs(Math.sin(rad)) < 1e-12) throw new Error('Math ERROR');
              res = 1 / Math.tan(rad);
              break;
            }
            case 'asin':
              if (arg < -1 || arg > 1) throw new Error('خارج المجال [-1, 1]');
              res = fromRad(Math.asin(arg));
              break;
            case 'acos':
              if (arg < -1 || arg > 1) throw new Error('خارج المجال [-1, 1]');
              res = fromRad(Math.acos(arg));
              break;
            case 'atan':
              res = fromRad(Math.atan(arg));
              break;
            case 'acot':
              res = fromRad(Math.PI / 2 - Math.atan(arg));
              break;
            case 'sinh':
              res = Math.sinh(arg);
              break;
            case 'cosh':
              res = Math.cosh(arg);
              break;
            case 'tanh':
              res = Math.tanh(arg);
              break;
            case 'asinh':
              res = Math.asinh(arg);
              break;
            case 'acosh':
              if (arg < 1) throw new Error('خارج المجال [1, ∞)');
              res = Math.acosh(arg);
              break;
            case 'atanh':
              if (arg <= -1 || arg >= 1) throw new Error('خارج المجال (-1, 1)');
              res = Math.atanh(arg);
              break;
            case 'log':
              if (arg <= 0) throw new Error('اللوغاريتم للموجب فقط');
              res = Math.log10(arg);
              break;
            case 'ln':
              if (arg <= 0) throw new Error('اللوغاريتم الطبيعي للموجب فقط');
              res = Math.log(arg);
              break;
            case 'sqrt':
              if (arg < 0) throw new Error('جذر عدد سالب غير حقيقي');
              res = Math.sqrt(arg);
              break;
            case 'cbrt':
              res = Math.cbrt(arg);
              break;
            case 'abs':
              res = Math.abs(arg);
              break;
            case 'exp':
              res = Math.exp(arg);
              break;
            case 'tenpow':
              res = Math.pow(10, arg);
              break;
            case 'ceil':
              res = Math.ceil(arg);
              break;
            case 'floor':
              res = Math.floor(arg);
              break;
          }
          evalStack.push(res);
        }
      }
    }

    if (evalStack.length !== 1) return { ok: false, error: 'تأكد من كتابة العملية بشكل صحيح' };
    const finalVal = cleanFloatPrecision(evalStack[0]);
    if (!Number.isFinite(finalVal)) return { ok: false, error: 'Math ERROR' };

    return {
      ok: true,
      value: finalVal,
      formatted: formatMathResult(finalVal),
      note: extraNote,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Math ERROR' };
  }
}

// Convert decimal to clean simplified fraction string (e.g. 0.75 -> "3 / 4", 1.5 -> "3 / 2")
export function toSimplifiedFraction(value: number, maxDen = 10000): string | null {
  if (!Number.isFinite(value) || Number.isInteger(value)) return null;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  let bestNum = 1;
  let bestDen = 1;
  let bestErr = Math.abs(abs - 1);

  for (let den = 1; den <= maxDen; den++) {
    const num = Math.round(abs * den);
    const err = Math.abs(abs - num / den);
    if (err < bestErr) {
      bestErr = err;
      bestNum = num;
      bestDen = den;
      if (err < 1e-10) break;
    }
  }

  if (bestErr > 1e-7 || bestDen === 1) return null;
  const g = gcdNum(bestNum, bestDen);
  return `${sign * (bestNum / g)} / ${bestDen / g}`;
}

export function toMixedFraction(value: number, maxDen = 10000): string | null {
  const simple = toSimplifiedFraction(value, maxDen);
  if (!simple) return null;
  const parts = simple.split('/').map((s) => Number(s.trim()));
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return simple;
  }
  const [signedNum, den] = parts;
  const sign = signedNum < 0 ? '-' : '';
  const absNum = Math.abs(signedNum);
  if (absNum < den) return simple;
  const whole = Math.floor(absNum / den);
  const rem = absNum % den;
  if (rem === 0) return `${sign}${whole}`;
  return `${sign}${whole} ⌟ ${rem}/${den}`;
}

export function primeFactorizeString(value: number): string | null {
  const n = Math.round(Math.abs(value));
  if (n < 2 || !Number.isFinite(n) || n > 1e12) return null;
  const factors: Array<{ p: number; exp: number }> = [];
  let rem = n;
  for (let d = 2; d * d <= rem; d++) {
    if (rem % d === 0) {
      let exp = 0;
      while (rem % d === 0) {
        rem /= d;
        exp++;
      }
      factors.push({ p: d, exp });
    }
  }
  if (rem > 1) factors.push({ p: rem, exp: 1 });
  return factors.map((f) => (f.exp > 1 ? `${f.p}^${f.exp}` : `${f.p}`)).join(' × ');
}

export function toDMSString(degValue: number): string {
  const sign = degValue < 0 ? '-' : '';
  const abs = Math.abs(degValue);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = Number(((mFloat - m) * 60).toFixed(2));
  return `${sign}${d}° ${m}' ${s}"`;
}

export function toEngineeringNotation(val: number): string {
  if (!Number.isFinite(val) || val === 0) return '0';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  const exp3 = Math.floor(Math.log10(abs) / 3) * 3;
  const mantissa = Number((abs / Math.pow(10, exp3)).toPrecision(6));
  return `${sign}${mantissa}×10^${exp3}`;
}
