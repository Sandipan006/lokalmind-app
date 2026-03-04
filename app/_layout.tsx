import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ErrorBoundary } from '@/src/design-system/components';
import { useFontLoader } from '@/src/providers/useFontLoader';
import { BLACK_PRIMARY } from '@/src/design-system/tokens/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { fontsLoaded, fontError } = useFontLoader();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <StatusBar style="light" backgroundColor={BLACK_PRIMARY} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: BLACK_PRIMARY },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="model/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/ai-behavior" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/storage" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/support" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </ErrorBoundary>
  );
}
