import {
  BLACK_PRIMARY,
  ERROR_RED,
  PRIMARY_ORANGE,
  TEXT_WHITE_40,
  TEXT_WHITE_60,
  WHITE_PRIMARY,
} from '@/src/design-system/tokens/colors';
import { borderRadius, spacing, typography } from '@/src/design-system/tokens';
import { fontSizes, fonts } from '@/src/design-system/tokens/typography';
import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BLACK_PRIMARY,
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  headerBackGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: { borderCurve: 'continuous' as const },
      default: {},
    }),
  },
  headerBackInner: {
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    ...typography.label.default,
    color: WHITE_PRIMARY,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  displayName: {
    marginTop: spacing.lg,
    ...typography.heading.h2,
    color: WHITE_PRIMARY,
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        borderRadius: borderRadius.lg,
        borderCurve: 'continuous' as const,
      },
      android: {
        borderRadius: borderRadius.lg,
      },
    }),
  },
  cardInner: {
    paddingVertical: spacing.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  cardChevron: {
    paddingTop: 2,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.semiBold,
  },
  cardSubtitle: {
    fontSize: fontSizes.sm,
    color: TEXT_WHITE_60,
    fontFamily: fonts.figtree.regular,
    lineHeight: fontSizes.sm * 1.35,
  },
  spacer: {
    flexGrow: 1,
    minHeight: spacing.xxxl,
  },
  logoutTouchable: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  logoutText: {
    fontSize: fontSizes.md,
    color: ERROR_RED,
    fontFamily: fonts.figtree.semiBold,
  },
  logoutHint: {
    marginTop: spacing.xs,
    fontSize: fontSizes.xs,
    color: TEXT_WHITE_40,
    fontFamily: fonts.figtree.regular,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    color: TEXT_WHITE_60,
    fontFamily: fonts.figtree.regular,
  },
  accentWord: {
    color: PRIMARY_ORANGE,
    fontFamily: fonts.instrumentSerif.italic,
  },
  pinnedContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  pinnedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinnedLabel: {
    fontSize: fontSizes.md,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.semiBold,
  },
  pinnedCounter: {
    fontSize: fontSizes.xs,
    color: TEXT_WHITE_40,
    fontFamily: fonts.figtree.regular,
  },
  pinnedInput: {
    fontSize: fontSizes.sm,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.regular,
    lineHeight: fontSizes.sm * 1.5,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
