import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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
      } catch {}
    }
    checkAndApply();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkAndApply();
    });
    return () => sub.remove();
  }, []);
}
