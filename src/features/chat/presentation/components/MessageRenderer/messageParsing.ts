// Pure text parsing for chat messages (no React): think blocks, fenced code, ATX headings.

/** ATX headings (`### Title`) - strip `#` prefix and render title with heading styles (not raw markdown). */
export type ParsedTextBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph'; text: string };

export function parseAtxHeadings(raw: string, isStreaming: boolean): ParsedTextBlock[] {
  const lines = raw.split('\n');
  const blocks: ParsedTextBlock[] = [];
  const paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length === 0) return;
    const t = paraBuf.join('\n');
    paraBuf.length = 0;
    if (t.length > 0) blocks.push({ type: 'paragraph', text: t });
  };

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m && m[1]) {
      const level = Math.min(m[1].length, 6) as 1 | 2 | 3 | 4 | 5 | 6;
      const title = m[2] ?? '';
      if (title.trim() === '' && isStreaming) {
        paraBuf.push(line);
        continue;
      }
      flushPara();
      blocks.push({ type: 'heading', level, text: title });
    } else {
      paraBuf.push(line);
    }
  }
  flushPara();
  return blocks;
}

// ── Think-block parsing ──────────────────────────────────────────────────────

export interface ParsedContent {
  thinkContent: string | null;
  visibleContent: string;
  isThinkIncomplete: boolean; // <think> opened but </think> not yet seen (streaming)
}

export function parseThinkBlocks(raw: string): ParsedContent {
  const openTag = '<think>';
  const closeTag = '</think>';
  const openIdx = raw.indexOf(openTag);

  if (openIdx === -1) {
    return { thinkContent: null, visibleContent: raw, isThinkIncomplete: false };
  }

  const closeIdx = raw.indexOf(closeTag, openIdx);
  if (closeIdx === -1) {
    // Still streaming inside <think>
    const thinkContent = raw.slice(openIdx + openTag.length);
    const before = raw.slice(0, openIdx).trim();
    return { thinkContent, visibleContent: before, isThinkIncomplete: true };
  }

  const thinkContent = raw.slice(openIdx + openTag.length, closeIdx).trim();
  const visibleContent = (raw.slice(0, openIdx) + raw.slice(closeIdx + closeTag.length)).trim();
  return { thinkContent, visibleContent, isThinkIncomplete: false };
}

// ── Code block parsing ───────────────────────────────────────────────────────

export interface TextSegment { type: 'text'; value: string }
export interface CodeSegment { type: 'code'; lang: string; value: string }
export type Segment = TextSegment | CodeSegment;

/** First `\n` before a line that is only ``` (closing fence). Returns -1 if none. */
function findClosingFenceNewlineIndex(text: string, codeStart: number): number {
  let from = codeStart;
  while (from < text.length) {
    const idx = text.indexOf('\n```', from);
    if (idx === -1) return -1;
    const afterTicks = idx + 4;
    if (afterTicks >= text.length) return idx;
    const c = text[afterTicks];
    if (c === '\n' || c === '\r') return idx;
    // Not a closing fence line (e.g. stray match); continue searching
    from = idx + 1;
  }
  return -1;
}

/**
 * Parses fenced code blocks. When `isStreaming` is true, an **open** fence without a closing ``` still
 * renders as a code segment so tokens stream inside the code box from the first line.
 */
export function parseCodeBlocks(text: string, isStreaming: boolean): Segment[] {
  const segments: Segment[] = [];
  let pos = 0;

  while (pos < text.length) {
    const openIdx = text.indexOf('```', pos);
    if (openIdx === -1) {
      segments.push({ type: 'text', value: text.slice(pos) });
      break;
    }

    if (openIdx > pos) {
      segments.push({ type: 'text', value: text.slice(pos, openIdx) });
    }

    const afterTicks = openIdx + 3;
    const newlineIdx = text.indexOf('\n', afterTicks);

    if (newlineIdx === -1) {
      // ``` with no newline yet - show code box (lang line may still be streaming)
      if (isStreaming) {
        segments.push({ type: 'code', lang: text.slice(afterTicks).trim(), value: '' });
      } else {
        segments.push({ type: 'text', value: text.slice(openIdx) });
      }
      break;
    }

    const lang = text.slice(afterTicks, newlineIdx).trim();
    const codeStart = newlineIdx + 1;

    const closeNl = findClosingFenceNewlineIndex(text, codeStart);
    if (closeNl === -1) {
      segments.push({
        type: 'code',
        lang,
        value: text.slice(codeStart),
      });
      break;
    }

    segments.push({
      type: 'code',
      lang,
      value: text.slice(codeStart, closeNl),
    });

    let nextPos = closeNl + 4;
    if (nextPos < text.length && text[nextPos] === '\n') nextPos += 1;
    else if (nextPos < text.length && text[nextPos] === '\r') {
      nextPos += 1;
      if (nextPos < text.length && text[nextPos] === '\n') nextPos += 1;
    }
    pos = nextPos;
  }

  return segments.filter((s) => !(s.type === 'text' && s.value === ''));
}

