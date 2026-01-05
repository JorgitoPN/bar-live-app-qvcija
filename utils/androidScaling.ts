
import { Platform, Dimensions, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base scaling function for Android
export function scaleFontSize(size: number): number {
  if (Platform.OS === 'android') {
    return size * 1.1;
  }
  return size;
}

// Platform-specific dimension functions
export function getHeaderHeight(): number {
  return Platform.OS === 'android' ? 60 : 56;
}

export function getSearchBoxHeight(): number {
  return Platform.OS === 'android' ? 50 : 46;
}

export function getCategoryIconSize(): number {
  return Platform.OS === 'android' ? 72 : 68;
}

export function getCategoryIconInnerSize(): number {
  return Platform.OS === 'android' ? 32 : 28;
}

export function getCategoryTopPadding(): number {
  return Platform.OS === 'android' ? 16 : 12;
}

export function getStatusBarHeight(): number {
  if (Platform.OS === 'android') {
    return StatusBar.currentHeight || 24;
  }
  return 0; // iOS handles status bar automatically
}
