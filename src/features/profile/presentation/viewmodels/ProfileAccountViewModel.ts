import type { IUserRepository } from '@/src/features/onboarding/domain/repositories/IUserRepository';
import type { ResetAllLocalDataUseCase } from '@/src/features/profile/domain/usecases/ResetAllLocalDataUseCase';
import { DEFAULT_AVATAR_INDEX } from '@/src/features/profile/presentation/constants/userAvatarSources';
import { makeAutoObservable, runInAction } from 'mobx';

export class ProfileAccountViewModel {
  displayName = '';
  avatarIndex = DEFAULT_AVATAR_INDEX;
  isLoadingProfile = true;
  isResetting = false;
  loadError: string | null = null;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly resetAllLocalDataUseCase: ResetAllLocalDataUseCase,
  ) {
    makeAutoObservable(this);
  }

  async loadProfile(): Promise<void> {
    this.isLoadingProfile = true;
    this.loadError = null;
    try {
      const [name, avatar] = await Promise.all([
        this.userRepository.getDisplayName(),
        this.userRepository.getAvatarIndex(),
      ]);
      runInAction(() => {
        this.displayName = (name ?? '').trim() || 'You';
        this.avatarIndex = avatar ?? DEFAULT_AVATAR_INDEX;
        this.isLoadingProfile = false;
      });
    } catch (e) {
      runInAction(() => {
        this.loadError = e instanceof Error ? e.message : 'Could not load profile';
        this.isLoadingProfile = false;
      });
    }
  }

  async resetAllData(): Promise<void> {
    this.isResetting = true;
    try {
      await this.resetAllLocalDataUseCase.execute();
      runInAction(() => {
        this.isResetting = false;
      });
    } catch (e) {
      runInAction(() => {
        this.isResetting = false;
      });
      throw e;
    }
  }
}
