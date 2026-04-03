# LokalMind — What it is

**Tagline:** *Your mind. Your device. No cloud.*

**LokalMind** is a **local-first AI chat app** for **iOS**. You download **open-weight models** (GGUF) and run them **entirely on your phone**—no chat requests are sent to LokalMind’s servers for inference. Your conversations and settings stay on the device. Privacy and offline use (after models are downloaded) are the point.

**Elevator pitch:** use the **tagline** and the paragraph above when someone asks what LokalMind is. Everything below explains **what it does**, **why it’s different**, and **what’s still coming**.

---

## Why LokalMind is different from “normal” AI apps

Most consumer AI products (**ChatGPT, Claude, Gemini**, and most mobile wrappers) work like this: you need **internet**, an **account**, and your prompts go to **their cloud**. Your text is processed on company infrastructure; you rely on their uptime, pricing, and data policies.

**LokalMind flips that model:**

| Typical cloud AI chat | LokalMind |
|------------------------|-----------|
| Inference in the cloud | **Inference on your device** (after you download a model) |
| Needs connectivity to chat | **Works offline** once models are local |
| One remote model, vendor-controlled | **You pick from a catalog** of models on-device (size, speed, “reasoning” vs general) |
| Ongoing API cost / subscription for the core chat loop | **No API key** in the loop for local inference; chats aren’t “metered” per token to a third-party LLM API |
| Data leaves your phone for generation | **Prompts and replies for local runs stay on device** (stored in local storage on the phone) |
| Trust is “their policy page” | **Trust is architectural**: local GGUF + local app storage, not a hosted chat backend for the core feature |

LokalMind is **not** trying to replace every cloud AI use case (huge frontier models, team features, web-only tools). It’s for people who want **private**, **offline-capable**, **you-own-the-weights** chat on a phone—without feeding every message to a remote API.

---

## Features (what the product offers)

### On-device intelligence

- **Run LLMs locally** using downloaded **GGUF** models and on-device inference (no server round-trip for generation).
- **Streaming replies** so answers appear as they’re generated, with a clear “thinking” state and a live cursor while text is still arriving.
- **Stop generation** mid-reply when you change your mind.
- **Switch models** from the chat header (among models you’ve already downloaded); the session can use a different model for follow-ups.
- **Smart model sizing**: onboarding helps match models to **device RAM** so users aren’t pushed into downloads that cannot run.

### Models & downloads

- **Model browser** with several **Qwen**, **DeepSeek R1**, **Gemma**, and other variants—different sizes for speed vs quality, some marked for broader access vs paid tiers in the product’s model policy.
- **Download over the network** from the app’s CDN; **pause, resume, and cancel** so large files aren’t stuck on a single bad connection.
- **Delete** models you no longer want to keep on disk.
- **Whisper (speech)** asset is part of the model ecosystem for **future** voice input; the speech engine is prepared even where the full mic UI is still rolling out.

### Chat & conversations

- **Multiple chats (sessions)** with a **Recents** list, sorted by recent activity.
- **New chat** flows that respect which **model** you want to use when starting fresh.
- **Rename** chats (swipe actions) and **delete** chats with confirmation.
- **Search** across chat titles and message text to find old threads quickly.
- **Auto-titles**: the app can **generate a short session title** from the conversation at natural breakpoints so the sidebar stays readable.
- **Message queue**: if you send while the model is still answering, messages can **queue** (with a cap), **show in a strip**, and **edit or remove** before they send—so thoughts aren’t lost during long generations.
- **Edit a user message** after the fact (long-press): the thread **rewinds** after that point and the assistant can **regenerate** from your corrected text.

### Modes & system behavior

- **Chat modes** (e.g. general, coding-oriented, creative, marketing-style defaults) change **tone and instructions** for the assistant.
- **Per-mode custom system prompts** in Profile: override the default for each mode so your “coding” or “creative” persona matches how you work.

### Reading assistant answers

- **Markdown-style** rendering: **bold**, *italic*, **fenced code blocks** with a **language** label, **copy** for code.
- **Reasoning / “think” blocks**: when a model emits chain-of-thought in a tagged block, the UI can **separate** that from the main answer so you read the final reply first.

### Profile & account (local identity)

- **Display name**, **avatar** (preset art), **member since** style presentation.
- Links to **GitHub** and **contact** when configured (environment-driven).
- **Erase all local data**: one destructive path to wipe **chats, settings, and downloaded models** from the device and return to onboarding—useful for resale or a hard reset.

### Support & onboarding

- **Support** tab with ways to **tip or support** the project (e.g. PayPal / other links when URLs are configured).
- **Onboarding**: welcome, **name**, and **first model setup** so first-time users aren’t dropped into a blank technical screen.

### Experience & design

- **Glass-style** surfaces, **dark** theme, **native** tab bar with platform-appropriate icons, **haptics** on key actions, and readable typography—so the app feels like a **premium iOS** product, not a bare web wrapper.

---

## Tech (short)

LokalMind is built with **Expo** and **React Native**, **MobX** for screen state, **expo-router** for navigation, **SQLite** for chat history, and **AsyncStorage** for settings and download state. Inference uses **llama.rn** (GGUF / llama.cpp); speech uses **whisper.rn** where enabled. That stack is what makes **on-device** chat possible in a store-friendly app—not a separate “feature,” but the **enabler** for everything above.

**Monetization:** in-app purchases (e.g. RevenueCat) may appear in the dependency stack for **model unlocks or Pro** as the product matures; wire-up status should match the current codebase when you ship.

---

## Not in the app yet (or only partly)

These are **planned or partially wired**—good to mention honestly so expectations match the build:

- **Voice input** in the composer (Whisper is set up at the engine level; full **hold-to-talk** UX may still be in progress).
- **Global** system prompt and **persistent memory facts** stored in DB (some keys or docs exist ahead of the full UX).
- **Reply threading** and **image / vision** attachments as first-class message features.
- **Profile → Storage** screen as a full breakdown (may be a placeholder until Phase 3).
- **Android** as a first-class target (roadmap; iOS is the current focus in docs).

---

*Last updated: LokalMind v2 — product + codebase snapshot.*
