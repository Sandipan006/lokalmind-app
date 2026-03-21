import { StyleSheet } from 'react-native';
import { BLACK_PRIMARY, PRIMARY_ORANGE, TEXT_WHITE_40, TEXT_WHITE_60, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { borderRadius, spacing } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: BLACK_PRIMARY,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  backIconSvg: {
    transform: [{ rotate: '90deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  headerModelCapsule: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  headerModelButton: {
    height: 38,
    maxWidth: 210,
    borderRadius: borderRadius.full,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  headerModelName: {
    ...typography.body.semiBold,
    color: WHITE_PRIMARY,
    maxWidth: 170,
  },
  headerDownloadCta: {
    ...typography.body.semiBold,
    color: PRIMARY_ORANGE,
    maxWidth: 170,
  },
  headerModelChevron: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerNewChatCapsule: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  headerNewChatButton: {
    height: 38,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  headerNewChatButtonDisabled: {
    opacity: 0.38,
  },
  headerNewChatIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerNewChatText: {
    ...typography.caption.smallSemiBold,
    color: WHITE_PRIMARY,
  },
  headerNewChatTextDisabled: {
    color: TEXT_WHITE_40,
  },
});
