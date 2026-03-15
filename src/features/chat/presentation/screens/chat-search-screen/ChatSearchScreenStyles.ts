import {
  BLACK_PRIMARY,
  CHAT_BACKGROUND_COLOR,
  INPUT_BOX_COLOR,
  TEXT_WHITE_60,
  WHITE_PRIMARY,
} from '@/src/design-system/tokens/colors';
import { borderRadius, spacing } from '@/src/design-system/tokens/spacing';
import { fontSizes, fonts } from '@/src/design-system/tokens/typography';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK_PRIMARY,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  closeButtonSurface: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
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
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xxs,
    marginLeft: spacing.xs,
  },
  swipeActionButton: {
    width: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  editActionButton: {
    backgroundColor: CHAT_BACKGROUND_COLOR,
  },
  deleteActionButton: {
    backgroundColor: INPUT_BOX_COLOR,
  },
});
