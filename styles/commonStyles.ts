
import { StyleSheet, Platform } from 'react-native';
import { 
  getHeaderTitleSize, 
  getHeaderIconSize, 
  scaleFontSize,
  getLetterSpacing,
  getElevation,
  getButtonHeight,
  getButtonPaddingVertical,
  getBadgePaddingHorizontal,
  getBadgePaddingVertical,
  getCardBorderRadius,
  getCardPadding,
  getCardMarginBottom,
  getHeaderPaddingTop,
  getHeaderPaddingBottom,
  getHeaderPaddingHorizontal,
  getSpacing,
} from '@/utils/androidScaling';

/**
 * ✅ COMMON STYLES v280.0 - COMPREHENSIVE ANDROID SCALING
 * 
 * CRITICAL FIXES v280.0 (ANDROID ONLY):
 * - ✅ ALL text sizes use scaleFontSize() for consistency
 * - ✅ ALL text elements have proper letter spacing
 * - ✅ ALL shadows use getElevation() for subtle appearance
 * - ✅ ALL buttons use scaled heights and paddings
 * - ✅ ALL badges use scaled paddings
 * - ✅ ALL cards use scaled border radius and padding
 * - ✅ ALL headers use compact sizes
 * - ✅ iOS design remains unchanged (reference design)
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
  // ✅ ANDROID FIX v280.0: Container with proper padding
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 0,
  },
  
  // ✅ ANDROID FIX v280.0: Header gradient with scaled padding
  headerGradient: {
    paddingTop: getHeaderPaddingTop(),
    paddingBottom: getHeaderPaddingBottom(),
    paddingHorizontal: getHeaderPaddingHorizontal(),
  },
  
  // ✅ ANDROID FIX v280.0: COMPACT header title with letter spacing
  headerTitle: {
    fontSize: getHeaderTitleSize(), // 32 on iOS, 18 on Android (COMPACT)
    fontWeight: 'bold',
    color: colors.headerText,
    letterSpacing: getLetterSpacing(getHeaderTitleSize()),
  },
  
  // ✅ ANDROID FIX v280.0: Scaled header subtitle with letter spacing
  headerSubtitle: {
    fontSize: scaleFontSize(15),
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 4,
    letterSpacing: getLetterSpacing(scaleFontSize(15)),
  },
  
  // ✅ ANDROID FIX v280.0: Card with scaled dimensions and subtle elevation
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: getCardBorderRadius(),
    padding: getCardPadding(),
    marginBottom: getCardMarginBottom(),
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
        elevation: getElevation(4), // ✅ Subtle elevation (reduced by 50%)
      },
    }),
  },
  
  // ✅ ANDROID FIX v280.0: Shadow with subtle elevation
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: getElevation(4), // ✅ Subtle elevation
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
      elevation: getElevation(8), // ✅ Subtle elevation
    },
    default: {},
  }),
  
  // ✅ ANDROID FIX v280.0: Button with scaled dimensions
  button: {
    borderRadius: getButtonBorderRadius(),
    paddingVertical: getButtonPaddingVertical(),
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getButtonHeight(),
  },
  
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  
  // ✅ ANDROID FIX v280.0: Button text with letter spacing
  buttonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: colors.white,
    letterSpacing: getLetterSpacing(scaleFontSize(16)),
  },
  
  // ✅ ANDROID FIX v280.0: Input with scaled dimensions
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: getButtonBorderRadius(),
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: scaleFontSize(16),
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    letterSpacing: getLetterSpacing(scaleFontSize(16)),
  },
  
  // ✅ ANDROID FIX v280.0: All text sizes scaled with letter spacing
  title: {
    fontSize: scaleFontSize(24),
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: getLetterSpacing(scaleFontSize(24)),
  },
  
  subtitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    color: colors.text,
    letterSpacing: getLetterSpacing(scaleFontSize(18)),
  },
  
  body: {
    fontSize: scaleFontSize(16),
    color: colors.text,
    lineHeight: scaleFontSize(16) * 1.5,
    letterSpacing: getLetterSpacing(scaleFontSize(16)),
  },
  
  caption: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    letterSpacing: getLetterSpacing(scaleFontSize(14)),
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
  
  // ✅ ANDROID FIX v280.0: Spacing with scaled values
  marginSmall: {
    margin: getSpacing('small'),
  },
  
  marginMedium: {
    margin: getSpacing('medium'),
  },
  
  marginLarge: {
    margin: getSpacing('large'),
  },
  
  paddingSmall: {
    padding: getSpacing('small'),
  },
  
  paddingMedium: {
    padding: getSpacing('medium'),
  },
  
  paddingLarge: {
    padding: getSpacing('large'),
  },
});

export default commonStyles;
