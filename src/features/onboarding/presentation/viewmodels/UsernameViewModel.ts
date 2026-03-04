import { action, computed, makeObservable, observable } from 'mobx';
import type { SaveDisplayNameUseCase } from '../../domain/usecases/SaveDisplayNameUseCase';

export class UsernameViewModel {
  @observable userName = '';
  @observable isLoading = false;
  @observable validationError: string | null = null;

  constructor(private readonly saveDisplayNameUseCase: SaveDisplayNameUseCase) {
    makeObservable(this);
  }

  @computed
  get canProceed(): boolean {
    return this.userName.trim().length >= 2;
  }

  @action
  setUserName(name: string): void {
    this.userName = name;
    this.validationError = null;
  }

  @action
  async saveProfile(): Promise<boolean> {
    if (!this.canProceed) {
      this.validationError = 'Please enter a valid name';
      return false;
    }

    this.isLoading = true;
    this.validationError = null;

    try {
      await this.saveDisplayNameUseCase.execute(this.userName);
      return true;
    } catch (error) {
      this.validationError = error instanceof Error ? error.message : 'Failed to save profile';
      return false;
    } finally {
      this.isLoading = false;
    }
  }
}
