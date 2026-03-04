import { View, Text } from 'react-native';
import { BLACK_PRIMARY, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';

// TODO Phase 2: Replace with ChatScreen from src/features/chat/presentation/screens/
export default function ChatTab() {
  return (
    <View style={{ flex: 1, backgroundColor: BLACK_PRIMARY, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: WHITE_PRIMARY }}>Chat — Phase 2</Text>
    </View>
  );
}
