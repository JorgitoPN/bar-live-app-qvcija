
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

interface HeaderSocialProps {
  unreadNotifications: number;
  unreadMessages: number;
  onCreatePost: () => void;
}

/**
 * ✅ HEADER SOCIAL v109.0 - ANDROID COMPACT HEADERS
 * 
 * NEW FIXES v109.0:
 * - ✅ COMPACT: Android header now uses compact padding (36px top, 12px bottom)
 * - ✅ COMPACT: Android header title reduced to 20sp (matching venue cards)
 * - ✅ COMPACT: Android header icons reduced to 24dp (more compact)
 * - ✅ SPACE SAVING: Headers take less vertical space on Android
 * 
 * Previous features maintained (v108.0):
 * - ✅ NAVIGATION: Search button now navigates to /social/search (full page)
 * - ✅ NO MODAL: Removed SearchModal component usage
 * - ✅ BETTER UX: Full-page search provides better navigation consistency
 * - ✅ Fixed + icon on Android: Changed from "add_box" to "add_circle" (valid Material icon)
 * - ✅ All icons use valid Material Icons names
 */

export default function HeaderSocial({ 
  unreadNotifications, 
  unreadMessages, 
  onCreatePost 
}: HeaderSocialProps) {
  const router = useRouter();

  return (
    <LinearGradient
      colors={[colors.headerGradientStart, colors.headerGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <Text style={[
          styles.headerTitle,
          // ✅ FIX v109.0: Compact header title on Android (20sp instead of 30sp)
          { fontSize: Platform.OS === 'android' ? 20 : 32 }
        ]}>
          Social
        </Text>
        <View style={styles.headerActions}>
          {/* ✅ NEW v108.0: Navigate to full-page search instead of modal */}
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              console.log('[HeaderSocial v108.0] 🔍 Navigating to full-page search');
              router.push('/social/search');
            }}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="magnifyingglass" 
              android_material_icon_name="search" 
              // ✅ FIX v109.0: Compact icon size on Android (24dp instead of 28dp)
              size={Platform.OS === 'android' ? 24 : 28} 
              color={colors.headerText} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerButton}
            onPress={onCreatePost}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="plus.app" 
              android_material_icon_name="add_circle" 
              // ✅ FIX v109.0: Compact icon size on Android (24dp instead of 28dp)
              size={Platform.OS === 'android' ? 24 : 28} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/(tabs)/perfil/notificaciones')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <IconSymbol 
                ios_icon_name="bell.fill" 
                android_material_icon_name="notifications" 
                // ✅ FIX v109.0: Compact icon size on Android (24dp instead of 28dp)
                size={Platform.OS === 'android' ? 24 : 28} 
                color={colors.headerText} 
              />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={[styles.badgeText, { fontSize: scaleFontSize(10) }]}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/(tabs)/perfil/chats')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <IconSymbol 
                ios_icon_name="message.fill" 
                android_material_icon_name="message" 
                // ✅ FIX v109.0: Compact icon size on Android (24dp instead of 28dp)
                size={Platform.OS === 'android' ? 24 : 28} 
                color={colors.headerText} 
              />
              {unreadMessages > 0 && (
                <View style={styles.badge}>
                  <Text style={[styles.badgeText, { fontSize: scaleFontSize(10) }]}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    // ✅ FIX v109.0: Compact padding on Android (36px top, 12px bottom)
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: Platform.OS === 'android' ? 12 : 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
    // ✅ FIX v109.0: Compact title size on Android (20sp instead of 32sp)
    fontSize: Platform.OS === 'android' ? 20 : 32,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.headerGradientStart,
  },
  badgeText: {
    fontWeight: '700',
    color: colors.white,
  },
});
