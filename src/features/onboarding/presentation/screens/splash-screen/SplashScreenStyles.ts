import { StyleSheet } from 'react-native';
import { BLACK_PRIMARY } from '@/src/design-system/tokens/colors';

export const splashScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK_PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '125%',
    height: '125%',
  },
});
