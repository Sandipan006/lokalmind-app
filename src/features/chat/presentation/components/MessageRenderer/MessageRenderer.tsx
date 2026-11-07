import type { ReactNode } from 'react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { TextStyle } from 'react-native';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { parseAtxHeadings, parseCodeBlocks, parseThinkBlocks } from './messageParsing';
import { styles } from './MessageRendererStyles';

export { parseThinkBlocks };

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
