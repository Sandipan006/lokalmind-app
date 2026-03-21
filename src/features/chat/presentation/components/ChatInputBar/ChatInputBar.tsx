import { GlassSurface } from '@/src/design-system/components';
import { WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { sendMessageSvg } from '../../../assets/svgs';
import { CHAT_MODE_LABELS, CHAT_MODES, type ChatMode } from '../../../domain/entities/ChatMode';
import { styles, TEXT_INPUT_PLACEHOLDER_COLOR } from './ChatInputBarStyles';

interface ChatInputBarProps {
  inputText: string;
  isStreaming: boolean;
  canSend: boolean;
  selectedMode: ChatMode;
  onChangeText: (text: string) => void;
  onSelectMode: (mode: ChatMode) => void;
  onSend: () => void;
  onStop: () => void;
}

export function ChatInputBar({
  inputText,
  isStreaming,
  canSend,
  selectedMode,
  onChangeText,
  onSelectMode,
  onSend,
  onStop,
}: ChatInputBarProps) {
  const insets = useSafeAreaInsets();
  const minTextInputHeight = 24;
  const maxTextInputHeight = 108;
  const [inputHeight, setInputHeight] = useState<number>(minTextInputHeight);
  const [isModeModalVisible, setIsModeModalVisible] = useState(false);

  const handleModeButtonPress = () => {
    setIsModeModalVisible(true);
  };

  const handleModeSelect = (mode: ChatMode) => {
    onSelectMode(mode);
    setIsModeModalVisible(false);
  };

  useEffect(() => {
    if (inputText.length === 0 && inputHeight !== minTextInputHeight) {
      setInputHeight(minTextInputHeight);
    }
  }, [inputHeight, inputText, minTextInputHeight]);

  return (
    <View style={[styles.inputBar, { paddingBottom: Math.max((styles.inputBar.paddingBottom ?? 0) as number, insets.bottom) }]}>
      <GlassSurface tier="medium" style={styles.inputGlass}>
        <View style={styles.inputInner}>
          <TextInput
            style={[styles.textInput, { minHeight: inputHeight }]}
            placeholder="ask LokalMind…"
            placeholderTextColor={TEXT_INPUT_PLACEHOLDER_COLOR}
            value={inputText}
            onChangeText={onChangeText}
            multiline
            returnKeyType="default"
            editable={!isStreaming}
            textAlignVertical="top"
            underlineColorAndroid="transparent"
            scrollEnabled={inputHeight >= maxTextInputHeight}
            onContentSizeChange={(event) => {
              const contentHeight = Math.ceil(event.nativeEvent.contentSize.height);
              const nextHeight = Math.min(maxTextInputHeight, Math.max(minTextInputHeight, contentHeight));
              if (Math.abs(nextHeight - inputHeight) > 1) {
                setInputHeight(nextHeight);
              }
            }}
          />

          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.modeButton} onPress={handleModeButtonPress} activeOpacity={0.8}>
              <Text style={styles.modeButtonText}>{CHAT_MODE_LABELS[selectedMode]}</Text>
              <SymbolView name="chevron.down" size={12} tintColor={WHITE_PRIMARY} />
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

      <Modal
        transparent
        visible={isModeModalVisible}
        animationType="slide"
        onRequestClose={() => setIsModeModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsModeModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 12) }]} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Select Mode</Text>
            {CHAT_MODES.map((mode) => {
              const isSelected = mode === selectedMode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                  onPress={() => handleModeSelect(mode)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionText}>{CHAT_MODE_LABELS[mode]}</Text>
                  {isSelected ? <View style={styles.modalOptionDot} /> : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsModeModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
