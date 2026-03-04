export interface IUserRepository {
  saveDisplayName(name: string): Promise<void>;
  getDisplayName(): Promise<string | null>;
  markOnboardingComplete(): Promise<void>;
  isOnboardingComplete(): Promise<boolean>;
}
