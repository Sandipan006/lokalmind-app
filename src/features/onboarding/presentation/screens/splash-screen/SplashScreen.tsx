import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { container } from '@/src/core/di/container';
import { clearLocalData } from '@/scripts/clearLocalData';
import { splashScreenStyles as styles } from './SplashScreenStyles';

const SPLASH_MIN_DURATION_MS = 2500;

export function SplashScreen() {
  const [isChecking, setIsChecking] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [minimumDurationPassed, setMinimumDurationPassed] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setMinimumDurationPassed(true);
    }, SPLASH_MIN_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        // Dev only: uncomment to clear local app data on next app launch.
        // await clearLocalData();

        await container.initializeContainer();
        const complete = await container.userRepository.isOnboardingComplete();
        setIsComplete(complete);
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
        setIsComplete(false);
      } finally {
        setIsChecking(false);
      }
    }

    checkOnboarding();
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

  return <Redirect href={isComplete ? '/(tabs)/chat' : '/onboarding/welcome'} />;
}
