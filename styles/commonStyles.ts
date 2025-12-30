
import { StyleSheet, Platform } from 'react-native';

/**
 * ✅ COMMON STYLES v69.0 - NORMALIZED ANDROID-iOS SIZES
 * 
 * CRITICAL FIXES v69.0:
 * - ✅ Android: Text sizes normalized to 80% of iOS (was 50%, too small)
 * - ✅ Android: Icon sizes normalized to 85% of iOS (was 55%, too small)
 * - ✅ Android: Proper proportions for all UI elements
 * - ✅ iOS: No changes to maintain current design
 * - ✅ STANDARD: Follows mobile app design guidelines
 */

// Header gradient colors abc
export const colors = {
  // Primary brand colors
  primary: '#14B8A6',
  secondary: '#06B6D4',
  
  // Header gradient
  headerGradientStart: '#14B8A6',
  headerGradientEnd: '#06B6D4',
  headerText: '#FFFFFF',
  
  // Background colors
  background: '#F9FAFB',
  cardBackground: '#FFFFFF',
  cardBorder: '#E5E7EB',
  
  // Text colors
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Badge colors
  badgeAbierto: '#22C55E',
  badgeCerrado: '#EF4444',
  badgeCierraPronto: '#F97316',
  badgeAbrePronto: '#EAB308',
  badgeNuevo: '#EF4444',
  badgeDestacado: '#FACC15',
  badgeNuevoText: '#FFFFFF',
  badgeDestacadoText: '#92400E',
  
  // Social colors
  like: '#EF4444',
  comment: '#3B82F6',
  share: '#10B981',
  save: '#F59E0B',
  
  // Utility colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  
  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
  
  // Card colors
  card: '#FFFFFF',
};

// ✅ CRITICAL v69.0: NORMALIZED HEADER DIMENSIONS
export const HEADER_DIMENSIONS = {
  // ✅ ANDROID v69.0: Normalized padding (80% of iOS)
  paddingTop: Platform.OS === 'ios' ? 50 : 40,
  paddingBottom: Platform.OS === 'ios' ? 16 : 13,
  paddingHorizontal: 20,
  
  // ✅ Total header height for calculations
  totalHeight: Platform.OS === 'ios' ? 110 : 90,
};

export const commonStyles = StyleSheet.create({
  // ✅ ANDROID FIX v69.0: Container with proper safe area handling
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 0,
  },
  
  // ✅ ANDROID FIX v69.0: STANDARDIZED header gradient for ALL pages
  headerGradient: {
    paddingTop: HEADER_DIMENSIONS.paddingTop,
    paddingBottom: HEADER_DIMENSIONS.paddingBottom,
    paddingHorizontal: HEADER_DIMENSIONS.paddingHorizontal,
  },
  
  // ✅ ANDROID FIX v69.0: Normalized text sizes on Android (80% of iOS)
  headerTitle: {
    fontSize: Platform.OS === 'ios' ? 32 : 26, // 80% of iOS
    fontWeight: 'bold',
    color: colors.headerText,
  },
  
  headerSubtitle: {
    fontSize: Platform.OS === 'ios' ? 15 : 12, // 80% of iOS
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 4,
  },
  
  // Card styles
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  
  // Shadow styles
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),
  
  shadowLarge: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
    default: {},
  }),
  
  // Button styles
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  
  buttonText: {
    fontSize: Platform.OS === 'ios' ? 16 : 13, // 80% of iOS
    fontWeight: '600',
    color: colors.white,
  },
  
  // Input styles
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: Platform.OS === 'ios' ? 16 : 13, // 80% of iOS
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  
  // ✅ ANDROID FIX v69.0: Normalized text sizes on Android (80% of iOS)
  title: {
    fontSize: Platform.OS === 'ios' ? 24 : 19, // 80% of iOS
    fontWeight: 'bold',
    color: colors.text,
  },
  
  subtitle: {
    fontSize: Platform.OS === 'ios' ? 18 : 14, // 80% of iOS
    fontWeight: '600',
    color: colors.text,
  },
  
  body: {
    fontSize: Platform.OS === 'ios' ? 16 : 13, // 80% of iOS
    color: colors.text,
    lineHeight: Platform.OS === 'ios' ? 24 : 19, // Proportionally smaller on Android
  },
  
  caption: {
    fontSize: Platform.OS === 'ios' ? 14 : 11, // 80% of iOS
    color: colors.textSecondary,
  },
  
  // Layout styles
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  column: {
    flexDirection: 'column',
  },
  
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  spaceBetween: {
    justifyContent: 'space-between',
  },
  
  // Spacing
  marginSmall: {
    margin: 8,
  },
  
  marginMedium: {
    margin: 16,
  },
  
  marginLarge: {
    margin: 24,
  },
  
  paddingSmall: {
    padding: 8,
  },
  
  paddingMedium: {
    padding: 16,
  },
  
  paddingLarge: {
    padding: 24,
  },
  
  // Badge styles
  badgeNuevo: {
    backgroundColor: colors.badgeNuevo,
    paddingHorizontal: Platform.OS === 'ios' ? 8 : 6,
    paddingVertical: Platform.OS === 'ios' ? 4 : 3,
    borderRadius: 6,
  },
  
  badgeNuevoText: {
    fontSize: Platform.OS === 'ios' ? 12 : 10, // 80% of iOS
    fontWeight: '700',
    color: colors.badgeNuevoText,
  },
  
  cardShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),
});

export default commonStyles;
