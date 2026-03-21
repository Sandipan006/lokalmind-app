import { BLACK_PRIMARY, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { Text, View } from 'react-native';

// TODO Phase 3: Replace with StorageScreen from src/features/profile/presentation/screens/
export default function StorageScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: BLACK_PRIMARY, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: WHITE_PRIMARY }}>Storage - Phase 3</Text>
    </View>
  );
}
