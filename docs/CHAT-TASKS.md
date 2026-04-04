# Chat feature — task backlog

## Context window

- [x] **Cap LLM history** — Send at most **20 messages** total (user + assistant) to the model. Trim older turns in `SendMessageUseCase` (or before `execute`) so system prompt + recent window fits reliably.
- [x] **Dynamic `n_ctx` on device** — `modelConfig.contextSize` is the ceiling per model; `deviceCapability.resolveContextSize` + `LlamaRnAdapter` pick the actual `n_ctx` from total RAM, model weight size, and KV estimate. **Model compatibility** for downloads uses **total** device RAM vs `minRamBytes` (`ModelRepository` → `Model.isCompatibleWithDevice`).

## UX / product

- [x] **Reply to message** — Quote / reply draft above composer, DB fields + LLM composition (`messageReply`), `ReplyDraftBanner` + input wiring.
- [x] **Edit message + restart** — Long-press a user bubble → native action sheet → Edit; drops all messages after it, updates content in place, resends from that point.
- [x] **Message queue** — While the LLM is busy, queue up to **3** outbound messages; **Stop** persists partial assistant text; after a turn ends, the next queued message is sent. Strip shows edit (full-screen modal) and remove. Implemented in `ChatViewModel` + `MessageQueueStrip`.
- [ ] **Share chat** — Share or export the full conversation as **PDF** and/or **Markdown** (format + UX TBD; discuss later).
- [x] **Regenerate assistant reply** — On regenerate, **keep the previous reply** in history; show **arrow controls** at the bottom of the assistant bubble (or row) so the user can flip between **previous** and **new** versions of that turn.

## Platform / infra

- [x] **Keyboard** — `react-native-keyboard-controller`: `KeyboardProvider` in `app/_layout.tsx`, `KeyboardAvoidingView` from the library in the queue edit modal. **Requires a dev build** (EAS development build or local `prebuild`); **not supported in Expo Go** (native module must be linked).

## Ideas (later)

- Pin / bookmark messages.
- Persist composer draft per session.
