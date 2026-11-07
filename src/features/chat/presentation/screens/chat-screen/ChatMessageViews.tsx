import * as Haptics from 'expo-haptics';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable, {
    SwipeDirection,
    type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { ChatMessage } from '../../../domain/entities/ChatMessage';
import {
    MessageRenderer,
    renderInlineMarkdown,
    type InlineMarkdownStyleSet,
} from '../../components/MessageRenderer/MessageRenderer';
import { styles } from './ChatScreenStyles';

const replyQuoteInlineMarkdown: InlineMarkdownStyleSet = {
  bold: styles.replyQuotePreviewBold,
  italic: styles.replyQuotePreviewItalic,
};

// Blinking cursor for streaming bubble.
export function StreamingCursor() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.Text style={[styles.cursor, { opacity }]}>▋</Animated.Text>;
}

// Shimmering thinking indicator while model prepares first token.
export function ThinkingIndicator({ onDismiss }: { onDismiss: () => void }) {
  const shimmerProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerProgress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerProgress]);

  return (
    <Pressable style={styles.thinkingRow} onPress={onDismiss}>
      <Text style={styles.thinkingText}>Thinking...</Text>

    </Pressable>
  );
}

export const MessageBubble = observer(({
  message,
  onLongPressMessage,
  onDismissKeyboard,
  displayContent,
  regenerateControls,
  isStreaming: isStreamingInPlace,
}: {
  message: ChatMessage;
  onLongPressMessage?: (msg: ChatMessage) => void;
  onDismissKeyboard: () => void;
  /** Overrides the displayed text (used when paging through alternates). */
  displayContent?: string;
  /** If provided, rendered below the assistant bubble. */
  regenerateControls?: ReactNode;
  /** Enables streaming cursor inside the bubble (for in-place regeneration). */
  isStreaming?: boolean;
}) => {
  const isUser = message.role === 'user';
  const hasReply =
    message.replyPreview != null &&
    message.replyPreview.length > 0 &&
    message.replyToRole != null;

  if (isUser) {
    return (
      <View style={[styles.messageRow, styles.userRow]}>
        <Pressable
          style={[
            styles.bubble,
            styles.userBubble,
            hasReply ? styles.userBubblePaddingWithReply : styles.userBubblePaddingSingle,
          ]}
          onPress={onDismissKeyboard}
          onLongPress={() => onLongPressMessage?.(message)}
          delayLongPress={350}
        >
          <View style={styles.userBubbleContent}>
            {/* Main text first in tree so width = max(reply, body); column-reverse keeps reply visually on top. */}
            <Text
              style={[
                styles.bubbleText,
                styles.userBubbleText,
                hasReply ? styles.userBubbleTextWithReply : styles.userBubbleTextSingle,
              ]}
            >
              {message.content}
            </Text>
            {hasReply ? (
              <View style={styles.replyQuoteRow}>
                <View style={styles.replyQuoteAccent} />
                <View style={styles.replyQuoteContent}>
                  <Text style={styles.replyQuoteLabel} numberOfLines={1}>
                    {message.replyToRole === 'assistant' ? 'Assistant' : 'You'}
                  </Text>
                  <Text
                    style={styles.replyQuotePreview}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {renderInlineMarkdown(
                      message.replyPreview,
                      `rq-${message.id}`,
                      replyQuoteInlineMarkdown,
                    )}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, styles.assistantRow]}>
      <Pressable
        onPress={onDismissKeyboard}
        onLongPress={() => onLongPressMessage?.(message)}
        delayLongPress={350}
      >
        <View style={[styles.bubble, styles.assistantBubble]}>
          <MessageRenderer
            content={displayContent ?? message.content}
            {...(isStreamingInPlace ? { isStreaming: true, trailingElement: <StreamingCursor /> } : {})}
          />
        </View>
      </Pressable>
      {regenerateControls}
    </View>
  );
});

export const StreamingBubble = observer(({ content, onDismiss }: { content: string; onDismiss: () => void }) => (
  <Pressable style={[styles.messageRow, styles.assistantRow]} onPress={onDismiss}>
    <View style={[styles.bubble, styles.assistantBubble]}>
      <MessageRenderer content={content} isStreaming trailingElement={<StreamingCursor />} />
    </View>
  </Pressable>
));

export const ChatMessageSwipeable = observer(
  ({
    item,
    swipeEnabled,
    onSwipeReply,
    onLongPressMessage,
    onDismissKeyboard,
    displayContent,
    regenerateControls,
    isStreaming,
  }: {
    item: ChatMessage;
    swipeEnabled: boolean;
    onSwipeReply: (msg: ChatMessage) => void;
    onLongPressMessage: (msg: ChatMessage) => void;
    onDismissKeyboard: () => void;
    displayContent?: string;
    regenerateControls?: ReactNode;
    isStreaming?: boolean;
  }) => {
    const swipeRef = useRef<SwipeableMethods | null>(null);

    return (
      <ReanimatedSwipeable
        ref={swipeRef}
        enabled={swipeEnabled}
        friction={2}
        overshootLeft={false}
        renderLeftActions={() => <View style={styles.swipeReplyPlaceholder} />}
        onSwipeableOpen={(direction) => {
          // Left action panel uses positive row translation → `SwipeDirection.RIGHT` (see RNGH ReanimatedSwipeable).
          if (direction === SwipeDirection.RIGHT) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSwipeReply(item);
            swipeRef.current?.close();
          }
        }}
      >
        <MessageBubble
          message={item}
          onLongPressMessage={onLongPressMessage}
          onDismissKeyboard={onDismissKeyboard}
          {...(displayContent !== undefined ? { displayContent } : {})}
          {...(regenerateControls !== undefined ? { regenerateControls } : {})}
          {...(isStreaming ? { isStreaming } : {})}
        />
      </ReanimatedSwipeable>
    );
  },
);
