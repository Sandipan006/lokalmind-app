import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 393;

export function normalize(size: number, factor = 0.5): number {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const delta = (scale - 1) * factor;
  return PixelRatio.roundToNearestPixel(size * (1 + delta));
}

export function normalizeFontSize(size: number): number {
  return normalize(size, 0.3);
}

export { SCREEN_WIDTH, SCREEN_HEIGHT };

export const spacing = {
  xxxs: normalize(2),
  xxs: normalize(4),
  xs: normalize(8),
  sm: normalize(12),
  md: normalize(16),
  lg: normalize(20),
  xl: normalize(24),
  xxl: normalize(32),
  xxxl: normalize(40),
  xxxxl: normalize(48),
  xxxxxl: normalize(64),
} as const;

export const spacingAliases = {
  gutter: spacing.md,
  gap: spacing.sm,
  section: spacing.xl,
  screen: spacing.lg,
  component: spacing.md,
} as const;

export const borderRadius = {
  none: 0,
  xs: normalize(4),
  sm: normalize(8),
  md: normalize(12),
  lg: normalize(16),
  xl: normalize(20),
  xxl: normalize(24),
  full: 9999,
} as const;

export type Spacing = typeof spacing;
export type SpacingAliases = typeof spacingAliases;
export type BorderRadius = typeof borderRadius;
