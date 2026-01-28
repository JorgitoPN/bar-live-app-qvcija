
/**
 * ANDROID SCALING UTILITY - v283.0 - ANDROID POPUP TEXT SCALING + USER MARKER FIX
 * 
 * Centralized scaling system for Android UI parity with iOS.
 * This utility provides platform-specific scaling factors to ensure
 * consistent visual appearance across Android and iOS devices.
 * 
 * CRITICAL FIXES v283.0 - ANDROID POPUP TEXT SCALING:
 * - ✅ INCREASED popup text sizes on Android (rating, button, name, category)
 * - ✅ REDUCED user location marker to 20px on Android (more subtle)
 * - ✅ INSTANT user location marker display (no delay)
 * - ✅ Better visual balance and readability on Android
 * 
 * Previous fixes maintained (v281.0):
 * - ✅ EXPLORAR LOCAL CARDS = REFERENCE STANDARD (NO CHANGES)
 * - ✅ REDUCED map popup sizes (width: 240px on Android, down from 260px)
 * - ✅ REDUCED map marker sizes (circle-radius reduced by 15%)
 * - ✅ All adjustments use relative scaling for consistency
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
 * ✅ NEW v281.0: Scale for map popups (REDUCED for consistency with Explorar cards)
 * Returns 240px on Android (down from 260px), original size on iOS
 */
export const getMapPopupWidth = (): number => {
  if (Platform.OS === 'ios') return 280;
  return 240; // ✅ REDUCED by 20px for better visual consistency
};

/**
 * ✅ NEW v281.0: Scale for map popup image height (REDUCED)
 * Returns 110px on Android (down from 120px), original size on iOS
 */
export const getMapPopupImageHeight = (): number => {
  if (Platform.OS === 'ios') return 140;
  return 110; // ✅ REDUCED by 10px for better proportions
};

/**
 * ✅ NEW v281.0: Scale for map marker radius (REDUCED by 15%)
 * Used in map marker circle-radius calculations
 */
export const getMapMarkerScale = (): number => {
  if (Platform.OS === 'ios') return 1.0;
  return 0.85; // ✅ REDUCED by 15% for refined appearance
};

/**
 * ✅ NEW v283.0: Scale for user location marker (ANDROID SMALLER)
 * Returns 20px on Android (more subtle), 24px on iOS
 */
export const getUserLocationMarkerSize = (): number => {
  if (Platform.OS === 'android') return 20; // ✅ REDUCED to 20px on Android only
  return 24; // iOS keeps 24px
};

/**
 * ✅ NEW v281.0: Scale for action buttons (REDUCED)
 * Used for buttons like "Sala Virtual", "Cómo llegar", etc.
 */
export const getActionButtonPaddingVertical = (): number => {
  if (Platform.OS === 'ios') return 14;
  return 11; // ✅ REDUCED by 3px for more compact buttons
};

/**
 * ✅ NEW v281.0: Scale for photo gallery thumbnails (REDUCED)
 * Returns 90px on Android (down from 100px), original size on iOS
 */
export const getGalleryThumbnailSize = (): number => {
  if (Platform.OS === 'ios') return 100;
  return 90; // ✅ REDUCED by 10px for better proportions
};

/**
 * ✅ NEW v281.0: Scale for cover photo action buttons (REDUCED)
 * Returns 36px on Android (down from 40px), original size on iOS
 */
export const getCoverPhotoButtonSize = (): number => {
  if (Platform.OS === 'ios') return 40;
  return 36; // ✅ REDUCED by 4px for refined appearance
};

/**
 * ✅ NEW v281.0: Scale for category badge padding (REDUCED)
 * Returns smaller padding on Android for more compact badges
 */
export const getCategoryBadgePaddingHorizontal = (): number => {
  if (Platform.OS === 'ios') return 10;
  return 8; // ✅ REDUCED by 2px for more compact badges
};

/**
 * ✅ NEW v281.0: Scale for category badge padding vertical (REDUCED)
 */
export const getCategoryBadgePaddingVertical = (): number => {
  if (Platform.OS === 'ios') return 4;
  return 3; // ✅ REDUCED by 1px for more compact badges
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
  
  console.log('[AndroidScaling v283.0] 📊 ANDROID POPUP TEXT SCALING + USER MARKER FIX:');
  console.log('  Screen Width:', SCREEN_WIDTH);
  console.log('  Screen Height:', SCREEN_HEIGHT);
  console.log('  Pixel Ratio:', PixelRatio.get());
  console.log('  Density Scale:', getPixelDensityScale());
  console.log('  ✅ EXPLORAR CARDS: REFERENCE STANDARD (NO CHANGES)');
  console.log('  ✅ Map Popup Width:', getMapPopupWidth(), 'px (REDUCED from 260 to 240)');
  console.log('  ✅ Map Popup Image Height:', getMapPopupImageHeight(), 'px (REDUCED from 120 to 110)');
  console.log('  ✅ Map Marker Scale:', getMapMarkerScale(), '(REDUCED by 15%)');
  console.log('  ✅ User Location Marker:', getUserLocationMarkerSize(), 'px (20px en Android, 24px en iOS)');
  console.log('  ✅ Popup Title Size: scaleFontSize(16) en Android (INCREASED for readability)');
  console.log('  ✅ Popup Rating Size: scaleFontSize(13) en Android (INCREASED for readability)');
  console.log('  ✅ Popup Button Size: scaleFontSize(13) en Android (INCREASED for readability)');
  console.log('  ✅ Popup Category Size: scaleFontSize(12) en Android (INCREASED for readability)');
  console.log('  ✅ Action Button Padding:', getActionButtonPaddingVertical(), 'px (REDUCED from 14 to 11)');
  console.log('  ✅ Gallery Thumbnail Size:', getGalleryThumbnailSize(), 'px (REDUCED from 100 to 90)');
  console.log('  ✅ Cover Photo Button Size:', getCoverPhotoButtonSize(), 'px (REDUCED from 40 to 36)');
  console.log('  ✅ Category Badge Padding H:', getCategoryBadgePaddingHorizontal(), 'px (REDUCED from 10 to 8)');
  console.log('  ✅ Category Badge Padding V:', getCategoryBadgePaddingVertical(), 'px (REDUCED from 4 to 3)');
  console.log('  ✅ Header Title Size:', getHeaderTitleSize(), '(COMPACT 20sp - matching venue cards)');
  console.log('  ✅ Header Icon Size:', getHeaderIconSize(), '(COMPACT 20dp - more compact)');
  console.log('  ✅ Android Nav Button Padding:', getAndroidNavButtonPadding(), 'dp');
  console.log('  ✅ Font Scaling:', '0.80 (20% reduction for better responsiveness)');
  console.log('  ✅ Icon Scaling:', '0.92 (8% reduction for better proportions)');
};

export default {
  scaleWidth,
  scaleHeight,
  scaleFontSize,
  scaleIconSize,
  getMapPopupWidth,
  getMapPopupImageHeight,
  getMapMarkerScale,
  getUserLocationMarkerSize,
  getActionButtonPaddingVertical,
  getGalleryThumbnailSize,
  getCoverPhotoButtonSize,
  getCategoryBadgePaddingHorizontal,
  getCategoryBadgePaddingVertical,
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
