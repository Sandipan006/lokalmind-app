// Dependency Injection Container - single composition root for LokalMind v2.
//
// All infrastructure adapters are instantiated here and injected downward via constructors.
// Nothing outside this file instantiates infrastructure adapters directly.
// Feature code receives use cases via constructor injection - never imports from this file directly.

import { ChatRepositoryImpl } from '@/src/features/chat/data/repositories/ChatRepositoryImpl';
import { ModelRepositoryImpl } from '@/src/features/models/data/repositories/ModelRepositoryImpl';
import { UserRepositoryImpl } from '@/src/features/onboarding/data/repositories/UserRepositoryImpl';
import { AppSettingsRepositoryImpl } from '@/src/features/profile/data/repositories/AppSettingsRepositoryImpl';
import { MemoryRepositoryImpl } from '@/src/features/memory/data/repositories/MemoryRepositoryImpl';
import { MemoryService } from '@/src/features/memory/domain/services/MemoryService';
import { GetPinnedFactsUseCase } from '@/src/features/memory/domain/usecases/GetPinnedFactsUseCase';
import { SavePinnedFactsUseCase } from '@/src/features/memory/domain/usecases/SavePinnedFactsUseCase';
import { SummarizeSessionUseCase } from '@/src/features/memory/domain/usecases/SummarizeSessionUseCase';
import { UpdateUserProfileUseCase } from '@/src/features/memory/domain/usecases/UpdateUserProfileUseCase';
import { EmbeddingService } from '@/src/infrastructure/llm/embeddingService';
import { DownloadService } from '@/src/infrastructure/downloads/downloadService';
import { LlamaRnAdapter } from '@/src/infrastructure/llm/llamaRnAdapter';
import { AsyncStorageDriver } from '@/src/infrastructure/storage/asyncStorageDriver';
import { LocalDataResetAdapter } from '@/src/infrastructure/storage/localDataResetAdapter';
import { SQLiteDriver } from '@/src/infrastructure/storage/sqliteDriver';
import { ResolveInitialRouteUseCase } from '@/src/features/onboarding/domain/usecases/ResolveInitialRouteUseCase';
import { WhisperRnAdapter } from '@/src/infrastructure/whisper/whisperRnAdapter';
import { ExpoNotificationsAdapter } from '@/src/infrastructure/notifications/expoNotificationsAdapter';

const sqliteDriver = new SQLiteDriver();
const asyncStorageDriver = new AsyncStorageDriver();
const llmEngine = new LlamaRnAdapter();
const whisperEngine = new WhisperRnAdapter();
const downloadService = new DownloadService(asyncStorageDriver);
const embeddingService = new EmbeddingService();
const localNotifications = new ExpoNotificationsAdapter(asyncStorageDriver);

let userRepository: UserRepositoryImpl | null = null;
let modelRepository: ModelRepositoryImpl | null = null;
let chatRepository: ChatRepositoryImpl | null = null;
let appSettingsRepository: AppSettingsRepositoryImpl | null = null;
let localDataReset: LocalDataResetAdapter | null = null;
let memoryRepository: MemoryRepositoryImpl | null = null;
let memoryService: MemoryService | null = null;
let getPinnedFactsUseCase: GetPinnedFactsUseCase | null = null;
let savePinnedFactsUseCase: SavePinnedFactsUseCase | null = null;
let summarizeSessionUseCase: SummarizeSessionUseCase | null = null;
let updateUserProfileUseCase: UpdateUserProfileUseCase | null = null;
let resolveInitialRouteUseCase: ResolveInitialRouteUseCase | null = null;
let isInitialized = false;

async function initializeContainer() {
  if (isInitialized) return;
  await sqliteDriver.initialize();
  userRepository = new UserRepositoryImpl(sqliteDriver);
  modelRepository = new ModelRepositoryImpl(downloadService, sqliteDriver, embeddingService);
  chatRepository = new ChatRepositoryImpl(sqliteDriver);
  appSettingsRepository = new AppSettingsRepositoryImpl(asyncStorageDriver);
  memoryRepository = new MemoryRepositoryImpl(sqliteDriver);
  memoryService = new MemoryService(memoryRepository);
  memoryService.setEmbeddingService(embeddingService);
  summarizeSessionUseCase = new SummarizeSessionUseCase(llmEngine, memoryRepository, memoryService, localNotifications);
  updateUserProfileUseCase = new UpdateUserProfileUseCase(llmEngine, appSettingsRepository, localNotifications);
  getPinnedFactsUseCase = new GetPinnedFactsUseCase(appSettingsRepository);
  savePinnedFactsUseCase = new SavePinnedFactsUseCase(appSettingsRepository);
  resolveInitialRouteUseCase = new ResolveInitialRouteUseCase(
    userRepository,
    modelRepository,
    chatRepository,
    embeddingService,
  );
  void embeddingService.initialize().catch((e) => {
    if (__DEV__) console.warn('[EmbeddingService] Boot init failed:', e);
  });
  localDataReset = new LocalDataResetAdapter(
    llmEngine,
    whisperEngine,
    embeddingService,
    asyncStorageDriver,
    sqliteDriver,
    downloadService,
  );
  await downloadService.hydratePersistedStates();
  isInitialized = true;
}

/** Best-effort native llama teardown when app leaves foreground (avoids stale contexts after OS kill). */
async function releaseAllLlamaContextsIfReady(): Promise<void> {
  if (!isInitialized) return;
  await Promise.all([
    llmEngine.releaseAllContexts(),
    embeddingService.release(),
  ]);
}

export const container = {
  sqliteDriver,
  asyncStorageDriver,
  llmEngine,
  whisperEngine,
  downloadService,
  embeddingService,
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
  get memoryRepository() {
    if (!memoryRepository) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return memoryRepository;
  },
  get memoryService() {
    if (!memoryService) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return memoryService;
  },
  get summarizeSessionUseCase() {
    if (!summarizeSessionUseCase) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return summarizeSessionUseCase;
  },
  get updateUserProfileUseCase() {
    if (!updateUserProfileUseCase) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return updateUserProfileUseCase;
  },
  get getPinnedFactsUseCase() {
    if (!getPinnedFactsUseCase) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return getPinnedFactsUseCase;
  },
  get savePinnedFactsUseCase() {
    if (!savePinnedFactsUseCase) {
      throw new Error('Container not initialized. Call initializeContainer() first.');
    }
    return savePinnedFactsUseCase;
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
