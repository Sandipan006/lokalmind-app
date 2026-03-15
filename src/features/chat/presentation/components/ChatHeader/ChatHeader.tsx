import { Text, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { GlassSurface } from '@/src/design-system/components';
import { dropdownChevronSvg, newChatPlusSvg } from '../../../assets/svgs';
import { styles } from './ChatHeaderStyles';

interface ChatHeaderProps {
  modelName: string | undefined;
  onBack: () => void;
  onNewChat: () => void;
}

export function ChatHeader({ modelName, onBack, onNewChat }: ChatHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={8}>
        <View style={styles.backIconSvg}>
          <SvgXml xml={dropdownChevronSvg} width={20} height={20} />
        </View>
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <GlassSurface tier="medium" style={styles.headerModelCapsule}>
          <TouchableOpacity style={styles.headerModelButton} activeOpacity={0.8}>
            <Text style={styles.headerModelName} numberOfLines={1}>
              {modelName ?? 'LokalMind'}
            </Text>
            <View style={styles.headerModelChevron}>
              <SvgXml xml={dropdownChevronSvg} width={14} height={14} />
            </View>
          </TouchableOpacity>
        </GlassSurface>
      </View>

      <GlassSurface tier="medium" style={styles.headerNewChatCapsule}>
        <TouchableOpacity style={styles.headerNewChatButton} onPress={onNewChat} activeOpacity={0.8}>
          <View style={styles.headerNewChatIcon}>
            <SvgXml xml={newChatPlusSvg} width={16} height={16} />
          </View>
          <Text style={styles.headerNewChatText}>New</Text>
        </TouchableOpacity>
      </GlassSurface>
    </View>
  );
}
