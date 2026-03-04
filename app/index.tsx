import { Redirect } from 'expo-router';

// TODO Phase 2: Replace with SplashScreen that checks onboarding:complete
// and redirects to onboarding/welcome or (tabs)/chat accordingly.
export default function Index() {
  return <Redirect href="/(tabs)/chat" />;
}
