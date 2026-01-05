
import { Platform, Dimensions, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (designed for standard Android device)
const BASE_WIDTH = 360;
const BASE_HEIGHT = 800;

// Calculate scale factors
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;
const scale = Math.min(widthScale, heightScale);

/**
 * Scales font size for Android devices
 */
export function scaleFontSize(size: number): number {
  if (Platform.OS !== 'android') return size;
  return Math.round(size * scale);
}

/**
 * Returns header height based on platform
 */
export function getHeaderHeight(): number {
  if (Platform.OS === 'android') {
    return scaleFontSize(200);
  }
  return 200;
}

/**
 * Returns search box height based on platform
 */
export function getSearchBoxHeight(): number {
  if (Platform.OS === 'android') {
    return scaleFontSize(50);
  }
  return 50;
}

/**
 * Returns category icon size based on platform
 */
export function getCategoryIconSize(): number {
  if (Platform.OS === 'android') {
    return scaleFontSize(70);
  }
  return 70;
}

/**
 * Returns inner category icon size based on platform
 */
export function getCategoryIconInnerSize(): number {
  if (Platform.OS === 'android') {
    return scaleFontSize(32);
  }
  return 32;
}

/**
 * Returns top padding for categories based on platform
 */
export function getCategoryTopPadding(): number {
  if (Platform.OS === 'android') {
    return scaleFontSize(10);
  }
  return 10;
}

/**
 * Returns status bar height for Android
 */
export function getStatusBarHeight(): number {
  if (Platform.OS === 'android') {
    return StatusBar.currentHeight || 24;
  }
  return 0;
}

/**
 * Returns category spacing based on platform
 */
export function getCategorySpacing(): number {
  if (Platform.OS === 'android') {
    return scaleFontSize(12);
  }
  return 12;
}

/**
 * Returns bottom navigation height based on platform
 */
export function getBottomNavHeight(): number {
  if (Platform.OS === 'android') {
    return scaleFontSize(60);
  }
  return 60;
}

/**
 * Returns bottom navigation padding bottom based on platform and insets
 */
export function getBottomNavPaddingBottom(bottomInset: number = 0): number {
  if (Platform.OS === 'android') {
    return Math.max(scaleFontSize(8), bottomInset);
  }
  return Math.max(8, bottomInset);
}
