import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Presentation,
  Play,
  Pause,
  RotateCcw,
  Download,
  Sparkles,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Film,
  CheckCircle2,
  BookOpen,
  Mic,
} from 'lucide-react';
import {
  Subject,
  WhiteboardDiagramType,
  WhiteboardLessonScript,
  WhiteboardScene,
} from '../types';
import {
  generateWhiteboardFallback,
  sanitizeArabicForSpeech,
} from '../utils/whiteboardGenerator';

interface WhiteboardExplainerViewProps {
  curriculum: Subject[];
  onAwardBonusXp?: (amount: number) => void;
}

type TeacherVoiceStyle = 'calm_teacher' | 'energetic_teacher' | 'academic_lecturer';

interface CachedTtsAudio {
  url: string;
  base64: string;
  mimeType: string;
  voiceName: string;
  needsMalePitchTune: boolean;
}

const VOICE_STYLE_OPTIONS: Array<{
  id: TeacherVoiceStyle;
  label: string;
  desc: string;
}> = [
  { id: 'calm_teacher', label: 'أستاذ حكيم (هادئ وعميق)', desc: 'نبرة وقورة واضحة للشرح المفصل' },
  { id: 'energetic_teacher', label: 'أستاذ متحمس (واضح وقوي)', desc: 'نبرة حماسية مركزة للتريكات' },
  { id: 'academic_lecturer', label: 'أستاذ مبسّط (سلس)', desc: 'نبرة هادئة وسريعة الاستيعاب' },
];

const CANVAS_W = 1280;
const CANVAS_H = 720;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  const result: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) result.push(current);
      current = w;
    }
  }
  if (current) result.push(current);
  return result.length > 0 ? result : [''];
}

// Draw expressive animated subject diagram inside left half of board (x: 36..536, y: 112..557)
function drawAnimatedDiagram(
  ctx: CanvasRenderingContext2D,
  scene: WhiteboardScene,
  progress: number, // 0..1 within scene
  elapsedMs: number
) {
  const boxX = 36;
  const boxY = 112;
  const boxW = 500;
  const boxH = 445;

  // Frame
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(10, 12, 16, 0.72)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 20);
  ctx.fill();
  ctx.stroke();

  // Diagram Title
  ctx.fillStyle = '#F3DFA2';
  ctx.font = 'bold 20px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(scene.diagramTitle, boxX + boxW / 2, boxY + 38, boxW - 28);

  const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const posRadius = (r: number) => (Number.isFinite(r) && r > 0 ? r : 0);

  const cx = boxX + boxW / 2;
  const cy = boxY + 230;
  const diagReveal = Math.max(0, Math.min(1, safeProgress * 1.6));
  const pulse = 0.5 + 0.5 * Math.sin(safeElapsed / 320);
  const type: WhiteboardDiagramType = scene.diagramType;

  if (type === 'physics_circuit') {
    const rx = boxX + 90;
    const ry = boxY + 95;
    const rw = boxW - 180;
    const rh = 240;
    ctx.strokeStyle = '#E8CE88';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([rw * 2 + rh * 2]);
    ctx.lineDashOffset = (1 - diagReveal) * (rw * 2 + rh * 2);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.setLineDash([]);

    // Resistor zig-zag on top wire
    ctx.fillStyle = '#14171D';
    ctx.fillRect(cx - 55, ry - 16, 110, 32);
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 55, ry);
    for (let i = 0; i < 6; i++) {
      ctx.lineTo(cx - 45 + i * 18, ry + (i % 2 === 0 ? -13 : 13));
    }
    ctx.lineTo(cx + 55, ry);
    ctx.stroke();

    // Battery bottom
    ctx.fillStyle = '#14171D';
    ctx.fillRect(cx - 24, ry + rh - 20, 48, 40);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, ry + rh - 18);
    ctx.lineTo(cx - 10, ry + rh + 18);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 10, ry + rh - 10);
    ctx.lineTo(cx + 10, ry + rh + 10);
    ctx.stroke();

    // Moving current charge particles along perimeter
    if (diagReveal > 0.4) {
      const perim = Math.max(1, 2 * (rw + rh));
      for (let k = 0; k < 6; k++) {
        const d = Math.max(0, (safeElapsed / 18 + (k * perim) / 6) % perim);
        let px = rx;
        let py = ry;
        if (d < rw) {
          px = rx + d;
          py = ry;
        } else if (d < rw + rh) {
          px = rx + rw;
          py = ry + (d - rw);
        } else if (d < 2 * rw + rh) {
          px = rx + rw - (d - rw - rh);
          py = ry + rh;
        } else {
          px = rx;
          py = ry + rh - (d - 2 * rw - rh);
        }
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (type === 'physics_wave') {
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boxX + 45, cy);
    ctx.lineTo(boxX + boxW - 45, cy);
    ctx.moveTo(boxX + 65, boxY + 95);
    ctx.lineTo(boxX + 65, boxY + 340);
    ctx.stroke();

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const maxW = Math.max(0, (boxW - 120) * diagReveal);
    for (let x = 0; x <= maxW; x += 3) {
      const y = cy - Math.sin(x / 52 - safeElapsed / 420) * 72;
      if (x === 0) ctx.moveTo(boxX + 65 + x, y);
      else ctx.lineTo(boxX + 65 + x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= maxW; x += 3) {
      const y = cy - Math.cos(x / 52 - safeElapsed / 420) * 48;
      if (x === 0) ctx.moveTo(boxX + 65 + x, y);
      else ctx.lineTo(boxX + 65 + x, y);
    }
    ctx.stroke();
  } else if (type === 'chem_reaction' || type === 'chem_atom') {
    if (type === 'chem_atom') {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(cx, cy - 10, posRadius(18 + pulse * 3), 0, Math.PI * 2);
      ctx.fill();
      const radii = [56, 95, 134];
      radii.forEach((r, idx) => {
        ctx.strokeStyle = idx === 2 ? '#D4AF37' : 'rgba(148, 163, 184, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - 10, posRadius(r * diagReveal), 0, Math.PI * 2);
        ctx.stroke();

        const angle = safeElapsed / (650 - idx * 140) + idx * 1.7;
        const ex = cx + Math.cos(angle) * r * diagReveal;
        const ey = cy - 10 + Math.sin(angle) * r * diagReveal;
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(ex, ey, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      const shift = Math.sin(safeElapsed / 500) * 6;
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(cx - 140, cy - 10 + shift, posRadius(28 * diagReveal), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(cx - 90, cy + 16 - shift, posRadius(22 * diagReveal), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#E8CE88';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 42, cy);
      ctx.lineTo(cx + 42 * diagReveal, cy);
      ctx.stroke();

      ctx.fillStyle = '#34D399';
      ctx.beginPath();
      ctx.arc(cx + 108, cy, posRadius(32 * diagReveal), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(cx + 150, cy - 22, posRadius(19 * diagReveal), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'bio_dna') {
    const topY = boxY + 85;
    const h = Math.max(0, 250 * diagReveal);
    ctx.lineWidth = 4;
    for (let y = 0; y < h; y += 16) {
      const phase = y * 0.045 + safeElapsed / 550;
      const x1 = cx + Math.sin(phase) * 72;
      const x2 = cx - Math.sin(phase) * 72;
      ctx.strokeStyle = y % 32 === 0 ? '#34D399' : '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(x1, topY + y);
      ctx.lineTo(x2, topY + y);
      ctx.stroke();

      ctx.fillStyle = '#F3DFA2';
      ctx.beginPath();
      ctx.arc(x1, topY + y, 5, 0, Math.PI * 2);
      ctx.arc(x2, topY + y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'bio_cell') {
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 5;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy - 10,
      posRadius((150 + pulse * 6) * diagReveal),
      posRadius((105 + pulse * 4) * diagReveal),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx - 20, cy - 15, posRadius(42 * diagReveal), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.beginPath();
    ctx.ellipse(
      cx + 75,
      cy + 20,
      posRadius(34 * diagReveal),
      posRadius(20 * diagReveal),
      0.4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else if (type === 'geology_layers') {
    const colors = ['#78350F', '#92400E', '#B45309', '#4B5563'];
    const lx = boxX + 60;
    const lw = Math.max(0, (boxW - 120) * diagReveal);
    colors.forEach((col, i) => {
      const ly = boxY + 95 + i * 58;
      ctx.fillStyle = col;
      ctx.fillRect(lx, ly, lw, 48);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.strokeRect(lx, ly, lw, 48);
    });
  } else {
    const nodes = [
      { x: cx, y: cy - 82, r: 38, color: '#D4AF37' },
      { x: cx - 135, y: cy + 48, r: 30, color: '#38BDF8' },
      { x: cx + 135, y: cy + 48, r: 30, color: '#34D399' },
      { x: cx, y: cy + 92, r: 28, color: '#F59E0B' },
    ];
    ctx.strokeStyle = 'rgba(232, 206, 136, 0.65)';
    ctx.lineWidth = 3;
    nodes.slice(1).forEach((n) => {
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.lineTo(
        nodes[0].x + (n.x - nodes[0].x) * diagReveal,
        nodes[0].y + (n.y - nodes[0].y) * diagReveal
      );
      ctx.stroke();
    });
    nodes.forEach((n, idx) => {
      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, posRadius((n.r + (idx === 0 ? pulse * 4 : 0)) * diagReveal), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Labels along bottom of diagram card
  const labels = scene.diagramLabels.slice(0, 3);
  const labelW = (boxW - 40) / Math.max(1, labels.length);
  labels.forEach((lbl, idx) => {
    const lx = boxX + 20 + idx * labelW + labelW / 2;
    const ly = boxY + boxH - 28;
    ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(lx - labelW / 2 + 6, ly - 22, labelW - 12, 34, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F6E2A6';
    ctx.font = 'bold 13px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lbl.slice(0, 24), lx, ly, labelW - 22);
  });

  ctx.restore();
}

function drawPenTip(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.45);
  ctx.fillStyle = '#D4AF37';
  ctx.beginPath();
  ctx.roundRect(-8, -76, 16, 60, 4);
  ctx.fill();
  ctx.fillStyle = '#F6E2A6';
  ctx.fillRect(-7, -18, 14, 7);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-6, -11);
  ctx.lineTo(6, -11);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(246, 226, 166, 0.65)';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderWhiteboardFrame(
  ctx: CanvasRenderingContext2D,
  script: WhiteboardLessonScript,
  sceneIndex: number,
  sceneProgress: number,
  elapsedMs: number,
  options?: { activeAudio?: boolean; audioLoading?: boolean }
) {
  const scene = script.scenes[sceneIndex] || script.scenes[0];
  if (!scene) return;

  const safeSceneProgress = Number.isFinite(sceneProgress)
    ? Math.max(0, Math.min(1, sceneProgress))
    : 0;
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

  // Chalkboard Background Gradient
  const bg = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  bg.addColorStop(0, '#0C1210');
  bg.addColorStop(0.5, '#0F1714');
  bg.addColorStop(1, '#080A0C');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle Grid Chalk Lines
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.06)';
  ctx.lineWidth = 1;
  for (let gx = 40; gx < CANVAS_W; gx += 60) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, CANVAS_H);
    ctx.stroke();
  }
  for (let gy = 40; gy < CANVAS_H; gy += 60) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(CANVAS_W, gy);
    ctx.stroke();
  }

  // Board Outer Luxury Frame
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, CANVAS_W - 20, CANVAS_H - 20);

  // Top Header Bar
  ctx.fillStyle = 'rgba(9, 9, 12, 0.85)';
  ctx.fillRect(14, 14, CANVAS_W - 28, 76);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, 90);
  ctx.lineTo(CANVAS_W - 14, 90);
  ctx.stroke();

  // Subject & Scene Header (RTL aligned on right)
  ctx.fillStyle = '#E8CE88';
  ctx.font = 'bold 19px Cairo, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${script.subject} · ${script.lesson}`, CANVAS_W - 38, 43, 760);

  ctx.fillStyle = '#F6E2A6';
  ctx.font = 'bold 25px Cairo, sans-serif';
  ctx.fillText(scene.title, CANVAS_W - 38, 76, 760);

  // Scene Badge Top-Left
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 17px Cairo, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `مشهد ${sceneIndex + 1} / ${script.scenes.length} · أستاذ نَهج`,
    38,
    56
  );

  // Animated Diagram on Left Side (x: 36..536)
  drawAnimatedDiagram(ctx, scene, safeSceneProgress, safeElapsedMs);

  // Right Side Writing Zone with proper RTL multi-line word wrapping (x: 575..1240)
  const rightMaxW = 640;
  const wrappedLines: Array<{ text: string; isHeading: boolean }> = [];
  scene.boardLines.forEach((rawLine, idx) => {
    ctx.font = idx === 0 ? 'bold 22px Cairo, sans-serif' : '600 19px Cairo, sans-serif';
    const subLines = wrapCanvasLines(ctx, rawLine, rightMaxW);
    subLines.forEach((sl) => wrappedLines.push({ text: sl, isHeading: idx === 0 }));
  });

  const maxVisibleBoardLines = scene.formulaBox ? 10 : 12;
  const visibleBoardLines = wrappedLines.slice(0, maxVisibleBoardLines);
  const totalChars =
    visibleBoardLines.reduce((acc, l) => acc + l.text.length, 0) +
    (scene.formulaBox?.length || 0);

  // Sync writing linearly across 92% of real spoken audio duration
  const writeRatio = Math.max(0, Math.min(1, safeSceneProgress / 0.92));
  let charsBudget = Math.floor(totalChars * writeRatio);

  let penPos: { x: number; y: number } | null = null;
  ctx.textAlign = 'right';

  const lineStep = visibleBoardLines.length > 7 ? 31 : 39;
  let currentY = 142;

  visibleBoardLines.forEach((lineObj) => {
    if (charsBudget <= 0) return;
    const take = Math.min(lineObj.text.length, charsBudget);
    const slice = lineObj.text.slice(0, take);
    charsBudget -= take;

    const isActivelyWriting = take > 0 && take < lineObj.text.length;
    if (isActivelyWriting) {
      ctx.fillStyle = 'rgba(212, 175, 55, 0.10)';
      ctx.fillRect(578, currentY - 22, 666, lineStep - 2);
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(CANVAS_W - 28, currentY - 19, 4, lineStep - 8);
    }

    ctx.fillStyle = lineObj.isHeading ? '#F6E2A6' : isActivelyWriting ? '#FFFFFF' : '#F4EFE6';
    ctx.font = lineObj.isHeading
      ? 'bold 22px Cairo, sans-serif'
      : '600 19px Cairo, sans-serif';
    ctx.fillText(slice, CANVAS_W - 42, currentY);

    if (isActivelyWriting) {
      const measuredW = Math.min(rightMaxW, ctx.measureText(slice).width);
      penPos = { x: CANVAS_W - 42 - measuredW - 8, y: currentY - 6 };
    }
    currentY += lineStep;
  });

  // Formula / Golden Rule Highlight Box
  if (scene.formulaBox && charsBudget > 0) {
    const formulaY = Math.max(currentY + 8, 472);
    ctx.save();
    ctx.fillStyle = 'rgba(212, 175, 55, 0.14)';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(575, formulaY, 660, 72, 16);
    ctx.fill();
    ctx.stroke();

    const fTake = Math.min(scene.formulaBox.length, charsBudget);
    const fSlice = scene.formulaBox.slice(0, fTake);
    ctx.fillStyle = '#F6E2A6';
    ctx.font = 'bold 21px monospace, Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fSlice, 575 + 330, formulaY + 44, 628);
    if (fTake > 0 && fTake < scene.formulaBox.length) {
      const mw = Math.min(600, ctx.measureText(fSlice).width);
      penPos = { x: 575 + 330 - mw / 2, y: formulaY + 38 };
    }
    ctx.restore();
  }

  if (penPos && writeRatio < 0.99) {
    drawPenTip(ctx, penPos.x, penPos.y);
  }

  // Bottom Narration Subtitle Strip (1:1 synced with live voice progress)
  ctx.fillStyle = 'rgba(8, 8, 12, 0.94)';
  ctx.fillRect(14, CANVAS_H - 138, CANVAS_W - 28, 124);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.38)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, CANVAS_H - 138);
  ctx.lineTo(CANVAS_W - 14, CANVAS_H - 138);
  ctx.stroke();

  // Golden live scene-progress strip across subtitle header
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(14, CANVAS_H - 139, (CANVAS_W - 28) * safeSceneProgress, 3);

  ctx.fillStyle = '#E8CE88';
  ctx.font = 'bold 15px Cairo, sans-serif';
  ctx.textAlign = 'right';
  const labelText = options?.audioLoading
    ? 'جاري تجهيز ومزامنة صوت المعلم 1:1...'
    : 'الشرح الصوتي المتزامن (أستاذ نَهج):';
  ctx.fillText(labelText, CANVAS_W - 38, CANVAS_H - 108);

  // Subtle 4-bar equalizer when voice is actively playing
  if (options?.activeAudio && !options?.audioLoading) {
    for (let b = 0; b < 4; b++) {
      const barH = 6 + Math.abs(Math.sin(safeElapsedMs / 160 + b * 0.9)) * 12;
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(36 + b * 8, CANVAS_H - 106 - barH, 4, barH);
    }
  }

  ctx.fillStyle = '#F4EFE6';
  ctx.font = '600 20px Cairo, sans-serif';
  const allNarrationLines = wrapCanvasLines(ctx, scene.narration, CANVAS_W - 88);
  const totalPages = Math.max(1, Math.ceil(allNarrationLines.length / 2));
  const currentPage = Math.min(
    totalPages - 1,
    Math.floor(safeSceneProgress * totalPages)
  );
  const pageLines = allNarrationLines.slice(currentPage * 2, currentPage * 2 + 2);

  if (pageLines[0]) {
    ctx.fillText(pageLines[0], CANVAS_W - 38, CANVAS_H - 72);
  }
  if (pageLines[1]) {
    ctx.fillText(pageLines[1], CANVAS_W - 38, CANVAS_H - 36);
  }
}

export const WhiteboardExplainerView: React.FC<WhiteboardExplainerViewProps> = ({
  curriculum,
  onAwardBonusXp,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    curriculum[0]?.id || 'physics'
  );
  const activeSubject =
    curriculum.find((s) => s.id === selectedSubjectId) || curriculum[0];

  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    activeSubject?.chapters[0]?.id || ''
  );
  const activeChapter =
    activeSubject?.chapters.find((c) => c.id === selectedChapterId) ||
    activeSubject?.chapters[0];

  const [selectedLessonTitle, setSelectedLessonTitle] = useState<string>(
    activeChapter?.lessons[0]?.title || ''
  );
  const [customLessonInput, setCustomLessonInput] = useState<string>('');

  const [script, setScript] = useState<WhiteboardLessonScript>(() =>
    generateWhiteboardFallback({
      subject: activeSubject?.name || 'الفيزياء',
      chapter: activeChapter?.title || 'التيار الكهربي وقانون أوم وكيرشوف',
      lesson: activeChapter?.lessons[0]?.title || 'شدة التيار وفرق الجهد وقانون أوم',
      chapterSummary: activeChapter?.summary,
    })
  );

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentSceneIdx, setCurrentSceneIdx] = useState<number>(0);
  const [sceneProgress, setSceneProgress] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [voiceStyle, setVoiceStyle] = useState<TeacherVoiceStyle>('calm_teacher');
  const [voiceStatusNote, setVoiceStatusNote] = useState<string>(
    'صوت المعلم الرجالي جاهز (صوت أستاذ نَهج)'
  );
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.25>(1);

  // Video export state
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [exportProgressPct, setExportProgressPct] = useState<number>(0);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const sceneStartPerfRef = useRef<number>(0);
  const sceneProgressRef = useRef<number>(1);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);
  const playbackAudioCtxRef = useRef<AudioContext | null>(null);
  const activeBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const audioFinishedRef = useRef<boolean>(true);
  const effectiveDurationMsRef = useRef<number>(12000);
  const speechRunIdRef = useRef<number>(0);
  const audioSyncRef = useRef<{
    mode: 'idle' | 'loading' | 'ctx' | 'elem' | 'speech' | 'timer';
    ctxStartTime: number;
    durationSec: number;
    playbackRate: number;
    offsetSec: number;
    elem: HTMLAudioElement | null;
    timerStartPerf: number;
    speechFraction: number;
  }>({
    mode: 'idle',
    ctxStartTime: 0,
    durationSec: 12,
    playbackRate: 1,
    offsetSec: 0,
    elem: null,
    timerStartPerf: 0,
    speechFraction: 0,
  });

  // Client cache for generated WAV/MP3 male teacher audio
  const audioCacheRef = useRef<Map<string, CachedTtsAudio>>(new Map());
  const pendingAudioRef = useRef<Map<string, Promise<CachedTtsAudio | null>>>(new Map());

  useEffect(() => {
    sceneProgressRef.current = sceneProgress;
  }, [sceneProgress]);

  useEffect(() => {
    if (!activeSubject) return;
    const firstChap = activeSubject.chapters[0];
    setSelectedChapterId(firstChap?.id || '');
    setSelectedLessonTitle(firstChap?.lessons[0]?.title || '');
  }, [selectedSubjectId]);

  useEffect(() => {
    if (!activeChapter) return;
    setSelectedLessonTitle(activeChapter.lessons[0]?.title || '');
  }, [selectedChapterId]);

  // Synchronously unlock AudioContext & speechSynthesis inside user click gesture (bypasses browser/iframe autoplay block)
  const unlockAudioSync = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        if (!playbackAudioCtxRef.current || playbackAudioCtxRef.current.state === 'closed') {
          playbackAudioCtxRef.current = new AudioCtx();
        }
        const ctx = playbackAudioCtxRef.current;
        if (ctx.state === 'suspended') {
          void ctx.resume().catch(() => {});
        }
        // Play a 1-sample silent buffer to cement activation on iOS/Android/Chrome
        const silent = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = silent;
        src.connect(ctx.destination);
        src.start(0);
      }
    } catch {
      // ignore AudioContext limitations
    }
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    speechRunIdRef.current += 1;
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (activeBufferSourceRef.current) {
      try {
        activeBufferSourceRef.current.onended = null;
        activeBufferSourceRef.current.stop();
        activeBufferSourceRef.current.disconnect();
      } catch {
        // ignore already stopped
      }
      activeBufferSourceRef.current = null;
    }
    if (audioElemRef.current) {
      try {
        audioElemRef.current.pause();
        audioElemRef.current.onended = null;
        audioElemRef.current.onerror = null;
        audioElemRef.current.src = '';
      } catch {
        // ignore
      }
      audioElemRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    audioSyncRef.current.mode = 'idle';
    audioSyncRef.current.elem = null;
    audioSyncRef.current.speechFraction = 0;
    audioFinishedRef.current = true;
  }, []);

  // Cleanup object URLs + AudioContext + speech on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
      if (playbackAudioCtxRef.current) {
        playbackAudioCtxRef.current.close().catch(() => {});
        playbackAudioCtxRef.current = null;
      }
      audioCacheRef.current.forEach((entry) => {
        try {
          URL.revokeObjectURL(entry.url);
        } catch {
          // ignore
        }
      });
      audioCacheRef.current.clear();
    };
  }, [stopAllAudio]);

  // Fetch male teacher audio from server with dedupe + caching
  const fetchMaleTeacherAudio = useCallback(
    async (
      rawText: string,
      style: TeacherVoiceStyle
    ): Promise<CachedTtsAudio | null> => {
      const cleaned = sanitizeArabicForSpeech(rawText);
      if (!cleaned) return null;
      const key = `${style}::${cleaned}`;
      const existing = audioCacheRef.current.get(key);
      if (existing) return existing;

      const inflight = pendingAudioRef.current.get(key);
      if (inflight) return inflight;

      const promise = (async (): Promise<CachedTtsAudio | null> => {
        try {
          const res = await fetch('/api/gemini/whiteboard-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleaned, voiceStyle: style }),
          });
          const data = await res.json();
          if (data?.success && data?.audioBase64) {
            const bytes = base64ToUint8Array(data.audioBase64);
            const mimeType = data.mimeType || 'audio/wav';
            const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const item: CachedTtsAudio = {
              url,
              base64: data.audioBase64,
              mimeType,
              voiceName: data.voiceName || 'Charon',
              needsMalePitchTune: Boolean(data.needsMalePitchTune),
            };
            audioCacheRef.current.set(key, item);
            return item;
          }
          return null;
        } catch {
          return null;
        } finally {
          pendingAudioRef.current.delete(key);
        }
      })();

      pendingAudioRef.current.set(key, promise);
      return promise;
    },
    []
  );

  // Clean chunked Male Web Speech fallback (with live 1:1 chunk progress telemetry)
  const speakMaleBrowserFallback = useCallback(
    (
      rawText: string,
      runId: number,
      onAllDone?: () => void,
      onChunkProgress?: (fraction: number) => void
    ) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        audioFinishedRef.current = true;
        onAllDone?.();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const cleaned = sanitizeArabicForSpeech(rawText);
        // Split cleanly into ~150-char sentences so Chromium SpeechSynthesis never hangs or drops chunks
        const rawSentences = cleaned.split(/(?<=[.!؟،؛])\s+/).filter(Boolean);
        const chunks: string[] = [];
        let buf = '';
        for (const s of rawSentences) {
          if ((buf + ' ' + s).length <= 165) {
            buf = buf ? `${buf} ${s}` : s;
          } else {
            if (buf) chunks.push(buf);
            buf = s;
          }
        }
        if (buf) chunks.push(buf);
        if (chunks.length === 0) {
          audioFinishedRef.current = true;
          onAllDone?.();
          return;
        }

        const voices = window.speechSynthesis.getVoices();
        const maleKeywords = ['maged', 'tarik', 'naayf', 'hamed', 'hamdan', 'shakir', 'bassam', 'omar', 'male', 'ماجد', 'طارق', 'حامد'];
        const arVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ar'));
        const confirmedMaleVoice = arVoices.find((v) =>
          maleKeywords.some((k) => v.name.toLowerCase().includes(k))
        );
        const selectedArVoice =
          confirmedMaleVoice ||
          arVoices.find((v) => v.lang.toLowerCase().startsWith('ar-eg')) ||
          arVoices[0];

        audioFinishedRef.current = false;
        let idx = 0;

        const speakNext = () => {
          if (speechRunIdRef.current !== runId) return;
          if (idx >= chunks.length) {
            onChunkProgress?.(1);
            audioFinishedRef.current = true;
            onAllDone?.();
            return;
          }
          onChunkProgress?.(Math.min(0.95, idx / chunks.length));
          const utter = new SpeechSynthesisUtterance(chunks[idx]);
          utter.lang = selectedArVoice?.lang || 'ar-EG';
          if (selectedArVoice) utter.voice = selectedArVoice;
          // Deepen pitch slightly when generic browser voice is used so it stays unambiguously male
          utter.pitch = confirmedMaleVoice ? 0.96 : 0.82;
          utter.rate = playbackSpeed;
          utter.onend = () => {
            idx += 1;
            speakNext();
          };
          utter.onerror = () => {
            idx += 1;
            speakNext();
          };
          window.speechSynthesis.speak(utter);
        };

        speakNext();
      } catch {
        audioFinishedRef.current = true;
        onAllDone?.();
      }
    },
    [playbackSpeed]
  );

  // Redraw canvas frame whenever static params change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderWhiteboardFrame(ctx, script, currentSceneIdx, sceneProgress, performance.now(), {
      activeAudio: isPlaying && voiceEnabled,
      audioLoading: isLoadingAudio,
    });
  }, [script, currentSceneIdx, sceneProgress, isPlaying, voiceEnabled, isLoadingAudio]);

  // Live 1:1 playback animation strictly clock-locked to Male Teacher Voice
  useEffect(() => {
    if (!isPlaying || isExportingVideo) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const activeScene = script.scenes[currentSceneIdx];
    if (!activeScene) {
      setIsPlaying(false);
      return;
    }

    let cancelled = false;
    stopAllAudio();
    const myRunId = speechRunIdRef.current;

    const baseDurationMs = Math.max(
      100,
      ((activeScene.durationSec || 12) * 1000) / playbackSpeed
    );
    effectiveDurationMsRef.current = baseDurationMs;
    const initialPct = sceneProgressRef.current >= 0.97 ? 0 : Math.max(0, Math.min(1, sceneProgressRef.current));
    if (sceneProgressRef.current >= 0.97) {
      setSceneProgress(0);
      sceneProgressRef.current = 0;
    }
    sceneStartPerfRef.current = performance.now() - initialPct * baseDurationMs;

    // Pre-fetch next scene audio in background for seamless 1:1 transitions
    const nextScene = script.scenes[currentSceneIdx + 1];
    if (voiceEnabled && nextScene) {
      void fetchMaleTeacherAudio(nextScene.narration, voiceStyle);
    }

    if (voiceEnabled) {
      audioFinishedRef.current = false;
      setIsLoadingAudio(true);
      audioSyncRef.current = {
        mode: 'loading',
        ctxStartTime: 0,
        durationSec: baseDurationMs / 1000,
        playbackRate: playbackSpeed,
        offsetSec: initialPct * (baseDurationMs / 1000),
        elem: null,
        timerStartPerf: performance.now() - initialPct * baseDurationMs,
        speechFraction: initialPct,
      };

      const getMaleRateMultiplier = (needsTune: boolean) => {
        if (!needsTune) return playbackSpeed;
        const styleBase =
          voiceStyle === 'calm_teacher'
            ? 0.87
            : voiceStyle === 'energetic_teacher'
            ? 0.94
            : 0.91;
        return styleBase * playbackSpeed;
      };

      void (async () => {
        const ttsItem = await fetchMaleTeacherAudio(activeScene.narration, voiceStyle);
        if (cancelled || speechRunIdRef.current !== myRunId) return;
        setIsLoadingAudio(false);

        if (ttsItem) {
          setVoiceStatusNote(`صوت المعلم الرجالي متزامن 1:1 (${ttsItem.voiceName})`);
          const desiredRate = getMaleRateMultiplier(ttsItem.needsMalePitchTune);

          // Primary: play via gesture-unlocked AudioContext clocked 1:1 with canvas
          let playedViaCtx = false;
          try {
            const AudioCtx =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
            if (AudioCtx) {
              if (
                !playbackAudioCtxRef.current ||
                playbackAudioCtxRef.current.state === 'closed'
              ) {
                playbackAudioCtxRef.current = new AudioCtx();
              }
              const ctx = playbackAudioCtxRef.current;
              if (ctx.state === 'suspended') {
                await ctx.resume().catch(() => {});
              }
              if (ctx.state === 'running') {
                const bytes = base64ToUint8Array(ttsItem.base64);
                const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer);
                if (cancelled || speechRunIdRef.current !== myRunId) return;

                const offsetSec =
                  initialPct >= 0.96
                    ? 0
                    : Math.min(Math.max(0, decoded.duration - 0.15), initialPct * decoded.duration);

                const srcNode = ctx.createBufferSource();
                srcNode.buffer = decoded;
                srcNode.playbackRate.value = desiredRate;
                srcNode.connect(ctx.destination);
                activeBufferSourceRef.current = srcNode;

                effectiveDurationMsRef.current = Math.max(
                  800,
                  (decoded.duration / Math.max(0.5, desiredRate)) * 1000
                );

                audioSyncRef.current = {
                  mode: 'ctx',
                  ctxStartTime: ctx.currentTime,
                  durationSec: decoded.duration,
                  playbackRate: desiredRate,
                  offsetSec,
                  elem: null,
                  timerStartPerf: performance.now(),
                  speechFraction: initialPct,
                };

                srcNode.onended = () => {
                  if (cancelled || speechRunIdRef.current !== myRunId) return;
                  audioFinishedRef.current = true;
                };
                srcNode.start(0, offsetSec);
                playedViaCtx = true;
              }
            }
          } catch {
            playedViaCtx = false;
          }

          if (!playedViaCtx) {
            // Secondary: HTMLAudioElement clocked directly to audio.currentTime
            const audio = new Audio(ttsItem.url);
            audio.playbackRate = desiredRate;
            audioElemRef.current = audio;

            audio.onloadedmetadata = () => {
              if (cancelled || speechRunIdRef.current !== myRunId) return;
              if (Number.isFinite(audio.duration) && audio.duration > 0) {
                const offsetSec =
                  initialPct >= 0.96
                    ? 0
                    : Math.min(Math.max(0, audio.duration - 0.15), initialPct * audio.duration);
                if (offsetSec > 0) {
                  try {
                    audio.currentTime = offsetSec;
                  } catch {
                    // ignore seek error before ready
                  }
                }
                effectiveDurationMsRef.current = Math.max(
                  800,
                  (audio.duration / Math.max(0.5, desiredRate)) * 1000
                );
                audioSyncRef.current = {
                  mode: 'elem',
                  ctxStartTime: 0,
                  durationSec: audio.duration,
                  playbackRate: desiredRate,
                  offsetSec,
                  elem: audio,
                  timerStartPerf: performance.now(),
                  speechFraction: initialPct,
                };
              }
            };
            audio.onended = () => {
              if (cancelled || speechRunIdRef.current !== myRunId) return;
              audioFinishedRef.current = true;
            };
            audio.onerror = () => {
              if (cancelled || speechRunIdRef.current !== myRunId) return;
              setVoiceStatusNote('صوت المعلم الرجالي الاحتياطي نشط ومزامن');
              audioSyncRef.current = {
                mode: 'speech',
                ctxStartTime: 0,
                durationSec: baseDurationMs / 1000,
                playbackRate: playbackSpeed,
                offsetSec: 0,
                elem: null,
                timerStartPerf: performance.now() - initialPct * baseDurationMs,
                speechFraction: initialPct,
              };
              speakMaleBrowserFallback(
                activeScene.narration,
                myRunId,
                () => {
                  audioFinishedRef.current = true;
                },
                (frac) => {
                  audioSyncRef.current.speechFraction = frac;
                }
              );
            };

            try {
              audioSyncRef.current = {
                mode: 'elem',
                ctxStartTime: 0,
                durationSec: baseDurationMs / 1000,
                playbackRate: desiredRate,
                offsetSec: 0,
                elem: audio,
                timerStartPerf: performance.now(),
                speechFraction: initialPct,
              };
              await audio.play();
            } catch {
              if (!cancelled && speechRunIdRef.current === myRunId) {
                audioSyncRef.current = {
                  mode: 'speech',
                  ctxStartTime: 0,
                  durationSec: baseDurationMs / 1000,
                  playbackRate: playbackSpeed,
                  offsetSec: 0,
                  elem: null,
                  timerStartPerf: performance.now() - initialPct * baseDurationMs,
                  speechFraction: initialPct,
                };
                speakMaleBrowserFallback(
                  activeScene.narration,
                  myRunId,
                  () => {
                    audioFinishedRef.current = true;
                  },
                  (frac) => {
                    audioSyncRef.current.speechFraction = frac;
                  }
                );
              }
            }
          }
        } else {
          setVoiceStatusNote('صوت المعلم الرجالي (المتصفح المحلي) متزامن 1:1');
          audioSyncRef.current = {
            mode: 'speech',
            ctxStartTime: 0,
            durationSec: baseDurationMs / 1000,
            playbackRate: playbackSpeed,
            offsetSec: 0,
            elem: null,
            timerStartPerf: performance.now() - initialPct * baseDurationMs,
            speechFraction: initialPct,
          };
          // Failsafe timer so scene never stalls if OS has no speech voices installed
          fallbackTimerRef.current = window.setTimeout(() => {
            if (!cancelled && speechRunIdRef.current === myRunId) {
              audioFinishedRef.current = true;
            }
          }, Math.max(baseDurationMs + 2500, 19000));
          speakMaleBrowserFallback(
            activeScene.narration,
            myRunId,
            () => {
              audioFinishedRef.current = true;
            },
            (frac) => {
              audioSyncRef.current.speechFraction = frac;
            }
          );
        }
      })();
    } else {
      audioFinishedRef.current = true;
      setIsLoadingAudio(false);
      audioSyncRef.current = {
        mode: 'timer',
        ctxStartTime: 0,
        durationSec: baseDurationMs / 1000,
        playbackRate: playbackSpeed,
        offsetSec: 0,
        elem: null,
        timerStartPerf: performance.now() - initialPct * baseDurationMs,
        speechFraction: initialPct,
      };
    }

    const tick = (now: number) => {
      if (cancelled) return;
      const sync = audioSyncRef.current;
      let pct = initialPct;

      if (sync.mode === 'loading') {
        // Hold pen and visual position steadily while audio buffer downloads/decodes
        pct = initialPct;
      } else if (sync.mode === 'ctx' && playbackAudioCtxRef.current) {
        const playedSec =
          sync.offsetSec +
          Math.max(0, (playbackAudioCtxRef.current.currentTime - sync.ctxStartTime) * sync.playbackRate);
        pct = Math.max(0, Math.min(1, playedSec / Math.max(0.4, sync.durationSec)));
      } else if (sync.mode === 'elem' && sync.elem) {
        const totalDur =
          Number.isFinite(sync.elem.duration) && sync.elem.duration > 0
            ? sync.elem.duration
            : Math.max(1, sync.durationSec);
        pct = Math.max(0, Math.min(1, sync.elem.currentTime / totalDur));
      } else if (sync.mode === 'speech') {
        const timerPct = Math.max(
          0,
          Math.min(0.96, (now - sync.timerStartPerf) / Math.max(800, baseDurationMs))
        );
        pct = audioFinishedRef.current
          ? 1
          : Math.max(0, Math.min(0.98, sync.speechFraction * 0.65 + timerPct * 0.35));
      } else {
        const dur = Math.max(500, effectiveDurationMsRef.current);
        const elapsed = Math.max(0, now - sceneStartPerfRef.current);
        pct = Math.max(0, Math.min(1, elapsed / dur));
      }

      setSceneProgress(pct);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        renderWhiteboardFrame(ctx, script, currentSceneIdx, pct, now, {
          activeAudio: voiceEnabled && sync.mode !== 'loading',
          audioLoading: sync.mode === 'loading',
        });
      }

      // Advance only when both spoken narration and canvas pen finish 1:1
      if ((pct >= 0.995 && (!voiceEnabled || audioFinishedRef.current)) || (voiceEnabled && audioFinishedRef.current && pct >= 0.95)) {
        if (currentSceneIdx + 1 < script.scenes.length) {
          setCurrentSceneIdx((idx) => idx + 1);
          setSceneProgress(0);
          sceneProgressRef.current = 0;
        } else {
          setIsPlaying(false);
          setSceneProgress(1);
        }
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopAllAudio();
      setIsLoadingAudio(false);
    };
  }, [
    isPlaying,
    isExportingVideo,
    currentSceneIdx,
    script,
    playbackSpeed,
    voiceEnabled,
    voiceStyle,
    fetchMaleTeacherAudio,
    speakMaleBrowserFallback,
    stopAllAudio,
  ]);

  const handleGenerateLesson = async () => {
    const lessonName = customLessonInput.trim() || selectedLessonTitle;
    if (!activeSubject || !lessonName || isGenerating) return;

    unlockAudioSync();
    stopAllAudio();
    setIsPlaying(false);
    setExportMessage(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/gemini/whiteboard-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: activeSubject.name,
          chapter: activeChapter?.title || 'المنهج الأساسي',
          lesson: lessonName,
          chapterSummary: activeChapter?.summary,
        }),
      });
      const data = await res.json();
      if (res.ok && data.script) {
        setScript(data.script);
      } else {
        setScript(
          generateWhiteboardFallback({
            subject: activeSubject.name,
            chapter: activeChapter?.title || 'المنهج الأساسي',
            lesson: lessonName,
            chapterSummary: activeChapter?.summary,
          })
        );
      }
      setCurrentSceneIdx(0);
      setSceneProgress(0);
      sceneProgressRef.current = 0;
      setIsPlaying(true);
      onAwardBonusXp?.(15);
    } catch {
      setScript(
        generateWhiteboardFallback({
          subject: activeSubject.name,
          chapter: activeChapter?.title || 'المنهج الأساسي',
          lesson: lessonName,
          chapterSummary: activeChapter?.summary,
        })
      );
      setCurrentSceneIdx(0);
      setSceneProgress(0);
      sceneProgressRef.current = 0;
      setIsPlaying(true);
    } finally {
      setIsGenerating(false);
    }
  };

  // Real Canvas + Real Male Teacher Voice Track -> .webm Video Recording & Download
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isExportingVideo) return;

    if (
      typeof MediaRecorder === 'undefined' ||
      typeof canvas.captureStream !== 'function'
    ) {
      setExportMessage(
        'متصفحك لا يدعم تسجيل فيديو Canvas مباشرة، جرّب Chrome أو Edge الحديث.'
      );
      return;
    }

    stopAllAudio();
    setIsPlaying(false);
    setIsExportingVideo(true);
    setExportProgressPct(0);
    setExportMessage(
      'جاري تجهيز صوت المعلم الرجالي والرسومات المتحركة لإنتاج الفيديو...'
    );

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }
      const dest = audioCtx.createMediaStreamDestination();

      // Pre-fetch & decode male teacher tracks for each scene so exported video has real voice
      const sceneTracks: Array<{ buffer: AudioBuffer; rate: number } | null> = [];
      for (let i = 0; i < script.scenes.length; i++) {
        setExportProgressPct(Math.round(((i + 0.5) / script.scenes.length) * 18));
        const item = await fetchMaleTeacherAudio(
          script.scenes[i].narration,
          voiceStyle
        );
        if (item?.base64) {
          try {
            const bytes = base64ToUint8Array(item.base64);
            const bufCopy = bytes.buffer.slice(0) as ArrayBuffer;
            const decoded = await audioCtx.decodeAudioData(bufCopy);
            const rate = item.needsMalePitchTune
              ? voiceStyle === 'calm_teacher'
                ? 0.87
                : voiceStyle === 'energetic_teacher'
                ? 0.94
                : 0.91
              : 1;
            sceneTracks.push({ buffer: decoded, rate });
          } catch {
            sceneTracks.push(null);
          }
        } else {
          sceneTracks.push(null);
        }
      }

      setExportMessage('جاري تصوير السبورة ودمج صوت الشرح في الفيديو...');

      const canvasStream = canvas.captureStream(30);
      const playCue = (freq: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.04, audioCtx.currentTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0005, audioCtx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      };

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
      });

      recorder.start(250);

      const sceneDurationsMs = script.scenes.map((_, idx) => {
        const tr = sceneTracks[idx];
        return tr
          ? Math.max(4500, Math.round((tr.buffer.duration / tr.rate) * 1000) + 550)
          : 4500;
      });
      const totalExportMs = sceneDurationsMs.reduce((a, b) => a + b, 0);
      let completedMs = 0;

      for (let sIdx = 0; sIdx < script.scenes.length; sIdx++) {
        playCue(528 + sIdx * 55);
        const track = sceneTracks[sIdx];
        if (track) {
          const srcNode = audioCtx.createBufferSource();
          srcNode.buffer = track.buffer;
          srcNode.playbackRate.value = track.rate;
          srcNode.connect(dest);
          srcNode.start(audioCtx.currentTime + 0.12);
        }

        setCurrentSceneIdx(sIdx);
        const exportSceneMs = sceneDurationsMs[sIdx];
        const startTime = performance.now();

        await new Promise<void>((resolve) => {
          const step = () => {
            const now = performance.now();
            const el = Math.max(0, now - startTime);
            const prog = Math.max(0, Math.min(1, el / exportSceneMs));
            setSceneProgress(prog);
            renderWhiteboardFrame(ctx, script, sIdx, prog, now);

            const overall = Math.min(
              99,
              20 + Math.round(((completedMs + el) / Math.max(1, totalExportMs)) * 79)
            );
            setExportProgressPct(overall);

            if (prog >= 1) {
              resolve();
            } else {
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        });
        completedMs += exportSceneMs;
      }

      recorder.stop();
      const blob = await recordingDone;
      await audioCtx.close().catch(() => {});

      const safeTitle = script.lesson
        .replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g, '-')
        .slice(0, 40);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `شرح-سبورة-${safeTitle || 'نهج'}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      setExportProgressPct(100);
      setExportMessage(
        sceneTracks.some(Boolean)
          ? 'تم حفظ فيديو الشرح كاملاً بصوت المعلم الرجالي والرسومات على جهازك!'
          : 'تم حفظ فيديو السبورة المتحركة على جهازك بنجاح!'
      );
      onAwardBonusXp?.(20);
    } catch (err) {
      console.error('Video export error:', err);
      setExportMessage('تعذر تصدير الفيديو حالياً، تأكد من السماح بالتحميل المباشر.');
    } finally {
      setIsExportingVideo(false);
    }
  };

  const activeScene = script.scenes[currentSceneIdx] || script.scenes[0];

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Header */}
      <header className="bg-gradient-to-l from-[#1C1B22] via-[#121217] to-[#08080A] border border-[#D4AF37]/45 rounded-3xl p-5 sm:p-6 text-[#F4EFE6] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl btn-luxury-gold flex items-center justify-center shrink-0">
            <Presentation className="w-6 h-6 text-[#09090B]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#F6E2A6]">
              سبورة أستاذ نَهج — شرح الكتاب المدرسي بالصوت الرجالي والفيديو
            </h1>
            <p className="text-xs sm:text-sm text-[#D8CEB8] leading-relaxed mt-0.5">
              شرح منهجي عميق على مستوى الكتب المعتمدة وكبار المعلمين: رسومات متحركة، قلم يكتب، صوت معلم رجل صافي بدون أخطاء، وحفظ الفيديو بالصوت
            </p>
          </div>
        </div>
      </header>

      {/* Curriculum & Teacher Voice Selector Controls */}
      <section className="bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/30 rounded-3xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-zinc-700 dark:text-[#E8CE88] block">
              المادة الدراسية
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 text-xs sm:text-sm font-bold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
            >
              {curriculum.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-zinc-700 dark:text-[#E8CE88] block">
              الباب / الفصل
            </label>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 text-xs sm:text-sm font-bold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
            >
              {(activeSubject?.chapters || []).map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-zinc-700 dark:text-[#E8CE88] block">
              الدرس المراد شرحه
            </label>
            <select
              value={selectedLessonTitle}
              onChange={(e) => setSelectedLessonTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/30 text-xs sm:text-sm font-bold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
            >
              {(activeChapter?.lessons || []).map((l) => (
                <option key={l.id} value={l.title}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Male Teacher Voice Style Selection */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs font-black text-zinc-800 dark:text-[#E8CE88]">
            <Mic className="w-4 h-4 text-[#D4AF37]" />
            <span>نبرة صوت المعلم (صوت رجل):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 grow max-w-3xl">
            {VOICE_STYLE_OPTIONS.map((opt) => {
              const active = voiceStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVoiceStyle(opt.id)}
                  className={`px-3 py-2 rounded-xl border text-right transition-all cursor-pointer ${
                    active
                      ? 'btn-luxury-gold text-[#09090B] font-black'
                      : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-800 dark:text-[#F4EFE6] hover:border-[#D4AF37]'
                  }`}
                >
                  <span className="text-xs font-black block">{opt.label}</span>
                  <span
                    className={`text-[10px] block ${
                      active ? 'text-[#09090B]/80' : 'text-zinc-500 dark:text-[#B5AA92]'
                    }`}
                  >
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={customLessonInput}
            onChange={(e) => setCustomLessonInput(e.target.value)}
            placeholder="أو اكتب عنوان درس/جزئية محددة مباشرة (اختياري — مثال: قانون كيرشوف الثاني أو تضاعف DNA)"
            className="grow px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#09090C] border border-zinc-300 dark:border-[#D4AF37]/25 text-xs font-bold text-zinc-950 dark:text-[#F4EFE6] focus:outline-none focus:border-[#D4AF37]"
          />
          <button
            type="button"
            onClick={handleGenerateLesson}
            disabled={isGenerating || isExportingVideo}
            className="px-6 py-2.5 btn-luxury-gold text-[#09090B] rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تحضير شرح الكتاب...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>اشرح الدرس على السبورة</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Live Interactive HD Canvas Chalkboard Player */}
      <section className="bg-white dark:bg-[#19191F] border border-amber-200/80 dark:border-[#D4AF37]/40 rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-950 dark:text-[#F6E2A6]">
              {script.introTitle}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-[#B5AA92]">
              {script.providerLabel || 'أستاذ نَهج'} · {script.scenes.length} مراحل منهجية · {voiceStatusNote}
            </p>
          </div>

          {/* Export Video CTA */}
          <button
            type="button"
            onClick={handleExportVideo}
            disabled={isExportingVideo || isGenerating}
            className="px-4 py-2.5 btn-luxury-gold text-[#09090B] rounded-xl text-xs font-black flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isExportingVideo ? (
              <>
                <Film className="w-4 h-4 animate-pulse" />
                <span>جاري التصدير ({exportProgressPct}%)</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>حفظ الشرح كفيديو بالصوت (.webm)</span>
              </>
            )}
          </button>
        </div>

        {exportMessage && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-[#09090C] border border-[#D4AF37]/45 text-xs font-bold text-[#9A7218] dark:text-[#F3DFA2] flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {exportMessage}
            </span>
            {isExportingVideo && (
              <span className="font-mono tabular-nums" dir="ltr">
                {exportProgressPct}%
              </span>
            )}
          </div>
        )}

        {/* HD Canvas Stage */}
        <div className="rounded-2xl overflow-hidden border-2 border-[#D4AF37]/45 bg-[#080A0C] shadow-xl relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full h-auto block aspect-video"
          />
          {isLoadingAudio && isPlaying && (
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-[#09090C]/85 border border-[#D4AF37]/50 text-[11px] font-bold text-[#F6E2A6] flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
              <span>جاري تجهيز صوت المعلم...</span>
            </div>
          )}
        </div>

        {/* Transport & Narration Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                unlockAudioSync();
                if (
                  !isPlaying &&
                  sceneProgress >= 0.99 &&
                  currentSceneIdx === script.scenes.length - 1
                ) {
                  setCurrentSceneIdx(0);
                  setSceneProgress(0);
                  sceneProgressRef.current = 0;
                } else if (!isPlaying && sceneProgress >= 0.99) {
                  setSceneProgress(0);
                  sceneProgressRef.current = 0;
                }
                setIsPlaying((p) => {
                  const next = !p;
                  if (!next) stopAllAudio();
                  return next;
                });
              }}
              disabled={isExportingVideo}
              className="px-4 py-2 btn-luxury-gold text-[#09090B] rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'إيقاف مؤقت' : 'تشغيل الشرح بالصوت'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                unlockAudioSync();
                stopAllAudio();
                setIsPlaying(false);
                setCurrentSceneIdx(0);
                setSceneProgress(0);
                sceneProgressRef.current = 0;
                setTimeout(() => setIsPlaying(true), 40);
              }}
              disabled={isExportingVideo}
              title="إعادة من البداية"
              className="p-2 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-700 dark:text-[#E8CE88] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                unlockAudioSync();
                stopAllAudio();
                setCurrentSceneIdx((idx) => Math.max(0, idx - 1));
                setSceneProgress(0);
                sceneProgressRef.current = 0;
              }}
              disabled={currentSceneIdx === 0 || isExportingVideo}
              className="p-2 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-700 dark:text-[#E8CE88] disabled:opacity-40 cursor-pointer"
              title="المشهد السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                unlockAudioSync();
                stopAllAudio();
                setCurrentSceneIdx((idx) =>
                  Math.min(script.scenes.length - 1, idx + 1)
                );
                setSceneProgress(0);
                sceneProgressRef.current = 0;
              }}
              disabled={
                currentSceneIdx >= script.scenes.length - 1 || isExportingVideo
              }
              className="p-2 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 text-zinc-700 dark:text-[#E8CE88] disabled:opacity-40 cursor-pointer"
              title="المشهد التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaybackSpeed((s) => (s === 1 ? 1.25 : 1))}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-mono font-black text-zinc-800 dark:text-[#E8CE88] cursor-pointer"
            >
              {playbackSpeed}x
            </button>

            <button
              type="button"
              onClick={() => {
                unlockAudioSync();
                setVoiceEnabled((v) => {
                  const next = !v;
                  if (!next) stopAllAudio();
                  return next;
                });
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/25 text-xs font-bold text-zinc-800 dark:text-[#E8CE88] flex items-center gap-1.5 cursor-pointer"
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4 text-[#D4AF37]" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span>{voiceEnabled ? 'صوت المعلم مفعل' : 'صامت'}</span>
            </button>
          </div>
        </div>

        {/* Scene Timeline */}
        <div
          className={`grid gap-2.5 ${
            script.scenes.length >= 6
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
          }`}
        >
          {script.scenes.map((sc, idx) => {
            const isActive = idx === currentSceneIdx;
            return (
              <button
                key={sc.id}
                type="button"
                disabled={isExportingVideo}
                onClick={() => {
                  unlockAudioSync();
                  stopAllAudio();
                  setCurrentSceneIdx(idx);
                  setSceneProgress(0);
                  sceneProgressRef.current = 0;
                  setVoiceEnabled(true);
                  setIsPlaying(true);
                }}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                  isActive
                    ? 'btn-luxury-gold text-[#09090B] font-black'
                    : 'bg-zinc-50 dark:bg-[#09090C] border-zinc-200 dark:border-[#D4AF37]/20 text-zinc-800 dark:text-[#F4EFE6] hover:border-[#D4AF37]'
                }`}
              >
                <span className="text-xs font-black block truncate">{sc.title}</span>
                <span
                  className={`text-[11px] block mt-0.5 truncate ${
                    isActive ? 'text-[#09090B]/80' : 'text-zinc-500 dark:text-[#B5AA92]'
                  }`}
                >
                  {sc.diagramTitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Textbook Notes & Full Teacher Explanation Read-Along */}
        {activeScene && (
          <div className="bg-zinc-50 dark:bg-[#09090C] border border-zinc-200 dark:border-[#D4AF37]/25 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="text-sm font-black text-zinc-900 dark:text-[#F6E2A6]">
                  دفتر الكتاب المدرسي — {activeScene.title}
                </h3>
              </div>
              {script.lessonObjective && (
                <span className="text-[11px] font-bold text-zinc-500 dark:text-[#B5AA92]">
                  {script.lessonObjective}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-zinc-800 dark:text-[#F4EFE6] bg-white dark:bg-[#19191F] p-3.5 rounded-xl border border-zinc-200 dark:border-[#D4AF37]/20">
              <span className="font-black text-[#D4AF37] ml-1.5">كلام المعلم:</span>
              {activeScene.narration}
            </p>

            {activeScene.textbookKeyPoints && activeScene.textbookKeyPoints.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {activeScene.textbookKeyPoints.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-[#19191F] border border-zinc-200 dark:border-[#D4AF37]/20 text-xs font-semibold text-zinc-800 dark:text-[#E8DFC8] leading-relaxed"
                  >
                    <span className="font-black text-[#D4AF37] ml-1">★</span>
                    {pt}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
