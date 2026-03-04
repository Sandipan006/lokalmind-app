// Glass tier definitions for GlassSurface component.
// These values are used as fallback when expo-glass-effect native glass is unavailable (iOS < 26).

export type GlassTier = 'ultra' | 'heavy' | 'medium' | 'light';
export type GlassTint = 'default' | 'brand';

export const GLASS_TIERS: Record<GlassTier, { blur: number; background: string }> = {
  ultra: {
    blur: 40,
    background: 'rgba(255,255,255,0.08)',
  },
  heavy: {
    blur: 24,
    background: 'rgba(255,255,255,0.12)',
  },
  medium: {
    blur: 16,
    background: 'rgba(255,255,255,0.16)',
  },
  light: {
    blur: 8,
    background: 'rgba(255,255,255,0.20)',
  },
};

export const GLASS_TINTS: Record<GlassTint, string> = {
  default: 'rgba(255,255,255,0.0)',
  brand: 'rgba(255,66,11,0.15)',
};
