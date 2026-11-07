import { setBusy } from '@/src/core/appBusy';
import * as Updates from 'expo-updates';
import { AppState } from 'react-native';
import { useOtaUpdates } from '../useOtaUpdates';

let mockIsEnabled = true;
jest.mock('expo-updates', () => ({
  get isEnabled() {
    return mockIsEnabled;
  },
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

// Run the hook's effect directly, without a renderer; keep its cleanup for unmount.
let cleanup: (() => void) | void;
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: (fn: () => (() => void) | void) => {
    cleanup = fn();
  },
}));

const updates = Updates as jest.Mocked<typeof Updates>;
// Alias so the hooks lint rule does not flag the direct call outside a component.
const startOta = useOtaUpdates;
const flush = () => new Promise<void>((r) => setImmediate(r));

let appStateHandler: ((s: string) => void) | undefined;
const remove = jest.fn();

async function mount(): Promise<void> {
  startOta();
  await flush();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsEnabled = true;
  updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true } as never);
  updates.fetchUpdateAsync.mockResolvedValue({} as never);
  updates.reloadAsync.mockResolvedValue(undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, h: (s: string) => void) => {
  appStateHandler = h;
    return { remove };
  }) as never);
});

afterEach(() => {
  setBusy('test', false);
});

test('reloads when update is available and app is idle', async () => {
  await mount();
  expect(updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  expect(updates.reloadAsync).toHaveBeenCalledTimes(1);
});

test('does nothing when no update is available', async () => {
  updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false } as never);
  await mount();
  expect(updates.fetchUpdateAsync).not.toHaveBeenCalled();
  expect(updates.reloadAsync).not.toHaveBeenCalled();
});

test('does nothing when updates are disabled', async () => {
  mockIsEnabled = false;
  await mount();
  expect(updates.checkForUpdateAsync).not.toHaveBeenCalled();
});

test('fetches but does not reload while busy, then reloads once idle', async () => {
  setBusy('test', true);
  await mount();
  expect(updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  expect(updates.reloadAsync).not.toHaveBeenCalled();

  setBusy('test', false);
  await flush();
  expect(updates.reloadAsync).toHaveBeenCalledTimes(1);
});

test('does not refetch an already fetched update when app returns to foreground', async () => {
  setBusy('test', true);
  await mount();
  appStateHandler?.('active');
  await flush();
  expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  expect(updates.reloadAsync).not.toHaveBeenCalled();
});

test('overlapping checks are deduped', async () => {
  let release!: (v: { isAvailable: boolean }) => void;
  updates.checkForUpdateAsync.mockReturnValue(
    new Promise((res) => {
      release = res as never;
    }) as never,
  );
  await mount();
  appStateHandler?.('active');
  appStateHandler?.('active');
  await flush();
  expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  release({ isAvailable: false });
  await flush();
});

test('fetch failure is swallowed and does not reload', async () => {
  updates.fetchUpdateAsync.mockRejectedValue(new Error('net'));
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  await mount();
  expect(updates.reloadAsync).not.toHaveBeenCalled();
});

test('unmount removes the AppState listener', async () => {
  await mount();
  cleanup?.();
  expect(remove).toHaveBeenCalledTimes(1);
});
