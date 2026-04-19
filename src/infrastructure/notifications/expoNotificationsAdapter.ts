import type { ILocalNotifications, LocalNotificationTapPayload } from '@/src/core/ports/ILocalNotifications';
import { STORAGE_KEYS } from '@/src/infrastructure/storage/asyncStorageDriver';
import type { IAsyncStorageDriver } from '@/src/infrastructure/storage/asyncStorageDriver';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

/** Dedupe window for the same session + event kind. */
const DEDUPE_TTL_MS = 90_000;

/** Max inactivity reminders scheduled per local calendar day (conservative cap). */
const INACTIVITY_DAILY_MAX = 4;

const INACTIVITY_TIERS = [
  { delaySec: 4 * 3600, title: 'Still chatting?', body: 'Pick up where you left off in LokalMind.' },
  { delaySec: 10 * 3600, title: 'Your thread is waiting', body: 'A quick tap brings your last session back.' },
  { delaySec: 24 * 3600, title: 'Been a while', body: 'New ideas land better when you jot them down here.' },
  { delaySec: 30 * 3600, title: 'We saved your context', body: 'Open LokalMind when you are ready to continue.' },
] as const;

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

/** Local calendar day as YYYYMMDD for daily notification budget. */
function localCalendarYmd(d: Date): number {
  return d.getFullYear() * 10_000 + (d.getMonth() + 1) * 100 + d.getDate();
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

  private pendingInactivityNotificationIds: string[] = [];

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

  async hasNotificationPermission(): Promise<boolean> {
    if (!isIos()) return false;
    ensureNotificationHandler();
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  async requestNotificationPermission(): Promise<boolean> {
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
    const granted = await this.hasNotificationPermission();
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
    const granted = await this.hasNotificationPermission();
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
    const granted = await this.hasNotificationPermission();
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
    const granted = await this.hasNotificationPermission();
    if (!granted) return;

    await this.cancelPendingInactivityNotifications({ refundDailyCap: true });

    const ymdToday = localCalendarYmd(new Date());
    const storedYmd = await this.storage.getNumber(STORAGE_KEYS.NOTIFICATION_INACTIVITY_DAILY_YMD);
    let usedToday = (await this.storage.getNumber(STORAGE_KEYS.NOTIFICATION_INACTIVITY_DAILY_COUNT)) ?? 0;
    if (storedYmd !== ymdToday) {
      usedToday = 0;
    }
    const remaining = INACTIVITY_DAILY_MAX - usedToday;
    if (remaining <= 0) {
      return;
    }

    const tiers = INACTIVITY_TIERS.slice(0, Math.min(INACTIVITY_TIERS.length, remaining));
    const ids: string[] = [];
    for (const [tierIndex, tier] of tiers.entries()) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: tier.title,
          body: tier.body,
          data: { kind: 'inactivity', tierIndex },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: tier.delaySec,
          repeats: false,
        },
      });
      ids.push(id);
    }
    this.pendingInactivityNotificationIds = ids;
    await this.storage.setNumber(STORAGE_KEYS.NOTIFICATION_INACTIVITY_DAILY_YMD, ymdToday);
    await this.storage.setNumber(STORAGE_KEYS.NOTIFICATION_INACTIVITY_DAILY_COUNT, usedToday + tiers.length);
  }

  async onAppForeground(): Promise<void> {
    if (!isIos()) return;
    await this.cancelPendingInactivityNotifications({ refundDailyCap: true });
  }

  private async cancelPendingInactivityNotifications(options?: {
    refundDailyCap?: boolean;
  }): Promise<void> {
    const ids = this.pendingInactivityNotificationIds;
    this.pendingInactivityNotificationIds = [];
    let cancelledOk = 0;
    for (const id of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
        cancelledOk += 1;
      } catch {
        /* ignore */
      }
    }
    if (!options?.refundDailyCap || cancelledOk === 0) {
      return;
    }
    const ymdToday = localCalendarYmd(new Date());
    const storedYmd = await this.storage.getNumber(STORAGE_KEYS.NOTIFICATION_INACTIVITY_DAILY_YMD);
    let count = (await this.storage.getNumber(STORAGE_KEYS.NOTIFICATION_INACTIVITY_DAILY_COUNT)) ?? 0;
    if (storedYmd !== ymdToday) {
      return;
    }
    const next = Math.max(0, count - cancelledOk);
    await this.storage.setNumber(STORAGE_KEYS.NOTIFICATION_INACTIVITY_DAILY_COUNT, next);
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
