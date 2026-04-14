import type { IUserRepository } from '@/src/features/onboarding/domain/repositories/IUserRepository';
import type { GetPinnedFactsUseCase } from '@/src/features/memory/domain/usecases/GetPinnedFactsUseCase';
import type { SavePinnedFactsUseCase } from '@/src/features/memory/domain/usecases/SavePinnedFactsUseCase';
import type { ResetAllLocalDataUseCase } from '@/src/features/profile/domain/usecases/ResetAllLocalDataUseCase';
import { DEFAULT_AVATAR_INDEX } from '@/src/features/profile/presentation/constants/userAvatarSources';
import { makeAutoObservable, runInAction } from 'mobx';

export class ProfileAccountViewModel {
  displayName = '';
  avatarIndex = DEFAULT_AVATAR_INDEX;
  isLoadingProfile = true;
  isResetting = false;
  loadError: string | null = null;
  pinnedFacts = '';

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly resetAllLocalDataUseCase: ResetAllLocalDataUseCase,
    private readonly getPinnedFactsUseCase: GetPinnedFactsUseCase,
    private readonly savePinnedFactsUseCase: SavePinnedFactsUseCase,
  ) {
    makeAutoObservable(this);
  }

  async loadProfile(): Promise<void> {
    this.isLoadingProfile = true;
    this.loadError = null;
    try {
      const [name, avatar, factsResult] = await Promise.all([
        this.userRepository.getDisplayName(),
        this.userRepository.getAvatarIndex(),
        this.getPinnedFactsUseCase.execute(),
      ]);
      runInAction(() => {
        this.displayName = (name ?? '').trim() || 'You';
        this.avatarIndex = avatar ?? DEFAULT_AVATAR_INDEX;
        this.pinnedFacts = factsResult.success ? factsResult.data : '';
        this.isLoadingProfile = false;
      });
    } catch (e) {
      runInAction(() => {
        this.loadError = e instanceof Error ? e.message : 'Could not load profile';
        this.isLoadingProfile = false;
      });
    }
  }

  async savePinnedFacts(facts: string): Promise<void> {
    await this.savePinnedFactsUseCase.execute(facts);
    runInAction(() => {
      this.pinnedFacts = facts.slice(0, 800);
    });
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
