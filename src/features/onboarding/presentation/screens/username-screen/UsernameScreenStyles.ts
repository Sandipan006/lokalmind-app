import {
  INPUT_BOX_COLOR,
  PRIMARY_ORANGE,
  TEXT_WHITE_40,
  TEXT_WHITE_60,
  WHITE_PRIMARY,
} from '@/src/design-system/tokens/colors';
import { borderRadius, spacing, spacingAliases } from '@/src/design-system/tokens/spacing';
import { fonts, fontSizes } from '@/src/design-system/tokens/typography';
import { Platform, StyleSheet } from 'react-native';

export const usernameScreenStyles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacingAliases.screen,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  title: {
    fontSize: fontSizes.xxl + 2,
    color: WHITE_PRIMARY,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontFamily: fonts.figtree.medium,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: TEXT_WHITE_60,
    textAlign: 'center',
    fontFamily: fonts.figtree.medium,
    letterSpacing: -0.5,
  },
  inputSection: {
    marginTop: spacing.xl,
  },
  spacer: {
    flex: 1,
  },
  buttonSection: {
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSizes.sm,
    color: WHITE_PRIMARY,
    marginBottom: spacing.md,
    fontFamily: fonts.figtree.medium,
  },
  inputContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  textInput: {
    backgroundColor: INPUT_BOX_COLOR,
    ...Platform.select({
      ios: {
        borderRadius: borderRadius.lg,
        borderCurve: 'continuous',
      },
      android: {
        borderRadius: borderRadius.lg,
      },
    }),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    fontSize: fontSizes.md,
    fontFamily: fonts.figtree.regular,
    color: WHITE_PRIMARY,
    borderWidth: 1,
    borderColor: TEXT_WHITE_40 + '80',
  },
  errorText: {
    fontSize: fontSizes.xs,
    color: PRIMARY_ORANGE,
    marginTop: spacing.sm,
    fontFamily: fonts.figtree.regular,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  privacyText: {
    fontSize: fontSizes.xs,
    color: TEXT_WHITE_40,
    textAlign: 'center',
    fontFamily: fonts.figtree.regular,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
});
