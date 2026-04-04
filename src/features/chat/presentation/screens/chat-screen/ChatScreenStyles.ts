import {
  BLACK_PRIMARY, CHAT_BACKGROUND_COLOR,
  CHAT_BUBBLE_USER_BG,
  CHAT_BUBBLE_USER_TEXT,
  CHAT_USER_REPLY_BAR,
  CHAT_USER_REPLY_SCRIM,
  ERROR_RED,
  TEXT_LIGHT,
  WHITE_PRIMARY
} from '@/src/design-system/tokens/colors';
import { borderRadius, normalize, spacing } from '@/src/design-system/tokens/spacing';
import { fonts, typography } from '@/src/design-system/tokens/typography';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: BLACK_PRIMARY,
  },
  container: {
    flex: 1,
    backgroundColor: CHAT_BACKGROUND_COLOR,
  },
  /** Footer (queue + composer) — used with `KeyboardStickyView` from keyboard-controller. */
  keyboardFooter: {
    width: '100%',
  },

  // ── Message list ────────────────────────────────────────────────────────────
  messageList: {
    flex: 1,
    width: '100%',
    // marginBottom: spacing.md,
  },
  messageListContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  // ── Bubbles ─────────────────────────────────────────────────────────────────
  messageRow: {
    marginBottom: spacing.xl,
    width: '100%',
    minWidth: 0,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  /** Shared shell; padding is per-variant below (user single vs user reply vs assistant uses its own). */
  bubble: {
    maxWidth: '80%',
    minWidth: 0,
  },
  userBubble: {
    backgroundColor: CHAT_BUBBLE_USER_BG,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },
  /** User message — plain text only (tune independently from reply bubbles). */
  userBubblePaddingSingle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  /** User message — includes reply strip (tune outer gap vs `replyQuoteContent`). */
  userBubblePaddingWithReply: {
    paddingLeft: spacing.xxs,
    paddingRight: spacing.xxs,
    paddingTop: spacing.xxs,
    paddingBottom: spacing.xs,
  },
  /** Body lays out first (width); reply above via column-reverse; strip stretches to column width. */
  userBubbleContent: {
    maxWidth: '100%',
    alignItems: 'stretch',
    flexDirection: 'column-reverse',
  },
  assistantBubble: {
    backgroundColor: 'transparent',
    borderBottomLeftRadius: borderRadius.xs,
    paddingHorizontal: 0,
    paddingVertical: 0,
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  bubbleText: {
    ...typography.body.default,
  },
  /** Shared user bubble text color. */
  userBubbleText: {
    color: CHAT_BUBBLE_USER_TEXT,
  },
  /** Main line — plain user message (tune independently from reply-thread body). */
  userBubbleTextSingle: {

  },
  /** Main line — user message that includes a reply strip above. */
  userBubbleTextWithReply: {
    marginLeft: normalize(8),
    marginRight: normalize(7),
  },
  /** Row width follows stretched column (max of quote vs body); no flex:1 here — avoids 3px collapse. */
  replyQuoteRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    minWidth: normalize(80),
    backgroundColor: CHAT_USER_REPLY_SCRIM,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  replyQuoteAccent: {
    width: normalize(4),
    flexShrink: 0,
    backgroundColor: CHAT_USER_REPLY_BAR,
  },
  replyQuoteContent: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    paddingLeft: spacing.sm,
    gap: normalize(4),
  },
  replyQuoteLabel: {
    ...typography.caption.smallSemiBold,
    color: WHITE_PRIMARY,
  },
  replyQuotePreview: {
    ...typography.caption.default,
    color: TEXT_LIGHT,
  },
  replyQuotePreviewBold: {
    ...typography.caption.default,
    color: TEXT_LIGHT,
    fontFamily: fonts.figtree.bold,
  },
  replyQuotePreviewItalic: {
    ...typography.caption.default,
    color: TEXT_LIGHT,
    fontFamily: fonts.figtree.italic,
  },
  /** Invisible width for Swipeable left panel (reply still triggers on open; no icon/shelf UI). */
  swipeReplyPlaceholder: {
    width: 72,
    marginBottom: spacing.xl,
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
