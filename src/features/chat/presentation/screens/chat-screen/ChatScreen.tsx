import { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatViewModel } from '../../viewmodels/ChatViewModel';
import { styles } from './ChatScreenStyles';
import { getModelConfig } from '@/src/infrastructure/downloads/modelConfig';
import type { ChatMessage } from '../../../domain/entities/ChatMessage';
import { ChatHeader } from '../../components/ChatHeader/ChatHeader';
import { ChatInputBar } from '../../components/ChatInputBar/ChatInputBar';

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

// Animated dots for model-loading state.
function ThinkingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      );
    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 200);
    const a3 = pulse(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.thinkingRow}>
      <View style={styles.thinkingBubble}>
        <Animated.View style={[styles.thinkingDot, { opacity: dot1 }]} />
        <Animated.View style={[styles.thinkingDot, { opacity: dot2 }]} />
        <Animated.View style={[styles.thinkingDot, { opacity: dot3 }]} />
      </View>
    </View>
  );
}

const MessageBubble = observer(({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.assistantBubbleText]}>
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

  const canSend = viewModel.inputText.trim().length > 0 && !viewModel.isStreaming;

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
          modelName={modelConfig?.displayName}
          onBack={() => router.replace('/(tabs)/chat')}
          onNewChat={() => router.push('/chat/new')}
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
          selectedMode={viewModel.selectedMode}
          onChangeText={(t) => viewModel.setInputText(t)}
          onModePress={() => viewModel.cycleMode()}
          onSend={handleSend}
          onStop={handleStop}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});
