import { View, Text } from 'react-native';
import { BLACK_PRIMARY, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';

// TODO Phase 3: Replace with SupportScreen from src/features/profile/presentation/screens/
export default function SupportScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: BLACK_PRIMARY, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: WHITE_PRIMARY }}>Support — Phase 3</Text>
    </View>
  );
}
