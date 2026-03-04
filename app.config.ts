import * as dotenv from 'dotenv';
import { ConfigContext, ExpoConfig } from 'expo/config';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'LokalMind',
  slug: 'lokalmind-app',
  version: '2.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'lokalmind',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.lokalmind.app',
  },
  android: {
    package: 'com.lokalmind.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-dev-client',
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#0F0F0F',
      },
    ],
    'expo-sqlite',
    'llama.rn',
    'expo-background-task',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
  owner: process.env.APP_OWNER,
});
