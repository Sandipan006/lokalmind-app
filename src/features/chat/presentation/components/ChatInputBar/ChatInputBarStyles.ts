import { BLACK_PRIMARY, INPUT_BOX_COLOR, PRIMARY_ORANGE, TEXT_WHITE_40, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { borderRadius, spacing } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';
import { Platform, StyleSheet } from 'react-native';

export const TEXT_INPUT_PLACEHOLDER_COLOR = TEXT_WHITE_40;

export const styles = StyleSheet.create({
  inputBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    backgroundColor: BLACK_PRIMARY,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: spacing.xs,
  },
  inputGlass: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  inputInner: {
    backgroundColor: 'rgba(42,42,42,0.72)',
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 96,
    maxHeight: 180,
  },
  textInput: {
    ...typography.body.default,
    color: WHITE_PRIMARY,
    minHeight: 24,
    maxHeight: 108,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  bottomRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeButton: {
    minHeight: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  modeButtonText: {
    ...typography.body.medium,
    color: WHITE_PRIMARY,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  stopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: INPUT_BOX_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PRIMARY_ORANGE,
  },
  stopSquare: {
    width: 14,
    height: 14,
    backgroundColor: PRIMARY_ORANGE,
    borderRadius: 2,
  },
});
