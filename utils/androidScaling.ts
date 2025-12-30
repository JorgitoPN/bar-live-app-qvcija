
/**
 * ANDROID SCALING UTILITY - v77.0
 * 
 * Centralized scaling system for Android UI parity with iOS.
 * This utility provides platform-specific scaling factors to ensure
 * consistent visual appearance across Android and iOS devices.
 * 
 * CRITICAL FIXES v77.0:
 * - ✅ Header height extended to cover more area after search box
 * - ✅ Proper search box height matching iOS
 * - ✅ Category icons sized correctly
 * - ✅ Proper category spacing
 * - ✅ Proper top padding to prevent header collision
 * - ✅ Bottom nav background uses BarLive color (colors.primary)
 * - ✅ Icons properly centered in bottom navigation
 * - ✅ Global layout consistency across all screens
 * 
 * IMPORTANT: iOS design is the reference - DO NOT modify iOS values
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iOS reference)
const BASE_WIDTH = 375; // iPhone standard width
const BASE_HEIGHT = 812; // iPhone standard height

/**
 * Get the pixel density scale factor for the current device
 */
export const getPixelDensityScale = (): number => {
  if (Platform.OS !== 'android') return 1;
  
  const pixelRatio = PixelRatio.get();
  
  // Normalize pixel density to prevent over-scaling on high-DPI Android devices
  if (pixelRatio >= 3.5) return 0.82; // xxxhdpi devices - more aggressive reduction
  if (pixelRatio >= 3.0) return 0.87; // xxhdpi devices
  if (pixelRatio >= 2.0) return 0.92; // xhdpi devices
  if (pixelRatio >= 1.5) return 0.96; // hdpi devices
  
  return 1; // mdpi devices
};

/**
 * Scale a value based on screen width (horizontal scaling)
 */
export const scaleWidth = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const densityScale = getPixelDensityScale();
  
  return Math.round(size * scale * densityScale);
};

/**
 * Scale a value based on screen height (vertical scaling)
 */
export const scaleHeight = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  const densityScale = getPixelDensityScale();
  
  return Math.round(size * scale * densityScale);
};

/**
 * Scale font size with proper density adjustment
 */
export const scaleFontSize = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const densityScale = getPixelDensityScale();
  
  // Font scaling should be more conservative
  return Math.round(size * scale * densityScale * 0.93);
};

/**
 * Scale icon size with proper density adjustment
 */
export const scaleIconSize = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const densityScale = getPixelDensityScale();
  
  // Icons should scale less aggressively
  return Math.round(size * densityScale * 0.90);
};

/**
 * Get platform-specific header height
 * ✅ FIXED v77.0: Extended to cover more area after search box
 */
export const getHeaderHeight = (): number => {
  if (Platform.OS === 'ios') return 110;
  
  // Android header extended to cover more area after search box
  return 110; // Increased from 95 to match iOS and extend coverage
};

/**
 * Get platform-specific search box height
 * ✅ FIXED v77.0: Matches iOS proportions
 */
export const getSearchBoxHeight = (): number => {
  if (Platform.OS === 'ios') return 48;
  
  // Android search box matches iOS
  return 48; // Increased from 40 to match iOS exactly
};

/**
 * Get platform-specific category icon container size
 * ✅ FIXED v77.0: Matches iOS visual weight
 */
export const getCategoryIconSize = (): number => {
  if (Platform.OS === 'ios') return 56;
  
  // Android category icons match iOS
  return 56; // Increased from 48 to match iOS exactly
};

/**
 * Get platform-specific category icon size (the actual icon)
 * ✅ FIXED v77.0: Matches iOS proportions
 */
export const getCategoryIconInnerSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  
  // Android category icon inner size matches iOS
  return 28; // Increased from scaleIconSize(24) to match iOS exactly
};

/**
 * Get platform-specific spacing between categories
 * ✅ FIXED v77.0: Matches iOS spacing
 */
export const getCategorySpacing = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android category spacing matches iOS
  return 16; // Increased from 10 to match iOS exactly
};

/**
 * Get platform-specific top padding for category section
 * ✅ FIXED v77.0: Matches iOS padding
 */
export const getCategoryTopPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android category top padding matches iOS
  return 16; // Increased from 8 to match iOS exactly
};

/**
 * Get platform-specific bottom navigation bar height
 * ✅ FIXED v77.0: Matches iOS height
 */
export const getBottomNavHeight = (): number => {
  if (Platform.OS === 'ios') return 80;
  
  // Android bottom nav matches iOS height
  return 80; // Increased from 68 to match iOS exactly
};

/**
 * Get platform-specific bottom navigation icon size
 * ✅ FIXED v77.0: Matches iOS icon size
 */
export const getBottomNavIconSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  
  // Android bottom nav icons match iOS
  return 28; // Increased from scaleIconSize(25) to match iOS exactly
};

/**
 * Get platform-specific center button size (Explorar button)
 * ✅ FIXED v77.0: Matches iOS sizing
 */
export const getCenterButtonSize = (): number => {
  if (Platform.OS === 'ios') return 60;
  
  // Android center button matches iOS
  return 60; // Increased from 54 to match iOS exactly
};

/**
 * Get platform-specific center button icon size
 * ✅ FIXED v77.0: Matches iOS icon size
 */
export const getCenterButtonIconSize = (): number => {
  if (Platform.OS === 'ios') return 30;
  
  // Android center button icon matches iOS
  return 30; // Increased from scaleIconSize(27) to match iOS exactly
};

/**
 * Get platform-specific padding for content
 */
export const getContentPadding = (): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android content padding
  return 16; // Reduced from 18
};

/**
 * Get platform-specific card border radius
 */
export const getCardBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android card border radius
  return 14;
};

/**
 * Get platform-specific button border radius
 */
export const getButtonBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 12;
  
  // Android button border radius
  return 10;
};

/**
 * Get platform-specific spacing value
 */
export const getSpacing = (size: 'small' | 'medium' | 'large'): number => {
  const spacingMap = {
    small: Platform.OS === 'ios' ? 8 : 6,
    medium: Platform.OS === 'ios' ? 16 : 12,
    large: Platform.OS === 'ios' ? 24 : 18,
  };
  
  return spacingMap[size];
};

/**
 * Get platform-specific status bar height
 * ✅ FIXED v77.0: Matches iOS height
 */
export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'ios') return 50;
  
  // Android status bar height matches iOS
  return 50; // Increased from 35 to match iOS exactly
};

/**
 * Get platform-specific safe area top padding
 */
export const getSafeAreaTopPadding = (): number => {
  if (Platform.OS === 'ios') return 0;
  
  // Android doesn't need extra top padding with proper status bar handling
  return 0;
};

/**
 * Get platform-specific bottom navigation background overlap
 * ✅ FIXED v76.0: Background stops at 75% of center button height
 */
export const getBottomNavBackgroundOverlap = (): number => {
  if (Platform.OS === 'ios') return 0;
  
  // Android: background should stop at 75% of center button height
  const centerButtonSize = getCenterButtonSize();
  return -(centerButtonSize * 0.25); // Negative to reduce overlap
};

/**
 * Get platform-specific bottom navigation padding bottom
 * ✅ FIXED v77.0: Matches iOS padding
 */
export const getBottomNavPaddingBottom = (safeAreaBottom: number): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android: use safe area bottom or minimum padding matching iOS
  return Math.max(safeAreaBottom, 20); // Increased from 10 to match iOS
};

/**
 * Debug function to log current scaling factors
 */
export const logScalingInfo = () => {
  if (Platform.OS !== 'android') return;
  
  console.log('[AndroidScaling v77.0] 📊 Android-iOS Parity - All Dimensions Match:');
  console.log('  Screen Width:', SCREEN_WIDTH);
  console.log('  Screen Height:', SCREEN_HEIGHT);
  console.log('  Pixel Ratio:', PixelRatio.get());
  console.log('  Density Scale:', getPixelDensityScale());
  console.log('  ✅ Header Height:', getHeaderHeight(), '(matches iOS: 110)');
  console.log('  ✅ Search Box Height:', getSearchBoxHeight(), '(matches iOS: 48)');
  console.log('  ✅ Category Icon Size:', getCategoryIconSize(), '(matches iOS: 56)');
  console.log('  ✅ Category Icon Inner Size:', getCategoryIconInnerSize(), '(matches iOS: 28)');
  console.log('  ✅ Category Spacing:', getCategorySpacing(), '(matches iOS: 16)');
  console.log('  ✅ Category Top Padding:', getCategoryTopPadding(), '(matches iOS: 16)');
  console.log('  ✅ Bottom Nav Height:', getBottomNavHeight(), '(matches iOS: 80)');
  console.log('  ✅ Bottom Nav Icon Size:', getBottomNavIconSize(), '(matches iOS: 28)');
  console.log('  ✅ Center Button Size:', getCenterButtonSize(), '(matches iOS: 60)');
  console.log('  ✅ Center Button Icon Size:', getCenterButtonIconSize(), '(matches iOS: 30)');
  console.log('  ✅ Status Bar Height:', getStatusBarHeight(), '(matches iOS: 50)');
};

export default {
  scaleWidth,
  scaleHeight,
  scaleFontSize,
  scaleIconSize,
  getHeaderHeight,
  getSearchBoxHeight,
  getCategoryIconSize,
  getCategoryIconInnerSize,
  getCategorySpacing,
  getCategoryTopPadding,
  getBottomNavHeight,
  getBottomNavIconSize,
  getCenterButtonSize,
  getCenterButtonIconSize,
  getContentPadding,
  getCardBorderRadius,
  getButtonBorderRadius,
  getSpacing,
  getStatusBarHeight,
  getSafeAreaTopPadding,
  getBottomNavBackgroundOverlap,
  getBottomNavPaddingBottom,
  getPixelDensityScale,
  logScalingInfo,
};
