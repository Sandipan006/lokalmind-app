import { GlassSurface } from '@/src/design-system/components';
import {
  ERROR_RED,
  PRIMARY_ORANGE,
  SUCCESS_GREEN,
  TEXT_WHITE_60,
  TEXT_WHITE_80,
  WARNING_AMBER,
  WHITE_PRIMARY,
} from '@/src/design-system/tokens/colors';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { DownloadProgressInfo } from '../../domain/entities/DownloadStatus';
import type { Model } from '../../domain/entities/Model';
import { modelCardStyles as styles } from './ModelCardStyles';

interface ModelCardProps {
  model: Model;
  downloadProgress?: DownloadProgressInfo | undefined;
  isExpanded: boolean;
  onDownloadPress: () => void;
  onPausePress: () => void;
  onResumePress: () => void;
  onCancelPress: () => void;
  onUsePress: () => void;
  onDeletePress: () => void;
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
  onUsePress,
  onDeletePress,
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

  const handleDeletePress = () => {
    Alert.alert(
      'Remove this model?',
      'The file will be deleted from this device. You can download it again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeletePress(),
        },
      ],
    );
  };

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
          <View style={styles.sizeCapsule}>
            <SymbolView name="internaldrive.fill" size={14} tintColor={TEXT_WHITE_80} />
            <Text style={styles.sizeText}>{formatBytes(model.sizeBytes)}</Text>
          </View>
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
                {displayProgress.bytesWritten <= 0
                  ? 'Starting…'
                  : `${formatSpeed(Math.max(displayProgress.speedBytesPerSecond, 0))} · ETA ${
                      displayProgress.etaSeconds > 0 ? formatETA(displayProgress.etaSeconds) : '--'
                    }`}
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

        {isCompleted && (
          <View style={styles.completedContainer}>
            <Pressable
              onPress={handleDeletePress}
              style={styles.deleteIconButton}
              hitSlop={8}
              accessibilityLabel="Delete downloaded model"
            >
              <SymbolView name="trash" size={18} tintColor={ERROR_RED} />
            </Pressable>
            <Pressable onPress={onUsePress} style={styles.useModelButton}>
              <SymbolView name="bubble.left.and.bubble.right.fill" size={22} tintColor={WHITE_PRIMARY} />
              <Text style={styles.useModelText}>Start Chat</Text>
            </Pressable>
          </View>
        )}
      </GlassSurface>
    </AnimatedPressable>
  );
}

