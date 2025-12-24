
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';
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
 * ✅ MINI FOOD PLATE AVATAR v8.1 - WITH IMPERSONATION SUPPORT
 * 
 * Features:
 * - Smaller size optimized for inline use
 * - Default avatar with user icon (non-realistic)
 * - ALWAYS shows an avatar (never empty)
 * - ✅ FIXED: Real-time sync for momento border
 * - ✅ Shows neon green border ONLY if user/local has UNVIEWED momentos
 * - ✅ Removes border when all momentos are viewed
 * - ✅ Subscribes to real-time updates for momento_views
 * - ✅ Uses effective user for impersonation support
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
          console.error('[MiniFoodPlateAvatar] Error checking views:', viewsError);
          setHasUnviewedMomento(false);
          return;
        }

        const viewedMomentoIds = new Set(viewsData?.map(v => v.momento_id) || []);
        
        // ✅ CRITICAL: Show border only if there are UNVIEWED momentos
        const hasUnviewed = momentosData.some(m => !viewedMomentoIds.has(m.id));
        
        console.log('[MiniFoodPlateAvatar] 🔍 Momento check:', {
          userId,
          localId,
          totalMomentos: momentosData.length,
          viewedCount: viewedMomentoIds.size,
          hasUnviewed,
        });

        setHasUnviewedMomento(hasUnviewed);
      } catch (error) {
        console.error('[MiniFoodPlateAvatar] Error checking momento:', error);
        setHasUnviewedMomento(false);
      }
    };

    checkUnviewedMomentos();

    // ✅ CRITICAL: Subscribe to real-time updates for momento views
    const channel = supabase
      .channel(`momento-views-${userId || localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momento_views',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[MiniFoodPlateAvatar] 🔄 Real-time view update:', payload);
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
          console.log('[MiniFoodPlateAvatar] 🔄 Real-time momento update:', payload);
          checkUnviewedMomentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, localId, showMomentoBorder, user]);

  const plateSize = size;
  const imageSize = size * 0.85;
  const rimWidth = size * 0.06;
  const borderWidth = 3;

  const shouldShowImage = !!imageUrl;

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
              styles.plateBase,
              {
                width: plateSize,
                height: plateSize,
                borderRadius: plateSize / 2,
                borderWidth: rimWidth,
              },
            ]}
          >
            <View
              style={[
                styles.foodContainer,
                {
                  width: imageSize,
                  height: imageSize,
                  borderRadius: imageSize / 2,
                },
              ]}
            >
              {shouldShowImage ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={[
                    styles.foodImage,
                    {
                      width: imageSize,
                      height: imageSize,
                      borderRadius: imageSize / 2,
                    },
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.foodPlaceholder,
                    {
                      width: imageSize,
                      height: imageSize,
                      borderRadius: imageSize / 2,
                    },
                  ]}
                >
                  <IconSymbol
                    ios_icon_name={DEFAULT_AVATAR_ICON}
                    android_material_icon_name="account_circle"
                    size={imageSize * 0.9}
                    color={colors.primary}
                  />
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: plateSize, height: plateSize }, style]}>
      <View
        style={[
          styles.plateBase,
          {
            width: plateSize,
            height: plateSize,
            borderRadius: plateSize / 2,
            borderWidth: rimWidth,
          },
        ]}
      >
        <View
          style={[
            styles.foodContainer,
            {
              width: imageSize,
              height: imageSize,
              borderRadius: imageSize / 2,
            },
          ]}
        >
          {shouldShowImage ? (
            <Image
              source={{ uri: imageUrl }}
              style={[
                styles.foodImage,
                {
                  width: imageSize,
                  height: imageSize,
                  borderRadius: imageSize / 2,
                },
              ]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.foodPlaceholder,
                {
                  width: imageSize,
                  height: imageSize,
                  borderRadius: imageSize / 2,
                },
              ]}
            >
              <IconSymbol
                ios_icon_name={DEFAULT_AVATAR_ICON}
                android_material_icon_name="account_circle"
                size={imageSize * 0.9}
                color={colors.primary}
              />
            </View>
          )}
        </View>
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
  plateBase: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodContainer: {
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  foodImage: {
    backgroundColor: colors.cardBackground,
  },
  foodPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
