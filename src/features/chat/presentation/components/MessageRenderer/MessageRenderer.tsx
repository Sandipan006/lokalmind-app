import type { ReactNode } from 'react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { TextStyle } from 'react-native';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { styles } from './MessageRendererStyles';

/** Bold/italic for `**` / `_` / `*` segments; base style stays on the parent `Text`. */
export interface InlineMarkdownStyleSet {
  bold: TextStyle;
  italic: TextStyle;
}

const defaultInlineMarkdownStyles: InlineMarkdownStyleSet = {
  bold: styles.bodyTextBold,
  italic: styles.bodyTextItalic,
};

/**
 * Clipboard uses `expo-clipboard` native code. If the dev client was built without it, `require` fails here
 * and we fall back to Share - rebuild with `eas build --profile development` (or add the module) for real copy.
 */
async function copyTextBestEffort(text: string): Promise<'clipboard' | 'share' | 'none'> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Clipboard = require('expo-clipboard') as { setStringAsync: (s: string) => Promise<void> };
    await Clipboard.setStringAsync(text);
    return 'clipboard';
  } catch {
    try {
      await Share.share({ message: text });
      return 'share';
    } catch {
      return 'none';
    }
  }
}

/** `**bold**`, `_italic_`, `*italic*` (not `* list` - opening * must be followed by non-whitespace). Bold inner can contain italic. */
export function renderInlineMarkdown(
  text: string,
  keyPrefix: string,
  styleSet: InlineMarkdownStyleSet = defaultInlineMarkdownStyles,
): ReactNode[] {
  if (!text) return [];
  const nodes: ReactNode[] = [];
  const re = /(\*\*([\s\S]*?)\*\*)|(_([^_\n]+)_)|(\*(\S[^*\n]*)\*)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      nodes.push(text.slice(lastIndex, m.index));
    }
    if (m[2] !== undefined) {
      nodes.push(
        <Text key={`${keyPrefix}B${m.index}`} style={styleSet.bold}>
          {renderInlineMarkdown(m[2], `${keyPrefix}n${m.index}`, styleSet)}
        </Text>,
      );
    } else if (m[4] !== undefined) {
      nodes.push(
        <Text key={`${keyPrefix}U${m.index}`} style={styleSet.italic}>
          {m[4]}
        </Text>,
      );
    } else if (m[6] !== undefined) {
      nodes.push(
        <Text key={`${keyPrefix}A${m.index}`} style={styleSet.italic}>
          {m[6]}
        </Text>,
      );
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

/** ATX headings (`### Title`) - strip `#` prefix and render title with heading styles (not raw markdown). */
type ParsedTextBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph'; text: string };

function headingStyleForLevel(level: 1 | 2 | 3 | 4 | 5 | 6) {
  switch (level) {
    case 1:
      return styles.heading1;
    case 2:
      return styles.heading2;
    case 3:
      return styles.heading3;
    case 4:
      return styles.heading4;
    case 5:
      return styles.heading5;
    default:
      return styles.heading6;
  }
}

function parseAtxHeadings(raw: string, isStreaming: boolean): ParsedTextBlock[] {
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

function renderTextBlocks(
  raw: string,
  keyPrefix: string,
  isStreaming: boolean,
  baseStyle: TextStyle,
  trailingElement?: ReactNode,
): ReactNode {
  const blocks = parseAtxHeadings(raw, isStreaming);
  if (blocks.length === 0) {
    return trailingElement != null ? (
      <Text style={baseStyle} selectable>
        {trailingElement}
      </Text>
    ) : null;
  }
  return blocks.map((block, bi) => {
    const isLastBlock = bi === blocks.length - 1;
    const trail = isLastBlock ? trailingElement : undefined;
    if (block.type === 'heading') {
      return (
        <Text
          key={`${keyPrefix}h${bi}`}
          style={headingStyleForLevel(block.level)}
          selectable
        >
          {renderInlineMarkdown(block.text, `${keyPrefix}ht${bi}`)}
          {trail}
        </Text>
      );
    }
    return (
      <Text key={`${keyPrefix}p${bi}`} style={baseStyle} selectable>
        {renderInlineMarkdown(block.text, `${keyPrefix}pt${bi}`)}
        {trail}
      </Text>
    );
  });
}

// ── Think-block parsing ──────────────────────────────────────────────────────

interface ParsedContent {
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

interface TextSegment { type: 'text'; value: string }
interface CodeSegment { type: 'code'; lang: string; value: string }
type Segment = TextSegment | CodeSegment;

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
function parseCodeBlocks(text: string, isStreaming: boolean): Segment[] {
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

// ── Sub-components ───────────────────────────────────────────────────────────

function CodeBlock({
  lang,
  value,
  trailingElement,
}: {
  lang: string;
  value: string;
  trailingElement?: ReactNode;
}) {
  const [copyLabel, setCopyLabel] = useState<'Copy' | 'Copied!' | 'Shared'>('Copy');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCopyLabelReset = useCallback(() => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyLabel('Copy'), 1500);
  }, []);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const handleCopy = () => {
    void (async () => {
      try {
        const result = await copyTextBestEffort(value);
        if (result === 'clipboard') {
          setCopyLabel('Copied!');
          scheduleCopyLabelReset();
        } else if (result === 'share') {
          setCopyLabel('Shared');
          scheduleCopyLabelReset();
        }
      } catch {
        try {
          await Share.share({ message: value });
          setCopyLabel('Shared');
          scheduleCopyLabelReset();
        } catch {
          /* ignore */
        }
      }
    })();
  };

  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLang}>{lang || 'code'}</Text>
        <Pressable onPress={handleCopy} style={styles.copyButton} hitSlop={8}>
          <Text style={styles.copyButtonText}>{copyLabel}</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.codeScrollHorizontal}
      >
        <Text style={styles.codeText} selectable>
          {value}
          {trailingElement}
        </Text>
      </ScrollView>
    </View>
  );
}

function ThinkBlock({
  content,
  isIncomplete,
}: {
  content: string;
  isIncomplete: boolean;
}) {
  const thinkScrollRef = useRef<ScrollView>(null);

  const scrollThinkToBottom = useCallback(() => {
    thinkScrollRef.current?.scrollToEnd({ animated: false });
  }, []);

  useEffect(() => {
    scrollThinkToBottom();
  }, [content, scrollThinkToBottom]);

  return (
    <View style={styles.thinkBlock}>
      <View style={styles.thinkBlockHeader}>
        <View style={styles.thinkBlockDot} />
        <Text style={styles.thinkBlockLabel}>
          {isIncomplete ? 'Thinking…' : 'Thought process'}
        </Text>
      </View>
      <ScrollView
        ref={thinkScrollRef}
        nestedScrollEnabled
        style={styles.thinkBlockScroll}
        contentContainerStyle={styles.thinkBlockScrollContent}
        showsVerticalScrollIndicator
        onContentSizeChange={scrollThinkToBottom}
      >
        <Text style={styles.thinkBlockContent} selectable>
          {content}
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

interface MessageRendererProps {
  content: string;
  /** Pass true during streaming so think block shows "Thinking…" label */
  isStreaming?: boolean;
  /** Optional inline element appended after the last text segment (e.g. blinking cursor) */
  trailingElement?: ReactNode;
}

export function MessageRenderer({
  content,
  isStreaming = false,
  trailingElement,
}: MessageRendererProps) {
  const { thinkContent, visibleContent, isThinkIncomplete } = parseThinkBlocks(content);
  const segments = parseCodeBlocks(visibleContent, isStreaming);
  const lastIdx = segments.length - 1;

  return (
    <View style={styles.container}>
      {thinkContent !== null && (
        <ThinkBlock
          content={thinkContent}
          isIncomplete={isThinkIncomplete || isStreaming}
        />
      )}
      {segments.map((seg, i) => {
        if (seg.type === 'code') {
          return (
            <CodeBlock
              key={i}
              lang={seg.lang}
              value={seg.value}
              trailingElement={i === lastIdx ? trailingElement : undefined}
            />
          );
        }
        const isLast = i === lastIdx;
        return (
          <Fragment key={i}>
            {renderTextBlocks(
              seg.value,
              `t${i}`,
              isStreaming,
              styles.bodyText,
              isLast ? trailingElement : undefined,
            )}
          </Fragment>
        );
      })}
      {/* If there are no segments at all, still render trailing element */}
      {segments.length === 0 && trailingElement != null && (
        <Text style={styles.bodyText}>{trailingElement}</Text>
      )}
    </View>
  );
}
