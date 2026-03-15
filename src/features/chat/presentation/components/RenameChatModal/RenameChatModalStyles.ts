import { StyleSheet } from 'react-native';
import { CHAT_BACKGROUND_COLOR, PRIMARY_ORANGE, TEXT_WHITE_60, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { borderRadius, spacing } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';

export const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: CHAT_BACKGROUND_COLOR,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    ...typography.body.semiBold,
    color: WHITE_PRIMARY,
    marginBottom: spacing.sm,
  },
  modalInput: {
    ...typography.body.default,
    color: WHITE_PRIMARY,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  modalButtonSecondary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  modalButtonSecondaryText: {
    ...typography.body.medium,
    color: TEXT_WHITE_60,
  },
  modalButtonPrimary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: PRIMARY_ORANGE,
  },
  modalButtonPrimaryText: {
    ...typography.body.semiBold,
    color: WHITE_PRIMARY,
  },
});
