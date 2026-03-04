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
    
    await this.userRepository.saveDisplayName(trimmed);
    await this.userRepository.markOnboardingComplete();
  }
}
