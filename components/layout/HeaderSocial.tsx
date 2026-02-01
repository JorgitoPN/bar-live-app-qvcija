
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
 * ✅ HEADER SOCIAL v114.0 - NOTIFICATION BADGE CUTOFF FIX
 * 
 * NEW CHANGES v114.0:
 * - ✅ FIXED: Notification badge no longer cuts off with multi-digit numbers
 * - ✅ IMPROVED: Badge positioning with proper overflow space (top: -8, right: -10)
 * - ✅ IMPROVED: Increased minWidth to 22 for better multi-digit display
 * - ✅ IMPROVED: Added extra padding to iconContainer for badge overflow
 * 
 * Previous changes v113.0:
 * - ✅ REPOSITIONED: "+" icon moved to FAR LEFT corner of screen
 * - ✅ LAYOUT: Changed from flex-end to space-between for proper positioning
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
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={onCreatePost}
          activeOpacity={0.7}
        >
          <IconSymbol 
            ios_icon_name="plus" 
            android_material_icon_name="add" 
            size={Platform.OS === 'android' ? 20 : 24} 
            color={colors.headerText} 
          />
        </TouchableOpacity>

        <View style={styles.rightIconsGroup}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              console.log('[HeaderSocial v114.0] 🔍 Navigating to full-page search');
              router.push('/social/search');
            }}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="magnifyingglass" 
              android_material_icon_name="search" 
              size={Platform.OS === 'android' ? 20 : 24} 
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
                size={Platform.OS === 'android' ? 20 : 24} 
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
                size={Platform.OS === 'android' ? 20 : 24} 
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
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: Platform.OS === 'android' ? 12 : 16,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  rightIconsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  iconContainer: {
    position: 'relative',
    // ✅ FIX v114.0: Extra padding to prevent badge cutoff
    paddingTop: 8,
    paddingRight: 10,
  },
  badge: {
    position: 'absolute',
    // ✅ FIX v114.0: Adjusted positioning to prevent cutoff (was top: -6, right: -6)
    top: -8,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 11,
    // ✅ FIX v114.0: Increased minWidth for multi-digit numbers (was 20)
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.headerGradientStart,
    // ✅ FIX v114.0: Ensure badge is not clipped
    overflow: 'visible',
  },
  badgeText: {
    fontWeight: '700',
    color: colors.white,
  },
});
