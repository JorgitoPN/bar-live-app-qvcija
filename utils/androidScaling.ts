
/**
 * ANDROID SCALING UTILITY - v82.0 - FINAL BOTTOM NAV & BANNER FIX
 * 
 * Centralized scaling system for Android UI parity with iOS.
 * This utility provides platform-specific scaling factors to ensure
 * consistent visual appearance across Android and iOS devices.
 * 
 * CRITICAL FIXES v82.0 - FINAL ADJUSTMENTS:
 * - ✅ Bottom navigation padding reduced to ZERO extra space
 * - ✅ Background unified to BarLive color (confirmed)
 * - ✅ Explore button size optimized
 * - ✅ Icon sizes optimized for visibility
 * - ✅ Banner background box removed (transparent text)
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
 * ✅ FIXED v80.0: Proper normalization
 */
export const getPixelDensityScale = (): number => {
  if (Platform.OS !== 'android') return 1;
  
  const pixelRatio = PixelRatio.get();
  
  // Normalize pixel density to prevent over-scaling on high-DPI Android devices
  if (pixelRatio >= 3.5) return 0.85; // xxxhdpi devices - prevent stretching
  if (pixelRatio >= 3.0) return 0.90; // xxhdpi devices
  if (pixelRatio >= 2.0) return 0.95; // xhdpi devices
  if (pixelRatio >= 1.5) return 0.98; // hdpi devices
  
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
 */
export const getHeaderHeight = (): number => {
  if (Platform.OS === 'ios') return 110;
  
  // Android header extended to cover more area after search box
  return 120;
};

/**
 * Get platform-specific search box height
 */
export const getSearchBoxHeight = (): number => {
  if (Platform.OS === 'ios') return 48;
  
  // Android search box matches iOS
  return 48;
};

/**
 * Get platform-specific category icon container size
 */
export const getCategoryIconSize = (): number => {
  if (Platform.OS === 'ios') return 56;
  
  // Android category icons match iOS
  return 56;
};

/**
 * Get platform-specific category icon size (the actual icon)
 */
export const getCategoryIconInnerSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  
  // Android category icon inner size matches iOS
  return 28;
};

/**
 * Get platform-specific spacing between categories
 */
export const getCategorySpacing = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android category spacing matches iOS
  return 16;
};

/**
 * Get platform-specific top padding for category section
 */
export const getCategoryTopPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android: MINIMAL spacing
  return 4;
};

/**
 * Get platform-specific bottom navigation bar height
 * ✅ CRITICAL FIX v81.0: Reduced height for more compact design
 */
export const getBottomNavHeight = (): number => {
  if (Platform.OS === 'ios') return 70;
  
  // ✅ Android: Reduced height (was 70, now 62 - about 11% reduction)
  return 62;
};

/**
 * Get platform-specific bottom navigation icon size
 * ✅ CRITICAL FIX v81.0: Reduced icon size for better visibility
 */
export const getBottomNavIconSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  
  // ✅ Android: Reduced icon size (was 28, now 24)
  return 24;
};

/**
 * Get platform-specific center button size (Explorar button)
 * ✅ CRITICAL FIX v81.0: Reduced button size
 */
export const getCenterButtonSize = (): number => {
  if (Platform.OS === 'ios') return 60;
  
  // ✅ Android: Reduced center button size (was 60, now 54)
  return 54;
};

/**
 * Get platform-specific center button icon size
 * ✅ CRITICAL FIX v81.0: Reduced icon size
 */
export const getCenterButtonIconSize = (): number => {
  if (Platform.OS === 'ios') return 30;
  
  // ✅ Android: Reduced center button icon size (was 30, now 26)
  return 26;
};

/**
 * Get platform-specific padding for content
 */
export const getContentPadding = (): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android content padding matches iOS
  return 20;
};

/**
 * Get platform-specific card border radius
 */
export const getCardBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android card border radius matches iOS
  return 16;
};

/**
 * Get platform-specific card aspect ratio
 */
export const getCardAspectRatio = (): number => {
  // Same aspect ratio on both platforms
  return 1.5; // Width to height ratio for local cards
};

/**
 * Get platform-specific card image height
 */
export const getCardImageHeight = (): number => {
  if (Platform.OS === 'ios') return 200;
  
  // Android card image height matches iOS
  return 200;
};

/**
 * Get platform-specific button border radius
 */
export const getButtonBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 12;
  
  // Android button border radius matches iOS
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
 */
export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'ios') return 50;
  
  // Android status bar height matches iOS
  return 50;
};

/**
 * Get platform-specific safe area top padding
 */
export const getSafeAreaTopPadding = (): number => {
  // No extra padding needed on either platform
  return 0;
};

/**
 * Get platform-specific bottom navigation padding bottom
 * ✅ CRITICAL FIX v82.0: ZERO extra padding - let safe area handle it naturally
 */
export const getBottomNavPaddingBottom = (safeAreaBottom: number): number => {
  if (Platform.OS === 'ios') return 20;
  
  // ✅ Android v82.0: ZERO extra padding - use ONLY the safe area inset
  // This eliminates the gap between bottom nav and system buttons
  return safeAreaBottom;
};

/**
 * Get platform-specific header padding top
 */
export const getHeaderPaddingTop = (): number => {
  if (Platform.OS === 'ios') return 50;
  
  // Android matches iOS
  return 50;
};

/**
 * Get platform-specific header padding bottom
 */
export const getHeaderPaddingBottom = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android matches iOS
  return 16;
};

/**
 * Get platform-specific header padding horizontal
 */
export const getHeaderPaddingHorizontal = (): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android matches iOS
  return 20;
};

/**
 * Get platform-specific card padding
 */
export const getCardPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android matches iOS
  return 16;
};

/**
 * Get platform-specific card margin bottom
 */
export const getCardMarginBottom = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android matches iOS
  return 16;
};

/**
 * Debug function to log current scaling factors
 * ✅ UPDATED v82.0: Complete logging of all dimensions
 */
export const logScalingInfo = () => {
  if (Platform.OS !== 'android') return;
  
  console.log('[AndroidScaling v82.0] 📊 FINAL ANDROID BOTTOM NAV & BANNER FIX:');
  console.log('  Screen Width:', SCREEN_WIDTH);
  console.log('  Screen Height:', SCREEN_HEIGHT);
  console.log('  Pixel Ratio:', PixelRatio.get());
  console.log('  Density Scale:', getPixelDensityScale());
  console.log('  ✅ Bottom Nav Height:', getBottomNavHeight(), '(reduced from 70 to 62 - MORE COMPACT)');
  console.log('  ✅ Bottom Nav Icon Size:', getBottomNavIconSize(), '(reduced from 28 to 24)');
  console.log('  ✅ Center Button Size:', getCenterButtonSize(), '(reduced from 60 to 54)');
  console.log('  ✅ Center Button Icon Size:', getCenterButtonIconSize(), '(reduced from 26 to 26)');
  console.log('  ✅ Bottom Nav Padding v82.0:', 'ZERO extra padding - uses ONLY safe area inset');
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
  getCardAspectRatio,
  getCardImageHeight,
  getButtonBorderRadius,
  getSpacing,
  getStatusBarHeight,
  getSafeAreaTopPadding,
  getBottomNavPaddingBottom,
  getHeaderPaddingTop,
  getHeaderPaddingBottom,
  getHeaderPaddingHorizontal,
  getCardPadding,
  getCardMarginBottom,
  getPixelDensityScale,
  logScalingInfo,
};
