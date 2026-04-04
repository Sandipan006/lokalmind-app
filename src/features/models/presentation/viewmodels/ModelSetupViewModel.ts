import { getTotalRamBytes } from '@/src/infrastructure/device/deviceCapability';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import type { DownloadProgressInfo } from '../../domain/entities/DownloadStatus';
import type { Model } from '../../domain/entities/Model';
import type { CancelDownloadUseCase } from '../../domain/usecases/CancelDownloadUseCase';
import type { DeleteDownloadedModelUseCase } from '../../domain/usecases/DeleteDownloadedModelUseCase';
import type { GetAllModelsUseCase } from '../../domain/usecases/GetAllModelsUseCase';
import type { PauseDownloadUseCase } from '../../domain/usecases/PauseDownloadUseCase';
import type { ResumeDownloadUseCase } from '../../domain/usecases/ResumeDownloadUseCase';
import type { StartDownloadUseCase } from '../../domain/usecases/StartDownloadUseCase';
import type { SubscribeToDownloadProgressUseCase } from '../../domain/usecases/SubscribeToDownloadProgressUseCase';

export class ModelSetupViewModel {
  @observable models: Model[] = [];
  @observable isLoading = false;
  @observable errorMessage: string | null = null;
  @observable downloadProgress = new Map<string, DownloadProgressInfo>();
  @observable expandedModelId: string | null = null;
  @observable deviceTotalRamBytes: number | null = null;

  // Tracks active listener unsubscribe functions so we can clean up on navigation.
  private activeListeners = new Map<string, () => void>();

  constructor(
    private readonly getAllModelsUseCase: GetAllModelsUseCase,
    private readonly startDownloadUseCase: StartDownloadUseCase,
    private readonly pauseDownloadUseCase: PauseDownloadUseCase,
    private readonly resumeDownloadUseCase: ResumeDownloadUseCase,
    private readonly cancelDownloadUseCase: CancelDownloadUseCase,
    private readonly deleteDownloadedModelUseCase: DeleteDownloadedModelUseCase,
    private readonly subscribeToDownloadProgressUseCase: SubscribeToDownloadProgressUseCase,
  ) {
    makeObservable(this);
  }

  /**
   * Re-subscribe to all models that currently have in-progress downloads.
   * Called on screen focus so the UI stays live after navigating away and back.
   * Returns a cleanup function to unsubscribe all listeners (call on blur/unmount).
   */
  reattachDownloadListeners(): () => void {
    // Unsubscribe any stale listeners before re-attaching.
    this.activeListeners.forEach((unsub) => unsub());
    this.activeListeners.clear();

    // Only subscribe to models that actually have an active download context in the service.
    // This avoids dead subscriptions for already-downloaded or never-started models.
    const activeIds = this.subscribeToDownloadProgressUseCase.getActiveIds();
    for (const modelId of activeIds) {
      this.attachListener(modelId);
    }

    return () => {
      this.activeListeners.forEach((unsub) => unsub());
      this.activeListeners.clear();
    };
  }

  private attachListener(modelId: string): void {
    if (this.activeListeners.has(modelId)) return;
    const unsub = this.subscribeToDownloadProgressUseCase.execute(modelId, (progress) => {
      runInAction(() => {
        this.downloadProgress.set(modelId, progress);
        if (progress.status === 'downloading' || progress.status === 'paused') {
          this.expandedModelId = modelId;
        }
      });
    });
    this.activeListeners.set(modelId, unsub);
  }

  @computed
  get hasDownloadedModel(): boolean {
    return this.models.some((m) => m.isDownloaded);
  }

  @action
  setExpandedModel(modelId: string | null): void {
    this.expandedModelId = modelId;
  }

  @action
  async loadModels(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    const [result, totalRam] = await Promise.all([
      this.getAllModelsUseCase.execute(),
      getTotalRamBytes(),
    ]);

    runInAction(() => {
      this.deviceTotalRamBytes = totalRam;

      if (!result.success) {
        this.errorMessage = result.error.message;
        this.isLoading = false;
        return;
      }

      this.models = result.data;
      this.isLoading = false;
    });

    // After models are loaded, subscribe to any in-flight downloads so progress
    // is visible immediately — including on initial mount before useFocusEffect fires.
    this.reattachDownloadListeners();
  }

  @action
  async startDownload(modelId: string): Promise<void> {
    this.errorMessage = null;
    this.expandedModelId = modelId;

    // Attach listener before starting so navigation away and back restores progress UI.
    this.attachListener(modelId);

    const result = await this.startDownloadUseCase.execute(modelId, (progress) => {
      runInAction(() => {
        this.downloadProgress.set(modelId, progress);
      });
    });

    runInAction(() => {
      // Clean up download UI state unconditionally on any terminal result.
      // pause/cancel action methods manage their own UI state independently.
      this.downloadProgress.delete(modelId);
      this.expandedModelId = null;
      this.activeListeners.get(modelId)?.();
      this.activeListeners.delete(modelId);

      if (!result.success) {
        console.error('[ModelSetupViewModel] startDownload error:', result.error);
        this.errorMessage = result.error.message;
      }
    });

    await this.loadModels();
  }

  @action
  async pauseDownload(modelId: string): Promise<void> {
    const result = await this.pauseDownloadUseCase.execute(modelId);

    runInAction(() => {
      if (!result.success) {
        this.errorMessage = result.error.message;
      } else {
        const current = this.downloadProgress.get(modelId);
        if (current) {
          this.downloadProgress.set(modelId, { ...current, status: 'paused' });
        }
      }
    });
  }

  @action
  async resumeDownload(modelId: string): Promise<void> {
    this.attachListener(modelId);

    const result = await this.resumeDownloadUseCase.execute(modelId, (progress) => {
      runInAction(() => {
        this.downloadProgress.set(modelId, progress);
      });
    });

    runInAction(() => {
      this.downloadProgress.delete(modelId);
      this.expandedModelId = null;
      this.activeListeners.get(modelId)?.();
      this.activeListeners.delete(modelId);

      if (!result.success) {
        this.errorMessage = result.error.message;
      }
    });

    await this.loadModels();
  }

  @action
  async cancelDownload(modelId: string): Promise<void> {
    const result = await this.cancelDownloadUseCase.execute(modelId);

    runInAction(() => {
      if (!result.success) {
        this.errorMessage = result.error.message;
      } else {
        this.downloadProgress.delete(modelId);
        this.expandedModelId = null;
        this.activeListeners.get(modelId)?.();
        this.activeListeners.delete(modelId);
      }
    });
  }

  @action
  async deleteDownloaded(modelId: string): Promise<void> {
    const result = await this.deleteDownloadedModelUseCase.execute(modelId);

    runInAction(() => {
      if (!result.success) {
        this.errorMessage = result.error.message;
      } else {
        this.downloadProgress.delete(modelId);
        this.expandedModelId = null;
      }
    });

    if (result.success) {
      await this.loadModels();
    }
  }

  getDownloadProgress(modelId: string): DownloadProgressInfo | undefined {
    return this.downloadProgress.get(modelId);
  }
}
