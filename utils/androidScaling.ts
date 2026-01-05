
import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const scaleFontSize = (size: number) => {
  if (Platform.OS === 'android') {
    return size * 0.9;
  }
  return size;
};

export const getHeaderHeight = () => {
  if (Platform.OS === 'android') {
    return 200;
  }
  return 220;
};

export const getSearchBoxHeight = () => {
  if (Platform.OS === 'android') {
    return 45;
  }
  return 50;
};

export const getCategoryIconSize = () => {
  if (Platform.OS === 'android') {
    return 60;
  }
  return 65;
};

export const getCategoryIconInnerSize = () => {
  if (Platform.OS === 'android') {
    return 28;
  }
  return 30;
};

export const getCategoryTopPadding = () => {
  if (Platform.OS === 'android') {
    return 8;
  }
  return 10;
};
