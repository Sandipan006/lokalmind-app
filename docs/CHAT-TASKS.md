# Chat feature — task backlog

## Context window

- [x] **Cap LLM history** — Send at most **20 messages** total (user + assistant) to the model. Trim older turns in `SendMessageUseCase` (or before `execute`) so system prompt + recent window fits reliably.

## UX / product

- [ ] **WhatsApp-style reply** — Quote bubble, show referenced snippet above the message, optional swipe/long-press to reply.
- [x] **Edit message + restart** — Long-press a user bubble → native action sheet → Edit; drops all messages after it, updates content in place, resends from that point.
- [x] **Message queue** — While the LLM is busy, queue up to **3** outbound messages; **Stop** persists partial assistant text; after a turn ends, the next queued message is sent. Strip shows edit (full-screen modal) and remove. Implemented in `ChatViewModel` + `MessageQueueStrip`.
- [ ] **Share chat** — Share or export the full conversation as **PDF** and/or **Markdown** (format + UX TBD; discuss later).
- [ ] **Regenerate assistant reply** — On regenerate, **keep the previous reply** in history; show **arrow controls** at the bottom of the assistant bubble (or row) so the user can flip between **previous** and **new** versions of that turn.

## Platform / infra

- [x] **Keyboard** — `react-native-keyboard-controller`: `KeyboardProvider` in `app/_layout.tsx`, `KeyboardAvoidingView` from the library in the queue edit modal. **Requires a dev build** (EAS development build or local `prebuild`); **not supported in Expo Go** (native module must be linked).

## Ideas (later)

- Pin / bookmark messages.
- Persist composer draft per session.
