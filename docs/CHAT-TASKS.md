# Chat feature — task backlog

## Context window

- [ ] **Cap LLM history** — Send at most **20 messages** total (user + assistant) to the model. Trim older turns in `SendMessageUseCase` (or before `execute`) so system prompt + recent window fits reliably.  
  - *Note:* `SendMessageUseCase` has a `TODO` near `llmMessages` until this ships.

## UX / product

- [ ] **WhatsApp-style reply** — Quote bubble, show referenced snippet above the message, optional swipe/long-press to reply.
- [ ] **Edit message + restart** — Edit a past user message; drop messages after it (or branch); resend from that point.
- [ ] **Message queue** — Queue outbound messages while the LLM is busy; optional cancel/reorder.

## Ideas (later)

- Regenerate last assistant reply.
- Pin / bookmark messages.
- Export chat (markdown/plain text).
- Persist composer draft per session.
