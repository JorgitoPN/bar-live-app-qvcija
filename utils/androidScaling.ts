
// Centralized scaling utility for Android UI parity with iOS
import { Platform, PixelRatio, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 375; // iPhone 11 Pro reference width
const MAX_FONT_SCALE = 1.15; // Limit font scaling

export const getFontScale = (): number => {
  return Platform.OS === 'ios' ? 1 : Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
};

export const scaleFontSize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  const fontScale = getFontScale();
  return Math.round(newSize / fontScale);
};

export const scaleSpacing = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size * scale * (Platform.OS === 'android' ? 0.9 : 1));
};

export const scaleSize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size * scale * (Platform.OS === 'android' ? 0.95 : 1));
};

export const getHeaderHeight = (): number => {
  return Platform.OS === 'ios' ? 44 : 56;
};

export const getSearchBoxHeight = (): number => {
  return Platform.OS === 'ios' ? 50 : 48;
};

export const getCategoryIconSize = (): number => {
  return Platform.OS === 'ios' ? 60 : 56;
};

export const getCategoryIconInnerSize = (): number => {
  return Platform.OS === 'ios' ? 28 : 26;
};

export const getCategorySpacing = (): number => {
  return Platform.OS === 'ios' ? 12 : 10;
};

export const getCategoryTopPadding = (): number => {
  return Platform.OS === 'ios' ? 12 : 10;
};

export const getContentPadding = (): number => {
  return Platform.OS === 'ios' ? 20 : 18;
};

export const getStatusBarHeight = (): number => {
  return Platform.OS === 'ios' ? 44 : 24;
};

export const getLineHeight = (fontSize: number): number => {
  return Math.round(fontSize * 1.4);
};

export const logScalingInfo = (): void => {
  if (Platform.OS === 'android') {
    console.log('[AndroidScaling] 📊 Scaling Information:');
    console.log('  - Screen Width:', SCREEN_WIDTH);
    console.log('  - Screen Height:', SCREEN_HEIGHT);
    console.log('  - Font Scale:', getFontScale());
    console.log('  - Header Height:', getHeaderHeight());
    console.log('  - Search Box Height:', getSearchBoxHeight());
    console.log('  - Category Icon Size:', getCategoryIconSize());
    console.log('  - Category Icon Inner Size:', getCategoryIconInnerSize());
    console.log('  - Category Spacing:', getCategorySpacing());
    console.log('  - Category Top Padding:', getCategoryTopPadding());
    console.log('  - Content Padding:', getContentPadding());
    console.log('  - Status Bar Height:', getStatusBarHeight());
  }
};
