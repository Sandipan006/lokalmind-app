import { StyleSheet } from 'react-native';
import { spacing, borderRadius, normalize } from '@/src/design-system/tokens';
import { fontSizes, fonts } from '@/src/design-system/tokens/typography';
import {
  BLACK_PRIMARY,
  WHITE_PRIMARY,
  TEXT_WHITE_60,
} from '@/src/design-system/tokens/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK_PRIMARY,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  closeButtonSurface: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.md,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.regular,
    padding: 0,
  },
  loadingContainer: {
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    paddingTop: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: TEXT_WHITE_60,
    fontFamily: fonts.figtree.regular,
  },
});
