import { container } from '@/src/core/di/container';
import { PRIMARY_ORANGE } from '@/src/design-system/tokens/colors';
import { spacing } from '@/src/design-system/tokens/spacing';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CancelDownloadUseCase,
  GetAllModelsUseCase,
  PauseDownloadUseCase,
  ResumeDownloadUseCase,
  StartDownloadUseCase,
} from '../../../domain/usecases';
import { ModelCard } from '../../components/ModelCard';
import { ModelSetupViewModel } from '../../viewmodels/ModelSetupViewModel';
import { modelBrowserScreenStyles as styles } from './ModelBrowserScreenStyles';

export const ModelBrowserScreen = observer(() => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const viewModel = useRef(
    new ModelSetupViewModel(
      new GetAllModelsUseCase(container.modelRepository),
      new StartDownloadUseCase(container.modelRepository),
      new PauseDownloadUseCase(container.modelRepository),
      new ResumeDownloadUseCase(container.modelRepository),
      new CancelDownloadUseCase(container.modelRepository)
    )
  ).current;

  useEffect(() => {
    viewModel.loadModels();
  }, [viewModel]);

  const downloadedModels = useMemo(
    () => viewModel.models.filter((model) => model.isDownloaded),
    [viewModel.models]
  );
  const availableModels = useMemo(
    () => viewModel.models.filter((model) => !model.isDownloaded),
    [viewModel.models]
  );

  if (viewModel.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_ORANGE} />
          <Text style={styles.loadingText}>Loading models...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Models</Text>
          <Text style={styles.subtitle}>Manage downloaded models and install new ones.</Text>
        </View>

        {viewModel.errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{viewModel.errorMessage}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Downloaded</Text>
        {downloadedModels.length === 0 && (
          <Text style={styles.helperText}>No downloaded models yet.</Text>
        )}
        {downloadedModels.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            downloadProgress={viewModel.getDownloadProgress(model.id)}
            isExpanded={viewModel.expandedModelId === model.id}
            onDownloadPress={() => viewModel.startDownload(model.id)}
            onPausePress={() => viewModel.pauseDownload(model.id)}
            onResumePress={() => viewModel.resumeDownload(model.id)}
            onCancelPress={() => viewModel.cancelDownload(model.id)}
            onUsePress={() => router.push('/chat/new')}
          />
        ))}

        <Text style={styles.sectionTitle}>Available to Download</Text>
        {availableModels.length === 0 && (
          <Text style={styles.helperText}>All available models are already downloaded.</Text>
        )}
        {availableModels.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            downloadProgress={viewModel.getDownloadProgress(model.id)}
            isExpanded={viewModel.expandedModelId === model.id}
            onDownloadPress={() => viewModel.startDownload(model.id)}
            onPausePress={() => viewModel.pauseDownload(model.id)}
            onResumePress={() => viewModel.resumeDownload(model.id)}
            onCancelPress={() => viewModel.cancelDownload(model.id)}
            onUsePress={() => router.push('/chat/new')}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
});
