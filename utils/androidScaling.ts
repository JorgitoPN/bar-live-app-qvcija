
import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375; // iPhone SE width as baseline

export const scaleFontSize = (size: number): number => {
  if (Platform.OS === 'android') {
    const scale = SCREEN_WIDTH / BASE_WIDTH;
    return Math.round(size * scale * 0.85); // 0.85 factor for Android
  }
  return size;
};

export const getSearchBoxHeight = (): number => {
  return Platform.OS === 'android' ? 45 : 50;
};

export const getCategoryIconSize = (): number => {
  return Platform.OS === 'android' ? 50 : 60;
};

export const getCategoryIconInnerSize = (): number => {
  return Platform.OS === 'android' ? 24 : 28;
};
