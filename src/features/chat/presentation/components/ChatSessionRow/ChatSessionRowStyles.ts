import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { INPUT_BOX_COLOR, WHITE_PRIMARY, TEXT_WHITE_60 } from '@/src/design-system/tokens/colors';
import { spacing, borderRadius } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';

export const styles = StyleSheet.create<{
  row: ViewStyle;
  rowPlain: ViewStyle;
  topRow: ViewStyle;
  title: TextStyle;
  titleMuted: TextStyle;
  subtitle: TextStyle;
  subtitleMuted: TextStyle;
  highlightText: TextStyle;
  editButton: ViewStyle;
}>({
  row: {
    backgroundColor: INPUT_BOX_COLOR,
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
  editButton: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
