
import { Platform, StatusBar, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const horizontalScale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor: number = 0.5) => size + (horizontalScale(size) - size) * factor;

export const scaleFontSize = (size: number) =>
  Platform.OS === 'android' ? moderateScale(size) : size;

export const getHeaderHeight = () => Platform.OS === 'android' ? verticalScale(200) : verticalScale(220);
export const getSearchBoxHeight = () => Platform.OS === 'android' ? verticalScale(45) : verticalScale(50);
export const getCategoryIconSize = () => Platform.OS === 'android' ? horizontalScale(60) : horizontalScale(65);
export const getCategoryIconInnerSize = () => Platform.OS === 'android' ? horizontalScale(28) : horizontalScale(30);
export const getCategoryTopPadding = () => Platform.OS === 'android' ? verticalScale(8) : verticalScale(10);
export const getCategorySpacing = () => Platform.OS === 'android' ? horizontalScale(12) : horizontalScale(16);
export const getStatusBarHeight = () => Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
export const getBottomNavHeight = () => verticalScale(60);
export const getBottomNavPaddingBottom = (bottomInset: number) => Platform.OS === 'android' ? verticalScale(10) : bottomInset;
export const getCenterButtonSize = () => horizontalScale(72);
export const getCenterButtonIconSize = () => horizontalScale(32);
export const getBottomNavIconSize = () => horizontalScale(24);
