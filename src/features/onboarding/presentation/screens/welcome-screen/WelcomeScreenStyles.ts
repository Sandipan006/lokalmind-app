import { StyleSheet } from 'react-native';
import { spacing, spacingAliases } from '@/src/design-system/tokens/spacing';
import { WHITE_PRIMARY, TEXT_WHITE_60 } from '@/src/design-system/tokens/colors';
import { fonts, fontSizes } from '@/src/design-system/tokens/typography';

export const welcomeScreenStyles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    paddingHorizontal: spacingAliases.screen,
  },
  brandingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: fontSizes.xxxxxl,
    color: WHITE_PRIMARY,
    textAlign: 'center',
    marginBottom: spacing.xxxs,
    fontFamily: fonts.instrumentSerif.regular,
  },
  tagline: {
    fontSize: fontSizes.xl,
    color: TEXT_WHITE_60,
    textAlign: 'center',
    fontFamily: fonts.figtree.medium,
    letterSpacing: -0.5,
  },
  buttonSection: {
    marginBottom: spacing.xxxl,
  },
  primaryButton: {
    marginBottom: spacing.sm,
  },
});
