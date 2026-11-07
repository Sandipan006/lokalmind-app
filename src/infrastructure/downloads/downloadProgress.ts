export interface SpeedSample {
  timestamp: number;
  bytesWritten: number;
}

/** Bytes per second over the sample window; 0 until two samples exist. */
export function calculateSpeed(samples: SpeedSample[]): number {
  const oldest = samples[0];
  const newest = samples[samples.length - 1];
  if (samples.length < 2 || !oldest || !newest) return 0;

  const timeDiffSeconds = (newest.timestamp - oldest.timestamp) / 1000;
  const bytesDiff = newest.bytesWritten - oldest.bytesWritten;
  return timeDiffSeconds > 0 ? bytesDiff / timeDiffSeconds : 0;
}
