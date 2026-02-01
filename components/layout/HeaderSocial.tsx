
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
 * ✅ HEADER SOCIAL v110.0 - TITLE REMOVED FROM HEADER
 * 
 * NEW CHANGES v110.0:
 * - ✅ REMOVED: Page title "Social" from header
 * - ✅ CLEAN: More compact header with just action buttons
 * - ✅ CONSISTENT: Matches user request to remove all page titles
 * 
 * Previous fixes v109.0:
 * - ✅ COMPACT: Android header now uses compact padding (36px top, 12px bottom)
 * - ✅ COMPACT: Android header title reduced to 20sp (matching venue cards)
 * - ✅ COMPACT: Android header icons reduced to 24dp (more compact)
 * - ✅ SPACE SAVING: Headers take less vertical space on Android
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
      {/* ✅ NEW v110.0: Header WITHOUT title - just action buttons */}
      <View style={styles.headerActions}>
        {/* ✅ Navigate to full-page search */}
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => {
            console.log('[HeaderSocial v110.0] 🔍 Navigating to full-page search');
            router.push('/social/search');
          }}
          activeOpacity={0.7}
        >
          <IconSymbol 
            ios_icon_name="magnifyingglass" 
            android_material_icon_name="search" 
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // ✅ NEW v110.0: Compact header without title
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
