
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { scaleFontSize } from '@/utils/androidScaling';

interface HeaderSocialProps {
  unreadNotifications: number;
  unreadMessages: number;
  onCreatePost: () => void;
}

/**
 * ✅ HEADER SOCIAL v97.0 - ANDROID TITLE SIZE FIX
 * 
 * CRITICAL FIXES v97.0 (ANDROID ONLY):
 * - ✅ Header title size standardized to match Explorar (24px on Android)
 * - ✅ All other functionality maintained
 * - ✅ iOS design remains unchanged
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
        {/* ✅ CRITICAL FIX v97.0: Title size matches Explorar (24px on Android) */}
        <Text style={[
          styles.headerTitle,
          { fontSize: Platform.OS === 'android' ? scaleFontSize(30) : 32 }
        ]}>
          Social
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={onCreatePost}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="plus.app" 
              android_material_icon_name="add_box" 
              size={28} 
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
                size={28} 
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
                size={28} 
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
