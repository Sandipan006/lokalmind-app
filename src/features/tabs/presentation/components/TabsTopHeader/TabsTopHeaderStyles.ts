import { StyleSheet } from 'react-native';
import { BLACK_PRIMARY, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { spacing, borderRadius } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';

export const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BLACK_PRIMARY,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BLACK_PRIMARY,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    // backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...typography.body.largeSemiBold,
    color: WHITE_PRIMARY,
  },
  actionsRow: {
    height: 40,
    borderRadius: borderRadius.full,
    paddingLeft: spacing.xxs,
    paddingRight: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    color: WHITE_PRIMARY,
    fontSize: 22,
    lineHeight: 24,
  },
  avatarIcon: {
    color: WHITE_PRIMARY,
    fontSize: 15,
  },
  avatarImage: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
  },
});
