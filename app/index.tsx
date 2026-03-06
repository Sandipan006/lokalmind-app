import { SplashScreen } from '@/src/features/onboarding/presentation/screens';
import { Text, View } from 'react-native';

export default function Index() {
  try {
    return <SplashScreen />;
  } catch (error) {
    console.error('Index render error:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff' }}>Error: {String(error)}</Text>
      </View>
    );
  }
}
