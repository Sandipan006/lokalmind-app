// Pure checks on a finished download; the file system and network stay in DownloadService.

function header(headers: Record<string, string> | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

/** Full file size announced by the server: Content-Range total for 206, Content-Length for 200. */
export function expectedFileBytes(status: number, headers?: Record<string, string>): number | null {
  const range = header(headers, 'content-range')?.match(/\/(\d+)\s*$/);
  if (status === 206 && range) return Number(range[1]);
  const length = Number(header(headers, 'content-length'));
  return status === 200 && Number.isFinite(length) && length > 0 ? length : null;
}

/** Returns an error message when the response or the file on disk is not a complete download. */
export function checkDownloadResult(
  response: { status: number; headers?: Record<string, string> },
  fileBytes: number,
): string | null {
  if (response.status < 200 || response.status > 299) return `Download failed: server returned HTTP ${response.status}`;
  const expected = expectedFileBytes(response.status, response.headers);
  if (expected !== null && fileBytes !== expected) {
    return `Download incomplete: got ${fileBytes} of ${expected} bytes`;
  }
  return null;
}
