import type { ChatMode } from '@/src/features/chat/domain/entities/ChatMode';
import { CHAT_MODES } from '@/src/features/chat/domain/entities/ChatMode';
import { MODE_SYSTEM_PROMPTS } from '@/src/features/chat/domain/config/modeSystemPrompts';
import type { GetModeSystemPromptOverrideUseCase } from '@/src/features/profile/domain/usecases/GetModeSystemPromptOverrideUseCase';
import type { SaveModeSystemPromptOverrideUseCase } from '@/src/features/profile/domain/usecases/SaveModeSystemPromptOverrideUseCase';
import { makeAutoObservable, runInAction } from 'mobx';

export class ModeSystemPromptsViewModel {
  selectedMode: ChatMode = 'general';
  draft = '';
  /** Trimmed value last loaded from storage or last successfully saved for this mode. */
  lastPersistedDraft = '';
  /** True after save/reset until the user edits away from persisted state. */
  justSaved = false;
  isLoadingDraft = true;
  isSaving = false;
  error: string | null = null;

  readonly modes = CHAT_MODES;

  constructor(
    private readonly getOverrideUseCase: GetModeSystemPromptOverrideUseCase,
    private readonly saveOverrideUseCase: SaveModeSystemPromptOverrideUseCase,
  ) {
    makeAutoObservable(this);
  }

  get isDirty(): boolean {
    return this.draft.trim() !== this.lastPersistedDraft;
  }

  /** Save enabled only when there are unsaved edits. */
  get canSave(): boolean {
    return this.isDirty && !this.isSaving && !this.isLoadingDraft;
  }

  get saveButtonLabel(): 'Save' | 'Saved' {
    return this.justSaved && !this.isDirty ? 'Saved' : 'Save';
  }

  get canReset(): boolean {
    if (this.isLoadingDraft || this.isSaving) return false;
    return this.draft.trim() !== '' || this.lastPersistedDraft !== '';
  }

  defaultPromptFor(mode: ChatMode): string {
    return MODE_SYSTEM_PROMPTS[mode];
  }

  setDraft(text: string): void {
    runInAction(() => {
      this.draft = text;
      if (text.trim() !== this.lastPersistedDraft) {
        this.justSaved = false;
      }
    });
  }

  async loadInitial(): Promise<void> {
    await this.loadDraftForMode(this.selectedMode);
  }

  async selectMode(mode: ChatMode): Promise<void> {
    if (mode === this.selectedMode) return;
    runInAction(() => {
      this.selectedMode = mode;
      this.error = null;
    });
    await this.loadDraftForMode(mode);
  }

  private async loadDraftForMode(mode: ChatMode): Promise<void> {
    runInAction(() => {
      this.isLoadingDraft = true;
      this.error = null;
    });
    const result = await this.getOverrideUseCase.execute(mode);
    runInAction(() => {
      this.isLoadingDraft = false;
      if (result.success) {
        const loaded = result.data ?? '';
        this.draft = loaded;
        this.lastPersistedDraft = loaded.trim();
      } else {
        this.error = result.error.message;
        this.draft = '';
        this.lastPersistedDraft = '';
      }
      this.justSaved = false;
    });
  }

  async save(): Promise<void> {
    if (!this.canSave) return;
    runInAction(() => {
      this.isSaving = true;
      this.error = null;
    });
    const result = await this.saveOverrideUseCase.execute(this.selectedMode, this.draft);
    runInAction(() => {
      this.isSaving = false;
      if (!result.success) {
        this.error = result.error.message;
        return;
      }
      const trimmed = this.draft.trim();
      this.draft = trimmed;
      this.lastPersistedDraft = trimmed;
      this.justSaved = true;
    });
  }

  async reset(): Promise<void> {
    if (!this.canReset) return;
    runInAction(() => {
      this.isSaving = true;
      this.error = null;
    });
    const result = await this.saveOverrideUseCase.execute(this.selectedMode, '');
    runInAction(() => {
      this.isSaving = false;
      if (!result.success) {
        this.error = result.error.message;
        return;
      }
      this.draft = '';
      this.lastPersistedDraft = '';
      this.justSaved = true;
    });
  }
}
