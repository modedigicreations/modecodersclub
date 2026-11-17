import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// Course handbook PDF: cover, contents, every lesson (code in a monospace
// font), its quiz questions (answers left out so the PDF can't be used to
// pass the online quizzes) and lab tasks. Built on demand from the saved
// course, so it always matches what learners see on screen.

export type HandbookCourse = {
  name: string;
  level: string;
  description: string;
  audience: string;
  duration: string;
  outcomes: string[];
  isDraft: boolean;
  lessons: {
    title: string;
    content: string;
    isPublished: boolean;
    assessment: { questions: unknown } | null;
    lab: { instructions: string } | null;
  }[];
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const INK = rgb(0.125, 0.149, 0.188);
const MUTED = rgb(0.4, 0.43, 0.48);
const ACCENT = rgb(0.055, 0.608, 0.443);

/** Standard PDF fonts only cover WinAnsi: map common typography, drop the rest. */
export function pdfSafe(text: string): string {
  return text
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[•●▪]/g, "-")
    .replace(/…/g, "...")
    .replace(/₦/g, "NGN ")
    .replace(/ /g, " ")
    .replace(/\t/g, "    ")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\x20-\x7E\n]/g, "");
}

class Writer {
  page!: PDFPage;
  y = 0;
  pages: PDFPage[] = [];
  constructor(
    private pdf: PDFDocument,
    private fonts: { regular: PDFFont; bold: PDFFont; mono: PDFFont; italic: PDFFont },
    private footer: string,
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.pdf.addPage(A4);
    this.pages.push(this.page);
    this.y = A4[1] - MARGIN;
  }
  ensure(height: number) {
    if (this.y - height < MARGIN + 20) this.newPage();
  }
  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const lines: string[] = [];
    for (const raw of text.split("\n")) {
      if (!raw.trim()) {
        lines.push("");
        continue;
      }
      let line = "";
      for (const word of raw.split(/(\s+)/)) {
        const candidate = line + word;
        if (font.widthOfTextAtSize(candidate, size) <= width) {
          line = candidate;
          continue;
        }
        if (line.trim()) lines.push(line.trimEnd());
        line = word.trimStart();
        // A single token wider than the line (URL, long code): break by characters.
        while (font.widthOfTextAtSize(line, size) > width) {
          let cut = line.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
          lines.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      }
      lines.push(line.trimEnd());
    }
    return lines;
  }
  text(text: string, opts: { font?: keyof Writer["fonts"]; size?: number; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) {
    const font = this.fonts[opts.font ?? "regular"];
    const size = opts.size ?? 10.5;
    const indent = opts.indent ?? 0;
    const lineHeight = size * 1.45;
    for (const line of this.wrap(pdfSafe(text), font, size, A4[0] - MARGIN * 2 - indent)) {
      this.ensure(lineHeight);
      if (line) this.page.drawText(line, { x: MARGIN + indent, y: this.y - size, size, font, color: opts.color ?? INK });
      this.y -= lineHeight;
    }
    this.y -= opts.gap ?? 4;
  }
  /** Lesson body: 4-space-indented lines are code (monospace), the rest prose. */
  body(content: string) {
    const blocks: { code: boolean; lines: string[] }[] = [];
    for (const line of content.replace(/\r\n/g, "\n").split("\n")) {
      const code = /^( {4}|\t)/.test(line);
      const last = blocks.at(-1);
      if (last && last.code === code) last.lines.push(code ? line.replace(/^( {4}|\t)/, "") : line);
      else blocks.push({ code, lines: [code ? line.replace(/^( {4}|\t)/, "") : line] });
    }
    for (const b of blocks) {
      if (b.code) this.text(b.lines.join("\n"), { font: "mono", size: 9, indent: 14, gap: 8 });
      else this.text(b.lines.join("\n"), { gap: 6 });
    }
  }
  rule() {
    this.ensure(14);
    this.page.drawLine({ start: { x: MARGIN, y: this.y - 4 }, end: { x: A4[0] - MARGIN, y: this.y - 4 }, thickness: 0.6, color: ACCENT });
    this.y -= 14;
  }
  finish() {
    this.pages.forEach((p, i) => {
      const label = pdfSafe(`${this.footer}  |  Page ${i + 1} of ${this.pages.length}`);
      p.drawText(label, { x: MARGIN, y: 30, size: 8, font: this.fonts.regular, color: MUTED });
    });
  }
}

function questionsOf(assessment: { questions: unknown } | null): { question: string; options: string[] }[] {
  if (!assessment || !Array.isArray(assessment.questions)) return [];
  return (assessment.questions as { question?: unknown; options?: unknown }[])
    .filter((q) => typeof q?.question === "string" && Array.isArray(q.options))
    .map((q) => ({ question: String(q.question), options: (q.options as unknown[]).map(String) }));
}

export async function buildCourseHandbook(course: HandbookCourse): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(pdfSafe(`${course.name} - Course handbook`));
  pdf.setAuthor("Mode Coders Club");
  pdf.setCreator("Mode Coders Club");
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    mono: await pdf.embedFont(StandardFonts.Courier),
  };
  const w = new Writer(pdf, fonts, `${course.name} - Mode Coders Club course handbook`);

  // Cover
  w.y -= 120;
  w.text("MODE CODERS CLUB", { font: "bold", size: 11, color: ACCENT, gap: 18 });
  w.text(course.name, { font: "bold", size: 30, gap: 10 });
  w.text(course.level, { font: "italic", size: 14, color: MUTED, gap: 24 });
  if (course.isDraft) w.text("DRAFT - not yet published. For review only.", { font: "bold", size: 11, color: rgb(0.75, 0.2, 0.15), gap: 18 });
  w.text(course.description, { size: 12, gap: 18 });
  w.text("Who it's for", { font: "bold", size: 12, gap: 2 });
  w.text(course.audience, { gap: 12 });
  w.text("Duration", { font: "bold", size: 12, gap: 2 });
  w.text(course.duration, { gap: 12 });
  w.text("What you'll learn", { font: "bold", size: 12, gap: 4 });
  for (const o of course.outcomes) w.text(`-  ${o}`, { indent: 8, gap: 2 });

  // Contents
  w.newPage();
  w.text("Contents", { font: "bold", size: 20, gap: 12 });
  course.lessons.forEach((l, i) => w.text(`${i + 1}.  ${l.title}${l.isPublished ? "" : "  (draft)"}`, { gap: 3 }));

  // Lessons
  course.lessons.forEach((lesson, i) => {
    w.newPage();
    w.text(`LESSON ${i + 1}`, { font: "bold", size: 10, color: ACCENT, gap: 4 });
    w.text(lesson.title, { font: "bold", size: 18, gap: 6 });
    w.rule();
    w.body(lesson.content);

    const questions = questionsOf(lesson.assessment);
    if (questions.length) {
      w.ensure(60);
      w.y -= 6;
      w.text("Check your understanding", { font: "bold", size: 13, gap: 6 });
      questions.forEach((q, qi) => {
        w.text(`${qi + 1}. ${q.question}`, { font: "bold", gap: 2 });
        q.options.forEach((o, oi) => w.text(`${String.fromCharCode(65 + oi)})  ${o}`, { indent: 14, gap: 1 }));
        w.y -= 4;
      });
      w.text("Answer these in the online quiz to check your score.", { font: "italic", size: 9, color: MUTED, gap: 6 });
    }

    if (lesson.lab?.instructions) {
      w.ensure(60);
      w.y -= 6;
      w.text("Hands-on lab", { font: "bold", size: 13, gap: 6 });
      w.text(lesson.lab.instructions, { gap: 4 });
      w.text("Open this lesson online to write and run your code in the lab editor.", { font: "italic", size: 9, color: MUTED, gap: 6 });
    }
  });

  w.finish();
  return pdf.save();
}
