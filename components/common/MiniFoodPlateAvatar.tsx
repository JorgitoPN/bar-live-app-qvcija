
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
 * ✅ MINI FOOD PLATE AVATAR v43.0 - CRITICAL AVATAR FIX
 * 
 * CRITICAL FIX v43.0:
 * - ✅ Filter out file:// URLs that cause ENOENT errors on Android
 * - ✅ Filter out invalid/corrupted URLs
 * - ✅ Proper error handling with fallback to placeholder
 * - ✅ Real-time momento border updates
 * - ✅ Works with Supabase storage URLs and any valid HTTP/HTTPS URLs
 * - ✅ ANDROID FIX: Added cache="force-cache" for better image loading
 * - ✅ User @jorge avatar now displays correctly everywhere
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
          console.error('[MiniFoodPlateAvatar v43.0] Error checking views:', viewsError);
          setHasUnviewedMomento(false);
          return;
        }

        const viewedMomentoIds = new Set(viewsData?.map(v => v.momento_id) || []);
        
        // ✅ CRITICAL: Show border only if there are UNVIEWED momentos
        const hasUnviewed = momentosData.some(m => !viewedMomentoIds.has(m.id));
        
        console.log('[MiniFoodPlateAvatar v43.0] 🔍 Momento check:', {
          userId,
          localId,
          totalMomentos: momentosData.length,
          viewedCount: viewedMomentoIds.size,
          hasUnviewed,
        });

        setHasUnviewedMomento(hasUnviewed);
      } catch (error) {
        console.error('[MiniFoodPlateAvatar v43.0] Error checking momento:', error);
        setHasUnviewedMomento(false);
      }
    };

    checkUnviewedMomentos();

    // ✅ CRITICAL: Subscribe to real-time updates for momento views
    const channel = supabase
      .channel(`momento-views-mini-${userId || localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momento_views',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[MiniFoodPlateAvatar v43.0] 🔄 Real-time view update:', payload);
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
          console.log('[MiniFoodPlateAvatar v43.0] 🔄 Real-time momento update:', payload);
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

  // ✅ CRITICAL FIX v43.0: Filter out file:// URLs and validate properly
  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    
    // ✅ CRITICAL: Reject file:// URLs that cause ENOENT errors
    if (url.startsWith('file://')) {
      console.log('[MiniFoodPlateAvatar v43.0] ❌ Rejected file:// URL:', url.substring(0, 50));
      return false;
    }
    
    // ✅ CRITICAL: Reject data: URLs (base64) that cause decoding errors
    if (url.startsWith('data:')) {
      console.log('[MiniFoodPlateAvatar v43.0] ❌ Rejected data: URL');
      return false;
    }
    
    // ✅ CRITICAL: Reject blob: URLs
    if (url.startsWith('blob:')) {
      console.log('[MiniFoodPlateAvatar v43.0] ❌ Rejected blob: URL');
      return false;
    }
    
    // Accept valid HTTP/HTTPS URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('[MiniFoodPlateAvatar v43.0] ✅ Valid HTTP/HTTPS URL:', url.substring(0, 50));
      return true;
    }
    
    console.log('[MiniFoodPlateAvatar v43.0] ❌ Invalid URL format:', url.substring(0, 50));
    return false;
  };

  const shouldShowImage = isValidUrl(imageUrl) && !imageError;

  console.log('[MiniFoodPlateAvatar v43.0] 🖼️ Image decision:', {
    imageUrl: imageUrl ? imageUrl.substring(0, 50) + '...' : 'none',
    isValid: isValidUrl(imageUrl),
    imageError,
    shouldShowImage,
    platform: Platform.OS,
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
                  onError={(error) => {
                    console.log('[MiniFoodPlateAvatar v43.0] ⚠️ Image failed to load:', imageUrl, error.nativeEvent?.error);
                    setImageError(true);
                  }}
                  onLoad={() => {
                    console.log('[MiniFoodPlateAvatar v43.0] ✅ Image loaded successfully:', imageUrl?.substring(0, 50));
                    setImageError(false);
                  }}
                  // ✅ ANDROID FIX: Force cache for better loading
                  {...(Platform.OS === 'android' && { cache: 'force-cache' as any })}
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
              onError={(error) => {
                console.log('[MiniFoodPlateAvatar v43.0] ⚠️ Image failed to load:', imageUrl, error.nativeEvent?.error);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('[MiniFoodPlateAvatar v43.0] ✅ Image loaded successfully:', imageUrl?.substring(0, 50));
                setImageError(false);
              }}
              // ✅ ANDROID FIX: Force cache for better loading
              {...(Platform.OS === 'android' && { cache: 'force-cache' as any })}
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
