
/**
 * ANDROID SCALING UTILITY - v280.0 - UNIFIED SCALING BASED ON VENUE CARDS
 * 
 * Centralized scaling system for Android UI parity with iOS.
 * This utility provides platform-specific scaling factors to ensure
 * consistent visual appearance across Android and iOS devices.
 * 
 * ✅ CRITICAL FIX v280.0 - UNIFIED SCALING SYSTEM:
 * - ✅ ALL components now use the SAME scaling as venue cards in Explorar
 * - ✅ Base scaling factor: 0.88 (matching venue cards that display correctly)
 * - ✅ Consistent sizing across: popups, markers, buttons, badges, galleries
 * - ✅ Refined, professional appearance on Android
 * - ✅ No more oversized or inconsistent elements
 * 
 * SCALING REFERENCE:
 * - Venue cards in Explorar page are the GOLD STANDARD
 * - All other components scaled to match this reference
 * - Font sizes: 0.88x of iOS values
 * - Icon sizes: 0.88x of iOS values
 * - Padding/margins: 0.88x of iOS values
 * - Border radius: 0.88x of iOS values
 * 
 * IMPORTANT: iOS design is the reference - DO NOT modify iOS values
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// ✅ v280.0: UNIFIED SCALING FACTOR - matches venue cards in Explorar
const ANDROID_GLOBAL_SCALE = 0.88;

export const getPixelDensityScale = (): number => {
  if (Platform.OS !== 'android') return 1;
  
  // ✅ v280.0: Use unified scaling factor
  return ANDROID_GLOBAL_SCALE;
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
 * ✅ v280.0: Scale font size with UNIFIED scaling factor
 * Matches the scaling used in venue cards (Explorar page)
 */
export const scaleFontSize = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  // ✅ v280.0: Direct scaling with unified factor
  return Math.round(size * ANDROID_GLOBAL_SCALE);
};

/**
 * ✅ v280.0: Scale icon size with UNIFIED scaling factor
 * Matches the scaling used in venue cards (Explorar page)
 */
export const scaleIconSize = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  // ✅ v280.0: Direct scaling with unified factor
  return Math.round(size * ANDROID_GLOBAL_SCALE);
};

/**
 * ✅ v280.0: Header title size with UNIFIED scaling
 * Matches venue card scaling for consistency
 */
export const getHeaderTitleSize = (): number => {
  if (Platform.OS === 'ios') return 32;
  return Math.round(32 * ANDROID_GLOBAL_SCALE); // ~28sp on Android
};

/**
 * ✅ v280.0: Header icon size with UNIFIED scaling
 * Matches venue card scaling for consistency
 */
export const getHeaderIconSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  return Math.round(28 * ANDROID_GLOBAL_SCALE); // ~25dp on Android
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

/**
 * ✅ v280.0: All dimension functions now use UNIFIED scaling
 * Ensures consistency across all UI elements
 */

export const getHeaderHeight = (): number => {
  if (Platform.OS === 'ios') return 110;
  return Math.round(110 * ANDROID_GLOBAL_SCALE); // ~97px
};

export const getSearchBoxHeight = (): number => {
  if (Platform.OS === 'ios') return 48;
  return Math.round(48 * ANDROID_GLOBAL_SCALE); // ~42px
};

export const getCategoryIconSize = (): number => {
  if (Platform.OS === 'ios') return 56;
  return Math.round(56 * ANDROID_GLOBAL_SCALE); // ~49px
};

export const getCategoryIconInnerSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  return Math.round(28 * ANDROID_GLOBAL_SCALE); // ~25px
};

export const getCategorySpacing = (): number => {
  if (Platform.OS === 'ios') return 16;
  return Math.round(16 * ANDROID_GLOBAL_SCALE); // ~14px
};

export const getCategoryTopPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  return Math.round(16 * ANDROID_GLOBAL_SCALE * 0.5); // ~7px (reduced for compact design)
};

export const getBottomNavHeight = (): number => {
  if (Platform.OS === 'ios') return 70;
  return Math.round(70 * ANDROID_GLOBAL_SCALE); // ~62px
};

export const getBottomNavIconSize = (): number => {
  if (Platform.OS === 'ios') return 28;
  return Math.round(28 * ANDROID_GLOBAL_SCALE); // ~25px
};

export const getCenterButtonSize = (): number => {
  if (Platform.OS === 'ios') return 60;
  return Math.round(60 * ANDROID_GLOBAL_SCALE); // ~53px
};

export const getCenterButtonIconSize = (): number => {
  if (Platform.OS === 'ios') return 30;
  return Math.round(30 * ANDROID_GLOBAL_SCALE); // ~26px
};

export const getContentPadding = (): number => {
  if (Platform.OS === 'ios') return 20;
  return Math.round(20 * ANDROID_GLOBAL_SCALE); // ~18px
};

export const getCardBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 16;
  return Math.round(16 * ANDROID_GLOBAL_SCALE); // ~14px
};

export const getCardAspectRatio = (): number => {
  return 1.5;
};

export const getCardImageHeight = (): number => {
  if (Platform.OS === 'ios') return 200;
  return Math.round(200 * ANDROID_GLOBAL_SCALE); // ~176px
};

export const getButtonBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 12;
  return Math.round(12 * ANDROID_GLOBAL_SCALE); // ~11px
};

export const getSpacing = (size: 'small' | 'medium' | 'large'): number => {
  const spacingMap = {
    small: 8,
    medium: 16,
    large: 24,
  };
  
  const baseSize = spacingMap[size];
  if (Platform.OS === 'ios') return baseSize;
  return Math.round(baseSize * ANDROID_GLOBAL_SCALE);
};

export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'ios') return 50;
  return Math.round(50 * ANDROID_GLOBAL_SCALE); // ~44px
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
  return Math.round(50 * ANDROID_GLOBAL_SCALE); // ~44px
};

export const getHeaderPaddingBottom = (): number => {
  if (Platform.OS === 'ios') return 16;
  return Math.round(16 * ANDROID_GLOBAL_SCALE); // ~14px
};

export const getHeaderPaddingHorizontal = (): number => {
  if (Platform.OS === 'ios') return 20;
  return Math.round(20 * ANDROID_GLOBAL_SCALE); // ~18px
};

export const getCardPadding = (): number => {
  if (Platform.OS === 'ios') return 16;
  return Math.round(16 * ANDROID_GLOBAL_SCALE); // ~14px
};

export const getCardMarginBottom = (): number => {
  if (Platform.OS === 'ios') return 16;
  return Math.round(16 * ANDROID_GLOBAL_SCALE); // ~14px
};

/**
 * ✅ v280.0: SPECIFIC SCALING FUNCTIONS FOR PROBLEMATIC ELEMENTS
 * These functions ensure consistent scaling for elements that were oversized
 */

// Popup/Modal dimensions
export const getModalWidth = (): number => {
  if (Platform.OS === 'ios') return SCREEN_WIDTH * 0.9;
  return Math.round(SCREEN_WIDTH * 0.9 * ANDROID_GLOBAL_SCALE);
};

export const getModalPadding = (): number => {
  if (Platform.OS === 'ios') return 24;
  return Math.round(24 * ANDROID_GLOBAL_SCALE); // ~21px
};

export const getModalBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 20;
  return Math.round(20 * ANDROID_GLOBAL_SCALE); // ~18px
};

export const getModalTitleSize = (): number => {
  if (Platform.OS === 'ios') return 24;
  return Math.round(24 * ANDROID_GLOBAL_SCALE); // ~21px
};

// Map marker dimensions
export const getMapMarkerSize = (): number => {
  if (Platform.OS === 'ios') return 40;
  return Math.round(40 * ANDROID_GLOBAL_SCALE); // ~35px
};

export const getMapMarkerIconSize = (): number => {
  if (Platform.OS === 'ios') return 24;
  return Math.round(24 * ANDROID_GLOBAL_SCALE); // ~21px
};

export const getUserLocationMarkerSize = (): number => {
  if (Platform.OS === 'ios') return 20;
  return Math.round(20 * ANDROID_GLOBAL_SCALE); // ~18px
};

// Button dimensions (e.g., Sala Virtual button)
export const getButtonHeight = (): number => {
  if (Platform.OS === 'ios') return 48;
  return Math.round(48 * ANDROID_GLOBAL_SCALE); // ~42px
};

export const getButtonPaddingVertical = (): number => {
  if (Platform.OS === 'ios') return 14;
  return Math.round(14 * ANDROID_GLOBAL_SCALE); // ~12px
};

export const getButtonPaddingHorizontal = (): number => {
  if (Platform.OS === 'ios') return 24;
  return Math.round(24 * ANDROID_GLOBAL_SCALE); // ~21px
};

export const getButtonIconSize = (): number => {
  if (Platform.OS === 'ios') return 20;
  return Math.round(20 * ANDROID_GLOBAL_SCALE); // ~18px
};

export const getButtonFontSize = (): number => {
  if (Platform.OS === 'ios') return 16;
  return Math.round(16 * ANDROID_GLOBAL_SCALE); // ~14px
};

// Gallery dimensions (photo gallery in local profile)
export const getGalleryImageSize = (): number => {
  if (Platform.OS === 'ios') return 120;
  return Math.round(120 * ANDROID_GLOBAL_SCALE); // ~106px
};

export const getGallerySpacing = (): number => {
  if (Platform.OS === 'ios') return 8;
  return Math.round(8 * ANDROID_GLOBAL_SCALE); // ~7px
};

// Badge dimensions (category badges)
export const getBadgePaddingHorizontal = (): number => {
  if (Platform.OS === 'ios') return 12;
  return Math.round(12 * ANDROID_GLOBAL_SCALE); // ~11px
};

export const getBadgePaddingVertical = (): number => {
  if (Platform.OS === 'ios') return 6;
  return Math.round(6 * ANDROID_GLOBAL_SCALE); // ~5px
};

export const getBadgeBorderRadius = (): number => {
  if (Platform.OS === 'ios') return 20;
  return Math.round(20 * ANDROID_GLOBAL_SCALE); // ~18px
};

export const getBadgeFontSize = (): number => {
  if (Platform.OS === 'ios') return 12;
  return Math.round(12 * ANDROID_GLOBAL_SCALE); // ~11px
};

export const getBadgeIconSize = (): number => {
  if (Platform.OS === 'ios') return 14;
  return Math.round(14 * ANDROID_GLOBAL_SCALE); // ~12px
};

// Cover photo buttons/icons (local detail page)
export const getCoverPhotoButtonSize = (): number => {
  if (Platform.OS === 'ios') return 44;
  return Math.round(44 * ANDROID_GLOBAL_SCALE); // ~39px
};

export const getCoverPhotoIconSize = (): number => {
  if (Platform.OS === 'ios') return 24;
  return Math.round(24 * ANDROID_GLOBAL_SCALE); // ~21px
};

export const logScalingInfo = () => {
  if (Platform.OS !== 'android') return;
  
  console.log('[AndroidScaling v280.0] 📊 UNIFIED SCALING SYSTEM ACTIVE:');
  console.log('  🎯 REFERENCE: Venue cards in Explorar page (correctly sized)');
  console.log('  📐 Global Scale Factor:', ANDROID_GLOBAL_SCALE, '(0.88 - matches venue cards)');
  console.log('  📱 Screen Width:', SCREEN_WIDTH);
  console.log('  📱 Screen Height:', SCREEN_HEIGHT);
  console.log('  📱 Pixel Ratio:', PixelRatio.get());
  console.log('  ✅ Header Title Size:', getHeaderTitleSize(), 'px');
  console.log('  ✅ Header Icon Size:', getHeaderIconSize(), 'px');
  console.log('  ✅ Search Box Height:', getSearchBoxHeight(), 'px');
  console.log('  ✅ Category Icon Size:', getCategoryIconSize(), 'px');
  console.log('  ✅ Category Icon Inner:', getCategoryIconInnerSize(), 'px');
  console.log('  ✅ Bottom Nav Height:', getBottomNavHeight(), 'px');
  console.log('  ✅ Bottom Nav Icon Size:', getBottomNavIconSize(), 'px');
  console.log('  ✅ Card Border Radius:', getCardBorderRadius(), 'px');
  console.log('  ✅ Card Image Height:', getCardImageHeight(), 'px');
  console.log('  ✅ Button Border Radius:', getButtonBorderRadius(), 'px');
  console.log('  ✅ Content Padding:', getContentPadding(), 'px');
  console.log('  ✅ Android Nav Button Padding:', getAndroidNavButtonPadding(), 'px');
  console.log('  🎨 ALL COMPONENTS: Scaled consistently with venue cards');
  console.log('  🎨 POPUPS: Scaled to match venue cards');
  console.log('  🎨 MARKERS: Scaled to match venue cards');
  console.log('  🎨 BUTTONS: Scaled to match venue cards');
  console.log('  🎨 BADGES: Scaled to match venue cards');
  console.log('  🎨 GALLERIES: Scaled to match venue cards');
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
  // ✅ v280.0: New specific scaling functions
  getModalWidth,
  getModalPadding,
  getModalBorderRadius,
  getModalTitleSize,
  getMapMarkerSize,
  getMapMarkerIconSize,
  getUserLocationMarkerSize,
  getButtonHeight,
  getButtonPaddingVertical,
  getButtonPaddingHorizontal,
  getButtonIconSize,
  getButtonFontSize,
  getGalleryImageSize,
  getGallerySpacing,
  getBadgePaddingHorizontal,
  getBadgePaddingVertical,
  getBadgeBorderRadius,
  getBadgeFontSize,
  getBadgeIconSize,
  getCoverPhotoButtonSize,
  getCoverPhotoIconSize,
  logScalingInfo,
};
