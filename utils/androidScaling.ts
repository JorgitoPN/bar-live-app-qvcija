
/**
 * ANDROID SCALING UTILITY - v280.0 - COMPREHENSIVE ANDROID SCALING FIX
 * 
 * CRITICAL FIXES v280.0 - COMPREHENSIVE ANDROID SCALING:
 * - ✅ INCREASED global scale factor to 0.88 (from 0.82) for better readability
 * - ✅ REFINED font scaling to 0.85 (from 0.80) for better text appearance
 * - ✅ REFINED icon scaling to 0.90 (from 0.92) for better proportions
 * - ✅ ADDED letter spacing function for cleaner text rendering on Android
 * - ✅ ADDED modal margin function for proper spacing
 * - ✅ ADDED elevation reduction function for subtle shadows
 * - ✅ REDUCED header sizes for more compact appearance
 * - ✅ REDUCED button heights and paddings
 * - ✅ REDUCED badge sizes for better proportions
 * - ✅ REDUCED marker sizes for map elements
 * - ✅ ALL dimensions now properly scaled for Android
 * 
 * IMPORTANT: iOS design is the reference - DO NOT modify iOS values
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// ✅ NEW v280.0: INCREASED global scale factor for better readability
const ANDROID_GLOBAL_SCALE = 0.88; // Increased from 0.82

export const getPixelDensityScale = (): number => {
  if (Platform.OS !== 'android') return 1;
  
  const pixelRatio = PixelRatio.get();
  
  // ✅ NEW v280.0: Refined density scaling
  if (pixelRatio >= 3.5) return 0.88; // Increased from 0.85
  if (pixelRatio >= 3.0) return 0.92; // Increased from 0.90
  if (pixelRatio >= 2.0) return 0.96; // Increased from 0.95
  if (pixelRatio >= 1.5) return 0.98;
  
  return 1;
};

export const scaleWidth = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const densityScale = getPixelDensityScale();
  
  return Math.round(size * scale * densityScale * ANDROID_GLOBAL_SCALE);
};

export const scaleHeight = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  const densityScale = getPixelDensityScale();
  
  return Math.round(size * scale * densityScale * ANDROID_GLOBAL_SCALE);
};

/**
 * ✅ NEW v280.0: Scale font size with REFINED density adjustment
 * Increased from 0.80 to 0.85 for better readability
 */
export const scaleFontSize = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const densityScale = getPixelDensityScale();
  
  // ✅ REFINED: 0.85 instead of 0.80 for better text appearance
  return Math.round(size * scale * densityScale * 0.85);
};

/**
 * ✅ NEW v280.0: Scale icon size with REFINED density adjustment
 * Reduced from 0.92 to 0.90 for better proportions
 */
export const scaleIconSize = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const densityScale = getPixelDensityScale();
  
  // ✅ REFINED: 0.90 instead of 0.92 for better icon proportions
  return Math.round(size * densityScale * 0.90);
};

/**
 * ✅ NEW v280.0: Letter spacing for cleaner text rendering on Android
 * Android renders fonts differently - adding subtle letter spacing improves readability
 */
export const getLetterSpacing = (fontSize: number): number => {
  if (Platform.OS !== 'android') return 0;
  
  // ✅ Subtle letter spacing (2% of font size) for cleaner text
  return fontSize * 0.02;
};

/**
 * ✅ NEW v280.0: Elevation reduction for subtle shadows on Android
 * Android shadows are too heavy by default - reduce them for iOS-like appearance
 */
export const getElevation = (elevation: number): number => {
  if (Platform.OS !== 'android') return 0;
  
  // ✅ Reduce elevation by 50% for subtle shadows
  return Math.max(0, Math.round(elevation * 0.5));
};

/**
 * ✅ NEW v280.0: Modal horizontal margin for Android
 * Modals should not touch screen edges on Android
 */
export const getModalHorizontalMargin = (): number => {
  if (Platform.OS !== 'android') return 0;
  return 20; // 20px margin on each side
};

/**
 * ✅ NEW v280.0: Border radius scaling
 */
export const scaleBorderRadius = (radius: number): number => {
  if (Platform.OS !== 'android') return radius;
  return Math.round(radius * ANDROID_GLOBAL_SCALE);
};

/**
 * ✅ NEW v280.0: COMPACT header title size for ALL pages
 * Returns 18sp on Android (reduced from 20sp), original size on iOS
 */
export const getHeaderTitleSize = (): number => {
  if (Platform.OS === 'ios') return 32;
  return 18; // ✅ REDUCED from 20 to 18 for more compact headers
};

/**
 * ✅ NEW v280.0: COMPACT header icon size for ALL pages
 * Returns 18dp on Android (reduced from 20dp), original size on iOS
 */
export const getHeaderIconSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  return 18; // ✅ REDUCED from 20 to 18 for more compact headers
};

/**
 * ✅ NEW v280.0: Button height scaling
 */
export const getButtonHeight = (): number => {
  if (Platform.OS === 'ios') return 48;
  return 44; // ✅ REDUCED for more compact buttons
};

/**
 * ✅ NEW v280.0: Button padding scaling
 */
export const getButtonPaddingVertical = (): number => {
  if (Platform.OS === 'ios') return 14;
  return 12; // ✅ REDUCED for more compact buttons
};

/**
 * ✅ NEW v280.0: Badge padding scaling
 */
export const getBadgePaddingHorizontal = (): number => {
  if (Platform.OS === 'ios') return 12;
  return 10; // ✅ REDUCED for more compact badges
};

export const getBadgePaddingVertical = (): number => {
  if (Platform.OS === 'ios') return 6;
  return 5; // ✅ REDUCED for more compact badges
};

/**
 * ✅ NEW v280.0: Map marker size scaling
 */
export const getMapMarkerSize = (): number => {
  if (Platform.OS === 'ios') return 40;
  return 32; // ✅ REDUCED for smaller map markers
};

/**
 * ✅ NEW v280.0: User location marker size scaling
 */
export const getUserLocationMarkerSize = (): number => {
  if (Platform.OS === 'ios') return 32;
  return 28; // ✅ REDUCED for smaller user location marker
};

/**
 * ✅ NEW v280.0: Modal padding scaling
 */
export const getModalPadding = (): number => {
  if (Platform.OS === 'ios') return 20;
  return 16; // ✅ REDUCED for more compact modals
};

/**
 * ✅ NEW v280.0: Input height scaling
 */
export const getInputHeight = (): number => {
  if (Platform.OS === 'ios') return 48;
  return 44; // ✅ REDUCED for more compact inputs
};

/**
 * ✅ v143.0: Bottom safe area padding for Android navigation buttons
 * Adds extra padding to prevent content from being hidden by Android nav buttons
 */
export const getAndroidNavButtonPadding = (): number => {
  if (Platform.OS !== 'android') return 0;
  return 24; // Extra padding for Android navigation buttons
};

/**
 * ✅ v143.0: Content bottom padding including Android nav buttons
 * Use this for ScrollView contentContainerStyle paddingBottom
 */
export const getContentBottomPadding = (additionalPadding: number = 0): number => {
  if (Platform.OS !== 'android') return additionalPadding;
  return getAndroidNavButtonPadding() + additionalPadding;
};

export const getHeaderHeight = (): number => {
  if (Platform.OS === 'ios') return 110;
  return 95; // ✅ REDUCED from 100 to 95
};

export const getSearchBoxHeight = (): number => {
  if (Platform.OS === 'ios') return 48;
  return 44; // ✅ REDUCED from 48 to 44
};

export const getCategoryIconSize = (): number => {
  if (Platform.OS === 'ios') return 56;
  return 48; // ✅ REDUCED from 56 to 48
};

export const getCategoryIconInnerSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  return 24; // ✅ REDUCED from 28 to 24
};

export const getCategorySpacing = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 12; // ✅ REDUCED from 16 to 12
};

export const getCategoryTopPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 4;
};

export const getBottomNavHeight = (): number => {
  if (Platform.OS === 'ios') return 70;
  return 60; // ✅ REDUCED from 62 to 60
};

export const getBottomNavIconSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  return 22; // ✅ REDUCED from 24 to 22
};

export const getCenterButtonSize = (): number => {
  if (Platform.OS === 'ios') return 60;
  return 52; // ✅ REDUCED from 54 to 52
};

export const getCenterButtonIconSize = (): number => {
  if (Platform.OS === 'ios') return 30;
  return 24; // ✅ REDUCED from 26 to 24
};

export const getContentPadding = (): number => {
  if (Platform.OS === 'ios') return 20;
  return 16; // ✅ REDUCED from 20 to 16
};

export const getCardBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 14; // ✅ REDUCED from 16 to 14
};

export const getCardAspectRatio = (): number => {
  return 1.5;
};

export const getCardImageHeight = (): number => {
  if (Platform.OS === 'ios') return 200;
  return 180; // ✅ REDUCED from 200 to 180
};

export const getButtonBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 12;
  return 10; // ✅ REDUCED from 12 to 10
};

export const getSpacing = (size: 'small' | 'medium' | 'large'): number => {
  if (Platform.OS === 'ios') {
    const spacingMap = {
      small: 8,
      medium: 16,
      large: 24,
    };
    return spacingMap[size];
  }
  
  // ✅ REDUCED spacing on Android
  const spacingMap = {
    small: 6,
    medium: 12,
    large: 20,
  };
  return spacingMap[size];
};

export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'ios') return 50;
  return 40; // ✅ REDUCED from 44 to 40
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
  return 36; // ✅ REDUCED from 44 to 36
};

export const getHeaderPaddingBottom = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 8; // ✅ REDUCED from 12 to 8
};

export const getHeaderPaddingHorizontal = (): number => {
  if (Platform.OS === 'ios') return 20;
  return 16; // ✅ REDUCED from 20 to 16
};

export const getCardPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 14; // ✅ REDUCED from 16 to 14
};

export const getCardMarginBottom = (): number => {
  if (Platform.OS === 'ios') return 16;
  return 14; // ✅ REDUCED from 16 to 14
};

export const logScalingInfo = () => {
  if (Platform.OS !== 'android') return;
  
  console.log('[AndroidScaling v280.0] 📊 COMPREHENSIVE ANDROID SCALING COMPLETE:');
  console.log('  Screen Width:', SCREEN_WIDTH);
  console.log('  Screen Height:', SCREEN_HEIGHT);
  console.log('  Pixel Ratio:', PixelRatio.get());
  console.log('  Density Scale:', getPixelDensityScale());
  console.log('  ✅ Global Scale Factor:', ANDROID_GLOBAL_SCALE, '(INCREASED from 0.82 to 0.88)');
  console.log('  ✅ Font Scaling:', '0.85 (REFINED from 0.80 for better readability)');
  console.log('  ✅ Icon Scaling:', '0.90 (REFINED from 0.92 for better proportions)');
  console.log('  ✅ Letter Spacing:', '2% of font size (cleaner text rendering)');
  console.log('  ✅ Elevation Reduction:', '50% (subtle shadows like iOS)');
  console.log('  ✅ Modal Margins:', '20px horizontal (floating appearance)');
  console.log('  ✅ Header Title Size:', getHeaderTitleSize(), 'sp (COMPACT 18sp)');
  console.log('  ✅ Header Icon Size:', getHeaderIconSize(), 'dp (COMPACT 18dp)');
  console.log('  ✅ Button Height:', getButtonHeight(), 'dp (REDUCED to 44dp)');
  console.log('  ✅ Input Height:', getInputHeight(), 'dp (REDUCED to 44dp)');
  console.log('  ✅ Badge Padding:', getBadgePaddingHorizontal(), 'x', getBadgePaddingVertical(), 'dp');
  console.log('  ✅ Map Marker Size:', getMapMarkerSize(), 'dp (REDUCED to 32dp)');
  console.log('  ✅ User Location Marker:', getUserLocationMarkerSize(), 'dp (REDUCED to 28dp)');
  console.log('  ✅ Card Border Radius:', getCardBorderRadius(), 'dp (REDUCED to 14dp)');
  console.log('  ✅ Card Image Height:', getCardImageHeight(), 'dp (REDUCED to 180dp)');
  console.log('  ✅ Content Padding:', getContentPadding(), 'dp (REDUCED to 16dp)');
  console.log('  ✅ Spacing Small:', getSpacing('small'), 'dp (REDUCED to 6dp)');
  console.log('  ✅ Spacing Medium:', getSpacing('medium'), 'dp (REDUCED to 12dp)');
  console.log('  ✅ Spacing Large:', getSpacing('large'), 'dp (REDUCED to 20dp)');
};

export default {
  scaleWidth,
  scaleHeight,
  scaleFontSize,
  scaleIconSize,
  getLetterSpacing,
  getElevation,
  getModalHorizontalMargin,
  scaleBorderRadius,
  getHeaderTitleSize,
  getHeaderIconSize,
  getButtonHeight,
  getButtonPaddingVertical,
  getBadgePaddingHorizontal,
  getBadgePaddingVertical,
  getMapMarkerSize,
  getUserLocationMarkerSize,
  getModalPadding,
  getInputHeight,
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
