import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CHAT_BACKGROUND_COLOR, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';

// TODO Phase 2: Replace with ChatScreen from src/features/chat/presentation/screens/
export default function ChatSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: CHAT_BACKGROUND_COLOR, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: WHITE_PRIMARY }}>Chat {id} — Phase 2</Text>
    </View>
  );
}
