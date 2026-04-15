import type { ILocalNotifications, LocalNotificationTapPayload } from '@/src/core/ports/ILocalNotifications';
import { STORAGE_KEYS } from '@/src/infrastructure/storage/asyncStorageDriver';
import type { IAsyncStorageDriver } from '@/src/infrastructure/storage/asyncStorageDriver';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

/** Dedupe window for the same session + event kind. */
const DEDUPE_TTL_MS = 90_000;

/** Fire inactivity reminder this many seconds after backgrounding (if cooldown allows). */
const INACTIVITY_DELAY_SEC = 6 * 3600;

/** Minimum time between scheduling inactivity reminders. */
const INACTIVITY_SCHEDULE_COOLDOWN_MS = 12 * 3600 * 1000;

let handlerConfigured = false;

function ensureNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const foreground = AppState.currentState === 'active';
      const show = !foreground;
      return {
        shouldShowBanner: show,
        shouldShowList: show,
        shouldPlaySound: show,
        shouldSetBadge: false,
      };
    },
  });
}

function isIos(): boolean {
  return Platform.OS === 'ios';
}

function isBackgroundForBanner(): boolean {
  return AppState.currentState !== 'active';
}

function parseData(data: Record<string, unknown> | undefined | null): LocalNotificationTapPayload | null {
  if (!data || typeof data !== 'object') return null;
  const kind = data.kind;
  if (kind === 'chat' && typeof data.sessionId === 'string') {
    return { kind: 'chat', sessionId: data.sessionId };
  }
  if (kind === 'memory' && typeof data.sessionId === 'string') {
    return { kind: 'memory', sessionId: data.sessionId };
  }
  if (kind === 'profile') {
    return { kind: 'profile' };
  }
  if (kind === 'inactivity') {
    return { kind: 'inactivity' };
  }
  return null;
}

export class ExpoNotificationsAdapter implements ILocalNotifications {
  private responseListener: ((payload: LocalNotificationTapPayload) => void) | null = null;

  private subscription: Notifications.Subscription | null = null;

  private readonly dedupeAt = new Map<string, number>();

  private pendingInactivityNotificationId: string | null = null;

  constructor(private readonly storage: Pick<IAsyncStorageDriver, 'getNumber' | 'setNumber'>) {}

  setResponseListener(listener: (payload: LocalNotificationTapPayload) => void): void {
    if (!isIos()) return;
    ensureNotificationHandler();
    this.responseListener = listener;
    this.subscription?.remove();
    this.subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = parseData(response.notification.request.content.data as Record<string, unknown>);
      if (payload) listener(payload);
    });
  }

  clearResponseListener(): void {
    this.subscription?.remove();
    this.subscription = null;
    this.responseListener = null;
  }

  /** Call once after app mount to handle cold-start opens from a notification. */
  async dispatchPendingNotificationResponse(): Promise<void> {
    if (!isIos() || !this.responseListener) return;
    const last = await Notifications.getLastNotificationResponseAsync();
    if (!last) return;
    const payload = parseData(last.notification.request.content.data as Record<string, unknown>);
    if (payload) this.responseListener(payload);
  }

  async ensurePermissions(): Promise<boolean> {
    if (!isIos()) return false;
    ensureNotificationHandler();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async notifyChatTurnComplete(params: {
    sessionId: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    if (!isIos() || !isBackgroundForBanner()) return;
    const key = `${params.sessionId}:chat:${params.success ? 'ok' : 'err'}`;
    if (this.shouldDedupe(key)) return;
    const granted = await this.ensurePermissions();
    if (!granted) return;

    const title = params.success ? 'Reply ready' : 'Generation failed';
    const body = params.success
      ? 'Open LokalMind to read the response.'
      : params.errorMessage?.slice(0, 200) || 'Something went wrong.';
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { kind: 'chat', sessionId: params.sessionId },
      },
      trigger: null,
    });
  }

  async notifySessionMemorySaved(params: { sessionId: string; sessionTitle: string }): Promise<void> {
    if (!isIos() || !isBackgroundForBanner()) return;
    const key = `${params.sessionId}:memory_saved`;
    if (this.shouldDedupe(key)) return;
    const granted = await this.ensurePermissions();
    if (!granted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Memory saved',
        body: params.sessionTitle.slice(0, 80) || 'Session notes were saved.',
        data: { kind: 'memory', sessionId: params.sessionId },
      },
      trigger: null,
    });
  }

  async notifyProfileUpdated(): Promise<void> {
    if (!isIos() || !isBackgroundForBanner()) return;
    const key = 'profile:updated';
    if (this.shouldDedupe(key)) return;
    const granted = await this.ensurePermissions();
    if (!granted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Profile updated',
        body: 'Your remembered profile was refreshed.',
        data: { kind: 'profile' },
      },
      trigger: null,
    });
  }

  async onAppBackground(): Promise<void> {
    if (!isIos()) return;
    ensureNotificationHandler();
    const granted = await this.ensurePermissions();
    if (!granted) return;

    const lastScheduled = await this.storage.getNumber(STORAGE_KEYS.NOTIFICATION_INACTIVITY_LAST_SCHEDULED_AT);
    if (lastScheduled !== null && Date.now() - lastScheduled < INACTIVITY_SCHEDULE_COOLDOWN_MS) {
      return;
    }

    if (this.pendingInactivityNotificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(this.pendingInactivityNotificationId);
      } catch {
        /* ignore */
      }
      this.pendingInactivityNotificationId = null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Still there?',
        body: 'Continue your conversation in LokalMind.',
        data: { kind: 'inactivity' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: INACTIVITY_DELAY_SEC,
        repeats: false,
      },
    });
    this.pendingInactivityNotificationId = id;
    await this.storage.setNumber(STORAGE_KEYS.NOTIFICATION_INACTIVITY_LAST_SCHEDULED_AT, Date.now());
  }

  async onAppForeground(): Promise<void> {
    if (!isIos() || !this.pendingInactivityNotificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(this.pendingInactivityNotificationId);
    } catch {
      /* ignore */
    }
    this.pendingInactivityNotificationId = null;
  }

  private shouldDedupe(key: string): boolean {
    const now = Date.now();
    const prev = this.dedupeAt.get(key);
    if (prev !== undefined && now - prev < DEDUPE_TTL_MS) {
      return true;
    }
    this.dedupeAt.set(key, now);
    return false;
  }
}
