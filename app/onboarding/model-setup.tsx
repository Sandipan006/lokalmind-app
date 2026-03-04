import { View, Text } from 'react-native';
import { BLACK_PRIMARY, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';

// TODO Phase 1: Replace with ModelSetupScreen from src/features/models/presentation/screens/
export default function ModelSetupScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: BLACK_PRIMARY, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: WHITE_PRIMARY }}>Model Setup — Phase 1</Text>
    </View>
  );
}
