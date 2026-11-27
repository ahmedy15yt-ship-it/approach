import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Atom,
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Sliders,
  Sparkles,
  Loader2,
  Bot,
  Send,
  Zap,
  Magnet,
  Droplets,
  Activity,
  FlaskConical,
  Waves,
  CheckCircle2,
  Award,
  PartyPopper,
} from 'lucide-react';
import { Subject } from '../types';
import { playBellChime } from '../utils/voiceAlerts';

type SimulationId =
  | 'ohm_circuit'
  | 'faraday_induction'
  | 'osmotic_cell'
  | 'muscle_sliding'
  | 'le_chatelier'
  | 'rlc_resonance';

interface SimDef {
  id: SimulationId;
  title: string;
  subjectLabel: string;
  chapterLabel: string;
  formula: string;
  icon: React.FC<{ className?: string }>;
}

const SIMULATIONS: SimDef[] = [
  {
    id: 'ohm_circuit',
    title: 'قانون أوم والدائرة المغلقة',
    subjectLabel: 'الفيزياء',
    chapterLabel: 'الفصل الأول — الكهربية',
    formula: 'I = VB / (R + r)  |  V = VB - I·r',
    icon: Zap,
  },
  {
    id: 'faraday_induction',
    title: 'الحث الكهرومغناطيسي (فاراداي ولنز)',
    subjectLabel: 'الفيزياء',
    chapterLabel: 'الفصل الثالث — الحث',
    formula: 'emf = -N · (ΔΦm / Δt)',
    icon: Magnet,
  },
  {
    id: 'osmotic_cell',
    title: 'الدعامة الفسيولوجية والأسموزية',
    subjectLabel: 'الأحياء',
    chapterLabel: 'الفصل الأول — الدعامة',
    formula: 'الانتشار: من تركيز ذائبات أقل ← إلى أعلى',
    icon: Droplets,
  },
  {
    id: 'muscle_sliding',
    title: 'انقباض العضلة الهيكلية (هكسلي)',
    subjectLabel: 'الأحياء',
    chapterLabel: 'الفصل الأول — الحركة',
    formula: 'Ca²⁺ + ATP ← روابط مستعرضة تسحب الأكتين',
    icon: Activity,
  },
  {
    id: 'le_chatelier',
    title: 'قاعدة لوشاتيليه والاتزان الكيميائي',
    subjectLabel: 'الكيمياء',
    chapterLabel: 'الباب الثالث — الاتزان',
    formula: 'N₂ + 3H₂ ⇌ 2NH₃ + Heat (ΔH < 0)',
    icon: FlaskConical,
  },
  {
    id: 'rlc_resonance',
    title: 'دائرة الرنين المترددة (R-L-C)',
    subjectLabel: 'الفيزياء',
    chapterLabel: 'الفصل الرابع — التيار المتردد',
    formula: 'Z = √(R² + (XL - XC)²)  |  f₀ = 1/(2π√LC)',
    icon: Waves,
  },
];

interface UnderstandingLabViewProps {
  curriculum: Subject[];
  accountPhone?: string;
  onAwardBonusXp?: (amount: number) => void;
  onAskTutor?: (subject: string, prompt: string) => void;
}

export const UnderstandingLabView: React.FC<UnderstandingLabViewProps> = ({
  curriculum,
  accountPhone = 'default',
  onAwardBonusXp,
  onAskTutor,
}) => {
  const simsStorageKey = `nahj_lab_completed_sims_${accountPhone}`;
  const lessonsStorageKey = `nahj_lab_completed_lessons_${accountPhone}`;

  const [activeSim, setActiveSim] = useState<SimulationId>('ohm_circuit');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTick, setSimTick] = useState<number>(0);

  const [completedSims, setCompletedSims] = useState<SimulationId[]>(() => {
    try {
      const raw = localStorage.getItem(simsStorageKey);
      return raw ? (JSON.parse(raw) as SimulationId[]) : [];
    } catch {
      return [];
    }
  });

  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(lessonsStorageKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [celebrationBanner, setCelebrationBanner] = useState<{
    id: number;
    title: string;
    subtitle: string;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(simsStorageKey, JSON.stringify(completedSims));
    } catch {
      // ignore storage quota errors
    }
  }, [completedSims, simsStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(lessonsStorageKey, JSON.stringify(completedLessons));
    } catch {
      // ignore storage quota errors
    }
  }, [completedLessons, lessonsStorageKey]);

  const fireLabCelebration = (title: string, subtitle: string) => {
    playBellChime();
    setCelebrationBanner({ id: Date.now(), title, subtitle });
    try {
      const palette = ['#D4AF37', '#34D399', '#38BDF8', '#F59E0B', '#A855F7', '#FB7185'];
      confetti({
        particleCount: 85,
        spread: 80,
        origin: { y: 0.62 },
        colors: palette,
      });
      setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 60,
          spread: 55,
          origin: { x: 0.14, y: 0.68 },
          colors: palette,
        });
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 55,
          origin: { x: 0.86, y: 0.68 },
          colors: palette,
        });
      }, 200);
    } catch {
      // ignore confetti fallback
    }
  };

  const handleMarkSimUnderstood = () => {
    const alreadyDone = completedSims.includes(activeSim);
    if (!alreadyDone) {
      setCompletedSims((prev) => [...prev, activeSim]);
      if (onAwardBonusXp) onAwardBonusXp(20);
      fireLabCelebration(
        `أتممت فهم تجربة «${activeSimObj.title}» 🎉`,
        'تم تسجيل التجربة في إنجازات الفهم العميق وإضافة +20 XP إلى رصيدك!'
      );
    } else {
      fireLabCelebration(
        `مراجعة متقنة لتجربة «${activeSimObj.title}» ✨`,
        'تم استرجاع المفاهيم العملية بنجاح — استمر في التفوق!'
      );
    }
  };

  const handleMarkLessonUnderstood = () => {
    if (!conceptLessonTitle) return;
    const alreadyDone = completedLessons.includes(conceptLessonTitle);
    if (!alreadyDone) {
      setCompletedLessons((prev) => [...prev, conceptLessonTitle]);
      if (onAwardBonusXp) onAwardBonusXp(15);
      fireLabCelebration(
        `أتممت فهم درس «${conceptLessonTitle}» 🎉`,
        'تم توثيق استيعابك للدرس بالسبب والنتيجة وإضافة +15 XP!'
      );
    } else {
      fireLabCelebration(
        `مراجعة ناجحة لدرس «${conceptLessonTitle}» ✨`,
        'أنت متقن لهذا الدرس بالفعل — بارك الله في مجهودك!'
      );
    }
  };

  // Ohm parameters
  const [vb, setVb] = useState<number>(12);
  const [extR, setExtR] = useState<number>(6);
  const [intR, setIntR] = useState<number>(2);

  // Faraday parameters
  const [magnetFreq, setMagnetFreq] = useState<number>(1.4);
  const [coilTurns, setCoilTurns] = useState<number>(200);
  const [manualMagnetX, setManualMagnetX] = useState<number>(0); // -1 to 1 when paused

  // Osmosis parameters
  const [solutePct, setSolutePct] = useState<number>(20); // outer solute concentration %
  const [waterSupply, setWaterSupply] = useState<number>(80);

  // Muscle parameters
  const [calciumLevel, setCalciumLevel] = useState<number>(75);
  const [atpAvailable, setAtpAvailable] = useState<boolean>(true);

  // Le Chatelier parameters
  const [pressureAtm, setPressureAtm] = useState<number>(3); // 1 to 6
  const [tempCelsius, setTempCelsius] = useState<number>(250); // 100 to 600
  const [extraNitrogen, setExtraNitrogen] = useState<number>(0);

  // RLC parameters
  const [acFreq, setAcFreq] = useState<number>(50); // resonant around 50 Hz
  const [rlcRes, setRlcRes] = useState<number>(20);

  // Quick lesson interactive concept breakdown
  const [conceptSubjectId, setConceptSubjectId] = useState<string>(curriculum[0]?.id || 'biology');
  const [conceptLessonTitle, setConceptLessonTitle] = useState<string>(
    curriculum[0]?.chapters[0]?.lessons[0]?.title || ''
  );
  const [aiBreakdown, setAiBreakdown] = useState<string | null>(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<number>(0);
  const activeSimObj = SIMULATIONS.find((s) => s.id === activeSim) || SIMULATIONS[0];

  const selectedSubject = curriculum.find((s) => s.id === conceptSubjectId) || curriculum[0];
  const allSubjectLessons =
    selectedSubject?.chapters.flatMap((c) => c.lessons.map((l) => l.title)) || [];

  // Computed quantitative readouts
  const ohmI = vb / Math.max(0.5, extR + intR);
  const ohmTerminalV = vb - ohmI * intR;
  const ohmPower = ohmI * ohmI * extR;

  const cellSoluteInternal = 45;
  const osmosisNetFlow = Math.round((cellSoluteInternal - solutePct) * (waterSupply / 100) * 1.6);
  const cellTurgor = Math.max(12, Math.min(98, Math.round(58 + osmosisNetFlow * 0.85)));

  const effectiveContraction = atpAvailable ? Math.min(100, calciumLevel) : 0;
  const hZonePercent = Math.max(8, Math.round(100 - effectiveContraction * 0.85));

  // Le Chatelier ammonia shift % (higher pressure favors fewer moles 4 -> 2; lower temp favors exothermic forward)
  const nh3Yield = Math.max(
    12,
    Math.min(
      94,
      Math.round(35 + pressureAtm * 8 - (tempCelsius - 200) * 0.09 + extraNitrogen * 6)
    )
  );

  // RLC calculations: tune L and C so f0 = 50 Hz -> XL = XC at 50 Hz
  const xl = Number((acFreq * 1.2).toFixed(1));
  const xc = Number((3000 / Math.max(10, acFreq)).toFixed(1));
  const rlcZ = Number(Math.sqrt(rlcRes * rlcRes + Math.pow(xl - xc, 2)).toFixed(1));
  const rlcI = Number((220 / Math.max(1, rlcZ)).toFixed(2));
  const isNearResonance = Math.abs(xl - xc) <= 12;

  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const drawFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      if (isPlaying) {
        timeRef.current += dt;
      }
      const t = timeRef.current + simTick * 0.25;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const rect = canvas.getBoundingClientRect();
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const w = Math.max(320, Math.floor(rect.width));
          const h = Math.max(260, Math.floor(rect.height));
          if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
          }
          ctx.save();
          ctx.scale(dpr, dpr);

          // Dark luxury slate laboratory surface
          ctx.fillStyle = '#0B0B0F';
          ctx.fillRect(0, 0, w, h);

          // Subtle measurement grid
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.07)';
          ctx.lineWidth = 1;
          for (let gx = 0; gx < w; gx += 32) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, h);
            ctx.stroke();
          }
          for (let gy = 0; gy < h; gy += 32) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
          }

          if (activeSim === 'ohm_circuit') {
            const padX = w * 0.16;
            const padY = h * 0.2;
            const boxW = w - padX * 2;
            const boxH = h - padY * 2;

            // Circuit wire loop
            ctx.strokeStyle = '#64748B';
            ctx.lineWidth = 5;
            ctx.strokeRect(padX, padY, boxW, boxH);

            // Moving electrons along perimeter
            const perimeter = 2 * (boxW + boxH);
            const electronCount = 16;
            const speedPx = 25 + ohmI * 55;
            for (let i = 0; i < electronCount; i++) {
              const dist = ((t * speedPx + (i * perimeter) / electronCount) % perimeter + perimeter) % perimeter;
              let ex = padX;
              let ey = padY;
              if (dist < boxW) {
                ex = padX + dist;
                ey = padY;
              } else if (dist < boxW + boxH) {
                ex = padX + boxW;
                ey = padY + (dist - boxW);
              } else if (dist < 2 * boxW + boxH) {
                ex = padX + boxW - (dist - (boxW + boxH));
                ey = padY + boxH;
              } else {
                ex = padX;
                ey = padY + boxH - (dist - (2 * boxW + boxH));
              }
              ctx.beginPath();
              ctx.arc(ex, ey, 4.2, 0, Math.PI * 2);
              ctx.fillStyle = '#38BDF8';
              ctx.fill();
              ctx.strokeStyle = '#E0F2FE';
              ctx.lineWidth = 1;
              ctx.stroke();
            }

            // Battery on left wire
            const batX = padX;
            const batY = padY + boxH * 0.5;
            ctx.fillStyle = '#0B0B0F';
            ctx.fillRect(batX - 24, batY - 26, 48, 52);
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(batX - 18, batY - 10);
            ctx.lineTo(batX + 18, batY - 10);
            ctx.stroke();
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(batX - 10, batY + 10);
            ctx.lineTo(batX + 10, batY + 10);
            ctx.stroke();
            ctx.fillStyle = '#F3DFA2';
            ctx.font = 'bold 12px Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`VB = ${vb}V`, batX - 46, batY + 4);
            ctx.fillStyle = '#94A3B8';
            ctx.fillText(`r = ${intR}Ω`, batX - 46, batY + 20);

            // Resistor zig-zag on bottom
            const resX = padX + boxW * 0.5;
            const resY = padY + boxH;
            ctx.fillStyle = '#0B0B0F';
            ctx.fillRect(resX - 44, resY - 14, 88, 28);
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(resX - 40, resY);
            for (let k = 0; k < 6; k++) {
              ctx.lineTo(resX - 32 + k * 13, k % 2 === 0 ? resY - 10 : resY + 10);
            }
            ctx.lineTo(resX + 40, resY);
            ctx.stroke();
            ctx.fillStyle = '#FBBF24';
            ctx.fillText(`R = ${extR}Ω`, resX, resY + 26);

            // Glowing bulb on top wire
            const bulbX = padX + boxW * 0.5;
            const bulbY = padY;
            const glowRadius = Math.min(54, 14 + ohmPower * 1.4);
            const grad = ctx.createRadialGradient(bulbX, bulbY, 4, bulbX, bulbY, glowRadius);
            grad.addColorStop(0, 'rgba(253, 224, 71, 0.95)');
            grad.addColorStop(0.5, 'rgba(212, 175, 55, 0.45)');
            grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(bulbX, bulbY, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(bulbX, bulbY, 16, 0, Math.PI * 2);
            ctx.fillStyle = ohmI > 0.2 ? '#FEF08A' : '#334155';
            ctx.fill();
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Center Ammeter & Voltmeter badges
            ctx.fillStyle = '#18181F';
            ctx.strokeStyle = 'rgba(212,175,55,0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(w * 0.5 - 95, h * 0.5 - 26, 190, 52, 12);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#E8CE88';
            ctx.font = 'bold 14px Cairo, sans-serif';
            ctx.fillText(`I = ${ohmI.toFixed(2)} A   |   V = ${ohmTerminalV.toFixed(1)} V`, w * 0.5, h * 0.5 + 5);
          } else if (activeSim === 'faraday_induction') {
            const centerY = h * 0.52;
            const coilX = w * 0.62;
            const magNorm = isPlaying ? Math.sin(t * magnetFreq * 2.2) : manualMagnetX;
            const velocityNorm = isPlaying ? Math.cos(t * magnetFreq * 2.2) * magnetFreq : 0;
            const magX = w * 0.3 + magNorm * (w * 0.16);

            // Magnetic flux lines
            for (let ly = -34; ly <= 34; ly += 17) {
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(magX + 42, centerY + ly);
              ctx.quadraticCurveTo(coilX - 20, centerY + ly * 1.45, coilX + 80, centerY + ly * 0.6);
              ctx.stroke();
            }

            // Solenoid Coil
            for (let i = 0; i < 8; i++) {
              const cx = coilX - 48 + i * 14;
              ctx.strokeStyle = '#D4AF37';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.ellipse(cx, centerY, 9, 44, 0, 0, Math.PI * 2);
              ctx.stroke();
            }

            // Bar magnet
            ctx.fillStyle = '#DC2626';
            ctx.fillRect(magX - 42, centerY - 18, 42, 36);
            ctx.fillStyle = '#2563EB';
            ctx.fillRect(magX, centerY - 18, 42, 36);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 13px Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('S', magX - 21, centerY + 5);
            ctx.fillText('N', magX + 21, centerY + 5);

            // Galvanometer gauge on top right
            const gx = w * 0.84;
            const gy = h * 0.25;
            ctx.beginPath();
            ctx.arc(gx, gy, 34, 0, Math.PI * 2);
            ctx.fillStyle = '#16161C';
            ctx.fill();
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 2;
            ctx.stroke();
            const needleAngle = -Math.PI / 2 + Math.max(-1.1, Math.min(1.1, velocityNorm * (coilTurns / 220)));
            ctx.strokeStyle = Math.abs(velocityNorm) > 0.2 ? '#34D399' : '#94A3B8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + Math.cos(needleAngle) * 26, gy + Math.sin(needleAngle) * 26);
            ctx.stroke();
            ctx.fillStyle = '#F3DFA2';
            ctx.font = 'bold 11px Cairo, sans-serif';
            ctx.fillText('جلفانومتر G', gx, gy + 50);

            const emfEst = (velocityNorm * coilTurns * 0.04).toFixed(1);
            ctx.fillStyle = '#E8CE88';
            ctx.font = 'bold 13px Cairo, sans-serif';
            ctx.fillText(
              `emf المستحثة ≈ ${emfEst} V  (${Number(emfEst) >= 0 ? 'تقاوم الاقتراب' : 'تقاوم الابتعاد'})`,
              w * 0.45,
              h * 0.16
            );
          } else if (activeSim === 'osmotic_cell') {
            const cx = w * 0.5;
            const cy = h * 0.52;
            const vacScale = 0.42 + (cellTurgor / 100) * 0.55;

            // Outer cell wall
            ctx.strokeStyle = '#22C55E';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.roundRect(cx - 115, cy - 82, 230, 164, 34);
            ctx.stroke();

            // Plasma membrane shrinks inward if plasmolysis occurs
            const shrink = Math.max(0, (52 - cellTurgor) * 0.55);
            ctx.fillStyle = 'rgba(22, 101, 52, 0.35)';
            ctx.strokeStyle = '#86EFAC';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(cx - 107 + shrink, cy - 74 + shrink * 0.7, 214 - shrink * 2, 148 - shrink * 1.4, 28);
            ctx.fill();
            ctx.stroke();

            // Central Sap Vacuole (Blue expanding/contracting water sac)
            const vw = 128 * vacScale;
            const vh = 88 * vacScale;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.48)';
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, vw / 2, vh / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Moving H2O particles crossing the membrane in net osmotic direction
            const movingInward = osmosisNetFlow >= 0;
            for (let i = 0; i < 14; i++) {
              const angle = (i / 14) * Math.PI * 2;
              const phase = ((t * 0.75 + i * 0.19) % 1);
              const r = movingInward ? 155 - phase * 115 : 40 + phase * 115;
              const px = cx + Math.cos(angle) * r;
              const py = cy + Math.sin(angle) * (r * 0.68);
              ctx.beginPath();
              ctx.arc(px, py, 3.8, 0, Math.PI * 2);
              ctx.fillStyle = '#38BDF8';
              ctx.fill();
            }

            ctx.fillStyle = '#F8FAFC';
            ctx.font = 'bold 12px Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`الفجوة العصارية (${cellTurgor}% امتلاء)`, cx, cy + 4);
            ctx.fillStyle = movingInward ? '#34D399' : '#FBBF24';
            ctx.fillText(
              movingInward
                ? 'دخول الماء بالخاصية الأسموزية ← تزداد الدعامة الفسيولوجية'
                : 'خروج الماء إلى الوسط الأعلى تركيزاً ← تنكمش الخلية',
              cx,
              h * 0.13
            );
          } else if (activeSim === 'muscle_sliding') {
            const cy = h * 0.54;
            const pull = (effectiveContraction / 100) * 44;
            const zLeft = w * 0.18 + pull;
            const zRight = w * 0.82 - pull;

            // Z-lines
            ctx.strokeStyle = '#F3DFA2';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(zLeft, cy - 68);
            ctx.lineTo(zLeft, cy + 68);
            ctx.moveTo(zRight, cy - 68);
            ctx.lineTo(zRight, cy + 68);
            ctx.stroke();

            // Thin Actin filaments attached to Z-lines
            const actinLen = Math.max(55, (w * 0.64) * 0.36);
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 4;
            for (const row of [-42, 0, 42]) {
              ctx.beginPath();
              ctx.moveTo(zLeft, cy + row);
              ctx.lineTo(zLeft + actinLen, cy + row);
              ctx.moveTo(zRight, cy + row);
              ctx.lineTo(zRight - actinLen, cy + row);
              ctx.stroke();
            }

            // Thick Myosin filaments in center (A-band remains constant)
            const myoHalf = w * 0.16;
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 8;
            for (const row of [-21, 21]) {
              ctx.beginPath();
              ctx.moveTo(w * 0.5 - myoHalf, cy + row);
              ctx.lineTo(w * 0.5 + myoHalf, cy + row);
              ctx.stroke();

              // Animated cross-bridge heads cycling when Ca2+ & ATP exist
              if (effectiveContraction > 5) {
                const cycle = Math.sin(t * 7);
                for (let k = -3; k <= 3; k++) {
                  if (k === 0) continue;
                  const hx = w * 0.5 + k * 20;
                  ctx.strokeStyle = '#FDE047';
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(hx, cy + row);
                  ctx.lineTo(hx - cycle * 6, cy + row + (row < 0 ? -13 : 13));
                  ctx.stroke();
                }
              }
            }

            // Annotations
            ctx.fillStyle = '#E8CE88';
            ctx.font = 'bold 12px Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`خط Z`, zLeft, cy - 78);
            ctx.fillText(`خط Z`, zRight, cy - 78);
            ctx.fillStyle = '#FBBF24';
            ctx.fillText(`المنطقة الداكنة A (ثابتة الطول)`, w * 0.5, cy + 88);
            ctx.fillStyle = '#38BDF8';
            ctx.fillText(
              effectiveContraction > 10
                ? `انقباض بنسبة ${effectiveContraction}% — تقلص منطقة H بنسبة ${100 - hZonePercent}%`
                : 'العضلة في حالة انبساط — أضف أيونات Ca²⁺ مع توفر ATP للانقباض',
              w * 0.5,
              h * 0.13
            );
          } else if (activeSim === 'le_chatelier') {
            const pistonY = Math.round(48 + (6 - pressureAtm) * 10);
            const chamberLeft = w * 0.18;
            const chamberW = w * 0.64;
            const chamberBottom = h * 0.85;

            // Reaction Vessel
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 3;
            ctx.strokeRect(chamberLeft, 44, chamberW, chamberBottom - 44);

            // Movable Piston
            ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
            ctx.fillRect(chamberLeft, pistonY, chamberW, 14);
            ctx.fillStyle = '#F3DFA2';
            ctx.font = 'bold 11px Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`مكبس الضغط = ${pressureAtm} atm`, w * 0.5, pistonY - 6);

            // Molecules bouncing inside space below piston
            const speedScale = 0.6 + tempCelsius / 250;
            const totalDots = 18;
            const nh3Count = Math.round((nh3Yield / 100) * totalDots);
            const topBound = pistonY + 22;
            const usableH = Math.max(45, chamberBottom - topBound - 10);

            for (let i = 0; i < totalDots; i++) {
              const px =
                chamberLeft +
                16 +
                ((Math.sin(t * speedScale * (1 + (i % 3) * 0.3) + i * 1.7) * 0.5 + 0.5) * (chamberW - 32));
              const py =
                topBound +
                ((Math.cos(t * speedScale * (1.1 + (i % 4) * 0.2) + i * 2.3) * 0.5 + 0.5) * usableH);
              ctx.beginPath();
              ctx.arc(px, py, i < nh3Count ? 6 : 4.5, 0, Math.PI * 2);
              ctx.fillStyle = i < nh3Count ? '#34D399' : '#60A5FA';
              ctx.fill();
            }

            ctx.fillStyle = '#34D399';
            ctx.font = 'bold 12px Cairo, sans-serif';
            ctx.fillText(`نسبة إنتاج النشادر NH₃: ${nh3Yield}%`, w * 0.5, h * 0.94);
          } else if (activeSim === 'rlc_resonance') {
            // Dual AC oscilloscope waves
            const midY = h * 0.55;
            const amp = Math.min(72, 22 + rlcI * 6.5);
            const phaseDiff = ((xl - xc) / 100) * 1.2;

            // Zero line
            ctx.strokeStyle = 'rgba(148,163,184,0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(24, midY);
            ctx.lineTo(w - 24, midY);
            ctx.stroke();

            // Voltage Wave (Gold)
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let x = 24; x <= w - 24; x += 4) {
              const y = midY + Math.sin(((x - 24) / w) * Math.PI * 4 - t * (acFreq / 18)) * 56;
              if (x === 24) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Current Wave (Cyan / Emerald at resonance)
            ctx.strokeStyle = isNearResonance ? '#34D399' : '#38BDF8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let x = 24; x <= w - 24; x += 4) {
              const y = midY + Math.sin(((x - 24) / w) * Math.PI * 4 - t * (acFreq / 18) + phaseDiff) * amp;
              if (x === 24) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();

            ctx.fillStyle = isNearResonance ? '#34D399' : '#E8CE88';
            ctx.font = 'bold 13px Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
              isNearResonance
                ? `✨ حالة الرنين (XL ≈ XC) — التيار في نهايته العظمى I = ${rlcI} A`
                : `فرق الطور موجود — المعاوقة الكلية Z = ${rlcZ} Ω`,
              w * 0.5,
              h * 0.14
            );
          }

          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [
    activeSim,
    isPlaying,
    simTick,
    vb,
    extR,
    intR,
    magnetFreq,
    coilTurns,
    manualMagnetX,
    solutePct,
    waterSupply,
    calciumLevel,
    atpAvailable,
    pressureAtm,
    tempCelsius,
    extraNitrogen,
    acFreq,
    rlcRes,
    ohmI,
    ohmTerminalV,
    ohmPower,
    osmosisNetFlow,
    cellTurgor,
    effectiveContraction,
    hZonePercent,
    nh3Yield,
    xl,
    xc,
    rlcZ,
    rlcI,
    isNearResonance,
  ]);

  const handleFetchAiBreakdown = async () => {
    if (!conceptLessonTitle || isLoadingBreakdown) return;
    setIsLoadingBreakdown(true);
    setAiBreakdown(null);
    try {
      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject?.name || 'الأحياء',
          message: `اشرح لي درس «${conceptLessonTitle}» بطريقة الفهم بالتجربة والتشبيه الحركي (لماذا يحدث كل تغير؟ وما الذي يتأثر لو تغير عامل واحد؟) لكي أفهمه بدون حفظ.`,
          tutorMode: 'explain',
          deepMode: 'deep',
        }),
      });
      const data = await res.json();
      setAiBreakdown(data.reply || 'تعذر التحميل حالياً.');
      if (onAwardBonusXp) onAwardBonusXp(15);
    } catch {
      setAiBreakdown('تعذر الاتصال بالخادم، حاول مرة أخرى.');
    } finally {
      setIsLoadingBreakdown(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-[#19191F] border border-amber-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2.5">
              <Atom className="w-6 h-6 text-[#B58722] dark:text-[#D4AF37]" />
              <span>الفهم والتجارب الحية</span>
            </h1>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-[11px] font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
              أُتقِنت {completedSims.length} / {SIMULATIONS.length} تجارب
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#B5AA92]">
            افهم بالتجربة — حرّك المتغيرات وشاهد سلوك التجربة والقوانين يتغير أمامك لحظياً بدون حفظ أعمى.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="px-4 py-2 btn-luxury-gold rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'إيقاف مؤقت' : 'تشغيل الحركة'}</span>
          </button>
          <button
            type="button"
            onClick={() => setSimTick((s) => s + 1)}
            className="px-3 py-2 bg-zinc-100 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-xl text-xs font-bold text-zinc-800 dark:text-[#E8CE88] flex items-center gap-1.5 cursor-pointer"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>خطوة</span>
          </button>
          <button
            type="button"
            onClick={() => {
              timeRef.current = 0;
              setSimTick(0);
              setIsPlaying(true);
            }}
            className="px-3 py-2 bg-zinc-100 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-xl text-xs font-bold text-zinc-800 dark:text-[#E8CE88] flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط</span>
          </button>
        </div>
      </div>

      {/* Animated Achievement Celebration Banner */}
      {celebrationBanner && (
        <div
          key={celebrationBanner.id}
          className="bg-linear-to-l from-emerald-500/15 via-amber-500/10 to-transparent border-2 border-[#D4AF37]/55 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in duration-300"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-[#0D0D10] border border-[#D4AF37] flex items-center justify-center shrink-0 animate-celebrate-pop">
              <span className="absolute inset-0 rounded-2xl border border-[#D4AF37]/60 animate-celebrate-ring" />
              <Award className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-zinc-950 dark:text-[#F3DFA2]">
                {celebrationBanner.title}
              </h3>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {celebrationBanner.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCelebrationBanner(null)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900/5 dark:bg-white/5 text-xs font-bold text-zinc-600 dark:text-[#B5AA92] hover:text-zinc-950 dark:hover:text-white cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Simulation Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {SIMULATIONS.map((sim) => {
          const Icon = sim.icon;
          const active = sim.id === activeSim;
          const isDone = completedSims.includes(sim.id);
          return (
            <button
              key={sim.id}
              type="button"
              onClick={() => setActiveSim(sim.id)}
              className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col gap-1.5 relative ${
                active
                  ? 'btn-luxury-gold text-[#09090B] border-transparent font-black'
                  : isDone
                  ? 'bg-emerald-500/8 border-emerald-500/40 text-zinc-900 dark:text-[#F4EFE6] hover:border-[#D4AF37]'
                  : 'bg-white dark:bg-[#19191F] border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-800 dark:text-[#F4EFE6] hover:border-[#D4AF37]'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex items-center gap-1">
                  {isDone && (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        active ? 'text-[#09090B]' : 'text-emerald-500'
                      }`}
                    />
                  )}
                  <span className="text-[10px] opacity-80 font-bold">{sim.subjectLabel}</span>
                </div>
              </div>
              <span className="text-xs font-extrabold leading-snug">{sim.title}</span>
            </button>
          );
        })}
      </div>

      {/* Two-Zone Sandbox Layout (~68% Visual Stage, ~32% Live Parameters & Concept Insight) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Visual Stage */}
        <div className="lg:col-span-8 bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-black text-zinc-900 dark:text-[#F3DFA2]">
              {activeSimObj.title} · <span className="text-zinc-500 dark:text-[#B5AA92]">{activeSimObj.chapterLabel}</span>
            </span>
            <span dir="ltr" className="font-mono text-[11px] text-[#9A7218] dark:text-[#E8CE88] font-bold">
              {activeSimObj.formula}
            </span>
          </div>

          <div className="w-full h-[320px] sm:h-[360px] rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-[#0B0B0F]">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>

          {/* Live Readout Strip */}
          <div className="grid grid-cols-3 gap-2.5 text-center tabular-nums">
            {activeSim === 'ohm_circuit' && (
              <>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">شدة التيار I</span>
                  <strong className="text-sm font-black text-[#9A7218] dark:text-[#F3DFA2]">{ohmI.toFixed(2)} A</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">فرق الجهد الخارجي V</span>
                  <strong className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6]">{ohmTerminalV.toFixed(2)} V</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">القدرة المستهلكة</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{ohmPower.toFixed(1)} W</strong>
                </div>
              </>
            )}

            {activeSim === 'faraday_induction' && (
              <>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">عدد اللفات N</span>
                  <strong className="text-sm font-black text-[#9A7218] dark:text-[#F3DFA2]">{coilTurns} لفة</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">سرعة القطع للفيض</span>
                  <strong className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6]">{magnetFreq.toFixed(1)}×</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">قاعدة لنز</span>
                  <strong className="text-xs font-black text-emerald-600 dark:text-emerald-400">تعاكس التغير المسبب</strong>
                </div>
              </>
            )}

            {activeSim === 'osmotic_cell' && (
              <>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">تركيز الفجوة</span>
                  <strong className="text-sm font-black text-[#9A7218] dark:text-[#F3DFA2]">{cellSoluteInternal}%</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">تركيز المحلول المحيط</span>
                  <strong className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6]">{solutePct}%</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">امتلاء الدعامة</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{cellTurgor}%</strong>
                </div>
              </>
            )}

            {activeSim === 'muscle_sliding' && (
              <>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">نسبة الانقباض</span>
                  <strong className="text-sm font-black text-[#9A7218] dark:text-[#F3DFA2]">{effectiveContraction}%</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">اتساع المنطقة H</span>
                  <strong className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6]">{hZonePercent}%</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">المنطقة A</span>
                  <strong className="text-xs font-black text-emerald-600 dark:text-emerald-400">ثابتة لا تتغير</strong>
                </div>
              </>
            )}

            {activeSim === 'le_chatelier' && (
              <>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">الضغط المطبق</span>
                  <strong className="text-sm font-black text-[#9A7218] dark:text-[#F3DFA2]">{pressureAtm} atm</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">الحرارة</span>
                  <strong className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6]">{tempCelsius} °C</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">ناتج النشادر NH₃</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{nh3Yield}%</strong>
                </div>
              </>
            )}

            {activeSim === 'rlc_resonance' && (
              <>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">XL vs XC</span>
                  <strong className="text-sm font-black text-[#9A7218] dark:text-[#F3DFA2]">{xl} / {xc} Ω</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">المعاوقة Z</span>
                  <strong className="text-sm font-black text-zinc-950 dark:text-[#F4EFE6]">{rlcZ} Ω</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-[#0D0D10] p-2.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
                  <span className="text-[10px] text-zinc-500 dark:text-[#B5AA92] block">التيار الفعال I</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{rlcI} A</strong>
                </div>
              </>
            )}
          </div>

          {/* Complete Experiment Celebration Bar */}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2.5 border-t border-zinc-200/70 dark:border-[#D4AF37]/20">
            <span className="text-xs font-bold text-zinc-600 dark:text-[#B5AA92] flex items-center gap-1.5">
              {completedSims.includes(activeSim) ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-celebrate-pop shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-black">
                    أتممت فهم هذه التجربة بنجاح!
                  </span>
                </>
              ) : (
                <span>جرّب تغيير المتغيرات أعلاه ثم سجّل فهمك للتجربة:</span>
              )}
            </span>

            <button
              type="button"
              onClick={handleMarkSimUnderstood}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                completedSims.includes(activeSim)
                  ? 'bg-emerald-500/15 border border-emerald-500/45 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                  : 'btn-luxury-gold'
              }`}
            >
              <PartyPopper className="w-4 h-4 shrink-0" />
              <span>
                {completedSims.includes(activeSim)
                  ? 'احتفل بفهم التجربة مجدداً 🎉'
                  : 'أتممت فهم هذه التجربة ✔ (+20 XP)'}
              </span>
            </button>
          </div>
        </div>

        {/* Control Dock */}
        <div className="lg:col-span-4 bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 space-y-4">
          <h3 className="font-black text-sm text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#B58722] dark:text-[#D4AF37]" />
            <span>لوحة التحكم والمتغيرات</span>
          </h3>

          {activeSim === 'ohm_circuit' && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>القوة الدافعة للبطارية (VB)</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{vb} V</span>
                </div>
                <input type="range" min={2} max={24} step={1} value={vb} onChange={(e) => setVb(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>المقاومة الخارجية (R)</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{extR} Ω</span>
                </div>
                <input type="range" min={1} max={20} step={1} value={extR} onChange={(e) => setExtR(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>المقاومة الداخلية (r)</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{intR} Ω</span>
                </div>
                <input type="range" min={0} max={8} step={0.5} value={intR} onChange={(e) => setIntR(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-[#0D0D10] border border-amber-200 dark:border-[#D4AF37]/25 leading-relaxed">
                <strong>الاستنتاج اللحظي:</strong> كلما زادت <span dir="ltr">R</span> يقل التيار الكلي <span dir="ltr">I</span> وبالتالي يقل الهبوط الداخلي <span dir="ltr">I·r</span>، فتزداد قراءة الفولتميتر على البطارية <span dir="ltr">V = VB - Ir</span>!
              </div>
            </div>
          )}

          {activeSim === 'faraday_induction' && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>عدد لفات الملف (N)</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{coilTurns} لفة</span>
                </div>
                <input type="range" min={50} max={500} step={25} value={coilTurns} onChange={(e) => setCoilTurns(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>سرعة حركة المغناطيس</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{magnetFreq.toFixed(1)}×</span>
                </div>
                <input type="range" min={0.4} max={3.0} step={0.2} value={magnetFreq} onChange={(e) => setMagnetFreq(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              {!isPlaying && (
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span>تحريك المغناطيس يدوياً</span>
                    <span className="tabular-nums">{manualMagnetX.toFixed(1)}</span>
                  </div>
                  <input type="range" min={-1} max={1} step={0.1} value={manualMagnetX} onChange={(e) => setManualMagnetX(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
                </div>
              )}
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-[#0D0D10] border border-amber-200 dark:border-[#D4AF37]/25 leading-relaxed">
                <strong>لاحظ الجلفانومتر:</strong> يتوقف المؤشر عند السكون حتى لو كان المغناطيس داخل الملف، لأن الحث يشترط وجود <strong>تغير في الفيض ΔΦm</strong> وليس مجرد وجود فيض ثابت.
              </div>
            </div>
          )}

          {activeSim === 'osmotic_cell' && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>تركيز المحلول المحيط بالخلية</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{solutePct}%</span>
                </div>
                <input type="range" min={5} max={85} step={5} value={solutePct} onChange={(e) => setSolutePct(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>وفرة الماء المتاح</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{waterSupply}%</span>
                </div>
                <input type="range" min={20} max={100} step={10} value={waterSupply} onChange={(e) => setWaterSupply(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-[#0D0D10] border border-amber-200 dark:border-[#D4AF37]/25 leading-relaxed">
                <strong>القاعدة الحيوية:</strong> الخلية تركيز عصيرها {cellSoluteInternal}%. إذا وضعتها في محلول أقل تركيزاً يدخل الماء فتتوتر وتكتسب دعامة فسيولوجية؛ وإذا زاد التركيز الخارجي عنها تنكمش!
              </div>
            </div>
          )}

          {activeSim === 'muscle_sliding' && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>تركيز أيونات الكالسيوم Ca²⁺</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{calciumLevel}%</span>
                </div>
                <input type="range" min={0} max={100} step={5} value={calciumLevel} onChange={(e) => setCalciumLevel(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              <button
                type="button"
                onClick={() => setAtpAvailable((v) => !v)}
                className={`w-full py-2.5 px-3 rounded-xl font-black border transition-all cursor-pointer ${
                  atpAvailable
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                }`}
              >
                {atpAvailable ? 'جزيئات الطاقة ATP متوفرة ✔ (اضغط لقطعها)' : '⚠️ نفاد الطاقة ATP — إجهاد/شد عضلي!'}
              </button>
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-[#0D0D10] border border-amber-200 dark:border-[#D4AF37]/25 leading-relaxed">
                <strong>سر الامتحان:</strong> غياب <span dir="ltr">Ca²⁺</span> يمنع تكوين الروابط المستعرضة أصلاً، أما غياب <span dir="ltr">ATP</span> فيمنع انفصالها فيحدث الشد العضلي!
              </div>
            </div>
          )}

          {activeSim === 'le_chatelier' && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>الضغط الكلي على المكبس</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{pressureAtm} atm</span>
                </div>
                <input type="range" min={1} max={6} step={0.5} value={pressureAtm} onChange={(e) => setPressureAtm(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>درجة الحرارة</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{tempCelsius} °C</span>
                </div>
                <input type="range" min={150} max={550} step={25} value={tempCelsius} onChange={(e) => setTempCelsius(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              <button
                type="button"
                onClick={() => setExtraNitrogen((n) => (n + 1) % 4)}
                className="w-full py-2 px-3 rounded-xl font-black bg-zinc-100 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 hover:border-[#D4AF37] cursor-pointer"
              >
                حقن نيتروجين N₂ إضافي (المضاف: {extraNitrogen}×)
              </button>
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-[#0D0D10] border border-amber-200 dark:border-[#D4AF37]/25 leading-relaxed">
                <strong>القاعدة:</strong> المتفاعلات 4 مول والنتائج 2 مول؛ لذلك زيادة الضغط تدفع التفاعل طردياً نحو النشادر الأقل حجماً، بينما رفع الحرارة يطرده عكسياً!
              </div>
            </div>
          )}

          {activeSim === 'rlc_resonance' && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>تردد المصدر المتردد (f)</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{acFreq} Hz</span>
                </div>
                <input type="range" min={20} max={90} step={1} value={acFreq} onChange={(e) => setAcFreq(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>المقاومة الأومية (R)</span>
                  <span className="tabular-nums text-[#9A7218] dark:text-[#F3DFA2]">{rlcRes} Ω</span>
                </div>
                <input type="range" min={10} max={60} step={5} value={rlcRes} onChange={(e) => setRlcRes(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-[#0D0D10] border border-amber-200 dark:border-[#D4AF37]/25 leading-relaxed">
                <strong>هدف الدائرة:</strong> حرك التردد نحو <strong>50 Hz</strong> لتتساوى المفاعلة الحثية والسعوية (<span dir="ltr">XL = XC = 60Ω</span>)، فتصل المعاوقة لأقل قيمة وينطبق التيار على الجهد!
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Curriculum Interactive AI Breakdown */}
      <div className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-zinc-950 dark:text-[#F3DFA2] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <span>افهم أي درس في المنهج بمنهج التجربة والسبب</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
              اختر أي درس من جدول المنهج ليحوله أستاذ نَهج إلى تشبيه حركي وتجربة ذهنية مترابطة.
            </p>
          </div>
          {onAskTutor && (
            <button
              type="button"
              onClick={() =>
                onAskTutor(
                  selectedSubject?.name || 'الأحياء',
                  `أريد فهماً عميقاً لدرس ${conceptLessonTitle} مع ربط الأسباب بالنتائج.`
                )
              }
              className="px-3.5 py-2 rounded-xl border border-[#D4AF37]/40 text-xs font-bold text-[#9A7218] dark:text-[#E8CE88] hover:bg-amber-50 dark:hover:bg-[#0D0D10] flex items-center gap-1.5 cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>فتح في أستاذ نَهج</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={conceptSubjectId}
            onChange={(e) => {
              const sid = e.target.value;
              setConceptSubjectId(sid);
              const sub = curriculum.find((s) => s.id === sid);
              setConceptLessonTitle(sub?.chapters[0]?.lessons[0]?.title || '');
            }}
            className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold"
          >
            {curriculum.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={conceptLessonTitle}
            onChange={(e) => setConceptLessonTitle(e.target.value)}
            className="sm:col-span-1 p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/30 text-xs font-bold"
          >
            {allSubjectLessons.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={isLoadingBreakdown || !conceptLessonTitle}
            onClick={handleFetchAiBreakdown}
            className="py-2.5 px-4 btn-luxury-gold rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoadingBreakdown ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>اشرح بالفهم والتجربة</span>
          </button>
        </div>

        {aiBreakdown && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#0D0D10] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-zinc-900 dark:text-[#F4EFE6]">
              {aiBreakdown}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-600 dark:text-[#B5AA92]">
                {completedLessons.includes(conceptLessonTitle)
                  ? `✔ تم تسجيل فهمك لدرس «${conceptLessonTitle}» (${completedLessons.length} دروس مفهومة)`
                  : 'استوعبت الفكرة الأساسية؟ سجّل إتمام فهم الدرس واحتفل!'}
              </span>
              <button
                type="button"
                onClick={handleMarkLessonUnderstood}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                  completedLessons.includes(conceptLessonTitle)
                    ? 'bg-emerald-500/15 border border-emerald-500/45 text-emerald-700 dark:text-emerald-300'
                    : 'btn-luxury-gold'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {completedLessons.includes(conceptLessonTitle)
                    ? 'مفهوم 100% 🎉'
                    : 'أتممت فهم هذا الدرس ✔ (+15 XP)'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
