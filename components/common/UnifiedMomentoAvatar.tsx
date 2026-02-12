
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';

interface UnifiedMomentoAvatarProps {
  imageUrl?: string;
  size?: number;
  nombre?: string;
  userId?: string;
  localId?: string;
  onPress?: () => void;
  showBorder?: boolean;
}

/**
 * ✅ UNIFIED MOMENTO AVATAR v335.0 - EXPO-IMAGE OPTIMIZATION
 * 
 * OPTIMIZATIONS v335.0:
 * - ✅ EXPO-IMAGE: Replaced React Native Image with expo-image
 * - ✅ PRIORITY: Set to "normal" for avatars
 * - ✅ CACHE POLICY: "disk" for persistent caching
 * - ✅ TRANSITION: 150ms smooth transition
 * - ✅ RECYCLING KEY: Based on userId/localId for memory optimization
 */

export default function UnifiedMomentoAvatar({
  imageUrl,
  size = 64,
  nombre = 'Usuario',
  userId,
  localId,
  onPress,
  showBorder = true,
}: UnifiedMomentoAvatarProps) {
  const router = useRouter();
  const [hasMomento, setHasMomento] = useState(false);
  const [hasUnviewedMomento, setHasUnviewedMomento] = useState(false);

  const checkMomentos = useCallback(async () => {
    if (!userId && !localId) return;

    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      let query = supabase
        .from('momentos')
        .select('id, created_at')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('usuario_id', userId);
      } else if (localId) {
        query = query.eq('local_id', localId);
      }

      const { data: momentos, error } = await query;

      if (error) throw error;

      if (momentos && momentos.length > 0) {
        setHasMomento(true);

        const momentoIds = momentos.map(m => m.id);
        const viewerId = userId || localId;

        if (viewerId) {
          const { data: views, error: viewsError } = await supabase
            .from('momento_views')
            .select('momento_id')
            .in('momento_id', momentoIds)
            .eq('viewer_id', viewerId);

          if (!viewsError && views) {
            const viewedMomentoIds = new Set(views.map(v => v.momento_id));
            const hasUnviewed = momentos.some(m => !viewedMomentoIds.has(m.id));
            setHasUnviewedMomento(hasUnviewed);
          } else {
            setHasUnviewedMomento(true);
          }
        }
      } else {
        setHasMomento(false);
        setHasUnviewedMomento(false);
      }
    } catch (error) {
      if (Platform.OS !== 'android') {
        console.error('[UnifiedMomentoAvatar v335.0] Error checking momentos:', error);
      }
    }
  }, [userId, localId]);

  useEffect(() => {
    checkMomentos();
  }, [checkMomentos]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (hasMomento) {
      if (userId) {
        router.push({
          pathname: '/perfil/usuario',
          params: { userId, openMomentos: 'true' },
        });
      } else if (localId) {
        router.push({
          pathname: '/perfil/local',
          params: { localId, openMomentos: 'true' },
        });
      }
    } else {
      if (userId) {
        router.push({ pathname: '/perfil/usuario', params: { userId } });
      } else if (localId) {
        router.push({ pathname: '/perfil/local', params: { localId } });
      }
    }
  };

  const borderSize = size + 8;
  const borderRadius = borderSize / 2;

  const avatarContent = (
    <View style={[styles.container, { width: borderSize, height: borderSize }]}>
      {hasMomento && showBorder && (
        <LinearGradient
          colors={hasUnviewedMomento ? ['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'] : ['#9CA3AF', '#9CA3AF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBorder, { width: borderSize, height: borderSize, borderRadius }]}
        />
      )}
      
      <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
            contentFit="cover"
            priority="normal"
            cachePolicy="disk"
            transition={150}
            recyclingKey={userId || localId || imageUrl}
          />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={size * 0.5}
              color={colors.white}
            />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      {avatarContent}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBorder: {
    position: 'absolute',
    padding: 3,
  },
  avatarContainer: {
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    borderWidth: 3,
    borderColor: colors.cardBackground,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
