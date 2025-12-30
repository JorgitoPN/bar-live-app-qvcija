
/**
 * ANDROID SCALING UTILITY - v79.0
 * 
 * Centralized scaling system for Android UI parity with iOS.
 * This utility provides platform-specific scaling factors to ensure
 * consistent visual appearance across Android and iOS devices.
 * 
 * CRITICAL FIXES v79.0:
 * - ✅ Bottom nav height increased by 20% on Android (84px)
 * - ✅ iOS bottom nav height restored to original (70px)
 * - ✅ Icons and center button properly visible with correct z-index
 * - ✅ Category top padding reduced for tighter spacing (8px)
 * - ✅ All dimensions optimized for Android-iOS parity
 * - ✅ Global layout consistency across all screens
 * 
 * IMPORTANT: iOS design is the reference - minimal iOS changes
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
  if (pixelRatio >= 3.5) return 0.85; // xxxhdpi devices
  if (pixelRatio >= 3.0) return 0.88; // xxhdpi devices
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
  return Math.round(size * scale * densityScale * 0.95);
};

/**
 * Scale icon size with proper density adjustment
 */
export const scaleIconSize = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const densityScale = getPixelDensityScale();
  
  // Icons should scale less aggressively
  return Math.round(size * densityScale * 0.92);
};

/**
 * Get platform-specific header height
 * ✅ FIXED v79.0: Consistent across platforms
 */
export const getHeaderHeight = (): number => {
  // Consistent header height across platforms
  return 110;
};

/**
 * Get platform-specific search box height
 * ✅ FIXED v79.0: Matches iOS proportions
 */
export const getSearchBoxHeight = (): number => {
  // Consistent search box height
  return 48;
};

/**
 * Get platform-specific category icon container size
 * ✅ FIXED v79.0: Matches iOS visual weight
 */
export const getCategoryIconSize = (): number => {
  // Consistent category icon size
  return 56;
};

/**
 * Get platform-specific category icon size (the actual icon)
 * ✅ FIXED v79.0: Matches iOS proportions
 */
export const getCategoryIconInnerSize = (): number => {
  // Consistent category icon inner size
  return 28;
};

/**
 * Get platform-specific spacing between categories
 * ✅ FIXED v79.0: Matches iOS spacing
 */
export const getCategorySpacing = (): number => {
  // Consistent category spacing
  return 16;
};

/**
 * Get platform-specific top padding for category section
 * ✅ ANDROID FIX v79.0: Reduced to 8 for much tighter spacing
 */
export const getCategoryTopPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android: drastically reduced for tighter spacing
  return 8; // Reduced from 12 to 8 for minimal margin
};

/**
 * Get platform-specific bottom navigation bar height
 * ✅ CRITICAL FIX v79.0: 
 * - Android: Increased by 20% (84px = 70 * 1.2)
 * - iOS: Restored to original (70px)
 */
export const getBottomNavHeight = (): number => {
  if (Platform.OS === 'ios') {
    return 70; // ✅ RESTORED: Original iOS height
  }
  
  // ✅ ANDROID FIX: Increased by 20% (70 * 1.2 = 84)
  return 84;
};

/**
 * Get platform-specific bottom navigation icon size
 * ✅ FIXED v79.0: Consistent icon size
 */
export const getBottomNavIconSize = (): number => {
  // Consistent icon size across platforms
  return 28;
};

/**
 * Get platform-specific center button size (Explorar button)
 * ✅ FIXED v79.0: Consistent sizing
 */
export const getCenterButtonSize = (): number => {
  // Consistent center button size
  return 60;
};

/**
 * Get platform-specific center button icon size
 * ✅ FIXED v79.0: Consistent icon size
 */
export const getCenterButtonIconSize = (): number => {
  // Consistent center button icon size
  return 30;
};

/**
 * Get platform-specific content padding
 */
export const getContentPadding = (): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android content padding slightly reduced
  return 18;
};

/**
 * Get platform-specific card border radius
 */
export const getCardBorderRadius = (): number => {
  // Consistent card border radius
  return 16;
};

/**
 * Get platform-specific button border radius
 */
export const getButtonBorderRadius = (): number => {
  // Consistent button border radius
  return 12;
};

/**
 * Get platform-specific spacing value
 */
export const getSpacing = (size: 'small' | 'medium' | 'large'): number => {
  const spacingMap = {
    small: 8,
    medium: 16,
    large: 24,
  };
  
  return spacingMap[size];
};

/**
 * Get platform-specific status bar height
 * ✅ FIXED v79.0: Consistent height
 */
export const getStatusBarHeight = (): number => {
  // Consistent status bar height
  return 50;
};

/**
 * Get platform-specific safe area top padding
 */
export const getSafeAreaTopPadding = (): number => {
  // No extra top padding needed
  return 0;
};

/**
 * Get platform-specific bottom navigation background overlap
 * ✅ FIXED v79.0: No overlap - background stops at icon level
 */
export const getBottomNavBackgroundOverlap = (): number => {
  // No overlap on any platform
  return 0;
};

/**
 * Get platform-specific bottom navigation padding bottom
 * ✅ ANDROID FIX v79.0: Adjusted for increased height
 */
export const getBottomNavPaddingBottom = (safeAreaBottom: number): number => {
  if (Platform.OS === 'ios') {
    return 12; // iOS padding
  }
  
  // Android: increased padding for taller nav bar
  return 16;
};

/**
 * Debug function to log current scaling factors
 */
export const logScalingInfo = () => {
  if (Platform.OS !== 'android') return;
  
  console.log('[AndroidScaling v79.0] 📊 Android-iOS Parity - Optimized Dimensions:');
  console.log('  Screen Width:', SCREEN_WIDTH);
  console.log('  Screen Height:', SCREEN_HEIGHT);
  console.log('  Pixel Ratio:', PixelRatio.get());
  console.log('  Density Scale:', getPixelDensityScale());
  console.log('  ✅ Header Height:', getHeaderHeight(), '(matches iOS: 110)');
  console.log('  ✅ Search Box Height:', getSearchBoxHeight(), '(matches iOS: 48)');
  console.log('  ✅ Category Icon Size:', getCategoryIconSize(), '(matches iOS: 56)');
  console.log('  ✅ Category Icon Inner Size:', getCategoryIconInnerSize(), '(matches iOS: 28)');
  console.log('  ✅ Category Spacing:', getCategorySpacing(), '(matches iOS: 16)');
  console.log('  ✅ Category Top Padding:', getCategoryTopPadding(), '(Android: 8, minimal spacing)');
  console.log('  ✅ Bottom Nav Height:', getBottomNavHeight(), '(Android: 84 [+20%], iOS: 70 [restored])');
  console.log('  ✅ Bottom Nav Icon Size:', getBottomNavIconSize(), '(matches iOS: 28)');
  console.log('  ✅ Center Button Size:', getCenterButtonSize(), '(matches iOS: 60)');
  console.log('  ✅ Center Button Icon Size:', getCenterButtonIconSize(), '(matches iOS: 30)');
  console.log('  ✅ Status Bar Height:', getStatusBarHeight(), '(matches iOS: 50)');
  console.log('  ✅ Bottom Nav Padding Bottom:', getBottomNavPaddingBottom(0), '(Android: 16, iOS: 12)');
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
