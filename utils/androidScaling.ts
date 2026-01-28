
/**
 * ANDROID SCALING UTILITY - v144.0 - ANDROID COMPACT HEADERS
 * 
 * Centralized scaling system for Android UI parity with iOS.
 * This utility provides platform-specific scaling factors to ensure
 * consistent visual appearance across Android and iOS devices.
 * 
 * CRITICAL FIXES v144.0 - ANDROID COMPACT HEADERS:
 * - ✅ REDUCED header title size to 20sp on Android (matching venue card text)
 * - ✅ REDUCED header icon size to 20dp on Android (more compact)
 * - ✅ Headers now take less vertical space on Android
 * - ✅ Consistent with venue card text sizes
 * 
 * Previous fixes maintained (v143.0):
 * - ✅ Consistent header title size across ALL pages (24sp on Android)
 * - ✅ Consistent header icon size across ALL pages (24dp on Android)
 * - ✅ Added bottom safe area padding for Android navigation buttons
 * - ✅ Keyboard-aware scroll enabled for auth screens
 * - ✅ All modals and screens adapted for Android navigation buttons
 * 
 * Previous fixes maintained (v101.0):
 * - ✅ Added scaleIconSize() for proper icon scaling
 * - ✅ Significantly reduced font sizes on Android (20-25% reduction)
 * - ✅ Reduced header heights and padding to save screen space
 * - ✅ Adjusted all dimensions for better Android responsiveness
 * - ✅ Content no longer appears oversized on Android
 * - ✅ Bottom navigation white stripe eliminated
 * 
 * IMPORTANT: iOS design is the reference - DO NOT modify iOS values
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const getPixelDensityScale = (): number => {
  if (Platform.OS !== 'android') return 1;
  
  const pixelRatio = PixelRatio.get();
  
  if (pixelRatio >= 3.5) return 0.85;
  if (pixelRatio >= 3.0) return 0.90;
  if (pixelRatio >= 2.0) return 0.95;
  if (pixelRatio >= 1.5) return 0.98;
  
  return 1;
};

export const scaleWidth = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const densityScale = getPixelDensityScale();
  
  return Math.round(size * scale * densityScale);
};

export const scaleHeight = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  const densityScale = getPixelDensityScale();
  
  return Math.round(size * scale * densityScale);
};

/**
 * Scale font size with proper density adjustment
 * ✅ CRITICAL FIX v93.0: Significantly reduced font scaling on Android
 */
export const scaleFontSize = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const densityScale = getPixelDensityScale();
  
  return Math.round(size * scale * densityScale * 0.80);
};

/**
 * Scale icon size with proper density adjustment
 * ✅ NEW v101.0: Dedicated icon scaling function
 */
export const scaleIconSize = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const densityScale = getPixelDensityScale();
  
  return Math.round(size * densityScale * 0.92);
};

/**
 * ✅ NEW v144.0: COMPACT header title size for ALL pages
 * Returns 20sp on Android (matching venue card text), original size on iOS
 */
export const getHeaderTitleSize = (): number => {
  if (Platform.OS === 'ios') return 32;
  return 20; // ✅ REDUCED from 24 to 20 for more compact headers
};

/**
 * ✅ NEW v144.0: COMPACT header icon size for ALL pages
 * Returns 20dp on Android (more compact), original size on iOS
 */
export const getHeaderIconSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  return 20; // ✅ REDUCED from 24 to 20 for more compact headers
};

/**
 * ✅ NEW v143.0: Bottom safe area padding for Android navigation buttons
 * Adds extra padding to prevent content from being hidden by Android nav buttons
 */
export const getAndroidNavButtonPadding = (): number => {
  if (Platform.OS !== 'android') return 0;
  return 24; // Extra padding for Android navigation buttons
};

/**
 * ✅ NEW v143.0: Content bottom padding including Android nav buttons
 * Use this for ScrollView contentContainerStyle paddingBottom
 */
export const getContentBottomPadding = (additionalPadding: number = 0): number => {
  if (Platform.OS !== 'android') return additionalPadding;
  return getAndroidNavButtonPadding() + additionalPadding;
};

export const getHeaderHeight = (): number => {
  if (Platform.OS === 'ios') return 110;
  return 100;
};

export const getSearchBoxHeight = (): number => {
  if (Platform.OS === 'ios') return 48;
  return 48;
};

export const getCategoryIconSize = (): number => {
  if (Platform.OS === 'ios') return 56;
  return 56;
};

export const getCategoryIconInnerSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  return 28;
};

export const getCategorySpacing = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 16;
};

export const getCategoryTopPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 4;
};

export const getBottomNavHeight = (): number => {
  if (Platform.OS === 'ios') return 70;
  return 62;
};

export const getBottomNavIconSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  return 24;
};

export const getCenterButtonSize = (): number => {
  if (Platform.OS === 'ios') return 60;
  return 54;
};

export const getCenterButtonIconSize = (): number => {
  if (Platform.OS === 'ios') return 30;
  return 26;
};

export const getContentPadding = (): number => {
  if (Platform.OS === 'ios') return 20;
  return 20;
};

export const getCardBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 16;
};

export const getCardAspectRatio = (): number => {
  return 1.5;
};

export const getCardImageHeight = (): number => {
  if (Platform.OS === 'ios') return 200;
  return 200;
};

export const getButtonBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 12;
  return 12;
};

export const getSpacing = (size: 'small' | 'medium' | 'large'): number => {
  const spacingMap = {
    small: 8,
    medium: 16,
    large: 24,
  };
  
  return spacingMap[size];
};

export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'ios') return 50;
  return 44;
};

export const getSafeAreaTopPadding = (): number => {
  return 0;
};

export const getBottomNavPaddingBottom = (safeAreaBottom: number): number => {
  if (Platform.OS === 'ios') return 20;
  return safeAreaBottom;
};

export const getHeaderPaddingTop = (): number => {
  if (Platform.OS === 'ios') return 50;
  return 44;
};

export const getHeaderPaddingBottom = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 12;
};

export const getHeaderPaddingHorizontal = (): number => {
  if (Platform.OS === 'ios') return 20;
  return 20;
};

export const getCardPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 16;
};

export const getCardMarginBottom = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 16;
};

export const logScalingInfo = () => {
  if (Platform.OS !== 'android') return;
  
  console.log('[AndroidScaling v144.0] 📊 ANDROID COMPACT HEADERS COMPLETE:');
  console.log('  Screen Width:', SCREEN_WIDTH);
  console.log('  Screen Height:', SCREEN_HEIGHT);
  console.log('  Pixel Ratio:', PixelRatio.get());
  console.log('  Density Scale:', getPixelDensityScale());
  console.log('  ✅ Header Title Size:', getHeaderTitleSize(), '(COMPACT 20sp - matching venue cards)');
  console.log('  ✅ Header Icon Size:', getHeaderIconSize(), '(COMPACT 20dp - more compact)');
  console.log('  ✅ Android Nav Button Padding:', getAndroidNavButtonPadding(), 'dp');
  console.log('  ✅ Font Scaling:', '0.80 (20% reduction for better responsiveness)');
  console.log('  ✅ Icon Scaling:', '0.92 (8% reduction for better proportions)');
  console.log('  ✅ Header Height:', getHeaderHeight(), '(reduced from 120 to 100)');
  console.log('  ✅ Status Bar Height:', getStatusBarHeight(), '(reduced from 50 to 44)');
  console.log('  ✅ Header Padding Top:', getHeaderPaddingTop(), '(reduced from 50 to 44)');
  console.log('  ✅ Header Padding Bottom:', getHeaderPaddingBottom(), '(reduced from 16 to 12)');
  console.log('  ✅ Bottom Nav Height:', getBottomNavHeight(), '(62 - compact design)');
  console.log('  ✅ Bottom Nav Icon Size:', getBottomNavIconSize(), '(24)');
  console.log('  ✅ Center Button Size:', getCenterButtonSize(), '(54)');
  console.log('  ✅ Center Button Icon Size:', getCenterButtonIconSize(), '(26)');
  console.log('  ✅ Bottom Nav Padding:', 'Uses safe area bottom directly (no gap with system buttons)');
  console.log('  ✅ White Box:', 'ELIMINATED - removed contentContainer padding');
  console.log('  ✅ Keyboard Scroll:', 'ENABLED for auth screens');
  console.log('  ✅ Android Nav Buttons:', 'ACCOUNTED FOR with extra bottom padding');
};

export default {
  scaleWidth,
  scaleHeight,
  scaleFontSize,
  scaleIconSize,
  getHeaderTitleSize,
  getHeaderIconSize,
  getAndroidNavButtonPadding,
  getContentBottomPadding,
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
