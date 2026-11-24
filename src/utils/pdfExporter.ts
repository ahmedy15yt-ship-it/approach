import { LessonMasterSummary } from '../types';

/**
 * Pure TypeScript high-DPI Arabic RTL Canvas -> PDF 1.4 binary builder.
 * Renders crisp Egyptian curriculum teacher study sheets with zero broken Arabic ligatures
 * and zero popups / window.open dependencies.
 */

const PAGE_W = 1240; // A4 @ ~150 DPI
const PAGE_H = 1754;
const MARGIN_X = 76;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const TOP_SAFE_Y = 92;
const BOTTOM_SAFE_Y = PAGE_H - 86;

const PALETTE = {
  paperBg: '#FFFEFA',
  headerDark: '#121216',
  cardBg: '#FBF8F0',
  cardAltBg: '#F5EFE0',
  trapBg: '#FDF2F2',
  trapBorder: '#DC2626',
  answerBg: '#ECFDF5',
  answerBorder: '#059669',
  gold: '#C59B27',
  goldDark: '#8F6A14',
  goldLight: '#F3DFA2',
  border: '#E5D7B3',
  ink: '#141417',
  inkMuted: '#524B3E',
};

function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function wrapRtlText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const clean = String(text || '').replace(/\r/g, '').trim();
  if (!clean) return [];

  const paragraphs = clean.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        // Handle extra-long unbroken tokens safely
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            const nextChunk = chunk + ch;
            if (ctx.measureText(nextChunk).width > maxWidth && chunk) {
              lines.push(chunk);
              chunk = ch;
            } else {
              chunk = nextChunk;
            }
          }
          currentLine = chunk;
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle?: string,
  strokeStyle?: string,
  lineWidth = 1.5
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
}

class PdfCanvasPaginator {
  private pages: HTMLCanvasElement[] = [];
  private currentCanvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private cursorY = TOP_SAFE_Y;
  private summary: LessonMasterSummary;

  constructor(summary: LessonMasterSummary) {
    this.summary = summary;
    this.startNewPage(true);
  }

  private startNewPage(isFirstPage = false) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d')!;
    ctx.direction = 'rtl';
    ctx.textBaseline = 'top';

    // Background paper
    ctx.fillStyle = PALETTE.paperBg;
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // Subtle luxury top gold bar
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(0, 0, PAGE_W, 10);

    if (isFirstPage) {
      // Luxury Header Banner
      drawRoundedRect(ctx, MARGIN_X, 34, CONTENT_W, 196, 22, PALETTE.headerDark, PALETTE.gold, 2);

      // Gold badge line inside header
      ctx.fillStyle = PALETTE.goldLight;
      ctx.font = 'bold 20px Cairo, Tajawal, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        `نَهْج — مذكرة المستر التفصيلية | الصف الثالث الثانوي`,
        PAGE_W - MARGIN_X - 28,
        56
      );

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 32px Cairo, Tajawal, sans-serif';
      const titleLines = wrapRtlText(ctx, this.summary.lesson, CONTENT_W - 56).slice(0, 2);
      titleLines.forEach((line, idx) => {
        ctx.fillText(line, PAGE_W - MARGIN_X - 28, 94 + idx * 42);
      });

      ctx.fillStyle = '#D6CEBE';
      ctx.font = '600 20px Cairo, Tajawal, sans-serif';
      ctx.fillText(
        `المادة: ${this.summary.subject}   ·   ${this.summary.chapter}`.slice(0, 82),
        PAGE_W - MARGIN_X - 28,
        186
      );

      this.cursorY = 256;
    } else {
      // Compact running header on subsequent pages
      ctx.fillStyle = PALETTE.goldDark;
      ctx.font = '700 18px Cairo, Tajawal, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        `مذكرة نَهج — ${this.summary.subject}: ${this.summary.lesson}`.slice(0, 78),
        PAGE_W - MARGIN_X,
        36
      );

      ctx.strokeStyle = PALETTE.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, 68);
      ctx.lineTo(PAGE_W - MARGIN_X, 68);
      ctx.stroke();

      this.cursorY = TOP_SAFE_Y;
    }

    this.currentCanvas = canvas;
    this.ctx = ctx;
    this.pages.push(canvas);
  }

  public ensureSpace(neededHeight: number) {
    if (this.cursorY + neededHeight > BOTTOM_SAFE_Y) {
      this.startNewPage(false);
    }
  }

  public drawSectionTitle(title: string) {
    this.ensureSpace(70);
    this.cursorY += 8;

    const ctx = this.ctx;
    // Small gold square marker
    drawRoundedRect(ctx, PAGE_W - MARGIN_X - 14, this.cursorY + 10, 14, 24, 4, PALETTE.gold);

    ctx.fillStyle = PALETTE.ink;
    ctx.font = '800 27px Cairo, Tajawal, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(title, PAGE_W - MARGIN_X - 26, this.cursorY + 2);

    this.cursorY += 48;
  }

  public drawParagraphBox(
    label: string,
    body: string,
    options?: { bg?: string; border?: string; labelColor?: string }
  ) {
    const ctx = this.ctx;
    const padX = 24;
    const padY = 20;
    const innerW = CONTENT_W - padX * 2;

    ctx.font = '800 22px Cairo, Tajawal, sans-serif';
    const labelLines = label ? wrapRtlText(ctx, label, innerW) : [];

    ctx.font = '500 21px Cairo, Tajawal, sans-serif';
    const bodyLines = wrapRtlText(ctx, body, innerW);

    const boxH =
      padY * 2 +
      labelLines.length * 32 +
      (labelLines.length > 0 ? 8 : 0) +
      bodyLines.length * 34;

    this.ensureSpace(boxH + 14);

    drawRoundedRect(
      this.ctx,
      MARGIN_X,
      this.cursorY,
      CONTENT_W,
      boxH,
      16,
      options?.bg || PALETTE.cardBg,
      options?.border || PALETTE.border,
      1.5
    );

    let y = this.cursorY + padY;
    this.ctx.textAlign = 'right';

    if (labelLines.length > 0) {
      this.ctx.fillStyle = options?.labelColor || PALETTE.goldDark;
      this.ctx.font = '800 22px Cairo, Tajawal, sans-serif';
      for (const line of labelLines) {
        this.ctx.fillText(line, PAGE_W - MARGIN_X - padX, y);
        y += 32;
      }
      y += 8;
    }

    this.ctx.fillStyle = PALETTE.ink;
    this.ctx.font = '500 21px Cairo, Tajawal, sans-serif';
    for (const line of bodyLines) {
      if (line) {
        this.ctx.fillText(line, PAGE_W - MARGIN_X - padX, y);
      }
      y += 34;
    }

    this.cursorY += boxH + 18;
  }

  public drawConceptCard(
    index: number,
    section: LessonMasterSummary['conceptSections'][number]
  ) {
    const ctx = this.ctx;
    const padX = 24;
    const padY = 22;
    const innerW = CONTENT_W - padX * 2;

    ctx.font = '800 24px Cairo, Tajawal, sans-serif';
    const titleLines = wrapRtlText(ctx, `${index + 1}. ${section.title}`, innerW);

    ctx.font = '500 21px Cairo, Tajawal, sans-serif';
    const expLines = wrapRtlText(ctx, section.deepExplanation, innerW);
    const whyLines = wrapRtlText(ctx, `لماذا نفهمها؟ ${section.whyItMatters}`, innerW);
    const exLines = wrapRtlText(ctx, `مثال واقعي: ${section.realLifeExample}`, innerW);

    const takeawayLines: string[] = [];
    for (const tk of section.keyTakeaways || []) {
      const wrapped = wrapRtlText(ctx, `• ${tk}`, innerW - 10);
      takeawayLines.push(...wrapped);
    }

    const totalH =
      padY * 2 +
      titleLines.length * 36 +
      10 +
      expLines.length * 34 +
      12 +
      whyLines.length * 32 +
      8 +
      exLines.length * 32 +
      (takeawayLines.length > 0 ? 12 + takeawayLines.length * 31 : 0);

    // If a single concept card is reasonably sized, keep it together on one page
    if (totalH <= BOTTOM_SAFE_Y - TOP_SAFE_Y - 20) {
      this.ensureSpace(totalH + 14);
    } else {
      this.ensureSpace(180);
    }

    drawRoundedRect(
      this.ctx,
      MARGIN_X,
      this.cursorY,
      CONTENT_W,
      Math.min(totalH, BOTTOM_SAFE_Y - this.cursorY),
      16,
      '#FFFFFF',
      PALETTE.border,
      1.5
    );

    let y = this.cursorY + padY;
    this.ctx.textAlign = 'right';

    this.ctx.fillStyle = PALETTE.goldDark;
    this.ctx.font = '800 24px Cairo, Tajawal, sans-serif';
    for (const line of titleLines) {
      this.ctx.fillText(line, PAGE_W - MARGIN_X - padX, y);
      y += 36;
    }
    y += 10;

    this.ctx.fillStyle = PALETTE.ink;
    this.ctx.font = '500 21px Cairo, Tajawal, sans-serif';
    for (const line of expLines) {
      if (y + 34 > BOTTOM_SAFE_Y) {
        this.startNewPage(false);
        y = this.cursorY;
      }
      if (line) this.ctx.fillText(line, PAGE_W - MARGIN_X - padX, y);
      y += 34;
    }
    y += 12;

    this.ctx.fillStyle = PALETTE.inkMuted;
    this.ctx.font = '600 20px Cairo, Tajawal, sans-serif';
    for (const line of whyLines) {
      if (y + 32 > BOTTOM_SAFE_Y) {
        this.startNewPage(false);
        y = this.cursorY;
      }
      if (line) this.ctx.fillText(line, PAGE_W - MARGIN_X - padX, y);
      y += 32;
    }
    y += 8;

    this.ctx.fillStyle = PALETTE.goldDark;
    this.ctx.font = '700 20px Cairo, Tajawal, sans-serif';
    for (const line of exLines) {
      if (y + 32 > BOTTOM_SAFE_Y) {
        this.startNewPage(false);
        y = this.cursorY;
      }
      if (line) this.ctx.fillText(line, PAGE_W - MARGIN_X - padX, y);
      y += 32;
    }

    if (takeawayLines.length > 0) {
      y += 12;
      this.ctx.fillStyle = PALETTE.ink;
      this.ctx.font = '600 19px Cairo, Tajawal, sans-serif';
      for (const line of takeawayLines) {
        if (y + 31 > BOTTOM_SAFE_Y) {
          this.startNewPage(false);
          y = this.cursorY;
        }
        if (line) this.ctx.fillText(line, PAGE_W - MARGIN_X - padX - 8, y);
        y += 31;
      }
    }

    this.cursorY = y + padY + 14;
  }

  public drawSolvedQuestionCard(
    index: number,
    q: LessonMasterSummary['solvedQuestions'][number]
  ) {
    const ctx = this.ctx;
    const padX = 24;
    const padY = 20;
    const innerW = CONTENT_W - padX * 2;

    ctx.font = '800 22px Cairo, Tajawal, sans-serif';
    const qLines = wrapRtlText(ctx, `س${index + 1} (${q.questionType}): ${q.question}`, innerW);

    ctx.font = '500 20px Cairo, Tajawal, sans-serif';
    const stepLines: string[] = [];
    q.steps.forEach((s, idx) => {
      stepLines.push(...wrapRtlText(ctx, `${idx + 1}) ${s}`, innerW - 10));
    });

    ctx.font = '700 21px Cairo, Tajawal, sans-serif';
    const ansLines = wrapRtlText(ctx, `✔ الإجابة النموذجية: ${q.answer}`, innerW);

    ctx.font = '600 19px Cairo, Tajawal, sans-serif';
    const noteLines = wrapRtlText(ctx, `ملاحظة المستر: ${q.teacherNote}`, innerW);

    const estH =
      padY * 2 +
      qLines.length * 34 +
      10 +
      stepLines.length * 31 +
      10 +
      ansLines.length * 33 +
      8 +
      noteLines.length * 30;

    this.ensureSpace(Math.min(estH + 14, BOTTOM_SAFE_Y - TOP_SAFE_Y));

    drawRoundedRect(
      this.ctx,
      MARGIN_X,
      this.cursorY,
      CONTENT_W,
      Math.min(estH, BOTTOM_SAFE_Y - this.cursorY),
      16,
      PALETTE.cardBg,
      PALETTE.border,
      1.5
    );

    let y = this.cursorY + padY;
    this.ctx.textAlign = 'right';

    this.ctx.fillStyle = PALETTE.ink;
    this.ctx.font = '800 22px Cairo, Tajawal, sans-serif';
    for (const line of qLines) {
      if (y + 34 > BOTTOM_SAFE_Y) {
        this.startNewPage(false);
        y = this.cursorY;
      }
      this.ctx.fillText(line, PAGE_W - MARGIN_X - padX, y);
      y += 34;
    }
    y += 10;

    this.ctx.fillStyle = PALETTE.inkMuted;
    this.ctx.font = '500 20px Cairo, Tajawal, sans-serif';
    for (const line of stepLines) {
      if (y + 31 > BOTTOM_SAFE_Y) {
        this.startNewPage(false);
        y = this.cursorY;
      }
      this.ctx.fillText(line, PAGE_W - MARGIN_X - padX - 8, y);
      y += 31;
    }
    y += 10;

    this.ctx.fillStyle = PALETTE.answerBorder;
    this.ctx.font = '700 21px Cairo, Tajawal, sans-serif';
    for (const line of ansLines) {
      if (y + 33 > BOTTOM_SAFE_Y) {
        this.startNewPage(false);
        y = this.cursorY;
      }
      this.ctx.fillText(line, PAGE_W - MARGIN_X - padX, y);
      y += 33;
    }
    y += 8;

    this.ctx.fillStyle = PALETTE.goldDark;
    this.ctx.font = '600 19px Cairo, Tajawal, sans-serif';
    for (const line of noteLines) {
      if (y + 30 > BOTTOM_SAFE_Y) {
        this.startNewPage(false);
        y = this.cursorY;
      }
      this.ctx.fillText(line, PAGE_W - MARGIN_X - padX, y);
      y += 30;
    }

    this.cursorY = y + padY + 14;
  }

  public finalizeJpegDataUrls(): string[] {
    const total = this.pages.length;
    this.pages.forEach((canvas, idx) => {
      const ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = PALETTE.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, PAGE_H - 64);
      ctx.lineTo(PAGE_W - MARGIN_X, PAGE_H - 64);
      ctx.stroke();

      ctx.fillStyle = PALETTE.inkMuted;
      ctx.font = '700 18px Cairo, Tajawal, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('منصة نَهج — أفضل نسخة منك (علمي علوم)', PAGE_W - MARGIN_X, PAGE_H - 46);

      ctx.textAlign = 'left';
      ctx.fillText(`صفحة ${idx + 1} من ${total}`, MARGIN_X, PAGE_H - 46);
    });

    return this.pages.map((c) => c.toDataURL('image/jpeg', 0.92));
  }
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes an array of A4 JPEG images into a valid PDF 1.4 binary Uint8Array.
 */
function buildPdfFromJpegPages(jpegDataUrls: string[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0]; // obj 0 unused
  let currentOffset = 0;

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  const pushString = (str: string) => {
    pushBytes(encoder.encode(str));
  };

  pushString('%PDF-1.4\n');
  pushBytes(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const pageCount = jpegDataUrls.length;
  // Object numbers:
  // 1: Catalog
  // 2: Pages
  // For page i (0..pageCount-1):
  //   pageObj = 3 + i * 3
  //   contentObj = 4 + i * 3
  //   imageObj = 5 + i * 3
  const pageObjIds: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    pageObjIds.push(3 + i * 3);
  }

  // Obj 1: Catalog
  offsets[1] = currentOffset;
  pushString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  offsets[2] = currentOffset;
  pushString(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>\nendobj\n`
  );

  // A4 size in PDF points: 595.28 x 841.89
  const pdfW = '595.28';
  const pdfH = '841.89';

  for (let i = 0; i < pageCount; i++) {
    const pageObjId = 3 + i * 3;
    const contentObjId = 4 + i * 3;
    const imageObjId = 5 + i * 3;
    const imgBytes = dataUrlToUint8Array(jpegDataUrls[i]);

    // Page object
    offsets[pageObjId] = currentOffset;
    pushString(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] /Resources << /XObject << /Im0 ${imageObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );

    // Content stream drawing Im0 full-bleed onto A4
    const contentStream = `q\n${pdfW} 0 0 ${pdfH} 0 0 cm\n/Im0 Do\nQ\n`;
    offsets[contentObjId] = currentOffset;
    pushString(
      `${contentObjId} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
    );

    // Image XObject
    offsets[imageObjId] = currentOffset;
    pushString(
      `${imageObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${PAGE_W} /Height ${PAGE_H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`
    );
    pushBytes(imgBytes);
    pushString('\nendstream\nendobj\n');
  }

  const totalObjects = 2 + pageCount * 3;
  const xrefOffset = currentOffset;
  pushString(`xref\n0 ${totalObjects + 1}\n`);
  pushString('0000000000 65535 f \n');
  for (let id = 1; id <= totalObjects; id++) {
    const off = String(offsets[id] || 0).padStart(10, '0');
    pushString(`${off} 00000 n \n`);
  }
  pushString(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  const outputBuffer = new ArrayBuffer(currentOffset);
  const output = new Uint8Array(outputBuffer);
  let pos = 0;
  for (const chunk of chunks) {
    output.set(chunk, pos);
    pos += chunk.length;
  }
  return output;
}

export async function downloadLessonSummaryPdf(
  summary: LessonMasterSummary
): Promise<{ fileName: string; pageCount: number }> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with available system Arabic fonts
    }
  }

  const paginator = new PdfCanvasPaginator(summary);

  paginator.drawParagraphBox('مقدمة المستر للدرس', summary.teacherIntro, {
    bg: PALETTE.cardAltBg,
    border: PALETTE.gold,
    labelColor: PALETTE.goldDark,
  });

  paginator.drawParagraphBox('الفكرة المحورية للدرس', summary.bigIdea, {
    bg: '#FFFFFF',
    border: PALETTE.border,
    labelColor: PALETTE.goldDark,
  });

  paginator.drawSectionTitle('أولاً: الشرح التفصيلي بالفهم العميق');
  summary.conceptSections.forEach((sec, idx) => {
    paginator.drawConceptCard(idx, sec);
  });

  if (summary.formulasAndRules.length > 0) {
    paginator.drawSectionTitle('ثانياً: القوانين والعلاقات الأساسية');
    summary.formulasAndRules.forEach((item) => {
      paginator.drawParagraphBox(
        item.label,
        `${item.expression}\nمتى نستخدمها؟ ${item.whenToUse}`,
        { bg: PALETTE.cardBg, border: PALETTE.gold }
      );
    });
  }

  if (summary.examTraps.length > 0) {
    paginator.drawSectionTitle('ثالثاً: تريكات المستر ومصائد الامتحان');
    summary.examTraps.forEach((item, idx) => {
      paginator.drawParagraphBox(
        `تريكة #${idx + 1} — انتبه لهذا الخطأ الشائع`,
        `✖ الخطأ الشائع: ${item.trap}\n✔ الفهم الصحيح: ${item.truth}`,
        { bg: PALETTE.trapBg, border: '#FCA5A5', labelColor: PALETTE.trapBorder }
      );
    });
  }

  if (summary.solvedQuestions.length > 0) {
    paginator.drawSectionTitle('رابعاً: أسئلة محلولة بالفهم والخطوات');
    summary.solvedQuestions.forEach((q, idx) => {
      paginator.drawSolvedQuestionCard(idx, q);
    });
  }

  if (summary.quickCheckQuestions.length > 0) {
    paginator.drawSectionTitle('خامساً: مراجعة سريعة (اختبر نفسك)');
    summary.quickCheckQuestions.forEach((q, idx) => {
      paginator.drawParagraphBox(
        `سؤال سريع ${idx + 1}: ${q.question}`,
        `✔ الإجابة: ${q.answer}\nالتعليل بالفهم: ${q.explanation}`,
        { bg: PALETTE.answerBg, border: '#A7F3D0', labelColor: PALETTE.answerBorder }
      );
    });
  }

  const jpegPages = paginator.finalizeJpegDataUrls();
  const pdfBytes = buildPdfFromJpegPages(jpegPages);

  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const fileName = `ملخص-${sanitizeFileName(summary.subject)}-${sanitizeFileName(summary.lesson)}.pdf`;

  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(blobUrl), 6000);

  return { fileName, pageCount: jpegPages.length };
}
