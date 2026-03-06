import { PrimaryButton } from '@/src/design-system/components';
import { router } from 'expo-router';
import React from 'react';
import { ImageBackground, Text, View } from 'react-native';
import { welcomeScreenStyles as styles } from './WelcomeScreenStyles';

export function WelcomeScreen() {
  const handleGetStarted = () => {
    router.push('/onboarding/username');
  };

  return (
    <ImageBackground
      source={require('../../../assets/images/SplashScreen.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <View style={styles.brandingSection}>
          <Text style={styles.appName}>LokalMind</Text>
          <Text style={styles.tagline}>Your Private AI, Always Offline</Text>
        </View>
        <View style={styles.buttonSection}>
          <PrimaryButton
            title="Begin Your Journey"
            onPress={handleGetStarted}
            style={styles.primaryButton}
          />
        </View>
      </View>
    </ImageBackground>
  );
}
