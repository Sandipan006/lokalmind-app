import { Text, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { ChatSession } from '../../../domain/entities/ChatSession';
import { styles } from './ChatSessionRowStyles';
import { editTitleSvg } from '../../../assets/svgs';

interface ChatSessionRowProps {
  session: ChatSession;
  onPress: () => void;
  onEdit: () => void;
}

export function ChatSessionRow({ session, onPress, onEdit }: ChatSessionRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>{session.title}</Text>
        <TouchableOpacity onPress={onEdit} style={styles.editButton} hitSlop={6}>
          <SvgXml xml={editTitleSvg} width={16} height={16} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
