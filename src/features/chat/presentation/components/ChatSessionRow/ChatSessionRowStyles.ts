import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { INPUT_BOX_COLOR, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { spacing, borderRadius } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';

export const styles = StyleSheet.create<{
  row: ViewStyle;
  topRow: ViewStyle;
  title: TextStyle;
  editButton: ViewStyle;
}>({
  row: {
    backgroundColor: INPUT_BOX_COLOR,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
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
  editButton: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
