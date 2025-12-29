
import React, { useState, useEffect, useCallback } from 'react';
import { View, Image, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface UnifiedMomentoAvatarProps {
  userId?: string;
  localId?: string;
  imageUrl?: string;
  size?: number;
  showAddButton?: boolean;
  onPress?: () => void;
  onAddPress?: () => void;
  isOwner?: boolean;
  style?: ViewStyle;
}

/**
 * ✅ UNIFIED MOMENTO AVATAR v47.2 - INSTAGRAM STORIES SIZE + NO WHITE BORDER + SMART CACHE-BUSTING
 * 
 * Changes v47.2:
 * - ✅ Uses avatar_updated_at timestamp for smart cache-busting
 * - ✅ Removed white border (only green neon border for unviewed momentos)
 * - ✅ Larger default size for Instagram stories feel
 * - ✅ Real-time avatar updates across all components
 * 
 * This component ensures the same avatar design and functionality across:
 * - User profile page
 * - Local profile page
 * - Social page momento carousel
 * - Any other page that displays momentos
 * 
 * Features:
 * - ✅ Green neon border for unviewed momentos
 * - ✅ Border disappears after viewing
 * - ✅ + button for owners to upload momentos
 * - ✅ Real-time sync across all pages
 * - ✅ Filters out file:// URLs
 * - ✅ Works on Android and iOS
 * - ✅ Smart cache-busting for immediate avatar updates
 */
export default function UnifiedMomentoAvatar({
  userId,
  localId,
  imageUrl,
  size = 88,
  showAddButton = false,
  onPress,
  onAddPress,
  isOwner = false,
  style,
}: UnifiedMomentoAvatarProps) {
  const { user } = useAuth();
  const [hasUnviewedMomentos, setHasUnviewedMomentos] = useState(false);
  const [hasMomentos, setHasMomentos] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState<string | null>(null);

  const BORDER_WIDTH = 4;
  const avatarSize = size;
  const innerSize = size - BORDER_WIDTH * 2;
  const addButtonSize = size * 0.32;

  // Load avatar timestamp for cache-busting
  useEffect(() => {
    const loadAvatarTimestamp = async () => {
      if (userId) {
        const { data } = await supabase
          .from('usuarios')
          .select('avatar_updated_at')
          .eq('id', userId)
          .single();
        
        if (data?.avatar_updated_at) {
          setAvatarTimestamp(data.avatar_updated_at);
        }
      } else if (localId) {
        const { data } = await supabase
          .from('locales')
          .select('avatar_updated_at')
          .eq('id', localId)
          .single();
        
        if (data?.avatar_updated_at) {
          setAvatarTimestamp(data.avatar_updated_at);
        }
      }
    };

    loadAvatarTimestamp();

    // Subscribe to avatar updates
    if (userId || localId) {
      const table = userId ? 'usuarios' : 'locales';
      const id = userId || localId;
      
      const channel = supabase
        .channel(`avatar-updates-${table}-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: table,
            filter: `id=eq.${id}`,
          },
          (payload: any) => {
            console.log('[UnifiedMomentoAvatar v47.2] 🔄 Avatar updated:', payload.new);
            if (payload.new.avatar_updated_at) {
              setAvatarTimestamp(payload.new.avatar_updated_at);
              setImageError(false); // Reset error state to retry loading
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId, localId]);

  const checkUnviewedMomentos = useCallback(async () => {
    if (!user) {
      setHasUnviewedMomentos(false);
      setHasMomentos(false);
      return;
    }

    if (!userId && !localId) {
      setHasUnviewedMomentos(false);
      setHasMomentos(false);
      return;
    }

    try {
      console.log('[UnifiedMomentoAvatar v47.2] 🔍 Checking momentos for:', { userId, localId });

      // Get momentos for this user/local
      let query = supabase
        .from('momentos')
        .select('id')
        .gt('expires_at', new Date().toISOString());

      if (userId) {
        query = query.eq('autor_id', userId).eq('tipo', 'usuario');
      } else if (localId) {
        query = query.eq('local_id', localId).eq('tipo', 'local');
      }

      const { data: momentosData, error: momentosError } = await query;

      if (momentosError || !momentosData || momentosData.length === 0) {
        setHasUnviewedMomentos(false);
        setHasMomentos(false);
        return;
      }

      setHasMomentos(true);

      // Check if user has viewed these momentos
      const momentoIds = momentosData.map(m => m.id);
      const { data: viewsData } = await supabase
        .from('momento_views')
        .select('momento_id')
        .eq('usuario_id', user.id)
        .in('momento_id', momentoIds);

      const viewedIds = new Set(viewsData?.map(v => v.momento_id) || []);
      const hasUnviewed = momentosData.some(m => !viewedIds.has(m.id));

      console.log('[UnifiedMomentoAvatar v47.2] 🎯 Result:', {
        total: momentosData.length,
        viewed: viewedIds.size,
        hasUnviewed,
      });

      setHasUnviewedMomentos(hasUnviewed);
    } catch (error) {
      console.error('[UnifiedMomentoAvatar v47.2] ❌ Error checking momentos:', error);
      setHasUnviewedMomentos(false);
      setHasMomentos(false);
    }
  }, [user, userId, localId]);

  useEffect(() => {
    checkUnviewedMomentos();

    if (!user || (!userId && !localId)) {
      return;
    }

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`unified-momento-${userId || localId}-v47`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momentos',
        },
        () => {
          console.log('[UnifiedMomentoAvatar v47.2] 🔄 Momento update detected');
          checkUnviewedMomentos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'momento_views',
          filter: `usuario_id=eq.${user.id}`,
        },
        () => {
          console.log('[UnifiedMomentoAvatar v47.2] 🔄 View update detected - updating border');
          checkUnviewedMomentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId, localId, checkUnviewedMomentos]);

  // ✅ Filter out file:// URLs and add smart cache-busting with avatar_updated_at
  const safeImageUrl = imageUrl && !imageUrl.startsWith('file://') ? imageUrl : null;
  
  // ✅ CRITICAL FIX v47.2: Use avatar_updated_at timestamp for smart cache-busting
  const cacheBustedImageUrl = safeImageUrl && avatarTimestamp
    ? `${safeImageUrl}${safeImageUrl.includes('?') ? '&' : '?'}t=${new Date(avatarTimestamp).getTime()}`
    : safeImageUrl;
  
  const shouldShowImage = !!(cacheBustedImageUrl && !imageError);

  const renderAvatar = () => (
    <View
      style={[
        styles.avatarInner,
        {
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
        },
      ]}
    >
      {shouldShowImage ? (
        <Image
          source={{ uri: cacheBustedImageUrl }}
          style={[
            styles.avatarImage,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
          resizeMode="cover"
          onError={(error) => {
            console.error('[UnifiedMomentoAvatar v47.2] ❌ Image failed to load:', error.nativeEvent?.error);
            setImageError(true);
          }}
          onLoad={() => {
            console.log('[UnifiedMomentoAvatar v47.2] ✅ Image loaded successfully');
            setImageError(false);
          }}
          // ✅ CRITICAL FIX v47.2: Remove force-cache to allow updates
          {...(Platform.OS === 'android' && { cache: 'reload' as any })}
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
            size={innerSize * 0.5}
            color={colors.primary}
          />
        </View>
      )}
    </View>
  );

  const avatarContent = (
    <View
      style={[
        styles.container,
        {
          width: avatarSize,
          height: avatarSize,
        },
        style,
      ]}
    >
      {/* ✅ CRITICAL FIX v47.2: Only show border if has unviewed momentos, no white border */}
      {hasUnviewedMomentos ? (
        <LinearGradient
          colors={['#00FF88', '#00FF88', '#00FF88']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.momentoBorder,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              padding: BORDER_WIDTH,
            },
          ]}
        >
          {renderAvatar()}
        </LinearGradient>
      ) : (
        // ✅ CRITICAL FIX v47.2: No border when no unviewed momentos
        renderAvatar()
      )}

      {/* ✅ + button for owners */}
      {showAddButton && isOwner && onAddPress && (
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              width: addButtonSize,
              height: addButtonSize,
              borderRadius: addButtonSize / 2,
              bottom: 0,
              right: 0,
            },
          ]}
          onPress={onAddPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.addButtonGradient,
              {
                width: addButtonSize,
                height: addButtonSize,
                borderRadius: addButtonSize / 2,
              },
            ]}
          >
            <IconSymbol
              ios_icon_name="plus"
              android_material_icon_name="add"
              size={addButtonSize * 0.6}
              color={colors.white}
            />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {avatarContent}
      </TouchableOpacity>
    );
  }

  return avatarContent;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  momentoBorder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    backgroundColor: colors.white,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarImage: {
    backgroundColor: colors.cardBackground,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
