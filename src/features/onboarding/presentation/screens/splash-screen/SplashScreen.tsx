import { container } from '@/src/core/di/container';
import { Redirect } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { InitialAppRoute } from '@/src/features/onboarding/domain/usecases/ResolveInitialRouteUseCase';
import { splashScreenStyles as styles } from './SplashScreenStyles';

const SPLASH_MIN_DURATION_MS = 2500;

export function SplashScreen() {
  const [isChecking, setIsChecking] = useState(true);
  const [route, setRoute] = useState<InitialAppRoute>('/onboarding/welcome');
  const [minimumDurationPassed, setMinimumDurationPassed] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setMinimumDurationPassed(true);
    }, SPLASH_MIN_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    async function checkAppState() {
      try {
        await container.initializeContainer();
        const next = await container.resolveInitialRouteUseCase.execute();
        setRoute(next);
      } catch (error) {
        if (__DEV__) console.error('[SplashScreen] Failed to resolve initial route:', error);
        setRoute('/onboarding/welcome');
      } finally {
        setIsChecking(false);
      }
    }

    checkAppState();
  }, []);

  if (!minimumDurationPassed || isChecking) {
    return (
      <View style={styles.container}>
        <LottieView
          source={require('../../../assets/animations/splash.json')}
          autoPlay
          loop
          style={styles.animation}
        />
      </View>
    );
  }

  return <Redirect href={route} />;
}
