// ─── Primitive Font Families ─────────────────────────────────────────────────

export const FONTS = {
  // Figtree — primary UI font
  regular:         'Figtree-Regular',
  medium:          'Figtree-Medium',
  semiBold:        'Figtree-SemiBold',
  bold:            'Figtree-Bold',
  extraBold:       'Figtree-ExtraBold',
  black:           'Figtree-Black',
  light:           'Figtree-Light',
  italic:          'Figtree-Italic',
  mediumItalic:    'Figtree-MediumItalic',
  semiBoldItalic:  'Figtree-SemiBoldItalic',
  boldItalic:      'Figtree-BoldItalic',

  // Instrument Serif — accent/display
  serifRegular:    'InstrumentSerif-Regular',
  serifItalic:     'InstrumentSerif-Italic',

  // Bricolage Grotesque — secondary display
  grotesqueLight:      'BricolageGrotesque-Light',
  grotesqueRegular:    'BricolageGrotesque-Regular',
  grotesqueMedium:     'BricolageGrotesque-Medium',
  grotesqueSemiBold:   'BricolageGrotesque-SemiBold',
  grotesqueBold:       'BricolageGrotesque-Bold',
  grotesqueExtraBold:  'BricolageGrotesque-ExtraBold',
} as const;

// ─── Primitive Scale ─────────────────────────────────────────────────────────

import { normalizeFontSize } from './spacing';

export const FONT_SIZE = {
  xxs:  normalizeFontSize(10),
  xs:   normalizeFontSize(12),
  sm:   normalizeFontSize(14),
  md:   normalizeFontSize(16),
  lg:   normalizeFontSize(18),
  xl:   normalizeFontSize(20),
  xxl:  normalizeFontSize(24),
  xxxl: normalizeFontSize(32),
} as const;

// ─── Semantic Text Styles ────────────────────────────────────────────────────
// Composites for common roles. Use these in components instead of raw values.

export const TEXT_STYLES = {
  displayLarge:  { fontFamily: FONTS.grotesqueBold,    fontSize: FONT_SIZE.xxxl },
  displayMedium: { fontFamily: FONTS.grotesqueSemiBold, fontSize: FONT_SIZE.xxl },

  headingLarge:  { fontFamily: FONTS.bold,     fontSize: FONT_SIZE.xl },
  headingMedium: { fontFamily: FONTS.semiBold,  fontSize: FONT_SIZE.lg },
  headingSmall:  { fontFamily: FONTS.semiBold,  fontSize: FONT_SIZE.md },

  bodyLarge:     { fontFamily: FONTS.regular,  fontSize: FONT_SIZE.md },
  bodyMedium:    { fontFamily: FONTS.regular,  fontSize: FONT_SIZE.sm },

  label:         { fontFamily: FONTS.medium,   fontSize: FONT_SIZE.sm },
  caption:       { fontFamily: FONTS.regular,  fontSize: FONT_SIZE.xs },

  chatMessage:   { fontFamily: FONTS.regular,  fontSize: FONT_SIZE.md },
  chatTimestamp: { fontFamily: FONTS.regular,  fontSize: FONT_SIZE.xs },
} as const;
