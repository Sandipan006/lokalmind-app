import { container } from '@/src/core/di/container';
import type { Model } from '@/src/features/models/domain/entities/Model';
import { GetAllModelsUseCase } from '@/src/features/models/domain/usecases/GetAllModelsUseCase';
import { getModelConfig } from '@/src/infrastructure/downloads/modelConfig';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import {
  ActionSheetIOS,
  Alert,
  Animated, Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ChatMessage } from '../../../domain/entities/ChatMessage';
import { ChatHeader } from '../../components/ChatHeader/ChatHeader';
import { ChatInputBar } from '../../components/ChatInputBar/ChatInputBar';
import { MessageQueueStrip } from '../../components/MessageQueueStrip/MessageQueueStrip';
import {
  MessageRenderer,
  renderInlineMarkdown,
  type InlineMarkdownStyleSet,
} from '../../components/MessageRenderer/MessageRenderer';
import type { ChatViewModel } from '../../viewmodels/ChatViewModel';
import { styles } from './ChatScreenStyles';

const replyQuoteInlineMarkdown: InlineMarkdownStyleSet = {
  bold: styles.replyQuotePreviewBold,
  italic: styles.replyQuotePreviewItalic,
};

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
function ThinkingIndicator({ onDismiss }: { onDismiss: () => void }) {
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
    <Pressable style={styles.thinkingRow} onPress={onDismiss}>
      <Text style={styles.thinkingText}>Thinking...</Text>
      <Animated.View
        pointerEvents="none"
        style={[styles.thinkingShimmer, { transform: [{ translateX: shimmerTranslateX }] }]}
      />
    </Pressable>
  );
}

const MessageBubble = observer(({ message, onLongPressMessage, onDismissKeyboard }: {
  message: ChatMessage;
  onLongPressMessage?: (msg: ChatMessage) => void;
  onDismissKeyboard: () => void;
}) => {
  const isUser = message.role === 'user';
  const hasReply =
    message.replyPreview != null &&
    message.replyPreview.length > 0 &&
    message.replyToRole != null;

  if (isUser) {
    return (
      <View style={[styles.messageRow, styles.userRow]}>
        <Pressable
          style={[
            styles.bubble,
            styles.userBubble,
            hasReply ? styles.userBubblePaddingWithReply : styles.userBubblePaddingSingle,
          ]}
          onPress={onDismissKeyboard}
          onLongPress={() => onLongPressMessage?.(message)}
          delayLongPress={350}
        >
          <View style={styles.userBubbleContent}>
            {/* Main text first in tree so width = max(reply, body); column-reverse keeps reply visually on top. */}
            <Text
              style={[
                styles.bubbleText,
                styles.userBubbleText,
                hasReply ? styles.userBubbleTextWithReply : styles.userBubbleTextSingle,
              ]}
            >
              {message.content}
            </Text>
            {hasReply ? (
              <View style={styles.replyQuoteRow}>
                <View style={styles.replyQuoteAccent} />
                <View style={styles.replyQuoteContent}>
                  <Text style={styles.replyQuoteLabel} numberOfLines={1}>
                    {message.replyToRole === 'assistant' ? 'Assistant' : 'You'}
                  </Text>
                  <Text
                    style={styles.replyQuotePreview}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {renderInlineMarkdown(
                      message.replyPreview,
                      `rq-${message.id}`,
                      replyQuoteInlineMarkdown,
                    )}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, styles.assistantRow]}>
      <Pressable
        onPress={onDismissKeyboard}
        onLongPress={() => onLongPressMessage?.(message)}
        delayLongPress={350}
      >
        <View style={[styles.bubble, styles.assistantBubble]}>
          <MessageRenderer content={message.content} />
        </View>
      </Pressable>
    </View>
  );
});

const StreamingBubble = observer(({ content, onDismiss }: { content: string; onDismiss: () => void }) => (
  <Pressable style={[styles.messageRow, styles.assistantRow]} onPress={onDismiss}>
    <View style={[styles.bubble, styles.assistantBubble]}>
      <MessageRenderer content={content} isStreaming trailingElement={<StreamingCursor />} />
    </View>
  </Pressable>
));

const ChatMessageSwipeable = observer(
  ({
    item,
    swipeEnabled,
    onSwipeReply,
    onLongPressMessage,
    onDismissKeyboard,
  }: {
    item: ChatMessage;
    swipeEnabled: boolean;
    onSwipeReply: (msg: ChatMessage) => void;
    onLongPressMessage: (msg: ChatMessage) => void;
    onDismissKeyboard: () => void;
  }) => {
    const swipeRef = useRef<SwipeableMethods | null>(null);

    return (
      <ReanimatedSwipeable
        ref={swipeRef}
        enabled={swipeEnabled}
        friction={2}
        overshootLeft={false}
        renderLeftActions={() => <View style={styles.swipeReplyPlaceholder} />}
        onSwipeableOpen={(direction) => {
          // Left action panel uses positive row translation → `SwipeDirection.RIGHT` (see RNGH ReanimatedSwipeable).
          if (direction === SwipeDirection.RIGHT) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSwipeReply(item);
            swipeRef.current?.close();
          }
        }}
      >
        <MessageBubble
          message={item}
          onLongPressMessage={onLongPressMessage}
          onDismissKeyboard={onDismissKeyboard}
        />
      </ReanimatedSwipeable>
    );
  },
);

export const ChatScreen = observer(({ sessionId, viewModel }: ChatScreenProps) => {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const composerInputRef = useRef<TextInput>(null);
  const [hasDownloadedModel, setHasDownloadedModel] = useState(true);

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
      return () => {
        composerInputRef.current?.blur();
        Keyboard.dismiss();
      };
    }, [refreshDownloadedModel]),
  );

  useEffect(() => {
    viewModel.loadSession(sessionId);
  }, [sessionId, viewModel]);

  const scrollThreadToEnd = useCallback((animated = true) => {
    listRef.current?.scrollToEnd({ animated });
    // Double-fire after layout settles (content size / KAV resize).
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 150);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 350);
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

  const modelConfig = viewModel.session
    ? getModelConfig(viewModel.session.modelId)
    : null;

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

  const canSend =
    hasDownloadedModel &&
    viewModel.inputText.trim().length > 0 &&
    (!viewModel.isStreaming || viewModel.canAcceptMoreQueuedMessages);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatMessageSwipeable
        item={item}
        swipeEnabled={!viewModel.isStreaming}
        onSwipeReply={(msg) => viewModel.setReplyTargetFromMessage(msg)}
        onLongPressMessage={handleLongPressMessage}
        onDismissKeyboard={dismissKeyboard}
      />
    ),
    [dismissKeyboard, handleLongPressMessage, viewModel],
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
              {viewModel.isModelLoading && <ThinkingIndicator onDismiss={dismissKeyboard} />}
              {viewModel.isStreaming && !viewModel.isModelLoading && viewModel.streamingContent !== '' && (
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
