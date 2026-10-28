import {
  BLACK_PRIMARY,
  PRIMARY_ORANGE,
  WHITE_PRIMARY,
} from '@/src/design-system/tokens/colors';
import { borderRadius, spacing } from '@/src/design-system/tokens/spacing';
import { fontSizes, fonts } from '@/src/design-system/tokens/typography';
import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BLACK_PRIMARY,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...Platform.select({
      ios: {
        borderRadius: borderRadius.lg,
        borderCurve: 'continuous',
      },
      android: {
        borderRadius: borderRadius.lg,
      },
    }),
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes.xxxl,
    color: WHITE_PRIMARY,
    fontFamily: fonts.instrumentSerif.regular,
  },
  subtitle: {
    fontSize: fontSizes.xxxl,
    color: PRIMARY_ORANGE,
    fontFamily: fonts.instrumentSerif.italic,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
  },
  paymentButton: {
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        borderRadius: borderRadius.lg,
        borderCurve: 'continuous',
      },
      android: {
        borderRadius: borderRadius.lg,
      },
    }),
  },
  paymentButtonInner: {
    paddingVertical: spacing.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  paymentButtonText: {
    fontSize: fontSizes.md,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.medium,
  },
});
