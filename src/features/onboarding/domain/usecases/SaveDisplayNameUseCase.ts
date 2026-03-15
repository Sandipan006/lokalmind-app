import type { IUserRepository } from '../repositories/IUserRepository';

export class SaveDisplayNameUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(name: string): Promise<void> {
    const trimmed = name.trim();
    
    if (trimmed.length < 2) {
      throw new Error('Display name must be at least 2 characters');
    }
    
    if (trimmed.length > 30) {
      throw new Error('Display name must be less than 30 characters');
    }
    
    const avatarIndex = this.assignAvatarIndex(trimmed);
    await this.userRepository.saveDisplayName(trimmed);
    await this.userRepository.saveAvatarIndex(avatarIndex);
    await this.userRepository.markOnboardingComplete();
  }

  private assignAvatarIndex(displayName: string): number {
    let hash = 0;
    for (let i = 0; i < displayName.length; i += 1) {
      hash = (hash * 31 + displayName.charCodeAt(i)) % 21;
    }
    return hash + 1;
  }
}
