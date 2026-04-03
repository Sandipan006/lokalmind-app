import { TextStyle } from 'react-native';
import { normalizeFontSize } from './spacing';

export const fonts = {
  figtree: {
    black: 'Figtree-Black',
    blackItalic: 'Figtree-BlackItalic',
    bold: 'Figtree-Bold',
    boldItalic: 'Figtree-BoldItalic',
    extraBold: 'Figtree-ExtraBold',
    extraBoldItalic: 'Figtree-ExtraBoldItalic',
    semiBold: 'Figtree-SemiBold',
    semiBoldItalic: 'Figtree-SemiBoldItalic',
    medium: 'Figtree-Medium',
    mediumItalic: 'Figtree-MediumItalic',
    regular: 'Figtree-Regular',
    italic: 'Figtree-Italic',
    light: 'Figtree-Light',
    lightItalic: 'Figtree-LightItalic',
  },
  instrumentSerif: {
    regular: 'InstrumentSerif-Regular',
    italic: 'InstrumentSerif-Italic',
  },
  bricolageGrotesque: {
    light: 'BricolageGrotesque-Light',
    regular: 'BricolageGrotesque-Regular',
    medium: 'BricolageGrotesque-Medium',
    semiBold: 'BricolageGrotesque-SemiBold',
    bold: 'BricolageGrotesque-Bold',
    extraBold: 'BricolageGrotesque-ExtraBold',
  },
} as const;

export const fontSizes = {
  xxs: normalizeFontSize(10),
  xs: normalizeFontSize(12),
  sm: normalizeFontSize(14),
  md: normalizeFontSize(16),
  lg: normalizeFontSize(18),
  xl: normalizeFontSize(20),
  xxl: normalizeFontSize(24),
  xxxl: normalizeFontSize(32),
  xxxxl: normalizeFontSize(40),
  xxxxxl: normalizeFontSize(60),
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
} as const;

export const fontWeights = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
  black: '900' as const,
};

export const typography = {
  display: {
    large: {
      fontFamily: fonts.instrumentSerif.regular,
      fontSize: fontSizes.xxxxxl,
    } as TextStyle,
    medium: {
      fontFamily: fonts.bricolageGrotesque.bold,
      fontSize: fontSizes.xxxl,
    } as TextStyle,
    small: {
      fontFamily: fonts.bricolageGrotesque.semiBold,
      fontSize: fontSizes.xxl,
    } as TextStyle,
  },
  heading: {
    h1: {
      fontFamily: fonts.figtree.bold,
      fontSize: fontSizes.xxxl,
    } as TextStyle,
    h2: {
      fontFamily: fonts.figtree.bold,
      fontSize: fontSizes.xxl,
    } as TextStyle,
    h3: {
      fontFamily: fonts.figtree.semiBold,
      fontSize: fontSizes.xl,
    } as TextStyle,
    h4: {
      fontFamily: fonts.figtree.semiBold,
      fontSize: fontSizes.lg,
    } as TextStyle,
    h5: {
      fontFamily: fonts.figtree.medium,
      fontSize: fontSizes.md,
    } as TextStyle,
    h6: {
      fontFamily: fonts.figtree.medium,
      fontSize: fontSizes.xs,
    } as TextStyle,
  },
  body: {
    large: {
      fontFamily: fonts.figtree.regular,
      fontSize: fontSizes.lg,
    } as TextStyle,
    largeSemiBold: {
      fontFamily: fonts.figtree.semiBold,
      fontSize: fontSizes.lg,
    } as TextStyle,
    default: {
      fontFamily: fonts.figtree.regular,
      fontSize: fontSizes.md,
    } as TextStyle,
    medium: {
      fontFamily: fonts.figtree.medium,
      fontSize: fontSizes.md,
    } as TextStyle,
    semiBold: {
      fontFamily: fonts.figtree.semiBold,
      fontSize: fontSizes.md,
    } as TextStyle,
    bold: {
      fontFamily: fonts.figtree.bold,
      fontSize: fontSizes.md,
    } as TextStyle,
    small: {
      fontFamily: fonts.figtree.regular,
      fontSize: fontSizes.sm,
    } as TextStyle,
    smallSemiBold: {
      fontFamily: fonts.figtree.semiBold,
      fontSize: fontSizes.sm,
    } as TextStyle,
  },
  button: {
    large: {
      fontFamily: fonts.figtree.semiBold,
      fontSize: fontSizes.lg,
    } as TextStyle,
    default: {
      fontFamily: fonts.figtree.semiBold,
      fontSize: fontSizes.md,
    } as TextStyle,
  },
  caption: {
    default: {
      fontFamily: fonts.figtree.regular,
      fontSize: fontSizes.sm,
    } as TextStyle,
    medium: {
      fontFamily: fonts.figtree.medium,
      fontSize: fontSizes.sm,
    } as TextStyle,
    small: {
      fontFamily: fonts.figtree.regular,
      fontSize: fontSizes.xs,
    } as TextStyle,
    smallSemiBold: {
      fontFamily: fonts.figtree.semiBold,
      fontSize: fontSizes.xs,
    } as TextStyle,
  },
  label: {
    large: {
      fontFamily: fonts.figtree.medium,
      fontSize: fontSizes.md,
    } as TextStyle,
    default: {
      fontFamily: fonts.figtree.medium,
      fontSize: fontSizes.sm,
    } as TextStyle,
    small: {
      fontFamily: fonts.figtree.medium,
      fontSize: fontSizes.xxs,
    } as TextStyle,
  },
} as const;

export type Fonts = typeof fonts;
export type FontSizes = typeof fontSizes;
export type Typography = typeof typography;
