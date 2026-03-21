import { TEXT_WHITE_60 } from '@/src/design-system/tokens/colors';
import { fontSizes, fonts } from '@/src/design-system/tokens/typography';
import type { ImageSourcePropType } from 'react-native';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';

const RING_TEXT = "MEMBER SINCE MAR '26";

type MemberSinceAvatarRingProps = {
  size: number;
  imageDiameter: number;
  avatarSource: ImageSourcePropType;
};

/** Circular caption around the avatar (SVG TextPath), matching the reference “ring label” pattern. */
export function MemberSinceAvatarRing({ size, imageDiameter, avatarSource }: MemberSinceAvatarRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 16;
  const pathId = 'memberSinceRingPath';
  const pathD = `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <Path id={pathId} d={pathD} fill="none" />
        </Defs>
        <SvgText
          fill={TEXT_WHITE_60}
          fontSize={fontSizes.xxs}
          fontFamily={fonts.figtree.medium}
          letterSpacing={1.2}
          textAnchor="middle"
        >
          {/* Path starts at top; 50% = bottom arc - centered under the avatar */}
          <TextPath href={`#${pathId}`} startOffset="50%">
            {RING_TEXT}
          </TextPath>
        </SvgText>
      </Svg>
      <Image
        source={avatarSource}
        style={{
          width: imageDiameter,
          height: imageDiameter,
          borderRadius: imageDiameter / 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
