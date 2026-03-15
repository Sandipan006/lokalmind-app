import { BLACK_PRIMARY, CHAT_BACKGROUND_COLOR, INPUT_BOX_COLOR, TEXT_WHITE_60, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { borderRadius, normalize, spacing } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: CHAT_BACKGROUND_COLOR,
  },
  loading: {
    flex: 1,
    backgroundColor: BLACK_PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.heading.h3,
    color: WHITE_PRIMARY,
  },
  headerSubtitle: {
    ...typography.caption.default,
    color: TEXT_WHITE_60,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: spacing.xxxxl,
    gap: spacing.xs,
  },
  swipeableContainer: {
    overflow: 'visible',
  },
  rowInset: {
    marginHorizontal: spacing.md,
  },
  empty: {
    padding: spacing.lg,
  },
  emptyText: {
    ...typography.body.default,
    color: TEXT_WHITE_60,
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xxs,
    marginLeft: -spacing.xs,
    marginRight: spacing.md,
  },
  swipeActionButton: {
    width: normalize(55),
    borderRadius: borderRadius.lg,
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
