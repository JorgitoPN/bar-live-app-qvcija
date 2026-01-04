
import { Platform, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iOS reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Android scaling factor (can be adjusted globally)
const ANDROID_SCALE_FACTOR = 0.85; // Reduce by 15% for Android

/**
 * Scale a value based on screen width
 */
export const scaleWidth = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size * scale * ANDROID_SCALE_FACTOR);
};

/**
 * Scale a value based on screen height
 */
export const scaleHeight = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  return Math.round(size * scale * ANDROID_SCALE_FACTOR);
};

/**
 * Scale font sizes for Android
 */
export const scaleFontSize = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale * ANDROID_SCALE_FACTOR;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Get header height (platform-specific)
 */
export const getHeaderHeight = (): number => {
  return Platform.OS === 'android' ? scaleHeight(120) : 120;
};

/**
 * Get status bar height (platform-specific)
 */
export const getStatusBarHeight = (): number => {
  return Platform.OS === 'android' ? 24 : 44;
};

/**
 * Get search box height
 */
export const getSearchBoxHeight = (): number => {
  return Platform.OS === 'android' ? scaleHeight(44) : 44;
};

/**
 * Get category icon size
 */
export const getCategoryIconSize = (): number => {
  return Platform.OS === 'android' ? scaleWidth(50) : 60;
};

/**
 * Get category icon inner size
 */
export const getCategoryIconInnerSize = (): number => {
  return Platform.OS === 'android' ? scaleWidth(28) : 32;
};

/**
 * Get category spacing
 */
export const getCategorySpacing = (): number => {
  return Platform.OS === 'android' ? scaleWidth(12) : 16;
};

/**
 * Get category top padding
 */
export const getCategoryTopPadding = (): number => {
  return Platform.OS === 'android' ? scaleHeight(12) : 16;
};

/**
 * Get content padding
 */
export const getContentPadding = (): number => {
  return Platform.OS === 'android' ? scaleWidth(20) : 20;
};

/**
 * Get bottom navigation height
 */
export const getBottomNavHeight = (): number => {
  return Platform.OS === 'android' ? scaleHeight(60) : 70;
};

/**
 * Get bottom navigation padding bottom
 */
export const getBottomNavPaddingBottom = (safeAreaBottom: number = 0): number => {
  if (Platform.OS === 'android') {
    // On Android, use safe area insets directly (no extra padding)
    return safeAreaBottom;
  }
  // On iOS, add extra padding for home indicator
  return 20;
};

/**
 * Get center button size
 */
export const getCenterButtonSize = (): number => {
  return Platform.OS === 'android' ? scaleWidth(56) : 64;
};

/**
 * Get center button icon size
 */
export const getCenterButtonIconSize = (): number => {
  return Platform.OS === 'android' ? scaleWidth(28) : 32;
};

/**
 * Get bottom nav icon size
 */
export const getBottomNavIconSize = (): number => {
  return Platform.OS === 'android' ? scaleWidth(24) : 28;
};

/**
 * Get header title font size
 */
export const getHeaderTitleSize = (): number => {
  return Platform.OS === 'android' ? scaleFontSize(20) : 24;
};

/**
 * Get search box font size
 */
export const getSearchBoxFontSize = (): number => {
  return Platform.OS === 'android' ? scaleFontSize(15) : 16;
};

/**
 * Get category text size
 */
export const getCategoryTextSize = (): number => {
  return Platform.OS === 'android' ? scaleFontSize(12) : 13;
};

/**
 * Scale any dimension for Android
 */
export const scale = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  return scaleWidth(size);
};

/**
 * Moderate scale - less aggressive scaling
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  if (Platform.OS !== 'android') return size;
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size + (scale - 1) * factor * size * ANDROID_SCALE_FACTOR);
};

/**
 * Log scaling information for debugging
 */
export const logScalingInfo = (): void => {
  if (Platform.OS === 'android') {
    console.log('📊 Android Scaling Info:', {
      screenWidth: SCREEN_WIDTH,
      screenHeight: SCREEN_HEIGHT,
      scaleFactor: ANDROID_SCALE_FACTOR,
      headerHeight: getHeaderHeight(),
      searchBoxHeight: getSearchBoxHeight(),
      categoryIconSize: getCategoryIconSize(),
      bottomNavHeight: getBottomNavHeight(),
      centerButtonSize: getCenterButtonSize(),
    });
  }
};
