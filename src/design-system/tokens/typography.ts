export const FONTS = {
  // Figtree — primary UI font
  regular: 'Figtree-Regular',
  medium: 'Figtree-Medium',
  semiBold: 'Figtree-SemiBold',
  bold: 'Figtree-Bold',
  extraBold: 'Figtree-ExtraBold',
  black: 'Figtree-Black',
  light: 'Figtree-Light',
  italic: 'Figtree-Italic',
  mediumItalic: 'Figtree-MediumItalic',
  semiBoldItalic: 'Figtree-SemiBoldItalic',
  boldItalic: 'Figtree-BoldItalic',

  // Instrument Serif — accent/display
  serifRegular: 'InstrumentSerif-Regular',
  serifItalic: 'InstrumentSerif-Italic',

  // Bricolage Grotesque — secondary display
  grotesqueLight: 'BricolageGrotesque-Light',
  grotesqueRegular: 'BricolageGrotesque-Regular',
  grotesqueMedium: 'BricolageGrotesque-Medium',
  grotesqueSemiBold: 'BricolageGrotesque-SemiBold',
  grotesqueBold: 'BricolageGrotesque-Bold',
  grotesqueExtraBold: 'BricolageGrotesque-ExtraBold',
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;
