import { isAppBusy, onAppIdle } from '@/src/core/appBusy';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function useOtaUpdates(): void {
  useEffect(() => {
    if (!Updates.isEnabled) return;
    let checking = false;
    let fetchedUpdate = false;

    // Reload only at a safe point: never while the user types, generates or downloads.
    async function reloadIfIdle(): Promise<void> {
      if (!fetchedUpdate || isAppBusy()) return;
      fetchedUpdate = false;
      await Updates.reloadAsync();
    }

    async function checkAndApply(): Promise<void> {
      if (checking) return;
      checking = true;
      try {
        if (!fetchedUpdate) {
          const result = await Updates.checkForUpdateAsync();
          if (!result.isAvailable) return;
          await Updates.fetchUpdateAsync();
          fetchedUpdate = true;
        }
        await reloadIfIdle();
      } catch (e) {
        if (__DEV__) console.warn('[OTA] check/fetch failed:', e);
      } finally {
        checking = false;
      }
    }

    void checkAndApply();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void checkAndApply();
    });
    const offIdle = onAppIdle(() => void reloadIfIdle().catch(() => undefined));
    return () => {
      sub.remove();
      offIdle();
    };
  }, []);
}
