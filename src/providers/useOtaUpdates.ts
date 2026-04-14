import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

export function useOtaUpdates(): void {
  useEffect(() => {
    if (!Updates.isEnabled) return;
    async function checkAndApply(): Promise<void> {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch (e) {
        if (__DEV__) console.warn('[OTA] check/fetch failed:', e);
      }
    }
    checkAndApply();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkAndApply();
    });
    return () => sub.remove();
  }, []);
}
