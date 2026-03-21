import { BLACK_PRIMARY, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

// TODO Phase 1: Replace with ModelDetailScreen from src/features/models/presentation/screens/
export default function ModelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: BLACK_PRIMARY, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: WHITE_PRIMARY }}>Model {id} - Phase 1</Text>
    </View>
  );
}
