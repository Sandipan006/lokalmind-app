import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import { makeAutoObservable, runInAction } from 'mobx';
import type { SessionMemory } from '../../domain/entities/SessionMemory';
import type { IMemoryRepository } from '../../domain/repositories/IMemoryRepository';
import type { MemoryService } from '../../domain/services/MemoryService';
import type { GetPinnedFactsUseCase } from '../../domain/usecases/GetPinnedFactsUseCase';
import type { SavePinnedFactsUseCase } from '../../domain/usecases/SavePinnedFactsUseCase';

export class MemoryViewModel {
  memories: SessionMemory[] = [];
  pinnedFacts = '';
  userProfile = '';
  isLoading = false;
  isSaving = false;
  error: string | null = null;

  constructor(
    private readonly memoryRepository: IMemoryRepository,
    private readonly memoryService: MemoryService,
    private readonly getPinnedFactsUseCase: GetPinnedFactsUseCase,
    private readonly savePinnedFactsUseCase: SavePinnedFactsUseCase,
    private readonly appSettingsRepository: IAppSettingsRepository,
  ) {
    makeAutoObservable(this);
  }

  async load(): Promise<void> {
    runInAction(() => { this.isLoading = true; this.error = null; });
    try {
      const [factsResult, memoriesResult, profileResult] = await Promise.all([
        this.getPinnedFactsUseCase.execute(),
        this.memoryRepository.getAllSessionMemories(),
        this.appSettingsRepository.getUserProfile(),
      ]);
      const loadedMemories = memoriesResult.success ? memoriesResult.data : [];
      console.log(
        '[MemoryScreen] Past conversations loaded:',
        loadedMemories.map((m) => ({
          id: m.id,
          sessionId: m.sessionId,
          sessionTitle: m.sessionTitle,
          pinned: m.isPinned,
          userEdited: m.isUserEdited,
          score: Number(m.score.toFixed(3)),
          summaryPreview: m.summary.slice(0, 140),
        })),
      );
      runInAction(() => {
        this.pinnedFacts = factsResult.success ? factsResult.data : '';
        this.memories = loadedMemories;
        this.userProfile = profileResult ?? '';
        this.isLoading = false;
      });
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load memories';
        this.isLoading = false;
      });
    }
  }

  async savePinnedFacts(text: string): Promise<void> {
    runInAction(() => { this.isSaving = true; });
    try {
      await this.savePinnedFactsUseCase.execute(text);
      runInAction(() => {
        this.pinnedFacts = text.slice(0, 800);
        this.isSaving = false;
      });
    } catch {
      runInAction(() => { this.isSaving = false; });
    }
  }

  async updateMemory(id: string, newSummary: string): Promise<void> {
    try {
      const result = await this.memoryRepository.updateSessionMemory(id, {
        summary: newSummary,
        isUserEdited: true,
      });
      if (!result.success) return;

      // Fire-and-forget re-embed after user edit.
      void this.memoryService.embedAndSave(id, newSummary).catch((e) => {
        console.warn('[Memory] Re-embed after edit failed:', e);
      });

      runInAction(() => {
        this.memories = this.memories.map((m) =>
          m.id === id ? { ...m, summary: newSummary, isUserEdited: true } : m,
        );
      });
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to update memory';
      });
    }
  }

  async togglePin(id: string): Promise<void> {
    const memory = this.memories.find((m) => m.id === id);
    if (!memory) return;
    const newPinned = !memory.isPinned;

    try {
      const result = await this.memoryRepository.updateSessionMemory(id, { isPinned: newPinned });
      if (!result.success) return;

      runInAction(() => {
        const updated = this.memories.map((m) =>
          m.id === id ? { ...m, isPinned: newPinned } : m,
        );
        // Re-sort: pinned first, then by created_at DESC.
        this.memories = [
          ...updated.filter((m) => m.isPinned).sort((a, b) => b.createdAt - a.createdAt),
          ...updated.filter((m) => !m.isPinned).sort((a, b) => b.createdAt - a.createdAt),
        ];
      });
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to pin memory';
      });
    }
  }

  async deleteMemory(id: string): Promise<void> {
    try {
      const result = await this.memoryRepository.deleteSessionMemory(id);
      if (!result.success) return;
      runInAction(() => {
        this.memories = this.memories.filter((m) => m.id !== id);
      });
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to delete memory';
      });
    }
  }
}
