import { StyleSheet } from 'react-native';
import {
  INPUT_BOX_COLOR,
  TEXT_WHITE_40,
  TEXT_WHITE_60,
  WHITE_PRIMARY,
} from '@/src/design-system/tokens/colors';
import { borderRadius, normalize, spacing } from '@/src/design-system/tokens/spacing';
import { fonts, fontSizes, typography } from '@/src/design-system/tokens/typography';

export const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },

  // ── Body text ──────────────────────────────────────────────────────────────
  bodyText: {
    ...typography.body.default,
    color: WHITE_PRIMARY,
    lineHeight: fontSizes.md * 1.6,
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
