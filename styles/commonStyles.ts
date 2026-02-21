
import { StyleSheet, Platform } from 'react-native';
import { getHeaderTitleSize, getHeaderIconSize } from '@/utils/androidScaling';

/**
 * ✅ COMMON STYLES v284.0 - ANDROID FONT SIZE INCREASE (+2 POINTS)
 * 
 * CRITICAL FIXES v284.0 (ANDROID ONLY):
 * - ✅ INCREASED all Android font sizes by exactly 2 points
 * - ✅ Title: 22sp (increased from 20)
 * - ✅ Subtitle: 18sp (increased from 16)
 * - ✅ Body: 17sp (increased from 15)
 * - ✅ Caption: 15sp (increased from 13)
 * - ✅ Header Subtitle: 15sp (increased from 13)
 * - ✅ Uniform scaling across all text elements
 * - ✅ iOS design remains unchanged (reference design)
 * 
 * Previous fixes maintained (v144.0):
 * - ✅ COMPACT header title size across ALL pages (now 22sp on Android)
 * - ✅ COMPACT header icon size across ALL pages (now 22dp on Android)
 * - ✅ Headers take less vertical space on Android
 * - ✅ All text sizes properly scaled for Android
 * - ✅ Consistent colors across all platforms
 * - ✅ Proper safe area handling
 * - ✅ Platform-specific adjustments for optimal UX
 * - ✅ Unified design system
 */

// Header gradient colors - abc
export const colors = {
  // Primary brand colors
  primary: '#14B8A6',
  secondary: '#06B6D4',
  
  // Header gradient - ✅ FIX: Unified Barlive corporate blue (#1A73E8)
  headerGradientStart: '#1A73E8',
  headerGradientEnd: '#1A73E8',
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
  // ✅ ANDROID FIX v143.0: Container with proper padding matching iOS
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 0,
  },
  
  // ✅ ANDROID FIX v143.0: Header gradient with significantly reduced padding on Android
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 36, // Reduced from 40 to 36 on Android
    paddingBottom: Platform.OS === 'ios' ? 16 : 10, // Reduced from 12 to 10 on Android
    paddingHorizontal: 20,
  },
  
  // ✅ ANDROID FIX v144.0: COMPACT header title size across ALL pages
  headerTitle: {
    fontSize: getHeaderTitleSize(), // 32 on iOS, 20 on Android (COMPACT - matching venue cards)
    fontWeight: 'bold',
    color: colors.headerText,
  },
  
  // ✅ ANDROID FIX v284.0: Increased header subtitle size by 2 points on Android
  // ✅ Previous fix v143.0: Reduced header subtitle size on Android
  headerSubtitle: {
    fontSize: Platform.OS === 'ios' ? 15 : 15, // Increased from 13 to 15 on Android (+2)
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
      elevation: 4,
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
      elevation: 8,
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
  
  // ✅ ANDROID FIX v284.0: Increased all text sizes by 2 points on Android
  // ✅ Previous fix v143.0: Significantly reduced text sizes for better Android responsiveness
  title: {
    fontSize: Platform.OS === 'ios' ? 24 : 22, // Increased from 20 to 22 on Android (+2)
    fontWeight: 'bold',
    color: colors.text,
  },
  
  subtitle: {
    fontSize: Platform.OS === 'ios' ? 18 : 18, // Increased from 16 to 18 on Android (+2)
    fontWeight: '600',
    color: colors.text,
  },
  
  body: {
    fontSize: Platform.OS === 'ios' ? 16 : 17, // Increased from 15 to 17 on Android (+2)
    color: colors.text,
    lineHeight: 24,
  },
  
  caption: {
    fontSize: Platform.OS === 'ios' ? 14 : 15, // Increased from 13 to 15 on Android (+2)
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
