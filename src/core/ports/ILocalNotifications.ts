/**
 * Local (on-device) notifications - implemented in infrastructure (expo-notifications).
 * Domain/use cases depend only on this port; no direct expo imports.
 */

export type LocalNotificationTapPayload =
  | { kind: 'chat'; sessionId: string }
  | { kind: 'memory'; sessionId: string }
  | { kind: 'profile' }
  | { kind: 'inactivity' };

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

  /** Session memory / summary persisted after summarization. */
  notifySessionMemorySaved(params: { sessionId: string; sessionTitle: string }): Promise<void>;

  /** User profile text was updated. */
  notifyProfileUpdated(): Promise<void>;

  /** App became inactive/background - may schedule inactivity reminder (cooldown + cancel-replace). */
  onAppBackground(): Promise<void>;

  /** App active - cancel pending inactivity reminder. */
  onAppForeground(): Promise<void>;

  /** Handle notification taps (deep link). Call once from root layout after container init. */
  setResponseListener(listener: (payload: LocalNotificationTapPayload) => void): void;

  /** Remove tap listener (e.g. layout unmount). */
  clearResponseListener(): void;

  /** Deliver cold-start notification open after listener is registered. */
  dispatchPendingNotificationResponse(): Promise<void>;
}
