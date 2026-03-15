import { StyleSheet } from 'react-native';
import {
  BLACK_PRIMARY, CHAT_BACKGROUND_COLOR,
  CHAT_BUBBLE_USER_BG, CHAT_BUBBLE_AI_BG,
  CHAT_BUBBLE_USER_TEXT, CHAT_BUBBLE_AI_TEXT,
  ERROR_RED,
} from '@/src/design-system/tokens/colors';
import { spacing, borderRadius } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';

export const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: BLACK_PRIMARY,
  },
  container: {
    flex: 1,
    backgroundColor: CHAT_BACKGROUND_COLOR,
  },

  // ── Message list ────────────────────────────────────────────────────────────
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  // ── Bubbles ─────────────────────────────────────────────────────────────────
  messageRow: {
    marginBottom: spacing.sm,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  userBubble: {
    backgroundColor: CHAT_BUBBLE_USER_BG,
    borderBottomRightRadius: borderRadius.xs,
  },
  assistantBubble: {
    backgroundColor: CHAT_BUBBLE_AI_BG,
    borderBottomLeftRadius: borderRadius.xs,
  },
  bubbleText: {
    ...typography.body.default,
    lineHeight: 22,
  },
  userBubbleText: {
    color: CHAT_BUBBLE_USER_TEXT,
  },
  assistantBubbleText: {
    color: CHAT_BUBBLE_AI_TEXT,
  },

  // ── Streaming cursor ────────────────────────────────────────────────────────
  cursor: {
    color: CHAT_BUBBLE_AI_TEXT,
    opacity: 0.6,
  },

  // ── Loading states ──────────────────────────────────────────────────────────
  thinkingRow: {
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  thinkingBubble: {
    backgroundColor: CHAT_BUBBLE_AI_BG,
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  thinkingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: CHAT_BUBBLE_AI_TEXT,
  },

  // ── Error banner ─────────────────────────────────────────────────────────────
  errorBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: ERROR_RED,
  },
  errorText: {
    ...typography.caption.default,
    color: ERROR_RED,
    textAlign: 'center',
  },
});
