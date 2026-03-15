import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TEXT_WHITE_40 } from '@/src/design-system/tokens/colors';
import { styles } from './RenameChatModalStyles';

interface RenameChatModalProps {
  visible: boolean;
  titleDraft: string;
  onChangeTitle: (value: string) => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
}

export function RenameChatModal({
  visible,
  titleDraft,
  onChangeTitle,
  onCancel,
  onSave,
}: RenameChatModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Rename chat</Text>
          <TextInput
            style={styles.modalInput}
            value={titleDraft}
            onChangeText={onChangeTitle}
            placeholder="Enter chat title"
            placeholderTextColor={TEXT_WHITE_40}
            autoFocus
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalButtonSecondary} onPress={onCancel}>
              <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButtonPrimary} onPress={onSave}>
              <Text style={styles.modalButtonPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
