import { borderRadius, fontSizes, fonts, normalize, spacing, typography } from '@/src/design-system/tokens';
import {
    BLACK_PRIMARY,
    ERROR_RED,
    TEXT_WHITE_40,
    TEXT_WHITE_60,
    WHITE_PRIMARY,
} from '@/src/design-system/tokens/colors';
import { Platform, StyleSheet } from 'react-native';

/** Interior field on top of GlassSurface - reads as frosted inset. */
export const GLASS_FIELD_BG = 'rgba(255,255,255,0.07)';
export const GLASS_FIELD_BORDER = 'rgba(255,255,255,0.14)';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BLACK_PRIMARY,
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  headerBackGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: { borderCurve: 'continuous' as const },
      default: {},
    }),
  },
  headerBackInner: {
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    ...typography.label.default,
    color: WHITE_PRIMARY,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  introGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: { borderCurve: 'continuous' as const },
      default: {},
    }),
  },
  introInner: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  intro: {
    fontSize: fontSizes.sm,
    color: TEXT_WHITE_60,
    fontFamily: fonts.figtree.regular,
    lineHeight: fontSizes.sm * 1.4,
  },
  modeScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    flexGrow: 0,
    flexShrink: 0,
  },
  modeScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  modeChipGlass: {
    height: normalize(44),
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    alignSelf: 'center',
    ...Platform.select({
      ios: { borderCurve: 'continuous' as const },
      default: {},
    }),
  },
  modeChipInner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    minWidth: normalize(88),
    alignItems: 'center',
  },
  modeChipLabel: {
    fontSize: fontSizes.sm,
    color: TEXT_WHITE_60,
    fontFamily: fonts.figtree.medium,
  },
  modeChipLabelSelected: {
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.semiBold,
  },
  editorGlass: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    ...Platform.select({
      ios: { borderCurve: 'continuous' as const },
      default: {},
    }),
  },
  editorInner: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  editorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  editorTitleBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.xs,
  },
  editorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
    marginTop: 2,
  },
  headerActionGlass: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    minWidth: normalize(75),
    ...Platform.select({
      ios: { borderCurve: 'continuous' as const },
      default: {},
    }),
  },
  headerActionInner: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: normalize(36),
  },
  editorLabel: {
    fontSize: fontSizes.xs,
    color: TEXT_WHITE_40,
    fontFamily: fonts.figtree.medium,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  editorModeTitle: {
    fontSize: fontSizes.lg,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.semiBold,
  },
  promptInput: {
    minHeight: normalize(200),
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: GLASS_FIELD_BG,
    borderWidth: 1,
    borderColor: GLASS_FIELD_BORDER,
    color: WHITE_PRIMARY,
    fontSize: fontSizes.sm,
    fontFamily: fonts.figtree.regular,
    lineHeight: fontSizes.sm * 1.45,
  },
  promptError: {
    fontSize: fontSizes.xs,
    color: ERROR_RED,
    fontFamily: fonts.figtree.regular,
  },
  resetLabel: {
    fontSize: fontSizes.xs,
    color: TEXT_WHITE_60,
    fontFamily: fonts.figtree.semiBold,
  },
  saveLabel: {
    fontSize: fontSizes.xs,
    color: WHITE_PRIMARY,
    fontFamily: fonts.figtree.semiBold,
  },
  saveLabelSaved: {
    color: TEXT_WHITE_60,
    fontFamily: fonts.figtree.medium,
  },
  saveLabelMuted: {
    color: TEXT_WHITE_40,
  },
});
