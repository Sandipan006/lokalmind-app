import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { container } from '@/src/core/di/container';
import { PRIMARY_ORANGE, TEXT_WHITE_60 } from '@/src/design-system/tokens/colors';
import { GlassSurface } from '@/src/design-system/components';
import { spacing } from '@/src/design-system/tokens/spacing';
import type { ChatSession } from '../../../domain/entities/ChatSession';
import type { ChatMessage } from '../../../domain/entities/ChatMessage';
import { SearchChatsUseCase } from '../../../domain/usecases/SearchChatsUseCase';
import { ChatSessionRow } from '../../components/ChatSessionRow/ChatSessionRow';
import { styles } from './ChatSearchScreenStyles';

export function ChatSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ChatSession[]>([]);
  const [messagePreviewBySession, setMessagePreviewBySession] = useState<Record<string, string>>({});
  const [hasSearched, setHasSearched] = useState(false);

  const searchUseCase = new SearchChatsUseCase(container.chatRepository);

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
  }, []);

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
              <ChatSessionRow
                session={item}
                onPress={() => router.push(`/chat/${item.id}`)}
                plain
                highlightQuery={query}
                {...(subtitle ? { subtitle } : {})}
              />
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
    </SafeAreaView>
  );
}
