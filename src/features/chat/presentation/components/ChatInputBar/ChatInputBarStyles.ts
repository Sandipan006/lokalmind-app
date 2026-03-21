import { INPUT_BOX_COLOR, PRIMARY_ORANGE, TEXT_WHITE_40, TEXT_WHITE_60, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
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
  inputGlassDisabled: {
    opacity: 0.85,
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
  modeButtonDisabled: {
    opacity: 0.55,
  },
  modeButtonTextDisabled: {
    color: TEXT_WHITE_40,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: INPUT_BOX_COLOR,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
    width: '100%',
    alignSelf: 'stretch',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.body.medium,
    color: WHITE_PRIMARY,
    flex: 1,
    marginBottom: 0,
    paddingRight: spacing.sm,
  },
  modalDismissButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOption: {
    minHeight: normalize(44),
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOptionSelected: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PRIMARY_ORANGE,
  },
  modalOptionText: {
    ...typography.body.medium,
    color: WHITE_PRIMARY,
  },
  modalOptionDot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: PRIMARY_ORANGE,
  },
  /** Model picker body: full-width stack, no inner scroll (sheet grows with content). */
  modalSheetBody: {
    width: '100%',
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  /** One sheet section (e.g. Downloaded vs Other models). */
  modalSectionBlock: {
    gap: spacing.sm,
  },
  modalSectionTitle: {
    ...typography.caption.smallSemiBold,
    color: TEXT_WHITE_60,
    marginTop: 0,
    marginBottom: 0,
  },
  modalHelperText: {
    ...typography.caption.small,
    color: TEXT_WHITE_60,
    marginTop: 0,
    marginBottom: 0,
  },
  modalRowSubtitle: {
    ...typography.caption.small,
    color: TEXT_WHITE_60,
    marginTop: spacing.xxs,
  },
  modalRowArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
