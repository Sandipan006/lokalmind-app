import type { ChatMessage, MessageRole } from '../entities/ChatMessage';

/** Single cap for stored preview, UI strip, and LLM quote block (English). */
export const REPLY_PREVIEW_MAX_CHARS = 400;

/** Normalize whitespace and cap length for reply snapshot (WhatsApp-style frozen quote). */
export function buildReplyPreviewSnapshot(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= REPLY_PREVIEW_MAX_CHARS) return normalized;
  return `${normalized.slice(0, REPLY_PREVIEW_MAX_CHARS - 1)}…`;
}

export interface MessageReplyDraft {
  readonly replyToMessageId: string;
  readonly replyPreview: string;
  readonly replyToRole: MessageRole;
}

function buildEnglishReplyPrefix(role: MessageRole, preview: string): string {
  const label = role === 'assistant' ? 'assistant' : 'user';
  return `[Replying to an earlier ${label} message:\n"${preview}"]\n\n`;
}

/**
 * Builds the string for one chat turn sent to the LLM. User messages may include a reply prefix;
 * `truncateContent` is the existing per-message cap (e.g. 14k chars).
 */
export function composeTurnContentForLlm(
  message: ChatMessage,
  truncateContent: (s: string) => string,
): string {
  if (message.role === 'assistant') {
    return truncateContent(message.content);
  }
  const hasReply =
    Boolean(message.replyToMessageId) &&
    message.replyPreview != null &&
    message.replyPreview.length > 0 &&
    message.replyToRole != null;
  const raw = hasReply
    ? `${buildEnglishReplyPrefix(message.replyToRole!, message.replyPreview!)}${message.content}`
    : message.content;
  return truncateContent(raw);
}
