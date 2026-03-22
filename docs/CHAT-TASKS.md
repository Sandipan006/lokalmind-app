# Chat feature — task backlog

## Context window

- [x] **Cap LLM history** — Send at most **20 messages** total (user + assistant) to the model. Trim older turns in `SendMessageUseCase` (or before `execute`) so system prompt + recent window fits reliably.

## UX / product

- [ ] **WhatsApp-style reply** — Quote bubble, show referenced snippet above the message, optional swipe/long-press to reply.
- [x] **Edit message + restart** — Long-press a user bubble → native action sheet → Edit; drops all messages after it, updates content in place, resends from that point.
- [ ] **Message queue** — Queue outbound messages while the LLM is busy; optional cancel/reorder.

## Ideas (later)

- Regenerate last assistant reply.
- Pin / bookmark messages.
- Export chat (markdown/plain text).
- Persist composer draft per session.
