
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
 * ✅ UNIFIED MOMENTO AVATAR v47.0 - CONSISTENT DESIGN EVERYWHERE
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

  const BORDER_WIDTH = 4;
  const avatarSize = size;
  const innerSize = size - BORDER_WIDTH * 2;
  const addButtonSize = size * 0.32;

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
      console.log('[UnifiedMomentoAvatar v47.0] 🔍 Checking momentos for:', { userId, localId });

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

      console.log('[UnifiedMomentoAvatar v47.0] 🎯 Result:', {
        total: momentosData.length,
        viewed: viewedIds.size,
        hasUnviewed,
      });

      setHasUnviewedMomentos(hasUnviewed);
    } catch (error) {
      console.error('[UnifiedMomentoAvatar v47.0] ❌ Error checking momentos:', error);
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
          console.log('[UnifiedMomentoAvatar v47.0] 🔄 Momento update detected');
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
          console.log('[UnifiedMomentoAvatar v47.0] 🔄 View update detected - updating border');
          checkUnviewedMomentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId, localId, checkUnviewedMomentos]);

  // ✅ Filter out file:// URLs
  const safeImageUrl = imageUrl && !imageUrl.startsWith('file://') ? imageUrl : null;
  const shouldShowImage = !!(safeImageUrl && !imageError);

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
          source={{ uri: safeImageUrl }}
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
            console.error('[UnifiedMomentoAvatar v47.0] ❌ Image failed to load:', error.nativeEvent?.error);
            setImageError(true);
          }}
          onLoad={() => {
            console.log('[UnifiedMomentoAvatar v47.0] ✅ Image loaded successfully');
            setImageError(false);
          }}
          {...(Platform.OS === 'android' && { cache: 'force-cache' as any })}
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
      {/* ✅ Green neon border only if has unviewed momentos */}
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
        <View
          style={[
            styles.normalBorder,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              padding: BORDER_WIDTH,
            },
          ]}
        >
          {renderAvatar()}
        </View>
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
  normalBorder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
