import {
    INPUT_BOX_COLOR,
    TEXT_WHITE_40,
    TEXT_WHITE_60,
    WHITE_PRIMARY,
} from '@/src/design-system/tokens/colors';
import { borderRadius, normalize, spacing } from '@/src/design-system/tokens/spacing';
import { fonts, fontSizes, typography } from '@/src/design-system/tokens/typography';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    width: '100%',
    minWidth: 0,
  },

  // ── Body text ──────────────────────────────────────────────────────────────
  bodyText: {
    ...typography.body.default,
    color: WHITE_PRIMARY,
    lineHeight: fontSizes.md * 1.6,
  },
  bodyTextBold: {
    ...typography.body.default,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.bold,
    lineHeight: fontSizes.md * 1.6,
  },
  bodyTextItalic: {
    ...typography.body.default,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.italic,
    lineHeight: fontSizes.md * 1.6,
  },

  /** ATX markdown - `typography.heading` + chat bubble color/line-height/width only. */
  heading1: {
    ...typography.heading.h1,
    color: WHITE_PRIMARY,
    lineHeight: fontSizes.xxxl * 1.35,
    width: '100%',
  },
  heading2: {
    ...typography.heading.h2,
    color: WHITE_PRIMARY,
    lineHeight: fontSizes.xxl * 1.35,
    width: '100%',
  },
  heading3: {
    ...typography.heading.h3,
    color: WHITE_PRIMARY,
    lineHeight: fontSizes.xl * 1.35,
    width: '100%',
  },
  heading4: {
    ...typography.heading.h4,
    color: WHITE_PRIMARY,
    lineHeight: fontSizes.lg * 1.4,
    width: '100%',
  },
  heading5: {
    ...typography.heading.h5,
    color: WHITE_PRIMARY,
    lineHeight: fontSizes.md * 1.45,
    width: '100%',
  },
  heading6: {
    ...typography.heading.h6,
    color: TEXT_WHITE_60,
    lineHeight: fontSizes.xs * 1.45,
    width: '100%',
  },

  // ── Think block ───────────────────────────────────────────────────────────
  thinkBlock: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  thinkBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  thinkBlockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TEXT_WHITE_40,
  },
  thinkBlockLabel: {
    ...typography.caption.default,
    color: TEXT_WHITE_60,
    flex: 1,
  },
  thinkBlockScroll: {
    height: normalize(120),
  },
  thinkBlockScrollContent: {
    paddingBottom: spacing.sm,
  },
  thinkBlockContent: {
    ...typography.caption.default,
    color: TEXT_WHITE_60,
    paddingHorizontal: spacing.sm,
    lineHeight: fontSizes.sm * 1.6,
  },

  // ── Code block ────────────────────────────────────────────────────────────
  codeBlock: {
    backgroundColor: INPUT_BOX_COLOR,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginVertical: spacing.xxs,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  /** Horizontal scroll must not expand the FlatList row to the full unwrapped line width. */
  codeScrollHorizontal: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  codeLang: {
    ...typography.caption.smallSemiBold,
    color: TEXT_WHITE_60,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  copyButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxxs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  copyButtonText: {
    ...typography.caption.small,
    color: TEXT_WHITE_60,
  },
  codeText: {
    fontFamily: fonts.figtree.regular,
    fontSize: fontSizes.xs,
    color: WHITE_PRIMARY,
    padding: spacing.sm,
    lineHeight: fontSizes.xs * 1.7,
  },
});
