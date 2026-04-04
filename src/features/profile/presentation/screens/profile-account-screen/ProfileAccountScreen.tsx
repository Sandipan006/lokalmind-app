import { env } from '@/src/config/env';
import { container } from '@/src/core/di/container';
import { GlassSurface } from '@/src/design-system/components';
import { ERROR_RED, TEXT_WHITE_40 } from '@/src/design-system/tokens/colors';
import { ResetAllLocalDataUseCase } from '@/src/features/profile/domain/usecases/ResetAllLocalDataUseCase';
import { MemberSinceAvatarRing } from '@/src/features/profile/presentation/components/MemberSinceAvatarRing/MemberSinceAvatarRing';
import { getUserAvatarSource } from '@/src/features/profile/presentation/constants/userAvatarSources';
import { ProfileAccountViewModel } from '@/src/features/profile/presentation/viewmodels/ProfileAccountViewModel';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './ProfileAccountScreenStyles';

export const ProfileAccountScreen = observer(() => {
  const router = useRouter();
  const viewModel = useRef(
    new ProfileAccountViewModel(
      container.userRepository,
      new ResetAllLocalDataUseCase(container.localDataReset),
    ),
  ).current;

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await container.initializeContainer();
      if (mounted) {
        await viewModel.loadProfile();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [viewModel]);

  const openGitHub = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = env.app.githubRepoUrl.trim();
    if (!url) {
      Alert.alert(
        'GitHub link not set',
        'Add GITHUB_REPO_URL in your environment to open the repository from here.',
      );
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to open', 'This link cannot be opened on this device.');
      }
    } catch {
      Alert.alert('Unable to open', 'Something went wrong opening the link.');
    }
  };

  const openContact = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const email = env.app.developerContactEmail.trim();
    if (!email) {
      Alert.alert(
        'Contact not configured',
        'Add DEVELOPER_CONTACT_EMAIL in your environment to email from here.',
      );
      return;
    }
    const subject = 'LokalMind Support Request';
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    try {
      await Linking.openURL(mailto);
    } catch {
      Alert.alert('Unable to open mail', 'No mail app is available.');
    }
  };

  const openModePrompts = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/profile/mode-system-prompts');
  };

  const confirmLogout = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Erase this device?',
      'All local chats, models, and settings on this phone will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase and sign out',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await container.initializeContainer();
                await viewModel.resetAllData();
                router.replace('/onboarding/welcome');
              } catch (e) {
                Alert.alert(
                  'Reset failed',
                  e instanceof Error ? e.message : 'Could not clear local data. Try again.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
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
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <MemberSinceAvatarRing
              size={152}
              imageDiameter={100}
              avatarSource={getUserAvatarSource(viewModel.avatarIndex)}
            />
            {viewModel.isLoadingProfile ? (
              <ActivityIndicator color={TEXT_WHITE_40} />
            ) : (
              <Text style={styles.displayName}>{viewModel.displayName}</Text>
            )}
            {viewModel.loadError ? (
              <Text style={styles.loadingText}>{viewModel.loadError}</Text>
            ) : null}
          </View>

          <GlassSurface tier="medium" style={styles.card}>
            <TouchableOpacity
              style={styles.cardInner}
              onPress={openModePrompts}
              activeOpacity={0.75}
              disabled={viewModel.isResetting}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle}>System prompts</Text>
                <Text style={styles.cardSubtitle}>
                  Customize the assistant for each chat mode (General, Coding, Creative, Marketing)
                </Text>
              </View>
              <View style={styles.cardChevron}>
                <SymbolView name="chevron.right" size={14} tintColor={TEXT_WHITE_40} />
              </View>
            </TouchableOpacity>
          </GlassSurface>

          <GlassSurface tier="medium" style={styles.card}>
            <TouchableOpacity
              style={styles.cardInner}
              onPress={openGitHub}
              activeOpacity={0.75}
              disabled={viewModel.isResetting}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle}>
                  Star us on <Text style={styles.accentWord}>GitHub</Text>
                </Text>
                <Text style={styles.cardSubtitle}>
                  Peek at the source, report a bug, or leave a star - it keeps the project alive
                </Text>
              </View>
              <View style={styles.cardChevron}>
                <SymbolView name="chevron.right" size={14} tintColor={TEXT_WHITE_40} />
              </View>
            </TouchableOpacity>
          </GlassSurface>

          <GlassSurface tier="medium" style={styles.card}>
            <TouchableOpacity
              style={styles.cardInner}
              onPress={openContact}
              activeOpacity={0.75}
              disabled={viewModel.isResetting}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle}>Contact the developer</Text>
                <Text style={styles.cardSubtitle}>
                  Questions, rough edges, or ideas - send a note. We read every message
                </Text>
              </View>
              <View style={styles.cardChevron}>
                <SymbolView name="chevron.right" size={14} tintColor={TEXT_WHITE_40} />
              </View>
            </TouchableOpacity>
          </GlassSurface>

          <View style={styles.spacer} />

          <TouchableOpacity
            style={styles.logoutTouchable}
            onPress={confirmLogout}
            disabled={viewModel.isResetting}
            activeOpacity={0.7}
          >
            {viewModel.isResetting ? (
              <ActivityIndicator color={ERROR_RED} />
            ) : (
              <>
                <Text style={styles.logoutText}>Sign out</Text>
                <Text style={styles.logoutHint}>Removes local data on this device.</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
});
