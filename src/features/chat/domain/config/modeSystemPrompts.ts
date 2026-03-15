import type { ChatMode } from '../entities/ChatMode';
import { codingPrompt, creativePrompt, generalPrompt, marketingPrompt } from './mode-prompts';

export const MODE_SYSTEM_PROMPTS: Record<ChatMode, string> = {
  general: generalPrompt,
  coding: codingPrompt,
  creative: creativePrompt,
  marketing: marketingPrompt,
};
