import { GlassSurface } from '@/src/design-system/components';
import {
  PRIMARY_ORANGE,
  SUCCESS_GREEN,
  TEXT_WHITE_60,
  TEXT_WHITE_80,
  WARNING_AMBER,
  WHITE_PRIMARY,
} from '@/src/design-system/tokens/colors';
import { borderRadius, spacing } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { DownloadProgressInfo } from '../../domain/entities/DownloadStatus';
import type { Model } from '../../domain/entities/Model';

interface ModelCardProps {
  model: Model;
  downloadProgress?: DownloadProgressInfo | undefined;
  isExpanded: boolean;
  onDownloadPress: () => void;
  onPausePress: () => void;
  onResumePress: () => void;
  onCancelPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ModelCard({
  model,
  downloadProgress,
  isExpanded,
  onDownloadPress,
  onPausePress,
  onResumePress,
  onCancelPress,
}: ModelCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`;
    }
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatETA = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`;
    }
    if (seconds < 3600) {
      return `${Math.ceil(seconds / 60)}m`;
    }
    return `${Math.ceil(seconds / 3600)}h`;
  };

  const isDownloading = isExpanded && (!downloadProgress || downloadProgress.status === 'downloading');
  const isPaused = downloadProgress?.status === 'paused';
  const isCompleted = model.isDownloaded;

  // Use real progress if available, otherwise show 0% placeholder while download initialises.
  const displayProgress: DownloadProgressInfo = downloadProgress ?? {
    modelId: model.id,
    bytesWritten: 0,
    totalBytes: model.sizeBytes,
    progressFraction: 0,
    speedBytesPerSecond: 0,
    etaSeconds: 0,
    status: 'downloading',
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, styles.container]}
    >
      <GlassSurface tier="medium" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <SymbolView
                name="cpu"
                size={24}
                tintColor={PRIMARY_ORANGE}
                type="hierarchical"
              />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.modelName}>{model.displayName}</Text>
              {model.isPaid && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
            </View>
          </View>
          <Pressable
            onPress={
              isCompleted
                ? undefined
                : isDownloading
                ? onPausePress
                : isPaused
                ? onResumePress
                : onDownloadPress
            }
            disabled={isCompleted}
            style={styles.actionButton}
          >
            <SymbolView
              name={
                isCompleted
                  ? 'checkmark.circle.fill'
                  : isDownloading
                  ? 'pause.circle.fill'
                  : isPaused
                  ? 'play.circle.fill'
                  : 'arrow.down.circle'
              }
              size={32}
              tintColor={isCompleted ? SUCCESS_GREEN : PRIMARY_ORANGE}
              type="hierarchical"
            />
          </Pressable>
        </View>

        <Text style={styles.description} numberOfLines={isExpanded ? undefined : 2}>
          {model.description}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.sizeText}>{formatBytes(model.sizeBytes)}</Text>
          <Text style={styles.ramText}>{model.ramRequirement}</Text>
        </View>

        {isExpanded && !isCompleted && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(displayProgress.progressFraction * 100)}%` },
                ]}
              />
            </View>

            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {formatBytes(displayProgress.bytesWritten)} / {formatBytes(displayProgress.totalBytes)}
              </Text>
              <Text style={styles.progressText}>
                {displayProgress.speedBytesPerSecond > 0
                  ? `${formatSpeed(displayProgress.speedBytesPerSecond)} · ETA ${formatETA(displayProgress.etaSeconds)}`
                  : 'Starting…'}
              </Text>
            </View>

            <View style={styles.downloadActions}>
              {isDownloading && (
                <Pressable onPress={onPausePress} style={styles.downloadActionButton}>
                  <SymbolView name="pause.fill" size={20} tintColor={WARNING_AMBER} />
                  <Text style={styles.downloadActionText}>Pause</Text>
                </Pressable>
              )}
              {isPaused && (
                <Pressable onPress={onResumePress} style={styles.downloadActionButton}>
                  <SymbolView name="play.fill" size={20} tintColor={SUCCESS_GREEN} />
                  <Text style={styles.downloadActionText}>Resume</Text>
                </Pressable>
              )}
              <Pressable onPress={onCancelPress} style={styles.downloadActionButton}>
                <SymbolView name="xmark.circle.fill" size={20} tintColor={TEXT_WHITE_60} />
                <Text style={styles.downloadActionText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </GlassSurface>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 66, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modelName: {
    ...typography.heading.h3,
    color: WHITE_PRIMARY,
  },
  premiumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 66, 11, 0.2)',
    borderRadius: borderRadius.sm,
  },
  premiumText: {
    ...typography.caption.default,
    color: PRIMARY_ORANGE,
    fontSize: 10,
    fontWeight: '600',
  },
  actionButton: {
    padding: spacing.xs,
  },
  description: {
    ...typography.body.small,
    color: TEXT_WHITE_80,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sizeText: {
    ...typography.body.small,
    color: TEXT_WHITE_60,
    fontWeight: '600',
  },
  ramText: {
    ...typography.caption.default,
    color: TEXT_WHITE_60,
  },
  progressContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: PRIMARY_ORANGE,
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  progressText: {
    ...typography.caption.default,
    color: TEXT_WHITE_60,
  },
  downloadActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  downloadActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
  },
  downloadActionText: {
    ...typography.caption.default,
    color: TEXT_WHITE_80,
    fontWeight: '600',
  },
});
