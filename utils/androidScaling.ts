
import { Platform } from 'react-native';

// Base scaling factor (can be adjusted globally)
let globalScaleFactor = 1.0;

/**
 * Set the global UI scale factor (Android only)
 * @param scale - Scale factor (0.3 to 1.4)
 */
export const setGlobalScaleFactor = (scale: number) => {
  if (Platform.OS === 'android') {
    globalScaleFactor = Math.max(0.3, Math.min(1.4, scale));
  }
};

/**
 * Get the current global scale factor
 */
export const getGlobalScaleFactor = (): number => {
  return Platform.OS === 'android' ? globalScaleFactor : 1.0;
};

/**
 * Scale a value based on platform and global scale factor
 */
const scale = (value: number): number => {
  return Platform.OS === 'android' ? value * globalScaleFactor : value;
};

// Bottom Navigation
export const getBottomNavHeight = (): number => scale(60);
export const getBottomNavPaddingBottom = (insetBottom: number): number => 
  Platform.OS === 'android' ? scale(8) : insetBottom;
export const getBottomNavIconSize = (): number => scale(24);
export const getCenterButtonSize = (): number => scale(56);
export const getCenterButtonIconSize = (): number => scale(28);

// Header
export const getHeaderHeight = (): number => scale(60);

// Search
export const getSearchBoxHeight = (): number => scale(48);

// Categories
export const getCategoryIconSize = (): number => scale(32);
export const getCategoryTopPadding = (): number => scale(16);
