import { container } from '@/src/core/di/container';
import type { Model } from '@/src/features/models/domain/entities/Model';
import { GetAllModelsUseCase } from '@/src/features/models/domain/usecases/GetAllModelsUseCase';
import { getModelConfig } from '@/src/infrastructure/downloads/modelConfig';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing,
  FlatList,
  KeyboardAvoidingView, Platform,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ChatMessage } from '../../../domain/entities/ChatMessage';
import { ChatHeader } from '../../components/ChatHeader/ChatHeader';
import { ChatInputBar } from '../../components/ChatInputBar/ChatInputBar';
import type { ChatViewModel } from '../../viewmodels/ChatViewModel';
import { styles } from './ChatScreenStyles';

interface ChatScreenProps {
  sessionId: string;
  viewModel: ChatViewModel;
}

// Blinking cursor for streaming bubble.
function StreamingCursor() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.Text style={[styles.cursor, { opacity }]}>▋</Animated.Text>;
}

// Shimmering thinking indicator while model prepares first token.
function ThinkingIndicator() {
  const shimmerProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerProgress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerProgress]);

  const shimmerTranslateX = shimmerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 110],
  });

  return (
    <View style={styles.thinkingRow}>
      <Text style={styles.thinkingText}>Thinking...</Text>
      <Animated.View
        pointerEvents="none"
        style={[styles.thinkingShimmer, { transform: [{ translateX: shimmerTranslateX }] }]}
      />
    </View>
  );
}

const MessageBubble = observer(({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={[styles.messageRow, styles.userRow]}>
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={[styles.bubbleText, styles.userBubbleText]}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, styles.assistantRow]}>
      <View style={[styles.bubble, styles.assistantBubble]}>
        <Text style={[styles.bubbleText, styles.assistantBubbleText]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
});

const StreamingBubble = observer(({ content }: { content: string }) => (
  <View style={[styles.messageRow, styles.assistantRow]}>
    <View style={[styles.bubble, styles.assistantBubble]}>
      <Text style={[styles.bubbleText, styles.assistantBubbleText]}>
        {content}<StreamingCursor />
      </Text>
    </View>
  </View>
));

export const ChatScreen = observer(({ sessionId, viewModel }: ChatScreenProps) => {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const [hasDownloadedModel, setHasDownloadedModel] = useState(true);
  const [pickerModels, setPickerModels] = useState<Model[]>([]);

  const loadPickerModels = useCallback(async () => {
    try {
      await container.initializeContainer();
      const result = await new GetAllModelsUseCase(container.modelRepository).execute();
      if (result.success) {
        setPickerModels(result.data);
      }
    } catch {
      setPickerModels([]);
    }
  }, []);

  const refreshDownloadedModel = useCallback(async () => {
    try {
      await container.initializeContainer();
      const r = await container.modelRepository.hasDownloadedModel();
      setHasDownloadedModel(r.success && r.data);
    } catch {
      setHasDownloadedModel(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshDownloadedModel();
    }, [refreshDownloadedModel]),
  );

  useEffect(() => {
    viewModel.loadSession(sessionId);
  }, [sessionId, viewModel]);

  // Scroll to bottom whenever messages or streaming content change.
  useEffect(() => {
    if (viewModel.messages.length > 0 || viewModel.streamingContent) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [viewModel.messages.length, viewModel.streamingContent]);

  const modelConfig = viewModel.session
    ? getModelConfig(viewModel.session.modelId)
    : null;

  const handleSend = useCallback(() => {
    viewModel.sendMessage();
  }, [viewModel]);

  const handleStop = useCallback(() => {
    viewModel.stopGeneration();
  }, [viewModel]);

  const canSend =
    hasDownloadedModel &&
    viewModel.inputText.trim().length > 0 &&
    !viewModel.isStreaming;

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble message={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeAreaContainer}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ChatHeader
          hasDownloadedModel={hasDownloadedModel}
          modelName={modelConfig?.displayName}
          pickerModels={pickerModels}
          onRequestPickerModels={loadPickerModels}
          currentModelId={viewModel.session?.modelId}
          onGoToModels={() => router.push('/(tabs)/models')}
          onSelectDownloadedModel={(modelId) => {
            void viewModel.updateSessionModel(modelId);
          }}
          onBack={() => router.replace('/(tabs)/chat')}
          onNewChat={() =>
            router.push(
              viewModel.session?.modelId
                ? `/chat/new?modelId=${encodeURIComponent(viewModel.session.modelId)}`
                : '/chat/new',
            )
          }
          onDownloadModelPress={() => router.push('/(tabs)/models')}
        />

        {/* Message list */}
        <FlatList
          ref={listRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          data={viewModel.messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          ListFooterComponent={
            <>
              {viewModel.isModelLoading && <ThinkingIndicator />}
              {viewModel.isStreaming && !viewModel.isModelLoading && viewModel.streamingContent !== '' && (
                <StreamingBubble content={viewModel.streamingContent} />
              )}
              {viewModel.error && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{viewModel.error}</Text>
                </View>
              )}
            </>
          }
        />

        <ChatInputBar
          inputText={viewModel.inputText}
          isStreaming={viewModel.isStreaming}
          canSend={canSend}
          inputEnabled={hasDownloadedModel}
          selectedMode={viewModel.selectedMode}
          onChangeText={(t) => viewModel.setInputText(t)}
          onSelectMode={(mode) => viewModel.setSelectedMode(mode)}
          onSend={handleSend}
          onStop={handleStop}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});
