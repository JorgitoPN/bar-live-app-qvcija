
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle, Image, Platform } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/utils/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

const DEFAULT_AVATAR_ICON = 'person.circle.fill';

interface MiniFoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  placeholderIcon?: string;
  placeholderText?: string;
  nombre?: string;
  style?: ViewStyle;
  userId?: string;
  localId?: string;
  showMomentoBorder?: boolean;
}

/**
 * ✅ MINI FOOD PLATE AVATAR v48.0 - NO WHITE BORDER + SMART CACHE-BUSTING
 * 
 * CRITICAL FIX v48.0:
 * - ✅ REMOVED white border completely
 * - ✅ Uses avatar_updated_at timestamp for smart cache-busting
 * - ✅ Filters out file:// URLs that cause ENOENT errors
 * - ✅ Accepts any valid HTTP/HTTPS URL
 * - ✅ Shows default icon on error
 * - ✅ Works with Google OAuth avatars
 * - ✅ Works with Supabase storage URLs
 * - ✅ Real-time momento border updates
 * - ✅ Consistent across all profile types
 * - ✅ Image fills entire circular area
 */
export default function MiniFoodPlateAvatar({
  imageUrl,
  size = 40,
  placeholderIcon = 'person.fill',
  placeholderText,
  nombre,
  style,
  userId,
  localId,
  showMomentoBorder = true,
}: MiniFoodPlateAvatarProps) {
  const { user } = useEffectiveUser();
  const [hasUnviewedMomento, setHasUnviewedMomento] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState<string | null>(null);

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
        .channel(`mini-avatar-updates-${table}-${id}-v48`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: table,
            filter: `id=eq.${id}`,
          },
          (payload: any) => {
            console.log('[MiniFoodPlateAvatar v48.0] 🔄 Avatar updated:', payload.new);
            if (payload.new.avatar_updated_at) {
              setAvatarTimestamp(payload.new.avatar_updated_at);
              setImageError(false);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId, localId]);

  useEffect(() => {
    if (!showMomentoBorder || !user) return;
    
    const checkUnviewedMomentos = async () => {
      if (!userId && !localId) return;

      try {
        // Get all active momentos for this user/local
        let momentosQuery = supabase
          .from('momentos')
          .select('id')
          .gt('expires_at', new Date().toISOString());

        if (userId) {
          momentosQuery = momentosQuery.eq('autor_id', userId).eq('tipo', 'usuario');
        } else if (localId) {
          momentosQuery = momentosQuery.eq('local_id', localId).eq('tipo', 'local');
        }

        const { data: momentosData, error: momentosError } = await momentosQuery;

        if (momentosError || !momentosData || momentosData.length === 0) {
          setHasUnviewedMomento(false);
          return;
        }

        // Check if current user has viewed all these momentos
        const momentoIds = momentosData.map(m => m.id);
        
        const { data: viewsData, error: viewsError } = await supabase
          .from('momento_views')
          .select('momento_id')
          .eq('usuario_id', user.id)
          .in('momento_id', momentoIds);

        if (viewsError) {
          console.error('[MiniFoodPlateAvatar v48.0] Error checking views:', viewsError);
          setHasUnviewedMomento(false);
          return;
        }

        const viewedMomentoIds = new Set(viewsData?.map(v => v.momento_id) || []);
        
        // ✅ CRITICAL: Show border only if there are UNVIEWED momentos
        const hasUnviewed = momentosData.some(m => !viewedMomentoIds.has(m.id));
        
        console.log('[MiniFoodPlateAvatar v48.0] 🔍 Momento check:', {
          userId,
          localId,
          totalMomentos: momentosData.length,
          viewedCount: viewedMomentoIds.size,
          hasUnviewed,
        });

        setHasUnviewedMomento(hasUnviewed);
      } catch (error) {
        console.error('[MiniFoodPlateAvatar v48.0] Error checking momento:', error);
        setHasUnviewedMomento(false);
      }
    };

    checkUnviewedMomentos();

    // ✅ CRITICAL: Subscribe to real-time updates for momento views
    const channel = supabase
      .channel(`momento-views-mini-${userId || localId}-v48`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momento_views',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[MiniFoodPlateAvatar v48.0] 🔄 Real-time view update:', payload);
          checkUnviewedMomentos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momentos',
        },
        (payload) => {
          console.log('[MiniFoodPlateAvatar v48.0] 🔄 Real-time momento update:', payload);
          checkUnviewedMomentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, localId, showMomentoBorder, user]);

  const plateSize = size;
  const imageSize = size;
  const borderWidth = 3;

  // ✅ CRITICAL FIX v48.0: Filter out file:// URLs and add smart cache-busting
  const safeImageUrl = imageUrl && !imageUrl.startsWith('file://') ? imageUrl : null;
  
  // ✅ CRITICAL FIX v48.0: Use avatar_updated_at timestamp for smart cache-busting
  const cacheBustedImageUrl = safeImageUrl && avatarTimestamp
    ? `${safeImageUrl}${safeImageUrl.includes('?') ? '&' : '?'}t=${new Date(avatarTimestamp).getTime()}`
    : safeImageUrl;
  
  const shouldShowImage = !!(cacheBustedImageUrl && !imageError);

  console.log('[MiniFoodPlateAvatar v48.0] 🖼️ Image decision:', {
    imageUrl: imageUrl ? imageUrl.substring(0, 50) + '...' : 'none',
    safeImageUrl: safeImageUrl ? 'valid' : 'none',
    avatarTimestamp,
    imageError,
    shouldShowImage,
  });

  if (hasUnviewedMomento) {
    return (
      <View style={[styles.container, { width: plateSize + borderWidth * 2, height: plateSize + borderWidth * 2 }, style]}>
        <LinearGradient
          colors={['#00FF88', '#00FF88']}
          style={[
            styles.momentoBorder,
            {
              width: plateSize + borderWidth * 2,
              height: plateSize + borderWidth * 2,
              borderRadius: (plateSize + borderWidth * 2) / 2,
            },
          ]}
        >
          <View
            style={[
              styles.avatarCircle,
              {
                width: plateSize,
                height: plateSize,
                borderRadius: plateSize / 2,
              },
            ]}
          >
            {shouldShowImage ? (
              <Image
                source={{ uri: cacheBustedImageUrl }}
                style={[
                  styles.avatarImage,
                  {
                    width: plateSize,
                    height: plateSize,
                    borderRadius: plateSize / 2,
                  },
                ]}
                resizeMode="cover"
                onError={(error) => {
                  console.log('[MiniFoodPlateAvatar v48.0] ⚠️ Image failed to load:', cacheBustedImageUrl, error.nativeEvent.error);
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log('[MiniFoodPlateAvatar v48.0] ✅ Image loaded successfully:', cacheBustedImageUrl?.substring(0, 50));
                  setImageError(false);
                }}
                // ✅ CRITICAL FIX v48.0: Change cache strategy to allow updates
                {...(Platform.OS === 'android' && { cache: 'reload' as any })}
              />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  {
                    width: plateSize,
                    height: plateSize,
                    borderRadius: plateSize / 2,
                  },
                ]}
              >
                <IconSymbol
                  ios_icon_name={DEFAULT_AVATAR_ICON}
                  android_material_icon_name="account_circle"
                  size={plateSize * 0.9}
                  color={colors.primary}
                />
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: plateSize, height: plateSize }, style]}>
      <View
        style={[
          styles.avatarCircle,
          {
            width: plateSize,
            height: plateSize,
            borderRadius: plateSize / 2,
          },
        ]}
      >
        {shouldShowImage ? (
          <Image
            source={{ uri: cacheBustedImageUrl }}
            style={[
              styles.avatarImage,
              {
                width: plateSize,
                height: plateSize,
                borderRadius: plateSize / 2,
              },
            ]}
            resizeMode="cover"
            onError={(error) => {
              console.log('[MiniFoodPlateAvatar v48.0] ⚠️ Image failed to load:', cacheBustedImageUrl, error.nativeEvent.error);
              setImageError(true);
            }}
            onLoad={() => {
              console.log('[MiniFoodPlateAvatar v48.0] ✅ Image loaded successfully:', cacheBustedImageUrl?.substring(0, 50));
              setImageError(false);
            }}
            // ✅ CRITICAL FIX v48.0: Change cache strategy to allow updates
            {...(Platform.OS === 'android' && { cache: 'reload' as any })}
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                width: plateSize,
                height: plateSize,
                borderRadius: plateSize / 2,
              },
            ]}
          >
            <IconSymbol
              ios_icon_name={DEFAULT_AVATAR_ICON}
              android_material_icon_name="account_circle"
              size={plateSize * 0.9}
              color={colors.primary}
            />
          </View>
        )}
      </View>
    </View>
  );
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
    padding: 3,
  },
  avatarCircle: {
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
  },
  avatarImage: {
    backgroundColor: colors.cardBackground,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
