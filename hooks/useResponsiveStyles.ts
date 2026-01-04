
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { 
  scaleFontSize, 
  scaleSpacing, 
  scaleSize, 
  getLineHeight,
  fontSizes,
  spacing,
  iconSizes,
  borderRadius,
} from '../utils/androidScaling';

/**
 * Hook para obtener estilos responsivos que se ajustan automáticamente
 * entre iOS y Android
 */
export const useResponsiveStyles = () => {
  return useMemo(() => ({
    // Funciones de escalado
    fontSize: (size: number) => scaleFontSize(size),
    spacing: (size: number) => scaleSpacing(size),
    size: (size: number) => scaleSize(size),
    lineHeight: (fontSize: number) => getLineHeight(fontSize),
    
    // Tamaños predefinidos
    fontSizes,
    spacing: spacing,
    iconSizes,
    borderRadius,
    
    // Helpers para estilos comunes
    text: (fontSize: number, fontWeight?: string) => ({
      fontSize: scaleFontSize(fontSize),
      lineHeight: getLineHeight(scaleFontSize(fontSize)),
      ...(fontWeight && { fontWeight }),
    }),
    
    padding: (size: number) => ({
      padding: scaleSpacing(size),
    }),
    
    paddingVertical: (size: number) => ({
      paddingVertical: scaleSpacing(size),
    }),
    
    paddingHorizontal: (size: number) => ({
      paddingHorizontal: scaleSpacing(size),
    }),
    
    margin: (size: number) => ({
      margin: scaleSpacing(size),
    }),
    
    marginVertical: (size: number) => ({
      marginVertical: scaleSpacing(size),
    }),
    
    marginHorizontal: (size: number) => ({
      marginHorizontal: scaleSpacing(size),
    }),
    
    gap: (size: number) => ({
      gap: scaleSpacing(size),
    }),
    
    // Helper para iconos
    icon: (size: number) => ({
      width: scaleSize(size),
      height: scaleSize(size),
    }),
    
    // Helper para border radius
    rounded: (size: number) => ({
      borderRadius: scaleSize(size),
    }),
    
    // Información de plataforma
    isAndroid: Platform.OS === 'android',
    isIOS: Platform.OS === 'ios',
  }), []);
};
