import { Tabs } from 'expo-router';
import { BLACK_PRIMARY, PRIMARY_ORANGE, TEXT_WHITE_40 } from '@/src/design-system/tokens/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: BLACK_PRIMARY, borderTopWidth: 0 },
        tabBarActiveTintColor: PRIMARY_ORANGE,
        tabBarInactiveTintColor: TEXT_WHITE_40,
      }}
    >
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="models" options={{ title: 'Models' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
