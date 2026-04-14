import { useLocalSearchParams, useRouter } from 'expo-router';
import { container } from '@/src/core/di/container';
import { ChatScreen } from '@/src/features/chat/presentation/screens/chat-screen/ChatScreen';
import { ChatViewModel } from '@/src/features/chat/presentation/viewmodels/ChatViewModel';
import { CreateSessionUseCase } from '@/src/features/chat/domain/usecases/CreateSessionUseCase';
import { GetSessionUseCase } from '@/src/features/chat/domain/usecases/GetSessionUseCase';
import { GetMessagesUseCase } from '@/src/features/chat/domain/usecases/GetMessagesUseCase';
import { EditMessageUseCase } from '@/src/features/chat/domain/usecases/EditMessageUseCase';
import { GenerateChatTitleUseCase } from '@/src/features/chat/domain/usecases/GenerateChatTitleUseCase';
import { RegenerateReplyUseCase } from '@/src/features/chat/domain/usecases/RegenerateReplyUseCase';
import { SendMessageUseCase } from '@/src/features/chat/domain/usecases/SendMessageUseCase';
import { UpdateSessionModelUseCase } from '@/src/features/chat/domain/usecases/UpdateSessionModelUseCase';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BLACK_PRIMARY, PRIMARY_ORANGE } from '@/src/design-system/tokens/colors';

function normalizeQueryParam(param: string | string[] | undefined): string | undefined {
  if (param === undefined) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export default function ChatSessionScreen() {
  const router = useRouter();
  const { id, modelId: modelIdParam } = useLocalSearchParams<{ id: string; modelId?: string | string[] }>();
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(id ?? null);
  const [isContainerReady, setIsContainerReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void container.initializeContainer()
      .then(() => {
        if (mounted) setIsContainerReady(true);
      })
      .catch((e) => {
        if (__DEV__) console.error('[ChatRoute] Failed to initialize container', e);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const viewModel = useMemo(() => {
    if (!isContainerReady) return null;
    const repo = container.chatRepository;
    const llm = container.llmEngine;
    const settings = container.appSettingsRepository;
    const memRepo = container.memoryRepository;
    const memService = container.memoryService;
    return new ChatViewModel(
      new CreateSessionUseCase(repo),
      new GetSessionUseCase(repo),
      new GetMessagesUseCase(repo),
      new SendMessageUseCase(repo, llm, settings, memRepo, memService),
      new EditMessageUseCase(repo),
      new GenerateChatTitleUseCase(repo, llm),
      new UpdateSessionModelUseCase(repo),
      new RegenerateReplyUseCase(repo, llm, settings, memRepo, memService),
      container.summarizeSessionUseCase,
      container.updateUserProfileUseCase,
      memRepo,
      llm,
      container.embeddingService,
    );
  }, [isContainerReady]);

  useEffect(() => {
    if (!isContainerReady || !viewModel) return;
    container.userRepository.getDisplayName().then((name) => {
      if (name) viewModel.userDisplayName = name;
    }).catch(() => undefined);
  }, [isContainerReady, viewModel]);

  useEffect(() => {
    let isMounted = true;

    async function resolveSession() {
      if (!isContainerReady) return;
      if (id !== 'new') {
        if (isMounted) setResolvedSessionId(id);
        return;
      }

      const allModelsResult = await container.modelRepository.getAllModels();
      if (!allModelsResult.success) return;
      const preferredId = normalizeQueryParam(modelIdParam);
      const downloadedList = allModelsResult.data.filter((m) => m.isDownloaded);
      const chosenId =
        preferredId && downloadedList.some((m) => m.id === preferredId)
          ? preferredId
          : downloadedList[0]?.id;
      if (!chosenId) return;

      const created = await container.chatRepository.createSession(chosenId);
      if (!created.success) return;

      if (!isMounted) return;
      setResolvedSessionId(created.data.id);
      router.replace(`/chat/${created.data.id}`);
    }

    resolveSession();
    return () => {
      isMounted = false;
    };
  }, [id, isContainerReady, modelIdParam, router]);

  if (!isContainerReady || !viewModel || !resolvedSessionId) {
    return (
      <View style={{ flex: 1, backgroundColor: BLACK_PRIMARY, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={PRIMARY_ORANGE} />
      </View>
    );
  }

  return <ChatScreen sessionId={resolvedSessionId} viewModel={viewModel} />;
}
