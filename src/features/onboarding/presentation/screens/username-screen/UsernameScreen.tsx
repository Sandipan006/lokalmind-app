import React, { useRef } from 'react';
import {
  ImageBackground,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassSurface, PrimaryButton } from '@/src/design-system/components';
import { TEXT_WHITE_60 } from '@/src/design-system/tokens/colors';
import { UsernameViewModel } from '../../viewmodels/UsernameViewModel';
import { SaveDisplayNameUseCase } from '../../../domain/usecases/SaveDisplayNameUseCase';
import { container } from '@/src/core/di/container';
import { usernameScreenStyles as styles } from './UsernameScreenStyles';

export const UsernameScreen = observer(() => {
  const viewModel = useRef(
    new UsernameViewModel(
      new SaveDisplayNameUseCase(container.userRepository)
    )
  ).current;

  const handleSubmit = async () => {
    const success = await viewModel.saveProfile();
    if (success) {
      router.push('/onboarding/model-setup');
    }
  };

  return (
    <ImageBackground
      source={require('../../../assets/images/userScreen.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.headerSection}>
              <Text style={styles.title}>What should we call you?</Text>
              <Text style={styles.subtitle}>
                Enter your display name to get started
              </Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Display Name</Text>
              <GlassSurface tier="medium" style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={viewModel.userName}
                  onChangeText={(text) => viewModel.setUserName(text)}
                  placeholder="Enter your name"
                  placeholderTextColor={TEXT_WHITE_60}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </GlassSurface>
              {viewModel.validationError && (
                <Text style={styles.errorText}>{viewModel.validationError}</Text>
              )}
            </View>

            <View style={styles.spacer} />

            <View style={styles.buttonSection}>
              <PrimaryButton
                title={viewModel.isLoading ? 'Saving...' : 'Submit'}
                onPress={handleSubmit}
                disabled={!viewModel.canProceed || viewModel.isLoading}
                loading={viewModel.isLoading}
                style={styles.submitButton}
              />
              <Text style={styles.privacyText}>
                Your data stays with you. No data is going out.
              </Text>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </ImageBackground>
  );
});
