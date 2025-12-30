
/**
 * ANDROID SCALING UTILITY - v75.0
 * 
 * Centralized scaling system for Android UI parity with iOS.
 * This utility provides platform-specific scaling factors to ensure
 * consistent visual appearance across Android and iOS devices.
 * 
 * CRITICAL FIXES:
 * - ✅ Proper pixel density handling for Android
 * - ✅ Consistent header heights across platforms
 * - ✅ Proper bottom navigation bar sizing
 * - ✅ Adaptive spacing and padding
 * - ✅ Category icon sizing and spacing
 * - ✅ Search box height normalization
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
  if (pixelRatio >= 3.5) return 0.85; // xxxhdpi devices
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
  
  // Android header should be slightly shorter to match iOS visual weight
  return scaleHeight(100);
};

/**
 * Get platform-specific search box height
 */
export const getSearchBoxHeight = (): number => {
  if (Platform.OS === 'ios') return 48;
  
  // Android search box should match iOS height
  return 44; // Slightly reduced for Android
};

/**
 * Get platform-specific category icon container size
 */
export const getCategoryIconSize = (): number => {
  if (Platform.OS === 'ios') return 56;
  
  // Android category icons should match iOS size
  return 54; // Slightly reduced for Android
};

/**
 * Get platform-specific category icon size (the actual icon)
 */
export const getCategoryIconInnerSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  
  // Android category icon inner size
  return scaleIconSize(26);
};

/**
 * Get platform-specific spacing between categories
 */
export const getCategorySpacing = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android category spacing
  return 14;
};

/**
 * Get platform-specific top padding for category section
 */
export const getCategoryTopPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android needs less top padding to prevent collision with header
  return 12;
};

/**
 * Get platform-specific bottom navigation bar height
 */
export const getBottomNavHeight = (): number => {
  if (Platform.OS === 'ios') return 80;
  
  // Android bottom nav should be proportional
  return 70; // Reduced height for Android
};

/**
 * Get platform-specific bottom navigation icon size
 */
export const getBottomNavIconSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  
  // Android bottom nav icons
  return scaleIconSize(26);
};

/**
 * Get platform-specific center button size (Explorar button)
 */
export const getCenterButtonSize = (): number => {
  if (Platform.OS === 'ios') return 60;
  
  // Android center button
  return 56; // Slightly smaller for Android
};

/**
 * Get platform-specific center button icon size
 */
export const getCenterButtonIconSize = (): number => {
  if (Platform.OS === 'ios') return 30;
  
  // Android center button icon
  return scaleIconSize(28);
};

/**
 * Get platform-specific padding for content
 */
export const getContentPadding = (): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android content padding
  return 18;
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
    small: Platform.OS === 'ios' ? 8 : 7,
    medium: Platform.OS === 'ios' ? 16 : 14,
    large: Platform.OS === 'ios' ? 24 : 20,
  };
  
  return spacingMap[size];
};

/**
 * Get platform-specific status bar height
 */
export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'ios') return 50;
  
  // Android status bar height
  return 40;
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
 * This controls how much the background extends above the center button
 */
export const getBottomNavBackgroundOverlap = (): number => {
  if (Platform.OS === 'ios') return 0;
  
  // Android: background should stop at 75% of center button height
  const centerButtonSize = getCenterButtonSize();
  return -(centerButtonSize * 0.25); // Negative to reduce overlap
};

/**
 * Get platform-specific bottom navigation padding bottom
 */
export const getBottomNavPaddingBottom = (safeAreaBottom: number): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android: use safe area bottom or minimum padding
  return Math.max(safeAreaBottom, 12);
};

/**
 * Debug function to log current scaling factors
 */
export const logScalingInfo = () => {
  if (Platform.OS !== 'android') return;
  
  console.log('[AndroidScaling v75.0] 📊 Scaling Information:');
  console.log('  Screen Width:', SCREEN_WIDTH);
  console.log('  Screen Height:', SCREEN_HEIGHT);
  console.log('  Pixel Ratio:', PixelRatio.get());
  console.log('  Density Scale:', getPixelDensityScale());
  console.log('  Header Height:', getHeaderHeight());
  console.log('  Search Box Height:', getSearchBoxHeight());
  console.log('  Category Icon Size:', getCategoryIconSize());
  console.log('  Bottom Nav Height:', getBottomNavHeight());
  console.log('  Bottom Nav Icon Size:', getBottomNavIconSize());
  console.log('  Center Button Size:', getCenterButtonSize());
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
