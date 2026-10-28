import type { IChatRepository } from '@/src/features/chat/domain/repositories/IChatRepository';
import type { IModelRepository } from '@/src/features/models/domain/repositories/IModelRepository';
import type { IUserRepository } from '@/src/features/onboarding/domain/repositories/IUserRepository';

export type InitialAppRoute =
  | '/chat/new'
  | '/(tabs)/chat'
  | '/onboarding/model-setup'
  | '/onboarding/welcome';

/**
 * Decides first navigation after splash - onboarding state, downloaded models, and chat history.
 */
export class ResolveInitialRouteUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly modelRepository: IModelRepository,
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(): Promise<InitialAppRoute> {
    const onboardingComplete = await this.userRepository.isOnboardingComplete();
    if (!onboardingComplete) {
      return '/onboarding/welcome';
    }

    const hasModelResult = await this.modelRepository.hasDownloadedModel();
    const hasModel = hasModelResult.success ? hasModelResult.data : false;

    const sessionsResult = await this.chatRepository.getSessions();
    const hasAnyChats = sessionsResult.success && sessionsResult.data.length > 0;

    if (hasModel) {
      const allModelsResult = await this.modelRepository.getAllModels();
      if (allModelsResult.success && __DEV__) {
        const downloaded = allModelsResult.data.filter((m) => m.isDownloaded);
        console.warn('[AppInit] Downloaded models:', downloaded.map((m) => m.id));
      }
      return '/chat/new';
    }

    if (__DEV__) {
      console.warn('[AppInit] No downloaded models found.');
    }

    if (hasAnyChats) {
      return '/(tabs)/chat';
    }
    return '/onboarding/model-setup';
  }
}
