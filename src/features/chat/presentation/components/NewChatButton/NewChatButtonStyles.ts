import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { spacing, borderRadius } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';

export const NEW_CHAT_BLUE = '#0A84FF';

export const styles = StyleSheet.create<{
  anchor: ViewStyle;
  pill: ViewStyle;
  icon: TextStyle;
  label: TextStyle;
}>({
  anchor: {
    position: 'absolute',
    right: spacing.md,
    // sits just above the bottom tab bar; caller passes bottom via style prop
  },
  pill: {
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: NEW_CHAT_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  icon: {
    ...typography.body.semiBold,
    color: WHITE_PRIMARY,
    fontSize: 18,
    lineHeight: 22,
  },
  label: {
    ...typography.body.semiBold,
    color: WHITE_PRIMARY,
  },
});
