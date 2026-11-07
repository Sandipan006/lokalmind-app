import type { ILocalNotifications, LocalNotificationTapPayload } from '@/src/core/ports/ILocalNotifications';
import { STORAGE_KEYS } from '@/src/infrastructure/storage/asyncStorageDriver';
import type { IAsyncStorageDriver } from '@/src/infrastructure/storage/asyncStorageDriver';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { buildReminderPlan, REMINDER_ID_PREFIX } from './reminderPlan';

/** Dedupe window for the same session + event kind. */
const DEDUPE_TTL_MS = 90_000;

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
  // 'inactivity' = reminders scheduled by builds before the 56-slot plan; still open the chat tab.
  if (kind === 'inactivity' || kind === 'reminder') {
    return { kind: 'reminder' };
  }
  return null;
}

export class ExpoNotificationsAdapter implements ILocalNotifications {
  private responseListener: ((payload: LocalNotificationTapPayload) => void) | null = null;

  private subscription: Notifications.Subscription | null = null;

  private readonly dedupeAt = new Map<string, number>();

  /** Serialises reschedules so a quick background/foreground flip cannot interleave. */
  private reminderQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: Pick<IAsyncStorageDriver, 'getBoolean' | 'setBoolean'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

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

  async areRemindersEnabled(): Promise<boolean> {
    return (await this.storage.getBoolean(STORAGE_KEYS.NOTIFICATION_REMINDERS_ENABLED)) ?? true;
  }

  async setRemindersEnabled(enabled: boolean): Promise<void> {
    await this.storage.setBoolean(STORAGE_KEYS.NOTIFICATION_REMINDERS_ENABLED, enabled);
    await this.refreshReminders();
  }

  /** Leaving the app: start a fresh 14-day plan from now. */
  async onAppBackground(): Promise<void> {
    await this.refreshReminders();
  }

  /** Back in the app: the count restarts from the first slot after this moment. */
  async onAppForeground(): Promise<void> {
    await this.refreshReminders();
  }

  private refreshReminders(): Promise<void> {
    if (!isIos()) return Promise.resolve();
    const run = this.reminderQueue.then(() => this.rebuildReminders());
    this.reminderQueue = run.catch(() => undefined);
    return run.catch(() => undefined);
  }

  /** Cancel everything this feature owns, then schedule the next plan (if allowed). */
  private async rebuildReminders(): Promise<void> {
    ensureNotificationHandler();
    await this.cancelReminders();
    if (!(await this.areRemindersEnabled()) || !(await this.hasNotificationPermission())) return;
    const plan = buildReminderPlan(this.now());
    await Promise.all(
      plan.map((r) =>
        Notifications.scheduleNotificationAsync({
          identifier: r.id,
          content: { title: r.copy.title, body: r.copy.body, data: { kind: 'reminder', slot: r.slot } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
        }),
      ),
    );
  }

  /** Looks up pending ids from the OS, so it still works after the app was killed. */
  private async cancelReminders(): Promise<void> {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const owned = pending.filter(
      (n) =>
        n.identifier.startsWith(REMINDER_ID_PREFIX) ||
        (n.content.data as Record<string, unknown> | null)?.kind === 'inactivity',
    );
    await Promise.all(owned.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
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
