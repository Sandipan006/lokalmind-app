import { container } from '@/src/core/di/container';
import { PRIMARY_ORANGE, TEXT_WHITE_60 } from '@/src/design-system/tokens/colors';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ChatSession } from '../../../domain/entities/ChatSession';
import { ChatSessionRow } from '../../components/ChatSessionRow/ChatSessionRow';
import { NewChatButton } from '../../components/NewChatButton/NewChatButton';
import { RenameChatModal } from '../../components/RenameChatModal/RenameChatModal';
import { styles } from './ChatHistoryScreenStyles';

export function ChatHistoryScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingSession, setEditingSession] = useState<ChatSession | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await container.chatRepository.getSessions();
      setSessions(result.success ? result.data : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={PRIMARY_ORANGE} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recents</Text>
        <Text style={styles.headerSubtitle}>Your chat history</Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.swipeableContainer}>
            <Swipeable
              overshootRight={false}
              rightThreshold={24}
              renderRightActions={() => (
                <View style={styles.swipeActions}>
                  <TouchableOpacity
                    style={[styles.swipeActionButton, styles.editActionButton]}
                    onPress={() => {
                      setEditingSession(item);
                      setTitleDraft(item.title);
                    }}
                    activeOpacity={0.8}
                  >
                    <SymbolView name="pencil" size={20} tintColor={TEXT_WHITE_60} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.swipeActionButton, styles.deleteActionButton]}
                    onPress={() => {
                      Alert.alert(
                        'Delete chat?',
                        'This chat and all messages will be permanently deleted.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              await container.chatRepository.deleteSession(item.id);
                              await loadHistory();
                            },
                          },
                        ],
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <SymbolView name="trash" size={20} tintColor={TEXT_WHITE_60} />
                  </TouchableOpacity>
                </View>
              )}
            >
              <View style={styles.rowInset}>
                <ChatSessionRow
                  session={item}
                  onPress={() => router.push(`/chat/${item.id}`)}
                />
              </View>
            </Swipeable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No chat history for now</Text>
          </View>
        }
      />

      <NewChatButton onPress={() => router.push('/chat/new')} />
      <RenameChatModal
        visible={editingSession !== null}
        titleDraft={titleDraft}
        onChangeTitle={setTitleDraft}
        onCancel={() => setEditingSession(null)}
        onSave={async () => {
          if (!editingSession) return;
          const title = titleDraft.trim() || 'New Chat';
          await container.chatRepository.updateSessionTitle(editingSession.id, title);
          setEditingSession(null);
          await loadHistory();
        }}
      />
    </SafeAreaView>
  );
}
