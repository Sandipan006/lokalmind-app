export interface IUserRepository {
  saveDisplayName(name: string): Promise<void>;
  getDisplayName(): Promise<string | null>;
  saveAvatarIndex(index: number): Promise<void>;
  getAvatarIndex(): Promise<number | null>;
  markOnboardingComplete(): Promise<void>;
  isOnboardingComplete(): Promise<boolean>;
}
