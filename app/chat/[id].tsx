import { useLocalSearchParams, useRouter } from 'expo-router';
import { container } from '@/src/core/di/container';
import { ChatScreen } from '@/src/features/chat/presentation/screens/chat-screen/ChatScreen';
import { ChatViewModel } from '@/src/features/chat/presentation/viewmodels/ChatViewModel';
import { CreateSessionUseCase } from '@/src/features/chat/domain/usecases/CreateSessionUseCase';
import { GetSessionUseCase } from '@/src/features/chat/domain/usecases/GetSessionUseCase';
import { GetMessagesUseCase } from '@/src/features/chat/domain/usecases/GetMessagesUseCase';
import { SendMessageUseCase } from '@/src/features/chat/domain/usecases/SendMessageUseCase';
import { GenerateChatTitleUseCase } from '@/src/features/chat/domain/usecases/GenerateChatTitleUseCase';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BLACK_PRIMARY, PRIMARY_ORANGE } from '@/src/design-system/tokens/colors';

export default function ChatSessionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(id ?? null);

  const viewModel = useMemo(() => {
    const repo = container.chatRepository;
    const llm = container.llmEngine;
    return new ChatViewModel(
      new CreateSessionUseCase(repo),
      new GetSessionUseCase(repo),
      new GetMessagesUseCase(repo),
      new SendMessageUseCase(repo, llm),
      new GenerateChatTitleUseCase(repo, llm),
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function resolveSession() {
      if (id !== 'new') {
        if (isMounted) setResolvedSessionId(id);
        return;
      }

      const allModelsResult = await container.modelRepository.getAllModels();
      if (!allModelsResult.success) return;
      const downloaded = allModelsResult.data.find((m) => m.isDownloaded);
      if (!downloaded) return;

      const created = await container.chatRepository.createSession(downloaded.id);
      if (!created.success) return;

      if (!isMounted) return;
      setResolvedSessionId(created.data.id);
      router.replace(`/chat/${created.data.id}`);
    }

    resolveSession();
    return () => {
      isMounted = false;
    };
  }, [id, router]);

  if (!resolvedSessionId) {
    return (
      <View style={{ flex: 1, backgroundColor: BLACK_PRIMARY, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={PRIMARY_ORANGE} />
      </View>
    );
  }

  return <ChatScreen sessionId={resolvedSessionId} viewModel={viewModel} />;
}
