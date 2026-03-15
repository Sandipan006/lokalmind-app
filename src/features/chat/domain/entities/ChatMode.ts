export type ChatMode = 'general' | 'coding' | 'creative' | 'marketing';

export const CHAT_MODES: readonly ChatMode[] = [
  'general',
  'coding',
  'creative',
  'marketing',
] as const;

export const CHAT_MODE_LABELS: Record<ChatMode, string> = {
  general: 'General',
  coding: 'Coding',
  creative: 'Creative',
  marketing: 'Marketing',
};
