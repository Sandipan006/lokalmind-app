// Dependency Injection Container — single composition root for LokalMind v2.
//
// All infrastructure adapters are instantiated here and injected downward via constructors.
// Nothing outside this file instantiates infrastructure adapters directly.
// Feature code receives use cases via constructor injection — never imports from this file directly.
//
// TODO Phase 1: uncomment repository + use case wiring as each layer is implemented.

import { LlamaRnAdapter } from '@/src/infrastructure/llm/llamaRnAdapter';
import { WhisperRnAdapter } from '@/src/infrastructure/whisper/whisperRnAdapter';
import { SQLiteDriver } from '@/src/infrastructure/storage/sqliteDriver';
import { AsyncStorageDriver } from '@/src/infrastructure/storage/asyncStorageDriver';
import { DownloadService } from '@/src/infrastructure/downloads/downloadService';

const sqliteDriver = new SQLiteDriver();
const asyncStorageDriver = new AsyncStorageDriver();
const llmEngine = new LlamaRnAdapter();
const whisperEngine = new WhisperRnAdapter();
const downloadService = new DownloadService();

export const container = {
  sqliteDriver,
  asyncStorageDriver,
  llmEngine,
  whisperEngine,
  downloadService,
  // Phase 1 — add after implementing:
  // chatRepository: new ChatRepositoryImpl(sqliteDriver),
  // messageRepository: new MessageRepositoryImpl(sqliteDriver),
  // modelRepository: new ModelRepositoryImpl(asyncStorageDriver),
  // memoryRepository: new MemoryRepositoryImpl(sqliteDriver),
  // userRepository: new UserRepositoryImpl(asyncStorageDriver),
  // settingsRepository: new SettingsRepositoryImpl(asyncStorageDriver),
} as const;
