import { Stack } from 'expo-router';
import { BLACK_PRIMARY } from '@/src/design-system/tokens/colors';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: BLACK_PRIMARY } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="username" />
      <Stack.Screen name="model-setup" />
    </Stack>
  );
}
