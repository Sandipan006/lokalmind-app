import { BLACK_PRIMARY, INPUT_BOX_COLOR, PRIMARY_ORANGE, TEXT_WHITE_40, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { borderRadius, normalize, spacing } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';
import { Platform, StyleSheet } from 'react-native';

export const TEXT_INPUT_PLACEHOLDER_COLOR = TEXT_WHITE_40;

export const styles = StyleSheet.create({
  inputBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    // backgroundColor: BLACK_PRIMARY,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: spacing.xs,
  },
  inputGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  inputInner: {
    backgroundColor: 'rgba(42,42,42,0.72)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    // minHeight: normalize(110),
    maxHeight: normalize(250),
  },
  textInput: {
    ...typography.body.default,
    color: WHITE_PRIMARY,
    minHeight: normalize(24),
    maxHeight: normalize(108),
    textAlignVertical: 'top',
    includeFontPadding: false,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  bottomRow: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  modeButton: {
    minHeight: normalize(40),
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modeButtonText: {
    ...typography.body.medium,
    color: WHITE_PRIMARY,
  },
  sendButton: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: borderRadius.sm,
    backgroundColor: PRIMARY_ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  stopButton: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: borderRadius.md,
    backgroundColor: INPUT_BOX_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: normalize(1.5),
    borderColor: PRIMARY_ORANGE,
  },
  stopSquare: {
    width: normalize(14),
    height: normalize(14),
    backgroundColor: PRIMARY_ORANGE,
    borderRadius: normalize(2),
  },
});
