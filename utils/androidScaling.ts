
import { Platform, Dimensions, StatusBar } from 'react-native';

/**
 * Android UI Scaling Utilities
 * Provides platform-specific dimension functions for consistent UI scaling
 */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (can be adjusted based on design requirements)
const BASE_HEADER_HEIGHT = 60;
const BASE_SEARCH_BOX_HEIGHT = 50;
const BASE_CATEGORY_ICON_SIZE = 64;
const BASE_CATEGORY_ICON_INNER_SIZE = 28;
const BASE_CATEGORY_SPACING = 12;
const BASE_CATEGORY_TOP_PADDING = 16;
const BASE_BOTTOM_NAV_HEIGHT = 60;
const BASE_BOTTOM_NAV_PADDING = 8;
const BASE_CONTENT_PADDING = 20;
const BASE_FONT_SIZE = 16;

/**
 * Get header height for current platform
 */
export const getHeaderHeight = (): number => {
  return Platform.OS === 'android' ? BASE_HEADER_HEIGHT : BASE_HEADER_HEIGHT;
};

/**
 * Get search box height
 */
export const getSearchBoxHeight = (): number => {
  return Platform.OS === 'android' ? BASE_SEARCH_BOX_HEIGHT : BASE_SEARCH_BOX_HEIGHT;
};

/**
 * Get category icon size (outer container)
 */
export const getCategoryIconSize = (): number => {
  return Platform.OS === 'android' ? BASE_CATEGORY_ICON_SIZE : BASE_CATEGORY_ICON_SIZE;
};

/**
 * Get category icon inner size (actual icon)
 */
export const getCategoryIconInnerSize = (): number => {
  return Platform.OS === 'android' ? BASE_CATEGORY_ICON_INNER_SIZE : BASE_CATEGORY_ICON_INNER_SIZE;
};

/**
 * Get spacing between category items
 */
export const getCategorySpacing = (): number => {
  return Platform.OS === 'android' ? BASE_CATEGORY_SPACING : BASE_CATEGORY_SPACING;
};

/**
 * Get category top padding
 */
export const getCategoryTopPadding = (): number => {
  return Platform.OS === 'android' ? BASE_CATEGORY_TOP_PADDING : BASE_CATEGORY_TOP_PADDING;
};

/**
 * Get bottom navigation bar height
 */
export const getBottomNavHeight = (): number => {
  return Platform.OS === 'android' ? BASE_BOTTOM_NAV_HEIGHT : BASE_BOTTOM_NAV_HEIGHT;
};

/**
 * Get bottom navigation padding
 */
export const getBottomNavPaddingBottom = (insetsBottom: number): number => {
  return Platform.OS === 'android' ? BASE_BOTTOM_NAV_PADDING : insetsBottom + BASE_BOTTOM_NAV_PADDING;
};

/**
 * Get content padding
 */
export const getContentPadding = (): number => {
  return Platform.OS === 'android' ? BASE_CONTENT_PADDING : BASE_CONTENT_PADDING;
};

/**
 * Scale font size based on platform
 */
export const scaleFontSize = (size: number): number => {
  return Platform.OS === 'android' ? size : size;
};

/**
 * Get status bar height
 */
export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'android') {
    return StatusBar.currentHeight || 24;
  }
  return 0; // iOS handles this automatically with safe area
};

/**
 * Log scaling information for debugging
 */
export const logScalingInfo = (): void => {
  console.log('[AndroidScaling] 📊 UI Scaling Information:');
  console.log('  - Platform:', Platform.OS);
  console.log('  - Screen Width:', SCREEN_WIDTH);
  console.log('  - Screen Height:', SCREEN_HEIGHT);
  console.log('  - Header Height:', getHeaderHeight());
  console.log('  - Search Box Height:', getSearchBoxHeight());
  console.log('  - Category Icon Size:', getCategoryIconSize());
  console.log('  - Category Icon Inner Size:', getCategoryIconInnerSize());
  console.log('  - Category Spacing:', getCategorySpacing());
  console.log('  - Category Top Padding:', getCategoryTopPadding());
  console.log('  - Bottom Nav Height:', getBottomNavHeight());
  console.log('  - Content Padding:', getContentPadding());
  console.log('  - Status Bar Height:', getStatusBarHeight());
};
