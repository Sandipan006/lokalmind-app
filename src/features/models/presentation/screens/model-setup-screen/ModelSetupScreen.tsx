import { container } from '@/src/core/di/container';
import { PRIMARY_ORANGE } from '@/src/design-system/tokens/colors';
import { spacing } from '@/src/design-system/tokens/spacing';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Image, ImageBackground, ScrollView, Text, View } from 'react-native';
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
import { modelSetupScreenStyles as styles } from './ModelSetupScreenStyles';

export const ModelSetupScreen = observer(() => {
  const insets = useSafeAreaInsets();
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

  if (viewModel.isLoading) {
    return (
      <ImageBackground
        source={require('@/src/features/onboarding/assets/images/userScreen.webp')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY_ORANGE} />
            <Text style={styles.loadingText}>Loading models...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  const freeModels = viewModel.models.filter((m) => !m.isPaid);
  const premiumModels = viewModel.models.filter((m) => m.isPaid);

  return (
    <ImageBackground
      source={require('@/src/features/onboarding/assets/images/userScreen.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + spacing.lg,
              paddingBottom: insets.bottom + spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
        >
            <View style={styles.header}>
              <Text style={styles.title}>Choose Your AI Model</Text>
              <Text style={styles.subtitle}>
                Select and download a model to get started. Free models work great for everyday use.
                Premium models offer advanced capabilities.
              </Text>
            </View>

            {viewModel.errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{viewModel.errorMessage}</Text>
              </View>
            )}

            {freeModels.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Free Models</Text>
                {freeModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    downloadProgress={viewModel.getDownloadProgress(model.id)}
                    isExpanded={viewModel.expandedModelId === model.id}
                    onDownloadPress={() => viewModel.startDownload(model.id)}
                    onPausePress={() => viewModel.pauseDownload(model.id)}
                    onResumePress={() => viewModel.resumeDownload(model.id)}
                    onCancelPress={() => viewModel.cancelDownload(model.id)}
                  />
                ))}
              </>
            )}

            {premiumModels.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Premium Models</Text>
                {premiumModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    downloadProgress={viewModel.getDownloadProgress(model.id)}
                    isExpanded={viewModel.expandedModelId === model.id}
                    onDownloadPress={() => viewModel.startDownload(model.id)}
                    onPausePress={() => viewModel.pauseDownload(model.id)}
                    onResumePress={() => viewModel.resumeDownload(model.id)}
                    onCancelPress={() => viewModel.cancelDownload(model.id)}
                  />
                ))}
              </>
            )}
        </ScrollView>
      </SafeAreaView>
      <View pointerEvents="none" style={styles.bottomOverlayContainer}>
        <Image
          source={require('../../../assets/images/bottomOverlay.png')}
          style={styles.bottomOverlayImage}
          resizeMode="stretch"
        />
      </View>
    </ImageBackground>
  );
});
