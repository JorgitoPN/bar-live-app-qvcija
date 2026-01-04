
import { Platform, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iOS reference)
const BASE_WIDTH = 375; // iPhone SE/8 width
const BASE_HEIGHT = 667;

// Calculate scale factor for Android
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;
const scale = Math.min(widthScale, heightScale);

// Android-specific scale factor (reduce by 10% for better visual balance)
const ANDROID_SCALE_FACTOR = Platform.OS === 'android' ? 0.90 : 1.0;

/**
 * Scale a value for Android devices
 */
export function scaleSize(size: number): number {
  if (Platform.OS !== 'android') return size;
  return Math.round(size * scale * ANDROID_SCALE_FACTOR);
}

/**
 * Scale font size for Android
 */
export function scaleFontSize(size: number): number {
  if (Platform.OS !== 'android') return size;
  const newSize = size * scale * ANDROID_SCALE_FACTOR;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Scale spacing/padding for Android
 */
export function scaleSpacing(spacing: number): number {
  if (Platform.OS !== 'android') return spacing;
  return Math.round(spacing * ANDROID_SCALE_FACTOR);
}

// Header dimensions
export function getHeaderHeight(): number {
  return Platform.OS === 'android' ? scaleSize(60) : 60;
}

export function getStatusBarHeight(): number {
  return Platform.OS === 'android' ? scaleSize(24) : 44;
}

export function getHeaderTitleSize(): number {
  return Platform.OS === 'android' ? scaleFontSize(20) : 20;
}

// Search box dimensions
export function getSearchBoxHeight(): number {
  return Platform.OS === 'android' ? scaleSize(44) : 44;
}

export function getSearchBoxFontSize(): number {
  return Platform.OS === 'android' ? scaleFontSize(15) : 15;
}

// Category filter dimensions
export function getCategoryIconSize(): number {
  return Platform.OS === 'android' ? scaleSize(56) : 64;
}

export function getCategoryIconInnerSize(): number {
  return Platform.OS === 'android' ? scaleSize(28) : 32;
}

export function getCategoryFontSize(): number {
  return Platform.OS === 'android' ? scaleFontSize(11) : 12;
}

export function getCategorySpacing(): number {
  return Platform.OS === 'android' ? scaleSpacing(12) : 16;
}

export function getCategoryTopPadding(): number {
  return Platform.OS === 'android' ? scaleSpacing(8) : 12;
}

// Content padding
export function getContentPadding(): number {
  return Platform.OS === 'android' ? scaleSpacing(16) : 20;
}

// Bottom navigation dimensions
export function getBottomNavHeight(): number {
  return Platform.OS === 'android' ? scaleSize(60) : 65;
}

export function getBottomNavIconSize(): number {
  return Platform.OS === 'android' ? scaleSize(24) : 28;
}

export function getCenterButtonSize(): number {
  return Platform.OS === 'android' ? scaleSize(56) : 64;
}

export function getCenterButtonIconSize(): number {
  return Platform.OS === 'android' ? scaleSize(28) : 32;
}

export function getBottomNavPaddingBottom(safeAreaBottom: number): number {
  if (Platform.OS === 'android') {
    // On Android, we handle safe area differently
    return 0;
  }
  return Math.max(safeAreaBottom, 8);
}

// Card dimensions
export function getCardBorderRadius(): number {
  return Platform.OS === 'android' ? scaleSize(12) : 16;
}

export function getCardPadding(): number {
  return Platform.OS === 'android' ? scaleSpacing(12) : 16;
}

export function getCardImageHeight(): number {
  return Platform.OS === 'android' ? scaleSize(180) : 200;
}

// List item dimensions
export function getListItemHeight(): number {
  return Platform.OS === 'android' ? scaleSize(72) : 80;
}

export function getListItemPadding(): number {
  return Platform.OS === 'android' ? scaleSpacing(12) : 16;
}

// Avatar dimensions
export function getAvatarSize(size: 'small' | 'medium' | 'large'): number {
  const sizes = {
    small: Platform.OS === 'android' ? scaleSize(32) : 40,
    medium: Platform.OS === 'android' ? scaleSize(48) : 56,
    large: Platform.OS === 'android' ? scaleSize(80) : 96,
  };
  return sizes[size];
}

// Button dimensions
export function getButtonHeight(): number {
  return Platform.OS === 'android' ? scaleSize(44) : 48;
}

export function getButtonFontSize(): number {
  return Platform.OS === 'android' ? scaleFontSize(15) : 16;
}

// Modal dimensions
export function getModalBorderRadius(): number {
  return Platform.OS === 'android' ? scaleSize(16) : 20;
}

export function getModalPadding(): number {
  return Platform.OS === 'android' ? scaleSpacing(16) : 20;
}

// Banner dimensions
export function getBannerHeight(): number {
  return Platform.OS === 'android' ? scaleSize(100) : 120;
}

export function getBannerPadding(): number {
  return Platform.OS === 'android' ? scaleSpacing(16) : 20;
}

export function getBannerFontSize(): number {
  return Platform.OS === 'android' ? scaleFontSize(14) : 16;
}

// Feed/Post dimensions
export function getPostImageHeight(): number {
  return Platform.OS === 'android' ? scaleSize(320) : 375;
}

export function getPostPadding(): number {
  return Platform.OS === 'android' ? scaleSpacing(12) : 16;
}

export function getPostFontSize(): number {
  return Platform.OS === 'android' ? scaleFontSize(14) : 15;
}

// Icon sizes
export function getIconSize(size: 'small' | 'medium' | 'large'): number {
  const sizes = {
    small: Platform.OS === 'android' ? scaleSize(16) : 20,
    medium: Platform.OS === 'android' ? scaleSize(20) : 24,
    large: Platform.OS === 'android' ? scaleSize(28) : 32,
  };
  return sizes[size];
}

// Logging function for debugging
export function logScalingInfo(): void {
  if (Platform.OS !== 'android') return;
  
  console.log('📊 [Android Scaling] Screen dimensions:', {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    widthScale: widthScale.toFixed(2),
    heightScale: heightScale.toFixed(2),
    finalScale: scale.toFixed(2),
    scaleFactor: ANDROID_SCALE_FACTOR,
  });
  
  console.log('📊 [Android Scaling] UI dimensions:', {
    headerHeight: getHeaderHeight(),
    searchBoxHeight: getSearchBoxHeight(),
    categoryIconSize: getCategoryIconSize(),
    bottomNavHeight: getBottomNavHeight(),
    centerButtonSize: getCenterButtonSize(),
  });
}

// Export all scaling functions
export default {
  scaleSize,
  scaleFontSize,
  scaleSpacing,
  getHeaderHeight,
  getStatusBarHeight,
  getHeaderTitleSize,
  getSearchBoxHeight,
  getSearchBoxFontSize,
  getCategoryIconSize,
  getCategoryIconInnerSize,
  getCategoryFontSize,
  getCategorySpacing,
  getCategoryTopPadding,
  getContentPadding,
  getBottomNavHeight,
  getBottomNavIconSize,
  getCenterButtonSize,
  getCenterButtonIconSize,
  getBottomNavPaddingBottom,
  getCardBorderRadius,
  getCardPadding,
  getCardImageHeight,
  getListItemHeight,
  getListItemPadding,
  getAvatarSize,
  getButtonHeight,
  getButtonFontSize,
  getModalBorderRadius,
  getModalPadding,
  getBannerHeight,
  getBannerPadding,
  getBannerFontSize,
  getPostImageHeight,
  getPostPadding,
  getPostFontSize,
  getIconSize,
  logScalingInfo,
};
