
/**
 * ANDROID SCALING UTILITY - v79.0
 * 
 * Centralized scaling system for Android UI parity with iOS.
 * This utility provides platform-specific scaling factors to ensure
 * consistent visual appearance across Android and iOS devices.
 * 
 * CRITICAL FIXES v79.0 (ANDROID ONLY):
 * - ✅ Bottom nav height increased by 20% (84 instead of 70)
 * - ✅ Icons properly visible with adjusted z-index and positioning
 * - ✅ Category top padding further reduced (8 instead of 12)
 * - ✅ All dimensions optimized for Android-iOS parity
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
 * ✅ FIXED v79.0: Matches iOS exactly
 */
export const getHeaderHeight = (): number => {
  if (Platform.OS === 'ios') return 110;
  
  // Android header matches iOS
  return 110;
};

/**
 * Get platform-specific search box height
 * ✅ FIXED v79.0: Matches iOS proportions
 */
export const getSearchBoxHeight = (): number => {
  if (Platform.OS === 'ios') return 48;
  
  // Android search box matches iOS
  return 48;
};

/**
 * Get platform-specific category icon container size
 * ✅ FIXED v79.0: Matches iOS visual weight
 */
export const getCategoryIconSize = (): number => {
  if (Platform.OS === 'ios') return 56;
  
  // Android category icons match iOS
  return 56;
};

/**
 * Get platform-specific category icon size (the actual icon)
 * ✅ FIXED v79.0: Matches iOS proportions
 */
export const getCategoryIconInnerSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  
  // Android category icon inner size matches iOS
  return 28;
};

/**
 * Get platform-specific spacing between categories
 * ✅ FIXED v79.0: Matches iOS spacing
 */
export const getCategorySpacing = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android category spacing matches iOS
  return 16;
};

/**
 * Get platform-specific top padding for category section
 * ✅ ANDROID FIX v79.0: Further reduced to 8 for even tighter spacing
 */
export const getCategoryTopPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android category top padding further reduced for tighter spacing
  return 8; // Reduced from 12 to bring categories even closer to header
};

/**
 * Get platform-specific bottom navigation bar height
 * ✅ ANDROID FIX v79.0: Increased by 20% (84 instead of 70)
 */
export const getBottomNavHeight = (): number => {
  if (Platform.OS === 'ios') return 80;
  
  // Android bottom nav increased by 20% for better visibility
  return 84; // Increased from 70 to 84 (20% increase)
};

/**
 * Get platform-specific bottom navigation icon size
 * ✅ FIXED v79.0: Matches iOS icon size
 */
export const getBottomNavIconSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  
  // Android bottom nav icons match iOS
  return 28;
};

/**
 * Get platform-specific center button size (Explorar button)
 * ✅ FIXED v79.0: Matches iOS sizing
 */
export const getCenterButtonSize = (): number => {
  if (Platform.OS === 'ios') return 60;
  
  // Android center button matches iOS
  return 60;
};

/**
 * Get platform-specific center button icon size
 * ✅ FIXED v79.0: Matches iOS icon size
 */
export const getCenterButtonIconSize = (): number => {
  if (Platform.OS === 'ios') return 30;
  
  // Android center button icon matches iOS
  return 30;
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
 * ✅ FIXED v79.0: Matches iOS height
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
  if (Platform.OS === 'ios') return 0;
  
  // Android doesn't need extra top padding with proper status bar handling
  return 0;
};

/**
 * Get platform-specific bottom navigation background overlap
 * ✅ FIXED v79.0: No overlap on Android - background stops at icon level
 */
export const getBottomNavBackgroundOverlap = (): number => {
  if (Platform.OS === 'ios') return 0;
  
  // Android: no overlap, background stops at icon level
  return 0;
};

/**
 * Get platform-specific bottom navigation padding bottom
 * ✅ ANDROID FIX v79.0: Adjusted for new height
 */
export const getBottomNavPaddingBottom = (safeAreaBottom: number): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android: adjusted padding for new height
  return 12; // Increased from 8 to accommodate taller nav bar
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
  console.log('  ✅ Category Top Padding:', getCategoryTopPadding(), '(Android: 8, tighter spacing)');
  console.log('  ✅ Bottom Nav Height:', getBottomNavHeight(), '(Android: 84, 20% increase)');
  console.log('  ✅ Bottom Nav Icon Size:', getBottomNavIconSize(), '(matches iOS: 28)');
  console.log('  ✅ Center Button Size:', getCenterButtonSize(), '(matches iOS: 60)');
  console.log('  ✅ Center Button Icon Size:', getCenterButtonIconSize(), '(matches iOS: 30)');
  console.log('  ✅ Status Bar Height:', getStatusBarHeight(), '(matches iOS: 50)');
  console.log('  ✅ Bottom Nav Padding Bottom:', getBottomNavPaddingBottom(0), '(Android: 12, adjusted)');
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
