import { StyleSheet } from 'react-native';
import { PRIMARY_ORANGE, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { spacing, borderRadius, normalize } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';


export const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: spacing.md,
    // sits just above the bottom tab bar; caller passes bottom via style prop
  },
  pill: {
    height: normalize(48),
    borderRadius: borderRadius.full,
    backgroundColor: PRIMARY_ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.sm + spacing.xxs,
    paddingRight: spacing.md,
    gap: spacing.xs,
  },
  label: {
    ...typography.body.semiBold,
    color: WHITE_PRIMARY,
  },
});
