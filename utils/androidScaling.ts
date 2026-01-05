
import { Platform, Dimensions, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base scale factor for Android
const ANDROID_SCALE_FACTOR = 1.0;

/**
 * Scale font size for Android devices
 */
export function scaleFontSize(size: number): number {
  if (Platform.OS === 'android') {
    return size * ANDROID_SCALE_FACTOR;
  }
  return size;
}

/**
 * Get header height based on platform
 */
export function getHeaderHeight(): number {
  if (Platform.OS === 'android') {
    return 60;
  }
  return 64;
}

/**
 * Get search box height based on platform
 */
export function getSearchBoxHeight(): number {
  if (Platform.OS === 'android') {
    return 48;
  }
  return 50;
}

/**
 * Get category icon size based on platform
 */
export function getCategoryIconSize(): number {
  if (Platform.OS === 'android') {
    return 64;
  }
  return 70;
}

/**
 * Get inner category icon size based on platform
 */
export function getCategoryIconInnerSize(): number {
  if (Platform.OS === 'android') {
    return 32;
  }
  return 35;
}

/**
 * Get category top padding based on platform
 */
export function getCategoryTopPadding(): number {
  if (Platform.OS === 'android') {
    return 12;
  }
  return 16;
}

/**
 * Get status bar height for Android
 */
export function getStatusBarHeight(): number {
  if (Platform.OS === 'android') {
    return StatusBar.currentHeight || 24;
  }
  return 0;
}

/**
 * Get category spacing based on platform
 */
export function getCategorySpacing(): number {
  if (Platform.OS === 'android') {
    return 12;
  }
  return 16;
}

/**
 * Get bottom navigation height based on platform
 */
export function getBottomNavHeight(): number {
  if (Platform.OS === 'android') {
    return 60;
  }
  return 65;
}

/**
 * Get bottom navigation padding bottom based on platform and insets
 */
export function getBottomNavPaddingBottom(bottomInset: number): number {
  if (Platform.OS === 'android') {
    return 8;
  }
  return Math.max(bottomInset, 8);
}

/**
 * Get center button size based on platform
 */
export function getCenterButtonSize(): number {
  if (Platform.OS === 'android') {
    return 56;
  }
  return 60;
}

/**
 * Get center button icon size based on platform
 */
export function getCenterButtonIconSize(): number {
  if (Platform.OS === 'android') {
    return 28;
  }
  return 30;
}

/**
 * Get bottom navigation icon size based on platform
 */
export function getBottomNavIconSize(): number {
  if (Platform.OS === 'android') {
    return 24;
  }
  return 26;
}

/**
 * Get card border radius based on platform
 */
export function getCardBorderRadius(): number {
  if (Platform.OS === 'android') {
    return 12;
  }
  return 16;
}

/**
 * Get button height based on platform
 */
export function getButtonHeight(): number {
  if (Platform.OS === 'android') {
    return 48;
  }
  return 50;
}

/**
 * Get input height based on platform
 */
export function getInputHeight(): number {
  if (Platform.OS === 'android') {
    return 48;
  }
  return 50;
}

/**
 * Get modal padding based on platform
 */
export function getModalPadding(): number {
  if (Platform.OS === 'android') {
    return 16;
  }
  return 20;
}

/**
 * Get section spacing based on platform
 */
export function getSectionSpacing(): number {
  if (Platform.OS === 'android') {
    return 16;
  }
  return 20;
}
