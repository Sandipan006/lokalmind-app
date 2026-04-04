import { TEXT_WHITE_30, TEXT_WHITE_40, TEXT_WHITE_60, WHITE_PRIMARY } from '@/src/design-system/tokens/colors';
import { borderRadius, normalize, spacing } from '@/src/design-system/tokens/spacing';
import { typography } from '@/src/design-system/tokens/typography';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface RegenerateControlsProps {
  /** Total number of versions (including all alternates + current). */
  totalVersions: number;
  /** 1-based index of the version currently displayed. */
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onRegenerate: () => void;
  disabled?: boolean;
  /** Hide the Regenerate button (for non-last assistant messages that only need the pager). */
  showRegenerate?: boolean;
}

/** Max number of regenerations allowed (original + 2 regens = 3 total versions max). */
const MAX_REGENERATIONS = 2;

export function RegenerateControls({
  totalVersions,
  activeIndex,
  onPrev,
  onNext,
  onRegenerate,
  disabled = false,
  showRegenerate = true,
}: RegenerateControlsProps) {
  const hasPrev = activeIndex > 1;
  const hasNext = activeIndex < totalVersions;
  const showPager = totalVersions > 1;
  // Disable regen when max reached: totalVersions includes original + all regens.
  // e.g. 1 original + 3 regens = 4 versions total.
  const regenLimitReached = totalVersions > MAX_REGENERATIONS;

  return (
    <View style={styles.row}>
      {showPager && (
        <View style={styles.pager}>
          <Pressable
            onPress={onPrev}
            disabled={!hasPrev || disabled}
            hitSlop={styles.hitSlop}
            style={({ pressed }) => [styles.arrow, (!hasPrev || disabled) && styles.arrowDisabled, pressed && styles.arrowPressed]}
          >
            <SymbolView name="chevron.left" size={normalize(10)} tintColor={(!hasPrev || disabled) ? TEXT_WHITE_40 : WHITE_PRIMARY} />
          </Pressable>
          <Text style={styles.pagerLabel}>{activeIndex}/{totalVersions}</Text>
          <Pressable
            onPress={onNext}
            disabled={!hasNext || disabled}
            hitSlop={styles.hitSlop}
            style={({ pressed }) => [styles.arrow, (!hasNext || disabled) && styles.arrowDisabled, pressed && styles.arrowPressed]}
          >
            <SymbolView name="chevron.right" size={normalize(10)} tintColor={(!hasNext || disabled) ? TEXT_WHITE_40 : WHITE_PRIMARY} />
          </Pressable>
        </View>
      )}
      {showRegenerate && (
        <Pressable
          onPress={onRegenerate}
          disabled={disabled || regenLimitReached}
          style={({ pressed }) => [
            styles.regenBtn,
            (disabled || regenLimitReached) && styles.regenBtnDisabled,
            pressed && !(disabled || regenLimitReached) && styles.regenBtnPressed,
          ]}
        >
          <SymbolView name="arrow.clockwise" size={normalize(12)} tintColor={(disabled || regenLimitReached) ? TEXT_WHITE_40 : WHITE_PRIMARY} />
          <Text style={[styles.regenText, (disabled || regenLimitReached) && styles.regenTextDisabled]}>Regenerate</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    // gap: normalize(4),
  },
  arrow: {
    paddingHorizontal: normalize(6),
    paddingVertical: normalize(4),
    borderRadius: borderRadius.sm,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowPressed: {
    opacity: 0.5,
  },
  pagerLabel: {
    ...typography.caption.default,
    color: TEXT_WHITE_60,
    minWidth: normalize(30),
    textAlign: 'center',
  },
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(6),
    paddingLeft: spacing.xs + normalize(2),
    paddingRight: spacing.sm,
    paddingTop: normalize(4),
    paddingBottom: normalize(6),
    borderRadius: borderRadius.sm,
    backgroundColor: TEXT_WHITE_30 + '80',
    borderWidth: 1,
    borderColor: TEXT_WHITE_30,
  },
  regenBtnDisabled: {
    opacity: 0.35,
  },
  regenBtnPressed: {
    opacity: 0.6,
  },
  regenText: {
    ...typography.caption.smallSemiBold,
    color: WHITE_PRIMARY,
  },
  regenTextDisabled: {
    color: TEXT_WHITE_40,
  },
});
