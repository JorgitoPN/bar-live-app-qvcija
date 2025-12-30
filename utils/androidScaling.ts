
/**
 * ANDROID SCALING UTILITY - v76.0
 * 
 * Centralized scaling system for Android UI parity with iOS.
 * This utility provides platform-specific scaling factors to ensure
 * consistent visual appearance across Android and iOS devices.
 * 
 * CRITICAL FIXES v76.0:
 * - ✅ Reduced header height to match iOS visual weight
 * - ✅ Proper search box height (reduced from 44 to 40)
 * - ✅ Category icons sized correctly (48 instead of 54)
 * - ✅ Reduced category spacing (10 instead of 14)
 * - ✅ Proper top padding to prevent header collision (8 instead of 12)
 * - ✅ Bottom nav background stops at 75% of center button
 * - ✅ Icons properly centered in bottom navigation
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
 * ✅ FIXED v76.0: Reduced to match iOS visual weight
 */
export const getHeaderHeight = (): number => {
  if (Platform.OS === 'ios') return 110;
  
  // Android header reduced to match iOS proportions
  return 95; // Reduced from 100
};

/**
 * Get platform-specific search box height
 * ✅ FIXED v76.0: Reduced to match iOS proportions
 */
export const getSearchBoxHeight = (): number => {
  if (Platform.OS === 'ios') return 48;
  
  // Android search box reduced to match iOS
  return 40; // Reduced from 44
};

/**
 * Get platform-specific category icon container size
 * ✅ FIXED v76.0: Reduced to match iOS visual weight
 */
export const getCategoryIconSize = (): number => {
  if (Platform.OS === 'ios') return 56;
  
  // Android category icons reduced to match iOS
  return 48; // Reduced from 54
};

/**
 * Get platform-specific category icon size (the actual icon)
 * ✅ FIXED v76.0: Proportionally reduced
 */
export const getCategoryIconInnerSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  
  // Android category icon inner size proportionally reduced
  return scaleIconSize(24); // Reduced from 26
};

/**
 * Get platform-specific spacing between categories
 * ✅ FIXED v76.0: Reduced to prevent excessive spacing
 */
export const getCategorySpacing = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android category spacing reduced
  return 10; // Reduced from 14
};

/**
 * Get platform-specific top padding for category section
 * ✅ FIXED v76.0: Reduced to prevent collision with header
 */
export const getCategoryTopPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android needs less top padding to prevent collision with header
  return 8; // Reduced from 12
};

/**
 * Get platform-specific bottom navigation bar height
 * ✅ FIXED v76.0: Proper height for Android
 */
export const getBottomNavHeight = (): number => {
  if (Platform.OS === 'ios') return 80;
  
  // Android bottom nav proportional height
  return 68; // Reduced from 70
};

/**
 * Get platform-specific bottom navigation icon size
 * ✅ FIXED v76.0: Proper icon sizing for centering
 */
export const getBottomNavIconSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  
  // Android bottom nav icons
  return scaleIconSize(25); // Reduced from 26
};

/**
 * Get platform-specific center button size (Explorar button)
 * ✅ FIXED v76.0: Proper sizing for Android
 */
export const getCenterButtonSize = (): number => {
  if (Platform.OS === 'ios') return 60;
  
  // Android center button
  return 54; // Reduced from 56
};

/**
 * Get platform-specific center button icon size
 * ✅ FIXED v76.0: Proportionally adjusted
 */
export const getCenterButtonIconSize = (): number => {
  if (Platform.OS === 'ios') return 30;
  
  // Android center button icon
  return scaleIconSize(27); // Reduced from 28
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
 * ✅ FIXED v76.0: Reduced for Android
 */
export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'ios') return 50;
  
  // Android status bar height reduced
  return 35; // Reduced from 40
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
 * ✅ FIXED v76.0: Proper padding for Android
 */
export const getBottomNavPaddingBottom = (safeAreaBottom: number): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android: use safe area bottom or minimum padding
  return Math.max(safeAreaBottom, 10); // Reduced from 12
};

/**
 * Debug function to log current scaling factors
 */
export const logScalingInfo = () => {
  if (Platform.OS !== 'android') return;
  
  console.log('[AndroidScaling v76.0] 📊 Scaling Information:');
  console.log('  Screen Width:', SCREEN_WIDTH);
  console.log('  Screen Height:', SCREEN_HEIGHT);
  console.log('  Pixel Ratio:', PixelRatio.get());
  console.log('  Density Scale:', getPixelDensityScale());
  console.log('  Header Height:', getHeaderHeight());
  console.log('  Search Box Height:', getSearchBoxHeight());
  console.log('  Category Icon Size:', getCategoryIconSize());
  console.log('  Category Icon Inner Size:', getCategoryIconInnerSize());
  console.log('  Category Spacing:', getCategorySpacing());
  console.log('  Category Top Padding:', getCategoryTopPadding());
  console.log('  Bottom Nav Height:', getBottomNavHeight());
  console.log('  Bottom Nav Icon Size:', getBottomNavIconSize());
  console.log('  Center Button Size:', getCenterButtonSize());
  console.log('  Center Button Icon Size:', getCenterButtonIconSize());
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
