import type { ChatMode } from '../entities/ChatMode';
import { MODE_SYSTEM_PROMPTS } from './modeSystemPrompts';

/** Per-mode custom override wins when non-empty after trim; otherwise built-in default. */
export function resolveSystemPromptForChat(
  mode: ChatMode,
  modeOverride: string | null,
): string {
  const trimmed = modeOverride?.trim();
  if (trimmed) return trimmed;
  return MODE_SYSTEM_PROMPTS[mode];
}
