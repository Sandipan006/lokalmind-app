import { Text, TouchableOpacity, View } from 'react-native';
import type { ChatSession } from '../../../domain/entities/ChatSession';
import { styles } from './ChatSessionRowStyles';

interface ChatSessionRowProps {
  session: ChatSession;
  onPress: () => void;
  subtitle?: string;
  plain?: boolean;
  highlightQuery?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedText(
  text: string,
  query: string | undefined,
  baseStyle: object,
  highlightStyle: object,
  numberOfLines: number
) {
  const normalizedQuery = query?.trim() ?? '';
  if (!normalizedQuery) {
    return (
      <Text style={baseStyle} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const splitRegex = new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'ig');
  const parts = text.split(splitRegex);

  return (
    <Text style={baseStyle} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === normalizedQuery.toLowerCase();
        return (
          <Text key={`${part}-${index}`} style={isMatch ? highlightStyle : baseStyle}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

export function ChatSessionRow({
  session,
  onPress,
  subtitle,
  plain = false,
  highlightQuery,
}: ChatSessionRowProps) {
  return (
    <TouchableOpacity style={[styles.row, plain ? styles.rowPlain : null]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        {renderHighlightedText(
          session.title,
          highlightQuery,
          plain ? styles.titleMuted : styles.title,
          styles.highlightText,
          1
        )}
      </View>
      {subtitle ? (
        renderHighlightedText(
          subtitle,
          highlightQuery,
          plain ? styles.subtitleMuted : styles.subtitle,
          styles.highlightText,
          1
        )
      ) : null}
    </TouchableOpacity>
  );
}
