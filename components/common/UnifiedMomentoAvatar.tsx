
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface UnifiedMomentoAvatarProps {
  userId?: string;
  localId?: string;
  imageUrl?: string | null;
  size?: number;
  onPress?: () => void;
  onAddPress?: () => void;
  showAddButton?: boolean;
  isOwner?: boolean;
}

/**
 * ✅ UNIFIED MOMENTO AVATAR v53.0 - FURTHER REDUCED NEON BORDER THICKNESS
 * 
 * CRITICAL FIXES v53.0:
 * - ✅ Neon border thickness FURTHER REDUCED to 1.5px (was 2px)
 * - ✅ Border is ALWAYS visible (not covered by image)
 * - ✅ Image is rendered INSIDE the border with proper padding
 * - ✅ Border uses LinearGradient for neon effect
 * - ✅ Real-time synchronization of momento status
 * - ✅ Consistent design across all pages
 * - ✅ Add button for uploading momentos
 */

export default function UnifiedMomentoAvatar({
  userId,
  localId,
  imageUrl,
  size = 88,
  onPress,
  onAddPress,
  showAddButton = false,
  isOwner = false,
}: UnifiedMomentoAvatarProps) {
  const { user } = useAuth();
  const [hasUnviewedMomentos, setHasUnviewedMomentos] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ CRITICAL FIX v53.0: Border width FURTHER REDUCED from 2 to 1.5
  const BORDER_WIDTH = 1.5; // Even thinner neon border (was 2)
  const PADDING = 3; // Space between border and image
  const innerSize = size - (BORDER_WIDTH + PADDING) * 2;

  const checkUnviewedMomentos = useCallback(async () => {
    if (!user) {
      console.log('[UnifiedMomentoAvatar v53.0] ℹ️ No user, skipping check');
      setLoading(false);
      setHasUnviewedMomentos(false);
      return;
    }

    if (!userId && !localId) {
      console.log('[UnifiedMomentoAvatar v53.0] ℹ️ No userId or localId provided');
      setLoading(false);
      setHasUnviewedMomentos(false);
      return;
    }

    try {
      console.log('[UnifiedMomentoAvatar v53.0] 🔍 Checking momentos for:', { userId, localId });

      // Get momentos for this user/local
      const query = supabase
        .from('momentos')
        .select('id')
        .gt('expires_at', new Date().toISOString());

      if (userId) {
        query.eq('autor_id', userId).eq('tipo', 'usuario');
      } else if (localId) {
        query.eq('local_id', localId).eq('tipo', 'local');
      }

      const { data: momentosData, error: momentosError } = await query;

      if (momentosError) {
        console.error('[UnifiedMomentoAvatar v53.0] ❌ Error fetching momentos:', momentosError);
        setHasUnviewedMomentos(false);
        setLoading(false);
        return;
      }

      if (!momentosData || momentosData.length === 0) {
        console.log('[UnifiedMomentoAvatar v53.0] ℹ️ No momentos found');
        setHasUnviewedMomentos(false);
        setLoading(false);
        return;
      }

      console.log('[UnifiedMomentoAvatar v53.0] ✅ Found momentos:', momentosData.length);

      // Check if user has viewed any of these momentos
      const momentoIds = momentosData.map(m => m.id);
      const { data: viewsData, error: viewsError } = await supabase
        .from('momento_views')
        .select('momento_id')
        .eq('usuario_id', user.id)
        .in('momento_id', momentoIds);

      if (viewsError) {
        console.error('[UnifiedMomentoAvatar v53.0] ❌ Error fetching views:', viewsError);
      }

      const viewedIds = new Set(viewsData?.map(v => v.momento_id) || []);
      const hasUnviewed = momentosData.some(m => !viewedIds.has(m.id));

      console.log('[UnifiedMomentoAvatar v53.0] 🎯 Result:', {
        totalMomentos: momentosData.length,
        viewedCount: viewedIds.size,
        hasUnviewed,
      });

      setHasUnviewedMomentos(hasUnviewed);
    } catch (error) {
      console.error('[UnifiedMomentoAvatar v53.0] ❌ Error checking momentos:', error);
      setHasUnviewedMomentos(false);
    } finally {
      setLoading(false);
    }
  }, [user, userId, localId]);

  useEffect(() => {
    checkUnviewedMomentos();

    if (!userId && !localId) {
      return;
    }

    // Subscribe to real-time updates for momentos and views
    const momentosChannel = supabase
      .channel(`momento-updates-unified-${userId || localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momentos',
          filter: userId ? `autor_id=eq.${userId}` : `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[UnifiedMomentoAvatar v53.0] 🔄 Momento update detected:', payload);
          checkUnviewedMomentos();
        }
      )
      .subscribe();

    // Subscribe to view updates for current user
    const viewsChannel = user ? supabase
      .channel(`momento-views-unified-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'momento_views',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[UnifiedMomentoAvatar v53.0] 🔄 View update detected:', payload);
          checkUnviewedMomentos();
        }
      )
      .subscribe() : null;

    return () => {
      supabase.removeChannel(momentosChannel);
      if (viewsChannel) {
        supabase.removeChannel(viewsChannel);
      }
    };
  }, [userId, localId, checkUnviewedMomentos, user]);

  // ✅ CRITICAL FIX: Render border OUTSIDE the image container
  const renderAvatar = () => (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {/* ✅ NEON BORDER - Rendered FIRST (bottom layer) */}
      {hasUnviewedMomentos && !loading ? (
        <LinearGradient
          colors={['#00FF88', '#00FFAA', '#00FF88']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.neonBorder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.normalBorder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      )}

      {/* ✅ IMAGE - Rendered INSIDE the border (top layer) */}
      <View
        style={[
          styles.imageContainer,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            position: 'absolute',
            top: BORDER_WIDTH + PADDING,
            left: BORDER_WIDTH + PADDING,
          },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.avatarImage,
              {
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
              },
            ]}
          >
            <IconSymbol
              ios_icon_name={localId ? 'building.2.fill' : 'person.fill'}
              android_material_icon_name={localId ? 'store' : 'person'}
              size={innerSize * 0.6}
              color={colors.white}
            />
          </View>
        )}
      </View>

      {/* ✅ ADD BUTTON - Only for owner */}
      {showAddButton && isOwner && onAddPress && (
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: (size * 0.3) / 2,
              bottom: 0,
              right: 0,
            },
          ]}
          onPress={onAddPress}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.addButtonGradient}
          >
            <IconSymbol
              ios_icon_name="plus"
              android_material_icon_name="add"
              size={size * 0.18}
              color={colors.white}
            />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {renderAvatar()}
      </TouchableOpacity>
    );
  }

  return renderAvatar();
}

const styles = StyleSheet.create({
  avatarContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  neonBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  normalBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.cardBorder,
  },
  imageContainer: {
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  avatarImage: {
    backgroundColor: colors.cardBackground,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 100,
  },
});
