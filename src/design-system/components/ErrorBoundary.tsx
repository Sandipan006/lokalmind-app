import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  BLACK_PRIMARY,
  WHITE_PRIMARY,
  TEXT_WHITE_60,
  PRIMARY_ORANGE,
  ERROR_RED,
} from '../tokens/colors';
import { FONTS, FONT_SIZE } from '../tokens/typography';
import { SPACING, BORDER_RADIUS } from '../tokens/spacing';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (__DEV__) {
      console.warn('[ErrorBoundary] Caught render error:', error, info.componentStack);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {__DEV__ && this.state.error ? this.state.error.message : 'An unexpected error occurred.'}
          </Text>
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  icon: {
    fontSize: 48,
    color: ERROR_RED,
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZE.xl,
    color: WHITE_PRIMARY,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    color: TEXT_WHITE_60,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: FONT_SIZE.sm * 1.5,
  },
  button: {
    backgroundColor: PRIMARY_ORANGE,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  buttonText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZE.md,
    color: WHITE_PRIMARY,
  },
});
