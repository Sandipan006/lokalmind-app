import { container } from '@/src/core/di/container';
import { GlassSurface } from '@/src/design-system/components';
import { TEXT_WHITE_40, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { CHAT_MODE_LABELS } from '@/src/features/chat/domain/entities/ChatMode';
import { GetModeSystemPromptOverrideUseCase } from '@/src/features/profile/domain/usecases/GetModeSystemPromptOverrideUseCase';
import { SaveModeSystemPromptOverrideUseCase } from '@/src/features/profile/domain/usecases/SaveModeSystemPromptOverrideUseCase';
import { ModeSystemPromptsViewModel } from '@/src/features/profile/presentation/viewmodels/ModeSystemPromptsViewModel';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './ModeSystemPromptsScreenStyles';

export const ModeSystemPromptsScreen = observer(() => {
  const router = useRouter();
  const viewModel = useRef(
    new ModeSystemPromptsViewModel(
      new GetModeSystemPromptOverrideUseCase(container.appSettingsRepository),
      new SaveModeSystemPromptOverrideUseCase(container.appSettingsRepository),
    ),
  ).current;

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await container.initializeContainer();
      if (mounted) {
        await viewModel.loadInitial();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [viewModel]);

  const defaultPlaceholder = viewModel.defaultPromptFor(viewModel.selectedMode);
  const saveDisabled = !viewModel.canSave || viewModel.isSaving;
  const saveShowsSaved = viewModel.saveButtonLabel === 'Saved';
  const savePrimary = viewModel.canSave || viewModel.isSaving;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <View style={styles.headerRow}>
          <GlassSurface tier="light" style={styles.headerBackGlass}>
            <TouchableOpacity
              style={styles.headerBackInner}
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <SymbolView name="chevron.left" size={18} tintColor={TEXT_WHITE_40} />
            </TouchableOpacity>
          </GlassSurface>
          <Text style={styles.headerTitle}>System prompts</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GlassSurface tier="light" style={styles.introGlass}>
            <View style={styles.introInner}>
              <Text style={styles.intro}>
                Customize the system prompt for each mode. Leave blank to use the default.
              </Text>
            </View>
          </GlassSurface>

          <ScrollView
            horizontal
            nestedScrollEnabled
            style={styles.modeScroll}
            contentContainerStyle={styles.modeScrollContent}
            showsHorizontalScrollIndicator={false}
          >
            {viewModel.modes.map((mode) => {
              const selected = viewModel.selectedMode === mode;
              return (
                <GlassSurface
                  key={mode}
                  tier={selected ? 'heavy' : 'light'}
                  tint={selected ? 'brand' : 'default'}
                  style={styles.modeChipGlass}
                >
                  <TouchableOpacity
                    style={styles.modeChipInner}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      void viewModel.selectMode(mode);
                    }}
                    disabled={viewModel.isSaving}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modeChipLabel, selected && styles.modeChipLabelSelected]}>
                      {CHAT_MODE_LABELS[mode]}
                    </Text>
                  </TouchableOpacity>
                </GlassSurface>
              );
            })}
          </ScrollView>

          <GlassSurface tier="ultra" style={styles.editorGlass}>
            <View style={styles.editorInner}>
              <View style={styles.editorHeaderRow}>
                <View style={styles.editorTitleBlock}>
                  <Text style={styles.editorLabel}>System prompt</Text>
                  <Text style={styles.editorModeTitle}>{CHAT_MODE_LABELS[viewModel.selectedMode]}</Text>
                </View>
                {!viewModel.isLoadingDraft ? (
                  <View style={styles.editorActionsRow}>
                    <GlassSurface tier="medium" style={styles.headerActionGlass}>
                      <TouchableOpacity
                        style={styles.headerActionInner}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          void viewModel.reset();
                        }}
                        disabled={!viewModel.canReset}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.resetLabel}>Reset</Text>
                      </TouchableOpacity>
                    </GlassSurface>
                    <GlassSurface
                      tier={savePrimary ? 'heavy' : 'light'}
                      tint={savePrimary ? 'brand' : 'default'}
                      style={styles.headerActionGlass}
                    >
                      <TouchableOpacity
                        style={styles.headerActionInner}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          void viewModel.save();
                        }}
                        disabled={saveDisabled}
                        activeOpacity={0.8}
                      >
                        {viewModel.isSaving ? (
                          <ActivityIndicator color={WHITE_PRIMARY} size="small" />
                        ) : (
                          <Text
                            style={[
                              styles.saveLabel,
                              saveShowsSaved && styles.saveLabelSaved,
                              !savePrimary && !viewModel.isSaving && styles.saveLabelMuted,
                            ]}
                          >
                            {viewModel.saveButtonLabel}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </GlassSurface>
                  </View>
                ) : null}
              </View>

              {viewModel.isLoadingDraft ? (
                <ActivityIndicator color={TEXT_WHITE_40} style={{ marginVertical: 32 }} />
              ) : (
                <TextInput
                  style={styles.promptInput}
                  value={viewModel.draft}
                  onChangeText={(t) => viewModel.setDraft(t)}
                  placeholder={defaultPlaceholder}
                  placeholderTextColor={TEXT_WHITE_40}
                  multiline
                  textAlignVertical="top"
                  editable={!viewModel.isSaving}
                  maxLength={8000}
                />
              )}
              {viewModel.error ? <Text style={styles.promptError}>{viewModel.error}</Text> : null}
            </View>
          </GlassSurface>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
});
