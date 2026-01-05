
import { Platform, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Base width for scaling

/**
 * Scales font size based on screen density for Android
 */
export function scaleFontSize(size: number): number {
  if (Platform.OS === 'android') {
    return Math.round(size * scale);
  }
  return size;
}

/**
 * Returns header height based on platform
 */
export function getHeaderHeight(): number {
  return Platform.OS === 'android' ? 200 : 220;
}

/**
 * Returns search box height based on platform
 */
export function getSearchBoxHeight(): number {
  return Platform.OS === 'android' ? 45 : 50;
}

/**
 * Returns category icon size based on platform
 */
export function getCategoryIconSize(): number {
  return Platform.OS === 'android' ? 60 : 70;
}

/**
 * Returns category icon inner size based on platform
 */
export function getCategoryIconInnerSize(): number {
  return Platform.OS === 'android' ? 28 : 32;
}

/**
 * Returns category top padding based on platform
 */
export function getCategoryTopPadding(): number {
  return Platform.OS === 'android' ? 8 : 12;
}

/**
 * Returns status bar height based on platform
 */
export function getStatusBarHeight(): number {
  return Platform.OS === 'android' ? 24 : 44;
}

/**
 * Returns category spacing based on platform
 */
export function getCategorySpacing(): number {
  return Platform.OS === 'android' ? 12 : 16;
}
