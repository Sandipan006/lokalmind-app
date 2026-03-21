import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { styles } from './MessageRendererStyles';

/** Avoid static import of expo-clipboard — it throws if the dev client was built without that native module. */
async function copyTextBestEffort(text: string): Promise<'clipboard' | 'share' | 'none'> {
  try {
    const { setStringAsync } = await import('expo-clipboard');
    await setStringAsync(text);
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

function parseCodeBlocks(text: string): Segment[] {
  const segments: Segment[] = [];
  // Matches ```lang\ncode``` or ```\ncode```
  const fence = /```([^\n]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'code', lang: match[1]?.trim() ?? '', value: match[2] ?? '' });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CodeBlock({ lang, value }: { lang: string; value: string }) {
  const [copyLabel, setCopyLabel] = useState<'Copy' | 'Copied!' | 'Shared'>('Copy');

  const handleCopy = async () => {
    const result = await copyTextBestEffort(value);
    if (result === 'clipboard') {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 1500);
    } else if (result === 'share') {
      setCopyLabel('Shared');
      setTimeout(() => setCopyLabel('Copy'), 1500);
    }
  };

  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLang}>{lang || 'code'}</Text>
        <Pressable onPress={handleCopy} style={styles.copyButton} hitSlop={8}>
          <Text style={styles.copyButtonText}>{copyLabel}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.codeText} selectable>{value}</Text>
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
  const segments = parseCodeBlocks(visibleContent);
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
          return <CodeBlock key={i} lang={seg.lang} value={seg.value} />;
        }
        // Append trailingElement inline in the last text segment
        const isLast = i === lastIdx;
        return (
          <Text key={i} style={styles.bodyText} selectable>
            {seg.value}
            {isLast && trailingElement}
          </Text>
        );
      })}
      {/* If there are no segments at all, still render trailing element */}
      {segments.length === 0 && trailingElement != null && (
        <Text style={styles.bodyText}>{trailingElement}</Text>
      )}
    </View>
  );
}
