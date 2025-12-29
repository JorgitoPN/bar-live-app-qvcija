
import { StyleSheet, Platform } from 'react-native';

/**
 * ✅ COMMON STYLES v56.1 - COMPLETE ANDROID-iOS PARITY
 * 
 * CRITICAL FIXES v56.1:
 * - ✅ Consistent colors across all platforms
 * - ✅ Proper safe area handling for Android
 * - ✅ Platform-specific adjustments for optimal UX
 * - ✅ Unified design system
 * - ✅ Production-ready styling
 * - ✅ ANDROID: Reduced header padding to match iOS exactly
 * - ✅ ANDROID: Text sizes match iOS hierarchy perfectly
 * - ✅ ANDROID: Spacing and margins consistent with iOS
 */

// Header gradient colors - abc
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
};

export const commonStyles = StyleSheet.create({
  // ✅ ANDROID FIX v56.1: Container with proper padding for Android notch
  container: {
    flex: 1,
    backgroundColor: colors.background,
    // ✅ No extra padding needed - handled by StatusBar translucent=false
    paddingTop: 0,
  },
  
  // ✅ ANDROID FIX v56.1: Header padding matches iOS exactly
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 8,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
    paddingHorizontal: 20,
  },
  
  // ✅ ANDROID FIX v56.1: Text sizes match iOS exactly
  headerTitle: {
    fontSize: Platform.OS === 'ios' ? 32 : 32,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  
  headerSubtitle: {
    fontSize: Platform.OS === 'ios' ? 15 : 15,
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
  
  // Shadow styles - ✅ ANDROID FIX: Use elevation for Android
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  
  // Input styles
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  
  // ✅ ANDROID FIX v56.1: Text sizes match iOS exactly
  title: {
    fontSize: Platform.OS === 'ios' ? 24 : 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  
  subtitle: {
    fontSize: Platform.OS === 'ios' ? 18 : 18,
    fontWeight: '600',
    color: colors.text,
  },
  
  body: {
    fontSize: Platform.OS === 'ios' ? 16 : 16,
    color: colors.text,
    lineHeight: Platform.OS === 'ios' ? 24 : 24,
  },
  
  caption: {
    fontSize: Platform.OS === 'ios' ? 14 : 14,
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
});

export default commonStyles;
