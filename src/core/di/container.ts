// Dependency Injection Container — single composition root for LokalMind v2.
//
// All infrastructure adapters are instantiated here and injected downward via constructors.
// Nothing outside this file instantiates infrastructure adapters directly.
// Feature code receives use cases via constructor injection — never imports from this file directly.
//
// TODO Phase 1: uncomment repository + use case wiring as each layer is implemented.

import { ModelRepositoryImpl } from '@/src/features/models/data/repositories/ModelRepositoryImpl';
import { UserRepositoryImpl } from '@/src/features/onboarding/data/repositories/UserRepositoryImpl';
import { DownloadService } from '@/src/infrastructure/downloads/downloadService';
import { LlamaRnAdapter } from '@/src/infrastructure/llm/llamaRnAdapter';
import { AsyncStorageDriver } from '@/src/infrastructure/storage/asyncStorageDriver';
import { SQLiteDriver } from '@/src/infrastructure/storage/sqliteDriver';
import { WhisperRnAdapter } from '@/src/infrastructure/whisper/whisperRnAdapter';

const sqliteDriver = new SQLiteDriver();
const asyncStorageDriver = new AsyncStorageDriver();
const llmEngine = new LlamaRnAdapter();
const whisperEngine = new WhisperRnAdapter();
const downloadService = new DownloadService(asyncStorageDriver);

let userRepository: UserRepositoryImpl | null = null;
let modelRepository: ModelRepositoryImpl | null = null;
let isInitialized = false;

async function initializeContainer() {
  if (isInitialized) return;
  await sqliteDriver.initialize();
  userRepository = new UserRepositoryImpl(sqliteDriver);
  modelRepository = new ModelRepositoryImpl(downloadService, sqliteDriver);
  await downloadService.hydratePersistedStates();
  isInitialized = true;
}

export const container = {
  sqliteDriver,
  asyncStorageDriver,
  llmEngine,
  whisperEngine,
  downloadService,
  get userRepository() {
    if (!userRepository) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return userRepository;
  },
  get modelRepository() {
    if (!modelRepository) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return modelRepository;
  },
  initializeContainer,
} as const;
