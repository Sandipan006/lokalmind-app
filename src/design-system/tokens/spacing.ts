import { Dimensions, PixelRatio, Platform } from 'react-native';

// ─── Screen Dimensions ───────────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base design dimensions (iPhone 14 Pro — 393pt)
const BASE_WIDTH = 393;

// ─── Normalization ────────────────────────────────────────────────────────────
// Scale a size relative to the base screen width, capped to avoid over-scaling
// on large iPads. Use for spacing, padding, and layout dimensions.

export function normalize(size: number, factor = 0.5): number {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const delta = (scale - 1) * factor;
  return PixelRatio.roundToNearestPixel(size * (1 + delta));
}

// Scale font sizes — smaller factor to keep text readable across screen sizes.
export function normalizeFontSize(size: number): number {
  return normalize(size, 0.3);
}

export { SCREEN_WIDTH, SCREEN_HEIGHT };

// ─── Primitive Scale ─────────────────────────────────────────────────────────

export const SPACING = {
  xs:  normalize(4),
  sm:  normalize(8),
  md:  normalize(16),
  lg:  normalize(24),
  xl:  normalize(32),
  xxl: normalize(48),
} as const;

export const BORDER_RADIUS = {
  sm:   normalize(8),
  md:   normalize(12),
  lg:   normalize(16),
  xl:   normalize(24),
  full: 9999,
} as const;

// ─── Semantic Layout Tokens ───────────────────────────────────────────────────

export const LAYOUT = {
  screenPaddingH:  SPACING.md,
  screenPaddingV:  SPACING.lg,
  cardPadding:     SPACING.md,
  cardGap:         SPACING.sm,
  sectionGap:      SPACING.xl,
  inputHeight:     normalize(48),
  buttonHeightLg:  normalize(52),
  buttonHeightSm:  normalize(36),
  tabBarHeight:    normalize(83),
  headerHeight:    normalize(56),
} as const;
