
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

interface HeaderSocialProps {
  unreadNotifications: number;
  unreadMessages: number;
  onCreatePost: () => void;
}

/**
 * ✅ HEADER SOCIAL v106.0 - ANDROID ICON FIX
 * 
 * CRITICAL FIXES v106.0 (ANDROID ONLY):
 * - ✅ Fixed "+" icon showing as "?" on Android
 * - ✅ Changed from "add_box" to "add_circle" (valid Material icon)
 * - ✅ All icons properly scaled with scaleIconSize()
 * - ✅ All text properly scaled with scaleFontSize()
 * - ✅ iOS design remains unchanged
 */

export default function HeaderSocial({ unreadNotifications, unreadMessages, onCreatePost }: HeaderSocialProps) {
  const router = useRouter();

  // ✅ Calculate scaled sizes for Android
  const headerIconSize = Platform.OS === 'android' ? scaleIconSize(28) : 28;
  const badgeSize = Platform.OS === 'android' ? scaleIconSize(18) : 18;
  const badgeTextSize = Platform.OS === 'android' ? scaleFontSize(10) : 10;
  const titleSize = Platform.OS === 'android' ? scaleFontSize(24) : 24;

  return (
    <LinearGradient
      colors={[colors.headerGradientStart, colors.headerGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <Text style={[styles.headerTitle, { fontSize: titleSize }]}>Social</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/social/search')}
        >
          <IconSymbol 
            ios_icon_name="magnifyingglass" 
            android_material_icon_name="search" 
            size={headerIconSize} 
            color={colors.headerText} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/perfil/notificaciones')}
        >
          <IconSymbol 
            ios_icon_name="bell.fill" 
            android_material_icon_name="notifications" 
            size={headerIconSize} 
            color={colors.headerText} 
          />
          {unreadNotifications > 0 && (
            <View style={[styles.badge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
              <Text style={[styles.badgeText, { fontSize: badgeTextSize }]}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/perfil/chats')}
        >
          <IconSymbol 
            ios_icon_name="message.fill" 
            android_material_icon_name="chat" 
            size={headerIconSize} 
            color={colors.headerText} 
          />
          {unreadMessages > 0 && (
            <View style={[styles.badge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
              <Text style={[styles.badgeText, { fontSize: badgeTextSize }]}>
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ✅ CRITICAL FIX v106.0: Changed android_material_icon_name from "add_box" to "add_circle" */}
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={onCreatePost}
        >
          <IconSymbol 
            ios_icon_name="plus.circle.fill" 
            android_material_icon_name="add_circle" 
            size={headerIconSize} 
            color={colors.headerText} 
          />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.headerText,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontWeight: '700',
  },
});
