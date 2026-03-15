import { GlassSurface } from '@/src/design-system/components';
import { TEXT_WHITE_40, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { env } from '@/src/config/env';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { paypalLogoSvg } from '../../../assets/svgs';
import { styles } from './SupportScreenStyles';

export function SupportScreen() {
  const router = useRouter();

  const handleBackPress = () => {
    router.back();
  };

  const handlePayPal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = env.support.paypalUrl;
    if (!url) {
      Alert.alert('Error', 'PayPal link is not configured');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open PayPal link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open PayPal link');
    }
  };

  const handleOther = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = env.support.otherPaymentUrl;
    if (!url) {
      Alert.alert('Error', 'Payment link is not configured');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open payment link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open payment link');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.container}>
        <GlassSurface tier="medium" style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.subtitle}>
              Help <Text style={styles.title}>LokalMind</Text>
            </Text>
          </View>
        </GlassSurface>

        <View style={styles.contentContainer}>
          <GlassSurface tier="medium" style={styles.paymentButton}>
            <TouchableOpacity
              style={styles.paymentButtonInner}
              onPress={handlePayPal}
              activeOpacity={0.7}
            >
              <View style={styles.paymentButtonLeft}>
                <SvgXml xml={paypalLogoSvg} width={22} height={22} />
                <Text style={styles.paymentButtonText}>PayPal</Text>
              </View>
              <SymbolView name="chevron.right" size={16} tintColor={TEXT_WHITE_40} />
            </TouchableOpacity>
          </GlassSurface>

          <GlassSurface tier="medium" style={styles.paymentButton}>
            <TouchableOpacity
              style={styles.paymentButtonInner}
              onPress={handleOther}
              activeOpacity={0.7}
            >
              <View style={styles.paymentButtonLeft}>
                <SymbolView name="creditcard.fill" size={22} tintColor={WHITE_PRIMARY} />
                <Text style={styles.paymentButtonText}>Other</Text>
              </View>
              <SymbolView name="chevron.right" size={16} tintColor={TEXT_WHITE_40} />
            </TouchableOpacity>
          </GlassSurface>
        </View>
      </View>
    </SafeAreaView>
  );
}
