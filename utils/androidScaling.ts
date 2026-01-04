
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

// ✅ NEW: Bottom navigation bar functions
export const getBottomNavHeight = (): number => {
  return Platform.OS === 'ios' ? 60 : 56;
};

export const getBottomNavIconSize = (): number => {
  return Platform.OS === 'ios' ? 24 : 22;
};

export const getCenterButtonSize = (): number => {
  return Platform.OS === 'ios' ? 56 : 52;
};

export const getCenterButtonIconSize = (): number => {
  return Platform.OS === 'ios' ? 28 : 26;
};

export const getBottomNavPaddingBottom = (safeAreaBottom: number): number => {
  if (Platform.OS === 'ios') {
    return Math.max(safeAreaBottom, 8);
  }
  return 0; // Android handles safe area differently
};

// Font sizes with scaling
export const fontSizes = {
  xs: scaleFontSize(12),
  sm: scaleFontSize(14),
  base: scaleFontSize(16),
  md: scaleFontSize(16),
  lg: scaleFontSize(18),
  xl: scaleFontSize(20),
  '2xl': scaleFontSize(24),
  '3xl': scaleFontSize(30),
};

// Spacing with scaling
export const spacing = {
  xs: scaleSpacing(4),
  sm: scaleSpacing(8),
  md: scaleSpacing(12),
  lg: scaleSpacing(16),
  xl: scaleSpacing(20),
  '2xl': scaleSpacing(24),
  '3xl': scaleSpacing(32),
  '4xl': scaleSpacing(40),
  '5xl': scaleSpacing(48),
};

// Border radius with scaling
export const borderRadius = {
  sm: scaleSize(4),
  md: scaleSize(8),
  lg: scaleSize(12),
  xl: scaleSize(16),
  '2xl': scaleSize(20),
  full: 9999,
};

// Icon sizes with scaling
export const iconSizes = {
  xs: scaleSize(12),
  sm: scaleSize(16),
  md: scaleSize(20),
  lg: scaleSize(24),
  xl: scaleSize(28),
  '2xl': scaleSize(32),
  '3xl': scaleSize(48),
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
    console.log('  - Bottom Nav Height:', getBottomNavHeight());
    console.log('  - Bottom Nav Icon Size:', getBottomNavIconSize());
    console.log('  - Center Button Size:', getCenterButtonSize());
    console.log('  - Center Button Icon Size:', getCenterButtonIconSize());
  }
};
