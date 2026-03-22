import { GlassSurface } from '@/src/design-system/components';
import { TEXT_WHITE_40, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
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
  /** When false (e.g. no GGUF on device), composer is read-only. */
  inputEnabled?: boolean;
  selectedMode: ChatMode;
  isEditMode?: boolean;
  onChangeText: (text: string) => void;
  onSelectMode: (mode: ChatMode) => void;
  onSend: () => void;
  onStop: () => void;
  onCancelEdit?: () => void;
}

export function ChatInputBar({
  inputText,
  isStreaming,
  canSend,
  inputEnabled = true,
  selectedMode,
  isEditMode = false,
  onChangeText,
  onSelectMode,
  onSend,
  onStop,
  onCancelEdit,
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

  const composerLocked = !inputEnabled;

  return (
    <View style={[styles.inputBar, { paddingBottom: Math.max((styles.inputBar.paddingBottom ?? 0) as number, insets.bottom) }]}>
      {isEditMode && (
        <View style={styles.editBanner}>
          <SymbolView name="pencil" size={13} tintColor={WHITE_PRIMARY} style={styles.editBannerIcon} />
          <Text style={styles.editBannerText}>Editing message</Text>
          <TouchableOpacity onPress={onCancelEdit} hitSlop={12} style={styles.editBannerCancel}>
            <SymbolView name="xmark" size={13} tintColor={WHITE_PRIMARY} />
          </TouchableOpacity>
        </View>
      )}
      <GlassSurface tier="medium" style={[styles.inputGlass, composerLocked && styles.inputGlassDisabled]}>
        <View style={styles.inputInner}>
          <TextInput
            style={[styles.textInput, { minHeight: inputHeight }]}
            placeholder={composerLocked ? 'Download a model to send messages…' : 'ask LokalMind…'}
            placeholderTextColor={TEXT_INPUT_PLACEHOLDER_COLOR}
            value={inputText}
            onChangeText={onChangeText}
            multiline
            returnKeyType="default"
            editable={inputEnabled && !isStreaming}
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
            <TouchableOpacity
              style={[styles.modeButton, composerLocked && styles.modeButtonDisabled]}
              onPress={handleModeButtonPress}
              disabled={composerLocked}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeButtonText, composerLocked && styles.modeButtonTextDisabled]}>
                {CHAT_MODE_LABELS[selectedMode]}
              </Text>
              <SymbolView name="chevron.down" size={12} tintColor={composerLocked ? TEXT_WHITE_40 : WHITE_PRIMARY} />
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
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Mode</Text>
              <TouchableOpacity
                style={styles.modalDismissButton}
                onPress={() => setIsModeModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <SymbolView name="xmark" size={18} tintColor={WHITE_PRIMARY} />
              </TouchableOpacity>
            </View>
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
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
