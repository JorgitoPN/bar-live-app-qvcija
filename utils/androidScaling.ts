
import { Platform, Dimensions, PixelRatio, Text, TextInput } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensiones base (iPhone 11 Pro como referencia)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// ✅ FACTOR DE ESCALA MÁXIMO LIMITADO PARA ANDROID
const MAX_FONT_SCALE = 1.0; // Forzamos a 1.0 para evitar sobreescalado

/**
 * Obtiene el fontScale del sistema, limitado en Android
 */
export const getFontScale = (): number => {
  if (Platform.OS === 'ios') {
    return PixelRatio.getFontScale();
  }
  
  // En Android, SIEMPRE retornamos 1.0 para evitar sobreescalado
  return 1.0;
};

/**
 * Escala un tamaño de fuente de forma controlada
 * En Android, reduce ligeramente los tamaños para compensar diferencias de densidad
 */
export const scaleFontSize = (size: number): number => {
  if (Platform.OS === 'ios') {
    return size;
  }
  
  // En Android, reducimos un 10-15% dependiendo del tamaño
  const reductionFactor = size > 20 ? 0.88 : 0.90;
  return Math.round(size * reductionFactor);
};

/**
 * Escala espaciados y márgenes
 * En Android, reducimos ligeramente para UI más compacta
 */
export const scaleSpacing = (size: number): number => {
  if (Platform.OS === 'ios') {
    return size;
  }
  
  // Reducimos un 10% en Android
  return Math.round(size * 0.90);
};

/**
 * Escala tamaños de componentes (width, height, borderRadius)
 */
export const scaleSize = (size: number): number => {
  if (Platform.OS === 'ios') {
    return size;
  }
  
  // Reducimos un 5% en Android
  return Math.round(size * 0.95);
};

/**
 * Altura del header ajustada por plataforma
 */
export const getHeaderHeight = (): number => {
  return Platform.OS === 'ios' ? 60 : 56;
};

/**
 * Altura de la barra de estado
 */
export const getStatusBarHeight = (): number => {
  return Platform.OS === 'ios' ? 0 : 24;
};

/**
 * Line height normalizado para evitar textos gigantes
 */
export const getLineHeight = (fontSize: number): number => {
  if (Platform.OS === 'ios') {
    return Math.round(fontSize * 1.5);
  }
  
  // En Android, usamos un line height más conservador
  return Math.round(fontSize * 1.35);
};

/**
 * Tamaños de fuente predefinidos y normalizados
 * Android tiene tamaños reducidos para compensar diferencias de densidad
 */
export const fontSizes = {
  xs: Platform.OS === 'ios' ? 10 : 9,
  sm: Platform.OS === 'ios' ? 12 : 11,
  base: Platform.OS === 'ios' ? 14 : 13,
  md: Platform.OS === 'ios' ? 16 : 14,
  lg: Platform.OS === 'ios' ? 18 : 16,
  xl: Platform.OS === 'ios' ? 20 : 18,
  '2xl': Platform.OS === 'ios' ? 24 : 21,
  '3xl': Platform.OS === 'ios' ? 30 : 26,
  '4xl': Platform.OS === 'ios' ? 36 : 31,
  '5xl': Platform.OS === 'ios' ? 48 : 42,
};

/**
 * Espaciados predefinidos y normalizados
 * Android tiene espaciados ligeramente reducidos
 */
export const spacing = {
  xs: Platform.OS === 'ios' ? 4 : 4,
  sm: Platform.OS === 'ios' ? 8 : 7,
  md: Platform.OS === 'ios' ? 12 : 11,
  lg: Platform.OS === 'ios' ? 16 : 14,
  xl: Platform.OS === 'ios' ? 20 : 18,
  '2xl': Platform.OS === 'ios' ? 24 : 21,
  '3xl': Platform.OS === 'ios' ? 32 : 28,
  '4xl': Platform.OS === 'ios' ? 40 : 35,
  '5xl': Platform.OS === 'ios' ? 48 : 42,
};

/**
 * Tamaños de iconos normalizados
 */
export const iconSizes = {
  xs: Platform.OS === 'ios' ? 12 : 11,
  sm: Platform.OS === 'ios' ? 16 : 14,
  md: Platform.OS === 'ios' ? 20 : 18,
  lg: Platform.OS === 'ios' ? 24 : 22,
  xl: Platform.OS === 'ios' ? 32 : 29,
  '2xl': Platform.OS === 'ios' ? 40 : 36,
  '3xl': Platform.OS === 'ios' ? 48 : 43,
};

/**
 * Border radius normalizados
 */
export const borderRadius = {
  xs: Platform.OS === 'ios' ? 4 : 4,
  sm: Platform.OS === 'ios' ? 6 : 6,
  md: Platform.OS === 'ios' ? 8 : 7,
  lg: Platform.OS === 'ios' ? 12 : 11,
  xl: Platform.OS === 'ios' ? 16 : 14,
  '2xl': Platform.OS === 'ios' ? 20 : 18,
  full: 9999,
};

/**
 * Normaliza el escalado de texto en Android
 * Debe llamarse en el componente raíz (_layout.tsx)
 */
export const normalizeTextScaling = () => {
  if (Platform.OS === 'android') {
    // Forzamos allowFontScaling a false en TODOS los componentes de texto
    if (Text.defaultProps == null) {
      Text.defaultProps = {};
    }
    Text.defaultProps.allowFontScaling = false;
    
    if (TextInput.defaultProps == null) {
      TextInput.defaultProps = {};
    }
    TextInput.defaultProps.allowFontScaling = false;
    
    console.log('[AndroidScaling] ✅ Text scaling normalization applied');
  }
};

/**
 * Helper para crear estilos responsivos rápidamente
 */
export const responsive = {
  fontSize: scaleFontSize,
  spacing: scaleSpacing,
  size: scaleSize,
  lineHeight: getLineHeight,
};
