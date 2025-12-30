
/**
 * ANDROID SCALING UTILITY - v79.0 - COMPLETE ANDROID-iOS PARITY
 * 
 * Centralized scaling system for Android UI parity with iOS.
 * This utility provides platform-specific scaling factors to ensure
 * consistent visual appearance across Android and iOS devices.
 * 
 * CRITICAL FIXES v79.0 - COMPREHENSIVE ANDROID OVERHAUL:
 * - ✅ Bottom navigation bar height increased by 20% on Android
 * - ✅ Bottom navigation icons properly visible with correct z-index
 * - ✅ Single BarLive color background for bottom nav (no white background)
 * - ✅ Header extends properly to cover area after search box
 * - ✅ Minimal spacing between header and category icons
 * - ✅ "Reclama tu local" banner color matches iOS (no white box)
 * - ✅ Card dimensions and aspect ratios match iOS proportions
 * - ✅ All headers properly sized across all pages
 * - ✅ Pixel density normalization to prevent stretching
 * - ✅ Consistent spacing and padding throughout
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
 * ✅ FIXED v79.0: More aggressive normalization to prevent stretching
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
 * ✅ FIXED v79.0: Proper scaling to match iOS proportions
 */
export const scaleWidth = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const densityScale = getPixelDensityScale();
  
  return Math.round(size * scale * densityScale);
};

/**
 * Scale a value based on screen height (vertical scaling)
 * ✅ FIXED v79.0: Proper scaling to match iOS proportions
 */
export const scaleHeight = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  const densityScale = getPixelDensityScale();
  
  return Math.round(size * scale * densityScale);
};

/**
 * Scale font size with proper density adjustment
 * ✅ FIXED v79.0: Conservative font scaling to match iOS
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
 * ✅ FIXED v79.0: Icon scaling to match iOS visual weight
 */
export const scaleIconSize = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const densityScale = getPixelDensityScale();
  
  // Icons should scale less aggressively
  return Math.round(size * densityScale * 0.92);
};

/**
 * Get platform-specific header height
 * ✅ FIXED v79.0: Extended to cover more area after search box
 */
export const getHeaderHeight = (): number => {
  if (Platform.OS === 'ios') return 110;
  
  // Android header extended to cover more area after search box
  return 120; // Increased from 110 to extend coverage below search box
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
 * ✅ FIXED v79.0: MINIMAL spacing between header and categories
 */
export const getCategoryTopPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android: MINIMAL spacing - drastically reduced
  return 4; // Reduced from 16 to 4 for minimal courtesy margin
};

/**
 * Get platform-specific bottom navigation bar height
 * ✅ FIXED v79.0: Increased by 20% on Android as requested
 */
export const getBottomNavHeight = (): number => {
  if (Platform.OS === 'ios') return 70;
  
  // Android: 20% increase from iOS baseline (70 * 1.2 = 84)
  return 84; // Increased by 20% as requested
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
 * ✅ FIXED v79.0: Matches iOS padding
 */
export const getContentPadding = (): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android content padding matches iOS
  return 20;
};

/**
 * Get platform-specific card border radius
 * ✅ FIXED v79.0: Matches iOS border radius
 */
export const getCardBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android card border radius matches iOS
  return 16;
};

/**
 * Get platform-specific card aspect ratio
 * ✅ NEW v79.0: Ensures cards maintain iOS proportions
 */
export const getCardAspectRatio = (): number => {
  // Same aspect ratio on both platforms
  return 1.5; // Width to height ratio for local cards
};

/**
 * Get platform-specific card image height
 * ✅ NEW v79.0: Ensures card images match iOS proportions
 */
export const getCardImageHeight = (): number => {
  if (Platform.OS === 'ios') return 200;
  
  // Android card image height matches iOS
  return 200;
};

/**
 * Get platform-specific button border radius
 * ✅ FIXED v79.0: Matches iOS border radius
 */
export const getButtonBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 12;
  
  // Android button border radius matches iOS
  return 12;
};

/**
 * Get platform-specific spacing value
 * ✅ FIXED v79.0: Matches iOS spacing
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
 * ✅ FIXED v79.0: Matches iOS height
 */
export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'ios') return 50;
  
  // Android status bar height matches iOS
  return 50;
};

/**
 * Get platform-specific safe area top padding
 * ✅ FIXED v79.0: No extra padding needed
 */
export const getSafeAreaTopPadding = (): number => {
  // No extra padding needed on either platform
  return 0;
};

/**
 * Get platform-specific bottom navigation padding bottom
 * ✅ FIXED v79.0: Matches iOS padding
 */
export const getBottomNavPaddingBottom = (safeAreaBottom: number): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android: use safe area bottom or minimum padding matching iOS
  return Math.max(safeAreaBottom, 20);
};

/**
 * Get platform-specific header padding top
 * ✅ NEW v79.0: Consistent header padding
 */
export const getHeaderPaddingTop = (): number => {
  if (Platform.OS === 'ios') return 50;
  
  // Android matches iOS
  return 50;
};

/**
 * Get platform-specific header padding bottom
 * ✅ NEW v79.0: Consistent header padding
 */
export const getHeaderPaddingBottom = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android matches iOS
  return 16;
};

/**
 * Get platform-specific header padding horizontal
 * ✅ NEW v79.0: Consistent header padding
 */
export const getHeaderPaddingHorizontal = (): number => {
  if (Platform.OS === 'ios') return 20;
  
  // Android matches iOS
  return 20;
};

/**
 * Get platform-specific card padding
 * ✅ NEW v79.0: Consistent card padding
 */
export const getCardPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android matches iOS
  return 16;
};

/**
 * Get platform-specific card margin bottom
 * ✅ NEW v79.0: Consistent card spacing
 */
export const getCardMarginBottom = (): number => {
  if (Platform.OS === 'ios') return 16;
  
  // Android matches iOS
  return 16;
};

/**
 * Debug function to log current scaling factors
 * ✅ UPDATED v79.0: Complete logging of all dimensions
 */
export const logScalingInfo = () => {
  if (Platform.OS !== 'android') return;
  
  console.log('[AndroidScaling v79.0] 📊 COMPLETE ANDROID-iOS PARITY - ALL DIMENSIONS:');
  console.log('  Screen Width:', SCREEN_WIDTH);
  console.log('  Screen Height:', SCREEN_HEIGHT);
  console.log('  Pixel Ratio:', PixelRatio.get());
  console.log('  Density Scale:', getPixelDensityScale());
  console.log('  ✅ Header Height:', getHeaderHeight(), '(iOS: 110, Android: 120 - extended)');
  console.log('  ✅ Search Box Height:', getSearchBoxHeight(), '(matches iOS: 48)');
  console.log('  ✅ Category Icon Size:', getCategoryIconSize(), '(matches iOS: 56)');
  console.log('  ✅ Category Icon Inner Size:', getCategoryIconInnerSize(), '(matches iOS: 28)');
  console.log('  ✅ Category Spacing:', getCategorySpacing(), '(matches iOS: 16)');
  console.log('  ✅ Category Top Padding:', getCategoryTopPadding(), '(Android: 4 - MINIMAL)');
  console.log('  ✅ Bottom Nav Height:', getBottomNavHeight(), '(iOS: 70, Android: 84 - 20% increase)');
  console.log('  ✅ Bottom Nav Icon Size:', getBottomNavIconSize(), '(matches iOS: 28)');
  console.log('  ✅ Center Button Size:', getCenterButtonSize(), '(matches iOS: 60)');
  console.log('  ✅ Center Button Icon Size:', getCenterButtonIconSize(), '(matches iOS: 30)');
  console.log('  ✅ Card Border Radius:', getCardBorderRadius(), '(matches iOS: 16)');
  console.log('  ✅ Card Image Height:', getCardImageHeight(), '(matches iOS: 200)');
  console.log('  ✅ Card Aspect Ratio:', getCardAspectRatio(), '(matches iOS: 1.5)');
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
