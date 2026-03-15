import { StyleSheet } from 'react-native';
import { WHITE_PRIMARY, TEXT_WHITE_60, CHAT_BACKGROUND_COLOR } from '@/src/design-system/tokens/colors';
import { spacing, borderRadius } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';

export const styles = StyleSheet.create({
  row: {
    backgroundColor: CHAT_BACKGROUND_COLOR,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  rowPlain: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.body.medium,
    color: WHITE_PRIMARY,
    flex: 1,
  },
  titleMuted: {
    ...typography.body.medium,
    color: TEXT_WHITE_60,
    flex: 1,
  },
  subtitle: {
    ...typography.caption.default,
    color: WHITE_PRIMARY,
    opacity: 0.7,
    marginTop: spacing.xxs,
  },
  subtitleMuted: {
    ...typography.caption.default,
    color: TEXT_WHITE_60,
    marginTop: spacing.xxs,
  },
  highlightText: {
    color: WHITE_PRIMARY,
  },
});
