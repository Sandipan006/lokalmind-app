import { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { GlassSurface } from '@/src/design-system/components';
import { WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { container } from '@/src/core/di/container';
import { DEFAULT_AVATAR_INDEX, getUserAvatarSource } from '@/src/features/profile/presentation/constants/userAvatarSources';
import { ChatSearchModal } from '@/src/features/chat/presentation/components/ChatSearchModal/ChatSearchModal';
import { styles } from './TabsTopHeaderStyles';

export function TabsTopHeader() {
  const router = useRouter();
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [avatarIndex, setAvatarIndex] = useState<number>(DEFAULT_AVATAR_INDEX);

  useEffect(() => {
    let mounted = true;
    const loadAvatar = async () => {
      try {
        const storedAvatarIndex = await container.userRepository.getAvatarIndex();
        if (mounted) {
          setAvatarIndex(storedAvatarIndex ?? DEFAULT_AVATAR_INDEX);
        }
      } catch {
        if (mounted) {
          setAvatarIndex(DEFAULT_AVATAR_INDEX);
        }
      }
    };

    void loadAvatar();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.row}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Image
                source={require('@/src/features/tabs/assets/images/icon-transparent.png')}
                style={{ width: 30, height: 30 }}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.logoText}>LokalMind</Text>
          </View>

          <GlassSurface tier="medium" style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setIsSearchModalVisible(true)}
              hitSlop={8}
            >
              <SymbolView name="magnifyingglass" size={18} tintColor={WHITE_PRIMARY} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => router.push('/profile/ai-behavior')}
              hitSlop={8}
            >
              <Image source={getUserAvatarSource(avatarIndex)} style={styles.avatarImage} />
            </TouchableOpacity>
          </GlassSurface>
        </View>
      </SafeAreaView>

      <Modal
        visible={isSearchModalVisible}
        animationType="fade"
        onRequestClose={() => setIsSearchModalVisible(false)}
        presentationStyle="overFullScreen"
      >
        <ChatSearchModal onClose={() => setIsSearchModalVisible(false)} />
      </Modal>
    </>
  );
}
