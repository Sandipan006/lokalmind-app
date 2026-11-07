# LokalMind v2 - Data Model

> LokalMind has no memory feature. The app no longer reads or writes `session_summaries`, `session_memories`, `memory:pinnedFacts` or `memory:userProfile`. Data saved there by older versions was left in place (no migration, nothing deleted), so those tables and keys can still exist on upgraded devices.

---

## SQLite Schema

Database file: `lokalmind.db` (WAL, foreign keys ON). Chat tables are created by `ensureChatSchema` (`src/features/chat/data/repositories/chatSchema.ts`), `users` by `UserRepositoryImpl`, `models` by `ModelRepositoryImpl`.

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

-- Legacy: kept for data from older versions; the app no longer uses it.
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

-- Legacy: kept for data from older versions; the app no longer uses it.
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
- `session_summaries` and `session_memories` are legacy tables (see the note at the top). Deleting a chat still removes their rows through the foreign key cascade.
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
| `onboarding:complete` | `string` | Onboarding completion flag |
| `lm:notif:reminders:enabled` | `string` | `'true'`/`'false'` user switch for scheduled reminders; absent means on |

Builds before the reminder redesign wrote `lm:notif:inactivity:dailyYmd` and `lm:notif:inactivity:dailyCount`. They are no longer read and are left in place.

**SQLite vs AsyncStorage:** canonical chat history, `users` row, and `models` install rows live in SQLite. AsyncStorage holds the keys above plus small settings / migration / notification state; keep new durable profile and model state in SQLite unless there is a deliberate exception.

---

---

## Model Files

Downloaded models are GGUF files in the app documents folder `models/`. A download goes to `<filename>.part` first and is moved into place only after the HTTP status and length checks pass; only then is the `models` row marked downloaded. Reset removes the model files, any `.part` files and the old MiniLM file.
