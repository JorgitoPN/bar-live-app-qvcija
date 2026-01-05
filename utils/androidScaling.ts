
import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro as reference)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

/**
 * Scale font size based on platform and screen size
 */
export const scaleFontSize = (size: number): number => {
  if (Platform.OS === 'android') {
    const scale = SCREEN_WIDTH / BASE_WIDTH;
    return Math.round(size * scale);
  }
  return size;
};

/**
 * Get header height based on platform
 */
export const getHeaderHeight = (): number => {
  return Platform.OS === 'android' ? 60 : 56;
};

/**
 * Get search box height based on platform
 */
export const getSearchBoxHeight = (): number => {
  return Platform.OS === 'android' ? 48 : 44;
};

/**
 * Get category icon size based on platform
 */
export const getCategoryIconSize = (): number => {
  return Platform.OS === 'android' ? 64 : 60;
};

/**
 * Get inner category icon size based on platform
 */
export const getCategoryIconInnerSize = (): number => {
  return Platform.OS === 'android' ? 32 : 30;
};

/**
 * Get top padding for categories based on platform
 */
export const getCategoryTopPadding = (): number => {
  return Platform.OS === 'android' ? 16 : 12;
};

/**
 * Get status bar height for Android
 */
export const getStatusBarHeight = (): number => {
  return Platform.OS === 'android' ? 24 : 0;
};

/**
 * Get category spacing based on platform
 */
export const getCategorySpacing = (): number => {
  return Platform.OS === 'android' ? 12 : 10;
};

/**
 * Get bottom navigation height based on platform
 */
export const getBottomNavHeight = (): number => {
  return Platform.OS === 'android' ? 65 : 60;
};

/**
 * Get bottom navigation padding based on platform and bottom inset
 */
export const getBottomNavPaddingBottom = (bottomInset: number): number => {
  return Platform.OS === 'android' ? 8 : Math.max(bottomInset, 8);
};

/**
 * Get center button size based on platform
 */
export const getCenterButtonSize = (): number => {
  return Platform.OS === 'android' ? 56 : 52;
};

/**
 * Get center button icon size based on platform
 */
export const getCenterButtonIconSize = (): number => {
  return Platform.OS === 'android' ? 28 : 26;
};

/**
 * Get bottom navigation icon size based on platform
 */
export const getBottomNavIconSize = (): number => {
  return Platform.OS === 'android' ? 24 : 22;
};

/**
 * Log scaling information for debugging
 */
export const logScalingInfo = (): void => {
  if (Platform.OS === 'android') {
    console.log('[AndroidScaling] Screen dimensions:', {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      scale: SCREEN_WIDTH / BASE_WIDTH,
    });
  }
};
