# LokalMind v2 - Data Model

---

## SQLite Schema

Database file: `lokalmind.db` (WAL, foreign keys ON). Table names and columns are aligned to `ChatRepositoryImpl`.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  is_title_locked INTEGER NOT NULL DEFAULT 0,
  last_title_bucket INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'done',
  created_at INTEGER NOT NULL,
  reply_to_message_id TEXT,
  reply_preview TEXT,
  reply_to_role TEXT,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message_alternates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  content TEXT NOT NULL,
  seq INTEGER NOT NULL,
  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_summaries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  bucket_index INTEGER NOT NULL,
  summary TEXT NOT NULL,
  turn_start INTEGER NOT NULL,
  turn_end INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_memories (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  session_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  embedding TEXT,
  score REAL NOT NULL DEFAULT 0.0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_user_edited INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL,
  avatar_index INTEGER NOT NULL DEFAULT 1,
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  is_downloaded INTEGER NOT NULL DEFAULT 0,
  downloaded_at INTEGER,
  file_path TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
```

### Notes

- `chat_messages.reply_*` stores reply threading metadata.
- `message_alternates` keeps regenerate history in order (`seq` ascending).
- `session_summaries` stores rolling in-session summary buckets.
- `session_memories.embedding` stores JSON-serialized embedding vectors when available.
- `users` stores local profile + onboarding state.
- `models` stores download/install status for local GGUF files.
- Some columns are added via migration guards (`ALTER TABLE ... ADD COLUMN`) when older DBs are opened.

---

## AsyncStorage Key Registry

Source of truth: `src/infrastructure/storage/asyncStorageDriver.ts` (`STORAGE_KEYS`). Keys below are the string literals in use; `{mode}` is a chat mode id.

| Key | Type | Description |
|---|---|---|
| `user:displayName` | `string` | Display name |
| `user:profileImage` | `string` | Avatar / profile image reference |
| `user:joinDate` | `string` | Join date presentation |
| `models:downloaded` | `string` | Model download bookkeeping |
| `models:active` | `string` | Active model selection helper |
| `whisper:downloaded` | `string` | Whether Whisper asset is present |
| `whisper:modelPath` | `string` | Resolved Whisper model path |
| `settings:contextWindow` | `string` | Context window preference |
| `settings:globalSystemPrompt` | `string` | Global system prompt storage key |
| `settings:mode:{mode}:systemPrompt` | `string` | Per-mode system prompt override |
| `memory:pinnedFacts` | `string` | Always-injected user facts |
| `memory:userProfile` | `string` | Derived profile summary for memory-aware prompts |
| `onboarding:complete` | `string` | Onboarding completion flag |
| `lm:notif:inactivity:dailyYmd` | `string` | Local calendar day (YYYYMMDD) for inactivity notification daily cap |
| `lm:notif:inactivity:dailyCount` | `string` | Inactivity reminders scheduled today (max 4) |

**SQLite vs AsyncStorage:** canonical chat history, `users` row, and `models` install rows live in SQLite. AsyncStorage holds the keys above plus small settings / migration / notification state; keep new durable profile and model state in SQLite unless there is a deliberate exception.

---

## Memory Model Snapshot

- Long-term memory is not `memory_facts` anymore.
- Cross-session memory lives in `session_memories`.
- In-session compression lives in `session_summaries`.
- Pinned user context lives in `memory:pinnedFacts`.
