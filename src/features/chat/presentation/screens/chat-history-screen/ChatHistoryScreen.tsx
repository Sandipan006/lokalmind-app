import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { container } from '@/src/core/di/container';
import { PRIMARY_ORANGE } from '@/src/design-system/tokens/colors';
import type { ChatSession } from '../../../domain/entities/ChatSession';
import { ChatSessionRow } from '../../components/ChatSessionRow/ChatSessionRow';
import { NewChatButton } from '../../components/NewChatButton/NewChatButton';
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
          <ChatSessionRow
            session={item}
            onPress={() => router.push(`/chat/${item.id}`)}
            onEdit={() => {
              setEditingSession(item);
              setTitleDraft(item.title);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No chat history for now</Text>
          </View>
        }
      />

      <NewChatButton onPress={() => router.push('/chat/new')} />

      <Modal visible={editingSession !== null} transparent animationType="fade" onRequestClose={() => setEditingSession(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename chat</Text>
            <TextInput
              style={styles.modalInput}
              value={titleDraft}
              onChangeText={setTitleDraft}
              placeholder="Enter chat title"
              placeholderTextColor="#6E6E6E"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setEditingSession(null)}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={async () => {
                  if (!editingSession) return;
                  const title = titleDraft.trim() || 'New Chat';
                  await container.chatRepository.updateSessionTitle(editingSession.id, title);
                  setEditingSession(null);
                  await loadHistory();
                }}
              >
                <Text style={styles.modalButtonPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
