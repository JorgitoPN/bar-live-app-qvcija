
import { Platform, StatusBar, Dimensions } from 'react-native';

// Base dimensions (100% scale)
const BASE_HEADER_HEIGHT = 60;
const BASE_SEARCH_BOX_HEIGHT = 50;
const BASE_CATEGORY_ICON_SIZE = 50;
const BASE_CATEGORY_TOP_PADDING = 16;
const BASE_BOTTOM_NAV_HEIGHT = 70;
const BASE_BOTTOM_NAV_PADDING_BOTTOM = 10;
const BASE_CENTER_BUTTON_SIZE = 60;
const BASE_CENTER_BUTTON_ICON_SIZE = 28;
const BASE_BOTTOM_NAV_ICON_SIZE = 24;

// Get status bar height
export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'android') {
    return StatusBar.currentHeight || 0;
  }
  return 0; // iOS handles this automatically
};

// Header height
export const getHeaderHeight = (): number => {
  return BASE_HEADER_HEIGHT;
};

// Search box height
export const getSearchBoxHeight = (): number => {
  return BASE_SEARCH_BOX_HEIGHT;
};

// Category icon size
export const getCategoryIconSize = (): number => {
  return BASE_CATEGORY_ICON_SIZE;
};

// Category top padding
export const getCategoryTopPadding = (): number => {
  return BASE_CATEGORY_TOP_PADDING;
};

// Bottom navigation height
export const getBottomNavHeight = (): number => {
  return BASE_BOTTOM_NAV_HEIGHT;
};

// Bottom navigation padding bottom
export const getBottomNavPaddingBottom = (): number => {
  return BASE_BOTTOM_NAV_PADDING_BOTTOM;
};

// Center button size
export const getCenterButtonSize = (): number => {
  return BASE_CENTER_BUTTON_SIZE;
};

// Center button icon size
export const getCenterButtonIconSize = (): number => {
  return BASE_CENTER_BUTTON_ICON_SIZE;
};

// Bottom navigation icon size
export const getBottomNavIconSize = (): number => {
  return BASE_BOTTOM_NAV_ICON_SIZE;
};
