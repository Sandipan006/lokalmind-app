import { container } from '@/src/core/di/container';
import type { Model } from '@/src/features/models/domain/entities/Model';
import { GetAllModelsUseCase } from '@/src/features/models/domain/usecases/GetAllModelsUseCase';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { TextInput } from 'react-native';
import {
    ActionSheetIOS,
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ChatMessage } from '../../../domain/entities/ChatMessage';
import { ChatHeader } from '../../components/ChatHeader/ChatHeader';
import { ChatInputBar } from '../../components/ChatInputBar/ChatInputBar';
import { MessageQueueStrip } from '../../components/MessageQueueStrip/MessageQueueStrip';
import { RegenerateControls } from '../../components/RegenerateControls/RegenerateControls';
import type { ChatViewModel } from '../../viewmodels/ChatViewModel';
import { ChatMessageSwipeable, StreamingBubble, ThinkingIndicator } from './ChatMessageViews';
import { styles } from './ChatScreenStyles';

interface ChatScreenProps {
  sessionId: string;
  viewModel: ChatViewModel;
}

export const ChatScreen = observer(({ sessionId, viewModel }: ChatScreenProps) => {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const scrollTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const composerInputRef = useRef<TextInput>(null);
  const [hasDownloadedModel, setHasDownloadedModel] = useState(true);
  // 1-based index of which alternate is currently displayed, keyed by message id.
  const [alternateViewIndexMap, setAlternateViewIndexMap] = useState<Record<string, number>>({});

  const dismissKeyboard = useCallback(() => {
    composerInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);
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
      void loadPickerModels();
      return () => {
        composerInputRef.current?.blur();
        Keyboard.dismiss();
      };
    }, [loadPickerModels, refreshDownloadedModel]),
  );

  useEffect(() => {
    void viewModel.loadSession(sessionId).catch(() => undefined);
  }, [sessionId, viewModel]);

  useEffect(() => () => {
    for (const timer of scrollTimersRef.current) clearTimeout(timer);
    scrollTimersRef.current = [];
  }, []);

  const scrollThreadToEnd = useCallback((animated = true) => {
    for (const timer of scrollTimersRef.current) clearTimeout(timer);
    scrollTimersRef.current = [];
    listRef.current?.scrollToEnd({ animated });
    // Double-fire after layout settles (content size / KAV resize).
    const timerA = setTimeout(() => listRef.current?.scrollToEnd({ animated }), 150);
    const timerB = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 350);
    scrollTimersRef.current.push(timerA, timerB);
  }, []);

  // Scroll to latest when messages arrive or session switches.
  useEffect(() => {
    if (viewModel.isLoading) return;
    if (viewModel.messages.length === 0) return;
    scrollThreadToEnd();
  }, [sessionId, viewModel.isLoading, viewModel.messages.length, scrollThreadToEnd]);

  // Scroll when keyboard opens so the last bubble clears the composer.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => scrollThreadToEnd());
    return () => show.remove();
  }, [scrollThreadToEnd]);

  const activeModelName = viewModel.session
    ? pickerModels.find((m) => m.id === viewModel.session?.modelId)?.displayName
    : undefined;

  const handleSend = useCallback(() => {
    if (viewModel.editingMessage) {
      viewModel.submitEdit();
    } else {
      viewModel.sendMessage();
    }
  }, [viewModel]);

  const handleStop = useCallback(() => {
    viewModel.stopGeneration();
  }, [viewModel]);

  const handleLongPressMessage = useCallback((message: ChatMessage) => {
    if (viewModel.isStreaming) return;
    if (message.role === 'user') {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: ['Cancel', 'Reply', 'Edit'], cancelButtonIndex: 0 },
          (buttonIndex) => {
            if (buttonIndex === 1) viewModel.setReplyTargetFromMessage(message);
            if (buttonIndex === 2) viewModel.startEdit(message);
          },
        );
      } else {
        Alert.alert('Message', undefined, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reply', onPress: () => viewModel.setReplyTargetFromMessage(message) },
          { text: 'Edit', onPress: () => viewModel.startEdit(message) },
        ]);
      }
      return;
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Reply'], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) viewModel.setReplyTargetFromMessage(message);
        },
      );
    } else {
      Alert.alert('Message', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reply', onPress: () => viewModel.setReplyTargetFromMessage(message) },
      ]);
    }
  }, [viewModel]);

  const isSessionReady = viewModel.session !== null && !viewModel.isLoading;
  const canSend =
    hasDownloadedModel &&
    isSessionReady &&
    viewModel.inputText.trim().length > 0 &&
    (!viewModel.isStreaming || viewModel.canAcceptMoreQueuedMessages);

  const lastAssistantId = (() => {
    for (let i = viewModel.messages.length - 1; i >= 0; i--) {
      const m = viewModel.messages[i];
      if (m && m.role === 'assistant' && m.status === 'done') return m.id;
    }
    return null;
  })();

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isLastAssistant =
        item.role === 'assistant' && item.status === 'done' && item.id === lastAssistantId;

      let displayContent: string | undefined;
      let regenerateControls: ReactNode | undefined;

      if (item.role === 'assistant') {
        // During regeneration, stream the new content in-place on this bubble.
        const isRegenerating = item.id === viewModel.regeneratingMessageId;
        if (isRegenerating) {
          // Stream in-place: override bubble content + show cursor inside the bubble text.
          const streamingDisplay = viewModel.isModelLoading
            ? item.content
            : viewModel.streamingContent || item.content;
          return (
            <ChatMessageSwipeable
              item={item}
              swipeEnabled={false}
              onSwipeReply={() => {}}
              onLongPressMessage={handleLongPressMessage}
              onDismissKeyboard={dismissKeyboard}
              displayContent={streamingDisplay}
              {...(!viewModel.isModelLoading ? { isStreaming: true } : {})}
            />
          );
        }

        const alternates = item.alternateContents;
        // totalVersions = number of versions stored in alternates (which includes all, current last).
        const totalVersions = alternates ? alternates.length : 1;
        // activeIndex: which version is the user looking at (1-based).
        const activeIndex = alternateViewIndexMap[item.id] ?? totalVersions;

        if (alternates && activeIndex <= alternates.length) {
          displayContent = alternates[activeIndex - 1];
        }

        if (isLastAssistant) {
          regenerateControls = (
            <RegenerateControls
              totalVersions={totalVersions}
              activeIndex={activeIndex}
              disabled={viewModel.isStreaming}
              onPrev={() =>
                setAlternateViewIndexMap((prev) => ({
                  ...prev,
                  [item.id]: Math.max(1, (prev[item.id] ?? totalVersions) - 1),
                }))
              }
              onNext={() =>
                setAlternateViewIndexMap((prev) => ({
                  ...prev,
                  [item.id]: Math.min(totalVersions, (prev[item.id] ?? totalVersions) + 1),
                }))
              }
              onRegenerate={() => {
                void viewModel.regenerateLastReply().then(() => {
                  // After regeneration, the updated message in viewModel.messages has the new
                  // alternateContents length - jump to the last version automatically.
                  const updatedMsg = viewModel.messages.find((m) => m.id === item.id);
                  const newTotal = updatedMsg?.alternateContents?.length ?? totalVersions + 1;
                  setAlternateViewIndexMap((prev) => ({ ...prev, [item.id]: newTotal }));
                });
              }}
            />
          );
        } else if (alternates && totalVersions > 1) {
          // Non-last assistant messages: show pager only, no Regenerate button.
          regenerateControls = (
            <RegenerateControls
              totalVersions={totalVersions}
              activeIndex={activeIndex}
              showRegenerate={false}
              disabled={false}
              onPrev={() =>
                setAlternateViewIndexMap((prev) => ({
                  ...prev,
                  [item.id]: Math.max(1, (prev[item.id] ?? totalVersions) - 1),
                }))
              }
              onNext={() =>
                setAlternateViewIndexMap((prev) => ({
                  ...prev,
                  [item.id]: Math.min(totalVersions, (prev[item.id] ?? totalVersions) + 1),
                }))
              }
              onRegenerate={() => {}}
            />
          );
        }
      }

      return (
        <ChatMessageSwipeable
          item={item}
          swipeEnabled={!viewModel.isStreaming}
          onSwipeReply={(msg) => viewModel.setReplyTargetFromMessage(msg)}
          onLongPressMessage={handleLongPressMessage}
          onDismissKeyboard={dismissKeyboard}
          {...(displayContent !== undefined ? { displayContent } : {})}
          {...(regenerateControls !== undefined ? { regenerateControls } : {})}
        />
      );
    },
    [dismissKeyboard, handleLongPressMessage, viewModel, lastAssistantId, alternateViewIndexMap],
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
          modelName={activeModelName}
          pickerModels={pickerModels}
          onRequestPickerModels={loadPickerModels}
          currentModelId={viewModel.session?.modelId}
          onGoToModels={() => router.push('/(tabs)/models')}
          onSelectDownloadedModel={(modelId) => {
            void viewModel.updateSessionModel(modelId);
          }}
          onBack={() => {
            dismissKeyboard();
            router.replace('/(tabs)/chat');
          }}
          onNewChat={() =>
            router.push(
              viewModel.session?.modelId
                ? `/chat/new?modelId=${encodeURIComponent(viewModel.session.modelId)}`
                : '/chat/new',
            )
          }
          onDownloadModelPress={() => router.push('/(tabs)/models')}
        />

        <FlatList
          ref={listRef}
          style={styles.messageList}
          contentContainerStyle={[styles.messageListContent, { flexGrow: 1 }]}
          data={viewModel.messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          nestedScrollEnabled
          removeClippedSubviews={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={
            <>
              {viewModel.isModelLoading && !viewModel.regeneratingMessageId && <ThinkingIndicator onDismiss={dismissKeyboard} />}
              {viewModel.isStreaming && !viewModel.isModelLoading && viewModel.streamingContent !== '' && !viewModel.regeneratingMessageId && (
                <StreamingBubble content={viewModel.streamingContent} onDismiss={dismissKeyboard} />
              )}
              {viewModel.error && (
                <Pressable style={styles.errorBanner} onPress={dismissKeyboard}>
                  <Text style={styles.errorText}>{viewModel.error}</Text>
                </Pressable>
              )}
            </>
          }
        />

        <View style={styles.keyboardFooter}>
          <MessageQueueStrip
            items={viewModel.pendingQueue}
            onRemove={(id) => viewModel.cancelQueuedMessage(id)}
            onUpdate={(id, text) => viewModel.updateQueuedMessage(id, text)}
          />
          <ChatInputBar
            composerRef={composerInputRef}
            onComposerFocus={() => scrollThreadToEnd()}
            inputText={viewModel.inputText}
            isStreaming={viewModel.isStreaming}
            canSend={canSend}
            canEnqueueWhileStreaming={viewModel.canAcceptMoreQueuedMessages}
            inputEnabled={hasDownloadedModel}
            selectedMode={viewModel.selectedMode}
            isEditMode={viewModel.editingMessage !== null}
            replyDraft={viewModel.replyTarget}
            onDismissReply={() => viewModel.clearReplyTarget()}
            onChangeText={(t) => viewModel.setInputText(t)}
            onSelectMode={(mode) => viewModel.setSelectedMode(mode)}
            onSend={handleSend}
            onStop={handleStop}
            onCancelEdit={() => viewModel.cancelEdit()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});
