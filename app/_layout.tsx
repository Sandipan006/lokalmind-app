import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ErrorBoundary } from '@/src/design-system/components';
import { useFontLoader } from '@/src/providers/useFontLoader';
import { useOtaUpdates } from '@/src/providers/useOtaUpdates';
import { BLACK_PRIMARY } from '@/src/design-system/tokens/colors';
import { container } from '@/src/core/di/container';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { fontsLoaded, fontError } = useFontLoader();
  useOtaUpdates();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background') {
        void container.initializeContainer()
          .then(() => container.releaseAllLlamaContextsIfReady())
          .catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider preload={false}>
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
            <Stack.Screen name="profile/mode-system-prompts" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="profile/storage" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="profile/support" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
