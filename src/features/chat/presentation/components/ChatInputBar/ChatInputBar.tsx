import { GlassSurface } from '@/src/design-system/components';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { dropdownChevronSvg, sendMessageSvg } from '../../../assets/svgs';
import { CHAT_MODE_LABELS, type ChatMode } from '../../../domain/entities/ChatMode';
import { styles, TEXT_INPUT_PLACEHOLDER_COLOR } from './ChatInputBarStyles';

interface ChatInputBarProps {
  inputText: string;
  isStreaming: boolean;
  canSend: boolean;
  selectedMode: ChatMode;
  onChangeText: (text: string) => void;
  onModePress: () => void;
  onSend: () => void;
  onStop: () => void;
}

export function ChatInputBar({
  inputText,
  isStreaming,
  canSend,
  selectedMode,
  onChangeText,
  onModePress,
  onSend,
  onStop,
}: ChatInputBarProps) {
  const insets = useSafeAreaInsets();
  const [inputHeight, setInputHeight] = useState<number>(24);
  const maxTextInputHeight = 108;

  return (
    <View style={[styles.inputBar, { paddingBottom: Math.max((styles.inputBar.paddingBottom ?? 0) as number, insets.bottom) }]}>
      <GlassSurface tier="medium" style={styles.inputGlass}>
        <View style={styles.inputInner}>
          <TextInput
            style={[styles.textInput, { height: inputHeight }]}
            placeholder="Message LokalMind…"
            placeholderTextColor={TEXT_INPUT_PLACEHOLDER_COLOR}
            value={inputText}
            onChangeText={onChangeText}
            multiline
            returnKeyType="default"
            editable={!isStreaming}
            textAlignVertical="top"
            scrollEnabled={inputHeight >= maxTextInputHeight}
            onContentSizeChange={(event) => {
              const contentHeight = event.nativeEvent.contentSize.height;
              const nextHeight = Math.min(maxTextInputHeight, Math.max(24, contentHeight));
              setInputHeight(nextHeight);
            }}
          />

          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.modeButton} onPress={onModePress} activeOpacity={0.8}>
              <Text style={styles.modeButtonText}>{CHAT_MODE_LABELS[selectedMode]}</Text>
              <SvgXml xml={dropdownChevronSvg} width={14} height={14} />
            </TouchableOpacity>

            {isStreaming ? (
              <TouchableOpacity style={styles.stopButton} onPress={onStop} activeOpacity={0.7}>
                <View style={styles.stopSquare} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                onPress={onSend}
                disabled={!canSend}
                activeOpacity={0.8}
              >
                <SvgXml xml={sendMessageSvg} width={18} height={18} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </GlassSurface>
    </View>
  );
}
