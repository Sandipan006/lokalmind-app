import React from 'react';
import { Pressable, Text, StyleSheet, type ViewStyle, type TextStyle, type StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { PRIMARY_ORANGE, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { typography, spacing, borderRadius } from '@/src/design-system/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
}: PrimaryButtonProps) {
  const scale = useSharedValue(1);
  const shadowOffset = useSharedValue(4);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOffset: { width: 0, height: shadowOffset.value },
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    shadowOffset.value = withSpring(2, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    shadowOffset.value = withSpring(4, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[styles.button, animatedStyle, disabled && styles.disabled, style]}
    >
      <Text style={[styles.text, textStyle]}>
        {loading ? 'Loading...' : title}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.lg,
    // paddingHorizontal: spacing.xl,
    backgroundColor: PRIMARY_ORANGE,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button.default,
    color: WHITE_PRIMARY,
  },
});
