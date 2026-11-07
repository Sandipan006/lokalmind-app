import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { ExpoNotificationsAdapter } from '../expoNotificationsAdapter';
import { REMINDER_TOTAL } from '../reminderPlan';

// The adapter only needs STORAGE_KEYS from this module; keep the native AsyncStorage out of Jest.
jest.mock('@react-native-async-storage/async-storage', () => ({}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const n = Notifications as jest.Mocked<typeof Notifications>;

function makeStorage(initial?: boolean) {
  let value: boolean | null = initial ?? null;
  return {
    getBoolean: jest.fn(async () => value),
    setBoolean: jest.fn(async (_k: string, v: boolean) => {
      value = v;
    }),
  };
}

const NOW = new Date(2026, 10, 8, 0, 19);
const pending = (identifier: string, data: Record<string, unknown> = {}) =>
  ({ identifier, content: { data } }) as never;

function adapter(storage = makeStorage(), now = NOW) {
  return new ExpoNotificationsAdapter(storage, () => now);
}

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
  n.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  n.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  n.scheduleNotificationAsync.mockResolvedValue('id');
  n.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
});

test('background schedules 56 dated reminders', async () => {
  await adapter().onAppBackground();
  expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_TOTAL);
  const first = n.scheduleNotificationAsync.mock.calls[0]![0] as never as {
    identifier: string;
    content: { title: string; body: string; data: { kind: string } };
    trigger: { type: string; date: Date };
  };
  expect(first.identifier).toBe('lm-reminder-0');
  expect(first.content.data.kind).toBe('reminder');
  expect(first.trigger.type).toBe('date');
  expect(first.trigger.date.getTime()).toBeGreaterThan(NOW.getTime());
});

test('foreground resets: cancels old plan and schedules a fresh one', async () => {
  n.getAllScheduledNotificationsAsync.mockResolvedValue([pending('lm-reminder-0'), pending('lm-reminder-1')]);
  await adapter().onAppForeground();
  expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('lm-reminder-0');
  expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('lm-reminder-1');
  expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_TOTAL);
  // cancel happens before any schedule
  const lastCancel = Math.max(...n.cancelScheduledNotificationAsync.mock.invocationCallOrder);
  const firstSchedule = Math.min(...n.scheduleNotificationAsync.mock.invocationCallOrder);
  expect(lastCancel).toBeLessThan(firstSchedule);
});

test('cancels from OS state, so a killed app still clears its old plan', async () => {
  n.getAllScheduledNotificationsAsync.mockResolvedValue([pending('lm-reminder-7')]);
  await adapter().onAppBackground(); // fresh adapter instance = no in-memory ids
  expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('lm-reminder-7');
});

test('cancels legacy inactivity notifications but leaves unrelated ones', async () => {
  n.getAllScheduledNotificationsAsync.mockResolvedValue([
    pending('legacy-uuid', { kind: 'inactivity' }),
    pending('other', { kind: 'chat' }),
  ]);
  await adapter().onAppBackground();
  expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
  expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('legacy-uuid');
});

test('without permission: cancels but schedules nothing', async () => {
  n.getPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);
  n.getAllScheduledNotificationsAsync.mockResolvedValue([pending('lm-reminder-0')]);
  await adapter().onAppBackground();
  expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
  expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('reminders default to on', async () => {
  expect(await adapter().areRemindersEnabled()).toBe(true);
});

test('turning reminders off cancels the plan and stops scheduling', async () => {
  const storage = makeStorage();
  const a = adapter(storage);
  n.getAllScheduledNotificationsAsync.mockResolvedValue([pending('lm-reminder-0')]);
  await a.setRemindersEnabled(false);
  expect(storage.setBoolean).toHaveBeenCalledWith(expect.any(String), false);
  expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('lm-reminder-0');
  await a.onAppBackground();
  expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('turning reminders back on schedules a fresh plan', async () => {
  const a = adapter(makeStorage(false));
  await a.setRemindersEnabled(true);
  expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_TOTAL);
});

test('rapid background then foreground never interleave', async () => {
  const a = adapter();
  await Promise.all([a.onAppBackground(), a.onAppForeground()]);
  expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_TOTAL * 2);
  expect(n.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2);
  const lookups = n.getAllScheduledNotificationsAsync.mock.invocationCallOrder;
  const schedules = n.scheduleNotificationAsync.mock.invocationCallOrder;
  // the second rebuild starts only after the first batch of schedules ended
  expect(lookups[1]!).toBeGreaterThan(schedules[REMINDER_TOTAL - 1]!);
});

test('a scheduling failure does not throw into the app lifecycle', async () => {
  n.scheduleNotificationAsync.mockRejectedValue(new Error('boom'));
  await expect(adapter().onAppBackground()).resolves.toBeUndefined();
});

test('a failure does not block the next reschedule', async () => {
  const a = adapter();
  n.scheduleNotificationAsync.mockRejectedValueOnce(new Error('boom'));
  await a.onAppBackground();
  n.scheduleNotificationAsync.mockClear();
  await a.onAppForeground();
  expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_TOTAL);
});

test('non-iOS does nothing', async () => {
  Platform.OS = 'android';
  await adapter().onAppBackground();
  expect(n.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('tap on a reminder or a legacy inactivity notification opens the chat tab', () => {
  const listener = jest.fn();
  adapter().setResponseListener(listener);
  const handler = n.addNotificationResponseReceivedListener.mock.calls[0]![0] as (r: unknown) => void;
  const tap = (data: unknown) => handler({ notification: { request: { content: { data } } } });
  tap({ kind: 'reminder', slot: 'night' });
  tap({ kind: 'inactivity', tierIndex: 2 });
  tap({ kind: 'chat', sessionId: 's1' });
  tap({ kind: 'junk' });
  expect(listener.mock.calls.map((c) => c[0])).toEqual([
    { kind: 'reminder' },
    { kind: 'reminder' },
    { kind: 'chat', sessionId: 's1' },
  ]);
});

describe('chat-complete notice', () => {
  const original = AppState.currentState;
  const setAppState = (v: string) => {
    (AppState as { currentState: string }).currentState = v;
  };
  afterEach(() => setAppState(original));

  test('is skipped while the app is in the foreground', async () => {
    setAppState('active');
    await adapter().notifyChatTurnComplete({ sessionId: 's1', success: true });
    expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('is sent immediately in the background, once per 90 s', async () => {
    setAppState('background');
    const a = adapter();
    await a.notifyChatTurnComplete({ sessionId: 's1', success: true });
    await a.notifyChatTurnComplete({ sessionId: 's1', success: true });
    expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(n.scheduleNotificationAsync.mock.calls[0]![0]).toMatchObject({ trigger: null });
  });
});
