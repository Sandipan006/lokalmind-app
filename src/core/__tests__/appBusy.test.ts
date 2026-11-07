import { isAppBusy, onAppIdle, setBusy } from '../appBusy';

test('idle listeners fire only when the last busy reason clears', () => {
  const idle = jest.fn();
  const off = onAppIdle(idle);
  setBusy('chat', true);
  setBusy('download', true);
  setBusy('chat', false);
  expect(isAppBusy()).toBe(true);
  expect(idle).not.toHaveBeenCalled();
  setBusy('download', false);
  expect(isAppBusy()).toBe(false);
  expect(idle).toHaveBeenCalledTimes(1);
  setBusy('download', false); // already clear: no repeat
  expect(idle).toHaveBeenCalledTimes(1);
  off();
});
