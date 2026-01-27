
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
 * ✅ HEADER SOCIAL v107.0 - SEARCH BUTTON ADDED
 * 
 * NEW FEATURES v107.0:
 * - ✅ Added search button to navigate to profile search screen
 * - ✅ Uses valid Material icon "search" for Android
 * - ✅ Positioned between title and action buttons for easy access
 * 
 * Previous fixes maintained (v106.0):
 * - ✅ Fixed + icon on Android: Changed from "add_box" to "add_circle" (valid Material icon)
 * - ✅ "add_box" was showing "?" on Android because it's not a valid Material Icons name
 * - ✅ "add_circle" is the correct Material icon for a plus button
 * - ✅ All other icons already use valid names
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
          { fontSize: Platform.OS === 'android' ? scaleFontSize(30) : 32 }
        ]}>
          Social
        </Text>
        <View style={styles.headerActions}>
          {/* ✅ NEW v107.0: Search button for profile search */}
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/social/buscar-usuario')}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="magnifyingglass" 
              android_material_icon_name="search" 
              size={Platform.OS === 'android' ? scaleIconSize(28) : 28} 
              color={colors.headerText} 
            />
          </TouchableOpacity>

          {/* ✅ CRITICAL FIX v106.0: Changed android_material_icon_name from "add_box" to "add_circle" */}
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={onCreatePost}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="plus.app" 
              android_material_icon_name="add_circle" 
              size={Platform.OS === 'android' ? scaleIconSize(28) : 28} 
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
                size={Platform.OS === 'android' ? scaleIconSize(28) : 28} 
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
                size={Platform.OS === 'android' ? scaleIconSize(28) : 28} 
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
    paddingTop: 50,
    paddingBottom: 16,
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
