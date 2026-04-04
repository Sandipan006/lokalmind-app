import { borderRadius, spacing, typography } from '@/src/design-system/tokens';
import { CHAT_USER_REPLY_BAR, CHAT_USER_REPLY_SCRIM, TEXT_LIGHT, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { fonts } from '@/src/design-system/tokens/typography';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    backgroundColor: CHAT_USER_REPLY_SCRIM,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  accent: {
    width: 3,
    flexShrink: 0,
    backgroundColor: CHAT_USER_REPLY_BAR,
  },
  main: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    gap: spacing.xxxs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: spacing.xs,
  },
  label: {
    ...typography.caption.smallSemiBold,
    color: WHITE_PRIMARY,
    flex: 1,
    minWidth: 0,
  },
  preview: {
    ...typography.caption.small,
    color: TEXT_LIGHT,
  },
  previewBold: {
    ...typography.caption.small,
    color: TEXT_LIGHT,
    fontFamily: fonts.figtree.bold,
  },
  previewItalic: {
    ...typography.caption.small,
    color: TEXT_LIGHT,
    fontFamily: fonts.figtree.italic,
  },
  dismiss: {
    padding: spacing.xxs,
    flexShrink: 0,
  },
});
