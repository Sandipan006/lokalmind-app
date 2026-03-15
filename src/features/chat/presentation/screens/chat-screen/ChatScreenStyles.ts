import { StyleSheet } from 'react-native';
import {
  BLACK_PRIMARY, CHAT_BACKGROUND_COLOR,
  CHAT_BUBBLE_USER_BG, CHAT_BUBBLE_AI_BG,
  CHAT_BUBBLE_USER_TEXT, CHAT_BUBBLE_AI_TEXT,
  WHITE_PRIMARY,
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
    marginBottom: spacing.xl,
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
  },
  assistantBubble: {
    backgroundColor: 'transparent',
    borderBottomLeftRadius: borderRadius.xs,
    paddingHorizontal: 0,
    paddingVertical: 0,
    maxWidth: '100%',
  },
  bubbleText: {
    ...typography.body.default,
  },
  userBubbleText: {
    color: CHAT_BUBBLE_USER_TEXT,
  },
  assistantBubbleText: {
    color: WHITE_PRIMARY,
  },

  // ── Streaming cursor ────────────────────────────────────────────────────────
  cursor: {
    color: WHITE_PRIMARY,
    opacity: 0.6,
  },

  // ── Loading states ──────────────────────────────────────────────────────────
  thinkingRow: {
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  thinkingText: {
    ...typography.body.default,
    color: WHITE_PRIMARY,
    opacity: 0.75,
  },
  thinkingShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -40,
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.18)',
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
