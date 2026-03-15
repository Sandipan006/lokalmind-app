import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { container } from '@/src/core/di/container';
import { clearLocalData, clearLLMFiles } from '@/scripts/clearLocalData';
import { splashScreenStyles as styles } from './SplashScreenStyles';

const SPLASH_MIN_DURATION_MS = 2500;

type AppRoute = '/chat/new' | '/onboarding/model-setup' | '/onboarding/welcome';

export function SplashScreen() {
  const [isChecking, setIsChecking] = useState(true);
  const [route, setRoute] = useState<AppRoute>('/onboarding/welcome');
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
        // Dev only: uncomment to reset app state on next launch.
        // await clearLocalData();   // clears AsyncStorage + SQLite
        // await clearLLMFiles();    // deletes downloaded GGUF/Whisper files

        await container.initializeContainer();
        const onboardingComplete = await container.userRepository.isOnboardingComplete();

        if (!onboardingComplete) {
          setRoute('/onboarding/welcome');
          return;
        }

        const hasModelResult = await container.modelRepository.hasDownloadedModel();
        const hasModel = hasModelResult.success ? hasModelResult.data : false;

        if (hasModel) {
          const allModelsResult = await container.modelRepository.getAllModels();
          if (allModelsResult.success) {
            const downloaded = allModelsResult.data.filter((m) => m.isDownloaded);
            console.log('[SplashScreen] Downloaded models:', downloaded.map((m) => m.id));
          }
        } else {
          console.log('[SplashScreen] No downloaded models found.');
        }

        setRoute(hasModel ? '/chat/new' : '/onboarding/model-setup');
      } catch (error) {
        console.error('Failed to check app state:', error);
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
