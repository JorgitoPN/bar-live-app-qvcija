
import { StyleSheet, Platform } from 'react-native';
import {
  scale,
  scaleFontSize,
  scaleIconSize,
  scalePadding,
  scaleMargin,
  scaleBorderRadius,
  getElevation,
  getLetterSpacing,
  getInputHeight,
  getButtonHeight,
  getModalHorizontalMargin,
  getUnifiedShadow,
} from '@/utils/androidScaling';

// Colores base de la aplicación
export const colors = {
  // Colores principales
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8C5A',
  
  // Colores de fondo
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F0F0F0',
  
  // Colores de texto
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textLight: '#FFFFFF',
  
  // Colores de estado
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Colores de borde
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  // Colores de sombra
  shadow: '#000000',
  
  // Colores de overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Colores de gradiente (para headers, etc.)
  // Header gradient colors abc
  gradientStart: '#FF6B35',
  gradientEnd: '#FF8C5A',
};

// Espaciado base (escalado automáticamente en Android)
export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),
};

// Tipografía (escalada automáticamente en Android con letterSpacing)
export const typography = {
  // Títulos
  h1: {
    fontSize: scaleFontSize(32),
    fontWeight: '700' as const,
    letterSpacing: getLetterSpacing(32),
    lineHeight: scaleFontSize(40),
  },
  h2: {
    fontSize: scaleFontSize(28),
    fontWeight: '700' as const,
    letterSpacing: getLetterSpacing(28),
    lineHeight: scaleFontSize(36),
  },
  h3: {
    fontSize: scaleFontSize(24),
    fontWeight: '600' as const,
    letterSpacing: getLetterSpacing(24),
    lineHeight: scaleFontSize(32),
  },
  h4: {
    fontSize: scaleFontSize(20),
    fontWeight: '600' as const,
    letterSpacing: getLetterSpacing(20),
    lineHeight: scaleFontSize(28),
  },
  h5: {
    fontSize: scaleFontSize(18),
    fontWeight: '600' as const,
    letterSpacing: getLetterSpacing(18),
    lineHeight: scaleFontSize(24),
  },
  h6: {
    fontSize: scaleFontSize(16),
    fontWeight: '600' as const,
    letterSpacing: getLetterSpacing(16),
    lineHeight: scaleFontSize(22),
  },
  
  // Cuerpo de texto
  body: {
    fontSize: scaleFontSize(16),
    fontWeight: '400' as const,
    letterSpacing: getLetterSpacing(16),
    lineHeight: scaleFontSize(24),
  },
  bodySmall: {
    fontSize: scaleFontSize(14),
    fontWeight: '400' as const,
    letterSpacing: getLetterSpacing(14),
    lineHeight: scaleFontSize(20),
  },
  caption: {
    fontSize: scaleFontSize(12),
    fontWeight: '400' as const,
    letterSpacing: getLetterSpacing(12),
    lineHeight: scaleFontSize(16),
  },
  
  // Botones y labels
  button: {
    fontSize: scaleFontSize(16),
    fontWeight: '600' as const,
    letterSpacing: getLetterSpacing(16),
  },
  buttonSmall: {
    fontSize: scaleFontSize(14),
    fontWeight: '600' as const,
    letterSpacing: getLetterSpacing(14),
  },
  label: {
    fontSize: scaleFontSize(14),
    fontWeight: '500' as const,
    letterSpacing: getLetterSpacing(14),
  },
};

// Border radius (escalado con factor aumentado para Android)
export const borderRadius = {
  xs: scaleBorderRadius(4),
  sm: scaleBorderRadius(8),
  md: scaleBorderRadius(12),
  lg: scaleBorderRadius(16),
  xl: scaleBorderRadius(24),
  full: 9999,
};

// Sombras unificadas (iOS + Android con elevación reducida)
export const shadows = {
  sm: getUnifiedShadow(2, 0.05),
  md: getUnifiedShadow(4, 0.1),
  lg: getUnifiedShadow(8, 0.15),
  xl: getUnifiedShadow(12, 0.2),
};

// Estilos comunes
export const commonStyles = StyleSheet.create({
  // Contenedores
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  containerPadded: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  
  // Tarjetas (con margen horizontal en Android para efecto flotante)
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: Platform.OS === 'android' ? getModalHorizontalMargin() : 0,
    ...shadows.md,
  },
  cardCompact: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginHorizontal: Platform.OS === 'android' ? getModalHorizontalMargin() / 2 : 0,
    ...shadows.sm,
  },
  
  // Botones (altura reducida en Android)
  button: {
    height: getButtonHeight(48),
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  buttonText: {
    ...typography.button,
    color: colors.textLight,
  },
  buttonSecondary: {
    height: getButtonHeight(48),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSecondaryText: {
    ...typography.button,
    color: colors.text,
  },
  buttonSmall: {
    height: getButtonHeight(36),
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonSmallText: {
    ...typography.buttonSmall,
    color: colors.textLight,
  },
  
  // Inputs (altura reducida en Android)
  input: {
    height: getInputHeight(48),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: scaleFontSize(16),
    letterSpacing: getLetterSpacing(16),
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  inputError: {
    borderColor: colors.error,
  },
  
  // Modales (con margen horizontal en Android)
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    marginHorizontal: getModalHorizontalMargin(),
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text,
  },
  
  // Headers
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text,
  },
  
  // Listas (separación reducida en Android)
  listItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listItemTitle: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  listItemSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  
  // Categorías/Chips (altura y padding reducidos en Android)
  categoryButton: {
    height: getButtonHeight(36),
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    ...typography.buttonSmall,
    color: colors.text,
  },
  categoryButtonTextActive: {
    color: colors.textLight,
  },
  
  // Badges
  badge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '600',
  },
  
  // Dividers
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  
  // Texto
  textPrimary: {
    ...typography.body,
    color: colors.text,
  },
  textSecondary: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  textCaption: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  
  // Centrado
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Flex
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Safe Area (respeta barras de estado y navegación)
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

// Constantes de altura para headers (escaladas)
export const HEADER_MAX_HEIGHT = scale(120);
export const HEADER_MIN_HEIGHT = scale(60);
export const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// Constantes de tab bar (escaladas)
export const TAB_BAR_HEIGHT = scale(60);
export const TAB_BAR_ICON_SIZE = scaleIconSize(24);

// Constantes de avatares (escaladas)
export const AVATAR_SIZE_SMALL = scale(32);
export const AVATAR_SIZE_MEDIUM = scale(48);
export const AVATAR_SIZE_LARGE = scale(64);
export const AVATAR_SIZE_XLARGE = scale(96);

// Constantes de iconos (escaladas)
export const ICON_SIZE_SMALL = scaleIconSize(16);
export const ICON_SIZE_MEDIUM = scaleIconSize(24);
export const ICON_SIZE_LARGE = scaleIconSize(32);
export const ICON_SIZE_XLARGE = scaleIconSize(48);
