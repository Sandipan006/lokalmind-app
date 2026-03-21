import { PRIMARY_ORANGE, TEXT_WHITE_60, TEXT_WHITE_80, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { borderRadius, spacing } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';
import { StyleSheet, Platform } from 'react-native';

export const modelCardStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...Platform.select({
      ios: {
        borderCurve:"continuous"
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 66, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modelName: {
    ...typography.heading.h3,
    color: WHITE_PRIMARY,
  },
  actionButton: {
    padding: spacing.xs,
  },
  description: {
    ...typography.body.small,
    color: TEXT_WHITE_80,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sizeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sizeText: {
    ...typography.body.small,
    color: TEXT_WHITE_80,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  completedContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: PRIMARY_ORANGE,
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  progressText: {
    ...typography.caption.default,
    color: TEXT_WHITE_60,
  },
  downloadActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  downloadActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
  },
  downloadActionText: {
    ...typography.caption.default,
    color: TEXT_WHITE_80,
    fontWeight: '600',
  },
  useModelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 66, 11, 0.16)',
  },
  useModelText: {
    ...typography.button.large,
    color: TEXT_WHITE_80,
  },
});