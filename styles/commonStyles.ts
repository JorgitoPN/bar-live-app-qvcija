
import { StyleSheet } from 'react-native';
import { barLiveColors } from '@/constants/Colors';

export const colors = {
  // Header gradient colors abc
  headerGradientStart: barLiveColors.teal400,
  headerGradientEnd: barLiveColors.cyan500,
  headerText: barLiveColors.white,
  white: barLiveColors.white,
  
  // Bottom menu colors
  tabActiveBackground: barLiveColors.white,
  tabActiveText: barLiveColors.teal500,
  tabInactiveBackground: 'rgba(255, 255, 255, 0.2)',
  tabInactiveText: barLiveColors.white,
  
  // Central button
  centralButtonGradientStart: barLiveColors.teal400,
  centralButtonGradientEnd: barLiveColors.cyan500,
  centralButtonText: barLiveColors.white,
  centralButtonBorder: barLiveColors.white,
  
  // Cards
  cardBackground: barLiveColors.white,
  cardBorder: barLiveColors.gray200,
  
  // Badges
  badgeDestacado: barLiveColors.yellow400,
  badgeDestacadoText: barLiveColors.yellow900,
  badgeNuevo: barLiveColors.red500,
  badgeNuevoText: barLiveColors.white,
  
  // General
  text: '#11181C',
  textSecondary: '#4B5563', // FIXED: Darker gray for better visibility (was #6B7280)
  background: '#F9FAFB',
  primary: barLiveColors.teal400,
  secondary: barLiveColors.cyan500,
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeDestacado: {
    backgroundColor: colors.badgeDestacado,
  },
  badgeDestacadoText: {
    color: colors.badgeDestacadoText,
    fontSize: 12,
    fontWeight: '600',
  },
  badgeNuevo: {
    backgroundColor: colors.badgeNuevo,
  },
  badgeNuevoText: {
    color: colors.badgeNuevoText,
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
});
