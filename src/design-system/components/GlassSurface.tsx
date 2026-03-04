import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import type { GlassTier, GlassTint } from '../tokens/glass';
import { GLASS_TIERS, GLASS_TINTS } from '../tokens/glass';

// expo-glass-effect and expo-blur are imported conditionally to handle
// environments where native modules may not be linked yet.
let GlassView: React.ComponentType<any> | null = null;
let isGlassEffectAPIAvailable: (() => boolean) | null = null;
let BlurView: React.ComponentType<any> | null = null;

try {
  const glassEffect = require('expo-glass-effect');
  GlassView = glassEffect.GlassView;
  isGlassEffectAPIAvailable = glassEffect.isGlassEffectAPIAvailable;
} catch {
  // expo-glass-effect not yet installed
}

try {
  const blur = require('expo-blur');
  BlurView = blur.BlurView;
} catch {
  // expo-blur not yet installed
}

interface GlassSurfaceProps {
  tier?: GlassTier;
  tint?: GlassTint;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function GlassSurface({
  tier = 'medium',
  tint = 'default',
  style,
  children,
}: GlassSurfaceProps) {
  const tierConfig = GLASS_TIERS[tier];
  const tintColor = GLASS_TINTS[tint];

  const nativeGlassAvailable =
    GlassView !== null &&
    isGlassEffectAPIAvailable !== null &&
    isGlassEffectAPIAvailable();

  if (nativeGlassAvailable && GlassView) {
    return (
      <GlassView
        style={[styles.base, style]}
        tintColor={tintColor}
        glassEffectStyle="regular"
      >
        {children}
      </GlassView>
    );
  }

  if (BlurView) {
    return (
      <BlurView
        intensity={tierConfig.blur}
        tint="dark"
        style={[styles.base, { backgroundColor: tierConfig.background }, style]}
      >
        {children}
      </BlurView>
    );
  }

  // Final fallback: plain View with semi-transparent background
  return (
    <View style={[styles.base, { backgroundColor: tierConfig.background }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
