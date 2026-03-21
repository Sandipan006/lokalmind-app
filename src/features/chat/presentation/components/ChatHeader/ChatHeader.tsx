import { GlassSurface } from '@/src/design-system/components';
import { PRIMARY_ORANGE, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { SymbolView } from 'expo-symbols';
import type { Model } from '@/src/features/models/domain/entities/Model';
import { dropdownChevronSvg, newChatPlusSvg } from '../../../assets/svgs';
import { styles as modalStyles } from '../ChatInputBar/ChatInputBarStyles';
import { styles } from './ChatHeaderStyles';

interface ChatHeaderProps {
  hasDownloadedModel: boolean;
  modelName: string | undefined;
  /** Models for picker; loaded when opening the modal. */
  pickerModels: Model[];
  onRequestPickerModels: () => void;
  currentModelId: string | undefined;
  onGoToModels: () => void;
  /** Switch active model for this chat (downloaded models only). */
  onSelectDownloadedModel: (modelId: string) => void;
  onBack: () => void;
  onNewChat: () => void;
  onDownloadModelPress: () => void;
}

export function ChatHeader({
  hasDownloadedModel,
  modelName,
  pickerModels,
  onRequestPickerModels,
  currentModelId,
  onGoToModels,
  onSelectDownloadedModel,
  onBack,
  onNewChat,
  onDownloadModelPress,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();
  const [isModelModalVisible, setIsModelModalVisible] = useState(false);

  const downloaded = useMemo(
    () => pickerModels.filter((m) => m.isDownloaded),
    [pickerModels],
  );
  const notOnDevice = useMemo(
    () => pickerModels.filter((m) => !m.isDownloaded),
    [pickerModels],
  );

  const openModelModal = () => {
    setIsModelModalVisible(true);
    onRequestPickerModels();
  };

  const handleGoToModels = () => {
    setIsModelModalVisible(false);
    onGoToModels();
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={8}>
        <View style={styles.backIconSvg}>
          <SvgXml xml={dropdownChevronSvg} width={20} height={20} />
        </View>
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <GlassSurface tier="medium" style={styles.headerModelCapsule}>
          {hasDownloadedModel ? (
            <TouchableOpacity style={styles.headerModelButton} onPress={openModelModal} activeOpacity={0.8}>
              <Text style={styles.headerModelName} numberOfLines={1}>
                {modelName ?? 'LokalMind'}
              </Text>
              <View style={styles.headerModelChevron}>
                <SvgXml xml={dropdownChevronSvg} width={14} height={14} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.headerModelButton}
              onPress={onDownloadModelPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Download a model"
            >
              <Text style={styles.headerDownloadCta} numberOfLines={1}>
                Download a model
              </Text>
              <SymbolView name="arrow.right.circle.fill" size={16} tintColor={PRIMARY_ORANGE} />
            </TouchableOpacity>
          )}
        </GlassSurface>
      </View>

      <GlassSurface tier="medium" style={styles.headerNewChatCapsule}>
        <TouchableOpacity
          style={[styles.headerNewChatButton, !hasDownloadedModel && styles.headerNewChatButtonDisabled]}
          onPress={onNewChat}
          disabled={!hasDownloadedModel}
          activeOpacity={0.8}
        >
          <View style={styles.headerNewChatIcon}>
            <SvgXml xml={newChatPlusSvg} width={16} height={16} />
          </View>
          <Text style={[styles.headerNewChatText, !hasDownloadedModel && styles.headerNewChatTextDisabled]}>
            New
          </Text>
        </TouchableOpacity>
      </GlassSurface>

      <Modal
        transparent
        visible={isModelModalVisible}
        animationType="slide"
        onRequestClose={() => setIsModelModalVisible(false)}
      >
        <Pressable style={modalStyles.modalBackdrop} onPress={() => setIsModelModalVisible(false)}>
          <Pressable
            style={[modalStyles.modalSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
            onPress={() => undefined}
          >
            <View style={modalStyles.modalHeaderRow}>
              <Text style={modalStyles.modalTitle}>Select model</Text>
              <TouchableOpacity
                style={modalStyles.modalDismissButton}
                onPress={() => setIsModelModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <SymbolView name="xmark" size={18} tintColor={WHITE_PRIMARY} />
              </TouchableOpacity>
            </View>

            <View style={modalStyles.modalSheetBody}>
              <View style={modalStyles.modalSectionBlock}>
                <Text style={modalStyles.modalSectionTitle}>Downloaded</Text>
                {downloaded.length === 0 ? (
                  <Text style={modalStyles.modalHelperText}>None yet — choose a model under Other models.</Text>
                ) : (
                  downloaded.map((model) => {
                    const isCurrent = model.id === currentModelId;
                    return (
                      <TouchableOpacity
                        key={model.id}
                        style={[modalStyles.modalOption, isCurrent && modalStyles.modalOptionSelected]}
                        onPress={() => {
                          onSelectDownloadedModel(model.id);
                          setIsModelModalVisible(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[modalStyles.modalOptionText, { flex: 1 }]} numberOfLines={1}>
                          {model.displayName}
                        </Text>
                        {isCurrent ? <View style={modalStyles.modalOptionDot} /> : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <View style={modalStyles.modalSectionBlock}>
                <Text style={modalStyles.modalSectionTitle}>Other models</Text>
                {notOnDevice.length === 0 ? (
                  <Text style={modalStyles.modalHelperText}>Everything in the catalog is downloaded.</Text>
                ) : (
                  <>
                    {notOnDevice.map((model) => (
                      <TouchableOpacity
                        key={model.id}
                        style={modalStyles.modalOption}
                        onPress={handleGoToModels}
                        activeOpacity={0.8}
                      >
                        <Text style={[modalStyles.modalOptionText, { flex: 1 }]} numberOfLines={1}>
                          {model.displayName}
                        </Text>
                        <SymbolView name="chevron.right" size={14} tintColor={PRIMARY_ORANGE} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
