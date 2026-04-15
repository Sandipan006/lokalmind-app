// react-native-device-info is infrastructure-only - never import this outside src/infrastructure/.
import DeviceInfo from 'react-native-device-info';

// OS + background apps typically consume 1.5–2 GB; 55% is a conservative usable estimate.
const USABLE_RAM_FACTOR = 0.55;

let cachedTotalRam: number | null = null;

/**
 * Returns total device RAM in bytes (cached after first call - value never changes at runtime).
 * Falls back to 3 GB if the native call fails, which blocks 4B+ models on unknown devices.
 */
export async function getTotalRamBytes(): Promise<number> {
  if (cachedTotalRam !== null) return cachedTotalRam;
  try {
    const ram = await DeviceInfo.getTotalMemory();
    cachedTotalRam = ram > 0 ? ram : 3 * 1024 * 1024 * 1024;
  } catch {
    cachedTotalRam = 3 * 1024 * 1024 * 1024;
  }
  return cachedTotalRam;
}

/**
 * Usable RAM = total * USABLE_RAM_FACTOR.
 * Used by `resolveContextSize` to budget KV cache alongside model weights.
 */
export async function getUsableRamBytes(): Promise<number> {
  return (await getTotalRamBytes()) * USABLE_RAM_FACTOR;
}

/**
 * Picks a safe n_ctx for the given model weight size so the model + KV cache
 * both fit in usable device RAM.
 *
 * Formula: remaining = usableRam - modelWeightBytes; ctx = remaining / KV_BYTES_PER_TOKEN.
 * KV cache for a 4B Q4 model is ~500 bytes/token (empirical estimate for llama.rn).
 * Result is clamped between 2048 and the model's declared max contextSize.
 */
export async function resolveContextSize(modelWeightBytes: number, maxContextSize: number): Promise<number> {
  const usable = await getUsableRamBytes();
  const remaining = usable - modelWeightBytes;

  // ~500 bytes per token is a conservative KV cache estimate for Q4 models.
  const KV_BYTES_PER_TOKEN = 500;
  const computed = Math.floor(remaining / KV_BYTES_PER_TOKEN);

  // Round down to nearest power of 2 for llama.rn efficiency.
  const snapped = largestPowerOfTwoAtMost(computed);
  return Math.max(2048, Math.min(snapped, maxContextSize));
}

function largestPowerOfTwoAtMost(n: number): number {
  if (n <= 0) return 2048;
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}
