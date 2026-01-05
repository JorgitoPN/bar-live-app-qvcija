
import { StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';

export const colors = {
  primary: '#162456',    // Material Blue
  secondary: '#193cb8',  // Darker Blue
  accent: '#64B5F6',     // Light Blue
  background: '#101824',  // Keeping dark background
  backgroundAlt: '#162133',  // Keeping dark background
  text: '#e3e3e3',       // Keeping light text
  grey: '#90CAF9',       // Light Blue Grey
  card: '#193cb8',       // Keeping dark card background
  // Header gradient colors
  barLive: '#14B8A6',    // BarLive teal color
  headerGradientStart: '#14B8A6',  // BarLive teal
  headerGradientEnd: '#0D9488',    // Darker teal
  headerText: '#FFFFFF',
  textSecondary: '#9CA3AF',
  cardBackground: '#1F2937',
  cardBorder: '#374151',
  white: '#FFFFFF',
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    width: '100%',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: "white",
  },
  // ✅ FIX: Standardized header title size for Android (20px)
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 20 : 24,
    fontWeight: '700',
    color: colors.text,
  },
  // ✅ FIX: Standardized search box styles
  searchBox: {
    height: Platform.OS === 'android' ? 44 : 48,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: Platform.OS === 'android' ? 15 : 16,
    color: '#FFFFFF',
  },
  // ✅ FIX: Reduced category filter sizes for Android
  categoryFilter: {
    paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryFilterIcon: {
    width: Platform.OS === 'android' ? 20 : 24,
    height: Platform.OS === 'android' ? 20 : 24,
  },
  categoryFilterText: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Header gradient for consistent styling
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 50 : 50,
    paddingBottom: Platform.OS === 'android' ? 20 : 20,
    paddingHorizontal: 16,
  },
});
