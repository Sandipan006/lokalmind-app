import { WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { SymbolView } from 'expo-symbols';
import { Text, TouchableOpacity, View } from 'react-native';
import type { MessageReplyDraft } from '../../../domain/utils/messageReply';
import { renderInlineMarkdown, type InlineMarkdownStyleSet } from '../MessageRenderer/MessageRenderer';
import { styles } from './ReplyDraftBannerStyles';

const replyPreviewInlineMarkdown: InlineMarkdownStyleSet = {
  bold: styles.previewBold,
  italic: styles.previewItalic,
};

export interface ReplyDraftBannerProps {
  replyDraft: MessageReplyDraft;
  onDismiss?: () => void;
}

export function ReplyDraftBanner({ replyDraft, onDismiss }: ReplyDraftBannerProps) {
  const label = replyDraft.replyToRole === 'assistant' ? 'Assistant' : 'You';

  return (
    <View style={styles.container}>
      <View style={styles.accent} />
      <View style={styles.main}>
        <View style={styles.headerRow}>
          <Text style={styles.label} numberOfLines={1}>
            Replying to {label}
          </Text>
          <TouchableOpacity
            onPress={() => onDismiss?.()}
            hitSlop={12}
            style={styles.dismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss reply"
          >
            <SymbolView name="xmark" size={14} tintColor={WHITE_PRIMARY} />
          </TouchableOpacity>
        </View>
        <Text style={styles.preview} numberOfLines={2} ellipsizeMode="tail">
          {renderInlineMarkdown(replyDraft.replyPreview, 'rprev', replyPreviewInlineMarkdown)}
        </Text>
      </View>
    </View>
  );
}
