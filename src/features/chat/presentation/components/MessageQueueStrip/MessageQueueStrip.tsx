import { INPUT_BOX_COLOR, PRIMARY_ORANGE, TEXT_WHITE_60, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { borderRadius, fontSizes, spacing, typography } from '@/src/design-system/tokens';
import { observer } from 'mobx-react-lite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { QueuedMessage } from '../../viewmodels/ChatViewModel';

const MAX_PREVIEW = 80;

export const MessageQueueStrip = observer(
  ({
    items,
    onRemove,
    onUpdate,
  }: {
    items: QueuedMessage[];
    onRemove: (id: string) => void;
    onUpdate: (id: string, text: string) => void;
  }) => {
    const [editing, setEditing] = useState<QueuedMessage | null>(null);
    const [draft, setDraft] = useState('');

    const openEdit = useCallback((q: QueuedMessage) => {
      setEditing(q);
      setDraft(q.text);
    }, []);

    const closeEdit = useCallback(() => {
      setEditing(null);
      setDraft('');
    }, []);

    const saveEdit = useCallback(() => {
      if (!editing) return;
      const t = draft.trim();
      if (!t) return;
      onUpdate(editing.id, t);
      closeEdit();
    }, [closeEdit, draft, editing, onUpdate]);

    const canSave = draft.trim().length > 0;

    if (items.length === 0) return null;

    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Queued</Text>
        {items.map((q) => {
          const preview =
            q.text.length > MAX_PREVIEW ? `${q.text.slice(0, MAX_PREVIEW)}…` : q.text;
          return (
            <View key={q.id} style={styles.row}>
              <Text style={styles.preview} numberOfLines={2}>
                {preview}
              </Text>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  onPress={() => openEdit(q)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Edit queued message"
                >
                  <SymbolView name="pencil" size={17} tintColor={TEXT_WHITE_60} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onRemove(q.id)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Remove from queue"
                >
                  <SymbolView name="xmark.circle.fill" size={18} tintColor={TEXT_WHITE_60} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <Modal
          visible={editing !== null}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={closeEdit}
        >
          <SafeAreaView style={styles.editScreen} edges={['top', 'left', 'right', 'bottom']}>
            <KeyboardAvoidingView style={styles.editKeyboard} behavior="padding">
              <View style={styles.editHeader}>
                <TouchableOpacity onPress={closeEdit} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cancel">
                  <Text style={styles.editHeaderCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.editHeaderTitle} numberOfLines={1}>
                  Edit queued message
                </Text>
                <TouchableOpacity
                  onPress={saveEdit}
                  disabled={!canSave}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                >
                  <Text style={[styles.editHeaderDone, !canSave && styles.editHeaderDoneDisabled]}>Done</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.editScroll}
                contentContainerStyle={styles.editScrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
                <TextInput
                  style={styles.editInput}
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  maxLength={8000}
                  placeholder="Message…"
                  placeholderTextColor={TEXT_WHITE_60}
                  autoFocus
                  textAlignVertical="top"
                />
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.md,
    paddingTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  label: {
    ...typography.caption.small,
    color: TEXT_WHITE_60,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.md,
  },
  preview: {
    ...typography.caption.medium,
    color: WHITE_PRIMARY,
    flex: 1,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editScreen: {
    flex: 1,
    backgroundColor: INPUT_BOX_COLOR,
  },
  editKeyboard: {
    flex: 1,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  editHeaderCancel: {
    ...typography.body.medium,
    color: TEXT_WHITE_60,
    minWidth: 64,
  },
  editHeaderTitle: {
    ...typography.body.medium,
    color: WHITE_PRIMARY,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  editHeaderDone: {
    ...typography.body.medium,
    color: PRIMARY_ORANGE,
    fontWeight: '600',
    minWidth: 64,
    textAlign: 'right',
  },
  editHeaderDoneDisabled: {
    opacity: 0.4,
  },
  editScroll: {
    flex: 1,
  },
  editScrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  editInput: {
    ...typography.body.default,
    color: WHITE_PRIMARY,
    minHeight: 280,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    lineHeight: fontSizes.md * 1.45,
  },
});
