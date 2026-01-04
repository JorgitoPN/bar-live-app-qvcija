
import { Platform, PixelRatio } from 'react-native';

// Global UI scale factor (1.0 = 100%)
let uiScaleFactor = 1.0;

/**
 * Set the global UI scale factor
 * Only affects Android devices
 */
export const setUiScaleFactor = (scale: number) => {
  // Clamp between 0.3 (30%) and 1.4 (140%) for usability
  uiScaleFactor = Math.max(0.3, Math.min(1.4, scale));
};

/**
 * Get current UI scale factor
 */
export const getUiScaleFactor = (): number => {
  return uiScaleFactor;
};

/**
 * Scale a numeric value based on platform
 * Only applies scaling on Android
 */
export const scale = (size: number): number => {
  return Platform.OS === 'android' ? size * uiScaleFactor : size;
};

/**
 * Scale font sizes
 * Respects system font scaling to avoid double-scaling
 */
export const scaleFont = (size: number): number => {
  if (Platform.OS !== 'android') return size;
  
  const pixelRatio = PixelRatio.getFontScale();
  // If user has system font scaling > 1, reduce our scaling to avoid excessive size
  const adjustedFactor = pixelRatio > 1 ? uiScaleFactor / pixelRatio : uiScaleFactor;
  return size * adjustedFactor;
};

/**
 * Elements that should NOT be scaled
 */
export const noScale = (size: number): number => size;

// Predefined scaled sizes
export const spacing = {
  xs: () => scale(4),
  sm: () => scale(8),
  md: () => scale(16),
  lg: () => scale(24),
  xl: () => scale(32),
};

export const fontSizes = {
  xs: () => scaleFont(10),
  sm: () => scaleFont(12),
  md: () => scaleFont(14),
  base: () => scaleFont(16),
  lg: () => scaleFont(18),
  xl: () => scaleFont(20),
  xxl: () => scaleFont(24),
  xxxl: () => scaleFont(32),
};

export const borderRadius = {
  sm: () => scale(4),
  md: () => scale(8),
  lg: () => scale(12),
  xl: () => scale(16),
  full: () => scale(9999),
};

export const iconSizes = {
  xs: () => scale(12),
  sm: () => scale(16),
  md: () => scale(20),
  lg: () => scale(24),
  xl: () => scale(32),
  xxl: () => scale(48),
};

// Elements that should never scale
export const fixedSizes = {
  borderWidth: 1, // Keep borders thin
  shadowRadius: 4, // Don't scale shadows
  elevation: 2, // Don't scale elevation
};
