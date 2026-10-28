import { container } from '@/src/core/di/container';
import { GlassSurface } from '@/src/design-system/components';
import { PRIMARY_ORANGE, TEXT_WHITE_60 } from '@/src/design-system/tokens/colors';
import { spacing } from '@/src/design-system/tokens/spacing';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatMessage } from '../../../domain/entities/ChatMessage';
import type { ChatSession } from '../../../domain/entities/ChatSession';
import { SearchChatsUseCase } from '../../../domain/usecases/SearchChatsUseCase';
import { ChatSessionRow } from '../../components/ChatSessionRow/ChatSessionRow';
import { RenameChatModal } from '../../components/RenameChatModal/RenameChatModal';
import { styles } from './ChatSearchScreenStyles';

export function ChatSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ChatSession[]>([]);
  const [messagePreviewBySession, setMessagePreviewBySession] = useState<Record<string, string>>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [editingSession, setEditingSession] = useState<ChatSession | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  const searchUseCase = useMemo(() => new SearchChatsUseCase(container.chatRepository), []);

  const handleSearch = useCallback(async (searchQuery: string) => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const result = await searchUseCase.execute(searchQuery);
      const sessions = result.success ? result.data : [];
      setResults(sessions);

      const previews = await Promise.all(
        sessions.map(async (session) => {
          const messagesResult = await container.chatRepository.getMessages(session.id);
          if (!messagesResult.success || messagesResult.data.length === 0) {
            return [session.id, ''] as const;
          }

          const normalizedQuery = searchQuery.trim().toLowerCase();
          const matchedMessage = messagesResult.data.find((message: ChatMessage) =>
            message.content.toLowerCase().includes(normalizedQuery)
          );
          const fallbackMessage = messagesResult.data[messagesResult.data.length - 1];
          const preview = (matchedMessage ?? fallbackMessage)?.content?.trim() ?? '';
          return [session.id, preview] as const;
        })
      );

      setMessagePreviewBySession(Object.fromEntries(previews));
    } finally {
      setIsSearching(false);
    }
  }, [searchUseCase]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    if (text.trim()) {
      handleSearch(text);
    } else {
      setResults([]);
      setMessagePreviewBySession({});
      setHasSearched(false);
    }
  }, [handleSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setMessagePreviewBySession({});
    setHasSearched(false);
  }, []);

  const handleSaveTitle = useCallback(async () => {
    if (!editingSession) return;
    const title = titleDraft.trim() || 'New Chat';
    await container.chatRepository.updateSessionTitle(editingSession.id, title);
    setEditingSession(null);
    await handleSearch(query);
  }, [editingSession, handleSearch, query, titleDraft]);

  const handleDeleteSession = useCallback((session: ChatSession) => {
    Alert.alert(
      'Delete chat?',
      'This chat and all messages will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await container.chatRepository.deleteSession(session.id);
            await handleSearch(query);
          },
        },
      ],
    );
  }, [handleSearch, query]);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.headerRow}>
          <GlassSurface tier="medium" style={styles.searchInputContainer}>
            <SymbolView name="magnifyingglass" size={17} tintColor={TEXT_WHITE_60} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search chats by name or message..."
              placeholderTextColor="#6E6E6E"
              value={query}
              onChangeText={handleChangeText}
              autoFocus
              returnKeyType="search"
            />
            {query.trim().length > 0 ? (
              <TouchableOpacity onPress={clearSearch} hitSlop={8}>
                <SymbolView name="xmark.circle.fill" size={18} tintColor={TEXT_WHITE_60} />
              </TouchableOpacity>
            ) : null}
          </GlassSurface>

          <GlassSurface tier="medium" style={styles.closeButtonSurface}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <SymbolView name="xmark" size={18} tintColor={TEXT_WHITE_60} />
            </TouchableOpacity>
          </GlassSurface>
        </View>
      </View>

      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={PRIMARY_ORANGE} />
        </View>
      )}

      {!isSearching && hasSearched && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const subtitle = messagePreviewBySession[item.id];
            return (
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
                      <SymbolView name="pencil" size={16} tintColor={TEXT_WHITE_60} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.swipeActionButton, styles.deleteActionButton]}
                      onPress={() => handleDeleteSession(item)}
                      activeOpacity={0.8}
                    >
                      <SymbolView name="trash" size={16} tintColor={TEXT_WHITE_60} />
                    </TouchableOpacity>
                  </View>
                )}
              >
                <ChatSessionRow
                  session={item}
                  onPress={() => router.push(`/chat/${item.id}`)}
                  plain
                  highlightQuery={query}
                  {...(subtitle ? { subtitle } : {})}
                />
              </Swipeable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No chats found</Text>
            </View>
          }
        />
      )}

      {!hasSearched && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Search your chat history</Text>
        </View>
      )}

      <RenameChatModal
        visible={editingSession !== null}
        titleDraft={titleDraft}
        onChangeTitle={setTitleDraft}
        onCancel={() => setEditingSession(null)}
        onSave={handleSaveTitle}
      />
    </SafeAreaView>
  );
}
