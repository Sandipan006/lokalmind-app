import { container } from '@/src/core/di/container';
import { GlassSurface } from '@/src/design-system/components';
import {
  BLACK_PRIMARY,
  ERROR_RED,
  PRIMARY_ORANGE,
  TEXT_WHITE_40,
  TEXT_WHITE_60,
  WHITE_PRIMARY,
} from '@/src/design-system/tokens/colors';
import { borderRadius, spacing } from '@/src/design-system/tokens';
import { fontSizes, fonts } from '@/src/design-system/tokens/typography';
import { MemoryViewModel } from '../../viewmodels/MemoryViewModel';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PINNED_FACTS_MAX = 800;

function formatDaysAgo(createdAt: number): string {
  const days = Math.floor((Date.now() - createdAt) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1w ago' : `${weeks}w ago`;
}

const MemoryCard = observer(({
  memory,
  onTogglePin,
  onDelete,
}: {
  memory: {
    id: string;
    summary: string;
    isPinned: boolean;
    isUserEdited: boolean;
    createdAt: number;
    sessionTitle: string;
  };
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const header = `${formatDaysAgo(memory.createdAt)} · ${memory.sessionTitle}`;

  return (
    <GlassSurface tier="medium" style={styles.card}>
      <Pressable
        style={styles.cardHeader}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`${header}, tap to ${expanded ? 'collapse' : 'expand'}`}
      >
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle} numberOfLines={expanded ? undefined : 1}>{header}</Text>
          {memory.isUserEdited && (
            <Text style={styles.editedLabel}>You edited this</Text>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => onTogglePin(memory.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={memory.isPinned ? 'Unpin memory' : 'Pin memory'}
          >
            <SymbolView
              name={memory.isPinned ? 'pin.fill' : 'pin'}
              size={16}
              tintColor={memory.isPinned ? PRIMARY_ORANGE : TEXT_WHITE_40}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => onDelete(memory.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Delete memory"
          >
            <SymbolView name="trash" size={16} tintColor={ERROR_RED} />
          </TouchableOpacity>
        </View>
      </Pressable>
      {expanded && (
        <View style={styles.cardBody}>
          <Text style={styles.summaryText}>{memory.summary}</Text>
        </View>
      )}
    </GlassSurface>
  );
});

export const MemoryScreen = observer(() => {
  const router = useRouter();
  const viewModel = useRef(
    new MemoryViewModel(
      container.memoryRepository,
      container.memoryService,
      container.getPinnedFactsUseCase,
      container.savePinnedFactsUseCase,
      container.appSettingsRepository,
    ),
  ).current;

  const [localFacts, setLocalFacts] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await container.initializeContainer();
      if (mounted) {
        await viewModel.load();
        if (mounted) {
          setLocalFacts(viewModel.pinnedFacts);
        }
      }
    })();
    return () => { mounted = false; };
  }, [viewModel]);

  useEffect(() => {
    setLocalFacts(viewModel.pinnedFacts);
  }, [viewModel.pinnedFacts]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const handleFactsBlur = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void viewModel.savePinnedFacts(localFacts);
    }, 500);
  }, [localFacts, viewModel]);

  const confirmDelete = useCallback((id: string) => {
    Alert.alert(
      'Delete memory?',
      'This memory will be permanently removed. The chat it came from is unaffected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { void viewModel.deleteMemory(id); },
        },
      ],
    );
  }, [viewModel]);

  const handleTogglePin = useCallback((id: string) => {
    void viewModel.togglePin(id);
  }, [viewModel]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.flex}>
        <View style={styles.headerRow}>
          <GlassSurface tier="light" style={styles.headerBackGlass}>
            <TouchableOpacity
              style={styles.headerBackInner}
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <SymbolView name="chevron.left" size={18} tintColor={TEXT_WHITE_40} />
            </TouchableOpacity>
          </GlassSurface>
          <Text style={styles.headerTitle}>Memory</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Pinned facts */}
          <Text style={styles.sectionLabel}>Pinned facts</Text>
          <GlassSurface tier="medium" style={styles.card}>
            <View style={styles.factsContainer}>
              <View style={styles.factsHeader}>
                <Text style={styles.factsSubtitle}>
                  Things LokalMind always knows about you.
                </Text>
                <Text style={styles.factsCounter}>{localFacts.length}/{PINNED_FACTS_MAX}</Text>
              </View>
              <TextInput
                style={styles.factsInput}
                value={localFacts}
                onChangeText={(t) => setLocalFacts(t.slice(0, PINNED_FACTS_MAX))}
                onBlur={handleFactsBlur}
                placeholder="Your name, language, preferences…"
                placeholderTextColor={TEXT_WHITE_40}
                multiline
                maxLength={PINNED_FACTS_MAX}
                returnKeyType="default"
                blurOnSubmit={false}
                accessibilityLabel="Pinned facts about you"
              />
            </View>
          </GlassSurface>

          {/* Learned profile */}
          <Text style={styles.sectionLabel}>Learned profile</Text>
          <GlassSurface tier="medium" style={styles.card}>
            <View style={styles.factsContainer}>
              <Text style={styles.factsSubtitle}>
                What LokalMind has learned about you from your conversations.
              </Text>
              {viewModel.userProfile.trim() ? (
                <Text style={styles.summaryText}>{viewModel.userProfile}</Text>
              ) : (
                <Text style={[styles.summaryText, { color: TEXT_WHITE_40 }]}>
                  Nothing learned yet. Tell LokalMind about yourself in a chat.
                </Text>
              )}
            </View>
          </GlassSurface>

          {/* Past conversations */}
          <Text style={styles.sectionLabel}>Past conversations</Text>

          {viewModel.isLoading ? (
            <Text style={styles.emptyText}>Loading…</Text>
          ) : viewModel.memories.length === 0 ? (
            <Text style={styles.emptyText}>
              No memories yet. LokalMind remembers things as you chat.
            </Text>
          ) : (
            viewModel.memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onTogglePin={handleTogglePin}
                onDelete={confirmDelete}
              />
            ))
          )}

          {viewModel.error != null && (
            <Text style={styles.errorText}>{viewModel.error}</Text>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BLACK_PRIMARY,
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  headerBackGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: { borderCurve: 'continuous' as const },
      default: {},
    }),
  },
  headerBackInner: {
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.md,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.semiBold,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    color: TEXT_WHITE_40,
    fontFamily: fonts.figtree.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        borderRadius: borderRadius.lg,
        borderCurve: 'continuous' as const,
      },
      android: {
        borderRadius: borderRadius.lg,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: spacing.xxs,
  },
  cardTitle: {
    fontSize: fontSizes.sm,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.semiBold,
    lineHeight: fontSizes.sm * 1.4,
  },
  editedLabel: {
    fontSize: fontSizes.xs,
    color: TEXT_WHITE_40,
    fontFamily: fonts.figtree.regular,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  iconButton: {
    padding: spacing.xxs,
  },
  cardBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  summaryText: {
    fontSize: fontSizes.sm,
    color: TEXT_WHITE_60,
    fontFamily: fonts.figtree.regular,
    lineHeight: fontSizes.sm * 1.5,
  },
  factsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  factsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factsSubtitle: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: TEXT_WHITE_60,
    fontFamily: fonts.figtree.regular,
  },
  factsCounter: {
    fontSize: fontSizes.xs,
    color: TEXT_WHITE_40,
    fontFamily: fonts.figtree.regular,
  },
  factsInput: {
    fontSize: fontSizes.sm,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.regular,
    lineHeight: fontSizes.sm * 1.5,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: TEXT_WHITE_40,
    fontFamily: fonts.figtree.regular,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: fontSizes.sm * 1.5,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: ERROR_RED,
    fontFamily: fonts.figtree.regular,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
