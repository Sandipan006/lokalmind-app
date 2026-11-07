import { calculateSpeed } from '../downloadProgress';
import { checkDownloadResult } from '../downloadVerification';

describe('checkDownloadResult', () => {
  test('rejects a non-success HTTP status', () => {
    expect(checkDownloadResult({ status: 404 }, 10)).toContain('HTTP 404');
  });
  test('rejects a truncated file (200, Content-Length)', () => {
    expect(checkDownloadResult({ status: 200, headers: { 'Content-Length': '100' } }, 60)).toContain('60 of 100');
  });
  test('rejects a truncated resumed file (206, Content-Range total)', () => {
    expect(checkDownloadResult({ status: 206, headers: { 'content-range': 'bytes 50-99/100' } }, 70)).toContain('70 of 100');
  });
  test('accepts a complete file', () => {
    expect(checkDownloadResult({ status: 200, headers: { 'content-length': '100' } }, 100)).toBeNull();
    expect(checkDownloadResult({ status: 206, headers: { 'Content-Range': 'bytes 50-99/100' } }, 100)).toBeNull();
  });
  test('accepts when the server announces no length', () => {
    expect(checkDownloadResult({ status: 200 }, 100)).toBeNull();
  });
});

describe('calculateSpeed', () => {
  test('is 0 with fewer than two samples', () => {
    expect(calculateSpeed([])).toBe(0);
    expect(calculateSpeed([{ timestamp: 0, bytesWritten: 5 }])).toBe(0);
  });
  test('is bytes per second across the window', () => {
    expect(calculateSpeed([{ timestamp: 0, bytesWritten: 0 }, { timestamp: 2000, bytesWritten: 1000 }])).toBe(500);
  });
});
