
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';

interface MiniFoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  nombre?: string;
  userId?: string;
  localId?: string;
  showMomentoBorder?: boolean;
  onPress?: () => void;
}

/**
 * ✅ MINI FOOD PLATE AVATAR v335.0 - EXPO-IMAGE OPTIMIZATION
 * 
 * OPTIMIZATIONS v335.0:
 * - ✅ EXPO-IMAGE: Replaced React Native Image with expo-image
 * - ✅ PRIORITY: Set to "normal" for avatars (not critical path)
 * - ✅ CACHE POLICY: "disk" for persistent caching
 * - ✅ TRANSITION: 150ms smooth transition
 * - ✅ RECYCLING KEY: Based on userId/localId for memory optimization
 */

export default function MiniFoodPlateAvatar({
  imageUrl,
  size = 40,
  nombre = 'Usuario',
  userId,
  localId,
  showMomentoBorder = false,
  onPress,
}: MiniFoodPlateAvatarProps) {
  const router = useRouter();
  const [hasMomento, setHasMomento] = useState(false);

  useEffect(() => {
    if (!showMomentoBorder) return;
    if (!userId && !localId) return;

    const checkMomento = async () => {
      try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        let query = supabase
          .from('momentos')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', twentyFourHoursAgo.toISOString())
          .limit(1);

        if (userId) {
          query = query.eq('usuario_id', userId);
        } else if (localId) {
          query = query.eq('local_id', localId);
        }

        const { count, error } = await query;

        if (!error && count && count > 0) {
          setHasMomento(true);
        } else {
          setHasMomento(false);
        }
      } catch (error) {
        if (Platform.OS !== 'android') {
          console.error('[MiniFoodPlateAvatar v335.0] Error checking momento:', error);
        }
      }
    };

    checkMomento();
  }, [userId, localId, showMomentoBorder]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (userId) {
      router.push({ pathname: '/perfil/usuario', params: { userId } });
    } else if (localId) {
      router.push({ pathname: '/perfil/local', params: { localId } });
    }
  };

  const getInitials = () => {
    if (!nombre) return '?';
    const words = nombre.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  const avatarContent = (
    <View style={[styles.container, { width: size, height: size }]}>
      {hasMomento && showMomentoBorder && (
        <View style={[styles.momentoBorder, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]} />
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

  if (onPress || userId || localId) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {avatarContent}
      </TouchableOpacity>
    );
  }

  return avatarContent;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentoBorder: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: colors.primary,
    zIndex: 1,
  },
  avatarContainer: {
    overflow: 'hidden',
    backgroundColor: colors.cardBorder,
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
