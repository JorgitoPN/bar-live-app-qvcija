
import { Platform, PixelRatio } from 'react-native';

/**
 * Factor de escala global para Android
 * Ajusta este valor para cambiar la densidad de toda la UI en Android
 * 0.82 = Reduce elementos al 82% de su tamaño original
 * 1.0 = Sin cambios (tamaño original)
 */
const ANDROID_SCALE_FACTOR = 0.82;

/**
 * Aplica el factor de escala solo en Android
 * En iOS devuelve el valor original sin modificar
 */
export function scale(size: number): number {
  if (Platform.OS === 'android') {
    return size * ANDROID_SCALE_FACTOR;
  }
  return size;
}

/**
 * Escala específica para fuentes
 * Incluye ajuste de letterSpacing para evitar texto amontonado
 */
export function scaleFontSize(size: number): number {
  return scale(size);
}

/**
 * Escala específica para iconos
 */
export function scaleIconSize(size: number): number {
  return scale(size);
}

/**
 * Letter spacing para Android (evita texto amontonado)
 * iOS no necesita ajuste
 */
export function getLetterSpacing(baseFontSize: number): number {
  if (Platform.OS === 'android') {
    // Aumenta ligeramente el espaciado entre letras en Android
    return baseFontSize * 0.02; // 2% del tamaño de fuente
  }
  return 0;
}

/**
 * Escala para paddings y margins
 */
export function scalePadding(size: number): number {
  return scale(size);
}

export function scaleMargin(size: number): number {
  return scale(size);
}

/**
 * Escala para border radius (modales y tarjetas)
 */
export function scaleBorderRadius(size: number): number {
  if (Platform.OS === 'android') {
    // En Android aumentamos el borderRadius para efecto "tarjeta flotante"
    return size * ANDROID_SCALE_FACTOR * 1.2;
  }
  return size;
}

/**
 * Elevación (sombras) suavizada para Android
 * iOS usa shadowOpacity/shadowRadius
 */
export function getElevation(baseElevation: number): number {
  if (Platform.OS === 'android') {
    // Reduce la elevación para sombras sutiles estilo iOS
    return baseElevation * 0.5;
  }
  return 0; // iOS no usa elevation
}

/**
 * Altura de inputs y campos de texto
 */
export function getInputHeight(baseHeight: number): number {
  return scale(baseHeight);
}

/**
 * Separación entre elementos de listas
 */
export function getListItemSpacing(baseSpacing: number): number {
  return scale(baseSpacing);
}

/**
 * Altura de botones
 */
export function getButtonHeight(baseHeight: number): number {
  return scale(baseHeight);
}

/**
 * Tamaño de categorías/chips
 */
export function getCategoryButtonHeight(baseHeight: number): number {
  return scale(baseHeight);
}

/**
 * Margen horizontal para modales en Android (efecto flotante)
 */
export function getModalHorizontalMargin(): number {
  if (Platform.OS === 'android') {
    return 20; // Modales no tocan los bordes
  }
  return 0;
}

/**
 * Altura de headers
 */
export function getHeaderHeight(baseHeight: number): number {
  return scale(baseHeight);
}

/**
 * Tamaño de avatares
 */
export function getAvatarSize(baseSize: number): number {
  return scale(baseSize);
}

/**
 * Altura de la barra de búsqueda
 */
export function getSearchBoxHeight(baseHeight: number): number {
  return scale(baseHeight);
}

/**
 * Tamaño de iconos en categorías
 */
export function getCategoryIconSize(baseSize: number): number {
  return scale(baseSize);
}

/**
 * Tamaño interno de iconos en categorías (círculo interior)
 */
export function getCategoryIconInnerSize(baseSize: number): number {
  return scale(baseSize);
}

/**
 * Tamaño de título en headers
 */
export function getHeaderTitleSize(baseSize: number): number {
  return scaleFontSize(baseSize);
}

/**
 * Tamaño de iconos en headers
 */
export function getHeaderIconSize(baseSize: number): number {
  return scaleIconSize(baseSize);
}

/**
 * Padding inferior para contenido (evita que quede tapado por tab bar)
 */
export function getContentBottomPadding(basePadding: number): number {
  return scale(basePadding);
}

/**
 * Utilidad para aplicar escala a objetos de estilo completos
 */
export function scaleStyle<T extends Record<string, any>>(style: T): T {
  const scaled: any = {};
  
  for (const key in style) {
    const value = style[key];
    
    // Propiedades que deben escalarse
    if (
      typeof value === 'number' &&
      (key.includes('padding') ||
        key.includes('margin') ||
        key.includes('width') ||
        key.includes('height') ||
        key.includes('size') ||
        key.includes('radius') ||
        key.includes('gap') ||
        key.includes('spacing'))
    ) {
      scaled[key] = scale(value);
    } else if (key === 'fontSize') {
      scaled[key] = scaleFontSize(value);
    } else if (key === 'letterSpacing') {
      scaled[key] = getLetterSpacing(style.fontSize || 14);
    } else if (key === 'elevation') {
      scaled[key] = getElevation(value);
    } else {
      scaled[key] = value;
    }
  }
  
  return scaled as T;
}

/**
 * Configuración de sombras para iOS (suavizadas)
 */
export function getIOSShadow(opacity: number = 0.1) {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: opacity,
      shadowRadius: 4,
    };
  }
  return {};
}

/**
 * Configuración de sombras unificada (iOS + Android)
 */
export function getUnifiedShadow(baseElevation: number = 4, iosShadowOpacity: number = 0.1) {
  return {
    ...getIOSShadow(iosShadowOpacity),
    elevation: getElevation(baseElevation),
  };
}
