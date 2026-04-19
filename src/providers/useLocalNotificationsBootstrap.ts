import type { LocalNotificationTapPayload } from '@/src/core/ports/ILocalNotifications';
import { container } from '@/src/core/di/container';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

function navigateForPayload(
  router: ReturnType<typeof useRouter>,
  payload: LocalNotificationTapPayload,
): void {
  switch (payload.kind) {
    case 'chat':
      router.push(`/chat/${payload.sessionId}`);
      break;
    case 'memory':
      router.push('/profile/memory');
      break;
    case 'profile':
      router.push('/profile/ai-behavior');
      break;
    case 'inactivity':
      router.push('/(tabs)/chat');
      break;
    default:
      break;
  }
}

/** Registers iOS local notification tap handling and inactivity scheduling (permission requested from Welcome). */
export function useLocalNotificationsBootstrap(): void {
  const router = useRouter();
  const coldStartDispatched = useRef(false);

  useEffect(() => {
    const handle = (payload: LocalNotificationTapPayload) => {
      navigateForPayload(router, payload);
    };

    void container.initializeContainer().then(() => {
      container.localNotifications.setResponseListener(handle);
      if (!coldStartDispatched.current) {
        coldStartDispatched.current = true;
        void container.localNotifications.dispatchPendingNotificationResponse();
      }
    });

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        void container.localNotifications.onAppBackground();
      } else if (next === 'active') {
        void container.localNotifications.onAppForeground();
      }
    });

    return () => {
      sub.remove();
      container.localNotifications.clearResponseListener();
    };
  }, [router]);
}
