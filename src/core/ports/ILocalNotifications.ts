/**
 * Local (on-device) notifications - implemented in infrastructure (expo-notifications).
 * Domain/use cases depend only on this port; no direct expo imports.
 */

export type LocalNotificationTapPayload =
  | { kind: 'chat'; sessionId: string }
  | { kind: 'reminder' };

export interface ILocalNotifications {
  /** iOS: true if notifications are already allowed. Does not prompt. */
  hasNotificationPermission(): Promise<boolean>;

  /** iOS: system permission prompt when needed; call from onboarding. Resolves false if denied or unsupported. */
  requestNotificationPermission(): Promise<boolean>;

  /** Chat generation finished - surfaces only when app is not in foreground (iOS). */
  notifyChatTurnComplete(params: {
    sessionId: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<void>;

  /**
   * App left the foreground: replace all pending reminders with a fresh plan of 56 slots
   * (4 a day, about 14 days) counted from now.
   */
  onAppBackground(): Promise<void>;

  /** App active: same reset, so the plan always starts from the latest open. */
  onAppForeground(): Promise<void>;

  /** Reminders are on by default; the user can turn them off (cancels all pending ones). */
  areRemindersEnabled(): Promise<boolean>;
  setRemindersEnabled(enabled: boolean): Promise<void>;

  /** Handle notification taps (deep link). Call once from root layout after container init. */
  setResponseListener(listener: (payload: LocalNotificationTapPayload) => void): void;

  /** Remove tap listener (e.g. layout unmount). */
  clearResponseListener(): void;

  /** Deliver cold-start notification open after listener is registered. */
  dispatchPendingNotificationResponse(): Promise<void>;
}
