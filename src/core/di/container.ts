// Dependency Injection Container - single composition root for LokalMind v2.
//
// All infrastructure adapters are instantiated here and injected downward via constructors.
// Nothing outside this file instantiates infrastructure adapters directly.
// Feature code receives use cases via constructor injection - never imports from this file directly.

import { ChatRepositoryImpl } from '@/src/features/chat/data/repositories/ChatRepositoryImpl';
import { ModelRepositoryImpl } from '@/src/features/models/data/repositories/ModelRepositoryImpl';
import { UserRepositoryImpl } from '@/src/features/onboarding/data/repositories/UserRepositoryImpl';
import { AppSettingsRepositoryImpl } from '@/src/features/profile/data/repositories/AppSettingsRepositoryImpl';
import { DownloadService } from '@/src/infrastructure/downloads/downloadService';
import { LlamaRnAdapter } from '@/src/infrastructure/llm/llamaRnAdapter';
import { AsyncStorageDriver } from '@/src/infrastructure/storage/asyncStorageDriver';
import { LocalDataResetAdapter } from '@/src/infrastructure/storage/localDataResetAdapter';
import { removeLegacyEmbeddingModel } from '@/src/infrastructure/storage/deleteDownloadedModelFiles';
import { SQLiteDriver } from '@/src/infrastructure/storage/sqliteDriver';
import { ResolveInitialRouteUseCase } from '@/src/features/onboarding/domain/usecases/ResolveInitialRouteUseCase';
import { WhisperRnAdapter } from '@/src/infrastructure/whisper/whisperRnAdapter';
import { ExpoNotificationsAdapter } from '@/src/infrastructure/notifications/expoNotificationsAdapter';

const sqliteDriver = new SQLiteDriver();
const asyncStorageDriver = new AsyncStorageDriver();
const llmEngine = new LlamaRnAdapter();
const whisperEngine = new WhisperRnAdapter();
const downloadService = new DownloadService(asyncStorageDriver);
const localNotifications = new ExpoNotificationsAdapter(asyncStorageDriver);

let userRepository: UserRepositoryImpl | null = null;
let modelRepository: ModelRepositoryImpl | null = null;
let chatRepository: ChatRepositoryImpl | null = null;
let appSettingsRepository: AppSettingsRepositoryImpl | null = null;
let localDataReset: LocalDataResetAdapter | null = null;
let resolveInitialRouteUseCase: ResolveInitialRouteUseCase | null = null;
let isInitialized = false;

async function initializeContainer() {
  if (isInitialized) return;
  await sqliteDriver.initialize();
  userRepository = new UserRepositoryImpl(sqliteDriver);
  modelRepository = new ModelRepositoryImpl(downloadService, sqliteDriver);
  chatRepository = new ChatRepositoryImpl(sqliteDriver);
  appSettingsRepository = new AppSettingsRepositoryImpl(asyncStorageDriver);
  resolveInitialRouteUseCase = new ResolveInitialRouteUseCase(
    userRepository,
    modelRepository,
    chatRepository,
  );
  localDataReset = new LocalDataResetAdapter(
    llmEngine,
    whisperEngine,
    asyncStorageDriver,
    sqliteDriver,
    downloadService,
  );
  await downloadService.hydratePersistedStates();
  // Best-effort: older versions downloaded a ~21 MB MiniLM file for semantic memory.
  void removeLegacyEmbeddingModel().catch(() => undefined);
  isInitialized = true;
}

/** Best-effort native llama teardown when app leaves foreground (avoids stale contexts after OS kill). */
async function releaseAllLlamaContextsIfReady(): Promise<void> {
  if (!isInitialized) return;
  await llmEngine.releaseAllContexts();
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
  get chatRepository() {
    if (!chatRepository) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return chatRepository;
  },
  get appSettingsRepository() {
    if (!appSettingsRepository) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return appSettingsRepository;
  },
  get localDataReset() {
    if (!localDataReset) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return localDataReset;
  },
  get resolveInitialRouteUseCase() {
    if (!resolveInitialRouteUseCase) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return resolveInitialRouteUseCase;
  },
  /** iOS local notifications adapter (always available; no container init required). */
  localNotifications,
  initializeContainer,
  releaseAllLlamaContextsIfReady,
} as const;
