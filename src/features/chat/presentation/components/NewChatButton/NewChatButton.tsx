import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/src/design-system/components';
import { borderRadius, spacing } from '@/src/design-system/tokens/spacing';
import { styles } from './NewChatButtonStyles';

interface NewChatButtonProps {
  onPress: () => void;
}

export function NewChatButton({ onPress }: NewChatButtonProps) {
  const insets = useSafeAreaInsets();
  // Sit above the bottom tab bar: tab bar is ~49pt + safe area bottom inset.
  const bottomOffset = insets.bottom + 49 + spacing.sm;

  return (
    <View style={[styles.anchor, { bottom: bottomOffset }]}>
      <GlassSurface tier="medium" style={{ borderRadius: borderRadius.full, overflow: 'hidden' }}>
        <TouchableOpacity style={styles.pill} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.icon}>✎</Text>
          <Text style={styles.label}>Chat</Text>
        </TouchableOpacity>
      </GlassSurface>
    </View>
  );
}
