import { SplashScreen } from '@/src/features/onboarding/presentation/screens';
import { BLACK_PRIMARY, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { Text, View } from 'react-native';

export default function Index() {
  try {
    return <SplashScreen />;
  } catch (error) {
    if (__DEV__) console.error('Index render error:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BLACK_PRIMARY }}>
        <Text style={{ color: WHITE_PRIMARY }}>
          {__DEV__ ? `Error: ${String(error)}` : 'Something went wrong. Please restart the app.'}
        </Text>
      </View>
    );
  }
}
