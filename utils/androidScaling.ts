
import { Platform } from 'react-native';

// Base scaling function - returns 1 for iOS, scale factor for Android
const getScaleFactor = (): number => {
  // This will be enhanced to read from global context in actual implementation
  return Platform.OS === 'android' ? 1.0 : 1.0;
};

const scale = (size: number): number => size * getScaleFactor();

// Status bar and header dimensions
export const getStatusBarHeight = (): number => Platform.OS === 'android' ? scale(24) : 0;
export const getHeaderHeight = (): number => scale(60);
export const getSearchBoxHeight = (): number => scale(48);

// Category icon dimensions
export const getCategoryIconSize = (): number => scale(32);
export const getCategoryIconInnerSize = (): number => scale(20);
export const getCategoryTopPadding = (): number => scale(16);
export const getCategorySpacing = (): number => scale(8);

// Content padding
export const getContentPadding = (): number => scale(20);

// Bottom navigation dimensions
export const getBottomNavHeight = (): number => scale(60);
export const getBottomNavPaddingBottom = (insetsBottom: number): number => 
  Platform.OS === 'android' ? scale(10) + insetsBottom : 10 + insetsBottom;
export const getCenterButtonSize = (): number => scale(56);
export const getCenterButtonIconSize = (): number => scale(28);
export const getBottomNavIconSize = (): number => scale(24);

// Font scaling
export const scaleFontSize = (size: number): number => size * getScaleFactor();

// Debug utility
export const logScalingInfo = (): void => {
  console.log('Android Scaling Info:', {
    platform: Platform.OS,
    scaleFactor: getScaleFactor(),
    statusBarHeight: getStatusBarHeight(),
    headerHeight: getHeaderHeight(),
    categoryIconSize: getCategoryIconSize(),
    categoryIconInnerSize: getCategoryIconInnerSize(),
  });
};
