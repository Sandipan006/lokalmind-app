import { makeAutoObservable, runInAction } from 'mobx';
import type { SaveDisplayNameUseCase } from '../../domain/usecases/SaveDisplayNameUseCase';

export class UsernameViewModel {
  userName = '';
  isLoading = false;
  validationError: string | null = null;

  constructor(private readonly saveDisplayNameUseCase: SaveDisplayNameUseCase) {
    makeAutoObservable(this);
  }

  get canProceed(): boolean {
    return this.userName.trim().length >= 2;
  }

  setUserName(name: string): void {
    this.userName = name;
    this.validationError = null;
  }

  async saveProfile(): Promise<boolean> {
    if (!this.canProceed) {
      runInAction(() => {
        this.validationError = 'Please enter a valid name';
      });
      return false;
    }

    runInAction(() => {
      this.isLoading = true;
      this.validationError = null;
    });

    try {
      await this.saveDisplayNameUseCase.execute(this.userName);
      return true;
    } catch (error) {
      runInAction(() => {
        this.validationError = error instanceof Error ? error.message : 'Failed to save profile';
      });
      return false;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }
}
