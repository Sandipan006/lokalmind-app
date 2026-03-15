import { TEXT_WHITE_60, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { spacing, spacingAliases } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';
import { StyleSheet } from 'react-native';

export const modelBrowserScreenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacingAliases.screen,
  },
  header: {
    // marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading.h3,
    color: WHITE_PRIMARY,
  },
  subtitle: {
    ...typography.caption.default,
    color: TEXT_WHITE_60,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.heading.h3,
    color: WHITE_PRIMARY,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  helperText: {
    ...typography.body.small,
    color: TEXT_WHITE_60,
    marginBottom: spacing.sm,
  },
  errorContainer: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.body.small,
    color: '#FF3B30',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body.default,
    color: TEXT_WHITE_60,
    marginTop: spacing.md,
  },
});
