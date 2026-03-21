import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import type { DownloadProgressInfo } from '../../domain/entities/DownloadStatus';
import type { Model } from '../../domain/entities/Model';
import type { CancelDownloadUseCase } from '../../domain/usecases/CancelDownloadUseCase';
import type { DeleteDownloadedModelUseCase } from '../../domain/usecases/DeleteDownloadedModelUseCase';
import type { GetAllModelsUseCase } from '../../domain/usecases/GetAllModelsUseCase';
import type { PauseDownloadUseCase } from '../../domain/usecases/PauseDownloadUseCase';
import type { ResumeDownloadUseCase } from '../../domain/usecases/ResumeDownloadUseCase';
import type { StartDownloadUseCase } from '../../domain/usecases/StartDownloadUseCase';

export class ModelSetupViewModel {
  @observable models: Model[] = [];
  @observable isLoading = false;
  @observable errorMessage: string | null = null;
  @observable downloadProgress = new Map<string, DownloadProgressInfo>();
  @observable expandedModelId: string | null = null;

  constructor(
    private readonly getAllModelsUseCase: GetAllModelsUseCase,
    private readonly startDownloadUseCase: StartDownloadUseCase,
    private readonly pauseDownloadUseCase: PauseDownloadUseCase,
    private readonly resumeDownloadUseCase: ResumeDownloadUseCase,
    private readonly cancelDownloadUseCase: CancelDownloadUseCase,
    private readonly deleteDownloadedModelUseCase: DeleteDownloadedModelUseCase,
  ) {
    makeObservable(this);
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

    const result = await this.getAllModelsUseCase.execute();

    runInAction(() => {
      if (!result.success) {
        this.errorMessage = result.error.message;
        this.isLoading = false;
        return;
      }

      this.models = result.data;
      this.isLoading = false;
    });
  }

  @action
  async startDownload(modelId: string): Promise<void> {
    this.errorMessage = null;
    this.expandedModelId = modelId;

    const result = await this.startDownloadUseCase.execute(modelId, (progress) => {
      runInAction(() => {
        this.downloadProgress.set(modelId, progress);
      });
    });

    const currentProgress = this.downloadProgress.get(modelId);
    const wasPausedOrCancelled =
      currentProgress?.status === 'paused' ||
      !this.downloadProgress.has(modelId);

    runInAction(() => {
      if (!result.success) {
        console.error('[ModelSetupViewModel] startDownload error:', result.error);
        this.errorMessage = result.error.message;
        this.expandedModelId = null;
      } else if (!wasPausedOrCancelled) {
        // Completed - refresh model list so isDownloaded flips to true in the UI.
        this.downloadProgress.delete(modelId);
        this.expandedModelId = null;
      }
      // Paused/cancelled: leave progress and expandedModelId as-is;
      // pauseDownload/cancelDownload actions handle their own cleanup.
    });

    if (result.success && !wasPausedOrCancelled) {
      await this.loadModels();
    }
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
    const result = await this.resumeDownloadUseCase.execute(modelId, (progress) => {
      runInAction(() => {
        this.downloadProgress.set(modelId, progress);
      });
    });

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

  @action
  async cancelDownload(modelId: string): Promise<void> {
    const result = await this.cancelDownloadUseCase.execute(modelId);

    runInAction(() => {
      if (!result.success) {
        this.errorMessage = result.error.message;
      } else {
        this.downloadProgress.delete(modelId);
        this.expandedModelId = null;
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
