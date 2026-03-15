import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GlassSurface } from '@/src/design-system/components';
import { WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { styles } from './TabsTopHeaderStyles';

export function TabsTopHeader() {
  const router = useRouter();

  return (
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
            onPress={() => router.push('/(tabs)/search')}
            hitSlop={8}
          >
            <Text style={styles.searchIcon}>⌕</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/profile/ai-behavior')}
            hitSlop={8}
          >
            <Text style={styles.avatarIcon}>􀉩</Text>
          </TouchableOpacity>
        </GlassSurface>
      </View>
    </SafeAreaView>
  );
}
